import {nativeWordFile} from './word-export';

/** The standalone HTML passes its serialized Word writer explicitly. */
export function paperExportRuntime(writeWord=nativeWordFile){
 const w=window as typeof window&{paperExports?:{run:(format:string,onProgress?:(value:string)=>void)=>Promise<{name:string;mime:string;bytes:Uint8Array;pages:number|null}>}};
 if(w.paperExports)return;
 const encoder=new TextEncoder();
 const bytes=(s:string)=>encoder.encode(s),join=(parts:Uint8Array[])=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const p of parts){out.set(p,at);at+=p.length;}return out;};
 const zip=(files:Record<string,Uint8Array>)=>{const table=Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;}),local:Uint8Array[]=[],central:Uint8Array[]=[];let offset=0;for(const [file,content]of Object.entries(files)){const name=bytes(file);let crc=0xffffffff;for(const b of content)crc=table[(crc^b)&255]^(crc>>>8);crc=(crc^0xffffffff)>>>0;const head=new Uint8Array(30+name.length),h=new DataView(head.buffer);h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint32(14,crc,true);h.setUint32(18,content.length,true);h.setUint32(22,content.length,true);h.setUint16(26,name.length,true);head.set(name,30);local.push(head,content);const dir=new Uint8Array(46+name.length),d=new DataView(dir.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x0800,true);d.setUint32(16,crc,true);d.setUint32(20,content.length,true);d.setUint32(24,content.length,true);d.setUint16(28,name.length,true);d.setUint32(42,offset,true);dir.set(name,46);central.push(dir);offset+=head.length+content.length;}const size=central.reduce((n,p)=>n+p.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,central.length,true);e.setUint16(10,central.length,true);e.setUint32(12,size,true);e.setUint32(16,offset,true);return join([...local,...central,end]);};
 const lang=document.documentElement.lang;
 const paperCSS=()=>Array.from(document.querySelectorAll('style')).map(e=>e.textContent??'').join('\n');
 function rasterCSS(css:string){
  return css.replace(/@font-face\{font-family:"Noto Sans (JP|KR)";[^}]*\}/g,(rule,locale)=>locale.toLowerCase()===lang?rule:'')
   .replace(/html:lang\(/g,'.export-body:lang(').replace(/\bbody(?=[\s\[.#:{>])/g,'.export-body');
 }
 async function raster(page:HTMLElement,css:string,scale=2.5){
  // A4 is fractional in CSS pixels. Rounding its layout width can change line breaks.
  const pageStyle=getComputedStyle(page),width=parseFloat(pageStyle.width),height=parseFloat(pageStyle.height),clone=page.cloneNode(true) as HTMLElement;
  clone.style.cssText+=';position:relative!important;left:0!important;top:0!important;transform:none!important;zoom:1!important;margin:0!important;box-shadow:none!important;width:'+width+'px!important;height:'+height+'px!important;';
  clone.querySelectorAll('script,audio,button,.screen-media,.screen-answer,.question-feedback').forEach(e=>e.remove());
  clone.querySelectorAll('textarea,input').forEach(e=>{if(e instanceof HTMLTextAreaElement)e.textContent='';if(e instanceof HTMLInputElement){e.value='';e.removeAttribute('checked');}});
  const body=document.createElement('div');body.lang=lang;for(const attr of Array.from(document.body.attributes))body.setAttribute(attr.name,attr.value);body.style.cssText=document.body.style.cssText+';margin:0!important;padding:0!important;background:white!important;width:'+width+'px!important;height:'+height+'px!important;overflow:hidden;';body.append(clone);
  body.classList.add('export-body','print-preview');
  const source='<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml"><style>'+css.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</style>'+new XMLSerializer().serializeToString(body)+'</div></foreignObject></svg>';
  const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(source);await image.decode();
  // WebKit completes embedded font/image paint on its next frame.
  await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
  const canvas=document.createElement('canvas');canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);const ctx=canvas.getContext('2d');if(!ctx)throw Error('浏览器无法创建图片画布。');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);return canvas;
 }
 async function encode(canvas:HTMLCanvasElement,type:'image/png'|'image/jpeg'){
  try{
   const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('无法编码试卷页面。')),type,.98));
   if(blob.type!==type)throw Error('当前浏览器不支持 '+type+' 导出。');
   return new Uint8Array(await blob.arrayBuffer());
  }finally{canvas.width=canvas.height=0;}
 }
 type PDFImage={width:number;height:number;jpeg:Uint8Array};
 function pdf(images:PDFImage[],width:number,height:number,mark:boolean){
  const objects:Uint8Array[]=[],add=(s:string|Uint8Array)=>{objects.push(typeof s==='string'?bytes(s):s);return objects.length;},stream=(dict:string,data:Uint8Array)=>join([bytes('<<'+dict+' /Length '+data.length+'>>\nstream\n'),data,bytes('\nendstream')]);
  add('<< /Type /Catalog /Pages 2 0 R >>');add('');const refs:number[]=[];
  for(const page of images){const image=add(stream(' /Type /XObject /Subtype /Image /Width '+page.width+' /Height '+page.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode',page.jpeg)),content=add(stream('',bytes('q '+width+' 0 0 '+height+' 0 0 cm /Im0 Do Q'))),link=mark?add('<< /Type /Annot /Subtype /Link /Rect ['+(width-175)+' 5 '+(width-7)+' 23] /Border [0 0 0] /A << /S /URI /URI (https://github.com/BurntRoses/paper-notebook-practice) >> >>'):null;
   refs.push(add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+width+' '+height+'] /Resources << /XObject << /Im0 '+image+' 0 R >> >> /Contents '+content+' 0 R'+(link?' /Annots ['+link+' 0 R]':'')+' >>'));
  }objects[1]=bytes('<< /Type /Pages /Count '+refs.length+' /Kids ['+refs.map(r=>r+' 0 R').join(' ')+'] >>');
  const parts=[bytes('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')],offsets=[0];let offset=parts[0].length;objects.forEach((obj,i)=>{offsets.push(offset);const part=join([bytes((i+1)+' 0 obj\n'),obj,bytes('\nendobj\n')]);parts.push(part);offset+=part.length;});parts.push(bytes('xref\n0 '+(objects.length+1)+'\n0000000000 65535 f'+String.fromCharCode(32,10)+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n'+String.fromCharCode(32,10)).join('')+'trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+offset+'\n%%EOF\n'));return join(parts);
 }
 async function run(format:string,onProgress:(s:string)=>void=()=>{}){
  if(!['png','pdf','docx'].includes(format))throw Error('不支持的导出格式。');
  if(format==='docx'){onProgress('正在生成可编辑的 Word 文档');return writeWord(document,zip);}
  const wasPreview=document.body.classList.contains('print-preview');if(!wasPreview)document.getElementById('preview-print')?.click();
  try{
   await document.fonts.ready;
   await Promise.all(Array.from(document.querySelectorAll<HTMLImageElement>('#paper-root img')).map(async img=>{
    try{await img.decode();}catch{throw Error('有题图未能读取：'+(img.alt||'未命名题图')+'。请修复题图后重新导出。');}
   }));
   const root=document.getElementById('paper-root')!,zoom=root.style.getPropertyValue('--paper-zoom');root.style.setProperty('--paper-zoom','1');
   try{const pages=Array.from(root.querySelectorAll<HTMLElement>('.exam-page'));if(!pages.length)throw Error('没有可导出的试卷页面。');const page=pages[0],payload=JSON.parse(document.getElementById('practice-data')!.textContent??'{}'),width=(payload.paperGeometry?.widthMm??page.offsetWidth*25.4/96)*72/25.4,height=(payload.paperGeometry?.heightMm??page.offsetHeight*25.4/96)*72/25.4,mark=payload.presentation?.projectMark!==false,title=String(payload.title||'试卷').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'').slice(0,120),tag={exam:'试卷',answers:'答案卷','answer-card':'答题卡'}[payload.paperKind as string]??'试卷',base='《'+title+'》-'+tag;
    const style=paperCSS();
    const images:PDFImage[]=[],files:Record<string,Uint8Array>={},css=rasterCSS(style);
    for(let i=0;i<pages.length;i++){
     onProgress('正在导出 '+format.toUpperCase()+' '+(i+1)+' / '+pages.length);
     const canvas=await raster(pages[i],css);
     if(format==='png')files[base+'-'+String(i+1).padStart(3,'0')+'.png']=await encode(canvas,'image/png');
     else images.push({width:canvas.width,height:canvas.height,jpeg:await encode(canvas,'image/jpeg')});
    }
    return format==='png'?{name:base+'-PNG.zip',mime:'application/zip',bytes:zip(files),pages:pages.length}:{name:base+'.pdf',mime:'application/pdf',bytes:pdf(images,width,height,mark),pages:pages.length};
   }finally{root.style.setProperty('--paper-zoom',zoom||'1');}
  }finally{if(!wasPreview)document.getElementById('close-preview')?.click();}
 }
 w.paperExports={run};
 const markToggle=document.getElementById('show-project-mark') as HTMLInputElement|null;
 if(markToggle){const template=document.getElementById('page-project-mark') as HTMLTemplateElement|null,credit=template?.dataset.credit??template?.innerHTML??'';const apply=()=>{document.body.dataset.projectMark=String(markToggle.checked);if(template)template.innerHTML=markToggle.checked?credit:'';document.querySelectorAll('#paper-root .project-credit').forEach(el=>el.remove());if(markToggle.checked)document.querySelectorAll('#paper-root .exam-page').forEach(page=>page.insertAdjacentHTML('afterbegin',credit));const payload=document.getElementById('practice-data')!,data=JSON.parse(payload.textContent||'{}');data.presentation??={sourceLayout:false};data.presentation.projectMark=markToggle.checked;payload.textContent=JSON.stringify(data).replace(/</g,'\\u003c');};apply();markToggle.addEventListener('change',apply);}

 const button=document.getElementById('export-paper-file') as HTMLButtonElement|null,select=document.getElementById('paper-export-format') as HTMLSelectElement|null;
 if(button&&select)button.addEventListener('click',async()=>{button.disabled=true;const original=button.textContent;try{const result=await run(select.value,s=>{button.textContent=s;}),url=URL.createObjectURL(new Blob([new Uint8Array(result.bytes).buffer],{type:result.mime})),a=document.createElement('a');a.href=url;a.download=result.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);button.textContent='已下载';}catch(error){document.getElementById('session-message')!.textContent=error instanceof Error?error.message:String(error);}finally{button.disabled=false;setTimeout(()=>{button.textContent=original;},1800);}});
}
