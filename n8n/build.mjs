// Generates reels-workflow.json (n8n workflow "Seedtech Reels"). Run: node n8n/build.mjs
import fs from 'node:fs';
import crypto from 'node:crypto';
const REPO = 'abazr84/seedtech-reels';
const ADMIN = '249912501212';
const GH = { httpHeaderAuth: { id: 's66KQGCH1bOI74Mx', name: 'Header Auth account 2' } };
const EVO = { httpHeaderAuth: { id: 'R2eoCL9rAYY6GR9a', name: 'Header Auth account' } };
const FBC = { facebookGraphApi: { id: 'uE5O5YsX0k7nlpZK', name: 'Facebook Graph account' } };
const DSC = { deepSeekApi: { id: 'CP6BvrPQmv8B6byx', name: 'DeepSeek account' } };
const nodes = []; const conn = {};
let x = 0;
const add = (name, type, typeVersion, parameters, extra = {}, pos) => { nodes.push({ id: crypto.randomUUID(), name, type, typeVersion, position: pos || [x += 260, 300], parameters, ...extra }); return name; };
const link = (a, b, out = 0, t = 'main') => { conn[a] = conn[a] || {}; conn[a][t] = conn[a][t] || []; while (conn[a][t].length <= out) conn[a][t].push([]); conn[a][t][out].push({ node: b, type: t, index: 0 }); };
const code = (name, jsCode, pos) => add(name, 'n8n-nodes-base.code', 2, { mode: 'runOnceForAllItems', language: 'javaScript', jsCode }, {}, pos);
const evo = (name, path, bodyExpr, pos) => add(name, 'n8n-nodes-base.httpRequest', 4.2, { method: 'POST', url: 'https://evo.agraxis.com/message/' + path + '/abazr_whatsapp', authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', sendBody: true, contentType: 'json', specifyBody: 'json', jsonBody: '={{ JSON.stringify(' + bodyExpr + ') }}', options: {} }, { credentials: EVO, retryOnFail: true, maxTries: 3, waitBetweenTries: 3000 }, pos);

// ---------- triggers ----------
add('Schedule 2x week', 'n8n-nodes-base.scheduleTrigger', 1.2, { rule: { interval: [{ field: 'cronExpression', expression: '0 10 * * 2,4' }] } }, {}, [0, 100]);
add('Reel now (test)', 'n8n-nodes-base.webhook', 2, { httpMethod: 'GET', path: 'seedtech-reel-now', responseMode: 'onReceived', options: {} }, { webhookId: crypto.randomUUID() }, [0, 300]);
add('Approval webhook', 'n8n-nodes-base.webhook', 2, { httpMethod: 'POST', path: 'seedtech-reel-approval', responseMode: 'responseNode', options: {} }, { webhookId: crypto.randomUUID() }, [0, 700]);

// ---------- pipeline ----------
const PICK = `const sd=$getWorkflowStaticData('global');
const posted=sd.posted||{};
const all=["anaya-f1-tomato","jaguar-f1-tomato","jaguar-plus-f1-tomato","rio-grande-plus-tomato","savana-f1-tomato","cobra-26-f1-tomato","kiara-f1-tomato","crimson-sweet-watermelon","koloss-f1-watermelon","logon-plus-f1-watermelon","sirana-f1-cucumber","kalenda-f1-eggplant","black-beauty-plus-eggplant","noboli-f1-sweet-pepper","carnaval-sweet-pepper","yolo-wonder-plus-sweet-pepper","shamsi-hot-pepper","lima-f1-okra","rosina-plus-f1-squash","sultana-f1-cabbage","new-kuroda-carrot","amazonia-carrot","ares-onion-rainy-season","bafatim-tech-onion"];
const m=+new Intl.DateTimeFormat('en',{month:'numeric',timeZone:'Africa/Khartoum'}).format(new Date());
const season=(m>=9||m<=2)?'winter':'summer';
const tag={'kiara-f1-tomato':'summer','savana-f1-tomato':'summer','cobra-26-f1-tomato':'summer','carnaval-sweet-pepper':'summer','ares-onion-rainy-season':'summer','lima-f1-okra':'summer','rio-grande-plus-tomato':'winter','noboli-f1-sweet-pepper':'winter','bafatim-tech-onion':'winter','sultana-f1-cabbage':'winter'};
const list=all.filter(s=>!tag[s]||tag[s]===season).sort((a,b)=>(posted[a]||0)-(posted[b]||0));
const j=$input.first().json||{};
const qt=(j.query&&j.query.type)||j.kind||'';
let kind=qt==='disease'?'disease':(qt==='product'||qt==='صنف')?'product':'';
if(!kind){kind=sd.lastKind==='disease'?'product':'disease';}
sd.lastKind=kind;
if(kind==='disease'){const dl=[0,1,2,3,4,5,6].map(i=>'disease:'+i).sort((a,b)=>(posted[a]||0)-(posted[b]||0));return [{json:{slug:dl[0],kind:'disease',note:''}}];}
return [{json:{slug:list[0],kind:'product',note:''}}];`;
code('pick_topic', PICK, [300, 300]);
link('Schedule 2x week', 'pick_topic'); link('Reel now (test)', 'pick_topic');

add('get_data', 'n8n-nodes-base.httpRequest', 4.2, { method: 'GET', url: "={{ String($json.slug).startsWith('disease:') ? 'https://seedtech-sd.com/wp-json/wp/v2/pages?slug=plant-diseases&_fields=content' : 'https://seedtech-sd.com/wp-json/wc/store/v1/products?slug=' + $json.slug }}", authentication: 'none', options: {} }, { retryOnFail: true, maxTries: 3, waitBetweenTries: 2000 }, [560, 300]);
link('pick_topic', 'get_data');

const PREP = `const raw0=$input.first().json;
const r=Array.isArray(raw0)?raw0[0]:raw0;
const src=(()=>{try{return $('edit_input').first().json}catch(e){return null}})()||$('pick_topic').first().json;
const strip=h=>String(h||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#\\d+;/g,' ').replace(/&amp;/g,'&').replace(/\\s+/g,' ').trim();
const parseDis=html=>String(html).split('<details').slice(1).map(sec=>{const s=sec.replace(/^[^<]*>/,'').replace(/<style[\\s\\S]*?<\\/style>|<script[\\s\\S]*?<\\/script>/g,'');const ar=(s.match(/<span class="ar">([\\s\\S]*?)<\\/span>/)||[])[1]||'';const en=(s.match(/<span class="en">([\\s\\S]*?)<\\/span>/)||[])[1]||'';const im=(s.match(/src="([^"]*plant-disease[^"]*)"/)||[])[1]||'';let txt=strip(s.replace(/<span class="en">[\\s\\S]*?<\\/span>/g,' '));txt=txt.replace(/تحميل الدليل[\\s\\S]*$/,'').replace(/عرض الصنف/g,'').replace(/\\s+/g,' ').trim();return {ar:strip(ar),en:strip(en),im,txt};}).filter(x=>x.im);
if(src.kind==='disease'){
 const html=(r.content&&(r.content.rendered||r.content))||'';
 const list=parseDis(html);const ix=Math.min(+String(src.slug).split(':')[1]||0,list.length-1);const d=list[ix];
 const clean=s=>s.replace(/\\s*\\(.*?\\)\\s*/g,' ').trim();
 return [{json:{slug:'disease:'+ix,kind:'disease',name_ar:clean(d.ar),name_en:clean(d.en),facts:d.txt.slice(0,2200),image:d.im,link:'https://seedtech-sd.com/plant-diseases/',note:src.note||'',prevScript:src.prevScript||''}}];
}
const prod=r;
let img=(prod.images&&prod.images[0]&&prod.images[0].src)||'';
const big=img.replace(/-\\d+x\\d+(?=\\.\\w+$)/,'');
if(big!==img){try{await this.helpers.httpRequest({method:'HEAD',url:big,timeout:8000});img=big;}catch(e){}}
const facts=(strip(prod.short_description)+' | '+strip(prod.description)).slice(0,2200);
const en=String(prod.slug||'').replace(/-(sweet-pepper|hot-pepper|tomato|watermelon|cucumber|eggplant|okra|squash|cabbage|carrot|onion)$/,'').split('-').map(t=>/^(f1|te)$/.test(t)?t.toUpperCase():/^n?\\d/.test(t)?t.toUpperCase():t.charAt(0).toUpperCase()+t.slice(1)).join(' ').replace(/(\\d) (?=\\d)/g,'$1-');
return [{json:{slug:prod.slug,kind:'product',name_ar:strip(prod.name),name_en:en,facts,image:img,link:prod.permalink,note:src.note||'',prevScript:src.prevScript||''}}];`;
code('prep_reel', PREP, [820, 300]);
link('get_data', 'prep_reel');

const SYS = `أنت كاتب سيناريو ريلز قصيرة (15-20 ثانية) لصفحة سيدتك (SEEDTECH Sudan) للبذور والمدخلات الزراعية، تكتب بلهجة سودانية بسيطة وواضحة كخبير زراعي صديق للمزارع (ليست مصرية: لا تكتب ده، دي، عشان؛ بل دا، ديل، دايرين). ممنوع ألقاب النداء (يا غالي، يا باشا، يا أستاذ، يا زول...).
المخرج: JSON صالح فقط بلا شرح ولا علامات markdown، بهذا الشكل:
{"hook":"...","scenes":[{"type":"list","head":"...","items":["...","..."]},{"type":"stat","head":"...","items":[{"k":"...","v":"..."}]}],"cta":"...","caption":"..."}
القواعد:
1) hook: جملة خطّاف واحدة تشدّ المزارع (مشكلة يعرفها أو نتيجة يريدها)، أقل من 60 حرفاً.
2) scenes: مشهدان فقط. كل head كلمتان أو ثلاث. كل بند items نصّ قصير جداً (أقل من 42 حرفاً) بلا نقطة في آخره، من 3 إلى 4 بنود.
 - نوع «مرض نباتي»: المشهد الأول list بعنوان «الأعراض»، والثاني list بعنوان «طرق الوقاية»، من بيانات المرض المعطاة فقط؛ ممنوع اختراع علاج أو مبيد أو جرعة. إن وُجدت أصناف مقاومة في البيانات فاجعلها بنداً في الوقاية.
 - نوع «صنف»: المشهد الأول stat بعنوان «مواصفات الصنف»، من 2 إلى 4 مواصفات حقيقية من البيانات فقط (k اسم المواصفة، v القيمة القصيرة، مثل: وزن الثمرة/ 180 جرام، النضج/ 75 يوم، الموسم/ الشتاء)، ولا تخترع رقماً. إن لم تتوفر مواصفات رقمية كفاية فاستخدم list بدلاً منه. والمشهد الثاني list بعنوان «المميزات» من البيانات فقط.
 - لا سعر ولا ضمان ولا نسب إنتاج غير موجودة في البيانات.
3) cta: جملة واحدة تُعلن توفر المنتج: «متوفر في كل الصيدليات الزراعية بجميع الولايات» (للمرض: «الأصناف المقاومة متوفرة في كل الصيدليات الزراعية بجميع الولايات» فقط إن ذُكرت أصناف مقاومة، وإلا «اسأل مهندسي سيدتك»).
4) caption: نص المنشور المرافق للريل (أقل من 600 حرف): خطّاف، ثلاث أو أربع نقاط من البيانات، سطر دعوة للاستفسار، ثم سطر «المنتج متوفر في كافة الصيدليات الزراعية بكافة الولايات 🌍» (للمرض بصيغة الأصناف المقاومة أو احذفه)، ثم 3 إلى 5 هاشتاقات عربية، وإيموجي معتدلة. لا رابط ولا رقم هاتف؛ النظام يضيفهما.
5) إذا وُجدت «ملاحظة التعديل» فعدّل السيناريو السابق بموجبها فقط وأبقِ الباقي.`;
const WRITE_TEXT = "={{ ($json.kind==='disease'?('نوع المحتوى: مرض نباتي\\nالمرض: '+$json.name_ar+'\\nالبيانات:\\n'+$json.facts):('نوع المحتوى: صنف\\nالصنف: '+$json.name_ar+'\\nالموسم القادم: '+(()=>{const m=+new Intl.DateTimeFormat('en',{month:'numeric',timeZone:'Africa/Khartoum'}).format(new Date());return (m>=9||m<=2)?'الموسم الشتوي (بارد وجاف)':'الموسم الصيفي (حار وممطر)';})()+'\\nالبيانات:\\n'+$json.facts))+($json.note?('\\n\\nالسيناريو السابق:\\n'+$json.prevScript+'\\n\\nملاحظة التعديل: '+$json.note):'') }}";
add('write_reel', '@n8n/n8n-nodes-langchain.agent', 2.2, { promptType: 'define', text: WRITE_TEXT, hasOutputParser: false, needsFallback: false, options: { systemMessage: SYS } }, {}, [1080, 300]);
add('DeepSeek Chat Model', '@n8n/n8n-nodes-langchain.lmChatDeepSeek', 1, { model: 'deepseek-v4-pro', options: {} }, { credentials: DSC }, [1080, 520]);
link('prep_reel', 'write_reel'); link('DeepSeek Chat Model', 'write_reel', 0, 'ai_languageModel');

const BUILD = `const p=$('prep_reel').first().json;
const out=String($input.first().json.output||$input.first().json.text||'');
const mm=out.match(/\\{[\\s\\S]*\\}/);
if(!mm)throw new Error('AI did not return JSON: '+out.slice(0,200));
let a;try{a=JSON.parse(mm[0]);}catch(e){throw new Error('Bad JSON from AI: '+mm[0].slice(0,300));}
const arr=v=>Array.isArray(v)?v:[];
const scenes=arr(a.scenes).slice(0,2).map(s=>{
 if(s.type==='stat'){const items=arr(s.items).filter(i=>i&&i.k&&i.v).slice(0,4).map(i=>({k:String(i.k),v:String(i.v)}));if(items.length>=2)return {type:'stat',head:String(s.head||'مواصفات الصنف'),items};return null;}
 const items=arr(s.items).map(String).filter(Boolean).slice(0,4);if(items.length)return {type:'list',head:String(s.head||''),items};return null;}).filter(Boolean);
if(!scenes.length)throw new Error('No scenes in AI output');
const id='reel-'+Date.now().toString(36)+'-'+String(p.slug).replace(/[^A-Za-z0-9]+/g,'-').slice(0,24);
const payload={id,kind:p.kind,title_ar:p.name_ar,title_en:p.name_en,image:p.image,badge:p.kind==='disease'?'دليل أمراض النبات':'صنف من سيدتك',hook:String(a.hook||p.name_ar),scenes,cta:String(a.cta||'متوفر في كل الصيدليات الزراعية بجميع الولايات')};
const tail='\\n\\n📞 للاستفسار والطلب: 0900408009 — 0900905724\\n🌐 seedtech-sd.com'+(p.link&&p.kind==='product'?'\\n🔗 '+p.link:'');
const caption=String(a.caption||'').trim()+tail;
const sd=$getWorkflowStaticData('global');
sd.job={id,slug:p.slug,kind:p.kind,name:p.name_ar,prevScript:JSON.stringify({hook:payload.hook,scenes,cta:payload.cta}),caption,payload,ts:Date.now()};
return [{json:{id,payload,caption,name:p.name_ar}}];`;
code('build_payload', BUILD, [1340, 300]);
link('write_reel', 'build_payload');

add('dispatch', 'n8n-nodes-base.httpRequest', 4.2, { method: 'POST', url: `https://api.github.com/repos/${REPO}/actions/workflows/render.yml/dispatches`, authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', sendHeaders: true, headerParameters: { parameters: [{ name: 'Accept', value: 'application/vnd.github+json' }, { name: 'User-Agent', value: 'seedtech-n8n' }, { name: 'X-GitHub-Api-Version', value: '2022-11-28' }] }, sendBody: true, contentType: 'json', specifyBody: 'json', jsonBody: "={{ JSON.stringify({ref:'main',inputs:{id:$json.id,payload:JSON.stringify($json.payload)}}) }}", options: { response: { response: { fullResponse: true, neverError: true } } } }, { credentials: GH, retryOnFail: true, maxTries: 2, waitBetweenTries: 3000 }, [1600, 300]);
link('build_payload', 'dispatch');

const WAIT = `const j=$('build_payload').first().json;
const d=$input.first().json;
if(d.statusCode&&d.statusCode>=300)throw new Error('GitHub dispatch failed: '+d.statusCode+' '+JSON.stringify(d.body).slice(0,300));
const start=Date.now()-20000;
const api='https://api.github.com/repos/${REPO}';
const hd={'User-Agent':'seedtech-n8n',Accept:'application/vnd.github+json'};
let found=false,fail='';
for(let i=0;i<24;i++){
  await new Promise(r=>setTimeout(r,i===0?25000:10000));
  try{const r=await this.helpers.httpRequest({method:'GET',url:api+'/contents/out/'+j.id+'.mp4?ref=main&t='+Date.now(),headers:hd,json:true,timeout:15000});if(r&&r.name){found=true;break;}}catch(e){}
  try{const rs=await this.helpers.httpRequest({method:'GET',url:api+'/actions/runs?event=workflow_dispatch&per_page=5&t='+Date.now(),headers:hd,json:true,timeout:15000});const run=(rs.workflow_runs||[]).find(x=>new Date(x.created_at).getTime()>=start);if(run&&run.status==='completed'&&run.conclusion!=='success'){fail=run.conclusion+' '+run.html_url;break;}}catch(e){}
}
if(fail)throw new Error('Render failed: '+fail);
if(!found)throw new Error('Render timed out for '+j.id);
const url='https://raw.githubusercontent.com/${REPO}/main/out/'+j.id+'.mp4';
const sd=$getWorkflowStaticData('global');
sd.pending=Object.assign({},sd.job,{url});sd.job=null;
return [{json:{id:j.id,url,name:j.name,caption:sd.pending.caption}}];`;
code('wait_render', WAIT, [1860, 300]);
link('dispatch', 'wait_render');

evo('send_video', 'sendMedia', "{number:'" + ADMIN + "',mediatype:'video',mimetype:'video/mp4',fileName:$json.id+'.mp4',media:$json.url,caption:'🎬 ريل مقترح: '+$json.name}", [2120, 300]);
link('wait_render', 'send_video');
evo('send_caption', 'sendText', "{number:'" + ADMIN + "',text:'📝 نص المنشور المرافق:\\n\\n'+$('wait_render').first().json.caption}", [2380, 300]);
link('send_video', 'send_caption');
evo('send_help', 'sendText', "{number:'" + ADMIN + "',text:'للموافقة اكتب:\\n• ريل نشر\\n• ريل تعديل: (ملاحظتك)\\n• ريل إلغاء'}", [2640, 300]);
link('send_caption', 'send_help');

// ---------- approval ----------
const PARSE = `const t=String(($input.first().json.body&&$input.first().json.body.text)||'').replace(/[\\u064B-\\u0652\\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/\\s+/g,' ').trim();
if(!/^ريل/.test(t))return [{json:{handled:false,cmd:'none'}}];
const rest=t.replace(/^ريل\\s*/,'');
let cmd='help',kind='',note='';
if(rest===''||/^(جديد|اقتراح)$/.test(rest))cmd='suggest';
else if(/^(مرض|امراض)$/.test(rest)){cmd='suggest';kind='disease';}
else if(/^(صنف|منتج)$/.test(rest)){cmd='suggest';kind='product';}
else if(/^(نشر|انشر|موافق)/.test(rest))cmd='publish';
else if(/^(الغاء|الغي|الغ)/.test(rest))cmd='cancel';
else if(/^تعديل/.test(rest)){cmd='edit';note=rest.replace(/^تعديل[:：\\s]*/,'').trim();}
return [{json:{handled:true,cmd,kind,note}}];`;
code('parse_rcmd', PARSE, [300, 700]);
link('Approval webhook', 'parse_rcmd');
add('respond_handled', 'n8n-nodes-base.respondToWebhook', 1.1, { respondWith: 'json', responseBody: '={{ JSON.stringify({handled:$json.handled}) }}', options: {} }, {}, [560, 700]);
link('parse_rcmd', 'respond_handled');
const sw = (key) => ({ conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ id: crypto.randomUUID(), leftValue: '={{ $("parse_rcmd").first().json.cmd }}', rightValue: key, operator: { type: 'string', operation: 'equals' } }], combinator: 'and' }, renameOutput: true, outputKey: key });
add('Switch', 'n8n-nodes-base.switch', 3.2, { rules: { values: ['suggest', 'publish', 'cancel', 'edit', 'help'].map(sw) }, options: {} }, {}, [820, 700]);
link('respond_handled', 'Switch');
// suggest -> pick_topic (reads kind from parse_rcmd)
code('suggest_in', "const c=$('parse_rcmd').first().json;return [{json:{kind:c.kind}}];", [1080, 560]);
link('Switch', 'suggest_in', 0); link('suggest_in', 'pick_topic');
// edit
code('edit_input', `const sd=$getWorkflowStaticData('global');const p=sd.pending;const c=$('parse_rcmd').first().json;
if(!p||!p.slug)return [{json:{noPending:true,msg:'ما في ريل معلق للتعديل. اكتب "ريل" لاقتراح جديد.'}}];
if(!c.note)return [{json:{noPending:true,msg:'اكتب التعديل بعد النقطتين، مثال: ريل تعديل: اختصر النص'}}];
return [{json:{slug:p.slug,kind:p.kind,note:c.note,prevScript:p.prevScript||''}}];`, [1080, 840]);
link('Switch', 'edit_input', 3);
add('edit_ok?', 'n8n-nodes-base.if', 2, { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 }, conditions: [{ id: crypto.randomUUID(), leftValue: '={{ $json.noPending }}', rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, options: {} }, {}, [1340, 840]);
link('edit_input', 'edit_ok?');
link('edit_ok?', 'get_data', 1);
// cancel
code('cancel_r', `const sd=$getWorkflowStaticData('global');const had=!!(sd.pending&&sd.pending.id);sd.pending=null;return [{json:{msg:had?'🗑️ تم إلغاء الريل المقترح.':'ما في ريل معلق.'}}];`, [1080, 980]);
link('Switch', 'cancel_r', 2);
code('help_r', `return [{json:{msg:'أوامر الريلز:\\n• ريل — اقتراح ريل جديد\\n• ريل مرض / ريل صنف — حسب النوع\\n• ريل نشر\\n• ريل تعديل: (ملاحظتك)\\n• ريل إلغاء'}}];`, [1080, 1120]);
link('Switch', 'help_r', 4);
evo('send_reply', 'sendText', "{number:'" + ADMIN + "',text:$json.msg}", [2900, 840]);
link('cancel_r', 'send_reply'); link('help_r', 'send_reply'); link('edit_ok?', 'send_reply', 0);

// publish
code('load_pending', `const sd=$getWorkflowStaticData('global');const p=sd.pending;
if(!p||!p.url)return [{json:{none:true}}];
return [{json:{none:false,url:p.url,caption:p.caption,name:p.name}}];`, [1080, 1260]);
link('Switch', 'load_pending', 1);
add('get_pages', 'n8n-nodes-base.httpRequest', 4.2, { method: 'GET', url: 'https://graph.facebook.com/v25.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&limit=50', authentication: 'predefinedCredentialType', nodeCredentialType: 'facebookGraphApi', options: {} }, { credentials: FBC }, [1340, 1260]);
link('load_pending', 'get_pages');
code('pick_page_r', `const lp=$('load_pending').first().json;
if(lp.none)return [{json:{none:true}}];
const r=$input.first().json;const pages=r.data||[];
const page=pages.find(p=>/سيدتك|seedtech/i.test(p.name))||(pages.length===1?pages[0]:null);
let igId=page&&page.instagram_business_account?page.instagram_business_account.id:'';
if(page&&!igId){try{const g=await this.helpers.httpRequest({method:'GET',url:'https://graph.facebook.com/v25.0/'+page.id,qs:{fields:'instagram_business_account,connected_instagram_account',access_token:page.access_token},json:true});igId=(g.instagram_business_account&&g.instagram_business_account.id)||(g.connected_instagram_account&&g.connected_instagram_account.id)||'';}catch(e){}}
return [{json:{none:false,pageId:page?page.id:'',token:page?page.access_token:'',igId,pageName:page?page.name:'',pages:pages.map(p=>p.name),url:lp.url,caption:lp.caption,name:lp.name,err:r.error?(r.error.message||JSON.stringify(r.error)):''}}];`, [1600, 1260]);
link('get_pages', 'pick_page_r');
code('fb_reel', `const c=$input.first().json;
if(c.none||!c.pageId)return [{json:Object.assign({},c,{fb:{ok:false,err:c.none?'':'no page'}})}];
const g='https://graph.facebook.com/v25.0/';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let fb={ok:false,err:''};
try{
 const s=await this.helpers.httpRequest({method:'POST',url:g+c.pageId+'/video_reels',body:{upload_phase:'start',access_token:c.token},json:true,timeout:30000});
 const vid=s.video_id;if(!vid)throw new Error('no video_id: '+JSON.stringify(s));
 await this.helpers.httpRequest({method:'POST',url:s.upload_url||('https://rupload.facebook.com/video-upload/v25.0/'+vid),headers:{Authorization:'OAuth '+c.token,file_url:c.url},json:true,timeout:90000});
 let up='';
 for(let i=0;i<16;i++){await wait(5000);try{const st=await this.helpers.httpRequest({method:'GET',url:g+vid,qs:{fields:'status',access_token:c.token},json:true,timeout:20000});up=(st.status&&st.status.uploading_phase&&st.status.uploading_phase.status)||'';if(up==='complete')break;if(up==='error')throw new Error('upload error '+JSON.stringify(st.status).slice(0,200));}catch(e){if(/upload error/.test(e.message))throw e;}}
 const f=await this.helpers.httpRequest({method:'POST',url:g+c.pageId+'/video_reels',body:{upload_phase:'finish',video_id:vid,video_state:'PUBLISHED',description:c.caption,access_token:c.token},json:true,timeout:60000});
 fb={ok:!!(f&&(f.success||f.post_id||f.id)),id:vid,err:f&&f.success?'':JSON.stringify(f).slice(0,200)};
}catch(e){fb={ok:false,err:String(e.message||e).slice(0,300)};}
return [{json:Object.assign({},c,{fb})}];`, [1860, 1260]);
link('pick_page_r', 'fb_reel');
code('ig_reel', `const c=$input.first().json;
if(c.none)return [{json:c}];
const g='https://graph.facebook.com/v25.0/';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let ig={ok:false,err:''};
if(!c.igId){ig.err='حساب إنستغرام Business غير ظاهر للتوكن';}
else{try{
 const m=await this.helpers.httpRequest({method:'POST',url:g+c.igId+'/media',body:{media_type:'REELS',video_url:c.url,caption:c.caption,share_to_feed:true,access_token:c.token},json:true,timeout:60000});
 const id=m.id;if(!id)throw new Error('no container id');
 let st='';
 for(let i=0;i<20;i++){await wait(6000);try{const r=await this.helpers.httpRequest({method:'GET',url:g+id,qs:{fields:'status_code,status',access_token:c.token},json:true,timeout:20000});st=r.status_code||'';if(st==='FINISHED')break;if(st==='ERROR'||st==='EXPIRED')throw new Error('IG status '+st+' '+(r.status||''));}catch(e){if(/IG status/.test(e.message))throw e;}}
 if(st!=='FINISHED')throw new Error('IG processing timeout ('+st+')');
 const p=await this.helpers.httpRequest({method:'POST',url:g+c.igId+'/media_publish',body:{creation_id:id,access_token:c.token},json:true,timeout:60000});
 ig={ok:!!p.id,id:p.id,err:p.id?'':JSON.stringify(p).slice(0,200)};
}catch(e){ig={ok:false,err:String(e.message||e).slice(0,300)};}}
return [{json:Object.assign({},c,{ig})}];`, [2120, 1260]);
link('fb_reel', 'ig_reel');
code('done_r', `const c=$input.first().json;
if(c.none)return [{json:{msg:'ما في ريل معلق للنشر. اكتب "ريل" لاقتراح جديد.'}}];
const sd=$getWorkflowStaticData('global');const fb=c.fb||{},ig=c.ig||{};
if(fb.ok||ig.ok){const p=sd.pending;if(p&&p.slug){sd.posted=sd.posted||{};sd.posted[p.slug]=Date.now();}sd.pending=null;}
let msg=(fb.ok?'✅ نُشر الريل على فيسبوك ('+c.pageName+')':'❌ فشل فيسبوك: '+(fb.err||'غير معروف'))+'\\n'+(ig.ok?'✅ نُشر الريل على إنستغرام':'❌ فشل إنستغرام: '+(ig.err||'غير معروف'));
if(!fb.ok&&!ig.ok)msg+='\\nالريل ما زال بانتظارك — ردّ "ريل نشر" بعد معالجة الخطأ.';
return [{json:{msg}}];`, [2380, 1260]);
link('ig_reel', 'done_r'); link('done_r', 'send_reply');

// ---------- errors ----------
add('Error Trigger', 'n8n-nodes-base.errorTrigger', 1, {}, {}, [0, 1400]);
code('err_msg', `const e=$input.first().json;const ex=e.execution||{};
return [{json:{msg:'⚠️ خطأ في فلو الريلز'+(ex.lastNodeExecuted?' (عند '+ex.lastNodeExecuted+')':'')+':\\n'+String((ex.error&&ex.error.message)||'غير معروف').slice(0,400)+'\\nاكتب "ريل" للمحاولة من جديد.'}}];`, [260, 1400]);
link('Error Trigger', 'err_msg');
evo('send_err', 'sendText', "{number:'" + ADMIN + "',text:$json.msg}", [520, 1400]);
link('err_msg', 'send_err');

const wf = { name: 'Seedtech Reels', nodes, connections: conn, settings: { executionOrder: 'v1', timezone: 'Africa/Khartoum' } };
fs.writeFileSync(new URL('./reels-workflow.json', import.meta.url), JSON.stringify(wf));
console.log('nodes', nodes.length, 'bytes', JSON.stringify(wf).length);
