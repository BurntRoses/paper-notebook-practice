#!/usr/bin/env node
/** Build the public, static Intro without embedding the offline installation ZIP. */
import {build} from 'esbuild';
import {readFile,writeFile,mkdir,cp,rm} from 'node:fs/promises';
import {resolve,dirname,extname,relative,isAbsolute,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {recordGlyphs,writeExportFonts} from './build-export-fonts.mjs';
import {tsImport} from 'tsx/esm/api';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=resolve(process.argv[2]||root+'dist/site');
const fromOutput=relative(out,root);
const fromRoot=relative(root,out);
const insideRoot=fromRoot&&!isAbsolute(fromRoot)&&fromRoot!=='..'&&!fromRoot.startsWith('..'+sep);
if(!fromOutput||!isAbsolute(fromOutput)&&fromOutput!=='..'&&!fromOutput.startsWith('..'+sep)||insideRoot&&!fromRoot.startsWith('dist'+sep))throw Error('Choose a dedicated site output directory under dist/ or outside the repository.');
await rm(out,{recursive:true,force:true});await mkdir(out+'/assets',{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex').slice(0,20);
const assetNames=new Set();
async function asset(bytes,extension){const name=hash(bytes)+extension;if(!assetNames.has(name)){assetNames.add(name);await writeFile(out+'/assets/'+name,bytes);}return '__PUBLIC_ASSET__assets/'+name;}
const {sourceEditions}=await tsImport('../src/practice/source-editions.ts',import.meta.url);
const catalog=JSON.parse(await readFile(root+'src/practice/real-cases.json','utf8'));
const {summarizeCase}=await tsImport('../src/practice/case-summary.ts',import.meta.url);
const {catalogShelf,publicPaperSets,legacyCatalogLayouts}=await tsImport('../src/practice/catalog-shelf.ts',import.meta.url);
const {siteAudioExtensions,hasSeparateAnswerCard}=await tsImport('../src/practice/model.ts',import.meta.url);
const {validatePractice}=await tsImport('../src/practice/validate.ts',import.meta.url);
const {catalogSources}=await tsImport('../src/practice/catalog-sources.ts',import.meta.url);
const {regionNames,languageNames,sourceRoles}=await tsImport('../src/practice/catalog-identity.ts',import.meta.url);
const {PAPER_TEMPLATES}=await tsImport('../src/practice/templates.ts',import.meta.url);
const {REFERENCE_PAPERS}=await tsImport('../src/practice/reference-papers.ts',import.meta.url);
const listings=new Map(catalogShelf.map(entry=>[entry.id,entry]));
const publicIds=new Set(publicPaperSets.map(entry=>entry.id));
const {inferExamSpecification}=await tsImport('../src/practice/exam-specification.ts',import.meta.url);
const {verifyPracticeHtml}=await tsImport('../src/practice/build.ts',import.meta.url);
const {escapePaper,renderPractice}=await tsImport('../src/practice/paper.ts',import.meta.url);
const {catalogPaper}=await tsImport('../src/practice/generated-paper.ts',import.meta.url);
const {catalogGuides}=await tsImport('../src/practice/catalog-guides.ts',import.meta.url);
const {homePapers}=await tsImport('../src/practice/home-papers.ts',import.meta.url);
const {workbenchTasks}=await tsImport('../src/practice/workbench-tasks.ts',import.meta.url);
const scanEvidence=JSON.parse(await readFile(root+'src/practice/workbench-scan.json','utf8'));
for(const [category,guide] of Object.entries(catalogGuides)){
 const sample=listings.get(guide.sample);
 if(sample?.category!==category||sample.kind!=='paper')throw Error('Invalid category representative: '+category);
}
if(!homePapers.length||homePapers.length%2)throw Error('Featured papers must fill both columns');
if(new Set(homePapers.map(paper=>paper.id)).size!==homePapers.length)throw Error('Duplicate featured paper');
for(const paper of homePapers){
 const listing=listings.get(paper.id);
 if(!publicIds.has(paper.id)||listing?.scope!=='full'||listing.request.kind!==paper.kind)throw Error('Featured paper must link to a complete source: '+paper.id);
}
for(const task of Object.values(workbenchTasks)){
 if(listings.get(task.exampleId)?.scope!=='full'||task.supplementaryId&&!listings.has(task.supplementaryId)){
  throw Error('Workbench example does not match the catalog: '+task.exampleId);
 }
}
if(scanEvidence.paperId!==workbenchTasks.scan.exampleId||scanEvidence.page!==1||!scanEvidence.lines.length||
   scanEvidence.lines.some(line=>!line.raw||line.confidence<0||line.confidence>1||line.bounds.length!==4||
    line.bounds.some(value=>!Number.isFinite(value)||value<0||value>1))){
 throw Error('OCR demonstration evidence must match the source page');
}

const validURL=value=>{try{return ['https:','http:'].includes(new URL(value).protocol);}catch{return false;}};
const pathToken=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
for(const edition of sourceEditions){
 const listing=listings.get(edition.id);
 verifyListing(listing);
 const {volumes}=edition;
 if(!publicIds.has(edition.id)||listing.request.kind!=='source'||!pathToken.test(edition.assetDirectory)||
    !edition.attribution||![edition.publication,edition.copyrightReport,edition.licence].every(validURL)||
    new Set(volumes.map(part=>part.id)).size!==volumes.length||volumes[0]?.role!=='exam'||!volumes.some(part=>part.role==='answers')){
  throw Error('Incomplete publisher set: '+edition.id);
 }
 for(const part of volumes){
  if(!pathToken.test(part.id)||!part.label||!part.title||!validURL(part.url)||!/^[a-f0-9]{64}$/.test(part.sha256)||
     !Number.isInteger(part.pages)||part.pages<1||part.openingPage!==undefined&&(!Number.isInteger(part.openingPage)||part.openingPage<1||part.openingPage>part.pages)){
   throw Error('Missing source for '+edition.id+'/'+part.id);
  }
  const packed=await readFile(root+'assets/'+edition.assetDirectory+'/'+part.id+'.b64','utf8');
  const {width,height,pages}=JSON.parse(inflateSync(Buffer.from(packed,'base64')).toString('utf8'));
  const rasterPages=new Set(part.rasterPages);
  if([...rasterPages].some(page=>!Number.isInteger(page)||page<1||page>part.pages)||
     !Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0||pages.length!==part.pages||
     pages.some(([image,spans],index)=>{
      const data=Buffer.from(image,'base64');
      const validImage=rasterPages.has(index+1)?data.toString('ascii',8,12)==='WEBP':data.toString('utf8',0,5)==='<svg ';
      return !validImage||!Array.isArray(spans);
     })){
   throw Error('Invalid original-page geometry or content for '+edition.id+'/'+part.id);
  }
 }
}
const validRegions=new Set(Object.values(regionNames));
for(const source of REFERENCE_PAPERS){
 if(!source.id||!source.board||!source.language||!validRegions.has(source.region)||!source.scope||
    !source.rights?.note||![source.paperUrl,source.answerUrl,source.specificationUrl].filter(Boolean).every(validURL)){
  throw Error('Incomplete publisher reference: '+source.id);
 }
}
function verifyListing(entry){
 if(!entry?.title||!entry.subject||!entry.grade||!entry.issuer||!Object.hasOwn(regionNames,entry.region)||!Object.hasOwn(languageNames,entry.language)){
  throw Error('Incomplete catalog identity: '+entry?.id);
 }
}
const fontProfiles=new Set();
function validatePaper(id,paper,kind){
 if(paper.original)throw Error(id+': catalog papers must not bundle original pages');
 const result=validatePractice(paper,undefined,true);
 if(!result.valid)throw Error(id+': '+result.errors.map(({path,message})=>path+' '+message).join('; '));
 recordGlyphs(paper,renderPractice,hasSeparateAnswerCard(paper),fontProfiles);
 const listing=listings.get(id);
 verifyListing(listing);
 if(listing.request.kind!==kind||listing.request.id!==id||listing.documentId!==paper.practiceId||
    listing.questionCount!==paper.sections.reduce((total,section)=>total+section.questions.length,0)||
    (paper.presentation?.language&&listing.paperLanguage!==paper.presentation.language)||
    (validRegions.has(paper.authoring?.region)&&regionNames[listing.region]!==paper.authoring.region)||
    (paper.mode==='bank'&&(listing.scope!=='bank'||listing.kind!=='bank'))||
    (listing.scope==='full'&&paper.exam?.scope!=='full')){
  throw Error('Catalog and author document disagree: '+id);
 }
 const documented=catalogSources(paper);
 if(publicIds.has(id)){
  const spec=inferExamSpecification(paper);
  const publishedQualification=listing.category==='职业资格';
  if(!spec||paper.exam?.scope!=='full'||paper.generation?.unresolved?.length||
     publishedQualification&&spec.source?.kind==='user-blueprint')throw Error('Incomplete published paper set: '+id);
  const display=catalogPaper(paper);
  for(const volume of hasSeparateAnswerCard(paper)?['exam','answers','answer-card']:['exam','answers']){
   const html=renderPractice(display,{kind:volume,runtime:''});
   const check=verifyPracticeHtml(html,display);
   if(!check.valid)throw Error(id+' '+volume+': '+check.errors.map(({path,message})=>path+' '+message).join('; '));
   const markup=html.match(/<template id="paper-template">([\s\S]*?)<\/template>/)?.[1]??'';
   if(/\bclass="(?:source-citation|answer-provenance)\b|\bdata-answer-evidence=/.test(markup)){
    throw Error(id+' '+volume+': question citations must not appear in the paper');
   }
   if(volume==='answer-card'){
    const slots=[...markup.matchAll(/<[a-z][^<>]*\sdata-question="([^"]+)"[^<>]*>/g)]
     .filter(([tag])=>!(/\shidden(?:\s|=|>)/.test(tag))).map(([,question])=>question);
    const expected=display.sections.flatMap(section=>section.questions.map(question=>escapePaper(question.id)));
    if(slots.length!==expected.length||slots.some((slot,index)=>slot!==expected[index])){
     throw Error(id+': answer card must have a visible response slot for every question in paper order');
    }
   }
  }
 }
 if(id===scanEvidence.paperId&&scanEvidence.lines.some(line=>!paper.sections[0].questions.some(question=>question.number===line.question))){
  throw Error('OCR demonstration refers to a missing question: '+id);
 }
 if(!documented.some(source=>source.role==='question')||
    documented.some(source=>!sourceRoles.includes(source.role)||!source.title||source.url&&!validURL(source.url))){
  throw Error('Incomplete source roles: '+id);
 }
}
for(const template of PAPER_TEMPLATES){
 const listing=listings.get('layout:'+template.id);
 verifyListing(listing);
 if(listing.request.kind!=='template'||listing.request.id!==template.id||listing.scope!=='layout'||!validURL(template.source.url)){
  throw Error('Incorrect layout reference: '+template.id);
 }
}
const caseIndex={sources:catalog.sources,cases:catalog.cases.map(summarizeCase)};
await mkdir(out+'/cases',{recursive:true});
for(const paper of catalog.cases){
 const copy=structuredClone(paper);
 for(const section of copy.sections){
  const audio=section.stimulus?.audio;
  if(!audio?.dataUrl)continue;
  const [prefix,body]=audio.dataUrl.split(',',2),extension=siteAudioExtensions[audio.mimeType];
  if(!extension||prefix!==`data:${audio.mimeType};base64`)throw Error('Invalid listening asset: '+paper.practiceId+'/'+section.id);
  audio.url=(await asset(Buffer.from(body,'base64'),'.'+extension)).slice('__PUBLIC_ASSET__'.length);
  delete audio.dataUrl;
 }
 validatePaper(paper.practiceId,copy,'case');
 await writeFile(out+'/cases/'+paper.practiceId+'.json',JSON.stringify(copy));
}
const examples=JSON.parse(await readFile(root+'src/practice/template-examples.json','utf8'));
await mkdir(out+'/examples',{recursive:true});
for(const [id,paper] of Object.entries(examples)){
 validatePaper(id,paper,'example');
 await writeFile(out+'/examples/'+id+'.json',JSON.stringify(paper));
}
const topics=JSON.parse(await readFile(root+'src/practice/topic-catalog.json','utf8'));
for(const entry of topics.topics){
 if(!/^[a-z0-9-]+\/[a-z0-9-]+\.json$/.test(entry.file))throw Error('Invalid topic path: '+entry.file);
 const bytes=await readFile(root+'skills/paper-notebook-practice/examples/topics/'+entry.file);
 if(createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error('Stale topic catalog: '+entry.file);
 const paper=JSON.parse(bytes.toString('utf8'));if(paper.practiceId!==entry.id)throw Error('Topic ID mismatch: '+entry.file);
 validatePaper(entry.id,paper,'topic');
 const target=out+'/topics/'+entry.file;await mkdir(dirname(target),{recursive:true});await writeFile(target,bytes);
}
const license=await readFile(root+'licenses/noto-cjk-OFL.txt','utf8');
let printFonts='/* Noto CJK embedded font license\n'+license.replace(/\*\//g,'* /')+'\n*/\n';
for(const [family,name]of [['Noto Serif SC','NotoSerifSC-Regular.otf'],['Noto Sans SC','NotoSansSC-Regular.otf'],['Noto Sans JP','NotoSansJP-Regular.otf'],['Noto Sans KR','NotoSansKR-Regular.otf']]){
 const font=await readFile(root+'assets/practice-fonts/'+name),url=await asset(font,'.otf');
 await writeExportFonts(out+'/assets',font,family,fontProfiles);
 printFonts+=`@font-face{font-family:"${family}";src:url("${url}");font-style:normal;font-weight:400;font-display:swap}\n`;
}
let css='';
for(const file of ['paper.css','university-source.css','answer-card.css'])css+=await readFile(root+'src/practice/'+file,'utf8')+'\n';
let math=await readFile(root+'node_modules/katex/dist/katex.min.css','utf8');
math=math.replace(/,url\([^)]*\.(?:woff|ttf)\) format\([^)]+\)/g,'');
for(const url of new Set([...math.matchAll(/url\(([^)]+)\)/g)].map(m=>m[1].replace(/["']/g,'')))){const replacement=await asset(await readFile(root+'node_modules/katex/dist/'+url),extname(url));math=math.split(url).join(replacement);}
css+=math;
const virtual={name:'public-practice-assets',setup(api){
 api.onResolve({filter:/^practice-(paper-styles|offline-topics)$/},args=>({path:args.path,namespace:'public-virtual'}));
 api.onLoad({filter:/.*/,namespace:'public-virtual'},args=>({contents:args.path==='practice-offline-topics'?`export default '';`:`const base=new URL('.',location.href).href; export const previewPaperCSS=${JSON.stringify(css)}.replaceAll('__PUBLIC_ASSET__',base); export default ${JSON.stringify(printFonts)}.replaceAll('__PUBLIC_ASSET__',base)+previewPaperCSS;`,loader:'js'}));
 api.onResolve({filter:/\?raw$/},args=>({path:args.path.slice(0,-4),namespace:'public-raw',pluginData:{resolveDir:args.resolveDir}}));
 api.onLoad({filter:/.*/,namespace:'public-raw'},async args=>{const file=args.path.startsWith('.')?resolve(args.pluginData.resolveDir,args.path):fileURLToPath(import.meta.resolve(args.path));return{contents:await readFile(file,'utf8'),loader:'text'};});
 api.onResolve({filter:/^\.\/catalog-shelf$/},args=>({path:args.path,namespace:'public-shelf'}));
 api.onLoad({filter:/.*/,namespace:'public-shelf'},()=>{
  const demoIds=new Set(Object.values(workbenchTasks).flatMap(task=>[task.exampleId,task.supplementaryId]));
  const demoEntries=catalogShelf.filter(entry=>demoIds.has(entry.id)&&!publicIds.has(entry.id));
  return {contents:`export const publicPaperSets=${JSON.stringify(publicPaperSets)};export const catalogShelf=[...publicPaperSets,...${JSON.stringify(demoEntries)}];export const legacyCatalogLayouts=new Map(${JSON.stringify([...legacyCatalogLayouts])});`,loader:'js'};
 });
 api.onResolve({filter:/^\.\/(?:case-index|embedded-examples)$/},args=>({path:args.path,namespace:'public-case-index'}));
 api.onLoad({filter:/.*/,namespace:'public-case-index'},args=>({contents:args.path.endsWith('case-index')?
  `export const caseIndex=${JSON.stringify(caseIndex)};`:
  `const ids=new Set(${JSON.stringify(Object.keys(examples))});export const hasEmbeddedTemplate=id=>ids.has(id);export const embeddedCase=()=>undefined;export const embeddedTemplate=()=>undefined;`,loader:'js'}));
}};
const result=await build({entryPoints:[root+'src/practice/workspace.ts'],outdir:out+'/assets',entryNames:'practice-[hash]',chunkNames:'part-[hash]',bundle:true,format:'esm',splitting:true,target:'es2022',minify:true,legalComments:'linked',metafile:true,loader:{'.b64':'text'},plugins:[virtual]});
const entry=Object.entries(result.metafile.outputs).find(([,info])=>info.entryPoint?.endsWith('workspace.ts'))[0];
const entryPath=entry.slice(entry.lastIndexOf('/assets/')+1);
function staticImports(entry){
 const files=new Set();
 function visit(path){if(files.has(path))return;files.add(path);for(const dependency of result.metafile.outputs[path].imports)if(dependency.kind==='import-statement'&&!dependency.external)visit(dependency.path);}
 visit(entry);return[...files];
}
const shellFiles=staticImports(entry);
const fileBytes=files=>files.reduce((total,path)=>total+result.metafile.outputs[path].bytes,0);
const shellBytes=fileBytes(shellFiles);
const shelfEntry=Object.entries(result.metafile.outputs).find(([,info])=>info.entryPoint==='public-shelf:./catalog-shelf')?.[0];
if(!shelfEntry)throw Error('The site must load its catalog separately from the editor.');
const shelfFiles=staticImports(shelfEntry).filter(path=>!shellFiles.includes(path));
const shelfBytes=fileBytes(shelfFiles);
const previewEntry=Object.entries(result.metafile.outputs).find(([,info])=>info.entryPoint?.endsWith('/preview-tools.ts'))?.[0];
if(!previewEntry)throw Error('The site must load its preview separately from the editor.');
const previewFiles=staticImports(previewEntry);
const preloadFiles=new Set([...shellFiles,...previewFiles]);
const initialBytes=fileBytes([...preloadFiles]);
const publicPath=path=>'./'+path.slice(path.lastIndexOf('/assets/')+1);
const catalogPreloads='<script>if(location.hash.split(\"?\")[0]===\"#templates\"){for(const href of '+JSON.stringify(shelfFiles.map(publicPath))+'){const link=document.createElement(\"link\");link.rel=\"modulepreload\";link.href=href;document.head.append(link);}}</script>';
const modulePreloads=shellFiles.map(path=>`<link rel="modulepreload" href="${publicPath(path)}">`).join('');

if(shellBytes>250_000)throw Error('Homepage JavaScript exceeded the 250 KB build budget: '+shellBytes+' B.');
if(initialBytes>1_050_000)throw Error('Homepage and first-paper JavaScript exceeded the build budget: '+initialBytes+' B.');
if(shelfBytes>105_000)throw Error('Catalog JavaScript exceeded the 105 KB build budget: '+shelfBytes+' B.');
const project='https://github.com/BurntRoses/paper-notebook-practice';
const site='https://burntroses.github.io/paper-notebook-practice/';
const release=project+'/releases/latest/download/';
const config={skillUrl:release+'paper-notebook-practice-skill.zip',topicBaseUrl:'./topics/',caseBaseUrl:'./cases/',exampleBaseUrl:'./examples/',previewPreloads:previewFiles.filter(path=>!shellFiles.includes(path)).map(publicPath)};
const startupCSS='html,body{margin:0;background:#f8f9f6;color:#263b30;font-family:system-ui,sans-serif}.initial{display:grid;place-content:center;min-height:100svh;padding:0 20px;gap:14px;text-align:center}.initial strong{font-size:28px}.initial p{font-size:15px;color:#506057}.initial a{color:inherit}.initial button{font:inherit;padding:8px 12px;justify-self:center}';
const startupLinks=`<a href="${release}paper-notebook-practice.zip">下载离线工具</a><a href="${project}">GitHub 项目</a>`;
await writeFile(out+'/index.html',`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${modulePreloads}${catalogPreloads}<meta name="theme-color" content="#f8f9f6"><meta name="description" content="上传往年卷、讲义和知识点，整理题库，制作试卷、答案与答题纸。覆盖小学、中高考、考公考研、国际课程、语言、入籍与艺术，免费开源。"><meta property="og:title" content="纸间 Practice · 从资料到整套试卷"><meta property="og:description" content="整理题库，制作可作答、可编辑的整套试卷。免费开源，本机导出。"><title>纸间 Practice · 从资料到整套试卷</title><link rel="icon" href="./favicon.svg" type="image/svg+xml"><style>${startupCSS}</style><noscript><style>#startup-message{display:none}</style></noscript><script>window.__PRACTICE_WEB__=${JSON.stringify(config)};</script></head><body><div id="practice-app"><div class="initial"><strong>纸间 Practice</strong><p id="startup-message" role="status">正在打开工作台…</p><noscript>请启用 JavaScript 查看试卷，或下载离线工具。</noscript><button id="startup-reload" hidden>重新加载页面</button>${startupLinks}</div></div><script>(()=>{const message=document.getElementById('startup-message'),reload=document.getElementById('startup-reload');const show=text=>{if(message.isConnected){message.textContent=text;reload.hidden=false;}};reload.onclick=()=>location.reload();const timer=setTimeout(()=>show('加载比平时久，可继续等待、重新加载或使用离线工具。'),10000);window.addEventListener('error',event=>{if(event.target===window||event.target.id==='practice-entry'){clearTimeout(timer);show('工作台资源未能载入，请重新加载或使用离线工具。');}},true);})();</script><script id="practice-entry" type="module" src="./${entryPath}"></script></body></html>`);
await writeFile(out+'/404.html',`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>页面不存在 · 纸间 Practice</title><style>${startupCSS}</style></head><body><main class="initial"><strong>页面不存在</strong><p>这个地址不是纸间 Practice 的有效页面。</p><a href="${site}">返回纸间 Practice 首页</a>${startupLinks}</main></body></html>`);
await writeFile(out+'/favicon.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#f1f4ed"/><path d="M12 14h16l4 4 4-4h16v36H36l-4 4-4-4H12zm20 4v36" fill="none" stroke="#315648" stroke-width="3" stroke-linejoin="round"/></svg>');
await writeFile(out+'/.nojekyll','');
await cp(root+'LICENSE',out+'/LICENSE.txt');await cp(root+'THIRD_PARTY_NOTICES.txt',out+'/THIRD_PARTY_NOTICES.txt');
await writeFile(out+'/robots.txt','User-agent: *\nAllow: /\n');
console.log(`Public Intro: ${out}; ${assetNames.size} shared assets, ${topics.topics.length} lazy topic papers; ${shellBytes} B shell JS, ${initialBytes} B including first-paper JS, ${shelfBytes} B extra catalog JS.`);
