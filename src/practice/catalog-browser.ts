import {CATALOG_CATEGORIES,CATEGORY_ALIASES,type CatalogCategory} from './catalog-categories';
import {identityNames,languageNames,regionNames,regionOrder,resourceNames,scopeNames,type CatalogEntry,type CatalogLanguage,type CatalogRegion,type ResourceKind} from './catalog-identity';

const PAGE_SIZE=18;
const normalize=(value:string)=>value.normalize('NFKC').toLowerCase();
const e=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const collator=new Intl.Collator('zh-CN',{numeric:true});
const kinds=Object.keys(resourceNames) as ResourceKind[];
const legacyTags:Record<string,string[]>={
 数学:['高数','代数','概率','统计','微积分','数学','math','calculus'],语文:['语文','中國語文','古詩','古诗','文言'],
 英语:['英語','英语','英文','cet','ielts','english'],阅读写作:['阅读','閱讀','写作','寫作','申论','翻译','reading','writing','essay'],
 计算机:['计算机','程序','算法','python','office','computer','408'],理工:['理工','科学','物理','化学','工程','力学','电路','生物','science'],
 经济管理:['经济','会计','审计','管理','金融','accounting','business'],公民知识:['入籍','公民','civics','citizen'],
 艺术创作:['艺术','音乐','设计','作品集','art','music','design'],日语:['日语','日文','日本語','jlpt'],
};
type Filters={type:ResourceKind|'all';category:string;region:string;language:string;subject:string;query:string;tags:string[];page:number;item:string};
type Facet='region'|'language'|'subject';
const facets:Facet[]=['region','subject','language'];
const facetLabels={region:'地区',subject:'科目',language:'卷面语言'};
const facetName=(key:Facet,value:string)=>key==='region'?regionNames[value as CatalogRegion]??value:key==='language'?languageNames[value as CatalogLanguage]??value:value;
const fallbackRegion=(category:string)=>category==='小学'?'mainland':'all';
const byCategory=(a:string,b:string)=>CATALOG_CATEGORIES.indexOf(a as CatalogCategory)-CATALOG_CATEGORIES.indexOf(b as CatalogCategory);
const priority=(entry:CatalogEntry)=>entry.scope==='full'?0:entry.identity==='original'?1:2;

interface CatalogBrowserOptions {
 mountPreview(host:HTMLElement,entry:CatalogEntry,openRelated:(id:string)=>void):()=>void;
 openPreview(entry:CatalogEntry,openRelated:(id:string)=>void,onClose:()=>void):void;
 closePreview:()=>void;
}

export function mountCatalogBrowser(host:HTMLElement,shelf:CatalogEntry[],options:CatalogBrowserOptions){
 const viewport=matchMedia('(min-width: 1024px)');
 const indexed=new Map(shelf.map(entry=>[entry.id,entry]));
 const sorted=shelf.slice().sort((a,b)=>regionOrder.indexOf(a.region)-regionOrder.indexOf(b.region)||
  byCategory(a.category,b.category)||priority(a)-priority(b)||collator.compare(a.title,b.title));
 const searchIndex=new Map(sorted.map(entry=>[entry.id,normalize([
  entry.title,entry.subject,entry.category,entry.grade,entry.issuer,regionNames[entry.region],
  languageNames[entry.language],entry.system,entry.year,...entry.aliases??[],
 ].filter(Boolean).join(' '))]));
 const params=new URLSearchParams(location.hash.split('?')[1]??'');
 const initial=indexed.get(params.get('item')??'');
 const rawCategory=params.get('category')??'';
 const categoryAlias=CATEGORY_ALIASES[rawCategory]??rawCategory;
 const type=params.get('type');
 const state:Filters={
  type:type==='all'||kinds.includes(type as ResourceKind)?type as Filters['type']:initial?.kind??(params.has('tag')?'all':'paper'),
  category:CATALOG_CATEGORIES.includes(categoryAlias as CatalogCategory)?categoryAlias:'',
  region:params.has('region')&&Object.hasOwn(regionNames,params.get('region')??'')?params.get('region')!:
   params.has('region')?'all':categoryAlias==='小学'&&initial?.category==='小学'?initial.region:fallbackRegion(categoryAlias),
  subject:params.get('subject')??'',language:Object.hasOwn(languageNames,params.get('lang')??'')?params.get('lang')!:'',
  query:params.get('q')??'',tags:params.getAll('tag').filter(tag=>Object.hasOwn(legacyTags,tag)),
  page:Math.max(1,Math.trunc(Number(params.get('page')))||1),item:initial?.id??'',
 };
 let current='',modal='',disposed=false,composing=false,previewTimer=0,previewFrame=0,searchTimer=0;
 let disposePreview=()=>{};
 host.className='templates-page catalog-page';
 host.innerHTML='<section class="catalog-toolbar" aria-label="查找试卷与版式">'+
  '<input id="case-search" type="search" aria-label="搜索考试、科目或试卷" placeholder="搜索考试、科目或试卷">'+
  '<select id="catalog-category" data-native-select aria-label="考试方向"><option value="">全部考试方向</option>'+CATALOG_CATEGORIES.map(name=>'<option>'+e(name)+'</option>').join('')+'</select>'+
  '<div class="catalog-resource-tabs" role="group" aria-label="资源类型">'+kinds.map(kind=>'<button type="button" data-resource="'+kind+'">'+resourceNames[kind]+'</button>').join('')+'</div>'+
  '<button type="button" id="catalog-more" aria-controls="catalog-facets" aria-expanded="false">筛选</button>'+
  '</section><div id="catalog-facets" class="catalog-facets" hidden></div><div id="catalog-selection" hidden class="catalog-selection"></div>'+
  '<div class="catalog-workspace"><section class="catalog-list" aria-label="目录结果"><header class="catalog-list-heading"><output id="catalog-count" aria-live="polite"></output></header>'+
  '<div class="catalog-results" id="catalog-results"></div><div class="catalog-list-pagination" id="catalog-list-pagination"></div></section>'+
  '<section id="catalog-paper" class="catalog-paper" aria-label="卷面预览"></section></div>';
 const search=host.querySelector<HTMLInputElement>('#case-search')!;
 const category=host.querySelector<HTMLSelectElement>('#catalog-category')!;
 const more=host.querySelector<HTMLButtonElement>('#catalog-more')!;
 const filters=host.querySelector<HTMLElement>('#catalog-facets')!;
 const selection=host.querySelector<HTMLElement>('#catalog-selection')!;
 const results=host.querySelector<HTMLElement>('#catalog-results')!;
 const count=host.querySelector<HTMLOutputElement>('#catalog-count')!;
 const pagination=host.querySelector<HTMLElement>('#catalog-list-pagination')!;
 const preview=host.querySelector<HTMLElement>('#catalog-paper')!;
 search.value=state.query;
 category.value=state.category;
 filters.innerHTML=facets.map(key=>'<label>'+facetLabels[key]+'<select data-native-select data-facet="'+key+'" aria-label="'+facetLabels[key]+'"></select></label>').join('');
 const selects=new Map(facets.map(key=>[key,filters.querySelector<HTMLSelectElement>('[data-facet="'+key+'"]')!]));

 function setURL(push=false){
  const url=new URLSearchParams();
  if(state.type!=='paper')url.set('type',state.type);
  if(state.category)url.set('category',state.category);
  if(state.region!==fallbackRegion(state.category))url.set('region',state.region);
  if(state.subject)url.set('subject',state.subject);
  if(state.language)url.set('lang',state.language);
  if(state.query)url.set('q',state.query);
  for(const tag of state.tags)url.append('tag',tag);
  if(state.item)url.set('item',state.item);
  if(state.page>1)url.set('page',String(state.page));
  const hash='#templates'+(url.size?'?'+url.toString():'');
  if(location.hash!==hash)history[push?'pushState':'replaceState'](null,'',hash);
 }
 function match(entry:CatalogEntry,skip?:Facet){
  if(state.type!=='all'&&entry.kind!==state.type||state.category&&entry.category!==state.category)return false;
  if(skip!=='region'&&state.region!=='all'&&entry.region!==state.region)return false;
  if(skip!=='subject'&&state.subject&&entry.subject!==state.subject)return false;
  if(skip!=='language'&&state.language&&entry.language!==state.language&&!(entry.language==='mixed'&&['zh','en'].includes(state.language)))return false;
  const haystack=searchIndex.get(entry.id)!;
  return normalize(state.query.trim()).split(/\s+/).every(term=>haystack.includes(term))&&
   state.tags.every(tag=>legacyTags[tag].some(term=>haystack.includes(term)));
 }
 function showFacets(){
  for(const key of facets){
   const values=new Map<string,number>();
   for(const entry of sorted)if(match(entry,key)){
    const options=key==='language'&&entry.language==='mixed'?['mixed','zh','en']:[entry[key]];
    for(const value of options)values.set(value,(values.get(value)??0)+1);
   }
   const active=state[key],control=selects.get(key)!;
   if(active&&active!=='all'&&!values.has(active))values.set(active,0);
   const items=[...values].sort((a,b)=>key==='region'?regionOrder.indexOf(a[0] as CatalogRegion)-regionOrder.indexOf(b[0] as CatalogRegion):collator.compare(facetName(key,a[0]),facetName(key,b[0])));
   control.innerHTML='<option value="'+(key==='region'?'all':'')+'">全部'+facetLabels[key]+'</option>'+
    items.map(([value,total])=>'<option value="'+e(value)+'">'+e(facetName(key,value))+' · '+total+'</option>').join('');
   control.value=active;
  }
  const active=facets.filter(key=>state[key]&&state[key]!=='all');
  selection.hidden=!active.length&&!state.tags.length;
  selection.innerHTML=active.map(key=>'<button type="button" data-clear-facet="'+key+'" aria-label="清除'+facetLabels[key]+'筛选">'+e(facetName(key,state[key]))+' <span aria-hidden="true">×</span></button>').join('')+
   state.tags.map(tag=>'<button type="button" data-clear-tag="'+e(tag)+'" aria-label="清除 '+e(tag)+'">'+e(tag)+' <span aria-hidden="true">×</span></button>').join('');
  more.textContent=active.length?'筛选 '+active.length:'筛选';
 }
 function markCurrent(){
  for(const card of results.querySelectorAll<HTMLButtonElement>('[data-item]'))card.setAttribute('aria-pressed',String(card.dataset.item===(modal||current)));
 }
 function stopScheduledPreview(){cancelAnimationFrame(previewFrame);clearTimeout(previewTimer);}
 function reveal(entry:CatalogEntry,explicit:boolean){
  stopScheduledPreview();
  if(viewport.matches){
   if(current!==entry.id){
    disposePreview();current=entry.id;
    disposePreview=options.mountPreview(preview,entry,follow);
   }
   markCurrent();
  }else if(explicit){
   modal=entry.id;
   markCurrent();
   options.openPreview(entry,follow,()=>{
    if(disposed||modal!==entry.id)return;
    modal='';state.item='';setURL();markCurrent();
    results.querySelector<HTMLButtonElement>('[data-item="'+CSS.escape(entry.id)+'"]')?.focus({preventScroll:true});
   });
  }
 }
 function choose(id:string){
  const entry=indexed.get(id);
  if(!entry)return;
  state.item=id;setURL(true);reveal(entry,true);
 }
 function follow(id:string){
  const entry=indexed.get(id);
  if(!entry)return;
  state.type=entry.kind;state.category=entry.category;state.region=entry.region;
  state.item=id;state.subject='';state.language='';state.query='';state.tags=[];state.page=1;
  search.value='';category.value=state.category;
  draw(true,true);setURL(true);
 }
 function draw(resetScroll=false,explicit=false){
  const entries=sorted.filter(entry=>match(entry));
  const selected=entries.findIndex(entry=>entry.id===state.item);
  if(selected<0)state.item='';
  else state.page=Math.floor(selected/PAGE_SIZE)+1;
  const pages=Math.max(1,Math.ceil(entries.length/PAGE_SIZE));
  state.page=Math.min(state.page,pages);
  for(const tab of host.querySelectorAll<HTMLButtonElement>('[data-resource]'))tab.setAttribute('aria-pressed',String(tab.dataset.resource===state.type));
  const visible=entries.slice((state.page-1)*PAGE_SIZE,state.page*PAGE_SIZE);
  count.textContent=entries.length+' '+(state.type==='layout'?'种版式':state.type==='bank'?'份题库':'项结果');
  let lastRegion:CatalogRegion|undefined;
  results.innerHTML=visible.length?visible.map(entry=>{
   const group=state.region==='all'&&lastRegion!==entry.region?'<h2 class="catalog-region">'+regionNames[entry.region]+'</h2>':'';
   lastRegion=entry.region;
   const detail=entry.kind==='layout'?entry.details:[identityNames[entry.identity],scopeNames[entry.scope],entry.questionCount+' 题'].join(' · ');
   return group+'<button type="button" class="catalog-result" data-item="'+e(entry.id)+'" data-'+entry.request.kind+'="'+e(entry.request.id)+'" aria-pressed="false">'+
    '<span class="catalog-result-title">'+e(entry.title)+'</span><span class="catalog-result-meta">'+e([entry.subject,languageNames[entry.language],detail].join(' · '))+'</span></button>';
  }).join(''):'<div class="catalog-empty"><p>没有符合当前条件的'+(state.type==='all'?'条目':resourceNames[state.type])+'</p><button type="button" class="button secondary" data-reset-catalog>清除筛选</button></div>';
  if(resetScroll)results.scrollTop=0;
  pagination.hidden=pages===1;
  pagination.innerHTML=pages>1?'<button type="button" data-step="-1" '+(state.page===1?'disabled':'')+'>上一页</button><span>'+state.page+' / '+pages+'</span><button type="button" data-step="1" '+(state.page===pages?'disabled':'')+'>下一页</button>':'';
  showFacets();markCurrent();
  if(viewport.matches){
   const next=visible.find(entry=>entry.id===state.item)??visible.find(entry=>entry.id===current)??visible[0];
   stopScheduledPreview();
   if(current&&next?.id!==current){
    disposePreview();disposePreview=()=>{};current='';preview.replaceChildren();
   }
   if(next)previewFrame=requestAnimationFrame(()=>{previewTimer=window.setTimeout(()=>{if(!disposed)reveal(next,false);},0);});
   else preview.innerHTML='<p class="catalog-preview-empty">筛选结果将在此预览</p>';
  }else if(state.item&&(explicit||!modal)){
   const item=indexed.get(state.item);
   if(item)reveal(item,true);
  }
 }
 function change(push=true){
  clearTimeout(searchTimer);state.item='';state.page=1;draw(true);setURL(push);
 }
 more.onclick=()=>{filters.hidden=!filters.hidden;more.setAttribute('aria-expanded',String(!filters.hidden));};
 search.addEventListener('compositionstart',()=>{composing=true;clearTimeout(searchTimer);});
 search.addEventListener('compositionend',()=>{composing=false;search.dispatchEvent(new Event('input'));});
 search.oninput=()=>{
  if(composing)return;
  clearTimeout(searchTimer);
  searchTimer=window.setTimeout(()=>{state.query=search.value;change(false);},150);
 };
 category.onchange=()=>{
  state.category=category.value;state.region=fallbackRegion(state.category);state.subject='';state.tags=[];change();
 };
 for(const [key,control] of selects)control.onchange=()=>{state[key]=control.value;change();};
 host.onclick=event=>{
  const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if(!button)return;
  const {resource,item,step,clearFacet,clearTag}=button.dataset;
  if(resource){if(state.type!==resource){state.type=resource as ResourceKind;state.subject='';change();}}
  if(item)choose(item);
  if(step){state.item='';state.page+=Number(step);draw(true);setURL(true);results.querySelector('button')?.focus({preventScroll:true});}
  if(clearFacet){const key=clearFacet as Facet;state[key]=key==='region'?'all':'';change();more.focus({preventScroll:true});}
  if(clearTag){state.tags=state.tags.filter(tag=>tag!==clearTag);change();more.focus({preventScroll:true});}
  if(button.hasAttribute('data-reset-catalog')){
   state.query='';state.region='all';state.subject='';state.language='';state.tags=[];search.value='';change();search.focus();
  }
 };
 const onViewport=()=>{
  if(viewport.matches&&modal){modal='';options.closePreview();}
  if(!viewport.matches){disposePreview();disposePreview=()=>{};current='';preview.replaceChildren();}
  draw();
 };
 viewport.addEventListener('change',onViewport);
 draw(false,Boolean(state.item));setURL();
 if(state.item)results.querySelector('[data-item="'+CSS.escape(state.item)+'"]')?.scrollIntoView({block:'nearest'});
 return ()=>{
  disposed=true;clearTimeout(searchTimer);stopScheduledPreview();
  viewport.removeEventListener('change',onViewport);disposePreview();host.onclick=null;
 };
}
