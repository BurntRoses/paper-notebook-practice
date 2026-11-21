import {strFromU8, unzlibSync} from 'fflate';
import ks2 from './ks2-2024.json';

type PaperTextSpan = [left:number,top:number,width:number,size:number,text:string];
type SourcePaper = {width:number;height:number;pages:[image:string,text:PaperTextSpan[]][]};
const assets:Record<string,()=>Promise<{default:string}>>={
 arithmetic:()=>import('../../assets/ks2-2024/arithmetic.b64?raw'),
 'reasoning-one':()=>import('../../assets/ks2-2024/reasoning-one.b64?raw'),
 'reasoning-two':()=>import('../../assets/ks2-2024/reasoning-two.b64?raw'),
 scoring:()=>import('../../assets/ks2-2024/scoring.b64?raw'),
};
const cached=new Map<string,Promise<string>>();
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

export function sourcePaperHTML(id:string):Promise<string>{
 const current=cached.get(id);
 if(current)return current;
 const volume=ks2.volumes.find(part=>part.id===id),asset=assets[id];
 if(!volume||!asset)return Promise.reject(Error('未找到对应的原卷分册。'));
 const pending=asset().then(({default:packed})=>{
  const {width,height,pages}=JSON.parse(strFromU8(unzlibSync(Uint8Array.from(atob(packed.trim()),c=>c.charCodeAt(0))))) as SourcePaper;
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0||pages.length!==volume.pages){
   throw Error('原卷页数或尺寸不符。');
  }
  const sheets=pages.map(([image,spans],index)=>`<section class="paper-page-frame" aria-label="Page ${index+1} of ${pages.length}"><div class="exam-page">
  <img src="data:image/svg+xml;base64,${image}" alt="" ${index?'loading="lazy"':''}>
  <div class="source-text-layer">${spans.map(([x,y,w,size,text])=>`<span style="left:${x}pt;top:${y}pt;width:${w}pt;font-size:${size}pt">${escape(text)}</span>`).join('')}</div>
  </div></section>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(volume.title)}</title><style>
  @page{size:${width}pt ${height}pt;margin:0}
  html,body{margin:0;background:#eceee9;color:#202521}
  body{--paper-width:${width}pt;--paper-height:${height}pt}
  #paper-root{margin:0 auto;width:max-content}
  .paper-page-frame{width:var(--paper-width);height:var(--paper-height);margin:12px 0;background:#fff}
  .exam-page{position:relative;width:var(--paper-width);height:var(--paper-height);transform:scale(var(--paper-zoom,1));transform-origin:top left}
  .exam-page>img{display:block;width:100%;height:100%}
  .source-text-layer{position:absolute;inset:0;color:transparent}
  .source-text-layer>span{position:absolute;white-space:pre;line-height:1.15;font-family:Arial,sans-serif;user-select:text}
  .source-text-layer>span::selection{background:#3b73cc45;color:transparent}
  footer{max-width:var(--paper-width);margin:16px auto;font:14px/1.55 Arial,sans-serif}
  body a{color:inherit}
  @media print{html,body{background:#fff}.paper-page-frame{margin:0;break-after:page}.paper-page-frame:last-child{break-after:auto}footer{display:none}}
  </style></head><body data-ready="true"><main id="paper-root" aria-label="${escape(volume.title)}">${sheets}</main>
  <footer>${escape(ks2.attribution)} <a href="${ks2.publication}">Source</a> · <a href="${ks2.licence}">Licence</a></footer></body></html>`;
 });
 cached.set(id,pending);
 void pending.catch(()=>cached.delete(id));
 return pending;
}
