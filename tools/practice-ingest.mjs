#!/usr/bin/env node
import {readFile,writeFile,mkdir,readdir,stat,copyFile,access} from 'node:fs/promises';
import {basename,dirname,extname,join,resolve,relative} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {unzipSync,strFromU8} from 'fflate';
import {renderReplica,validateReplicaLayout} from '../src/practice/replica.mjs';

const run=promisify(execFile),here=dirname(fileURLToPath(import.meta.url)),digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const formats=new Set(['.pdf','.png','.jpg','.jpeg','.webp','.tif','.tiff','.bmp','.docx','.txt','.md','.markdown','.json','.html','.htm']);
const exists=async path=>{try{await access(path);return true;}catch{return false;}};
const cleanName=name=>name.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'-').slice(0,100)||'source';
const xmlText=xml=>xml.replace(/<w:tab\b[^>]*\/?\s*>/g,'\t').replace(/<w:br\b[^>]*\/?\s*>/g,'\n').replace(/<\/w:p>/g,'\n').replace(/<[^>]+>/g,'').replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');

async function pythonAdapter(){
 const script=join(here,'practice-ingest.py');
 if(!await exists(script))return {available:false,error:'practice-ingest.py is missing from the installed skill/scripts directory.'};
 const candidates=[process.env.PRACTICE_PYTHON,'python3','python'].filter(Boolean);
 let last='Python is not available.';
 for(const executable of [...new Set(candidates)])try{const {stdout}=await run(executable,[script,'--capabilities'],{timeout:15000,maxBuffer:1024*1024});const capabilities=JSON.parse(stdout);if(capabilities.pdfRender&&capabilities.pdfText&&capabilities.images)return {available:true,executable,script,capabilities};last=`${executable}: install pdfplumber, pypdfium2 and Pillow for visual PDF/image extraction.`;}catch(error){last=error.message;}
 return {available:false,error:last};
}
export async function practiceIngestCapabilities(){
 const adapter=await pythonAdapter();return {basic:{txt:true,markdown:true,json:true,docx:true,notebookHtml:true},visual:adapter.available,python:adapter.available?adapter.capabilities:undefined,missing:adapter.available?[]:[adapter.error],ocr:'Apple Vision on macOS, or local Tesseract with chi_sim+eng; no network service.'};
}
async function filesIn(input,output){
 const result=[],root=resolve(input);
 async function walk(path){if(path===output)return;const info=await stat(path);if(info.isDirectory()){for(const item of await readdir(path,{withFileTypes:true})){if(item.name.startsWith('.')||item.isSymbolicLink())continue;await walk(join(path,item.name));}}else if(formats.has(extname(path).toLowerCase()))result.push(path);}
 await walk(root);return result.sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
}
function jsonMaterial(value){
 if(value?.notebook?.chapters){const blocks=[];let page=0;for(const chapter of value.notebook.chapters)for(const paper of chapter.pages){page++;for(const block of paper.blocks){const text=typeof block.text==='string'?block.text:typeof block.question==='string'?block.question:JSON.stringify(block);blocks.push({id:block.id,title:block.title||paper.title,text,page});}}return {title:value.notebook.title,text:blocks.map(block=>block.text).join('\n\n'),blocks};}
 if(value?.practiceId&&Array.isArray(value.materials))return {title:value.title,text:value.materials.map(material=>material.text).join('\n\n'),blocks:value.materials.flatMap(material=>material.blocks||[{id:material.id,title:material.title,text:material.text}])};
 return {text:JSON.stringify(value,null,2)};
}
async function basicText(file,bytes){
 const ext=extname(file).toLowerCase();
 if(ext==='.docx'){const archive=unzipSync(bytes),xml=archive['word/document.xml'];if(!xml)throw Error('DOCX does not contain word/document.xml');return {text:xmlText(strFromU8(xml)),method:'DOCX XML paragraphs',media:Object.entries(archive).filter(([name])=>/^word\/media\/[^/]+$/.test(name)).map(([name,data])=>({name:basename(name),data}))};}
 const text=bytes.toString('utf8').replace(/^\uFEFF/,'');
 if(ext==='.json')return {...jsonMaterial(JSON.parse(text)),method:'Structured JSON'};
 if(ext==='.html'||ext==='.htm'){for(const script of text.matchAll(/<script\b[^>]*\btype=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{const value=JSON.parse(script[1]);if(value.notebook?.chapters||value.practiceId)return {...jsonMaterial(value),method:'Embedded notebook JSON'};}catch{}}throw Error('HTML does not contain a Paper Notebook or practice JSON payload. Export a complete reader HTML or supply text.');}
 return {text,method:ext==='.txt'?'UTF-8 text':'Markdown source'};
}
function capturedPage(page){
 const words=page.regions.filter(region=>region.type==='text'&&region.bounds?.length===4),body=words.filter(region=>region.bounds[1]>page.heightPt*.14&&region.bounds[1]+region.bounds[3]<page.heightPt*.9),measure=body.length?body:words;
 const fonts=new Map();for(const region of words)if(region.font&&region.fontSize){const key=`${region.font}|${Math.round(region.fontSize*10)/10}`;fonts.set(key,(fonts.get(key)||0)+1);}
 const x0=measure.length?Math.min(...measure.map(region=>region.bounds[0])):0,y0=measure.length?Math.min(...measure.map(region=>region.bounds[1])):0,x1=measure.length?Math.max(...measure.map(region=>region.bounds[0]+region.bounds[2])):page.widthPt,y1=measure.length?Math.max(...measure.map(region=>region.bounds[1]+region.bounds[3])):page.heightPt;
 const middle=page.widthPt/2,left=body.filter(region=>region.bounds[0]+region.bounds[2]<middle-8),right=body.filter(region=>region.bounds[0]>middle+8),crossing=body.length-left.length-right.length;
 const columns=left.length>12&&right.length>12&&crossing<Math.max(left.length,right.length)*.2?2:1;
 const headers=words.filter(region=>region.bounds[1]<page.heightPt*.14).map(region=>region.id),footers=words.filter(region=>region.bounds[1]>page.heightPt*.9).map(region=>region.id);
 return {page:page.page,widthPt:page.widthPt,heightPt:page.heightPt,rotation:page.rotation,measuredContentBounds:[x0,y0,x1-x0,y1-y0],measuredMarginsPt:{top:y0,right:page.widthPt-x1,bottom:page.heightPt-y1,left:x0},columns,fontSamples:[...fonts].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([key,count])=>({font:key.split('|')[0],sizePt:Number(key.split('|')[1]),count})),headerRegionIds:headers,footerRegionIds:footers,regions:page.regions,status:'measured-draft',review:['Confirm content margins against the original page.','Confirm column reading order, title/section/option roles and answer-zone geometry.','Substituted fonts and OCR formulas need visual verification before editable reflow is called a replica.']};
}
export async function ingestPractice(inputPath,options={}){
 const out=resolve(options.out||'output/practice-ingest'),input=resolve(inputPath),ocr=options.ocr||'auto',dpi=Number(options.dpi||200);
 if(!['auto','always','never'].includes(ocr))throw Error('ocr must be auto, always or never');if(!Number.isInteger(dpi)||dpi<72||dpi>600)throw Error('dpi must be an integer between 72 and 600');
 const inputs=await filesIn(input,out);if(!inputs.length)throw Error('No supported source files found. Supply PDF, DOCX, images, TXT, Markdown, notebook HTML or JSON.');
 await mkdir(out,{recursive:true});for(const dir of ['originals','pages','raw','assets'])await mkdir(join(out,dir),{recursive:true});
 const isDirectory=(await stat(input)).isDirectory();
 let adapter;
 const sources=[],materials=[],seen=new Set(),duplicates=[];
 for(const file of inputs){
  const bytes=await readFile(file),sha256=digest(bytes);if(seen.has(sha256)){duplicates.push({name:basename(file),sha256});continue;}seen.add(sha256);
  const id='source-'+sha256.slice(0,20),ext=extname(file).toLowerCase(),source={id,name:basename(file),sha256,byteLength:bytes.length,originalFile:`originals/${id}${ext}`,relativeInput:isDirectory?relative(input,file):basename(file),status:'ready',pages:[],warnings:[],corrections:[],glossary:[]};
  await writeFile(join(out,source.originalFile),bytes);
  try{
   let extracted;
   if(['.pdf','.png','.jpg','.jpeg','.webp','.tif','.tiff','.bmp'].includes(ext)){
    adapter??=await pythonAdapter();
    if(!adapter.available)throw Error(adapter.error);
    const target=join(out,'pages',id);await mkdir(target,{recursive:true});
    const {stdout}=await run(adapter.executable,[adapter.script,file,'--out',target,'--ocr',ocr,'--dpi',String(dpi),'--swift',join(here,'practice-ocr.swift')],{timeout:Math.max(300000,Number(options.timeout||300000)),maxBuffer:128*1024*1024});
    extracted=JSON.parse(stdout);source.pages=extracted.pages.map(page=>({...page,imageFile:relative(out,page.imageFile).split('\\').join('/')}));source.warnings.push(...extracted.warnings);source.extractionCapabilities=extracted.capabilities;
   }else{
    extracted=await basicText(file,bytes);source.documentText=extracted.text;source.method=extracted.method;
    source.pages=[{page:1,rawText:extracted.text,method:extracted.method,status:'ready',regions:[],uncertain:[],physicalPagination:false}];
    if(ext==='.docx'){
     // Word pagination depends on font availability and the renderer; preserve that distinction.
     source.warnings.push('DOCX paragraph extraction has no guaranteed physical pagination. Supply its original PDF for exact page replication.');
     source.assets=[];if(extracted.media?.length){await mkdir(join(out,'assets',id),{recursive:true});for(const asset of extracted.media){const assetFile=`assets/${id}/${cleanName(asset.name)}`;await writeFile(join(out,assetFile),asset.data);source.assets.push({name:asset.name,file:assetFile,sha256:digest(asset.data),role:'original-docx-media'});}source.warnings.push('Embedded DOCX media is retained under assets/. The Agent must inspect figures and their paragraph context in the original document.');}
    }
    if(extracted.blocks)source.documentBlocks=extracted.blocks;
   }
   const rawText=source.documentText??source.pages.map(page=>page.rawText).join('\n\n');
   source.rawTextFile=`raw/${id}.txt`;await writeFile(join(out,source.rawTextFile),rawText);
   const blocks=source.documentBlocks||source.pages.map(page=>({id:`${id}-page-${page.page}`,title:`${source.name} · 第 ${page.page} 页`,text:page.rawText,page:page.page}));
   if(rawText.trim())materials.push({id,title:basename(file,ext),kind:options.kind||'reference',text:rawText,blocks,sha256,provenance:{kind:'upload'}});
   source.status=source.pages.some(page=>page.status==='needs-ocr')?'needs-ocr':!rawText.trim()||source.pages.some(page=>page.status==='needs-review')?'needs-review':'ready';
  }catch(error){source.status='needs-extraction';source.warnings.push(error.message);}
  sources.push(source);
 }
 const physical=sources.filter(source=>source.pages.some(page=>page.widthPt&&page.heightPt));
 const layout={schemaVersion:'1.0.0',coordinateSystem:'pdf-points-top-left',sources:physical.map(source=>({sourceId:source.id,name:source.name,sha256:source.sha256,pages:source.pages.filter(page=>page.widthPt).map(({imageFile,imageSha256,rawText,method,uncertain,ocrReviewRequired,warnings,extractionCapabilities,...page})=>page)}))};
 const captured={schemaVersion:'1.0.0',kind:'captured-paper-layout',coordinateSystem:'pdf-points-top-left',status:'needs-agent-review',sources:physical.map(source=>({sourceId:source.id,name:source.name,sha256:source.sha256,pages:source.pages.filter(page=>page.widthPt).map(capturedPage)}))};
 const manifest={schemaVersion:'1.0.0',kind:'practice-sources',createdAt:new Date().toISOString(),status:sources.some(source=>['needs-ocr','needs-extraction'].includes(source.status))?'needs-ocr':sources.some(source=>source.status==='needs-review')?'needs-review':'ready',sources,materials,duplicates,layoutFile:'layout.json',capturedTemplateFile:'captured-template.json',handoffFile:'agent-handoff.md',rawCorrectionsPolicy:'rawText is immutable evidence; corrections and glossary are separate, source-linked records.',capabilities:{basic:true,visual:adapter?.available??null,ocr:adapter?.available?adapter.capabilities:undefined}};
 const handoff=`# Agent 材料交接\n\n1. 读取 source-manifest.json、layout.json 与 captured-template.json，并查看 originals/ 与 pages/ 的实际页面。\n2. 每份资料按学科、层级、章节、知识点、题型和难度标准化。保留 source ID、原页码、原题号和完整原文；没有答案的原题保留为待解题草稿，由当前 Agent 依据资料求解核对。\n3. 检查 OCR 的 uncertain、ocrReviewRequired 与 warnings；公式、单位、正负号、选项字母、图表和多栏顺序逐页核对。rawText 不改写；更正写到 source.corrections 中，标明 page、original、corrected、reason 与 reviewedBy。\n4. 按用户目标生成 sourced practice.json；solution/explanation 与引用准确，题目卷不嵌入答案。\n5. 原卷 1:1 复刻使用 replicate 命令，图像与原始 PDF 字节校验保持一致；可编辑新卷使用 captured-template 的实测尺寸与区域，Agent 识别标题、题组、材料、图表与作答区角色，并与原卷逐页比较。仅凭 OCR 文本不能宣称版式一致。\n6. build、verify 后，打开实际成品检查模板、跨页、图形、作答区、答案隔离和打印。默认交付成品与可复用题库；浏览器仅用于预览、人工选题和修订。\n\n本次资料状态：${manifest.status}。${sources.length} 份资料，${materials.length} 份全文可用，${physical.length} 份有实测页版。\n`;
 await Promise.all([writeFile(join(out,'source-manifest.json'),JSON.stringify(manifest,null,2)+'\n'),writeFile(join(out,'layout.json'),JSON.stringify(layout,null,2)+'\n'),writeFile(join(out,'captured-template.json'),JSON.stringify(captured,null,2)+'\n'),writeFile(join(out,'agent-handoff.md'),handoff)]);
 return {manifest:join(out,'source-manifest.json'),layout:join(out,'layout.json'),capturedTemplate:join(out,'captured-template.json'),status:manifest.status,sources:sources.length,pages:sources.reduce((n,source)=>n+source.pages.length,0),materials:materials.length,duplicates:duplicates.length};
}
export async function replicatePractice(manifestPath,options={}){
 const manifestFile=resolve(manifestPath),root=dirname(manifestFile),manifest=JSON.parse(await readFile(manifestFile,'utf8')),out=resolve(options.out||join(root,'replica'));
 if(manifest.kind!=='practice-sources'||!Array.isArray(manifest.sources))throw Error('replicate expects a source-manifest.json produced by ingest.');
 const sources=[];const proof=[];const copiedNames=new Set();
 for(const source of manifest.sources){
  const pages=[];
  for(const page of source.pages||[]){if(!page.imageFile||!page.widthPt||!page.heightPt)continue;const bytes=await readFile(resolve(root,page.imageFile));if(digest(bytes)!==page.imageSha256)throw Error(`${source.name} page ${page.page}: original page-image checksum changed.`);pages.push({...page,imageData:'data:image/png;base64,'+bytes.toString('base64')});}
  if(!pages.length)continue;
  const bytes=await readFile(resolve(root,source.originalFile));if(digest(bytes)!==source.sha256)throw Error(source.name+': original file checksum changed.');
  let copyName=cleanName(source.name);if(copiedNames.has(copyName.toLowerCase())){const extension=extname(copyName);copyName=`${basename(copyName,extension)}-${source.id}${extension}`;}copiedNames.add(copyName.toLowerCase());
  sources.push({...source,pages,copyName,originalData:`data:${source.name.toLowerCase().endsWith('.pdf')?'application/pdf':'application/octet-stream'};base64,${bytes.toString('base64')}`});
  proof.push({sourceId:source.id,name:source.name,originalFile:copyName,sha256:source.sha256,originalBytesPreserved:true,pages:pages.map(page=>({page:page.page,widthPt:page.widthPt,heightPt:page.heightPt,imageSha256:page.imageSha256,pixelWidth:page.pixelWidth,pixelHeight:page.pixelHeight,physicalSizeAssumed:page.physicalSizeAssumed||false}))});
 }
 if(!sources.length)throw Error('No measured page images available. Ingest a PDF or image with the visual adapter. DOCX/text can be edited, but need an original PDF for exact physical page replication.');
 await mkdir(out,{recursive:true});
 const html=renderReplica({title:options.title||'原卷复刻',sources});await writeFile(join(out,'原卷复刻.html'),html);
 for(const source of sources)await copyFile(resolve(root,source.originalFile),join(out,source.copyName));
 const replicaProof={schemaVersion:'1.0.0',kind:'facsimile-proof',method:'byte-identical original files plus unchanged raster page images at measured page dimensions',htmlSha256:digest(html),sources:proof,unsupportedSources:manifest.sources.filter(source=>!sources.some(item=>item.id===source.id)).map(source=>source.name)};
 await writeFile(join(out,'replica-proof.json'),JSON.stringify(replicaProof,null,2)+'\n');
 return {html:join(out,'原卷复刻.html'),proof:join(out,'replica-proof.json'),pages:sources.reduce((n,source)=>n+source.pages.length,0),originals:sources.length,physicalSizeNeedsReview:sources.some(source=>source.pages.some(page=>page.physicalSizeAssumed))};
}
export async function validatePracticeLayout(path){const value=typeof path==='string'?JSON.parse(await readFile(resolve(path),'utf8')):path;return validateReplicaLayout(value);}

if(process.argv[1]&&basename(process.argv[1])==='practice-ingest.mjs'&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [command,input,...args]=process.argv.slice(2),option=name=>args.includes(name)?args[args.indexOf(name)+1]:undefined;
 try{let result;if(command==='capabilities')result=await practiceIngestCapabilities();else if(command==='ingest')result=await ingestPractice(input,{out:option('--out'),ocr:option('--ocr'),kind:option('--kind'),dpi:option('--dpi')});else if(command==='replicate')result=await replicatePractice(input,{out:option('--out')});else if(command==='validate-layout')result=await validatePracticeLayout(input);else throw Error('Usage: node tools/practice-ingest.mjs capabilities | ingest <file|dir> --out <dir> [--ocr auto|always|never] | replicate <source-manifest.json> --out <dir> | validate-layout <layout.json>');console.log(JSON.stringify(result,null,2));if(result.valid===false)process.exitCode=1;}catch(error){console.error(error.message);process.exitCode=1;}
}
