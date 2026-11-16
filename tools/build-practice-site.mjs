#!/usr/bin/env node
/** Build the public, static Intro without embedding the offline installation ZIP. */
import {build} from 'esbuild';
import {readFile,writeFile,mkdir,cp,rm} from 'node:fs/promises';
import {resolve,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=resolve(process.argv[2]||root+'dist/site');
await rm(out,{recursive:true,force:true});await mkdir(out+'/assets',{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex').slice(0,20);
const assetNames=new Set();
async function asset(bytes,extension){const name=hash(bytes)+extension;if(!assetNames.has(name)){await writeFile(out+'/assets/'+name,bytes);assetNames.add(name);}return '__PUBLIC_ASSET__assets/'+name;}
async function images(value){if(typeof value==='string'&&/^data:image\/(?:png|jpeg|webp);base64,/.test(value)){const [,mime,body]=value.match(/^data:(image\/[^;]+);base64,([\s\S]*)$/);return asset(Buffer.from(body,'base64'),mime==='image/jpeg'?'.jpg':mime==='image/webp'?'.webp':'.png');}if(Array.isArray(value))return Promise.all(value.map(images));if(value&&typeof value==='object'){const result={};for(const [key,item]of Object.entries(value))result[key]=await images(item);return result;}return value;}
const catalog=JSON.parse(await readFile(root+'src/practice/real-cases.json','utf8'));
await mkdir(out+'/cases',{recursive:true});
for(const paper of catalog.cases){const copy=structuredClone(paper);delete copy.original;await writeFile(out+'/cases/'+paper.practiceId+'.json',JSON.stringify(copy));}
const lightCatalog=structuredClone(catalog);
for(const paper of lightCatalog.cases){delete paper.original;for(const section of paper.sections)if(section.stimulus?.audio)section.stimulus.audio.dataUrl='data:audio/mp4;base64,AAAA';}
const topics=JSON.parse(await readFile(root+'src/practice/topic-catalog.json','utf8'));
for(const entry of topics.topics){const target=out+'/topics/'+entry.file;await mkdir(dirname(target),{recursive:true});await cp(root+'skills/paper-notebook-practice/examples/topics/'+entry.file,target);}
let css='';
const license=await readFile(root+'licenses/noto-cjk-OFL.txt','utf8');
css+='/* Noto CJK embedded font license\n'+license.replace(/\*\//g,'* /')+'\n*/\n';
for(const [family,name]of [['Noto Serif SC','NotoSerifSC-Regular.otf'],['Noto Sans SC','NotoSansSC-Regular.otf'],['Noto Sans JP','NotoSansJP-Regular.otf'],['Noto Sans KR','NotoSansKR-Regular.otf']]){const url=await asset(await readFile(root+'assets/practice-fonts/'+name),'.otf');css+=`@font-face{font-family:"${family}";src:url("${url}");font-style:normal;font-weight:400;font-display:swap}\n`;}
for(const file of ['paper.css','university-source.css','answer-card.css'])css+=await readFile(root+'src/practice/'+file,'utf8')+'\n';
let math=await readFile(root+'node_modules/katex/dist/katex.min.css','utf8');
for(const url of new Set([...math.matchAll(/url\(([^)]+)\)/g)].map(m=>m[1].replace(/["']/g,'')))){const replacement=await asset(await readFile(root+'node_modules/katex/dist/'+url),extname(url));math=math.split(url).join(replacement);}
css+=math;
const virtual={name:'public-practice-assets',setup(api){
 api.onResolve({filter:/^practice-(paper-styles|skill-package)$/},args=>({path:args.path,namespace:'public-virtual'}));
 api.onLoad({filter:/.*/,namespace:'public-virtual'},args=>({contents:args.path==='practice-skill-package'?`export default '';`:`export default ${JSON.stringify(css)}.replaceAll('__PUBLIC_ASSET__',new URL('.',location.href).href);`,loader:'js'}));
 api.onResolve({filter:/\?raw$/},args=>({path:args.path.slice(0,-4),namespace:'public-raw',pluginData:{resolveDir:args.resolveDir}}));
 api.onLoad({filter:/.*/,namespace:'public-raw'},async args=>{const file=args.path.startsWith('.')?resolve(args.pluginData.resolveDir,args.path):fileURLToPath(import.meta.resolve(args.path));return{contents:await readFile(file,'utf8'),loader:'text'};});
 api.onLoad({filter:/real-cases\.json$/},()=>({contents:JSON.stringify(lightCatalog),loader:'json'}));
 api.onLoad({filter:/(?:real-case-pages|real-case-thumbnails|template-thumbnails|topic-showcase-pages)\.json$/},async args=>({contents:`const data=${JSON.stringify(await images(JSON.parse(await readFile(args.path,'utf8'))))};function resolve(value){if(typeof value==='string'&&value.startsWith('__PUBLIC_ASSET__'))return new URL(value.slice(16),new URL('.',location.href)).href;if(Array.isArray(value))return value.map(resolve);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,resolve(v)]));return value;}export default resolve(data);`,loader:'js'}));
}};
const result=await build({entryPoints:[root+'src/practice/workspace.ts'],outdir:out+'/assets',entryNames:'practice-[hash]',chunkNames:'part-[hash]',bundle:true,format:'esm',splitting:true,target:'es2022',minify:true,legalComments:'linked',metafile:true,plugins:[virtual]});
const entry=Object.entries(result.metafile.outputs).find(([,info])=>info.entryPoint?.endsWith('workspace.ts'))[0];
const entryPath=entry.slice(entry.lastIndexOf('/assets/')+1);
const release='https://github.com/BurntRoses/paper-notebook-practice/releases/latest/download/';
const config={skillUrl:release+'paper-notebook-practice-skill.zip',downloadUrl:release+'paper-notebook-practice.zip',topicBaseUrl:'./topics/',caseBaseUrl:'./cases/'};
await writeFile(out+'/index.html',`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f8f9f6"><meta name="description" content="上传往年卷、讲义和知识点，整理题库，制作试卷、答案与答题纸。覆盖中高考、考公考研、国际课程、语言、入籍与艺术，免费开源。"><meta property="og:title" content="纸间 Practice · 从资料到整套试卷"><meta property="og:description" content="整理题库，制作可作答、可编辑的整套试卷。免费开源，本机导出。"><title>纸间 Practice · 从资料到整套试卷</title><link rel="icon" href="./favicon.svg" type="image/svg+xml"><style>html,body{margin:0;background:#f8f9f6;color:#263b30;font-family:system-ui,sans-serif}.initial{display:grid;place-content:center;min-height:100svh;gap:14px;text-align:center}.initial strong{font-size:28px}.initial p{font-size:15px;color:#506057}.initial a{color:inherit}</style><script>window.__PRACTICE_WEB__=${JSON.stringify(config)};for(const key of ['topicBaseUrl','caseBaseUrl'])window.__PRACTICE_WEB__[key]=new URL(window.__PRACTICE_WEB__[key],location.href).href;</script></head><body><div id="practice-app"><div class="initial"><strong>纸间 Practice</strong><p>正在准备试卷案例…</p><a href="https://github.com/BurntRoses/paper-notebook-practice">GitHub 项目</a></div></div><noscript>请启用 JavaScript 查看试卷，或从 GitHub 下载离线工具。</noscript><script type="module" src="./${entryPath}"></script></body></html>`);
await writeFile(out+'/favicon.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#f1f4ed"/><path d="M12 14h16l4 4 4-4h16v36H36l-4 4-4-4H12zm20 4v36" fill="none" stroke="#315648" stroke-width="3" stroke-linejoin="round"/></svg>');
await writeFile(out+'/.nojekyll','');
await cp(root+'LICENSE',out+'/LICENSE.txt');await cp(root+'THIRD_PARTY_NOTICES.txt',out+'/THIRD_PARTY_NOTICES.txt');
await writeFile(out+'/robots.txt','User-agent: *\nAllow: /\n');
console.log(`Public Intro: ${out}; ${assetNames.size} shared assets, ${topics.topics.length} lazy topic papers.`);
