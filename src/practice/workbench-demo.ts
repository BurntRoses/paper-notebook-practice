// A cropped image of the project's own sixth-grade math example.
import scan from '../../assets/practice-demo/primary-math-scan.base64?raw';
import type {PaperRequest} from './catalog-identity';
import {PRACTICE_TYPE_NAMES,questionsOf,type PracticeDocument} from './model';
import {workbenchTasks,type WorkbenchTaskId} from './workbench-tasks';

interface DemoOptions {
 load:(request:PaperRequest)=>Promise<PracticeDocument>;
 mount:(frame:HTMLIFrameElement,controls:HTMLElement,paper:PracticeDocument,onError:()=>void)=>()=>void;
 markup:(text:string)=>string;
 open:(title:string,request:PaperRequest)=>void;
}

export function mountWorkbenchDemo(host:HTMLElement,options:DemoOptions){
 host.innerHTML='<header class="demo-heading"><h2>处理示例</h2><button type="button" id="demo-play"></button></header>'+
  '<div class="demo-steps segmented" role="group" aria-label="演示步骤">'+
  Array.from({length:3},(_,i)=>'<button data-demo-step="'+i+'" type="button"></button>').join('')+'</div>'+
  '<div class="demo-stage"><div class="demo-content"></div></div><div class="demo-footer" hidden>'+
  '<div id="demo-pages"></div><button type="button" id="demo-open">查看成品</button></div>';
 const play=host.querySelector<HTMLButtonElement>('#demo-play')!;
 const stage=host.querySelector<HTMLElement>('.demo-content')!;
 const steps=[...host.querySelectorAll<HTMLButtonElement>('[data-demo-step]')];
 const footer=host.querySelector<HTMLElement>('.demo-footer')!;
 const pager=host.querySelector<HTMLElement>('#demo-pages')!;
 const open=host.querySelector<HTMLButtonElement>('#demo-open')!;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let task:WorkbenchTaskId='author',phase=0,paper:PracticeDocument|undefined,revision=0;
 let timer=0,playing=!reduced.matches,autoplay=playing,visible=false,failed=false,disposePaper=()=>{};
 const cancel=()=>clearTimeout(timer);
 function updateControls(){
  const {stages}=workbenchTasks[task];
  steps.forEach((step,i)=>{
   step.textContent=stages[i];step.setAttribute('aria-pressed',String(i===phase));step.tabIndex=i===phase?0:-1;
  });
  play.textContent=reduced.matches?'下一步':playing?'暂停演示':phase===2?'重播':'播放演示';
  play.disabled=!paper||failed;
 }
 function schedule(){
  cancel();
  if(playing&&visible&&paper&&phase<2&&!document.hidden&&!reduced.matches){
   timer=window.setTimeout(()=>{phase++;draw();},phase===0?3300:2800);
  }
 }
 function text(tag:string,value:string,parent:HTMLElement){
  const node=document.createElement(tag);node.textContent=value;parent.append(node);return node;
 }
 function questionList(container:HTMLElement,paper:PracticeDocument){
  const list=document.createElement('ol');
  for(const q of questionsOf(paper).slice(0,3)){
   const row=text('li','',list);
   text('strong',PRACTICE_TYPE_NAMES[q.type],row);
   const prompt=text('p','',row);prompt.innerHTML=options.markup(q.prompt);
  }
  container.append(list);
 }
 function draw(){
  disposePaper();disposePaper=()=>{};
  stage.replaceChildren();stage.dataset.phase=String(phase);
  footer.hidden=true;
  updateControls();
  if(!paper){
   const status=text('p',failed?'示例未能载入':'正在载入示例',stage);
   status.className='demo-status';status.role='status';
   if(failed){
    const retry=text('button','重试',stage) as HTMLButtonElement;
    retry.className='button secondary';retry.onclick=()=>select(task);
   }
   return;
  }
  if(phase===2){
   playing=false;updateControls();
   const frame=document.createElement('iframe');
   frame.sandbox.value='allow-scripts allow-same-origin';frame.title=paper.title;
   disposePaper=options.mount(frame,pager,paper,()=>{
    if(frame.parentNode!==stage)return;
    footer.hidden=true;stage.replaceChildren();const retry=text('button','重新排版',stage) as HTMLButtonElement;
    retry.className='button secondary';retry.onclick=draw;
   });
   stage.append(frame);footer.hidden=false;return;
  }
  const surface=document.createElement('div');surface.className='demo-document';stage.append(surface);
  if(task==='scan'&&phase===0){
   const img=document.createElement('img');img.src='data:image/jpeg;base64,'+scan.trim();
   img.alt='六年级数学练习样题的示例扫描页';img.width=548;img.height=560;
   surface.classList.add('demo-scan');surface.append(img);
   if(playing&&!reduced.matches){const line=document.createElement('span');line.className='demo-scan-line';line.ariaHidden='true';surface.append(line);}
  }else if(phase===0&&task==='author'){
   text('h3',paper.authoring?.examName??paper.title,surface);
   if(paper.authoring?.knowledge)text('p',paper.authoring.knowledge,surface);
   const excerpt=paper.sections.find(section=>section.stimulus)?.stimulus?.text;
   if(excerpt)text('blockquote',excerpt.split('\n')[0],surface);
  }else if(task==='scan'||phase===0){
   text('h3',task==='scan'?'题目文本':paper.title,surface);
   questionList(surface,paper);
  }else{
   text('h3',paper.title,surface);
   const table=document.createElement('table');
   table.innerHTML='<thead><tr><th scope="col">题组</th><th scope="col">题数</th><th scope="col">分值</th></tr></thead>';
   const rows=table.createTBody();
   for(const part of paper.sections){
    const row=rows.insertRow();
    for(const value of [part.title,part.questions.length+' 题',part.score+' 分'])row.insertCell().textContent=value;
   }
   surface.append(table);
  }
  schedule();
 }
 async function select(value:WorkbenchTaskId,restart=false){
  const request=++revision;
  if(restart)playing=autoplay&&!reduced.matches;
  task=value;phase=0;paper=undefined;failed=false;cancel();draw();
  try{const result=await options.load(workbenchTasks[task].example);
   if(request===revision){paper=result;draw();}
  }catch{if(request===revision){failed=true;draw();}}
 }
 function jump(index:number){
  phase=index;playing=false;autoplay=false;cancel();draw();
 }
 play.onclick=()=>{
  if(playing){playing=false;autoplay=false;cancel();updateControls();stage.querySelector('.demo-scan-line')?.remove();return;}
  if(reduced.matches){jump((phase+1)%3);return;}
  if(phase===2)phase=0;
  playing=true;autoplay=true;draw();
 };
 steps.forEach((step,i)=>step.onclick=()=>jump(i));
 host.querySelector('.demo-steps')!.addEventListener('keydown',event=>{
  const key=(event as KeyboardEvent).key;
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(key))return;
  event.preventDefault();
  const index=key==='Home'?0:key==='End'?2:(phase+(key==='ArrowRight'?1:2))%3;
  jump(index);steps[index].focus();
 });
 open.onclick=()=>{if(paper)options.open(paper.title,workbenchTasks[task].example);};
 const motion=()=>{if(reduced.matches&&playing){playing=false;cancel();draw();}};
 reduced.addEventListener('change',motion);
 const observer=new IntersectionObserver(([entry])=>{visible=entry.intersectionRatio>=.4;host.classList.toggle('demo-visible',visible);schedule();},{threshold:.4});
 observer.observe(host.querySelector('.demo-stage')!);
 document.addEventListener('visibilitychange',schedule);
 return {
  select,
  dispose(){revision++;cancel();disposePaper();observer.disconnect();reduced.removeEventListener('change',motion);document.removeEventListener('visibilitychange',schedule);},
 };
}
