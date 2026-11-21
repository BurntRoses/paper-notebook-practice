#!/usr/bin/env node
/** Full offline topic library. Shared local assets avoid repeating fonts in every paper. */
import {build} from 'esbuild';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {tsImport} from 'tsx/esm/api';
import {zipSync,strToU8} from 'fflate';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=resolve(process.argv[2]||root+'dist/practice');
const library=resolve(out,'topics');
const catalog=JSON.parse(await readFile(root+'src/practice/topic-catalog.json','utf8'));
const {loadPracticeStyles,buildPracticeHtml,verifyPracticeHtml}=await tsImport('../src/practice/build.ts',import.meta.url);
const {assertPractice}=await tsImport('../src/practice/validate.ts',import.meta.url);
const {catalogPaper}=await tsImport('../src/practice/generated-paper.ts',import.meta.url);
const css=await loadPracticeStyles();
const runtime=(await build({stdin:{contents:"import {practiceSession,practiceDigest,normalizePracticeAnswer} from './src/practice/session.ts';import {paperExportRuntime} from './src/practice/export-runtime.ts';practiceSession(practiceDigest,normalizePracticeAnswer);paperExportRuntime();",resolveDir:root,loader:'ts'},bundle:true,platform:'browser',format:'iife',target:'es2022',minify:true,write:false})).outputFiles[0].text;
const entries={};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function add(path,data){const bytes=typeof data==='string'?strToU8(data):data;entries[path]=bytes;const target=resolve(library,path);await mkdir(resolve(target,'..'),{recursive:true});await writeFile(target,bytes);}
// Synchronous local script installs a real style node, also visible to PDF/Word/PNG export.
await add('assets/paper-styles.js',`(()=>{const style=document.createElement('style');style.textContent=${JSON.stringify(css)};document.currentScript.before(style);})();\n`);
await add('assets/paper-runtime.js',runtime);
await add('LICENSE',await readFile(root+'LICENSE'));
await add('licenses/noto-cjk-OFL.txt',await readFile(root+'licenses/noto-cjk-OFL.txt'));
await add('THIRD_PARTY_NOTICES.txt',await readFile(root+'THIRD_PARTY_NOTICES.txt'));
await add('catalog.json',JSON.stringify(catalog,null,2)+'\n');
const groups={'primary-school':'小学','civil-service':'考公','postgraduate':'考研','engineering-course':'工程课程','engineering-qualification':'工程资格'};
const manifest={version:'1.0.0',license:'MIT',layout:'local-shared-assets',papers:[],files:{}};
let links='';
for(const {family} of catalog.topics)if(!Object.hasOwn(groups,family))throw Error('Unknown offline topic group: '+family);
const e=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for(const family of Object.keys(groups)){
 links+=`<section><h2>${groups[family]}</h2><ul>`;
 for(const entry of catalog.topics.filter(p=>p.family===family)){
  const raw=await readFile(root+'skills/paper-notebook-practice/examples/topics/'+entry.file);
  if(hash(raw)!==entry.sha256)throw Error('Stale topic catalog: '+entry.file);
  const paper=catalogPaper(JSON.parse(raw));assertPractice(paper);
  const folder=family+'/'+paper.practiceId,files={};
  await add(folder+'/practice.json',JSON.stringify(paper,null,2)+'\n');
  for(const [kind,label]of [['exam','试卷'],['answers','答案卷'],['answer-card','答题卡']]){
   const filename=label+'.html';
   let html=await buildPracticeHtml(paper,{kind,css:'',runtime:''});
   html=html.replace('<style>','<script src="../../assets/paper-styles.js"></script><style>').replace('</body>','<script src="../../assets/paper-runtime.js"></script></body>');
   const check=verifyPracticeHtml(html,paper);if(!check.valid)throw Error(entry.id+' '+kind+' '+JSON.stringify(check.errors));
   await add(folder+'/'+filename,html);files[kind]=folder+'/'+filename;
  }
  manifest.papers.push({id:entry.id,routeId:entry.routeId,family,title:paper.title,sourceSha256:entry.sha256,questions:entry.questionCount,files});
  links+=`<li><b>${e(paper.title)}</b><span>${['exam','answers','answer-card'].map((kind,i)=>`<a href="${encodeURI(files[kind])}">${['试卷','答案与评分','答题纸'][i]}</a>`).join('')}<a href="${encodeURI(folder+'/practice.json')}" download>作者题库</a></span></li>`;
 }
 links+='</ul></section>';
}
await add('index.html',`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>纸间 · 专题试卷</title><style>body{max-width:960px;margin:48px auto;padding:0 24px;background:#f8f9f6;color:#212b27;font:16px/1.65 system-ui}h1{font-size:32px}h2{margin-top:40px;font-size:22px}ul{padding:0;list-style:none}li{padding:14px 0;border-bottom:1px solid #dde2dc;display:flex;gap:20px;justify-content:space-between}span{display:flex;gap:16px;flex-shrink:0}a{color:#1b624d;text-underline-offset:3px}a:focus-visible{outline:none;background:#d7e9de;color:#123d2e}a:hover{color:#123d2e}a:active{background:#cde1d5}@media(max-width:700px){li{display:block}span{flex-wrap:wrap;gap:12px}}</style><h1>纸间专题试卷</h1><p>按专题打开试卷、答案与评分细则、答题纸。完整目录可离线使用，PDF、Word 和 PNG 在本机导出。</p>${links}<footer><p>MIT 免费项目 · <a href="https://github.com/BurntRoses/paper-notebook-practice">GitHub</a></p></footer></html>`);
await add('使用说明.md',`# 纸间专题试卷\n\n解压后打开 index.html。请保留 assets 与各专题子目录的相对位置；全部试卷、字体、公式、图表和运行脚本均在本地，不需要服务器或网络。\n\n每卷包含试卷、答案与评分、答题纸、完整作者题库。试卷和答题纸不含答案及评分依据；practice.json 与答案卷包含完整内容。导入对应答案卷后查看解析与少选部分分。\n\n本包使用共享本地字体与运行文件，避免逐卷重复字体。需要可单独移动的 HTML 时，将 practice.json 导入预览台下载整套文件，或用 Skill 的 build 命令生成自包含 HTML。\n\n新编卷均以真实任务求解，来源与生成身份保存在作者题库。官方结构、作者蓝图、指定年度与规范版本分别记录；自定义课程和资格案例不冒充特定年份官方原卷。资格案例中的题设比较指标不代替实际法规。\n\n免费 MIT 代码与原创题目；来源页短引文仅用于范围和证据，第三方权利见各材料记录。\n`);
for(const [name,bytes]of Object.entries(entries))manifest.files[name]={bytes:bytes.length,sha256:hash(bytes)};
await add('manifest.json',JSON.stringify(manifest,null,2)+'\n');
await writeFile(out+'/paper-notebook-practice-topics.zip',zipSync(entries));
await writeFile(out+'/topic-delivery-manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`Complete topic library: ${manifest.papers.length} papers, ${Object.keys(entries).length} local files.`);
