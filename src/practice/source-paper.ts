import {strFromU8, unzlibSync} from 'fflate';
import {sourceEdition} from './source-editions';

type PaperTextSpan = [left:number,top:number,width:number,size:number,text:string];
type SourcePaper = {width:number;height:number;pages:[image:string,text:PaperTextSpan[]][]};
const cached=new Map<string,Promise<string>>();
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

export function sourcePaperHTML(editionId:string,id:string):Promise<string>{
 const key=editionId+'/'+id;
 const current=cached.get(key);
 if(current)return current;
 const edition=sourceEdition(editionId),volume=edition?.volumes.find(part=>part.id===id);
 if(!edition||!volume)return Promise.reject(Error('未找到对应的原卷分册。'));
 const directory=edition.assetDirectory;
 const pending=import(`../../assets/${directory}/${id}.b64`).then(({default:packed}:{default:string})=>{
  const {width,height,pages}=JSON.parse(strFromU8(unzlibSync(Uint8Array.from(atob(packed.trim()),c=>c.charCodeAt(0))))) as SourcePaper;
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0||pages.length!==volume.pages){
   throw Error('原卷页数或尺寸不符。');
  }
  const rasterPages=new Set(volume.rasterPages);
  const sheets=pages.map(([image,spans],index)=>`<section class="paper-page-frame" aria-label="Page ${index+1} of ${pages.length}"><div class="exam-page">
  <img src="data:image/${rasterPages.has(index+1)?'webp':'svg+xml'};base64,${image}" alt="" ${index?'loading="lazy"':''}>
  <div class="source-text-layer">${spans.map(([x,y,w,size,text])=>`<span style="left:${x}pt;top:${y}pt;width:${w}pt;font-size:${size}pt">${escape(text)}</span>`).join('')}</div>
  </div></section>`).join('');
  return `<!doctype html><html lang="${edition.identity.paperLanguage}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(volume.title)}</title><style>
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
  <footer>${escape(edition.attribution)} <a href="${escape(edition.publication)}">Source</a> · <a href="${escape(edition.licence)}">Licence</a></footer></body></html>`;
 });
 cached.set(key,pending);
 void pending.catch(()=>cached.delete(key));
 return pending;
}
