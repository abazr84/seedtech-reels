// Clip mode: owner's own video -> branded 1080x1920 reel (overlay PNG + ffmpeg).
import { chromium } from 'playwright-core';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function runClip({ payload, out, here, FFMPEG, findChrome, flag }) {
  const root = path.join(here, '..');
  const src = path.resolve(root, payload.src);
  if (!fs.existsSync(src)) throw new Error('clip source missing: ' + payload.src);
  const tmp = path.join(path.dirname(path.resolve(out)), `.${path.basename(out)}`);
  const png = tmp + '.overlay.png';

  // 1) overlay (logo + contacts + bottom title text, no bar)
  const browser = await chromium.launch({ executablePath: findChrome(), args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('PAGEERROR', e.message));
  await page.goto(pathToFileURL(path.join(here, 'overlay.html')).href);
  await page.evaluate(p => window.setup(p), payload);
  await page.screenshot({ path: png, omitBackground: true, type: 'png' });
  await browser.close();

  // 2) probe (ffmpeg -i prints stream info to stderr)
  const info = spawnSync(FFMPEG, ['-hide_banner', '-i', src], { encoding: 'utf8' }).stderr || '';
  const hasAudio = /Stream #\S+.*Audio:/.test(info);
  const dm = info.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  const dur = dm ? (+dm[1]) * 3600 + (+dm[2]) * 60 + parseFloat(dm[3]) : 30;
  const T = Math.min(dur, 90);
  console.log(`src ${payload.src}: ${dur.toFixed(1)}s audio=${hasAudio} -> ${T.toFixed(1)}s`);

  // 3) filter graph
  const mdir = path.join(root, 'music');
  const tracks = fs.existsSync(mdir) ? fs.readdirSync(mdir).filter(f => /\.(mp3|m4a|aac|wav|ogg)$/i.test(f)).sort() : [];
  const useMusic = !!payload.music && tracks.length > 0;
  const h = [...String(payload.id || Date.now())].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const pick = payload.musicFile && tracks.includes(payload.musicFile) ? payload.musicFile : tracks[h % Math.max(1, tracks.length)];
  const args = ['-y', '-loglevel', 'error', '-i', src, '-loop', '1', '-framerate', '30', '-i', png];
  if (useMusic) args.push('-stream_loop', '-1', '-i', path.join(mdir, pick));
  const fc = [
    '[0:v]split[a][b]',
    '[a]scale=108:192:force_original_aspect_ratio=increase,crop=108:192,gblur=sigma=3,scale=1080:1920,eq=brightness=-0.1[bg]',
    '[b]scale=1080:1920:force_original_aspect_ratio=decrease,setsar=1[fg]',
    '[bg][fg]overlay=(W-w)/2:(H-h)/2,fps=30[v0]',
    '[1:v]format=rgba,fade=t=in:st=0.3:d=0.7:alpha=1[ov]',
    '[v0][ov]overlay=0:0:shortest=1,format=yuv420p[v]'
  ];
  let amap = null;
  const fo = `afade=t=out:st=${Math.max(0, T - 1.2).toFixed(2)}:d=1.2`;
  if (hasAudio && useMusic) {
    fc.push(`[0:a]loudnorm=I=-16:TP=-1.5:LRA=11,apad[o]`, `[2:a]loudnorm=I=-30:TP=-2:LRA=11[m]`, `[o][m]amix=inputs=2:duration=first:normalize=0,${fo}[aud]`); amap = '[aud]';
  } else if (hasAudio) {
    fc.push(`[0:a]loudnorm=I=-16:TP=-1.5:LRA=11,${fo}[aud]`); amap = '[aud]';
  } else if (useMusic) {
    fc.push(`[2:a]loudnorm=I=-20:TP=-2:LRA=11,afade=t=in:d=1,${fo}[aud]`); amap = '[aud]';
  }
  args.push('-filter_complex', fc.join(';'), '-map', '[v]');
  if (amap) args.push('-map', amap, '-c:a', 'aac', '-b:a', '128k'); else args.push('-an');
  args.push('-t', T.toFixed(2), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-profile:v', 'high', '-r', '30', '-movflags', '+faststart', out);
  execFileSync(FFMPEG, args, { stdio: 'inherit' });
  fs.rmSync(png, { force: true });
  console.log('done', out, (fs.statSync(out).size / 1e6).toFixed(2), 'MB');
}
