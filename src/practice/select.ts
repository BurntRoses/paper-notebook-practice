/** The original select owns the value. The trigger and listbox share the site palette. */
export function mountSelectControls(root:HTMLElement):()=>void{
 const doc=root.ownerDocument,win=doc.defaultView!;
 type Control={
  source:HTMLSelectElement;wrapper:HTMLElement;trigger:HTMLButtonElement;panel:HTMLElement;
  options:HTMLElement[];sync:()=>void;dispose:()=>void;
 };
 const controls=new Map<HTMLSelectElement,Control>();
 let active:Control|undefined,highlight=-1,serial=0,typed='',typing:ReturnType<typeof setTimeout>|undefined;
 const chevron='<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>';
 const check='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
 const enabled=(option:HTMLOptionElement|undefined)=>Boolean(option&&!option.disabled&&!option.hidden&&!option.closest('optgroup[disabled],optgroup[hidden]'));

 function close(focus=false){
  if(!active)return;
  const c=active;active=undefined;highlight=-1;typed='';clearTimeout(typing);
  c.panel.hidden=true;c.trigger.setAttribute('aria-expanded','false');
  c.trigger.removeAttribute('aria-activedescendant');
  if(focus&&c.trigger.isConnected)c.trigger.focus({preventScroll:true});
 }
 function position(c:Control){
  if(!c.trigger.getClientRects().length){close();return;}
  const rect=c.trigger.getBoundingClientRect();
  const margin=8,gap=5,below=win.innerHeight-rect.bottom-margin-gap,above=rect.top-margin-gap;
  if(rect.bottom<0||rect.top>win.innerHeight){close();return;}
  const minWidth=c.source.id==='catalog-category'?306:192;
  const width=Math.min(Math.max(rect.width,minWidth),win.innerWidth-margin*2);
  const down=below>=Math.min(240,above);
  Object.assign(c.panel.style,{
   width:width+'px',maxHeight:Math.max(0,Math.min(340,down?below:above))+'px',
   left:Math.max(margin,Math.min(rect.left,win.innerWidth-width-margin))+'px',
   top:down?rect.bottom+gap+'px':'auto',bottom:down?'auto':win.innerHeight-rect.top+gap+'px',
  });
 }
 function mark(c:Control,index:number,scroll=true){
  if(!enabled(c.source.options[index]))return;
  c.options[highlight]?.removeAttribute('data-highlighted');
  highlight=index;
  const item=c.options[index];item.dataset.highlighted='true';
  c.trigger.setAttribute('aria-activedescendant',item.id);
  if(!scroll)return;
  // Keep the selected row in the listbox without scrolling any ancestor or the page.
  const viewport=c.panel.getBoundingClientRect(),row=item.getBoundingClientRect();
  if(row.top<viewport.top+4)c.panel.scrollTop+=row.top-viewport.top-4;
  else if(row.bottom>viewport.bottom-4)c.panel.scrollTop+=row.bottom-viewport.bottom+4;
 }
 function open(c:Control,last=false){
  if(c.source.disabled)return;
  const values=[...c.source.options],first=last?values.reduce((index,option,position)=>enabled(option)?position:index,-1):values.findIndex(enabled);
  if(first<0)return;
  close();c.sync();active=c;c.panel.hidden=false;c.panel.scrollTop=0;position(c);
  if(active!==c)return;
  c.trigger.setAttribute('aria-expanded','true');
  mark(c,last||!enabled(values[c.source.selectedIndex])?first:c.source.selectedIndex);
 }
 function enhance(source:HTMLSelectElement){
  if(controls.has(source)||source.multiple||source.size>1)return;
  const wrapper=doc.createElement('span'),trigger=doc.createElement('button'),label=doc.createElement('span'),panel=doc.createElement('div');
  wrapper.className='select-control';trigger.className='select-trigger';trigger.type='button';
  label.className='select-value';panel.className='select-panel';panel.dataset.control=source.id;panel.id='practice-select-'+(++serial);panel.role='listbox';panel.hidden=true;
  trigger.setAttribute('role','combobox');trigger.setAttribute('aria-haspopup','listbox');
  trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',panel.id);
  trigger.append(label);trigger.insertAdjacentHTML('beforeend',chevron);
  const tabIndex=source.tabIndex,ariaHidden=source.getAttribute('aria-hidden');
  source.tabIndex=-1;source.setAttribute('aria-hidden','true');source.classList.add('select-source');
  source.before(wrapper);wrapper.append(source,trigger);(source.closest('dialog')??root).append(panel);
  const name=()=>source.getAttribute('aria-label')||[...source.labels??[]].map(l=>{
   const copy=l.cloneNode(true) as Element;
   copy.querySelectorAll('select,button,.select-control').forEach(el=>el.remove());
   return copy.textContent?.trim();
  }).join(' ')||source.title||'选择';
  let signature='';
  const c:Control={source,wrapper,trigger,panel,options:[],sync(){
   const options=[...source.options],labelText=source.selectedOptions[0]?.textContent??'请选择',accessibleName=name();
   label.textContent=labelText;trigger.title=labelText;trigger.disabled=source.disabled;
   trigger.setAttribute('aria-label',accessibleName);trigger.setAttribute('aria-required',String(source.required));
   panel.setAttribute('aria-label',accessibleName);
   const nextSignature=JSON.stringify(options.map(o=>[o.value,o.text,o.parentElement instanceof HTMLOptGroupElement?o.parentElement.label:'',o.selected,enabled(o),o.hidden]));
   if(nextSignature===signature)return;
   signature=nextSignature;
   const list=doc.createDocumentFragment(),groups=new Map<HTMLOptGroupElement,HTMLElement>();
   c.options=options.map((option,i)=>{
    const item=doc.createElement('div');item.className='select-option';item.id=panel.id+'-'+i;item.role='option';item.dataset.index=String(i);
    item.hidden=option.hidden||Boolean(option.closest('optgroup[hidden]'));
    item.setAttribute('aria-selected',String(option.selected));item.setAttribute('aria-disabled',String(!enabled(option)));
    const text=doc.createElement('span');text.textContent=option.text;item.append(text);item.insertAdjacentHTML('beforeend',check);
    const parent=option.parentElement;
    if(parent instanceof HTMLOptGroupElement){
     let group=groups.get(parent);
     if(!group){
      group=doc.createElement('div');group.className='select-option-group';group.role='group';group.setAttribute('aria-label',parent.label);
      const heading=doc.createElement('div');heading.className='select-group-title';heading.textContent=parent.label;heading.ariaHidden='true';group.append(heading);
      groups.set(parent,group);list.append(group);
     }
     group.append(item);
    }else list.append(item);
    return item;
   });
   panel.replaceChildren(list);
   if(active===c){
    const next=enabled(options[highlight])?highlight:options.findIndex(enabled);
    if(next<0||source.disabled)close();else mark(c,next);
   }
  },dispose(){
   if(active===c)close();panel.remove();source.classList.remove('select-source');source.tabIndex=tabIndex;
   if(ariaHidden===null)source.removeAttribute('aria-hidden');else source.setAttribute('aria-hidden',ariaHidden);
   source.removeEventListener('change',c.sync);source.removeEventListener('input',c.sync);
   source.removeEventListener('invalid',invalid);
  }};
  const invalid=()=>trigger.focus({preventScroll:true});
  const choose=(index:number)=>{
   const option=source.options[index];if(!enabled(option))return;
   const changed=source.selectedIndex!==index;source.selectedIndex=index;close(true);c.sync();
   if(changed){source.dispatchEvent(new Event('input',{bubbles:true}));source.dispatchEvent(new Event('change',{bubbles:true}));}
  };
  trigger.onclick=()=>{trigger.focus({preventScroll:true});if(active===c)close();else open(c);};
  trigger.onkeydown=event=>{
   if(event.isComposing||event.altKey||event.metaKey||event.ctrlKey)return;
   const key=event.key;
   if(['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(key)){
    event.preventDefault();
    if(active!==c){open(c,key==='End');return;}
    if(key==='Enter'||key===' '){choose(highlight);return;}
    const indices=Array.from(source.options,(option,index)=>enabled(option)?index:-1).filter(index=>index>=0);
    const current=indices.indexOf(highlight),direction=key==='ArrowUp'?-1:1;
    const next=key==='Home'?indices[0]:key==='End'?indices.at(-1):indices[(current+direction+indices.length)%indices.length];
    if(next!==undefined)mark(c,next);
   }else if(key==='Escape'&&active===c){event.preventDefault();close(true);}
   else if(key==='Tab'&&active===c)close();
   else if(key.length===1){
    if(active!==c)open(c);
    if(active!==c)return;
    typed+=key.toLocaleLowerCase();clearTimeout(typing);typing=setTimeout(()=>typed='',600);
    const index=[...source.options].findIndex(o=>enabled(o)&&o.text.toLocaleLowerCase().startsWith(typed));
    if(index>=0)mark(c,index);
   }
  };
  panel.onpointermove=event=>{
   if(event.pointerType==='touch')return;
   const item=(event.target as Element).closest<HTMLElement>('[data-index]');
   if(item)mark(c,Number(item.dataset.index),false);
  };
  panel.onpointerdown=event=>{if(event.pointerType==='mouse'&&(event.target as Element).closest('[data-index]'))event.preventDefault();};
  panel.onclick=event=>{
   const item=(event.target as Element).closest<HTMLElement>('[data-index]');
   if(item)choose(Number(item.dataset.index));
  };
  source.addEventListener('change',c.sync);source.addEventListener('input',c.sync);source.addEventListener('invalid',invalid);
  controls.set(source,c);c.sync();
 }
 const scan=()=>{
  for(const [source,c] of controls)if(!root.contains(source)){c.dispose();controls.delete(source);}
  root.querySelectorAll<HTMLSelectElement>('select:not([multiple]):not([data-native-select])').forEach(enhance);
 };
 const observer=new MutationObserver(records=>{
  let scanNeeded=false;
  for(const record of records){
   const target=record.target instanceof Element?record.target:record.target.parentElement;
   const source=target?.closest('select');
   if(source)controls.get(source)?.sync();
   if(record.type==='childList'&&[...record.addedNodes,...record.removedNodes].some(node=>node instanceof Element&&(node.matches('select')||node.querySelector('select'))))scanNeeded=true;
  }
  if(scanNeeded)scan();
  if(active&&!active.trigger.getClientRects().length)close();
 });
 const pointer=(event:PointerEvent)=>{if(active&&!active.wrapper.contains(event.target as Node)&&!active.panel.contains(event.target as Node))close();};
 const reposition=()=>{if(active)position(active);};
 const labelClick=(event:MouseEvent)=>{
  const target=event.target as Element,label=target.closest<HTMLLabelElement>('label');
  if(!label||target.closest('button,select,input,textarea,a')||!(label.control instanceof HTMLSelectElement))return;
  const c=controls.get(label.control);
  if(c){event.preventDefault();c.trigger.focus({preventScroll:true});open(c);}
 };
 scan();
 observer.observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['disabled','aria-label','hidden','label','selected']});
 doc.addEventListener('pointerdown',pointer);root.addEventListener('click',labelClick);
 win.addEventListener('resize',reposition);doc.addEventListener('scroll',reposition,true);
 return ()=>{close();observer.disconnect();controls.forEach(c=>c.dispose());doc.removeEventListener('pointerdown',pointer);root.removeEventListener('click',labelClick);win.removeEventListener('resize',reposition);doc.removeEventListener('scroll',reposition,true);clearTimeout(typing);};
}
