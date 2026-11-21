import {catalogGuides,type CatalogGuide} from './catalog-guides';
import {identityNames,languageNames,regionNames,scopeNames,sourceRoles,sourceRoleNames,type CatalogEntry,type PaperRequest,type TopicRequest} from './catalog-identity';
import {catalogSources} from './catalog-sources';
import {mountCatalogBrowser} from './catalog-browser';
import type {PracticeDocument,PracticeQuestion,PracticeKind} from './model';
import {isSiteAudio,questionsOf} from './model';
import type {PaperKind} from './paper';
import type {PracticeExportFormat} from './exports';
import {webDelivery,downloadWebFile,fetchTopicBytes,fetchPaperDocument,siteAudioBase,embedSiteAudio} from './delivery';
import {createIframePaperPager,type PaperPagerOptions} from './paper-pagination';
import styles from './workspace.css?raw';
import themeCSS from './theme.css?raw';
import {mountThemeControl} from './theme';
import {mountSelectControls} from './select';
import {EDITABLE_DELIVERY,ENTRY_PROMPTS,PROJECT_URL} from './entry-prompts';
import {workbenchTasks,type WorkbenchTaskId} from './workbench-tasks';
import {homePaperAsset,homePaperCommand,homePapers} from './home-papers';

type PreviewKind=PaperKind;
let editor:typeof import('./editor-tools');
let editorRequest:Promise<typeof editor>|undefined;
function readyEditor(){
 return editorRequest??=import('./editor-tools').then(module=>editor=module).catch(()=>{editorRequest=undefined;throw Error('试卷工具未能载入，请重试。');});
}
let previewTools:typeof import('./preview-tools');
let previewRequest:Promise<typeof previewTools>|undefined;
function readyPreview(){
 if(previewRequest)return previewRequest;
 for(const href of webDelivery()?.previewPreloads??[]){
  if(document.head.querySelector('link[rel=modulepreload][href='+CSS.escape(href)+']'))continue;
  const link=document.createElement('link');
  link.rel='modulepreload';link.href=href;
  document.head.append(link);
 }
 previewRequest=import('./preview-tools').then(module=>previewTools=module).catch(()=>{previewRequest=undefined;throw Error('卷面排版未能载入，请重试。');});
 return previewRequest;
}
let catalogShelf:CatalogEntry[]|undefined;
let catalogRequest:Promise<void>|undefined;
const readyCatalog=()=>catalogRequest??=import('./catalog-shelf').then(module=>{catalogShelf=module.catalogShelf;}).catch(()=>{catalogRequest=undefined;throw Error('试卷目录未能载入，请重试。');});
async function catalogEntry(id:string){
 await readyCatalog();
 const entry=catalogShelf!.find(item=>item.id===id);
 if(!entry)throw Error('目录中找不到该试卷。');
 return entry;
}
let restoreRequest:Promise<void>|undefined;
const readyWorkspace=()=>restoreRequest??=Promise.all([restore(),readyPreview()]).then(()=>{}).catch(error=>{restoreRequest=undefined;throw error;});

const sheet=document.createElement('style');sheet.textContent=styles+'\n'+themeCSS;document.head.append(sheet);
const escape=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const rich=(text:string)=>text.split(/(\$[^$\n]+\$|\\\([^\n]*?\\\))/g).map(s=>s.startsWith('$')?editor.formulaHTML(s.slice(1,-1),false):s.startsWith('\\(')?editor.formulaHTML(s.slice(2,-2),false):escape(s)).join('');
const names:Record<string,string>={choice:'单项选择',multiple:'多项选择',truefalse:'判断题',blank:'填空题',response:'解答与论述',task:'操作题'};
const kindNames:Record<PracticeKind,string>={notebook:'学习笔记','past-exam':'往年试卷','question-bank':'题库',knowledge:'知识点',reference:'参考资料'};
const difficulties:Record<string,string>={easy:'基础',medium:'进阶',hard:'挑战'};
const symbols={arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/>',download:'<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',book:'<path d="M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3V4Zm9 2v16"/>',copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',settings:'<path d="M3 6h7m4 0h7M3 12h2m4 0h12M3 18h11m4 0h3M10 3v6M5 9v6m9 0v6"/>',check:'<path d="m5 12 4 4L19 6"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',file:'<path d="M5 3h9l5 5v13H5V3Zm9 0v6h5M8 13h8m-8 4h6"/>',external:'<path d="M13 3h8v8m0-8L10 14M10 3H3v18h18v-7"/>'};
const icon=(name:keyof typeof symbols)=>`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${symbols[name]}</svg>`;

let library:PracticeDocument|null=null;
let data:PracticeDocument|null=null,artifact:{html:string;name:string}|null=null;
let view:'start'|'templates'|'preview'|'workflow'='start',paperKind:PreviewKind='exam',manual=false,restored=false,importMode:'open'|'append'='open';
let selected=new Set<string>(),search='',chapter='',questionType='',page=0,materialKind:PracticeKind='reference';
let saveQueue=Promise.resolve(),saveFailed=false;
let requestedSubset=false;
let exportFormat:PracticeExportFormat|'html'|'zip'='pdf';
const root=document.querySelector<HTMLElement>('#practice-app')!;
root.innerHTML=`<a class="skip" href="#main" tabindex="0">跳到内容</a><header class="site-header"><div class="header-inner"><a class="brand" href="#start" aria-label="纸间首页"><svg viewBox="0 0 32 32" width="32" height="32" fill="none" aria-hidden="true"><rect width="32" height="32" rx="9" fill="currentColor"/><path d="M9 9.5h4a3 3 0 0 1 3 3v11a3 3 0 0 0-3-2.5H9zm14 0h-4a3 3 0 0 0-3 3v11a3 3 0 0 1 3-2.5h4zM11.5 13.5h2m-2 3h2m5-3h2m-2 3h2" stroke="var(--on-accent)" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg><span>纸间</span></a><nav aria-label="主导航"><button data-view="start">开始使用</button><button data-view="templates">试卷与版式</button><button data-view="preview">我的试卷</button></nav><div id="theme-control"></div><button id="import-top" class="button secondary">${icon('upload')}<span>导入试卷</span></button></div></header><div id="global-status" role="status" aria-live="polite"></div><main id="main" tabindex="-1"></main><footer class="site-footer"><span>MIT · 免费开源 · 离线使用</span><a class="related-project" href="https://burntroses.github.io/paper-notebook/" target="_blank" rel="noreferrer">Paper Notebook · 孪生项目 ${icon('arrow')}</a><a class="github-star" href="${PROJECT_URL}" target="_blank" rel="noreferrer" aria-label="在 GitHub 为 Paper Notebook Practice 点 Star">GitHub Star ${icon('external')}</a><button id="footer-skill">下载 Skill ${icon('download')}</button></footer><input id="file-input" type="file" multiple hidden accept=".json,.html,.htm,.txt,.md,.markdown,.docx"><dialog id="detail" class="modal"></dialog>`;
mountThemeControl(root.querySelector<HTMLElement>('#theme-control')!);
mountSelectControls(root);
const main=root.querySelector<HTMLElement>('main')!,dialog=root.querySelector<HTMLDialogElement>('dialog')!,fileInput=root.querySelector<HTMLInputElement>('#file-input')!;
root.querySelector<HTMLAnchorElement>('.brand')!.onclick=event=>{event.preventDefault();if(view!=='start')navigate('start');};
root.querySelector('.skip')!.addEventListener('click',event=>{event.preventDefault();main.focus();main.scrollIntoView({block:'start'});});
const status=(message:string,error=false)=>{const el=root.querySelector<HTMLElement>('#global-status')!;el.textContent=message;el.classList.toggle('error',error);};
const documentQuestions=()=>data?questionsOf(data):[];
const bankQuestions=()=>library?questionsOf(library):documentQuestions();
function validateEditable(value:unknown,allowHostedAudio=Boolean(siteAudioBase())){const result=editor.validatePractice(value,undefined,allowHostedAudio);const paper=value as PracticeDocument;if(paper?.mode==='bank'&&paper.totalScore===0&&Array.isArray(paper.sections)&&paper.sections.length===0){const errors=result.errors.filter(error=>error.path!=='/totalScore'&&error.path!=='/sections');return {valid:!errors.length,errors};}return result;}
const safeTitle=(value:string)=>value.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'').slice(0,120)||'试卷';
async function download(name:string,content:string|Uint8Array,mime='application/json'){if(mime.startsWith('text/html')&&typeof content==='string')content=await editor.standalonePaperHTML(content);const url=URL.createObjectURL(new Blob([content as BlobPart],{type:mime}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
const actionResets=new WeakMap<HTMLButtonElement,()=>void>();
async function action(button:HTMLButtonElement,fn:()=>void|Promise<void>,label='已完成',pending?:string){
 if(button.disabled)return;
 actionResets.get(button)?.();
 const original=button.innerHTML;button.disabled=true;button.setAttribute('aria-busy','true');if(pending)button.textContent=pending;
 try{await fn();button.innerHTML=`${icon('check')}<span>${label}</span>`;}
 catch(error){status(error instanceof Error?error.message:String(error),true);button.textContent='重试';}
 finally{
  button.disabled=false;button.removeAttribute('aria-busy');
  const reset=()=>{clearTimeout(timer);actionResets.delete(button);if(button.isConnected)button.innerHTML=original;};
  const timer=setTimeout(reset,2000);actionResets.set(button,reset);
 }
}
async function database(){return new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open('paper-notebook-practice',1);req.onupgradeneeded=()=>req.result.createObjectStore('workspace');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(Error('本机试卷暂时无法读取，请关闭其他纸间页面后重试。'));});}
async function persist(){
 const snapshot=structuredClone({document:data,library,artifact,requestedSubset,paperKind});
 saveQueue=saveQueue.catch(()=>{}).then(async()=>{
  let db:IDBDatabase|undefined;
  try{
   db=await database();const transaction=db.transaction('workspace','readwrite');
   await new Promise<void>((resolve,reject)=>{transaction.oncomplete=()=>resolve();transaction.onabort=()=>reject(transaction.error);transaction.objectStore('workspace').put(snapshot,'current');});
   saveFailed=false;
  }catch{saveFailed=true;status('本机保存不可用，请下载试卷或题库备份。',true);}
  finally{db?.close();}
 });
 await saveQueue;
}
async function restore(){
 let db:IDBDatabase|undefined;
 try{
  await readyEditor();db=await database();const request=db.transaction('workspace').objectStore('workspace').get('current');
  const saved=await new Promise<unknown>((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);}) as {document?:PracticeDocument;data?:PracticeDocument;library?:PracticeDocument;artifact?:typeof artifact;requestedSubset?:boolean;paperKind?:PaperKind}|null;
  if(!saved)return;
  const candidate=saved.document??saved.data;
  if(candidate){
   if(!validateEditable(candidate).valid)throw Error('上次保存的题库格式有误，请打开备份。');
   data=editor.generatedPaper(candidate);
  }
  library=saved.library&&validateEditable(saved.library).valid?saved.library:null;
  artifact=data?null:saved.artifact??null;requestedSubset=saved.requestedSubset===true;
  paperKind=saved.paperKind==='answers'||saved.paperKind==='answer-card'?saved.paperKind:'exam';
 }catch(error){status(error instanceof Error?error.message:'无法恢复本机文件',true);}
 finally{db?.close();restored=true;}
}
let catalogRoute='#templates';
function navigate(next:typeof view){
 const switching=view!==next;
 if(switching&&view==='templates')catalogRoute=location.hash;
 const hash=next==='templates'?catalogRoute:'#'+next;
 if(switching&&location.hash!==hash)history.pushState(null,'',hash);
 view=next;
 if(!root.querySelector('#global-status')?.classList.contains('error'))status('');
 render();
 if(switching)window.scrollTo({top:0,behavior:'instant'});
}
let disposeView=()=>{},disposeSample=()=>{},sampleClosed:(()=>void)|undefined;
dialog.addEventListener('close',()=>{if(!dialog.open){disposeSample();disposeSample=()=>{};const callback=sampleClosed;sampleClosed=undefined;callback?.();}});
function render(){root.dataset.view=view;root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>{b.setAttribute('aria-current',String(b.dataset.view===view));});if(view==='start')renderStart();
 else if(view==='workflow')renderWorkflow();
 else if(view==='templates'&&catalogShelf)renderTemplates(catalogShelf);
 else if(view==='preview'&&editor&&previewTools&&restored)renderPreview();
 else {
  disposeView();disposeView=()=>{};main.className='preview-page';
  const target=view,description=target==='templates'?'打开试卷目录':'恢复本机试卷';
  main.innerHTML=`<div class="preview-empty"><p role="status">正在${description}…</p><button class="button secondary" hidden>重新加载页面</button></div>`;
  const loading=main.firstChild,message=main.querySelector<HTMLElement>('[role="status"]')!,reload=main.querySelector('button')!;
  const active=()=>view===target&&main.firstChild===loading;
  const showRetry=(text:string)=>{if(active()){message.textContent=text;reload.hidden=false;}};
  reload.onclick=()=>location.reload();
  const timer=setTimeout(()=>showRetry(`${description}比平时久，可继续等待或重新加载页面。`),10000);
  void (target==='templates'?readyCatalog():readyEditor().then(readyWorkspace)).then(()=>{if(active())render();}).catch(error=>{
   showRetry(error instanceof Error?error.message:`未能${description}，请重新加载页面。`);
  }).finally(()=>clearTimeout(timer));
 }
}
function installSkill(button:HTMLButtonElement){void action(button,async()=>downloadWebFile(webDelivery()?.skillUrl??'./paper-notebook-practice-skill.zip','paper-notebook-practice-skill.zip'),'已开始下载');}
const promptResets=new WeakMap<HTMLButtonElement,()=>void>();
async function copyPrompt(button:HTMLButtonElement,prompt=ENTRY_PROMPTS.agent.instructions){
 if(button.disabled||button.getAttribute('aria-disabled')==='true')return;
 let timer=0;
 const original=document.createElement('span');original.className='copy-label';
 original.append(...button.childNodes);
 const feedback=document.createElement('span');feedback.className='copy-feedback';
 button.classList.add('copy-control');button.append(original,feedback);
 function reset(){
  clearTimeout(timer);promptResets.delete(button);
  button.classList.remove('copy-control');button.replaceChildren(...original.childNodes);button.removeAttribute('aria-disabled');
 }
 promptResets.set(button,reset);button.setAttribute('aria-disabled','true');
 let copied=false;
 try{await navigator.clipboard.writeText(prompt);copied=true;}catch{
  if(promptResets.get(button)!==reset)return;
  const field=document.createElement('textarea');field.value=prompt;field.readOnly=true;field.className='clipboard-buffer';
  (dialog.open?dialog:main).append(field);field.select();try{copied=document.execCommand('copy');}catch{}finally{field.remove();}
  button.focus({preventScroll:true});
 }
 if(promptResets.get(button)!==reset)return;
 original.style.visibility='hidden';feedback.textContent=copied?'已复制':'复制失败，请重试';
 timer=window.setTimeout(reset,1600);
}
function specFor(paper?:PracticeDocument,templateId?:string){try{return editor.inferExamSpecification(paper,templateId);}catch{return undefined;}}
function isCompleteCase(paper:PracticeDocument){const spec=specFor(paper);return Boolean(paper.exam?.scope!=='subset'&&spec&&editor.validateExamStructure(paper,spec,true,Boolean(siteAudioBase())).length===0);}
function examinationPrompt(paper?:PracticeDocument,spec=specFor(paper),subset=false){
 if(!paper&&!spec)return ENTRY_PROMPTS.agent.prompt;
 const lines:string[]=[];
 if(paper){
  lines.push('试卷 · '+[paper.title,paper.subject,paper.level].join(' / '));
  if(paper.style.templateId)lines.push('版式 · '+editor.getPaperTemplate(paper.style.templateId).name);
  if(paper.mode==='bank')lines.push('制作目标 · 整理题库');
 }
 lines.push('范围 · '+(subset||paper?.mode==='bank'?'选编':'完整卷'));
 if(spec)lines.push('考试规格 · '+spec.title);
 if(subset&&paper)lines.push('选定题目编号 · '+questionsOf(paper).map(q=>q.id).join('、'));
 return ENTRY_PROMPTS.agent.prompt+'\n\n已确认的出卷要求\n'+lines.map(line=>'- '+line).join('\n');
}
const paperPages=new Map<string,number>();
let homePaper=homePapers[0],workflowTask:WorkbenchTaskId='author';
const documentCache=new Map<string,Promise<PracticeDocument>>();
let offlineTopicArchive:Uint8Array|undefined;
async function readOfflineTopic(key:string){
 const [tools,{default:archive}]=await Promise.all([readyEditor(),import('practice-offline-topics')]);
 offlineTopicArchive??=Uint8Array.from(atob(archive),character=>character.charCodeAt(0));
 return tools.unzipSync(offlineTopicArchive,{filter:file=>file.name===key})[key];
}
async function readTopicPayload({file,sha256}:TopicRequest):Promise<unknown>{
 const [hosted,{practiceDigest}]=await Promise.all([fetchTopicBytes(file),import('./session')]);
 const bytes=hosted??await readOfflineTopic('skills/paper-notebook-practice/examples/topics/'+file);
 if(!bytes)throw Error('本地资料包缺少这份试卷，请重新下载完整项目。');
 const raw=new TextDecoder().decode(bytes);
 if(practiceDigest(raw)!==sha256)throw Error('试卷与目录版本不一致，请刷新后重试。');
 return JSON.parse(raw);
}
function readPaper(request:PaperRequest){
 const {kind,id}=request,key=kind+':'+id;
 let pending=documentCache.get(key);
 if(!pending){
  pending=(async()=>{
   const [hosted,preview]=await Promise.all([request.kind==='topic'?readTopicPayload(request):fetchPaperDocument(request.kind,id),readyPreview()]);
   if(hosted==null)await readyEditor();
   const entry=(hosted??(kind==='case'?editor.embeddedCase(id):kind==='example'?editor.embeddedTemplate(id):undefined)) as PracticeDocument|undefined;
   if(!entry||!Array.isArray(entry.sections)||!Array.isArray(entry.materials)||kind!=='example'&&entry.practiceId!==id)throw Error('试卷资料格式有误，请重试。');
   return preview.catalogPaper(entry);
  })();
  pending.catch(()=>{if(documentCache.get(key)===pending)documentCache.delete(key);});
 }
 documentCache.delete(key);documentCache.set(key,pending);
 if(documentCache.size>8)documentCache.delete(documentCache.keys().next().value!);
 return pending;
}
function mountPaperPreview(frame:HTMLIFrameElement,controls:HTMLElement,options:PaperPagerOptions={}){
 const pager=createIframePaperPager(frame,controls,{compact:true,fitWidth:true,...options});
 return {setFitWidth:pager.setFitWidth,setPaper:(paper:PracticeDocument,kind:PaperKind='exam',outline=false)=>{
  frame.srcdoc=restrictPreview(previewTools.renderPractice(paper,{kind,outline,screenOnly:true,css:previewTools.previewPaperCSS}));
 },dispose:()=>pager.dispose()};
}
function renderStart(){
 disposeView();
 main.className='start-page home-page';
 main.innerHTML=`<section class="home-library" aria-labelledby="home-library-title">
  <header class="home-library-heading"><h1 id="home-library-title">试卷样例</h1><button id="browse-templates" class="button text">全部试卷 ${icon('arrow')}</button></header>
  <div class="home-papers" role="group" aria-label="选择完整样卷">${homePapers.map(paper=>`<button type="button" data-home-paper="${paper.id}" aria-label="${escape(paper.title)}" aria-pressed="false" aria-controls="home-stage">${escape(paper.label)}<span class="selection-mark">${icon('check')}</span></button>`).join('')}</div>
  <section class="home-copy" aria-labelledby="home-copy-title"><h2 id="home-copy-title">出卷指令</h2>
   <div>${(['agent','chat'] as const).map(mode=>`<button id="copy-${mode}" class="button secondary" aria-live="polite">${icon('copy')}<span>${mode==='agent'?'复制 Agent 指令':'复制对话模型指令'}</span></button>`).join('')}</div>
  </section>
  <button id="open-workflow" class="button text"><span>出卷流程演示</span> ${icon('arrow')}</button>
 </section>
 <section id="home-stage" class="home-stage" aria-label="样卷预览"></section>`;
 main.querySelector<HTMLButtonElement>('#browse-templates')!.onclick=()=>navigate('templates');
 main.querySelector<HTMLButtonElement>('#open-workflow')!.onclick=()=>{navigate('workflow');main.querySelector('h1')?.focus({preventScroll:true});};
 const copyButtons=(['agent','chat'] as const).map(mode=>{
  const button=main.querySelector<HTMLButtonElement>('#copy-'+mode)!;
  button.onclick=()=>void copyPrompt(button,samplePrompt(mode));
  return button;
 });
 const group=main.querySelector('.home-papers')!,buttons=[...group.querySelectorAll<HTMLButtonElement>('button')];
 const host=main.querySelector<HTMLElement>('#home-stage')!;
 let generation=0,disposeStage=()=>{};
 function syncButtons(){
  buttons.forEach(button=>{
   const active=button.dataset.homePaper===homePaper.id;
   button.setAttribute('aria-pressed',String(active));button.tabIndex=active?0:-1;
  });
 }
 async function draw(){
  const paper=homePaper,current=++generation;
  disposeStage();disposeStage=()=>{};syncButtons();copyButtons.forEach(button=>promptResets.get(button)?.());
  host.innerHTML='<p class="demo-status" role="status">正在打开试卷…</p>';
  try{
   const [entry]=await Promise.all([catalogEntry(paper.id),readyPreview()]);
   if(current===generation)disposeStage=mountSample(host,{title:paper.title,request:entry.request,entry,showTitle:false});
  }catch{
   if(current!==generation)return;
   host.innerHTML='<p class="demo-status" role="status">试卷未能载入 <button type="button" class="button secondary">重试</button></p>';
   host.querySelector('button')!.onclick=()=>void draw();
  }
 }
 buttons.forEach((button,index)=>button.onclick=()=>{
  if(homePaper!==homePapers[index]){homePaper=homePapers[index];void draw();}
 });
 syncButtons();segmentedKeys(group);
 void draw();
 disposeView=()=>{generation++;disposeStage();copyButtons.forEach(button=>promptResets.get(button)?.());};
}
function samplePrompt(mode:keyof typeof ENTRY_PROMPTS){
 const reference=homePaperAsset(homePaper),command=mode==='agent'?' 可运行 '+homePaperCommand(homePaper)+' 取得参考作者数据。':'';
 return [
  ENTRY_PROMPTS[mode].instructions,
  '参考仓库里的样卷：'+reference+'。'+command,
  '请结合我附上的资料与要求，自己确定命题和核验步骤，参考样卷的考试规格、题组与版式，制作同类完整试卷。只有我明确要求小练习或选编时才缩减题量。请直接给我题目卷、答案卷和答题卡。',
  EDITABLE_DELIVERY,
 ].join('\n\n');
}
function renderWorkflow(){
 disposeView();
 main.className='workflow-page';
 main.innerHTML=`<header class="workflow-header"><h1 tabindex="-1">出卷流程演示</h1><button type="button" id="workflow-back" class="button text">返回试卷样例</button></header>
  <div class="workflow-workspace">
   <aside class="workflow-rail">
    <h2>制作方式</h2>
    <div class="workflow-choices" role="group" aria-label="制作方式">${Object.entries(workbenchTasks).map(([id,task])=>`<button type="button" data-workflow-task="${id}" aria-controls="workflow-stage">${task.label}<span class="selection-mark">${icon('check')}</span></button>`).join('')}</div>
    <div id="workflow-steps"></div>
   </aside>
   <section id="workflow-stage" class="workbench-demo" aria-label="处理过程"></section>
  </div>`;
 main.querySelector<HTMLButtonElement>('#workflow-back')!.onclick=()=>{
  navigate('start');main.querySelector<HTMLElement>('#open-workflow')?.focus({preventScroll:true});
 };
 const group=main.querySelector('.workflow-choices')!,buttons=[...group.querySelectorAll<HTMLButtonElement>('button')];
 const controls=main.querySelector<HTMLElement>('#workflow-steps')!,host=main.querySelector<HTMLElement>('#workflow-stage')!;
 let generation=0,disposeStage=()=>{};
 function sync(){
  buttons.forEach(button=>{
   const active=button.dataset.workflowTask===workflowTask;
   button.setAttribute('aria-pressed',String(active));button.tabIndex=active?0:-1;
  });
 }
 async function draw(){
  const current=++generation;
  disposeStage();disposeStage=()=>{};sync();controls.replaceChildren();
  host.innerHTML='<p class="demo-status" role="status">正在载入示例…</p>';
  try{
   const {mountWorkbenchDemo}=await import('./workbench-demo');
   if(current!==generation)return;
   disposeStage=mountWorkbenchDemo(host,controls,workflowTask,{
    load:async id=>{
     const entry=await catalogEntry(id);
     if(entry.request.kind==='template')throw Error('此示例需要试卷数据。');
     return readPaper(entry.request);
    },
    markup:text=>previewTools.paperText(text),
    open:(id,button)=>{
     void catalogEntry(id).then(entry=>{if(current===generation)showSample(entry.title,entry.request,entry,undefined,()=>button.focus({preventScroll:true}));})
      .catch(()=>{if(current===generation)status('试卷未能打开，请重试。',true);});
    },
    download:(button,paper)=>void action(button,()=>downloadPaperBundle(paper),'已下载','正在打包…'),
    downloadSource:(button,paper)=>void action(button,()=>downloadPracticeJSON('practice.json',paper),'已下载'),
    mount:(frame,controls,paper,kind,onError)=>{
     const preview=mountPaperPreview(frame,controls,{onChange:state=>{if(state.status==='error'||state.status==='empty')onError();}});
     try{preview.setPaper(paper,kind);}catch{preview.dispose();queueMicrotask(onError);}
     return preview.dispose;
    },
   });
  }catch{
   if(current!==generation)return;
   host.innerHTML='<p class="demo-status" role="status">示例未能载入 <button type="button" class="button secondary">重试</button></p>';
   host.querySelector('button')!.onclick=()=>void draw();
  }
 }
 buttons.forEach(button=>button.onclick=()=>{
  const next=button.dataset.workflowTask as WorkbenchTaskId;
  if(workflowTask!==next){workflowTask=next;void draw();}
 });
 sync();segmentedKeys(group,true);void draw();
 disposeView=()=>{generation++;disposeStage();};
}

function renderTemplates(shelf:CatalogEntry[]){
 disposeView();
 disposeView=mountCatalogBrowser(main,shelf,{
  mountPreview(host,entry,openRelated){return mountSample(host,{title:entry.title,request:entry.request,entry,openRelated});},
  openPreview(entry,openRelated,onClose){showSample(entry.title,entry.request,entry,openRelated,onClose);},
  closePreview(){if(dialog.open)dialog.close();},
 });
}
type SampleRequest=PaperRequest|{kind:'template';id:string};
const paperKinds=([['exam','题目卷'],['answers','答案卷'],['answer-card','答题卡']] as const);
interface SampleOptions {
 title:string;
 request:SampleRequest;
 entry?:CatalogEntry;
 openRelated?:(id:string)=>void;
 inDialog?:boolean;
 showTitle?:boolean;
}
function mountSample(host:HTMLElement,{title,request,entry,openRelated,inDialog,showTitle=true}:SampleOptions){
 const outline=request.kind==='template';
 let kind:PaperKind='exam',paper:PracticeDocument|undefined,template:ReturnType<typeof editor.getPaperTemplate>|undefined;
 let active=true,disposePaper=()=>{},loadRevision=0;
 const guide:CatalogGuide|undefined=entry&&catalogGuides[entry.category].sample===entry.id?catalogGuides[entry.category]:undefined;
 const catalog=entry?host.closest<HTMLElement>('.catalog-page'):null;
 if(!inDialog)host.replaceChildren();
 host.insertAdjacentHTML('beforeend','<div class="sample-paper-panel catalog-sample">'+
  '<div class="sample-tools">'+(!inDialog&&showTitle?'<h2 class="sample-caption">'+escape(guide?.name??title)+'</h2>':'')+
  (outline?'<span class="sample-outline-label">版式设计稿</span>':
   '<div class="segmented" role="group" aria-label="查看卷面">'+paperKinds.map(([value,label])=>'<button type="button" data-sample-kind="'+value+'" aria-pressed="'+(value==='exam')+'" disabled>'+label+'</button>').join('')+'</div>')+
  '<div class="catalog-preview-actions"><details class="catalog-listening" hidden><summary>听力</summary><div class="catalog-recordings"></div></details>'+
  '<details class="catalog-source"><summary>来源</summary><div id="sample-source"></div></details>'+
  (catalog?'<button type="button" id="paper-fit" aria-pressed="false" hidden>整页</button><button type="button" id="focus-paper" aria-pressed="false">沉浸阅读</button>':'')+
  (outline?(entry?.sampleId&&openRelated?'<button type="button" id="related-sample">对应样卷</button>':'')+
   '<button type="button" id="use-template" class="sample-action" disabled>使用版式</button>':
   '<button type="button" id="open-template-sample" class="sample-action" disabled>'+ (entry?.kind==='bank'?'打开题库':'打开试卷')+'</button>')+
  '</div></div><div class="catalog-frame-stage"><iframe id="template-preview" title="'+escape(title)+'" sandbox="allow-scripts allow-same-origin"></iframe>'+
  '<div class="catalog-preview-status"><p role="status"></p><button type="button" class="button secondary" id="template-retry" hidden>重试</button></div></div>'+
  '<div class="catalog-paper-bottom"><div id="sample-pages"></div></div></div>');
 const frame=host.querySelector<HTMLIFrameElement>('#template-preview')!,controls=host.querySelector<HTMLElement>('#sample-pages')!;
 const focusButton=host.querySelector<HTMLButtonElement>('#focus-paper');
 const fitButton=host.querySelector<HTMLButtonElement>('#paper-fit');
 let fitWidth=true;
 let applyFit=(fit:boolean)=>{fitWidth=fit;};
 if(fitButton)fitButton.onclick=()=>{
  fitWidth=!fitWidth;applyFit(fitWidth);
  fitButton.setAttribute('aria-pressed',String(!fitWidth));
  fitButton.textContent=fitWidth?'整页':'适宽';
 };
 function focusPaper(enabled:boolean){
  catalog?.classList.toggle('catalog-focused',enabled);
  focusButton?.setAttribute('aria-pressed',String(enabled));
  if(focusButton)focusButton.textContent=enabled?'退出沉浸':'沉浸阅读';
  if(fitButton){
   fitButton.hidden=!enabled;
   if(!enabled&&!fitWidth){fitWidth=true;applyFit(true);fitButton.textContent='整页';fitButton.setAttribute('aria-pressed','false');}
  }
 }
 const dismissFocus=(event:KeyboardEvent)=>{if(event.key==='Escape'&&catalog?.classList.contains('catalog-focused'))focusPaper(false);};
 if(focusButton){
  focusButton.onclick=()=>focusPaper(focusButton.getAttribute('aria-pressed')!=='true');
  window.addEventListener('keydown',dismissFocus);
  frame.addEventListener('load',()=>frame.contentWindow?.addEventListener('keydown',dismissFocus));
 }
 const feedback=host.querySelector<HTMLElement>('.catalog-preview-status')!,message=feedback.querySelector('p')!;
 const retry=host.querySelector<HTMLButtonElement>('#template-retry')!;
 const buttons=[...host.querySelectorAll<HTMLButtonElement>('[data-sample-kind]')];
 const open=host.querySelector<HTMLButtonElement>('#open-template-sample'),use=host.querySelector<HTMLButtonElement>('#use-template');
 const source=host.querySelector<HTMLDetailsElement>('.catalog-source')!,sources=host.querySelector<HTMLElement>('#sample-source')!;
 const listening=host.querySelector<HTMLDetailsElement>('.catalog-listening')!,recordings=host.querySelector<HTMLElement>('.catalog-recordings')!;
 let audio:HTMLAudioElement|undefined;
 const showMessage=(text:string,canRetry=false)=>{
  message.textContent=text;feedback.hidden=!text;retry.hidden=!canRetry;frame.style.visibility=text?'hidden':'visible';
 };
 function draw(){
  if(!paper)return;
  disposePaper();
  showMessage('正在排版…');
  const key=(entry?.id??request.id)+':'+kind;
  const preview=mountPaperPreview(frame,controls,{fitWidth,initialPage:paperPages.get(key),onChange:state=>{
   if(!active)return;
   if(state.status==='ready'){
    paperPages.set(key,state.page);showMessage('');
   }else if(state.status==='error'||state.status==='empty')showMessage('卷面未能排版。',true);
  }});
  disposePaper=preview.dispose;applyFit=preview.setFitWidth;
  try{preview.setPaper(paper,kind,outline);}catch(error){disposePaper();showMessage(error instanceof Error?error.message:'卷面未能排版。',true);}
  listening.hidden=kind==='answer-card'||!recordings.childElementCount;
  if(listening.hidden&&audio)audio.pause();
 }
 function updateRecordings(){
  const tracks=(paper?.sections??[]).flatMap(section=>section.stimulus?.audio?[section.stimulus.audio]:[]);
  const base=siteAudioBase();
  for(const track of tracks){
   const url=track.dataUrl??(base&&track.url&&isSiteAudio(track)?new URL(track.url,base).href:undefined);
   if(!url)continue;
   const button=document.createElement('button');button.type='button';button.textContent=track.title;
   button.onclick=()=>{
    if(!audio){audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.style.width='100%';recordings.append(audio);}
    audio.setAttribute('aria-label',track.title);
    if(audio.getAttribute('src')!==url)audio.src=url;
    void audio.play().catch(()=>{});
   };
   recordings.append(button);
  }
 }
 let sourceDrawn=false;
 function showSources(){
  if(!source.open||sourceDrawn)return;
  if(!paper){sources.textContent='卷面载入后显示出处。';return;}
  sourceDrawn=true;
  const listed=catalogSources(paper,template);
  if(guide?.reference&&!listed.some(item=>item.role==='benchmark'&&item.url===guide.reference?.url)){
   listed.push({role:'benchmark',...guide.reference});
  }
  const summary=entry?[identityNames[entry.identity],entry.issuer,entry.year,entry.system,regionNames[entry.region],languageNames[entry.language],scopeNames[entry.scope]].filter(Boolean).join(' · '):'';
  sources.innerHTML=(summary?'<p class="catalog-source-identity">'+escape(summary)+'</p>':'')+sourceRoles.map(role=>{
   const group=listed.filter(item=>item.role===role);
   return group.length?'<section><h3>'+sourceRoleNames[role]+'</h3><ul>'+group.map(item=>'<li>'+
    (item.url?'<a href="'+escape(item.url)+'" target="_blank" rel="noopener noreferrer">'+escape(item.title)+' '+icon('external')+'</a>':escape(item.title))+
    (item.issuer||item.note?'<small>'+escape([item.issuer,item.note].filter(Boolean).join(' · '))+'</small>':'')+'</li>').join('')+'</ul></section>':'';
  }).join('')+(listed.length?'':'<p>公开出处未核实</p>');
 }
 source.ontoggle=showSources;
 async function load(){
  const revision=++loadRevision;
  showMessage(outline?'正在打开版式…':'正在打开试卷…');
  const slow=window.setTimeout(()=>{if(active&&revision===loadRevision)showMessage('载入时间较长，可以重试。',true);},8000);
  try{
   if(request.kind==='template'){
    await Promise.all([readyEditor(),readyPreview()]);
    if(!active||revision!==loadRevision)return;
    template=editor.getPaperTemplate(request.id);
    paper=editor.paperDraftDocument(editor.createPaperDraft(request.id));
    if(paper.style.templateId!==request.id)throw Error('版式与目录不一致。');
   }else{
    const loaded=await readPaper(request);
    if(!active||revision!==loadRevision)return;
    if(entry&&entry.documentId!==loaded.practiceId)throw Error('卷面与目录版本不一致。');
    paper=loaded;
   }
   if(!recordings.hasChildNodes())updateRecordings();draw();showSources();
   buttons.forEach(button=>button.disabled=false);
   if(open)open.disabled=false;
   if(use&&template){
    if(!restored)await readyWorkspace();
    if(active&&revision===loadRevision){use.textContent=data?'应用版式':'复制版式指令';use.disabled=false;}
   }
  }catch(error){
   if(active&&revision===loadRevision)showMessage(error instanceof Error?error.message:'卷面未能载入。',true);
  }finally{clearTimeout(slow);}
 }
 retry.onclick=()=>paper?draw():void load();
 buttons.forEach(button=>button.onclick=()=>{
  const next=button.dataset.sampleKind as PaperKind;
  if(next===kind)return;
  kind=next;buttons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));draw();
 });
 const segmented=host.querySelector('.segmented');
 if(segmented)segmentedKeys(segmented);
 host.querySelector('#related-sample')?.addEventListener('click',()=>{if(entry?.sampleId)openRelated?.(entry.sampleId);});
 open?.addEventListener('click',()=>void action(open,async()=>{
  await readyEditor();await readyWorkspace();
  if(!active||!paper)return;
  data=structuredClone(paper);library=null;artifact=null;
  requestedSubset=entry?entry.scope==='subset':data.exam?.scope==='subset';paperKind=kind;
  if(inDialog)dialog.close();
  void persist();navigate('preview');
 },'已打开','正在打开…'));
 use?.addEventListener('click',()=>{
  if(!data&&restored&&template){
   void copyPrompt(use,[ENTRY_PROMPTS.agent.instructions,'请参考仓库内置版式「'+template.name+'」（'+template.id+'），按我附上的资料完成试卷。',EDITABLE_DELIVERY].join('\n\n'));return;
  }
  void action(use,async()=>{
  await readyEditor();await readyWorkspace();
  if(!active)return;
  if(!data)return;
  data=editor.applyPaperTemplate(data,request.id);artifact=null;void persist();
  },'已应用');
 });
 void load();
 return ()=>{
  active=false;window.removeEventListener('keydown',dismissFocus);focusPaper(false);disposePaper();frame.removeAttribute('srcdoc');
  if(audio){audio.pause();audio.removeAttribute('src');audio.load();}
 };
}
function showSample(title:string,request:SampleRequest,entry?:CatalogEntry,openRelated?:(id:string)=>void,onClose?:()=>void){
 openDialog(escape(title),'<section class="sample-dialog-host"></section>');
 dialog.classList.add('sample-preview-dialog');
 sampleClosed=onClose;
 disposeSample=mountSample(dialog.querySelector<HTMLElement>('.sample-dialog-host')!,{title,request,entry,openRelated,inDialog:true});
}
function openDialog(title:string,body:string,footer=''){sampleClosed=undefined;disposeSample();disposeSample=()=>{};dialog.classList.remove('sample-preview-dialog','wide');dialog.setAttribute('aria-labelledby','dialog-title');dialog.innerHTML=`<div class="modal-header"><h2 id="dialog-title">${title}</h2><button class="icon-button" id="close-dialog" aria-label="关闭">${icon('close')}</button></div><div class="modal-body">${body}</div>${footer?`<div class="modal-footer">${footer}</div>`:''}`;dialog.querySelector('#close-dialog')!.addEventListener('click',()=>dialog.close());if(!dialog.open)dialog.showModal();}
function restrictPreview(html:string){
 const fontOrigin=/^https?:$/.test(location.protocol)?location.origin:'';
 return html.replace('<head>',`<head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; font-src data: blob: ${fontOrigin}; style-src 'unsafe-inline'; script-src 'unsafe-inline'; media-src data: blob:; connect-src 'none'">`);
}
function previewHTML(html:string){
 const doc=new DOMParser().parseFromString(html,'text/html');
 const payload=doc.querySelector('#practice-data');if(payload){try{const value=JSON.parse(payload.textContent||'');value.preview=true;payload.textContent=JSON.stringify(value).replace(/</g,'\\u003c');doc.body.dataset.preview='true';doc.body.classList.add('print-preview');}catch{}}
 const policy=doc.createElement('meta');policy.httpEquiv='Content-Security-Policy';policy.content=`default-src 'none'; img-src data: blob:; font-src data: blob: ${location.origin}; style-src 'unsafe-inline'; script-src 'unsafe-inline' blob:; worker-src blob:; media-src data: blob:; connect-src 'none'`;doc.head.prepend(policy);
 return '<!doctype html>'+doc.documentElement.outerHTML;
}
function renderPreview(){
 disposeView();disposeView=()=>{};
 main.className='preview-page';
 if(!data&&!artifact){main.innerHTML=`<div class="preview-empty"><span class="empty-icon">${icon('file')}</span><h1>我的试卷</h1><div class="hero-actions"><button id="open-delivery" class="button primary">${icon('upload')}打开试卷</button><button id="load-sample" class="button secondary">查看样卷</button></div><button id="empty-agent" class="button text">开始制作试卷 ${icon('arrow')}</button></div>`;main.querySelector('#open-delivery')!.addEventListener('click',openFileDialog);main.querySelector<HTMLButtonElement>('#load-sample')!.onclick=()=>navigate('templates');main.querySelector<HTMLButtonElement>('#empty-agent')!.onclick=()=>{navigate('start');};return;}
 const title=data?.title??artifact!.name;
 main.innerHTML=`<div class="preview-heading"><div><h1>${escape(title)}</h1></div><div class="preview-actions">${data?`<button id="toggle-manual" class="button secondary" aria-expanded="${manual}">${icon('settings')}版式调整</button>`:''}${data?`<select id="export-format" aria-label="导出格式">${[['pdf','PDF'],['docx','Word .docx'],['png','PNG 图片'],['html','离线 HTML'],['zip','整套 HTML + 题库']].map(([value,label])=>`<option value="${value}" ${exportFormat===value?'selected':''}>${label}</option>`).join('')}</select>`:''}<button id="export-package" class="button primary">${icon('download')}导出${data?'试卷':'文件'}</button></div></div><div class="preview-controls"><div class="segmented" role="group" aria-label="预览文件">${data?([['exam','题目卷'] as const,['answers','答案卷'] as const,['answer-card','答题卡'] as const]).map(([kind,name])=>`<button data-kind="${kind}" aria-pressed="${paperKind===kind}">${name}</button>`).join(''):'<span class="artifact-label">HTML 试卷</span>'}</div><div class="preview-tools">${data?`<div id="print-color" class="inline-options" role="group" aria-label="打印颜色">${([['color','彩色'],['grayscale','黑白']] as const).map(([value,label])=>`<button type="button" data-print-color="${value}" aria-pressed="${(data!.presentation?.printColor??'color')===value}">${label}</button>`).join('')}</div>`:''}${artifact?'':`<button id="open-paper" class="icon-button" aria-label="单独打开试卷" title="单独打开试卷">${icon('external')}</button>`}<button id="download-paper" class="icon-button" aria-label="下载当前预览" title="下载当前预览">${icon('download')}</button></div></div><div class="preview-layout ${manual&&data?'has-inspector':''}"><div class="paper-stage"><iframe id="paper-preview" title="试卷成品预览" sandbox="allow-scripts allow-downloads allow-modals${data&&!artifact&&documentQuestions().length?' allow-same-origin':''}"></iframe></div>${manual&&data?inspectorMarkup():''}</div><p id="preview-error" class="inline-error" role="alert"></p>`;
 redrawWorkspacePaper();
 main.querySelectorAll<HTMLButtonElement>('[data-kind]').forEach(button=>button.onclick=()=>{
  if(paperKind===button.dataset.kind)return;
  paperKind=button.dataset.kind as PreviewKind;void persist();
  main.querySelectorAll<HTMLButtonElement>('[data-kind]').forEach(tab=>{const active=tab===button;tab.setAttribute('aria-pressed',String(active));tab.tabIndex=active?0:-1;});
  redrawWorkspacePaper();
 });
 segmentedKeys(main.querySelector('.segmented')!);
 main.querySelector('#toggle-manual')?.addEventListener('click',()=>{manual=!manual;renderPreview();main.querySelector<HTMLElement>('#toggle-manual')?.focus({preventScroll:true});});
 main.querySelector<HTMLSelectElement>('#export-format')?.addEventListener('change',event=>exportFormat=(event.target as HTMLSelectElement).value as typeof exportFormat);
 const printColors=[...main.querySelectorAll<HTMLButtonElement>('[data-print-color]')];
 printColors.forEach(button=>button.onclick=()=>{
  if(!data||button.getAttribute('aria-pressed')==='true')return;
  const before=structuredClone(data);
  try{
   data.presentation??={};
   data.presentation.printColor=button.dataset.printColor==='grayscale'?'grayscale':'color';
   editor.renderPractice(data,{kind:paperKind,screenOnly:true});
   printColors.forEach(option=>option.setAttribute('aria-pressed',String(option===button)));
   artifact=null;void persist();redrawWorkspacePaper();
  }catch(error){data=before;main.querySelector('#preview-error')!.textContent=error instanceof Error?error.message:String(error);}
 });
 main.querySelector<HTMLButtonElement>('#export-package')!.onclick=function(){const button=this as HTMLButtonElement;void action(button,async()=>{if(!data||exportFormat==='html'){await downloadCurrent();return;}if(exportFormat==='zip'){await exportPackage();return;}if(!documentQuestions().length)throw Error('题库中还没有题目，请先添加题目。');const paper=data,format=exportFormat,kind=paperKind;button.textContent='正在准备导出…';const {exportPracticeFiles}=await import('./exports');const result=await exportPracticeFiles(paper,{format,kind,css:editor.paperCSS,onProgress:message=>{button.textContent=message;}});await download(result.name,result.bytes,result.mime);},'已下载','正在准备导出…');};main.querySelector('#download-paper')!.addEventListener('click',event=>{void action(event.currentTarget as HTMLButtonElement,downloadCurrent,'已下载');});main.querySelector('#open-paper')?.addEventListener('click',()=>{const html=selectedHTML();const url=URL.createObjectURL(new Blob([html],{type:'text/html'}));window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000);});
 if(manual&&data)bindInspector();
}
function redrawWorkspacePaper(){
 disposeView();disposeView=()=>{};
 const previous=main.querySelector<HTMLIFrameElement>('#paper-preview')!;
 const frame=previous.cloneNode() as HTMLIFrameElement;
 frame.removeAttribute('srcdoc');previous.replaceWith(frame);
 main.querySelector('#preview-error')!.textContent='';
 try{
  if(artifact)frame.srcdoc=previewHTML(artifact.html);
  else if(data&&documentQuestions().length){
   const controls=frame.parentElement!.querySelector<HTMLElement>('.paper-pager')??document.createElement('div');
   if(!controls.isConnected)frame.after(controls);
   const key=data.practiceId+':'+paperKind;
   const preview=mountPaperPreview(frame,controls,{initialPage:paperPages.get(key),onChange:state=>{if(state.status==='ready')paperPages.set(key,state.page);}});
   disposeView=preview.dispose;preview.setPaper(data,paperKind);
  }else {frame.parentElement!.querySelector('.paper-pager')?.remove();frame.srcdoc='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><body style="font:15px/1.8 system-ui;text-align:center;padding:100px 24px">题库暂无题目</body></html>';}
 }catch(error){disposeView();main.querySelector('#preview-error')!.textContent=error instanceof Error?error.message:String(error);}
}

function segmentedKeys(group:Element,vertical=false){
 const buttons=[...group.querySelectorAll<HTMLButtonElement>('button')];
 buttons.forEach(button=>button.tabIndex=button.getAttribute('aria-pressed')==='true'?0:-1);
 group.addEventListener('keydown',event=>{
  const key=event as KeyboardEvent;
  const forward=key.key==='ArrowRight'||vertical&&key.key==='ArrowDown',backward=key.key==='ArrowLeft'||vertical&&key.key==='ArrowUp';
  if(key.isComposing||key.altKey||key.metaKey||key.ctrlKey||!buttons.length||!(forward||backward||['Home','End'].includes(key.key)))return;
  key.preventDefault();
  const at=buttons.indexOf(document.activeElement as HTMLButtonElement);
  const index=key.key==='Home'?0:key.key==='End'?buttons.length-1:(at+(forward?1:-1)+buttons.length)%buttons.length;
  buttons[index].click();
  (buttons[index].isConnected?buttons[index]:main.querySelectorAll<HTMLButtonElement>('.segmented button')[index])?.focus();
 });
}
function inspectorMarkup(){let layout;try{layout=editor.resolvePaperTemplate(data!.style).layout;}catch{layout=editor.getPaperTemplate().layout;}return `<aside class="inspector" aria-label="人工调整"><div class="inspector-heading"><h2>版式调整</h2></div><div class="field"><label for="paper-title">试卷名称</label><input id="paper-title" value="${escape(data!.title)}"></div><div class="fields-two"><div class="field"><label for="paper-subject">科目</label><input id="paper-subject" value="${escape(data!.subject)}"></div><div class="field"><label for="paper-level">层级</label><input id="paper-level" value="${escape(data!.level)}"></div></div><div class="field"><label for="paper-duration">考试时间 / 分钟</label><input id="paper-duration" type="number" min="1" max="1440" value="${data!.durationMinutes}"></div><div class="field"><label for="paper-template">试卷模板</label><select id="paper-template"><option value="">标准试卷</option>${editor.PAPER_TEMPLATES.filter(t=>t.id!=='standard').map(t=>`<option value="${escape(t.id)}" ${data!.style.templateId===t.id?'selected':''}>${escape(t.name)}</option>`).join('')}</select></div><button id="select-questions" class="inspector-action">选择题目 <span>${documentQuestions().length} / ${bankQuestions().length} ${icon('arrow')}</span></button><button id="source-materials" class="inspector-action">查看资料与出处 <span>${data!.materials.length} ${icon('arrow')}</span></button><details class="advanced-settings"><summary>排版与组卷</summary><div class="fields-two"><div class="field"><label for="paper-font">字号 / pt</label><input id="paper-font" type="number" min="9" max="20" step="0.5" value="${layout.fontSize}"></div><div class="field"><label for="paper-leading">行距</label><input id="paper-leading" type="number" min="1.2" max="2.2" step="0.1" value="${layout.lineHeight}"></div></div><label class="checkbox-label"><input id="paper-project-mark" type="checkbox" ${data!.presentation?.projectMark!==false?'checked':''}> GitHub 项目标志与链接</label><label class="checkbox-label"><input id="paper-sealed" type="checkbox" ${layout.showSeal?'checked':''}> 密封线</label><div class="divider"></div><div class="field"><label for="compose-count">抽取题数</label><input id="compose-count" type="number" min="1" max="${bankQuestions().length}" value="${documentQuestions().length}"></div><div class="field"><label for="compose-score">目标分数 / 0 为不限</label><input id="compose-score" type="number" min="0" value="0"></div><div class="field"><label for="compose-seed">组卷种子</label><input id="compose-seed" value="paper-1"></div><button id="compose-subset" class="button secondary">生成模拟卷</button></details><p id="inspector-error" class="inline-error" role="alert"></p><div class="inspector-bottom"><button id="export-json" class="button text">保存可编辑文件 ${icon('download')}</button>${library?`<button id="export-bank" class="button text">保存全量题库 ${icon('download')}</button>`:''}<button id="new-bank" class="button text">新建题库</button></div></aside>`;}
function bindInspector(){
 main.querySelector<HTMLInputElement>('#paper-project-mark')!.addEventListener('change',event=>{data!.presentation??={};data!.presentation.projectMark=(event.target as HTMLInputElement).checked;artifact=null;void persist();redrawWorkspacePaper();});
 const change=(id:string,fn:(value:string)=>void)=>main.querySelector('#'+id)!.addEventListener('change',e=>{const before=structuredClone(data);try{fn((e.target as HTMLInputElement).value);data=editor.refreshPracticeMetadata(data!,before!);const check=validateEditable(data);if(!check.valid)throw Error(check.errors.map(e=>`${e.path}：${e.message}`).join('\n'));artifact=null;void persist();main.querySelector('.preview-heading h1')!.textContent=data!.title;
 redrawWorkspacePaper();main.querySelector('#inspector-error')!.textContent='';}catch(error){data=before;main.querySelector('#inspector-error')!.textContent=error instanceof Error?error.message:String(error);}});
 change('paper-title',value=>{data!.title=value;if(data!.presentation)data!.presentation.titleLines=[value];});change('paper-subject',value=>data!.subject=value);change('paper-level',value=>data!.level=value);change('paper-duration',value=>data!.durationMinutes=Number(value));change('paper-font',value=>{data!.style.fontSize=Number(value);if(data!.style.templateOverrides)delete data!.style.templateOverrides.fontSize;});change('paper-leading',value=>{data!.style.lineHeight=Number(value);if(data!.style.templateOverrides)delete data!.style.templateOverrides.lineHeight;});change('paper-template',value=>{if(value)data=editor.applyPaperTemplate(data!,value);else delete data!.style.templateId;
 const layout=editor.resolvePaperTemplate(data!.style).layout;
 (main.querySelector('#paper-font') as HTMLInputElement).value=String(layout.fontSize);
 (main.querySelector('#paper-leading') as HTMLInputElement).value=String(layout.lineHeight);
 (main.querySelector('#paper-sealed') as HTMLInputElement).checked=layout.showSeal;
 });
 main.querySelector('#paper-sealed')!.addEventListener('change',e=>{data!.style.sealed=(e.target as HTMLInputElement).checked;delete data!.original;if(data!.style.templateOverrides)delete data!.style.templateOverrides.showSeal;void persist();redrawWorkspacePaper();});
 main.querySelector('#select-questions')!.addEventListener('click',()=>showQuestionBank());main.querySelector('#source-materials')!.addEventListener('click',showMaterials);main.querySelector('#export-json')!.addEventListener('click',event=>{void action(event.currentTarget as HTMLButtonElement,()=>downloadPracticeJSON('practice.json',data!),'已下载');});main.querySelector('#new-bank')!.addEventListener('click',event=>{void action(event.currentTarget as HTMLButtonElement,newBank,'已创建');});main.querySelector('#export-bank')?.addEventListener('click',event=>{void action(event.currentTarget as HTMLButtonElement,()=>downloadPracticeJSON('question-bank.json',library!),'已下载');});
 main.querySelector('#compose-subset')!.addEventListener('click',()=>{try{const count=Number(main.querySelector<HTMLInputElement>('#compose-count')!.value),score=Number(main.querySelector<HTMLInputElement>('#compose-score')!.value),seed=main.querySelector<HTMLInputElement>('#compose-seed')!.value;if(!library)library=structuredClone(data);const next=editor.assembleMock(bankQuestions(),{title:data!.title,subject:data!.subject,level:data!.level,durationMinutes:data!.durationMinutes,materials:data!.materials,sourceDocument:library??data!,sourceSections:(library??data)!.sections,presentation:data!.presentation,balanceChoices:false,count,targetScore:score||undefined,seed,notebookId:data!.notebookId,notebookRevision:data!.notebookRevision,style:data!.style});data=next;requestedSubset=true;void persist();renderPreview();status('模拟卷已生成，全量题库已保留，可重新选题或保存。');}catch(e){main.querySelector('#inspector-error')!.textContent=e instanceof Error?e.message:String(e);}});
}
function selectedHTML(){if(!data)throw Error('尚未打开试卷');return editor.renderPractice(data,{kind:paperKind,css:editor.paperCSS,audioBaseUrl:siteAudioBase()});}
async function downloadPracticeJSON(name:string,paper:PracticeDocument){
 await download(name,JSON.stringify(await embedSiteAudio(paper),null,2));
}
async function downloadCurrent(){if(data&&!documentQuestions().length)throw Error('题库中还没有题目，请先添加题目。');if(artifact){await download(artifact.name,artifact.html,'text/html');return;}if(!data)throw Error('尚未打开试卷。');const paper=data,kind=paperKind,portable=kind==='answer-card'?paper:await embedSiteAudio(paper);await download(`《${safeTitle(paper.title)}》-${kind==='exam'?'试卷':kind==='answers'?'答案卷':'答题卡'}.html`,editor.renderPractice(portable,{kind,css:editor.paperCSS}),'text/html');}
async function exportPackage(){
 if(artifact){await downloadCurrent();return;}
 if(data)await downloadPaperBundle(data);
}
async function downloadPaperBundle(paper:PracticeDocument){
 await readyEditor();
 const portable=await embedSiteAudio(paper),check=editor.validatePractice(portable);
 if(!check.valid)throw Error(check.errors.map(error=>error.path+'：'+error.message).join('\n'));
 const generated=editor.generatedPaper(portable),title='《'+safeTitle(paper.title)+'》';
 const files:Record<string,Uint8Array>={'practice.json':editor.strToU8(JSON.stringify(generated,null,2))};
 for(const [kind,label] of paperKinds){
  const filename=kind==='exam'?'试卷':label;
  const html=editor.renderPractice(generated,{kind,css:editor.paperCSS});
  files[title+'-'+filename+'.html']=editor.strToU8(await editor.standalonePaperHTML(html));
 }
 await download(title+'-试卷包.zip',editor.zipSync(files),'application/zip');
}
function bankWith(questions:PracticeQuestion[],base:PracticeDocument=data??structuredClone(editor.sample) as PracticeDocument,extraSections:PracticeDocument['sections']=[]):PracticeDocument{
 const remaining=new Map(questions.map(q=>[q.id,structuredClone(q)]));
 const idsInUse=new Set([...questions.map(question=>question.id),...base.materials.map(material=>material.id),base.practiceId,base.notebookId]);
 const uniqueSection=(preferred:string)=>{let id=preferred,index=2;while(idsInUse.has(id))id=preferred+'-'+index++;idsInUse.add(id);return id;};
 const sections=[...base.sections,...extraSections].flatMap(section=>{
  const group=section.questions.flatMap(q=>{const next=remaining.get(q.id);remaining.delete(q.id);return next?[next]:[];});
  return group.length?[{...structuredClone(section),id:uniqueSection(section.id),questions:group}]:[];
 });
 for(const type of Object.keys(names)){const incoming=[...remaining.values()].filter(q=>q.type===type);if(incoming.length)sections.push({id:uniqueSection('section-'+type),title:names[type],instructions:type==='choice'?'每题只有一个正确选项。':type==='multiple'?'选择全部正确选项。':'按题面要求作答。',score:0,questions:incoming});}
 let number=0;for(const section of sections){section.score=section.questions.reduce((s,q)=>s+q.score,0);section.questions=section.questions.map(q=>({...q,number:++number}));}
 const next:PracticeDocument={...structuredClone(base),mode:'bank',totalScore:questions.reduce((s,q)=>s+q.score,0),sections};
 const ids=new Set(questions.map(q=>q.id));if(next.review)next.review=Object.fromEntries(Object.entries(next.review).filter(([id])=>ids.has(id)));if(next.userState){next.userState.practiceAnswers=Object.fromEntries(Object.entries(next.userState.practiceAnswers).filter(([id])=>ids.has(id)));next.userState.practiceMistakes=next.userState.practiceMistakes.filter(id=>ids.has(id));}if(next.assembly)next.assembly.sourceQuestionIds=sections.flatMap(s=>s.questions.map(q=>q.id));return editor.refreshPracticeMetadata(next,base);
}
function showQuestionBank(){if(!data)return;if(!library)library=structuredClone(data);selected=new Set(documentQuestions().map(q=>q.id));search='';chapter='';questionType='';page=0;openDialog('选择题目','',`<span id="selection-count" class="selection-count"></span><button id="apply-selection" class="button primary">应用选题</button>`);dialog.classList.add('wide');drawQuestionList();dialog.querySelector('#apply-selection')!.addEventListener('click',()=>{if(!selected.size){status('至少选择一道题目。',true);return;}const snapshot=structuredClone(data);data={...bankWith(bankQuestions().filter(q=>selected.has(q.id)),library!),title:data!.title,subject:data!.subject,level:data!.level,durationMinutes:data!.durationMinutes,style:structuredClone(data!.style)};data=editor.refreshPracticeMetadata(data,snapshot!);const check=editor.validatePractice(data,undefined,Boolean(siteAudioBase()));if(!check.valid){data=snapshot;status(check.errors.map(e=>e.message).join('\n'),true);return;}artifact=null;requestedSubset=!isCompleteCase(data!);void persist();dialog.close();renderPreview();});}
function drawQuestionList(){if(!data)return;const all=bankQuestions().filter(q=>(!search||`${q.prompt} ${q.chapter} ${(q.tags??[]).join(' ')}`.toLowerCase().includes(search.toLowerCase()))&&(!chapter||q.chapter===chapter)&&(!questionType||q.type===questionType));page=Math.min(page,Math.max(0,Math.ceil(all.length/15)-1));const body=dialog.querySelector<HTMLElement>('.modal-body')!;
 body.innerHTML=`<div class="question-toolbar"><input id="search" type="search" aria-label="搜索题目" placeholder="搜索题干、知识点…" value="${escape(search)}"><select id="chapter" aria-label="章节筛选"><option value="">全部章节</option>${[...new Set(bankQuestions().map(q=>q.chapter))].map(ch=>`<option ${chapter===ch?'selected':''}>${escape(ch)}</option>`).join('')}</select><select id="type" aria-label="题型筛选"><option value="">全部题型</option>${Object.entries(names).map(([v,n])=>`<option value="${v}" ${questionType===v?'selected':''}>${n}</option>`).join('')}</select></div><div class="list-toolbar"><span>${all.length} 道题目</span><div><button id="select-all" class="button text small">选择筛选结果</button><button id="clear-selected" class="button text small">清空选择</button><button id="add-question" class="button text small">添加题目</button></div></div><div class="question-list">${all.slice(page*15,page*15+15).map(q=>`<article class="question-row"><input type="checkbox" data-select="${escape(q.id)}" aria-label="选择第 ${q.number} 题" ${selected.has(q.id)?'checked':''}><span class="question-number">${q.number}</span><div><button data-question="${escape(q.id)}" class="question-title">${rich(q.prompt)}</button><p>${escape(q.chapter)} · ${names[q.type]} · ${q.score} 分 · ${difficulties[q.difficulty??'medium']}</p></div><button class="button text small edit-question" data-edit="${escape(q.id)}">编辑</button></article>`).join('')||'<p class="empty-list">没有匹配的题目。</p>'}</div><div class="pagination"><span>${page+1} / ${Math.max(1,Math.ceil(all.length/15))}</span><div><button id="prev-page" class="button text small" ${page?'':'disabled'}>上一页</button><button id="next-page" class="button text small" ${(page+1)*15<all.length?'':'disabled'}>下一页</button></div></div>`;
 dialog.querySelector('#selection-count')!.textContent=`已选 ${selected.size} / ${bankQuestions().length} 题`;
 const bind=(id:string,set:(v:string)=>void,event='change')=>body.querySelector('#'+id)!.addEventListener(event,e=>{const input=e.target as HTMLInputElement;const position=input.selectionStart;set(input.value);page=0;drawQuestionList();if(id==='search'){const next=body.querySelector<HTMLInputElement>('#search')!;next.focus();try{next.setSelectionRange(position,position);}catch{}}});bind('search',v=>search=v,'input');bind('chapter',v=>chapter=v);bind('type',v=>questionType=v);
 body.querySelectorAll<HTMLInputElement>('[data-select]').forEach(input=>input.onchange=()=>{if(input.checked)selected.add(input.dataset.select!);else selected.delete(input.dataset.select!);dialog.querySelector('#selection-count')!.textContent=`已选 ${selected.size} / ${bankQuestions().length} 题`;});body.querySelector('#select-all')!.addEventListener('click',()=>{all.forEach(q=>selected.add(q.id));drawQuestionList();});body.querySelector('#clear-selected')!.addEventListener('click',()=>{selected.clear();drawQuestionList();});body.querySelector('#prev-page')!.addEventListener('click',()=>{page--;drawQuestionList();});body.querySelector('#next-page')!.addEventListener('click',()=>{page++;drawQuestionList();});body.querySelectorAll<HTMLButtonElement>('[data-question],[data-edit]').forEach(b=>b.onclick=()=>editQuestion(bankQuestions().find(q=>q.id===(b.dataset.question??b.dataset.edit))!));body.querySelector('#add-question')!.addEventListener('click',()=>editQuestion());
}
function showMaterials(){if(!data)return;const needsQuestions=!documentQuestions().length;openDialog(needsQuestions?'资料已就绪，准备出卷':'资料与出处',`${needsQuestions?`<div class="material-next-step"><h3>下载资料包，交给你使用的对话工具</h3><p>资料原文与出题指令会打包保存。将资料包和原文件发给智能体或网页对话，按定制需求获得试卷、答案与题库，再打开生成的 HTML 或 JSON。</p><button id="customize-material-task" class="button secondary small">复制 Agent 指令 ${icon('copy')}</button></div>`:''}<div class="material-list">${data.materials.map(m=>`<article class="material-row"><div>${icon('file')}<div><strong>${escape(m.title)}</strong><p>${kindNames[m.kind]} · ${m.text.length.toLocaleString()} 字符</p></div></div><button data-material="${escape(m.id)}" class="button text small">查看原文 ${icon('arrow')}</button></article>`).join('')||'<p class="empty-list">尚无资料。</p>'}</div><div class="material-tools"><select id="material-kind" aria-label="资料类型">${Object.entries(kindNames).map(([v,n])=>`<option value="${v}" ${v===materialKind?'selected':''}>${n}</option>`).join('')}</select><button id="append-material" class="button secondary">添加参考资料</button></div><p class="muted">浏览器提取文件文字，保存原文与出处。题目、答案和考试结构由你使用的智能体或网页对话组织。</p>`,`<button id="export-ai" class="button ${needsQuestions?'primary':'secondary'}">下载出题资料包 ${icon('download')}</button>`);dialog.querySelector<HTMLSelectElement>('#material-kind')!.onchange=e=>materialKind=(e.target as HTMLSelectElement).value as PracticeKind;dialog.querySelector('#append-material')!.addEventListener('click',()=>openFiles('append'));dialog.querySelector<HTMLButtonElement>('#customize-material-task')?.addEventListener('click',event=>void copyPrompt(event.currentTarget as HTMLButtonElement,examinationPrompt(data!)));dialog.querySelectorAll<HTMLButtonElement>('[data-material]').forEach(b=>b.onclick=()=>{const m=data!.materials.find(m=>m.id===b.dataset.material)!;openDialog(escape(m.title),`<pre class="source-text">${escape(m.text)}</pre>`,'<button id="back-materials" class="button secondary">返回资料</button>');dialog.querySelector('#back-materials')!.addEventListener('click',showMaterials);});dialog.querySelector<HTMLButtonElement>('#export-ai')!.onclick=function(){void action(this as HTMLButtonElement,async()=>{const spec=specFor(data!),task=editor.buildGenerationTask(data!.materials,{subject:data!.subject,level:data!.level,count:spec&&!requestedSubset?editor.examQuestionCount(spec):documentQuestions().length,durationMinutes:spec&&!requestedSubset?spec.durationMinutes??data!.durationMinutes:data!.durationMinutes,mode:spec&&!requestedSubset?'mock':data!.mode,notebookId:data!.notebookId,notebookRevision:data!.notebookRevision,instructions:examinationPrompt(data!,spec,requestedSubset)});await download('纸间-出题资料包.zip',editor.zipSync({'agent-task.md':editor.strToU8(task),'practice.schema.json':editor.strToU8(JSON.stringify(editor.schema,null,2)),'practice.json':editor.strToU8(JSON.stringify(await embedSiteAudio(data!),null,2))}),'application/zip');},'已下载');};}

function editQuestion(question?:PracticeQuestion){
 if(!data)return;
 if(!data!.materials.length){status('请先导入一份资料，再为题目选择原文依据。',true);showMaterials();return;}
 const q=question??{id:`q-${Date.now().toString(36)}`,number:Math.max(0,...bankQuestions().map(q=>q.number))+1,type:'response',prompt:'',score:5,solution:'',explanation:'',chapter:'未分类',difficulty:'medium',tags:[],source:{materialId:data!.materials[0].id,blockId:data!.materials[0].blocks?.[0]?.id??data!.materials[0].id,exact:''}} satisfies PracticeQuestion;
 const optionsText=q.options?.map(option=>`[${option.id}] ${option.text.split('\n').join('\n| ')}`).join('\n')??'';
 openDialog(question?`第 ${q.number} 题`:'添加题目',`<div class="fields-two"><div class="field"><label for="q-type">题型</label><select id="q-type">${Object.entries(names).map(([v,n])=>`<option value="${v}" ${q.type===v?'selected':''}>${n}</option>`).join('')}</select></div><div class="field"><label for="q-score">分值</label><input id="q-score" type="number" min="0.5" step="0.5" value="${q.score}"></div></div><div class="field"><label for="q-prompt">题干（公式用 $LaTeX$）</label><textarea id="q-prompt" rows="3">${escape(q.prompt)}</textarea></div><div class="field"><label for="q-options">选项（每项以 [ID] 开头，续行以 | 开头；无 ID 时依次 A、B、C…）</label><textarea id="q-options" rows="4">${escape(optionsText)}</textarea></div><div class="fields-two"><div class="field"><label for="q-chapter">章节</label><input id="q-chapter" value="${escape(q.chapter)}"></div><div class="field"><label for="q-difficulty">难度</label><select id="q-difficulty">${Object.entries(difficulties).map(([v,n])=>`<option value="${v}" ${q.difficulty===v?'selected':''}>${n}</option>`).join('')}</select></div></div><div class="field"><label for="q-tags">知识点（逗号分隔）</label><input id="q-tags" value="${escape((q.tags??[]).join('，'))}"></div><div class="field"><label for="q-solution">答案（多空或多选用 | 分隔，选择题填选项 ID）</label><input id="q-solution" value="${escape(Array.isArray(q.solution)?q.solution.join('|'):q.solution)}"></div><div class="field"><label for="q-explanation">解析 / 参考评分要点</label><textarea id="q-explanation" rows="3">${escape(q.explanation)}</textarea></div><div class="field"><label for="q-material">原文资料</label><select id="q-material">${data!.materials.map(m=>`<option value="${escape(m.id)}" ${q.source.materialId===m.id?'selected':''}>${escape(m.title)}</option>`).join('')}</select></div><div class="field"><label for="q-exact">原文完整摘录（须与资料中的文字一致）</label><textarea id="q-exact" rows="3">${escape(q.source.exact)}</textarea></div><button id="read-material" class="button secondary">查看所选资料原文</button><p id="edit-error" class="inline-error" role="alert"></p>`,`<button id="save-question" class="button primary">保存题目</button>`);
 const val=(id:string)=>(dialog.querySelector('#q-'+id) as HTMLInputElement).value;
 dialog.querySelector('#read-material')!.addEventListener('click',()=>{let box=dialog.querySelector('pre');if(!box){box=document.createElement('pre');box.className='source-text';dialog.querySelector('#read-material')!.after(box);}box.textContent=data!.materials.find(m=>m.id===val('material'))!.text;});
 dialog.querySelector('#save-question')!.addEventListener('click',async()=>{
  try{const m=data!.materials.find(m=>m.id===val('material'))!;const exact=val('exact');const block=m.blocks?.find(b=>b.text.includes(exact));const solution=val('solution');
   const updated:PracticeQuestion={...q,type:val('type') as PracticeQuestion['type'],prompt:val('prompt'),score:Number(val('score')),chapter:val('chapter'),difficulty:val('difficulty') as PracticeQuestion['difficulty'],tags:val('tags').split(/[,，]/).map(t=>t.trim()).filter(Boolean),solution:solution.includes('|')?solution.split('|').map(s=>s.trim()):solution,explanation:val('explanation'),source:{materialId:m.id,blockId:block?.id??m.id,title:block?.title??m.title,page:block?.page,exact}};
   if(['blank','multiple'].includes(updated.type)&&!Array.isArray(updated.solution))updated.solution=[updated.solution];
   if(['choice','multiple','truefalse'].includes(updated.type)){
    const text=val('options');
    if(question&&text===optionsText)updated.options=structuredClone(q.options);
    else{const options:NonNullable<PracticeQuestion['options']>=[];for(const line of text.split('\n')){
     const continuation=line.match(/^\| ?(.*)$/);
     if(continuation){if(!options.length)throw Error('选项续行前需要先填写一项选项。');options[options.length-1].text+='\n'+continuation[1];continue;}
     if(!line.trim())continue;
     const explicit=line.match(/^\[([A-Z][A-Z0-9_]{0,15})\] ?(.*)$/);
     if(line.startsWith('[')&&!explicit)throw Error('选项 ID 请使用 [TRUE]、[A] 等格式，ID 由大写字母、数字或下划线组成。');
     options.push({id:explicit?.[1]??String.fromCharCode(65+options.length),text:explicit?.[2]??line});
    }updated.options=options;}
   }else delete updated.options;
   const questions=documentQuestions().filter(item=>item.id!==q.id);if(!question||documentQuestions().some(item=>item.id===q.id))questions.push(updated);questions.sort((a,b)=>a.number-b.number);const next=bankWith(questions);const result=editor.validatePractice(next,undefined,Boolean(siteAudioBase()));if(!result.valid)throw Error(result.errors.map(e=>`${e.path}：${e.message}`).join('\n'));if(library){library=bankWith([...bankQuestions().filter(item=>item.id!==q.id),updated],library);}data=next;artifact=null;await persist();dialog.close();renderPreview();status('题目已保存。');
  }catch(e){dialog.querySelector('#edit-error')!.textContent=e instanceof Error?e.message:String(e);}
 });
}

function openFiles(mode:'open'|'append'='open',accept=mode==='open'?'.json,.html,.htm':'.docx,.txt,.md,.markdown,.json,.html,.htm'){importMode=mode;fileInput.accept=accept;fileInput.multiple=mode==='append';fileInput.click();}
function openFileDialog(){
 openDialog('打开文件',`<div class="open-file-options"><button id="open-finished-file">${icon('file')}<span><strong>打开试卷或题库</strong><span>纸间 JSON 或 HTML</span></span>${icon('arrow')}</button><button id="open-source-files">${icon('book')}<span><strong>整理出卷资料</strong><span>Word、纯文本、Markdown 或纸间文件</span></span>${icon('arrow')}</button></div>`);
 dialog.querySelector('#open-finished-file')!.addEventListener('click',()=>openFiles('open','.json,.html,.htm'));
 dialog.querySelector('#open-source-files')!.addEventListener('click',()=>openFiles('append','.docx,.txt,.md,.markdown,.json,.html,.htm'));
}
async function importFiles(files:File[]){
 if(!files.length)return;
 const button=root.querySelector<HTMLButtonElement>('#import-top')!,mode=importMode;
 if(button.disabled)return;
 button.disabled=true;button.setAttribute('aria-busy','true');status(`正在读取 ${files.length} 个文件…`);
 let loaded=0,appended=0,materialsAdded=0;const warnings:string[]=[],failures:string[]=[];
 try{
 await readyWorkspace();
 if(mode==='open'&&files.length!==1){status('一次只能打开一份试卷。合并文件请使用「整理出卷资料」。',true);return;}
 for(const file of files){try{
  const extension=file.name.toLowerCase().split('.').pop();
  if(mode==='open'&&(extension==='html'||extension==='htm')){
   const html=await file.text(),parsed=new DOMParser().parseFromString(html,'text/html'),embedded=parsed.querySelector('#practice-data')?.textContent;
   if(!embedded)throw Error('请选择纸间生成的试卷 HTML，或打开可编辑的 practice.json。');
   const object=JSON.parse(embedded),kind=object?.paperKind;
   if(!object||object.draft||object.screenOnly||!['exam','answers','answer-card'].includes(kind))throw Error('该文件不是完整的纸间试卷。');
   for(const key of ['paperKind','paperLayout','paperGeometry','paperLanguage','paperContinuation','preview'])delete object[key];
   const check=editor.validatePractice(object);
   if(check.valid){data=editor.generatedPaper(object);paperKind=kind;artifact=null;}
   else if(object.schemaVersion==='1.0.0'&&parsed.querySelector('meta[name="generator"]')?.getAttribute('content')==='Paper Notebook Practice 2'&&parsed.querySelector('#paper-root')&&Array.isArray(object.sections)&&object.sections.some((section:unknown)=>section&&typeof section==='object'&&'questions' in section&&Array.isArray(section.questions)&&section.questions.some(question=>typeof question?.check==='string'))&&kind!=='answers'){
    data=null;artifact={html,name:file.name};
   }else throw Error(check.errors.slice(0,4).map(error=>error.path+'：'+error.message).join('\n'));
   library=null;requestedSubset=data?.exam?.scope==='subset';loaded++;continue;
  }
  if(extension==='json'){
   const raw=JSON.parse(await file.text());
   if(raw?.kind==='practice-job')throw Error('这是出卷任务。请交给 Agent 完成，再打开生成的 practice.json。');
  }
  const result=await editor.importPracticeFile(file,{kind:materialKind});
  if(result.practice){
   const check=validateEditable(result.practice,false);
   if(!check.valid)throw Error(check.errors.slice(0,4).map(error=>error.path+'：'+error.message).join('\n'));
  }
  if(mode==='open'){
   if(!result.practice)throw Error('请选择可编辑的试卷或题库。学习资料请用「整理出卷资料」。');
   data=editor.generatedPaper(result.practice);paperKind='exam';library=null;artifact=null;requestedSubset=data.exam?.scope==='subset';loaded++;continue;
  }
  if(artifact&&!data)throw Error('当前打开的是只读卷面。请先打开可编辑题库，再追加资料。');
 const token=Array.from(crypto.getRandomValues(new Uint32Array(2)),value=>value.toString(36)).join('-');
 const base=data??{...structuredClone(editor.sample) as PracticeDocument,practiceId:'bank-'+token,notebookId:'source-'+token,title:'我的资料库',subject:result.practice?.subject??'待识别',level:result.practice?.level??'待确认',materials:[],sections:[],totalScore:0,mode:'bank' as const};
  const materialMap=new Map([...(library?.materials??[]),...base.materials].map(material=>[material.id,material]));
  let added=0;
  for(const material of result.practice?.materials??[result.material]){
   const existing=materialMap.get(material.id);
   if(existing&&existing.text!==material.text)throw Error('同一资料编号对应不同内容：'+material.title);
   if(!existing){materialMap.set(material.id,material);added++;}
  }
  const ids=new Set(bankQuestions().map(question=>question.id));
  const incoming=result.questions.filter(question=>{if(ids.has(question.id))return false;ids.add(question.id);return true;});
  if(!added&&!incoming.length){warnings.push(file.name+'：已在题库中。');continue;}
  const materials=[...materialMap.values()],groups=result.practice?.sections??[];
  const next=bankWith([...documentQuestions(),...incoming],{...base,materials},groups);
  const nextLibrary=library?bankWith([...questionsOf(library),...incoming],{...library,materials},groups):null;
  for(const candidate of [next,nextLibrary])if(candidate){
   const check=validateEditable(candidate);if(!check.valid)throw Error(check.errors.slice(0,4).map(error=>error.path+'：'+error.message).join('\n'));
  }
  data=next;library=nextLibrary;materialsAdded+=added;appended+=incoming.length;warnings.push(...result.warnings);
 }catch(error){failures.push(`${file.name}：${error instanceof Error?error.message:String(error)}`);}}
 if(loaded||appended||materialsAdded){
  if(loaded)manual=Boolean(data);
  await persist();if(dialog.open)dialog.close();navigate('preview');
  if(loaded)main.querySelector<HTMLElement>('#toggle-manual,#export-package')?.focus({preventScroll:true});
  if(data&&!documentQuestions().length&&data.materials.length)showMaterials();
 }
 status([loaded?'已打开试卷。':'',materialsAdded?'已添加 '+materialsAdded+' 份资料。':'',appended?'已添加 '+appended+' 道题目。':'',...warnings,...failures,saveFailed?'请下载备份保存。':''].filter(Boolean).join('\n'),failures.length>0||saveFailed);
 }catch(error){status(error instanceof Error?error.message:String(error),true);}
 finally{fileInput.value='';button.disabled=false;button.removeAttribute('aria-busy');}
}
async function newBank(){if(data)await downloadPracticeJSON('纸间-题库备份.json',library??data);library=null;requestedSubset=false;data={...structuredClone(editor.sample) as PracticeDocument,practiceId:'bank-'+Date.now().toString(36),notebookId:'source-'+Date.now().toString(36),title:'我的题库',materials:[],sections:[],totalScore:0,mode:'bank'};artifact=null;void persist();renderPreview();showMaterials();status('新题库已创建。可追加资料，或交给 Agent 读取并组织。');}
root.querySelector<HTMLButtonElement>('#import-top')!.onclick=()=>openFiles();fileInput.onchange=()=>{if(fileInput.files)void importFiles([...fileInput.files]);};root.querySelector<HTMLButtonElement>('#footer-skill')!.onclick=function(){installSkill(this as HTMLButtonElement);};root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.onclick=()=>{const target=b.dataset.view as typeof view;if(target!==view)navigate(target);});
dialog.addEventListener('close',()=>dialog.classList.remove('wide'));
function restoreViewFromURL(){
 let next=location.hash.slice(1).split('?')[0]||'start';
 if(['bank','materials','compose'].includes(next)){next='preview';manual=true;}
 view=next==='templates'||next==='preview'||next==='workflow'?next:'start';
 if(view==='templates')catalogRoute=location.hash;
}
window.addEventListener('hashchange',()=>{restoreViewFromURL();if(dialog.open)dialog.close();render();});
restoreViewFromURL();
render();
