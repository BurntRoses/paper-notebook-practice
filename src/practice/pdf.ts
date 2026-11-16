import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?raw';
import { stablePracticeId } from './materials';
import type { PracticeMaterial, PracticeKind } from './model';
let workerUrl:string|undefined;
export async function extractPdfMaterial(buffer:ArrayBuffer,title:string,kind:PracticeKind):Promise<{material:PracticeMaterial;warnings:string[]}>{
 if(!workerUrl){workerUrl=URL.createObjectURL(new Blob([pdfWorker],{type:'text/javascript'}));GlobalWorkerOptions.workerSrc=workerUrl;}
 // Safari disallows module Workers from an opaque local-file origin. Load the
 // same embedded PDF.js module directly so its supported main-thread handler
 // is available before getDocument, without a failed cross-origin attempt.
 if(location.protocol==='file:'&&/AppleWebKit\//.test(navigator.userAgent)&&!/Chrom(?:e|ium)\//.test(navigator.userAgent))await import(/* @vite-ignore */ workerUrl);
 const task=getDocument({data:new Uint8Array(buffer),useSystemFonts:true,isEvalSupported:false,disableFontFace:true});
 const pdf=await task.promise;const blocks:NonNullable<PracticeMaterial['blocks']>=[];const warnings:string[]=[];
 try{for(let number=1;number<=pdf.numPages;number++){const page=await pdf.getPage(number);const content=await page.getTextContent();let text='';let lastY:number|undefined;
  for(const item of content.items){if(!('str' in item))continue;const y=item.transform[5];if(text&&lastY!==undefined&&Math.abs(y-lastY)>3&&!text.endsWith('\n'))text+='\n';else if(text&&!text.endsWith('\n')&&!text.endsWith(' '))text+=' ';text+=item.str;if(item.hasEOL)text+='\n';lastY=y;}
  text=text.trim();blocks.push({id:`page-${number}`,title:`第 ${number} 页`,text,page:number});if(!text)warnings.push(`第 ${number} 页无可提取文字；若为扫描件，请先 OCR 并核对后导入。`);page.cleanup();
 }}finally{await pdf.destroy();}
 const text=blocks.map(block=>block.text).join('\n\n');if(!text.trim())throw new Error('此 PDF 没有可提取的文字。请先用自己的 AI 或 OCR 读取扫描页，并核对公式、图表和题号。');
 const id=stablePracticeId('material',text);for(const block of blocks)block.id=`${id}-${block.id}`;warnings.push('PDF 文字已按页保留。请核对多栏顺序、公式和图表；提取未执行 OCR。');return {material:{id,title,kind,text,blocks},warnings};
}
