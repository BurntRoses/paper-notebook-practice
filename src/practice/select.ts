/** Native DOM adaptation of frontend-prescription shadcn Select (MIT).
 * The original select remains the form/value contract; one trigger owns its UI.
 * Options share the page palette, including inside native modal dialogs. */
export function mountSelectControls(root:HTMLElement):()=>void{
 const doc=root.ownerDocument,win=doc.defaultView!;
 type Control={source:HTMLSelectElement;wrapper:HTMLElement;trigger:HTMLButtonElement;panel:HTMLElement;sync:()=>void;dispose:()=>void};
 const controls=new Map<HTMLSelectElement,Control>();
 let active:Control|undefined,highlight=0,serial=0,typed='',typing:ReturnType<typeof setTimeout>|undefined;
 const chevron='<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>';
 const close=(focus=false)=>{if(!active)return;const c=active;active=undefined;c.panel.hidden=true;c.trigger.setAttribute('aria-expanded','false');c.trigger.removeAttribute('aria-activedescendant');if(focus&&c.trigger.isConnected)c.trigger.focus({preventScroll:true});};
 function position(c:Control){
  const rect=c.trigger.getBoundingClientRect(),below=win.innerHeight-rect.bottom-12,above=rect.top-12;
  const height=Math.min(320,Math.max(below,above)),width=Math.min(Math.max(rect.width,160),win.innerWidth-24);
  Object.assign(c.panel.style,{width:width+'px',maxHeight:height+'px',left:Math.max(12,Math.min(rect.left,win.innerWidth-width-12))+'px',top:'auto',bottom:'auto'});
  if(below>=Math.min(260,above))c.panel.style.top=(rect.bottom+6)+'px';else c.panel.style.bottom=(win.innerHeight-rect.top+6)+'px';
 }
 function mark(c:Control,index:number){
  const options=[...c.panel.querySelectorAll<HTMLElement>('[role=option]')];
  if(!options.length)return;highlight=Math.max(0,Math.min(index,options.length-1));
  options.forEach((option,i)=>option.dataset.highlighted=String(i===highlight));
  c.trigger.setAttribute('aria-activedescendant',options[highlight].id);options[highlight].scrollIntoView({block:'nearest'});
 }
 function open(c:Control,last=false){
  if(c.source.disabled)return;if(active===c){close();return;}close();active=c;c.sync();c.panel.hidden=false;position(c);
  c.trigger.setAttribute('aria-expanded','true');
  mark(c,last?c.source.options.length-1:Math.max(0,c.source.selectedIndex));
 }
 function enhance(source:HTMLSelectElement){
  if(controls.has(source)||source.multiple||source.size>1)return;
  const wrapper=doc.createElement('span'),trigger=doc.createElement('button'),label=doc.createElement('span'),panel=doc.createElement('div');
  wrapper.className='select-control';trigger.className='select-trigger';trigger.type='button';label.className='select-value';panel.className='select-panel';panel.id='practice-select-'+(++serial);panel.role='listbox';panel.hidden=true;
  trigger.setAttribute('role','combobox');trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',panel.id);trigger.append(label);trigger.insertAdjacentHTML('beforeend',chevron);
  const tabIndex=source.tabIndex,ariaHidden=source.getAttribute('aria-hidden');source.tabIndex=-1;source.setAttribute('aria-hidden','true');source.classList.add('select-source');source.before(wrapper);wrapper.append(source,trigger);(source.closest('dialog')??root).append(panel);
  const name=()=>source.getAttribute('aria-label')||[...source.labels??[]].map(l=>{const clone=l.cloneNode(true) as Element;clone.querySelectorAll('select,button,.select-control').forEach(el=>el.remove());return clone.textContent?.trim();}).join(' ')||source.title||'选择';
  const c:Control={source,wrapper,trigger,panel,sync(){
   label.textContent=source.selectedOptions[0]?.textContent??'请选择';trigger.disabled=source.disabled;trigger.setAttribute('aria-label',name());trigger.setAttribute('aria-required',String(source.required));panel.setAttribute('aria-label',name());
   panel.replaceChildren(...[...source.options].map((option,i)=>{const item=doc.createElement('div');item.className='select-option';item.id=panel.id+'-'+i;item.role='option';item.dataset.index=String(i);item.setAttribute('aria-selected',String(option.selected));item.setAttribute('aria-disabled',String(option.disabled));const text=doc.createElement('span');text.textContent=option.text;item.append(text);if(option.selected)item.insertAdjacentHTML('beforeend','<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>');return item;}));
  },dispose(){if(active===c)close();panel.remove();source.classList.remove('select-source');source.tabIndex=tabIndex;if(ariaHidden===null)source.removeAttribute('aria-hidden');else source.setAttribute('aria-hidden',ariaHidden);source.removeEventListener('change',c.sync);source.removeEventListener('input',c.sync);}};
  const choose=(index:number)=>{const option=source.options[index];if(!option||option.disabled)return;const changed=source.selectedIndex!==index;source.selectedIndex=index;close(true);c.sync();if(changed){source.dispatchEvent(new Event('input',{bubbles:true}));source.dispatchEvent(new Event('change',{bubbles:true}));}};
  trigger.onclick=()=>{trigger.focus({preventScroll:true});open(c);};trigger.onkeydown=e=>{
   if(e.isComposing||e.altKey||e.metaKey||e.ctrlKey)return;
   if(['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(e.key)){e.preventDefault();if(active!==c){open(c,e.key==='End');return;}if(e.key==='Enter'||e.key===' '){choose(highlight);return;}const direction=e.key==='ArrowUp'?-1:1;let index=e.key==='Home'?0:e.key==='End'?source.options.length-1:(highlight+direction+source.options.length)%source.options.length;for(let tries=0;source.options[index]?.disabled&&tries<source.options.length;tries++)index=(index+direction+source.options.length)%source.options.length;mark(c,index);}
   else if(e.key==='Escape'){e.preventDefault();close(true);}else if(e.key==='Tab')close();
   else if(e.key.length===1){typed+=e.key.toLocaleLowerCase();clearTimeout(typing);typing=setTimeout(()=>typed='',600);if(active!==c)open(c);const index=[...source.options].findIndex(o=>!o.disabled&&o.text.toLocaleLowerCase().startsWith(typed));if(index>=0)mark(c,index);}
  };
  panel.onpointermove=e=>{const item=(e.target as Element).closest<HTMLElement>('[data-index]');if(item&&item.getAttribute('aria-disabled')!=='true')mark(c,Number(item.dataset.index));};
  panel.onpointerdown=e=>e.preventDefault();panel.onclick=e=>{const item=(e.target as Element).closest<HTMLElement>('[data-index]');if(item)choose(Number(item.dataset.index));};
  source.addEventListener('change',c.sync);source.addEventListener('input',c.sync);source.addEventListener('invalid',()=>trigger.focus());controls.set(source,c);c.sync();
 }
 const scan=()=>{for(const [source,c] of controls)if(!root.contains(source)){c.dispose();controls.delete(source);}root.querySelectorAll<HTMLSelectElement>('select:not([multiple])').forEach(enhance);};
 const observer=new MutationObserver(records=>{let scanNeeded=false;for(const record of records){if(record.type==='attributes'&&record.target instanceof HTMLSelectElement)controls.get(record.target)?.sync();else if(record.type==='childList'){const target=record.target as Element;if(target instanceof HTMLSelectElement)controls.get(target)?.sync();if([...record.addedNodes,...record.removedNodes].some(node=>node instanceof Element&&(node.matches('select')||node.querySelector('select'))))scanNeeded=true;}}if(scanNeeded)scan();});
 const pointer=(event:PointerEvent)=>{if(active&&!active.wrapper.contains(event.target as Node)&&!active.panel.contains(event.target as Node))close();};
 const reposition=()=>{if(active)position(active);};
 const labelClick=(event:MouseEvent)=>{const label=(event.target as Element).closest<HTMLLabelElement>('label[for]');if(!label||event.target instanceof HTMLButtonElement)return;const source=doc.getElementById(label.htmlFor);if(source instanceof HTMLSelectElement){event.preventDefault();controls.get(source)?.trigger.focus();}};
 scan();observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','aria-label']});doc.addEventListener('pointerdown',pointer);root.addEventListener('click',labelClick);win.addEventListener('resize',reposition);doc.addEventListener('scroll',reposition,true);
 return ()=>{close();observer.disconnect();controls.forEach(c=>c.dispose());doc.removeEventListener('pointerdown',pointer);root.removeEventListener('click',labelClick);win.removeEventListener('resize',reposition);doc.removeEventListener('scroll',reposition,true);clearTimeout(typing);};
}
