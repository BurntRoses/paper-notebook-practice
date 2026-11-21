import scan from '../../assets/practice-demo/grade6-math-page1.base64?raw';
import scanEvidence from './workbench-scan.json';
import {PRACTICE_TYPE_NAMES,questionsOf,type PracticeDocument,type PracticeQuestion} from './model';
import type {PaperKind} from './paper';
import {workbenchTasks,type WorkbenchTaskId} from './workbench-tasks';

interface DemoOptions {
 load:(id:string)=>Promise<PracticeDocument>;
 mount:(frame:HTMLIFrameElement,controls:HTMLElement,paper:PracticeDocument,kind:PaperKind,onError:()=>void)=>()=>void;
 markup:(text:string)=>string;
 open:(id:string,button:HTMLButtonElement)=>void;
 download:(button:HTMLButtonElement,paper:PracticeDocument)=>void;
 downloadSource:(button:HTMLButtonElement,paper:PracticeDocument)=>void;
}

const sampleKinds=[['exam','题目卷'],['answers','答案卷'],['answer-card','答题卡']] as const;
const points=(value:number)=>value+' 分';
const minutes=(value:number)=>value+' 分钟';
const count=(value:number)=>value+' 题';

function add<K extends keyof HTMLElementTagNameMap>(parent:HTMLElement,tag:K,content?:string){
 const node=document.createElement(tag);
 if(content!==undefined)node.textContent=content;
 parent.append(node);
 return node;
}

function facts(parent:HTMLElement,items:readonly (readonly [string,string])[]){
 const facts=add(parent,'dl');facts.className='demo-facts';
 for(const [label,value] of items){
  const group=add(facts,'div');add(group,'dt',label);add(group,'dd',value);
 }
}

function table(parent:HTMLElement,headers:string[],items:string[][]){
 const wrap=add(parent,'div');wrap.className='demo-table-wrap';
 const grid=add(wrap,'table'),head=grid.createTHead().insertRow();
 for(const label of headers){
  const th=add(head,'th',label);th.scope='col';
 }
 const rows=grid.createTBody();
 for(const item of items){
  const row=rows.insertRow();
  for(const text of item)row.insertCell().textContent=text;
 }
}

function choose(parent:HTMLElement,label:string,options:string[],initial:number,update:(value:number)=>void){
 const control=add(parent,'label');control.className='demo-select';
 add(control,'span',label);
 const select=add(control,'select');select.dataset.nativeSelect='';
 for(const [index,option] of options.entries())add(select,'option',option).value=String(index);
 select.value=String(initial);select.onchange=()=>update(Number(select.value));
}

function details(parent:HTMLElement,label:string,text:string){
 const item=add(parent,'details');add(item,'summary',label);add(item,'p',text);
}

function viewQuestions(parent:HTMLElement,paper:PracticeDocument,questions:PracticeQuestion[],markup:DemoOptions['markup']){
 const firstResponse=questions.findIndex(question=>question.type==='response');
 const index=Math.max(0,firstResponse);
 const panel=document.createElement('section');panel.className='demo-review';
 choose(parent,'核对题目',questions.map(q=>'第 '+q.number+' 题 · '+q.chapter),index,show);
 parent.append(panel);show(index);
 function show(value:number){
  const question=questions[value];panel.replaceChildren();
  facts(panel,[['题号','第 '+question.number+' 题'],['题型',PRACTICE_TYPE_NAMES[question.type]],['分值',points(question.score)]]);
  const prompt=add(panel,'p');prompt.innerHTML=markup(question.prompt);
  if(question.options?.length){
   const choices=add(panel,'ul');
   for(const option of question.options){
    const row=add(choices,'li');add(row,'strong',option.id+'　');const text=add(row,'span');text.innerHTML=markup(option.text);
   }
  }
  add(panel,'h4','参考解答');
  const solution=Array.isArray(question.solution)?question.solution.join('、'):question.solution;
  add(panel,'p',solution);
  if(question.explanation!==solution)add(panel,'p',question.explanation);
  const source=paper.materials.find(material=>material.id===question.source.materialId);
  if(source){add(panel,'h4','题目出处');add(panel,'p',source.title+(question.source.page?' · 第 '+question.source.page+' 页':''));}
  if(question.rubric){
   add(panel,'h4','评分要点');
   const list=add(panel,'ul');
   for(const item of question.rubric.criteria)add(list,'li',item.description+'（'+points(item.points)+'）');
  }
 }
}

function authorStage(parent:HTMLElement,paper:PracticeDocument,phase:number,markup:DemoOptions['markup']){
 if(phase===0){
  add(parent,'h3','出卷要求');
  facts(parent,[['学段',paper.level],['科目',paper.subject],['目标',points(paper.totalScore)],['时长',minutes(paper.durationMinutes)]]);
  add(parent,'p',paper.authoring?.knowledge??'');
  add(parent,'h4','参考依据与阅读材料');
  const standard=paper.materials.find(material=>material.provenance?.sourceType==='official');
  if(standard?.url){
   const link=add(parent,'a',standard.title);link.href=standard.url;link.target='_blank';link.rel='noreferrer';
  }
  for(const item of paper.sections.flatMap(section=>section.stimulus?[section.stimulus]:[])){
   details(parent,item.title??'阅读材料',item.text);
  }
 }else if(phase===1){
  add(parent,'h3','命题蓝图');
  table(parent,['题组','考查能力','题量','分值','预计用时'],paper.sections.map((section,index)=>{
   const blueprint=paper.authoring?.blueprint?.[index];
   return [section.title,blueprint?.ability??'',count(section.questions.length),points(section.score),blueprint?.estimatedMinutes?minutes(blueprint.estimatedMinutes):'—'];
  }));
  facts(parent,[['全卷',count(questionsOf(paper).length)],['满分',points(paper.totalScore)],['时长',minutes(paper.durationMinutes)]]);
 }else{
  add(parent,'h3','逐题核对答案与评分点');
  viewQuestions(parent,paper,questionsOf(paper),markup);
 }
}

function scanImage(parent:HTMLElement){
 const frame=add(parent,'figure');frame.className='demo-scan';
 const image=add(frame,'img');
 image.src='data:image/jpeg;base64,'+scan.trim();
 image.alt='六年级数学综合练习卷第 1 页的扫描示例';
 image.width=scanEvidence.width;image.height=scanEvidence.height;
 return frame;
}

function scanStage(parent:HTMLElement,paper:PracticeDocument,phase:number){
 if(phase===0){
  add(parent,'h3','扫描输入 · 第 1 页');
  facts(parent,[['卷名',paper.title],['输入',scanEvidence.width+' × '+scanEvidence.height+' px'],['识别工具','Apple Vision']]);
  scanImage(parent);
  return;
 }
 const heading=phase===1?'按原页定位识别结果':'核对符号与结构';
 add(parent,'h3',heading);
 const questionByNumber=new Map(questionsOf(paper).map(question=>[question.number,question]));
 if(phase===2){
  table(parent,['原页题号','OCR 原文','核对后的题干','分值'],scanEvidence.lines.map(({question,raw})=>{
   const item=questionByNumber.get(question)!;
   return [String(question),raw,item.prompt,points(item.score)];
  }));
  const part=paper.sections[0];
  facts(parent,[['所属题组',part.title],['题组题量',count(part.questions.length)],['题组分值',points(part.score)]]);
  return;
 }
 const comparison=add(parent,'div');comparison.className='demo-scan-compare';
 const frame=scanImage(comparison),box=add(frame,'span');box.className='demo-scan-box';box.ariaHidden='true';
 const controls=add(comparison,'div');
 const field=document.createElement('section');field.className='demo-review';
 choose(controls,'定位识别行',scanEvidence.lines.map(line=>'第 '+line.question+' 题'),0,show);
 controls.append(field);show(0);
 function show(index:number){
  const line=scanEvidence.lines[index];
  const [x,y,width,height]=line.bounds;
  Object.assign(box.style,{left:x*100+'%',top:y*100+'%',width:width*100+'%',height:height*100+'%'});
  field.replaceChildren();
  facts(field,[['位置','第 1 页'],['识别置信度',Math.round(line.confidence*100)+'%']]);
  add(field,'h4','识别原文');add(field,'p',line.raw);
  add(field,'h4','校对结果');add(field,'p',questionByNumber.get(line.question)!.prompt);
  if(line.note)add(field,'p',line.note);
 }
}

function assembleStage(parent:HTMLElement,paper:PracticeDocument,reserve:PracticeDocument,phase:number,markup:DemoOptions['markup']){
 const selected=questionsOf(paper),extra=questionsOf(reserve);
 if(phase===0){
  add(parent,'h3','本次候选题库');
  facts(parent,[['候选',count(selected.length+extra.length)],['入卷',count(selected.length)],['留在题库',count(extra.length)]]);
  const panel=document.createElement('div');
  choose(parent,'查看候选', ['本次入卷','未入卷'],0,show);
  parent.append(panel);show(0);
  function show(index:number){
   panel.replaceChildren();
   const source=index?reserve:paper;
   add(panel,'p',source.title+(index?' · 本轮未指定这些题号':''));
   table(panel,['原题号','知识点','题型','原分'],(index?extra:selected).map(q=>[String(q.number),q.chapter,PRACTICE_TYPE_NAMES[q.type],points(q.score)]));
  }
 }else if(phase===1){
  add(parent,'h3','按组卷规格分配');
  table(parent,['题组','选题范围','题数','分值'],paper.sections.map(section=>[
   section.title,section.questions[0].number+'–'+section.questions.at(-1)!.number+' 题',
   count(section.questions.length),points(section.score),
  ]));
  facts(parent,[['合计',count(selected.length)],['卷面总分',points(paper.sections.reduce((total,part)=>total+part.score,0))],['时长',minutes(paper.durationMinutes)]]);
 }else{
  add(parent,'h3','题源与答案核对');
  const distinct=new Set(selected.map(q=>q.id)).size;
  facts(parent,[['入卷题号',count(selected.length)],['唯一题目',count(distinct)],['未入卷',count(extra.length)]]);
  viewQuestions(parent,paper,selected,markup);
 }
}

export function mountWorkbenchDemo(host:HTMLElement,taskId:WorkbenchTaskId,options:DemoOptions){
 const task=workbenchTasks[taskId];
 host.innerHTML='<div class="demo-heading"><h2>Agent 制作示例</h2><button type="button" id="demo-play" disabled>播放过程</button></div>'+
  '<div class="demo-steps segmented" role="group" aria-label="演示步骤"></div><div class="demo-stage"><div class="demo-content"></div></div>';
 const play=host.querySelector<HTMLButtonElement>('#demo-play')!;
 const title=host.querySelector('h2')!;
 const stage=host.querySelector<HTMLElement>('.demo-content')!;
 const stepGroup=host.querySelector<HTMLElement>('.demo-steps')!;
 const steps=task.stages.map((label,index)=>{
  const button=add(stepGroup,'button',label);button.type='button';button.onclick=()=>jump(index);return button;
 });
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 let paper:PracticeDocument|undefined,reserve:PracticeDocument|undefined;
 let phase=0,timer=0,playing=false,disposed=false,visible=false,failed=false,kind:PaperKind='exam',disposePaper=()=>{};
 const last=task.stages.length-1;
 function schedule(){
  clearTimeout(timer);
  if(playing&&visible&&!motion.matches&&!document.hidden&&phase<last)timer=window.setTimeout(()=>{phase++;draw();},phase===0?4500:5200);
 }
 function syncControls(){
  steps.forEach((step,index)=>{step.setAttribute('aria-pressed',String(index===phase));step.tabIndex=index===phase?0:-1;});
  play.textContent=motion.matches?'下一步':playing?'暂停':phase===last?'重播':'播放过程';
  play.disabled=!paper;
 }
 function finish(){
  if(!paper)return;
  playing=false;syncControls();
  const subject=add(stage,'div');subject.className='demo-result-tools';
  const products=add(subject,'div');products.className='segmented';products.setAttribute('role','group');products.setAttribute('aria-label','输出文件');
  const output=add(subject,'div');output.className='demo-result-actions';
  if(taskId!=='assemble'){
   const open=add(output,'button','单独查看');open.type='button';open.onclick=()=>options.open(task.exampleId,open);
  }
  const source=add(output,'button','作者文件');source.type='button';source.title='下载 practice.json';
  source.onclick=()=>options.downloadSource(source,paper!);
  const download=add(output,'button','下载试卷包');download.type='button';download.onclick=()=>options.download(download,paper!);
  const layout=add(stage,'div');layout.className='demo-result-layout';
  const pager=add(stage,'div');pager.className='demo-result-pager';
  const modes=sampleKinds.map(([value,label])=>{
   const button=add(products,'button',label);button.type='button';button.onclick=()=>{kind=value;renderPaper();};return button;
  });
  function renderPaper(){
   disposePaper();disposePaper=()=>{};
   modes.forEach((button,index)=>button.setAttribute('aria-pressed',String(sampleKinds[index][0]===kind)));
   const frame=document.createElement('iframe');
   frame.sandbox.value='allow-scripts allow-same-origin';frame.title=paper!.title;
   layout.replaceChildren(frame);
   disposePaper=options.mount(frame,pager,paper!,kind,()=>{
    if(disposed||frame.parentNode!==layout)return;
    disposePaper();disposePaper=()=>{};layout.replaceChildren();pager.replaceChildren();
    const retry=add(layout,'button','重新排版');retry.type='button';retry.onclick=renderPaper;
   });
  }
  renderPaper();
 }
 function draw(){
  disposePaper();disposePaper=()=>{};stage.replaceChildren();
  stage.scrollTop=0;
  stage.dataset.phase=String(phase);
  stage.classList.toggle('demo-result',phase===last&&Boolean(paper));
  syncControls();
  if(!paper){
   const pending=add(stage,'div');pending.className='demo-status';
   add(pending,'p',failed?'未能载入示例素材':'正在打开示例素材…').role='status';
   if(failed){const retry=add(pending,'button','重试');retry.type='button';retry.className='button secondary';retry.onclick=()=>void load();}
   return;
  }
  if(phase===last){finish();return;}
  const surface=add(stage,'section');surface.className='demo-document';
  if(taskId==='author')authorStage(surface,paper,phase,options.markup);
  else if(taskId==='scan')scanStage(surface,paper,phase);
  else assembleStage(surface,paper,reserve!,phase,options.markup);
  schedule();
 }
 function jump(index:number){
  phase=index;playing=false;clearTimeout(timer);draw();
 }
 function pause(){
  playing=false;clearTimeout(timer);syncControls();
 }
 play.onclick=()=>{
  if(playing){pause();return;}
  if(motion.matches){jump((phase+1)%(last+1));return;}
  if(phase===last)phase=0;
  playing=true;draw();
 };
 stage.addEventListener('focusin',event=>{if(playing&&(event.target as HTMLElement).matches('a,button,select,summary'))pause();});
 stepGroup.addEventListener('keydown',event=>{
  if(event.isComposing||event.altKey||event.ctrlKey||event.metaKey||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();
  const next=event.key==='Home'?0:event.key==='End'?last:(phase+(event.key==='ArrowRight'?1:last))%(last+1);
  jump(next);steps[next].focus();
 });
 const motionChanged=()=>{if(motion.matches&&playing)pause();};
 motion.addEventListener('change',motionChanged);
 document.addEventListener('visibilitychange',schedule);
 const observer=new IntersectionObserver(([entry])=>{visible=entry.intersectionRatio>=.35;schedule();},{threshold:.35});
 observer.observe(host.querySelector('.demo-stage')!);
 async function load(){
  failed=false;draw();
  try{
   const [reference,alternatives,assembly]=await Promise.all([
    options.load(task.exampleId),
    task.supplementaryId?options.load(task.supplementaryId):undefined,
    taskId==='assemble'?import('./workbench-assembly'):undefined,
   ]);
   if(!disposed){
    reserve=alternatives;
    paper=assembly&&reserve?assembly.assembleWorkbenchPaper(reference,reserve):reference;
    title.textContent=paper.title+' · 制作示例';
    draw();
   }
  }catch{
   if(!disposed){failed=true;draw();}
  }
 }
 void load();
 return ()=>{
  disposed=true;clearTimeout(timer);disposePaper();observer.disconnect();
  motion.removeEventListener('change',motionChanged);document.removeEventListener('visibilitychange',schedule);
 };
}
