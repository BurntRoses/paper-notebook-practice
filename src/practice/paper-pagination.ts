/** Screen-only page navigation for trusted, locally rendered paper iframes. */
export interface PaperPagerState {
 page:number;
 pages:number;
 status:'loading'|'ready'|'empty'|'error';
}
export interface PaperPagerOptions {
 initialPage?:number;
 preservePage?:boolean;
 compact?:boolean;
 fitWidth?:boolean;
 label?:string;
 onChange?:(state:PaperPagerState)=>void;
}
export interface PaperPager {
 setPage:(page:number)=>void;
 reset:()=>void;
 refresh:()=>void;
 dispose:()=>void;
 readonly state:PaperPagerState;
}

const pagerStyle=`
@media screen{
 html[data-paper-pager],html[data-paper-pager] body{width:100%;height:100%;margin:0!important;padding:0!important;overflow:hidden!important;background:var(--paper-pager-background,#e3e5df)!important}
 html[data-paper-pager] body{visibility:visible!important}
 html[data-paper-pager] body>*:not(#paper-root):not(style):not(script):not(template){display:none!important}
 html[data-paper-pager] #paper-root{position:fixed!important;inset:0!important;display:flex!important;align-items:center!important;justify-content:center!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important;overflow:hidden!important;--paper-zoom:var(--paper-pager-zoom,1)!important}
 html[data-paper-pager] #paper-root>.paper-page-frame,html[data-paper-pager] #paper-root>.exam-page{flex:none!important;margin:0!important}
 html[data-paper-pager] #paper-root>.paper-page-frame:not([data-pager-current]),html[data-paper-pager] #paper-root>.exam-page:not([data-pager-current]){display:none!important}
 html[data-paper-pager] #paper-root>.paper-page-frame{width:calc(var(--paper-width,210mm)*var(--paper-pager-zoom,1))!important;height:calc(var(--paper-height,297mm)*var(--paper-pager-zoom,1))!important}
 html[data-paper-pager] #paper-root>.exam-page{zoom:1!important;transform:scale(var(--paper-pager-zoom,1))!important;transform-origin:center!important}
 html[data-paper-pager] .exam-page{box-shadow:0 3px 16px #0002}
 html[data-paper-pager=width]{overflow:auto!important;scrollbar-gutter:stable}
 html[data-paper-pager=width] body{height:auto!important;overflow:visible!important}
 html[data-paper-pager=width] #paper-root{position:static!important;display:block!important;width:auto!important;height:auto!important;min-height:100vh;overflow:visible!important;padding:8px 0 14px!important;box-sizing:border-box}
 html[data-paper-pager=width] #paper-root>.paper-page-frame{margin-inline:auto!important;overflow:hidden;box-shadow:0 2px 12px #0002}
}
`;
const pageIcon=(direction:'first'|'prev'|'next'|'last')=>{
 const paths={first:'<path d="m13 5-5 5 5 5"/><path d="M5 4v12"/>',prev:'<path d="m12 5-5 5 5 5"/>',next:'<path d="m8 5 5 5-5 5"/>',last:'<path d="m7 5 5 5-5 5"/><path d="M15 4v12"/>'};
 return `<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[direction]}</svg>`;
};
const isTextEntry=(target:EventTarget|null)=>{
 const element=target as Element|null;
 return Boolean(element?.nodeType===1&&element.closest('input,textarea,select,[contenteditable]:not([contenteditable=false]),[role=textbox],[role=combobox]'));
};

/** Only use with the application's own renderPractice srcdoc, never uploaded HTML. */
export function createIframePaperPager(frame:HTMLIFrameElement,controls:HTMLElement,options:PaperPagerOptions={}):PaperPager {
 const initialPage=Math.max(0,Math.trunc(options.initialPage??0));
 let requestedPage=initialPage,state:PaperPagerState={page:0,pages:0,status:'loading'},disposed=false;
 let childDocument:Document|null=null,childWindow:Window|null=null,paperRoot:HTMLElement|null=null,style:HTMLStyleElement|null=null;
 let observeDocument:MutationObserver|null=null,observePages:MutationObserver|null=null,resize:ResizeObserver|null=null,scheduled=0,timeout=0;
 const abort=new AbortController();
 controls.classList.add('paper-pager');controls.classList.toggle('paper-pager-compact',Boolean(options.compact));controls.setAttribute('role','group');controls.setAttribute('aria-label',options.label??'试卷翻页');
 controls.innerHTML=`<button type="button" class="icon-button" data-paper-page="first" aria-label="第一页" title="第一页">${pageIcon('first')}</button><button type="button" class="icon-button" data-paper-page="prev" aria-label="上一页" title="上一页">${pageIcon('prev')}</button><label class="paper-pager-position"><span class="paper-pager-prefix">第</span><input data-paper-page-input type="number" inputmode="numeric" min="1" value="1" aria-label="跳转到页码"><span data-paper-page-count>/ — 页</span></label><button type="button" class="icon-button" data-paper-page="next" aria-label="下一页" title="下一页">${pageIcon('next')}</button><button type="button" class="icon-button" data-paper-page="last" aria-label="最后一页" title="最后一页">${pageIcon('last')}</button><output class="paper-pager-status" data-paper-page-status role="status" aria-live="polite"></output>`;
 const input=controls.querySelector<HTMLInputElement>('[data-paper-page-input]')!;
 const count=controls.querySelector<HTMLElement>('[data-paper-page-count]')!;
 const status=controls.querySelector<HTMLElement>('[data-paper-page-status]')!;
 const buttons=[...controls.querySelectorAll<HTMLButtonElement>('[data-paper-page]')];
 const publish=()=>{
  controls.dataset.status=state.status;controls.setAttribute('aria-busy',String(state.status==='loading'));
  input.disabled=state.status!=='ready';input.max=String(Math.max(1,state.pages));
  if(document.activeElement!==input)input.value=String(state.page+1);
  count.textContent=state.status==='ready'?`/ ${state.pages} 页`:'/ — 页';
  status.textContent=state.status==='ready'?`第 ${state.page+1} 页，共 ${state.pages} 页`:state.status==='loading'?'正在排版…':state.status==='empty'?'没有可预览的页面':'预览未能完成，请重新打开试卷。';
  buttons.forEach(button=>button.disabled=state.status!=='ready'||(['first','prev'].includes(button.dataset.paperPage!)?state.page===0:state.page===state.pages-1));
  options.onChange?.({...state});
 };
 const changeState=(next:PaperPagerState)=>{if(next.page!==state.page||next.pages!==state.pages||next.status!==state.status){state=next;publish();}};
 const selectables=()=>paperRoot?[...paperRoot.children].filter((element):element is HTMLElement=>element instanceof (childWindow as Window&typeof globalThis).HTMLElement&&element.matches('.paper-page-frame,.exam-page')):[];
 const fit=()=>{
  scheduled=0;if(disposed||!childDocument||!childWindow||!paperRoot)return;
  if(childDocument.body?.dataset.ready!=='true'){changeState({...state,status:'loading'});return;}
  const pages=selectables();if(!pages.length){changeState({page:0,pages:0,status:'empty'});return;}
  const page=Math.max(0,Math.min(Math.trunc(requestedPage),pages.length-1));requestedPage=page;
  const sheet=pages[page].matches('.exam-page')?pages[page]:pages[page].querySelector<HTMLElement>('.exam-page');
  if(!sheet){changeState({page:0,pages:0,status:'empty'});return;}
  const changedPage=!pages[page].hasAttribute('data-pager-current');
  if(changedPage){paperRoot.querySelector('[data-pager-current]')?.removeAttribute('data-pager-current');pages[page].setAttribute('data-pager-current','');}
  // offset dimensions retain the physical page size even when screen-scaled.
  const computed=childWindow.getComputedStyle(sheet),width=sheet.offsetWidth||parseFloat(computed.width),height=sheet.offsetHeight||parseFloat(computed.height);
  if(!width||!height)return;
  const availableWidth=childDocument.documentElement.clientWidth,availableHeight=childDocument.documentElement.clientHeight;
  const zoom=Math.max(.01,Math.min(1,(availableWidth-(options.fitWidth?12:24))/width,options.fitWidth?1:(availableHeight-20)/height));
  paperRoot.style.setProperty('--paper-pager-zoom',String(zoom));
  const background=getComputedStyle(frame).getPropertyValue('--preview-surround').trim();
  if(background)childDocument.documentElement.style.setProperty('--paper-pager-background',background);
  childDocument.documentElement.dataset.paperPager=options.fitWidth?'width':'true';
  if(changedPage)childWindow.scrollTo(0,0);clearTimeout(timeout);
  changeState({page,pages:pages.length,status:'ready'});
 };
 const schedule=()=>{if(!disposed&&!scheduled)scheduled=requestAnimationFrame(fit);};
 const onKey=(event:KeyboardEvent)=>{
  if(event.defaultPrevented||event.isComposing||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||isTextEntry(event.target)||state.status!=='ready'||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();setPage(event.key==='Home'?0:event.key==='End'?state.pages-1:requestedPage+(event.key==='ArrowRight'?1:-1));
 };
 const detach=()=>{
  if(scheduled)cancelAnimationFrame(scheduled);scheduled=0;clearTimeout(timeout);
  observeDocument?.disconnect();observePages?.disconnect();observeDocument=observePages=null;
  childDocument?.removeEventListener('keydown',onKey);childWindow?.removeEventListener('resize',schedule);
  childDocument?.documentElement.removeAttribute('data-paper-pager');
  childDocument?.documentElement.style.removeProperty('--paper-pager-background');
  paperRoot?.style.removeProperty('--paper-pager-zoom');selectables().forEach(item=>item.removeAttribute('data-pager-current'));
  style?.remove();childDocument=null;childWindow=null;paperRoot=null;style=null;
 };
 const attach=()=>{
  if(disposed||!frame.srcdoc)return;detach();if(!options.preservePage)requestedPage=initialPage;
  changeState({page:0,pages:0,status:'loading'});
  try{
   childDocument=frame.contentDocument;childWindow=frame.contentWindow;
   if(!childDocument||!childWindow)throw Error('Unavailable iframe document');
   paperRoot=childDocument.querySelector<HTMLElement>('#paper-root');
   if(!paperRoot){if(frame.srcdoc)changeState({page:0,pages:0,status:'empty'});return;}
   style=childDocument.createElement('style');style.dataset.paperPagerStyle='true';style.textContent=pagerStyle;childDocument.head.append(style);
   observeDocument=new MutationObserver(schedule);observeDocument.observe(childDocument.body,{attributes:true,attributeFilter:['data-ready']});
   observePages=new MutationObserver(schedule);observePages.observe(paperRoot,{childList:true});
   childDocument.addEventListener('keydown',onKey);childWindow.addEventListener('resize',schedule);
   timeout=window.setTimeout(()=>{if(state.status==='loading')changeState({page:0,pages:0,status:'error'});},20000);
   void childDocument.fonts.ready.then(schedule);schedule();
  }catch{changeState({page:0,pages:0,status:'error'});}
 };
 function setPage(page:number){if(!Number.isFinite(page))return;requestedPage=Math.max(0,Math.min(Math.trunc(page),Math.max(0,state.pages-1)));input.value=String(requestedPage+1);schedule();}
 controls.addEventListener('click',event=>{const button=(event.target as Element).closest<HTMLButtonElement>('[data-paper-page]');if(!button||button.disabled)return;const action=button.dataset.paperPage;setPage(action==='first'?0:action==='last'?state.pages-1:requestedPage+(action==='next'?1:-1));},{signal:abort.signal});
 const jump=()=>{const next=Number(input.value);if(Number.isInteger(next)&&next>=1&&next<=state.pages)setPage(next-1);else input.value=String(state.page+1);};
 input.addEventListener('change',jump,{signal:abort.signal});input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();jump();input.select();}else if(event.key==='Escape'){input.value=String(state.page+1);input.blur();}},{signal:abort.signal});
 controls.addEventListener('keydown',onKey,{signal:abort.signal});
 frame.addEventListener('load',attach,{signal:abort.signal});frame.addEventListener('error',()=>changeState({page:0,pages:0,status:'error'}),{signal:abort.signal});
 resize=new ResizeObserver(schedule);resize.observe(frame);
 const themeObserver=new MutationObserver(schedule);themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
 publish();
 return {setPage,reset:()=>setPage(0),refresh:schedule,dispose:()=>{if(disposed)return;disposed=true;abort.abort();resize?.disconnect();themeObserver.disconnect();detach();controls.replaceChildren();controls.removeAttribute('aria-busy');},get state(){return {...state};}};
}

export function mountPaperPager(frame:HTMLIFrameElement,controls:HTMLElement,options:PaperPagerOptions={}){
 const pager=createIframePaperPager(frame,controls,options);return ()=>pager.dispose();
}
