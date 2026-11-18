/** Read publisher files in place, and open user-supplied PDFs without uploading them. */
export interface OriginalDocument {
 id:string;
 title:string;
 url:string;
 publisherUrl?:string;
 /** Source-specific access verified from the publisher's PDF response. */
 access?:'browser'|'publisher';
 pages?:number;
 images?:string[];
 cover?:string;
 kind?:'pdf'|'images'|'web';
}
type Options={page?:number;file?:File;onPage?:(page:number)=>void;onFile?:(file:File)=>void};
export interface OriginalViewer {goTo(page:number):void;getPage():number;dispose():void}
const icon=(path:string)=>`<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
export function mountOriginalViewer(stage:HTMLElement,controls:HTMLElement,source:OriginalDocument,options:Options={}):OriginalViewer {
 let disposed=false,page=Math.max(0,options.page??0),count=0,mode:'images'|'canvas'|'browser'|'loading'|'external'='loading',revision=0;
 let pdf:Awaited<ReturnType<typeof import('./pdf')['openPdfDocument']>>|undefined;
 let task:{cancel():void}|undefined,loading:AbortController|undefined,localFile=options.file;
 let nativeFrame:HTMLIFrameElement|undefined;
 const listeners=new AbortController(),signal=listeners.signal;
 stage.classList.add('original-document-stage');controls.classList.add('document-pagination');
 stage.setAttribute('aria-label',source.title);
 controls.setAttribute('role','group');controls.setAttribute('aria-label','原件翻页');
 controls.innerHTML=`<button type="button" class="icon-button" aria-label="第一页" title="第一页">${icon('m13 5-5 5 5 5M5 4v12')}</button><button type="button" class="icon-button" aria-label="上一页" title="上一页">${icon('m12 5-5 5 5 5')}</button><label class="document-page-position"><span>第</span><input type="number" min="1" step="1" inputmode="numeric" aria-label="跳转到页码"><span>页</span></label><button type="button" class="icon-button" aria-label="下一页" title="下一页">${icon('m8 5 5 5-5 5')}</button><button type="button" class="icon-button" aria-label="最后一页" title="最后一页">${icon('m7 5 5 5-5 5M15 4v12')}</button><span class="sr-only" role="status"></span>`;
 const [first,prev,next,last]=[...controls.querySelectorAll('button')];
 const input=controls.querySelector('input')!,total=controls.querySelector('.document-page-position span:last-child')!,state=controls.querySelector('[role=status]')!;
 const navigable=()=>mode==='images'||mode==='canvas';
 function update(){
  if(count)page=Math.min(page,count-1);input.value=String(navigable()?page+1:1);input.max=String(count||1);
  total.textContent=count?`/ ${count} 页`:'/ — 页';input.disabled=!navigable();
  first.disabled=prev.disabled=!navigable()||page===0;next.disabled=last.disabled=!navigable()||page>=count-1;
  controls.dataset.page=navigable()?String(page+1):'';controls.dataset.pages=String(count);controls.dataset.reader=mode;
  stage.tabIndex=navigable()?0:-1;stage.setAttribute('aria-label',navigable()?source.title+'，左右方向键翻页':source.title);
  stage.setAttribute('aria-busy',String(mode==='loading'));
 }
 function image(url:string,alt:string){const element=document.createElement('img');element.src=url;element.alt=alt;element.decoding='async';return element;}
 function cover(){const img=source.cover?image(source.cover,'已收录的原件首页'):undefined;stage.replaceChildren(...img?[img]:[]);}
 function loadingNote(text:string){const hint=document.createElement('p');hint.className='original-loading';hint.textContent=text;return hint;}
 function sourceActions(allowLocal:boolean){
  const actions=document.createElement('div');actions.className='original-document-actions';
  const anchor=(url:string,label:string)=>{const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noreferrer';link.className='button text small';link.textContent=label;actions.append(link);};
  anchor(source.publisherUrl??source.url,'打开来源原件');
  if(source.publisherUrl&&source.publisherUrl!==source.url)anchor(source.url,'直接打开 PDF');
  if(allowLocal){
   const fileInput=document.createElement('input');fileInput.type='file';fileInput.accept='application/pdf,.pdf';fileInput.hidden=true;
   const pick=document.createElement('button');pick.type='button';pick.className='button text small';pick.textContent='读取本机 PDF';pick.onclick=()=>fileInput.click();
   fileInput.onchange=()=>{const file=fileInput.files?.[0];if(file){page=0;localFile=file;options.onPage?.(0);void loadPdf(file);}};
   actions.append(pick,fileInput);
  }
  return actions;
 }
 const toolbar=document.createElement('div');toolbar.className='original-native-toolbar';toolbar.append(sourceActions(true));controls.append(toolbar);
 function external(message:string,allowLocal=source.kind==='pdf',retry=false){
  mode='external';count=0;update();cover();state.textContent=message;
  const panel=document.createElement('div');panel.className='original-document-fallback';
  const note=document.createElement('p');note.textContent=message;panel.append(note);
  const actions=sourceActions(allowLocal);
  if(retry){const button=document.createElement('button');button.type='button';button.className='button text small';button.textContent='重试站内读取';button.onclick=()=>{void loadPdf();};actions.append(button);}
  panel.append(actions);stage.append(panel);
 }
 function browserPdf(){
  if(!navigator.pdfViewerEnabled){external('此浏览器没有内置 PDF 阅读器。可打开原件，或选取下载的 PDF 在此翻页。');return;}
  mode='browser';count=0;update();state.textContent='使用浏览器阅读原版 PDF';
  const frame=document.createElement('iframe');nativeFrame=frame;frame.className='original-native-pdf';frame.title=source.title+' · 发布者原版 PDF';frame.referrerPolicy='no-referrer';
  const url=new URL(source.url,location.href);url.hash='page='+(page+1)+'&view=FitH';frame.src=url.href;
  stage.replaceChildren(frame);
 }
 async function draw(){
  if(disposed||!navigable())return;update();options.onPage?.(page);const drawId=++revision;
  task?.cancel();task=undefined;
  const label=`${localFile?.name??source.title}，第 ${page+1} 页，共 ${count} 页`;
  if(mode==='images'){
   const node=image(source.images![page],label),loading=loadingNote(`正在读取第 ${page+1} 页…`);stage.setAttribute('aria-busy','true');state.textContent=loading.textContent;stage.replaceChildren(node,loading);
   void node.decode().then(()=>{if(drawId!==revision||disposed)return;loading.remove();stage.setAttribute('aria-busy','false');state.textContent=label;}).catch(()=>{if(disposed||drawId!==revision)return;node.remove();loading.remove();stage.setAttribute('aria-busy','false');state.textContent='此页读取失败';const retry=document.createElement('button');retry.className='button secondary document-retry';retry.textContent='重试此页';retry.onclick=()=>{void draw();};stage.append(retry);});
  }else if(pdf){
   try{
    const sheet=await pdf.getPage(page+1);if(disposed||drawId!==revision)return;
    const viewport=sheet.getViewport({scale:1}),rect=stage.getBoundingClientRect();
    const scale=Math.max(.1,Math.min((rect.width-12)/viewport.width,(rect.height-12)/viewport.height)),ratio=Math.min(window.devicePixelRatio||1,2);
    const canvas=document.createElement('canvas');canvas.setAttribute('role','img');canvas.setAttribute('aria-label',label);
    const renderViewport=sheet.getViewport({scale:scale*ratio});canvas.width=Math.ceil(renderViewport.width);canvas.height=Math.ceil(renderViewport.height);
    canvas.style.width=`${renderViewport.width/ratio}px`;canvas.style.height=`${renderViewport.height/ratio}px`;
    const context=canvas.getContext('2d');if(!context)throw Error('此页无法显示');
    const job=sheet.render({canvasContext:context,viewport:renderViewport});task=job;await job.promise;
    if(disposed||drawId!==revision)return;stage.replaceChildren(canvas);state.textContent=label;sheet.cleanup();
   }catch(error){if(disposed||drawId!==revision||(error as Error).name==='RenderingCancelledException')return;external('此 PDF 页面无法显示。');}
  }
 }
 async function loadPdf(file?:File){
  nativeFrame?.remove();nativeFrame=undefined;task?.cancel();await pdf?.destroy().catch(()=>{});pdf=undefined;
  if(disposed)return;
  loading?.abort();const controller=new AbortController();loading=controller;
  mode='loading';count=0;update();cover();state.textContent='正在读取 PDF';stage.append(loadingNote('正在读取 PDF…'));
  const timer=setTimeout(()=>controller.abort(),20000);
  try{
   const [buffer,{openPdfDocument}]=await Promise.all([file?file.arrayBuffer():fetch(source.url,{signal:controller.signal,credentials:'omit'}).then(response=>{
    if(!response.ok)throw Error('原件无法读取');
    return response.arrayBuffer();
   }),import('./pdf')]);
   const loaded=await openPdfDocument(buffer,controller.signal);
   if(disposed||loading!==controller){void loaded.destroy().catch(()=>{});return;}
   pdf=loaded;count=loaded.numPages;mode='canvas';if(file)options.onFile?.(file);void draw();
  }catch{
   if(!disposed&&loading===controller){localFile=undefined;external(file?'无法读取所选 PDF，请重新选择。':controller.signal.aborted?'来源读取超时。可重试、打开发布页或读取下载的原卷。':'无法从来源读取 PDF。可打开发布页，或选取下载的 PDF 在此翻页。',true,!file);}
  }finally{clearTimeout(timer);if(loading===controller)loading=undefined;}
 }
 function goTo(target:number){if(disposed||!navigable()||!Number.isFinite(target))return;const value=Math.max(0,Math.min(count-1,Math.round(target)));if(value!==page){page=value;void draw();}}
 first.onclick=()=>goTo(0);prev.onclick=()=>goTo(page-1);next.onclick=()=>goTo(page+1);last.onclick=()=>goTo(count-1);
 const jump=()=>{if(input.value)goTo(Number(input.value)-1);update();};input.onchange=jump;input.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();jump();input.select();}};
 const key=(event:KeyboardEvent)=>{if(!navigable()||event.isComposing||event.altKey||event.ctrlKey||event.metaKey||(event.target as Element).closest('input,textarea,select,[contenteditable]'))return;
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();goTo(event.key==='Home'?0:event.key==='End'?count-1:page+(event.key==='ArrowRight'?1:-1));};
 controls.addEventListener('keydown',key,{signal});stage.addEventListener('keydown',key,{signal});
 let touchX:number|undefined,touchY=0;
 stage.addEventListener('touchstart',event=>{touchX=event.touches.length===1?event.touches[0].clientX:undefined;touchY=event.touches[0]?.clientY??0;},{signal,passive:true});
 stage.addEventListener('touchend',event=>{if(touchX===undefined||!event.changedTouches.length)return;const dx=event.changedTouches[0].clientX-touchX,dy=event.changedTouches[0].clientY-touchY;touchX=undefined;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)goTo(page+(dx<0?1:-1));},{signal,passive:true});
 const resize=new ResizeObserver(()=>{if(mode==='canvas')void draw();});resize.observe(stage);
 if(localFile)void loadPdf(localFile);
 else if(source.images?.length){mode='images';count=source.images.length;void draw();}
 else if(source.kind==='pdf'&&source.access==='browser')browserPdf();
 else if(source.kind==='pdf'&&source.access==='publisher')external('此来源需从发布页打开。将下载的 PDF 选入站内即可翻页。');
 else if(source.kind==='pdf')void loadPdf();
 else external('原件以网页发布，请到发布页查看。',false);
 return {goTo,getPage:()=>page,dispose(){disposed=true;revision++;nativeFrame?.remove();listeners.abort();loading?.abort();task?.cancel();void pdf?.destroy().catch(()=>{});resize.disconnect();stage.removeAttribute('tabindex');}};
}
