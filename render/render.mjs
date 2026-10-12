// Usage: node render.mjs <payload.json|-> <out.mp4> [--frame ms] [--png out.png]
import { chromium } from 'playwright-core';
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const FFMPEG = process.env.FFMPEG || (() => { try { return createRequire(import.meta.url)('ffmpeg-static'); } catch { return 'ffmpeg'; } })();

const here = path.dirname(fileURLToPath(import.meta.url));
const [,, payloadArg, outArg, ...rest] = process.argv;
const payload = JSON.parse(payloadArg === '-' || !payloadArg ? process.env.PAYLOAD : fs.readFileSync(payloadArg, 'utf8'));
const out = outArg || 'out.mp4';
const FPS = 25;
const flag = (n) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : null; };

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '';
  for (const c of ['/opt/pw-browsers/chromium/chrome-linux/chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']) if (fs.existsSync(c)) return c;
  if (base && fs.existsSync(base)) {
    for (const d of fs.readdirSync(base).filter(x => x.startsWith('chromium-'))) {
      const p = path.join(base, d, 'chrome-linux', 'chrome'); if (fs.existsSync(p)) return p;
    }
  }
  return undefined; // let playwright decide
}

const browser = await chromium.launch({ executablePath: findChrome(), args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.error('PAGEERROR', e.message));
await page.goto(pathToFileURL(path.join(here, 'template.html')).href);
const total = await page.evaluate(p => window.build(p), payload);
const frames = Math.ceil(total / 1000 * FPS);
console.log(`total ${total} ms, ${frames} frames`);

if (flag('--frame')) {
  await page.evaluate(ms => window.seek(ms), +flag('--frame'));
  await page.screenshot({ path: flag('--png') || 'frame.png', type: 'png' });
  await browser.close(); process.exit(0);
}

// ---------- audio (synthesised, royalty-free) ----------
const secs = (total / 1000 + 0.2).toFixed(2);
const audio = path.join(path.dirname(path.resolve(out)), `.${path.basename(out)}.m4a`);
const useMusic = payload.music !== false;
if (useMusic) {
  // soft warm pad: Am(add9) chord with slow tremolo + light echo, fades in/out
  const freqs = [110, 164.81, 220, 261.63, 329.63, 493.88];
  const inputs = freqs.flatMap(f => ['-f', 'lavfi', '-t', secs, '-i', `sine=frequency=${f}:sample_rate=44100`]);
  const mix = freqs.map((_, i) => `[${i}:a]`).join('') + `amix=inputs=${freqs.length}:normalize=0,volume=0.8,alimiter=limit=0.7,tremolo=f=0.18:d=0.5,lowpass=f=1400,aecho=0.8:0.6:420|760:0.35|0.22,afade=t=in:d=1.6,afade=t=out:st=${(total / 1000 - 1.6).toFixed(2)}:d=1.8[a]`;
  execSync([`"${FFMPEG}"`, '-y', '-loglevel', 'error', ...inputs, '-filter_complex', `"${mix}"`, '-map', '"[a]"', '-c:a', 'aac', '-b:a', '128k', `"${audio}"`].join(' '), { stdio: 'inherit' });
}

// ---------- video ----------
const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-'];
if (useMusic) args.push('-i', audio);
args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(FPS), '-movflags', '+faststart');
if (useMusic) args.push('-c:a', 'aac', '-b:a', '128k', '-shortest'); else args.push('-an');
args.push(out);
const ff = spawn(FFMPEG, args, { stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise((res, rej) => { ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exit ' + c))); });
for (let i = 0; i < frames; i++) {
  await page.evaluate(ms => window.seek(ms), i * 1000 / FPS);
  const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (i % 50 === 0) console.log('frame', i, '/', frames);
}
ff.stdin.end();
await done;
await browser.close();
if (useMusic) fs.rmSync(audio, { force: true });
console.log('done', out, (fs.statSync(out).size / 1e6).toFixed(2), 'MB');
