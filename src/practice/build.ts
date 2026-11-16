// @ts-ignore Node-only build adapter; the browser entry never imports this module.
import {readFile} from 'node:fs/promises';
// @ts-ignore Node-only build adapter.
import {fileURLToPath} from 'node:url';
// @ts-ignore Node-only build adapter.
import {dirname,resolve} from 'node:path';
import type {NotebookDocument} from '../model/types';
import {textOf} from '../model/types';
import type {PracticeDocument,PracticeError} from './model';
import {renderPractice,paperText,paperPrompt,escapePaper,type RenderPracticeOptions} from './paper';
import {practiceDigest} from './session';
import {resolvePaperTemplate,paperGeometry} from './templates';

declare const __PRACTICE_EMBEDDED_CSS__:string|undefined;
declare const __PRACTICE_EMBEDDED_RUNTIME__:string|undefined;
const here=dirname(fileURLToPath(import.meta.url));
/** Formula renderer and fonts are shared with the notebook runtime, then embedded. */
export async function loadPracticeStyles():Promise<string>{
 if(typeof __PRACTICE_EMBEDDED_CSS__!=='undefined')return __PRACTICE_EMBEDDED_CSS__;
 let math=await readFile(resolve(here,'../../node_modules/katex/dist/katex.min.css'),'utf8');
 const urls=[...new Set([...math.matchAll(/url\(([^)]+)\)/g)].map(match=>match[1].replace(/["']/g,'')))];
 for(const url of urls){const bytes=await readFile(resolve(here,'../../node_modules/katex/dist',url)),type=url.endsWith('.woff2')?'font/woff2':url.endsWith('.woff')?'font/woff':'font/ttf';math=math.split(url).join(`data:${type};base64,${bytes.toString('base64')}`);}
 const fonts=await Promise.all([['Noto Serif SC','NotoSerifSC-Regular.otf'],['Noto Sans SC','NotoSansSC-Regular.otf']].map(async([family,file])=>`@font-face{font-family:"${family}";src:url(data:font/otf;base64,${(await readFile(resolve(here,'../../assets/practice-fonts',file))).toString('base64')});font-style:normal;font-weight:400;font-display:swap}`));
 const fontLicense='Noto Serif SC: Copyright 2017-2024 Adobe (http://www.adobe.com/).\nNoto Sans SC: Copyright 2014-2021 Adobe (http://www.adobe.com/).\n\n'+await readFile(resolve(here,'../../licenses/noto-cjk-OFL.txt'),'utf8');
 return '/* Noto CJK embedded font license\n'+fontLicense.replace(/\*\//g,'* /')+'\n*/\n'+fonts.join('\n')+'\n'+(await readFile(resolve(here,'paper.css'),'utf8'))+'\n'+(await readFile(resolve(here,'university-source.css'),'utf8'))+'\n'+(await readFile(resolve(here,'answer-card.css'),'utf8'))+'\n'+math;
}
export async function buildPracticeHtml(practice:PracticeDocument,options:RenderPracticeOptions={}):Promise<string>{const runtime=options.runtime??(typeof __PRACTICE_EMBEDDED_RUNTIME__!=='undefined'?__PRACTICE_EMBEDDED_RUNTIME__:(await (await import('esbuild')).build({stdin:{contents:"import {practiceSession,practiceDigest,normalizePracticeAnswer} from './session.ts';import {paperExportRuntime} from './export-runtime.ts';practiceSession(practiceDigest,normalizePracticeAnswer);paperExportRuntime();",resolveDir:here},bundle:true,write:false,platform:'browser',format:'iife',target:'es2022'})).outputFiles[0].text);return renderPractice(practice,{...options,runtime,css:options.css??await loadPracticeStyles()});}
export function readPracticeHtml(html:string):any{const json=html.match(/<script\b[^>]*\bid=["']practice-data["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];if(!json)throw Error('Missing #practice-data payload');return JSON.parse(json);}
export function verifyPracticeHtml(html:string,practice?:PracticeDocument,source?:NotebookDocument):{valid:boolean;errors:PracticeError[]}{
 const errors:PracticeError[]=[],add=(path:string,message:string)=>errors.push({path,message});let payload:any;
 try{payload=readPracticeHtml(html);}catch(error){return {valid:false,errors:[{path:'/html',message:error instanceof Error?error.message:String(error)}]};}
 if(payload.schemaVersion!=='1.0.0')add('/schemaVersion','Unsupported practice schema');
 if(source){if(payload.notebookId!==source.notebook.id)add('/notebookId','Notebook ID differs from source');if(payload.notebookRevision!==source.notebook.revision)add('/notebookRevision','Notebook revision differs from source');}
 const tpl=html.match(/<template\b[^>]*\bid=["']paper-template["'][^>]*>([\s\S]*?)<\/template>/i)?.[1];if(!tpl)add('/html/template','Missing reusable paper template');
 const visible=html.match(/<main\b[^>]*\bid=["']paper-root["'][^>]*>[\s\S]*?<div class="page-content">([\s\S]*?)<\/div><footer>/i)?.[1];if(visible!==tpl)add('/html/paper-root','Visible paper content differs from its reusable template');
 if(practice){const expected=renderPractice(practice,{kind:payload.paperKind,preview:Boolean(payload.preview),runtime:'',css:''}),expectedPayload=readPracticeHtml(expected);if(JSON.stringify(payload)!==JSON.stringify(expectedPayload))add('/html/payload','Question, option, score or provenance data differs from practice.json');const expectedTemplate=expected.match(/<template\b[^>]*\bid=["']paper-template["'][^>]*>([\s\S]*?)<\/template>/i)?.[1];if(tpl!==expectedTemplate)add('/html/template','Rendered title, number, prompt, options, answer space or source differs from practice.json');}
 if(!Array.isArray(payload.sections)||!payload.sections.length)add('/sections','Paper contains no sections');
 else{
  const ids=new Set<string>(),numbers=new Set<number>();let total=0;
  const blocks=new Map(source?.notebook.chapters.flatMap(ch=>ch.pages.flatMap(p=>p.blocks.map(b=>[b.id,textOf(b)] as const)))||[]);
  for(const [s,section]of payload.sections.entries()){
   let score=0;for(const [i,q]of (section.questions||[]).entries()){
    const path=`/sections/${s}/questions/${i}`;if(ids.has(q.id))add(path+'/id','Duplicate question ID');ids.add(q.id);if(numbers.has(q.number))add(path+'/number','Duplicate question number');numbers.add(q.number);score+=q.score;
    if(!tpl?.includes(`data-question="${escapePaper(q.id)}" data-number="${q.number}" data-score="${q.score}"`))add(path,'Rendered question number or score differs from payload');
    if(payload.paperKind!=='answer-card'&&!(payload.paperKind==='exam'&&section.listeningOnly)&&!tpl?.replace(/<figure class="question-attachment[^>]*>[\s\S]*?<\/figure>/g,'').includes(paperPrompt(q.prompt)))add(path+'/prompt','Rendered prompt differs from payload');
    if(payload.paperKind!=='answers'&&(['solution','explanation','rubric','verification','answerProvenance','supportingSources','assessment'].some(key=>key in q)||'exact'in(q.source||{})))add(path,'Candidate paper contains answer, scoring or raw evidence payload');
    if(payload.paperKind==='answers'&&(!('solution'in q)||!q.explanation||!q.source?.exact))add(path,'Answer paper is missing solution, explanation or source');
    if(payload.paperKind==='exam'&&q.options)for(const option of q.options){const text=q.type==='truefalse'&&option.text.toUpperCase().replace(/[\s_]/g,'')===option.id.replace(/_/g,'')?escapePaper(option.id.replace(/_/g,' ')):paperText(option.text),objective=['choice','multiple','truefalse'].includes(q.type);if((!section.choicesAsCodes&&!tpl?.includes(text))||(objective&&!tpl?.includes(`value="${option.id}"`)))add(path+'/options','Rendered options differ from payload');}
    if(source&&q.source?.blockDigest&&!blocks.has(q.source.blockId))add(path+'/source','Cited notebook source block is missing');
    if(q.source?.blockDigest&&blocks.has(q.source.blockId)&&practiceDigest(blocks.get(q.source.blockId)!)!==q.source.blockDigest)add(path+'/source','Cited source block differs from notebook');
   }if(Math.abs(score-section.score)>1e-7)add(`/sections/${s}/score`,'Section score does not match question scores');total+=section.score;
  }if(Math.abs(total-payload.totalScore)>1e-7)add('/totalScore','Total score does not match section scores');
 }
 if(payload.paperKind!=='answers'){
  if(['authoring','sourcePolicy','generation','original','userState','review'].some(key=>key in payload))add('/html/payload','Candidate paper contains private author or learner data');
  for(const [i,material]of(payload.materials??[]).entries())if('text'in material||'provenance'in material||(material.blocks??[]).some((block:any)=>'text'in block))add(`/materials/${i}`,'Candidate paper contains raw evidence material');
  for(const [i,section]of(payload.sections??[]).entries())if('exact'in(section.stimulus?.source??{})||section.stimulus?.audio?.transcriptSource)add(`/sections/${i}/stimulus`,'Candidate paper contains raw passage or listening evidence');
 }
 if(!payload.presentation&&payload.paperKind!=='answer-card'){
  if(!html.includes(payload.paperLanguage==='en'?`Total: ${payload.totalScore} points`:`满分：${payload.totalScore} 分`))add('/html/totalScore','Printed total differs from payload');
  if(!(payload.paperLanguage==='en'?/Page \d+ of \d+/:/第 \d+ 页，共 \d+ 页/).test(html))add('/html/footer','Missing page footer');
 }
 const endText=payload.presentation?.endText??(payload.paperLanguage==='en'?'End of '+(payload.paperKind==='answers'?'answer key':payload.paperKind==='answer-card'?'answer sheet':payload.mode==='bank'?'question bank':'practice paper'):'（'+(payload.paperKind==='answers'?'答案卷':payload.paperKind==='answer-card'?'答题卡':'试卷')+'结束）');
 if(payload.paperKind!=='answer-card'&&endText&&!tpl?.includes(escapePaper(endText)))add('/html/end','Missing paper end marker');
 const layout=payload.paperKind==='answer-card'?payload.paperLayout:resolvePaperTemplate(payload.style).layout;
 const geometry=paperGeometry(layout);
 if(!html.includes(`@page{size:${layout.widthMm||layout.heightMm?`${geometry.widthMm}mm ${geometry.heightMm}mm`:layout.paperSize+' '+layout.orientation};margin:0}`))add('/html/print','Print geometry differs from selected template');
 return {valid:errors.length===0,errors};
}
