#!/usr/bin/env node
import {build} from 'esbuild';
import {mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tsImport} from 'tsx/esm/api';
import {zipSync,strToU8} from 'fflate';
import {createHash} from 'node:crypto';

const root=fileURLToPath(new URL('../',import.meta.url));
await import('./build-topic-catalog.mjs');
await import('./build-practice-skill.mjs');
const out=resolve(process.argv[2]||root+'dist/practice');
const {version}=JSON.parse(await readFile(root+'package.json','utf8'));
await mkdir(out,{recursive:true});
const entries={};
async function include(relative){for(const item of await readdir(root+relative,{withFileTypes:true})){if(item.name==='__pycache__'||item.name==='.DS_Store'||item.name.endsWith('.pyc'))continue;const path=relative+'/'+item.name;if(item.isDirectory())await include(path);else entries[path]=new Uint8Array(await readFile(root+path));}}
await include('skills/paper-notebook-practice');
entries['WEB_CHAT.md']=new Uint8Array(await readFile(root+'WEB_CHAT.md'));
entries['AGENTS.md']=new Uint8Array(await readFile(root+'AGENTS.md'));

entries['README.txt']=strToU8('将 skills/paper-notebook-practice 安装到自己的 Agent 技能目录。命令行入口：node skills/paper-notebook-practice/scripts/practice.mjs help。sources 按版式或考试路线读取真实样卷与评分集合；routes 查看考试路线；topics 按需读取考公、考研、工程专题完整卷。基础组卷只需 Node.js 20.19+；扫描件 OCR 使用免费的本机 Python 与 Vision/Tesseract，安装方式见 Skill references/ocr-replica.md。MIT 免费开源。');
const skillZip=zipSync(entries);
await writeFile(out+'/paper-notebook-practice-skill.zip',skillZip);
const {loadPracticeStyles,buildPracticeHtml}=await tsImport('../src/practice/build.ts',import.meta.url);
const paperCSS=await loadPracticeStyles();
const {generatedPaper}=await tsImport('../src/practice/generated-paper.ts',import.meta.url);
const result=await build({entryPoints:[root+'src/practice/workspace.ts'],bundle:true,write:false,format:'iife',target:'es2022',minify:false,legalComments:'inline',plugins:[{
 name:'practice-offline',setup(api){
  api.onResolve({filter:/^practice-paper-styles$/},()=>({path:'styles',namespace:'practice'}));
  api.onResolve({filter:/^practice-skill-package$/},()=>({path:'skill',namespace:'practice'}));
  api.onLoad({filter:/.*/,namespace:'practice'},args=>({contents:`export default ${JSON.stringify(args.path==='skill'?Buffer.from(skillZip).toString('base64'):paperCSS)}`,loader:'js'}));
  api.onResolve({filter:/\?raw$/},args=>({path:args.path.slice(0,-4),namespace:'practice-raw',pluginData:{resolveDir:args.resolveDir}}));
  api.onLoad({filter:/.*/,namespace:'practice-raw'},async args=>{
   const path=args.path.startsWith('.')?resolve(args.pluginData.resolveDir,args.path):fileURLToPath(import.meta.resolve(args.path));
   return {contents:await readFile(path,'utf8'),loader:'text'};
  });
 }
}]});
const script=result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f8f9f6"><meta name="description" content="智能体与网页对话，一句话从资料制作整套试卷。MIT 免费开源。"><title>纸间 · 试卷预览</title></head><body><div id="practice-app"></div><script>${script}</script></body></html>`;
await writeFile(out+'/纸间-试卷预览.html',html);
await writeFile(out+'/paper-notebook-practice-preview.html',html);
await writeFile(out+'/纸间-刷题工作台.html',html);
await writeFile(out+'/index.html',html);
const realCatalog=JSON.parse(await readFile(root+'src/practice/real-cases.json','utf8'));
const {REFERENCE_COLLECTIONS,REFERENCE_PAPERS}=await tsImport('../src/practice/reference-papers.ts',import.meta.url);
const referenceCatalog=JSON.stringify({collections:REFERENCE_COLLECTIONS,papers:REFERENCE_PAPERS},null,2);
await writeFile(out+'/authentic-reference-catalog.json',referenceCatalog);
await writeFile(out+'/real-exam-catalog.json',JSON.stringify(realCatalog,null,2));
const example=JSON.parse(await readFile(root+'skills/paper-notebook-practice/examples/practice-example.json','utf8'));
await writeFile(out+'/practice.json',JSON.stringify(example,null,2));
for(const [kind,label] of [['exam','试卷'],['answers','答案卷'],['answer-card','答题卡']])await writeFile(out+`/《${example.title}》-${label}.html`,await buildPracticeHtml(example,{kind}));
const releaseFiles={
 '纸间-试卷预览.html':strToU8(html),
 'paper-notebook-practice-skill.zip':new Uint8Array(await readFile(out+'/paper-notebook-practice-skill.zip')),
 'WEB_CHAT.md':new Uint8Array(await readFile(root+'WEB_CHAT.md')),
 'AGENTS.md':new Uint8Array(await readFile(root+'AGENTS.md')),
 '使用说明.md':new Uint8Array(await readFile(root+'docs/practice.md')),
 'LICENSE':new Uint8Array(await readFile(root+'LICENSE')),
 'THIRD_PARTY_NOTICES.txt':new Uint8Array(await readFile(root+'THIRD_PARTY_NOTICES.txt')),
 'licenses/pdfjs-dist-LICENSE':new Uint8Array(await readFile(root+'licenses/pdfjs-dist-LICENSE')),
 'licenses/mui-MIT.txt':new Uint8Array(await readFile(root+'licenses/mui-MIT.txt')),
 'licenses/shadcn-MIT.txt':new Uint8Array(await readFile(root+'licenses/shadcn-MIT.txt')),
 'licenses/noto-cjk-OFL.txt':new Uint8Array(await readFile(root+'licenses/noto-cjk-OFL.txt')),
 'fonts/manifest.json':new Uint8Array(await readFile(root+'assets/practice-fonts/manifest.json')),
 'examples/practice.json':strToU8(JSON.stringify(example,null,2)),
};
for(const label of ['试卷','答案卷','答题卡'])releaseFiles[`examples/《${example.title}》-${label}.html`]=new Uint8Array(await readFile(out+`/《${example.title}》-${label}.html`));
releaseFiles['authentic-reference-catalog.json']=strToU8(referenceCatalog);
releaseFiles['真实试卷与许可.md']=new Uint8Array(await readFile(root+'docs/exam-materials.md'));
releaseFiles['real-exams/catalog.json']=new Uint8Array(await readFile(root+'skills/paper-notebook-practice/examples/real-exams/catalog.json'));
for(const paper of realCatalog.cases)releaseFiles['real-exams/'+paper.practiceId+'.json']=strToU8(JSON.stringify(paper,null,2));
await import('./build-topic-papers.mjs');
const topicCatalog=JSON.parse(await readFile(root+'src/practice/topic-catalog.json','utf8'));
releaseFiles['paper-notebook-practice-topics.zip']=new Uint8Array(await readFile(out+'/paper-notebook-practice-topics.zip'));
releaseFiles['topics/catalog.json']=strToU8(JSON.stringify(topicCatalog,null,2));
releaseFiles['topics/manifest.json']=new Uint8Array(await readFile(out+'/topic-delivery-manifest.json'));
await writeFile(out+`/paper-notebook-practice-v${version}.zip`,zipSync(releaseFiles));
await writeFile(out+'/paper-notebook-practice.zip',zipSync(releaseFiles));
await writeFile(out+'/release.json',JSON.stringify({version,license:'MIT',referenceStudy:{collections:REFERENCE_COLLECTIONS.length,papers:REFERENCE_PAPERS.length,scopes:[...new Set(REFERENCE_PAPERS.map(p=>p.scope))]},sources:realCatalog.sources.length,cases:realCatalog.cases.length,questions:realCatalog.cases.reduce((n,p)=>n+p.sections.reduce((m,s)=>m+s.questions.length,0),0),topics:{papers:topicCatalog.topics.length,questions:topicCatalog.topics.reduce((n,p)=>n+p.questionCount,0),families:[...new Set(topicCatalog.topics.map(p=>p.family))]}},null,2));
// Ready-to-open complete papers are a separate download alongside the Agent Skill.
const completeFiles={'使用说明.md':strToU8('两套完整四六级卷。每套含题目卷、答案卷、四面答题卡和可编辑题库。打开题目卷即可本机作答并播放听力；交卷后导入对应答案卷查看解析。四级125分钟，六级130分钟；100分按官方比例练习计分。原创内容MIT许可，官方大纲仅用于结构。'),LICENSE:new Uint8Array(await readFile(root+'LICENSE'))};
for(const paper of realCatalog.cases.filter(p=>['complete-cet4-original-01','full-cet6-original-01'].includes(p.practiceId))){
 const generated=generatedPaper(paper),folder=paper.exam.specificationId.toUpperCase();
 completeFiles[folder+'/practice.json']=strToU8(JSON.stringify(generated,null,2));
 for(const [kind,label] of [['exam','试卷'],['answers','答案卷'],['answer-card','答题卡']])completeFiles[folder+`/《${paper.title}》-${label}.html`]=strToU8(await buildPracticeHtml(generated,{kind}));
}
await writeFile(out+'/paper-notebook-practice-complete-cet.zip',zipSync(completeFiles));
const names=['paper-notebook-practice.zip','paper-notebook-practice-skill.zip','paper-notebook-practice-topics.zip','paper-notebook-practice-complete-cet.zip','paper-notebook-practice-preview.html'];
await writeFile(out+'/SHA256SUMS.txt',(await Promise.all(names.map(async name=>createHash('sha256').update(await readFile(out+'/'+name)).digest('hex')+'  '+name))).join('\n')+'\n');
console.log(`Practice preview, example papers and Agent skill: ${out}`);
