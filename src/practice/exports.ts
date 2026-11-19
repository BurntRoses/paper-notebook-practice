import type {PracticeDocument} from './model';
import {renderPractice,type PaperKind} from './paper';
import {standalonePaperCSS} from './web-assets';

export type PracticeExportFormat='png'|'pdf'|'docx';
export interface PracticeExportOptions {format:PracticeExportFormat;kind?:PaperKind;css:string;onProgress?:(message:string)=>void}
export interface PracticeExportResult {name:string;mime:string;bytes:Uint8Array;pages:number}
/** Only the shared renderer's trusted HTML is executed; imported user HTML never enters this frame. */
export async function exportPracticeFiles(paper:PracticeDocument,options:PracticeExportOptions):Promise<PracticeExportResult>{
 const css=await standalonePaperCSS(options.css);
 const frame=document.createElement('iframe');frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;frame.style.cssText='position:fixed;left:-100000px;top:0;width:1800px;height:1400px;border:0;pointer-events:none;';
 frame.srcdoc=renderPractice(paper,{kind:options.kind??'exam',css,preview:true});
 let loadTimer:ReturnType<typeof setTimeout>|undefined;
 const loaded=new Promise<void>((resolve,reject)=>{loadTimer=setTimeout(()=>reject(Error('无法载入导出页面，请重试。')),30000);frame.onload=()=>resolve();frame.onerror=()=>reject(Error('无法载入导出页面。'));});
 document.body.append(frame);
 try{await loaded;const deadline=Date.now()+60000;while(frame.contentDocument?.body.dataset.ready!=='true'){if(Date.now()>deadline)throw Error('试卷排版超时，请重新导出。');await new Promise<void>(resolve=>setTimeout(resolve,30));}
  const runtime=(frame.contentWindow as Window&{paperExports?:{run:(format:string,progress?:(s:string)=>void)=>Promise<PracticeExportResult>}}).paperExports;if(!runtime)throw Error('试卷导出组件未就绪。');return await runtime.run(options.format,options.onProgress);
 }finally{clearTimeout(loadTimer);frame.remove();}
}
