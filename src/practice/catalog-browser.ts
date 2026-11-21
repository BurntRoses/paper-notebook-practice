import {catalogGuides} from './catalog-guides';
import type {CatalogPaperSet} from './catalog-shelf';
import {CATALOG_CATEGORIES,CATEGORY_ALIASES,type CatalogCategory} from './catalog-categories';
import {languageNames,regionNames,regionOrder,type CatalogEntry,type CatalogLanguage,type CatalogRegion} from './catalog-identity';

const LEGACY_PAGE_SIZE=18;
const normalize=(value:string)=>value.normalize('NFKC').toLowerCase();
const e=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const collator=new Intl.Collator('zh-CN',{numeric:true});
const directions=[
 ['学校课程','小学','初中与中考','高中与高考','大学课程'],
 ['升学与招录','研究生考试','公务员与招聘','职业资格'],
 ['国际与语言','国际课程与升学','语言考试','公民与入籍'],
 ['其他','艺术与音乐','通用排版'],
] as const;
const directionName:Partial<Record<CatalogCategory,string>>={'初中与中考':'初中／中考','高中与高考':'高中／高考','研究生考试':'考研','公务员与招聘':'考公／招聘','国际课程与升学':'国际课程／留学'};
const shortDirection=(name:CatalogCategory)=>directionName[name]??name;
const legacyTags:Record<string,string[]>={
 数学:['高数','代数','概率','统计','微积分','数学','math','calculus'],语文:['语文','中國語文','古詩','古诗','文言'],
 英语:['英語','英语','英文','cet','ielts','english'],阅读写作:['阅读','閱讀','写作','寫作','申论','翻译','reading','writing','essay'],
 计算机:['计算机','程序','算法','python','office','computer','408'],理工:['理工','科学','物理','化学','工程','力学','电路','生物','science'],
 经济管理:['经济','会计','审计','管理','金融','accounting','business'],公民知识:['入籍','公民','civics','citizen'],
 艺术创作:['艺术','音乐','设计','作品集','art','music','design'],日语:['日语','日文','日本語','jlpt'],
};
type Filters={category:string;region:string;language:string;subject:string;query:string;tags:string[];item:string};
type Facet='region'|'language'|'subject';
const facets:Facet[]=['region','subject','language'];
const facetLabels={region:'地区',subject:'科目',language:'卷面语言'};
const facetName=(key:Facet,value:string)=>key==='region'?regionNames[value as CatalogRegion]??value:key==='language'?languageNames[value as CatalogLanguage]??value:value;

const byCategory=(a:string,b:string)=>CATALOG_CATEGORIES.indexOf(a as CatalogCategory)-CATALOG_CATEGORIES.indexOf(b as CatalogCategory);
const priority=(entry:CatalogEntry)=>entry.id===catalogGuides[entry.category].sample?0:entry.scope==='full'?1:entry.identity==='original'?2:3;
const mark='<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 8 3 3 7-7"/></svg>';

interface CatalogBrowserOptions {
 mountPreview(host:HTMLElement,entry:CatalogPaperSet):()=>void;
 openPreview(entry:CatalogPaperSet,onClose:()=>void):void;
 closePreview:()=>void;
}

export function mountCatalogBrowser(host:HTMLElement,shelf:CatalogPaperSet[],legacyLayouts:ReadonlyMap<string,string>,options:CatalogBrowserOptions){
 const viewport=matchMedia('(min-width: 1024px)');
 const indexed=new Map(shelf.map(entry=>[entry.id,entry]));
 const sorted=shelf.slice().sort((a,b)=>regionOrder.indexOf(a.region)-regionOrder.indexOf(b.region)||
  byCategory(a.category,b.category)||priority(a)-priority(b)||collator.compare(a.title,b.title));
 const searchIndex=new Map(sorted.map(entry=>[entry.id,normalize([
  entry.title,entry.subject,entry.category,shortDirection(entry.category),shortDirection(entry.category)+entry.subject,entry.grade,entry.issuer,regionNames[entry.region],
  languageNames[entry.language],entry.system,entry.year,...entry.aliases??[],
 ].filter(Boolean).join(' '))]));
 const params=new URLSearchParams(location.hash.split('?')[1]??'');
 const requested=params.get('item')??'';
 const redirected=legacyLayouts.get(requested);
 const initial=indexed.get(redirected??requested);
 const categories=new Set(shelf.map(entry=>entry.category));
 const rawCategory=params.get('category')??(initial?.category??'');
 const categoryAlias=CATEGORY_ALIASES[rawCategory]??rawCategory;
 const state:Filters={
  category:redirected&&initial?initial.category:categories.has(categoryAlias as CatalogCategory)?categoryAlias:'',
  region:redirected&&initial?initial.region:params.has('region')&&Object.hasOwn(regionNames,params.get('region')??'')?params.get('region')!:
   'all',
  subject:redirected?'':params.get('subject')??'',language:!redirected&&Object.hasOwn(languageNames,params.get('lang')??'')?params.get('lang')!:'',
  query:redirected?'':params.get('q')??'',tags:redirected?[]:params.getAll('tag').filter(tag=>Object.hasOwn(legacyTags,tag)),
  item:initial?.id??'',
 };
 const legacyPage=Math.max(1,Math.trunc(Number(params.get('page')))||1);


 let showUnavailable=Boolean(requested&&!initial);
 let current='',modal='',disposed=false,composing=false,previewTimer=0,previewFrame=0,searchTimer=0;
 let disposePreview=()=>{};
 host.className='templates-page catalog-page';
 host.innerHTML='<div class="catalog-workspace"><section class="catalog-list" aria-label="试卷目录">'+
  '<div class="catalog-toolbar" role="group" aria-label="查找完整试卷">'+
  '<div class="catalog-search"><svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="8.5" cy="8.5" r="4.5"/><path d="m12 12 4 4"/></svg>'+
  '<input id="case-search" type="search" aria-label="搜索试卷、考试或科目" placeholder="搜索卷名、考试、科目">'+
  '<button id="catalog-clear-search" type="button" aria-label="清空搜索" hidden>×</button></div>'+
  '<select id="catalog-category" aria-label="考试方向"><option value="">所有方向</option>'+directions.map(([group,...names])=>{
   const available=names.filter(name=>categories.has(name));
   return available.length?'<optgroup label="'+e(group)+'">'+available.map(name=>'<option value="'+e(name)+'">'+e(shortDirection(name))+'</option>').join('')+'</optgroup>':'';
  }).join('')+'</select>'+
  '<button type="button" id="catalog-more" aria-controls="catalog-facets" aria-expanded="false"><svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="M2 4h12M4 8h8m-6 4h4"/></svg>筛选<span hidden></span></button>'+
  '</div><div id="catalog-facets" class="catalog-facets" hidden>'+
  facets.map(key=>'<div class="catalog-facet" data-filter="'+key+'"><span>'+facetLabels[key]+'</span><div class="inline-options" role="group" aria-label="'+facetLabels[key]+'"></div><select aria-label="'+facetLabels[key]+'"></select></div>').join('')+
  '</div><div id="catalog-selection" hidden class="catalog-selection"></div>'+
  '<div class="catalog-results-heading"><output id="catalog-count" aria-live="polite"></output><button type="button" id="catalog-clear-filters" hidden>重置筛选</button></div>'+
  '<p class="catalog-link-status" role="status" hidden>这条旧链接指向的资料未收录为完整试卷。</p>'+
  '<div class="catalog-results" id="catalog-results" role="group" aria-label="筛选结果"></div></section>'+
  '<section id="catalog-paper" class="catalog-paper" aria-label="卷面预览"></section></div>';
 const search=host.querySelector<HTMLInputElement>('#case-search')!;
 const clearSearch=host.querySelector<HTMLButtonElement>('#catalog-clear-search')!;
 const category=host.querySelector<HTMLSelectElement>('#catalog-category')!;
 const more=host.querySelector<HTMLButtonElement>('#catalog-more')!;
 const filters=host.querySelector<HTMLElement>('#catalog-facets')!;
 const selection=host.querySelector<HTMLElement>('#catalog-selection')!;
 const results=host.querySelector<HTMLElement>('#catalog-results')!;
 const count=host.querySelector<HTMLOutputElement>('#catalog-count')!;
 const reset=host.querySelector<HTMLButtonElement>('#catalog-clear-filters')!;
 const linkStatus=host.querySelector<HTMLElement>('.catalog-link-status')!;
 const preview=host.querySelector<HTMLElement>('#catalog-paper')!;
 search.value=state.query;
 category.value=state.category;
 const facetControls=facets.map(key=>{
  const field=filters.querySelector<HTMLElement>('[data-filter="'+key+'"]')!;
  return {key,field,inline:field.querySelector<HTMLElement>('.inline-options')!,select:field.querySelector('select')!};
 });

 function setURL(){
  const url=new URLSearchParams();
  if(state.category||state.item)url.set('category',state.category);
  if(state.region!=='all')url.set('region',state.region);
  if(state.subject)url.set('subject',state.subject);
  if(state.language)url.set('lang',state.language);
  if(state.query)url.set('q',state.query);
  for(const tag of state.tags)url.append('tag',tag);
  if(state.item)url.set('item',state.item);
  const hash='#templates'+(url.size?'?'+url.toString():'');
  if(location.hash!==hash)history.replaceState(null,'',hash);
 }
 function match(entry:CatalogEntry,skip?:Facet){
  if(state.category&&entry.category!==state.category)return false;
  if(skip!=='region'&&state.region!=='all'&&entry.region!==state.region)return false;
  if(skip!=='subject'&&state.subject&&entry.subject!==state.subject)return false;
  if(skip!=='language'&&state.language&&entry.language!==state.language&&!(entry.language==='mixed'&&['zh','en'].includes(state.language)))return false;
  const haystack=searchIndex.get(entry.id)!;
  return normalize(state.query.trim()).split(/\s+/).every(term=>haystack.includes(term))&&
   state.tags.every(tag=>legacyTags[tag].some(term=>haystack.includes(term)));
 }
 function showFacets(){
  for(const {key,field,inline,select} of facetControls){
   const values=new Set<string>();
   for(const entry of sorted)if(match(entry,key)){
    const options=key==='language'&&entry.language==='mixed'?['mixed','zh','en']:[entry[key]];
    for(const value of options)values.add(value);
   }
   const active=state[key],any=key==='region'?'all':'';
   if(active&&active!==any)values.add(active);
   const items=[...values].sort((a,b)=>key==='region'?regionOrder.indexOf(a as CatalogRegion)-regionOrder.indexOf(b as CatalogRegion):collator.compare(facetName(key,a),facetName(key,b)));
   const choices=[[any,'全部'+facetLabels[key]],...items.map(value=>[value,facetName(key,value)])];
   const compact=choices.length<=2;
   field.hidden=!items.length;
   select.hidden=compact;
   inline.hidden=!compact;
   if(compact){
    const buttons=choices.map(([value,label])=>'<button type="button" data-facet-choice="'+key+'" data-value="'+e(value)+'">'+e(label)+'</button>').join('');
    if(inline.dataset.choices!==buttons){inline.dataset.choices=buttons;inline.innerHTML=buttons;}
    for(const button of inline.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.value===active));
   }else{
    const options=choices.map(([value,label])=>'<option value="'+e(value)+'">'+e(label)+'</option>').join('');
    if(select.innerHTML!==options)select.innerHTML=options;
    select.value=active;select.dispatchEvent(new Event('input',{bubbles:true}));
   }
  }
  more.disabled=facetControls.every(({field})=>field.hidden);
  if(more.disabled&&!filters.hidden)showFilters(false);
  const active=facets.filter(key=>state[key]&&state[key]!=='all');
  const extra=active.length+state.tags.length;
  const badge=more.querySelector('span')!;
  badge.hidden=!extra;badge.textContent=String(extra);
  selection.hidden=!extra;
  selection.innerHTML=active.map(key=>'<button type="button" data-clear-facet="'+key+'" aria-label="清除'+facetLabels[key]+'筛选">'+e(facetName(key,state[key]))+' <span aria-hidden="true">×</span></button>').join('')+
   state.tags.map(tag=>'<button type="button" data-clear-tag="'+e(tag)+'" aria-label="清除 '+e(tag)+'">'+e(tag)+' <span aria-hidden="true">×</span></button>').join('');
  clearSearch.hidden=!search.value;
  reset.hidden=!state.category&&!state.query&&!extra;
 }
 function markCurrent(){
  const buttons=[...results.querySelectorAll<HTMLButtonElement>('[data-item]')];
  const active=buttons.find(button=>button.dataset.item===(modal||current||state.item));
  const focused=buttons.find(button=>button===document.activeElement);
  for(const button of buttons){
   button.setAttribute('aria-pressed',String(button===active));
   button.tabIndex=button===(focused??active??buttons[0])?0:-1;
  }
 }
 function stopScheduledPreview(){cancelAnimationFrame(previewFrame);clearTimeout(previewTimer);}
 function reveal(entry:CatalogPaperSet,explicit:boolean){
  stopScheduledPreview();
  if(viewport.matches){
   if(current!==entry.id){
    disposePreview();current=entry.id;
    disposePreview=options.mountPreview(preview,entry);
   }
   markCurrent();
  }else if(explicit){
   modal=entry.id;
   markCurrent();
   options.openPreview(entry,()=>{
    if(disposed||modal!==entry.id)return;
    modal='';state.item='';setURL();markCurrent();
    results.querySelector<HTMLButtonElement>('[data-item="'+CSS.escape(entry.id)+'"]')?.focus({preventScroll:true});
   });
  }
 }
 function choose(id:string){
  const entry=indexed.get(id);
  if(!entry)return;
  showUnavailable=false;linkStatus.hidden=true;state.item=id;setURL();reveal(entry,true);
 }
 function row(entry:CatalogEntry,name=entry.title){
  return '<button type="button" class="catalog-result" data-item="'+e(entry.id)+'" data-'+entry.request.kind+'="'+e(entry.request.id)+'" aria-pressed="false">'+
   '<span class="catalog-result-title">'+e(name)+'</span>'+
   '<span class="selection-mark">'+mark+'</span></button>';
 }
 function draw(resetScroll=false,explicit=false){
  const entries=sorted.filter(entry=>match(entry));
  if(!entries.some(entry=>entry.id===state.item))state.item='';
  linkStatus.hidden=!showUnavailable;
  count.textContent=entries.length+' 套完整试卷';
  const groupByRegion=state.region==='all'&&new Set(entries.map(entry=>entry.region)).size>1;
  let lastRegion='';
  results.innerHTML=entries.map(entry=>{
   const pinned=entry.id===catalogGuides[entry.category].sample;
   const region=groupByRegion?entry.region:'';
   const header=region!==lastRegion?'<h2 class="catalog-region">'+e(regionNames[entry.region])+'</h2>':'';
   lastRegion=region;
   return header+row(entry,pinned?catalogGuides[entry.category].name:entry.title);
  }).join('')||'<div class="catalog-empty"><p>没有符合条件的完整试卷</p><button type="button" class="button secondary" data-reset-catalog>重置筛选</button></div>';
  if(resetScroll)results.scrollTop=0;
  showFacets();markCurrent();
  if(viewport.matches){
   const next=entries.find(entry=>entry.id===state.item)??entries.find(entry=>entry.id===current)??entries[0];
   stopScheduledPreview();
   if(current&&next?.id!==current){
    disposePreview();disposePreview=()=>{};current='';preview.replaceChildren();
   }
   if(next)previewFrame=requestAnimationFrame(()=>{previewTimer=window.setTimeout(()=>{if(!disposed)reveal(next,false);},0);});
  }else if(state.item&&explicit){
   const item=indexed.get(state.item);
   if(item)reveal(item,true);
  }
 }
 function change(keepItem=true){
  clearTimeout(searchTimer);showUnavailable=false;
  if(!composing)state.query=search.value;
  if(!keepItem)state.item='';
  draw(true);setURL();
 }
 function showFilters(open:boolean){filters.hidden=!open;more.setAttribute('aria-expanded',String(open));}
 more.onclick=()=>showFilters(filters.hidden);
 const closeFiltersOnEscape=(event:KeyboardEvent)=>{
  if(event.key!=='Escape'||event.defaultPrevented||filters.hidden||document.querySelector('dialog[open]'))return;
  event.preventDefault();showFilters(false);more.focus({preventScroll:true});
 };
 document.addEventListener('keydown',closeFiltersOnEscape);
 search.addEventListener('compositionstart',()=>{composing=true;clearTimeout(searchTimer);});
 search.addEventListener('compositionend',()=>{composing=false;search.dispatchEvent(new Event('input'));});
 search.oninput=()=>{
  clearSearch.hidden=!search.value;
  if(composing)return;
  clearTimeout(searchTimer);
  searchTimer=window.setTimeout(()=>change(),150);
 };
 clearSearch.onclick=()=>{search.value='';search.focus({preventScroll:true});change();};
 function syncCategory(){
  category.value=state.category;category.dispatchEvent(new Event('input',{bubbles:true}));
 }
 category.onchange=()=>{
  state.category=category.value;
  change(false);
 };
 function setFacet(key:Facet,value:string){
  state[key]=value;change();
 }
 for(const {key,select} of facetControls)select.onchange=()=>setFacet(key,select.value);
 results.addEventListener('keydown',event=>{
  if(event.altKey||event.ctrlKey||event.metaKey||event.isComposing||!['ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
  const rows=[...results.querySelectorAll<HTMLButtonElement>('[data-item]')];
  const from=rows.indexOf(event.target as HTMLButtonElement);
  if(from<0)return;
  const to=event.key==='Home'?0:event.key==='End'?rows.length-1:Math.max(0,Math.min(rows.length-1,from+(event.key==='ArrowUp'?-1:1)));
  event.preventDefault();rows[to].focus();markCurrent();
 });
 host.onclick=event=>{
  const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if(!button)return;
  const {item,clearFacet,clearTag,facetChoice,value}=button.dataset;
  if(item)choose(item);
  if(facetChoice&&value!==undefined)setFacet(facetChoice as Facet,value);
  if(clearFacet){setFacet(clearFacet as Facet,clearFacet==='region'?'all':'');more.focus({preventScroll:true});}
  if(clearTag){state.tags=state.tags.filter(tag=>tag!==clearTag);change();more.focus({preventScroll:true});}
  if(button.id==='catalog-clear-filters'||button.hasAttribute('data-reset-catalog')){
   state.category='';syncCategory();state.query='';state.region='all';state.subject='';state.language='';state.tags=[];search.value='';change(false);showFilters(false);search.focus({preventScroll:true});
  }
 };
 const onViewport=()=>{
  if(viewport.matches&&modal){modal='';options.closePreview();}
  if(!viewport.matches){disposePreview();disposePreview=()=>{};current='';preview.replaceChildren();}
  draw();
 };
 viewport.addEventListener('change',onViewport);
 const legacyEntry=legacyPage>1&&!state.item?sorted.filter(entry=>match(entry))[(legacyPage-1)*LEGACY_PAGE_SIZE]:undefined;
 const linked=Boolean(state.item);
 if(legacyEntry&&viewport.matches)state.item=legacyEntry.id;
 draw(false,linked);setURL();
 const anchor=state.item||legacyEntry?.id;
 if(anchor)results.querySelector('[data-item="'+CSS.escape(anchor)+'"]')?.scrollIntoView({block:'nearest'});
 return ()=>{
  disposed=true;clearTimeout(searchTimer);stopScheduledPreview();
  viewport.removeEventListener('change',onViewport);document.removeEventListener('keydown',closeFiltersOnEscape);disposePreview();host.onclick=null;
 };
}
