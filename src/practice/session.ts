/** SHA-256 keeps the separate answer key out of the question paper payload. */
export function practiceDigest(value:string):string{
 const bytes=new TextEncoder().encode(value),words:number[]=[],constants:number[]=[],initial:number[]=[];
 let candidate=2;while(constants.length<64){let prime=true;for(let n=2;n*n<=candidate;n++)if(candidate%n===0){prime=false;break;}if(prime){if(initial.length<8)initial.push((Math.sqrt(candidate)%1*4294967296)|0);constants.push((Math.cbrt(candidate)%1*4294967296)|0);}candidate++;}
 const size=Math.ceil((bytes.length+9)/64)*64,data=new Uint8Array(size);data.set(bytes);data[bytes.length]=128;const bitLength=bytes.length*8;new DataView(data.buffer).setUint32(size-4,bitLength>>>0);new DataView(data.buffer).setUint32(size-8,Math.floor(bitLength/4294967296));
 const rotate=(x:number,n:number)=>(x>>>n)|(x<<(32-n)),state=initial.slice();
 for(let start=0;start<size;start+=64){for(let i=0;i<16;i++)words[i]=new DataView(data.buffer).getInt32(start+i*4);for(let i=16;i<64;i++){const a=words[i-15],b=words[i-2];words[i]=((rotate(a,7)^rotate(a,18)^(a>>>3))+words[i-16]+(rotate(b,17)^rotate(b,19)^(b>>>10))+words[i-7])|0;}let [a,b,c,d,e,f,g,h]=state;for(let i=0;i<64;i++){const t1=(h+(rotate(e,6)^rotate(e,11)^rotate(e,25))+((e&f)^(~e&g))+constants[i]+words[i])|0,t2=((rotate(a,2)^rotate(a,13)^rotate(a,22))+((a&b)^(a&c)^(b&c)))|0;h=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0;}[a,b,c,d,e,f,g,h].forEach((v,i)=>state[i]=(state[i]+v)|0);}
 return state.map(v=>(v>>>0).toString(16).padStart(8,'0')).join('');
}
export function normalizePracticeAnswer(value:string|string[]):string{return (Array.isArray(value)?value:[value]).map(v=>String(v).normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en')).join('\u001f');}

/** Kept self contained so the same session ships in every exported offline HTML. */
export function practiceSession(digest:typeof practiceDigest,normalize:typeof normalizePracticeAnswer){
 const data=JSON.parse(document.getElementById('practice-data')!.textContent||'{}'),kind=data.paperKind,all:any[]=data.sections.flatMap((s:any)=>s.questions),byId=new Map(all.map((q:any)=>[q.id,q]));
 const $=(id:string)=>document.getElementById(id)!,root=$('paper-root'),template=$('paper-template') as HTMLTemplateElement,message=$('session-message'),key=`paper-notebook:practice:${data.practiceId}:${data.notebookRevision}`;
 const storageGet=()=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}},saved=data.preview?null:storageGet();
 let state:any={userState:{practiceAnswers:{},practiceMistakes:[]},review:{},startedAt:0,submitted:false,activeSection:data.sections[0]?.id,preview:Boolean(data.preview)},answerKey:any=null,sourceOpener:HTMLElement|null=null;
 if(saved&&saved.userState&&saved.review)state={...state,...saved};
 const say=(text:string)=>{message.textContent=text;};
 const save=()=>{if(data.preview)return;try{localStorage.setItem(key,JSON.stringify(state));}catch{say('浏览器未保存记录，请使用“导出记录”保存本次作答。');}};
 const escape=(s:any)=>String(s??'').replace(/[&<>"']/g,(c:string)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
 const download=(text:string|Uint8Array,name:string,type='application/json')=>{const url=URL.createObjectURL(new Blob([typeof text==='string'?text:new Uint8Array(text).buffer],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const zipFiles=(files:{name:string;text:string}[])=>{const encoder=new TextEncoder(),table=Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;}),local:Uint8Array[]=[],central:Uint8Array[]=[];let offset=0;for(const file of files){const name=encoder.encode(file.name),bytes=encoder.encode(file.text);let crc=0xffffffff;for(const b of bytes)crc=table[(crc^b)&255]^(crc>>>8);crc=(crc^0xffffffff)>>>0;const header=new Uint8Array(30+name.length),h=new DataView(header.buffer);h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint32(14,crc,true);h.setUint32(18,bytes.length,true);h.setUint32(22,bytes.length,true);h.setUint16(26,name.length,true);header.set(name,30);local.push(header,bytes);const directory=new Uint8Array(46+name.length),d=new DataView(directory.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x0800,true);d.setUint32(16,crc,true);d.setUint32(20,bytes.length,true);d.setUint32(24,bytes.length,true);d.setUint16(28,name.length,true);d.setUint32(42,offset,true);directory.set(name,46);central.push(directory);offset+=header.length+bytes.length;}const centralSize=central.reduce((n,p)=>n+p.length,0),end=new Uint8Array(22),view=new DataView(end.buffer);view.setUint32(0,0x06054b50,true);view.setUint16(8,files.length,true);view.setUint16(10,files.length,true);view.setUint32(12,centralSize,true);view.setUint32(16,offset,true);const parts=[...local,...central,end],result=new Uint8Array(offset+centralSize+22);let at=0;for(const part of parts){result.set(part,at);at+=part.length;}return result;};
 const valueOf=(q:any)=>state.userState.practiceAnswers[q.id]?.value??(q.type==='blank'?Array(q.blankCount||1).fill(''):['response','task','multiple'].includes(q.type)?[]:'');
 const answered=(q:any)=>{const v=valueOf(q);return Array.isArray(v)?(q.type==='blank'?v.length>0&&v.every(x=>String(x).trim()):v.some(x=>String(x).trim())):Boolean(String(v).trim());};
 function restoreInputs(){const listeningEnabled=!state.preview&&(kind!=='exam'||Boolean(state.startedAt)&&!state.submitted);root.querySelectorAll<HTMLAudioElement>('audio[data-section-audio]').forEach(audio=>{audio.dataset.enabled=String(listeningEnabled);audio.inert=!listeningEnabled;});root.querySelectorAll<HTMLButtonElement>('[data-play-listening]').forEach(button=>button.disabled=!listeningEnabled);root.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('[data-qid]').forEach(input=>{const q=byId.get(input.dataset.qid!),v=valueOf(q);if(input instanceof HTMLInputElement&&['radio','checkbox'].includes(input.type))input.checked=input.type==='checkbox'?Array.isArray(v)&&v.includes(input.value):v===input.value;else if(input.dataset.blank!==undefined)input.value=v[Number(input.dataset.blank)]||'';else if(input.dataset.part!==undefined)input.value=Array.isArray(v)?v[Number(input.dataset.part)]||'':Number(input.dataset.part)===0?v:'';input.disabled=Boolean(data.preview)||kind!=='exam'||!state.startedAt||state.submitted;});}
 function rememberAudio(audio:HTMLAudioElement){if(!audio.readyState)return;state.audioPositions??={};state.audioPositions[audio.dataset.sectionAudio!]=audio.currentTime;}
 function splitRich(element:HTMLElement,limit=260):HTMLElement[]{
  const tokens:{node:Node;path:HTMLElement[];text?:string}[]=[];
  const walk=(node:Node,path:HTMLElement[])=>{if(node.nodeType===Node.TEXT_NODE){if(node.textContent)tokens.push({node,path,text:node.textContent});return;}if(!(node instanceof HTMLElement))return;if(node.matches('.katex,svg,img,input,textarea,button,br')||!node.childNodes.length){tokens.push({node,path});return;}for(const child of Array.from(node.childNodes))walk(child,[...path,node]);};
  for(const child of Array.from(element.childNodes))walk(child,[]);
  const pieces:HTMLElement[]=[];let piece=element.cloneNode(false) as HTMLElement,used=0,parents=new Map<HTMLElement,HTMLElement>();
  const flush=()=>{if(piece.childNodes.length)pieces.push(piece);piece=element.cloneNode(false) as HTMLElement;piece.classList.add('rich-continuation');used=0;parents=new Map();};
  const parentFor=(path:HTMLElement[])=>{let parent=piece;for(const original of path){let clone=parents.get(original);if(!clone){clone=original.cloneNode(false) as HTMLElement;parent.append(clone);parents.set(original,clone);}parent=clone;}return parent;};
  for(const token of tokens){if(token.text!==undefined){let letters=Array.from(token.text);while(letters.length){if(used>=limit)flush();let count=Math.min(limit-used,letters.length);if(count<letters.length&&/[A-Za-z0-9]/.test(letters[count-1])&&/[A-Za-z0-9]/.test(letters[count])){let boundary=count;while(boundary>0&&/[A-Za-z0-9]/.test(letters[boundary-1]))boundary--;if(boundary>0)count=boundary;else if(used){flush();continue;}else{while(count<letters.length&&/[A-Za-z0-9]/.test(letters[count]))count++;}}const part=letters.splice(0,count).join(''),parent=parentFor(token.path);parent.append(document.createTextNode(part));used+=count;}}else{const weight=token.node instanceof HTMLElement&&token.node.matches('.katex')?Math.min(80,token.node.textContent?.length||1):1;if(used&&used+weight>limit)flush();parentFor(token.path).append(token.node.cloneNode(true));used+=weight;}}
  flush();return pieces;
 }
 let measuringContent:HTMLElement|null=null;
 function expandChunk(chunk:HTMLElement):HTMLElement[]{
  const declared=all.find(q=>q.id===chunk.dataset.question)?.pageBreakBeforeLines,prompt=chunk.querySelector<HTMLElement>('.question-prompt');
  if(kind==='exam'&&declared?.length&&prompt){
   const groups:Node[][]=[[]];let line=0;
   for(const node of Array.from(prompt.childNodes)){if(node instanceof HTMLBRElement){line++;if(declared.includes(line)){groups.push([]);continue;}}groups.at(-1)!.push(node);}
   return groups.map((nodes,index)=>{const shell=chunk.cloneNode(true) as HTMLElement,target=shell.querySelector<HTMLElement>('.question-prompt')!;target.replaceChildren(...nodes.map(n=>n.cloneNode(true)));shell.dataset.promptFragment=String(index);if(index){shell.dataset.breakBefore='true';shell.querySelector('.question-number')?.remove();shell.querySelector('.question-points')?.remove();shell.classList.add('source-question-continuation');shell.style.marginTop='0';}if(index<groups.length-1){shell.style.marginBottom='0';shell.querySelectorAll('.answer-input,.question-feedback').forEach(el=>el.remove());}return shell;});
  }
  if(chunk.querySelector('.paper-options[data-fixed-columns]'))return [chunk];
  if(measuringContent&&chunk.classList.contains('question')&&chunk.querySelector('.question-attachment')){
   const probe=chunk.cloneNode(true) as HTMLElement;measuringContent.replaceChildren(probe);
   const available=((data.paperGeometry?.heightMm??297)-(data.paperLayout?.marginTopMm??25)-(data.paperLayout?.marginBottomMm??25))*96/25.4;
   if(measuringContent.scrollHeight<=available-2)return [chunk];
  }
  // Preserve a measured original question as one block when it physically fits.
  if(kind==='exam'&&data.presentation&&chunk.classList.contains('separate-answer-question')&&!chunk.querySelector('.question-attachment')&&(byId.get(chunk.dataset.question!) as any)?.prompt.length<1800)return [chunk];
  if(chunk.classList.contains('section-stimulus'))return Array.from(chunk.children).flatMap(child=>splitRich(child as HTMLElement,650)).map(child=>{const shell=chunk.cloneNode(false) as HTMLElement;shell.append(child);return shell;});
  if(!chunk.classList.contains('question')||(chunk.textContent!.length<500&&!chunk.querySelector('.question-attachment')))return [chunk];
  const expanded:HTMLElement[]=[],number=chunk.dataset.number;
  const add=(child:HTMLElement)=>{const shell=chunk.cloneNode(false) as HTMLElement;if(expanded.length)delete shell.dataset.breakBefore;shell.classList.add('fragmented-question');shell.classList.remove('question-continuation');if(expanded.length){const label=document.createElement('div');label.className='fragment-continuation-label';label.textContent=(data.paperContinuation??'第 {n} 题（续）').replace('{n}',String(number));shell.append(label);}shell.append(child);expanded.push(shell);};
  for(const child of Array.from(chunk.children) as HTMLElement[]){
   if(state.preview&&child.matches('.screen-answer,.screen-media'))continue;
   // Keep the short answer footer with the preceding solution or marking criteria.
   if(kind==='answers'&&expanded.length&&child.matches('.answer-provenance,.source-citation,.answer-evidence-button')){expanded.at(-1)!.append(child);continue;}
   if(child.classList.contains('question-heading')){const prompt=child.querySelector<HTMLElement>('.question-prompt');if(prompt&&prompt.textContent!.length>300){const parts=splitRich(prompt);parts.forEach((part,i)=>{if(i===0){const heading=child.cloneNode(true) as HTMLElement;heading.querySelector('.question-prompt')!.replaceWith(part);add(heading);}else{part.classList.add('question-prose');add(part);}});}else add(child);}
   else if(child.classList.contains('paper-options')&&child.textContent!.length>300){for(const option of Array.from(child.children) as HTMLElement[]){const input=option.querySelector<HTMLInputElement>('input'),value=input?.value;splitRich(option).forEach((part,i)=>{const group=child.cloneNode(false) as HTMLElement;group.style.setProperty('--option-columns','1');if(i&&value){part.dataset.selectChoice=chunk.dataset.question+'|'+value;const prefix=document.createElement('b');prefix.className='option-continuation-letter';prefix.textContent=value+(data.paperLanguage==='en'?' (continued)':'（续）');part.prepend(prefix);}group.append(part);add(group);});}}
   else if(child.classList.contains('question-feedback')&&(child.hidden||state.preview))continue;
   else if(child.tagName==='TEXTAREA'||child.textContent!.length<=300)add(child);
   else if(child.classList.contains('answer-rubric')){
    const list=child.querySelector<HTMLOListElement>(':scope > ol');
    if(!list?.children.length){add(child);continue;}
    const heading=child.querySelector(':scope > h3');
    Array.from(list.children).forEach((criterion,index)=>{
     const section=child.cloneNode(false) as HTMLElement,numbered=list.cloneNode(false) as HTMLOListElement;
     numbered.start=list.start+index;
     numbered.append(criterion.cloneNode(true));
     if(index===0&&heading)section.append(heading.cloneNode(true));
     else section.classList.add('rich-continuation');
     section.append(numbered);
     add(section);
    });
    for(const detail of Array.from(child.children).filter(element=>element!==heading&&element!==list)){
     for(const part of splitRich(detail as HTMLElement)){
      const section=child.cloneNode(false) as HTMLElement;
      section.classList.add('rich-continuation');
      section.append(part);
      add(section);
     }
    }
   }
   else for(const part of splitRich(child))add(part);
  }
  return expanded.length?expanded:[chunk];
 }
 function paginate(){
  // Pagination uses full physical dimensions; screen zoom only scales the finished pages.
  root.querySelectorAll<HTMLAudioElement>('audio[data-section-audio]').forEach(audio=>{rememberAudio(audio);audio.pause();});
  const previousZoom=root.style.getPropertyValue('--paper-zoom');root.style.setProperty('--paper-zoom','1');
  const fragment=data.screenOnly?template.content:template.content.cloneNode(true) as DocumentFragment,chunks:HTMLElement[]=[];renderFeedback(fragment);
  let measuringPage:HTMLElement|undefined;
  if(kind==='exam'&&data.presentation?.headerStyle==='generated'){
   measuringPage=document.createElement('div');measuringPage.className='exam-page';measuringPage.style.cssText='position:fixed;left:-100000px;top:0;visibility:hidden;zoom:1;height:auto;overflow:visible;margin:0';
   measuringContent=document.createElement('div');measuringContent.className='page-content';measuringContent.style.height='auto';measuringPage.append(measuringContent);document.body.append(measuringPage);
  }
  for(const element of Array.from(fragment.children) as HTMLElement[]){if(element.tagName==='SECTION'){if(kind!=='exam'||state.preview||state.submitted||element.dataset.section===state.activeSection)chunks.push(...(Array.from(element.children) as HTMLElement[]).flatMap(expandChunk));}else if(!element.classList.contains('paper-end')||kind!=='exam'||state.preview||state.submitted||state.activeSection===data.sections.at(-1)?.id)chunks.push(element);}
  measuringPage?.remove();measuringContent=null;
  root.replaceChildren();let content:HTMLElement,columns:HTMLElement[]=[],columnIndex=0,sectionTitle:string|undefined;
  const newPage=()=>{const page=document.createElement('div');page.className='exam-page';const area=data.paperLayout?.columns===2?'<div class="page-columns"><div class="page-content"></div><div class="page-content"></div></div>':'<div class="page-content"></div>';page.innerHTML=(document.querySelector<HTMLTemplateElement>('#page-furniture')?.innerHTML??'')+(document.querySelector<HTMLTemplateElement>('#page-project-mark')?.innerHTML??'')+(document.querySelector<HTMLTemplateElement>('#page-seal')?.innerHTML??'')+area+'<footer></footer>';const frame=document.createElement('div');frame.className='paper-page-frame';frame.append(page);root.append(frame);columns=Array.from(page.querySelectorAll<HTMLElement>('.page-content'));columnIndex=0;content=columns[0];};const nextColumn=()=>{if(columnIndex+1<columns.length)content=columns[++columnIndex];else newPage();};newPage();
  for(const chunk of chunks){
   if(chunk.dataset.breakBefore==='true'&&content!.children.length){if(data.paperLayout?.columns===2)nextColumn();else newPage();}
   if(chunk.classList.contains('section-heading'))sectionTitle=chunk.querySelector('h2')?.textContent||'';
   content!.append(chunk);
   chunk.querySelectorAll<HTMLElement>('.paper-options').forEach(grid=>{let columns=Number(grid.style.getPropertyValue('--option-columns'))||4;while(!grid.dataset.fixedColumns&&columns>1&&Array.from(grid.children).some(option=>{const el=option as HTMLElement,line=Number.parseFloat(getComputedStyle(el).lineHeight)||21;return el.scrollWidth>el.clientWidth+1||el.getBoundingClientRect().height>line*1.85;})){columns=columns===4?2:1;grid.style.setProperty('--option-columns',String(columns));}});
   if(content!.scrollHeight>content!.clientHeight+1&&content!.children.length>1){chunk.remove();const previous=content!.lastElementChild as HTMLElement|null,carry=previous&&(previous.matches('.section-heading,.card-section-title')||kind==='answers'&&chunk.classList.contains('paper-end')&&previous.matches('.answer-question'))?previous:null;carry?.remove();nextColumn();chunk.classList.add('page-start');if(carry)content!.append(carry);else if(!chunk.classList.contains('exam-heading')&&!chunk.classList.contains('section-heading')&&sectionTitle&&!data.presentation){const label=document.createElement('div');label.className='page-continuation-title';label.textContent=sectionTitle+(data.paperLanguage==='en'?' (continued)':'（续）');content!.append(label);}content!.append(chunk);}

  }
  const pages=root.querySelectorAll<HTMLElement>('.exam-page');pages.forEach((p,i)=>{
   const source=kind==='exam',pageNumber=source?data.presentation?.sourcePageNumbers?.[i]??i+1:i+1,pageCount=source?data.presentation?.sourcePageCount??pages.length:pages.length;
   p.dataset.sourcePage=String(pageNumber);p.dataset.sourceParity=pageNumber%2?'odd':'even';
   const header=p.querySelector<HTMLElement>('.source-running-header');if(header&&i===0&&header.dataset.skipFirst==='true')header.hidden=true;
   const sideLabel=p.querySelector<HTMLElement>('.source-side-label[data-first-only=true]');if(sideLabel&&i>0)sideLabel.hidden=true;
   const replace=(text:string)=>text.replaceAll('{page}',String(pageNumber)).replaceAll('{pages}',String(pageCount)).replaceAll('{title}',data.title);
   p.querySelector('footer')!.textContent=kind==='answer-card'?`${i+1} / ${pages.length}`:data.presentation?.footerTemplate!==undefined?replace(data.presentation.footerTemplate):(data.paperLanguage==='en'?`Page ${pageNumber} of ${pageCount}`:`第 ${pageNumber} 页，共 ${pageCount} 页`)+(data.paperLayout?.footerText?' · '+data.paperLayout.footerText:'');
   const headerValues=pageNumber%2===0?{...data.presentation?.runningHeader,...data.presentation?.runningHeader?.even}:data.presentation?.runningHeader;
   p.querySelectorAll<HTMLElement>('[data-page-label]').forEach((el,j)=>el.textContent=replace(headerValues?.[['left','center','right'][j]]??el.textContent??''));
  });root.style.setProperty('--paper-zoom',previousZoom||'1');
  if(data.screenOnly){root.querySelectorAll<HTMLElement>('input,textarea').forEach(input=>input.inert=true);return;}
  restoreInputs();
  if(!state.preview)root.querySelectorAll<HTMLAudioElement>('audio[data-section-audio]').forEach(audio=>{
   const recording=data.sections.find((s:any)=>s.id===audio.dataset.sectionAudio)?.stimulus?.audio;
   if(!recording)return;
   audio.addEventListener('loadedmetadata',()=>{const time=state.audioPositions?.[audio.dataset.sectionAudio!]??0;if(time>0&&time<audio.duration)audio.currentTime=time;});
   audio.addEventListener('pause',()=>{rememberAudio(audio);save();});
   if(recording.dataUrl){audio.src=recording.dataUrl;return;}
   const play=audio.parentElement?.querySelector<HTMLButtonElement>('[data-play-listening]');
   if(!play||!data.audioBaseUrl||!/^assets\/[a-f0-9]{20}\.(m4a|mp3|wav|ogg|aac|webm)$/.test(recording.url??''))return;
   play.onclick=async()=>{
    if(play.disabled)return;
    const source=new URL(recording.url,data.audioBaseUrl);
    if(source.origin!==location.origin)return;
    audio.src=source.href;audio.hidden=false;play.hidden=true;
    try{await audio.play();}catch{audio.removeAttribute('src');audio.hidden=true;play.hidden=false;say('录音未能播放，请重试。');}
   };
  });
 }
 function controls(){
  const exam=kind==='exam';$('start-exam')?.toggleAttribute('hidden',Boolean(state.startedAt));$('submit-exam')?.toggleAttribute('hidden',!state.startedAt||state.submitted);$('section-navigation').hidden=!exam||state.submitted||state.preview;
  $('print-exam').hidden=!state.preview;$('close-preview').hidden=!state.preview;$('preview-print').hidden=state.preview;$('exam-timer').hidden=!exam||state.preview;
  $('section-navigation').querySelectorAll<HTMLButtonElement>('button').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.selectSection===state.activeSection));b.tabIndex=b.dataset.selectSection===state.activeSection?0:-1;});
 }
 function objectiveGrade(q:any):{correct?:boolean;score?:number}{
  if(['response','task'].includes(q.type))return {};
  const value=valueOf(q),selected=q.type==='multiple'?[...new Set(Array.isArray(value)?value:[])].sort():value;
  const correct=digest(normalize(selected)+'\0'+(data.checkPracticeId||data.practiceId)+'\0'+q.id)===q.check;
  if(correct)return {correct:true,score:q.score};
  if(q.type!=='multiple'||!q.multiSelectScoring)return {correct:false,score:0};
  if(!selected.length)return {correct:false,score:0};
  const full=answerKey?.sections.flatMap((s:any)=>s.questions).find((x:any)=>x.id===q.id);
  // The candidate contains only a set digest, never per-option answer hashes.
  // An incomplete selection cannot be checked until the matching key is imported.
  if(!full)return {correct:false};
  const expected=Array.isArray(full.solution)?full.solution:[full.solution];
  return {correct:false,score:selected.every((id:string)=>expected.includes(id))?Math.min(q.score,selected.length*q.multiSelectScoring.partialPerCorrect):0};
 }
 function refreshMistakes(){state.userState.practiceMistakes=all.filter(q=>state.userState.practiceAnswers[q.id]?.correct===false).map(q=>q.id);}
 function regradePartialSelections(){
  if(!state.submitted)return;
  for(const q of all.filter(q=>q.type==='multiple'&&q.multiSelectScoring)){
   const old=state.userState.practiceAnswers[q.id]||{value:valueOf(q)},result=objectiveGrade(q);
   state.userState.practiceAnswers[q.id]={...old,submitted:true,...result};
  }
  refreshMistakes();save();
 }
 function grade(){
  state.reviewBeforeAttempt=JSON.parse(JSON.stringify(state.review));state.submitted=true;
  for(const q of all){const old=state.userState.practiceAnswers[q.id]||{value:valueOf(q)},result=objectiveGrade(q);state.userState.practiceAnswers[q.id]={...old,submitted:true,...result};if(result.correct!==undefined)schedule(q.id,result.correct);}
  refreshMistakes();save();paginate();controls();results();
 }
 function schedule(id:string,correct:boolean){const previous=state.reviewBeforeAttempt?state.reviewBeforeAttempt[id]:state.review[id],stage=correct?Math.min(5,(previous?.stage??-1)+1):0,date=new Date();date.setDate(date.getDate()+[1,2,4,7,15,30][stage]);state.review[id]={stage,due:date.toISOString().slice(0,10)};}
 function showSource(q:any){const full=answerKey?.sections.flatMap((s:any)=>s.questions).find((item:any)=>item.id===q.id);if(!full){say('请先导入对应答案卷，再查看原文与解析。');return;}q=full;const source=q.source,material=answerKey.materials.find((m:any)=>m.id===source.materialId)||answerKey.materials[0],block=material?.blocks?.find((b:any)=>b.id===source.blockId),text=block?.text||material?.text||source.exact,index=text.indexOf(source.exact);$('source-title').textContent=`${source.title||block?.title||material?.title||source.blockId}${source.page!==undefined?' · 第 '+source.page+' 页':''}`;const body=$('source-body');body.replaceChildren();if(index>=0){body.append(document.createTextNode(text.slice(Math.max(0,index-400),index)));const mark=document.createElement('mark');mark.textContent=source.exact;body.append(mark,document.createTextNode(text.slice(index+source.exact.length,index+source.exact.length+500)));setTimeout(()=>mark.classList.add('source-restored'),3000);}else body.textContent=source.exact;($('source-dialog') as HTMLDialogElement).showModal();}
 function renderFeedback(container:ParentNode=root){if(!state.submitted)return;container.querySelectorAll<HTMLElement>('[data-feedback]').forEach(el=>{const q=byId.get(el.dataset.feedback!),a=state.userState.practiceAnswers[q.id],full=answerKey?.sections.flatMap((s:any)=>s.questions).find((x:any)=>x.id===q.id);el.hidden=false;el.innerHTML=`<b>${a?.score===undefined&&q.multiSelectScoring&&a?.correct===false?'待核少选分':a?.correct===undefined?'待自评':a.correct?'正确':a?.score>0?'部分得分':'错误'}${a?.score!==undefined?' · '+a.score+' / '+q.score+' 分':''}</b>${full?'<p><b>参考答案：</b>'+escape(Array.isArray(full.solution)?full.solution.join('；'):full.solution)+'</p><p>'+escape(full.explanation)+'</p>':''}<button data-source="${escape(q.id)}">回原文</button>${['response','task'].includes(q.type)?`<label class="self-score">自评分数 <input type="number" min="0" max="${q.score}" step="0.5" data-self-score="${escape(q.id)}" value="${a?.score??''}" placeholder="0–${q.score}"></label>`:''}`;});}
 function results(){
  if(!state.submitted)return;const result=$('exam-results');result.hidden=false;let earned=0,pending=0,partialPending=0;for(const q of all){const a=state.userState.practiceAnswers[q.id];if(a?.score===undefined){if(q.type==='multiple'&&q.multiSelectScoring)partialPending++;else pending+=q.score;}else earned+=a.score;}
  const chapters=new Map<string,{correct:number,total:number,pending:number}>();for(const q of all){const c=chapters.get(q.chapter)||{correct:0,total:0,pending:0},a=state.userState.practiceAnswers[q.id];c.total++;if(a?.correct===true)c.correct++;if(a?.correct===undefined)c.pending++;chapters.set(q.chapter,c);}
  result.innerHTML=`<div class="result-heading"><div><p>本次作答</p><h2>${earned} <span>/ ${data.totalScore} 分</span></h2>${pending?'<p>另有 '+pending+' 分主观题待自评</p>':''}${partialPending?'<p>'+partialPending+' 题多选少选分待核，导入答案卷后自动计分。</p>':''}</div><div class="result-actions"><button id="import-answers">导入答案卷，查看解析</button><button id="export-mistakes" ${state.userState.practiceMistakes.length?'':'disabled'}>导出错题本</button><button id="export-review">导出复习排期</button><button id="next-attempt">再次练习</button></div></div><div class="chapter-results">${[...chapters].map(([name,c])=>`<div><b>${escape(name)}</b><span>${c.correct} / ${c.total} 题正确 · ${Math.round(c.correct/c.total*100)}%${c.pending?'，'+c.pending+' 题待自评':''}</span></div>`).join('')}</div>${!answerKey?'<p class="answer-import-note">选择同时导出的答案卷 HTML 或原始 practice.json，解析将在本机显示。</p>':'<p>答案卷已导入，解析与出处已显示在对应题目下。</p><button id="view-answer-paper">打开答案卷</button>'}`;
  $('import-answers')?.addEventListener('click',()=>($('answer-file') as HTMLInputElement).click());$('export-mistakes')?.addEventListener('click',exportMistakes);$('export-review')?.addEventListener('click',()=>download(JSON.stringify({schemaVersion:'1.0.0',practiceId:data.practiceId,review:state.review},null,2),'复习排期.json'));
  $('next-attempt')?.addEventListener('click',()=>{state={...state,userState:{practiceAnswers:{},practiceMistakes:[]},reviewBeforeAttempt:undefined,startedAt:0,submitted:false,activeSection:data.sections[0]?.id};$('exam-results').hidden=true;save();paginate();controls();say('已准备新一轮练习，点击“开始作答”计时。复习档位保留。');});
  $('view-answer-paper')?.addEventListener('click',()=>{if(answerKey?.answerHTML){const url=URL.createObjectURL(new Blob([answerKey.answerHTML],{type:'text/html'}));window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),30000);}else say('已加载原始数据。答案与解析可在下方逐题查看。');});
 }
 function exportMistakes(){
  const ids=new Set(state.userState.practiceMistakes);if(!ids.size)return;
  const clone=document.documentElement.cloneNode(true) as HTMLElement,payload=JSON.parse(JSON.stringify(data));payload.title=data.title+' · 错题本';payload.totalScore=all.filter(q=>ids.has(q.id)).reduce((sum,q)=>sum+q.score,0);payload.sections=payload.sections.map((s:any)=>({...s,questions:s.questions.filter((q:any)=>ids.has(q.id))})).filter((s:any)=>s.questions.length).map((s:any)=>({...s,score:s.questions.reduce((sum:number,q:any)=>sum+q.score,0)}));payload.practiceId=data.practiceId+'-mistakes-'+new Date().toISOString().slice(0,10);for(const s of payload.sections)for(const q of s.questions){const original=byId.get(q.id);q.check=original.check;} // stable checks retain original salt below
  payload.checkPracticeId=data.practiceId;
  const tpl=clone.querySelector('#paper-template') as HTMLTemplateElement;tpl.content.querySelectorAll<HTMLElement>('[data-question]').forEach(el=>{if(!ids.has(el.dataset.question))el.remove();});tpl.content.querySelectorAll<HTMLElement>('section').forEach(el=>{if(!el.querySelector('[data-question]'))el.remove();else{const section=payload.sections.find((s:any)=>s.id===el.dataset.section);const title=el.querySelector('h2');if(title)title.textContent=section.title+'（共 '+section.questions.length+' 小题，共 '+section.score+' 分）';}});tpl.content.querySelector('h1')!.textContent=payload.title;tpl.content.querySelector('.exam-kind')!.textContent=data.subject+' · 错题本';const heading=tpl.content.querySelector('.exam-heading')!;heading.querySelector('.exam-meta')!.innerHTML='考试时间：'+data.durationMinutes+' 分钟　满分：<b>'+payload.totalScore+'</b> 分';
  clone.querySelector('#practice-data')!.textContent=JSON.stringify(payload).replace(/</g,'\\u003c');const initialPage=root.querySelector('.exam-page')!.cloneNode(true) as HTMLElement;initialPage.querySelector('.page-content')!.innerHTML=tpl.innerHTML;initialPage.querySelector('footer')!.textContent='第 1 页，共 1 页';clone.querySelector('#paper-root')!.replaceChildren(initialPage);clone.querySelector('#exam-results')!.innerHTML='';clone.querySelector('#exam-results')!.setAttribute('hidden','');clone.querySelector('#section-navigation')!.innerHTML=payload.sections.map((s:any,i:number)=>'<button data-select-section="'+escape(s.id)+'" aria-pressed="'+(i===0)+'">'+escape(s.title)+'</button>').join('');clone.querySelector('title')!.textContent='《'+payload.title+'》-试卷';const exportedFiles=[{name:'《'+payload.title+'》-试卷.html',text:'<!doctype html>'+clone.outerHTML}];
  if(answerKey){
   const keyCopy=JSON.parse(JSON.stringify(answerKey));delete keyCopy.answerHTML;keyCopy.title=payload.title;keyCopy.totalScore=payload.totalScore;keyCopy.paperKind='answers';keyCopy.sections=keyCopy.sections.map((s:any)=>({...s,questions:s.questions.filter((q:any)=>ids.has(q.id))})).filter((s:any)=>s.questions.length).map((s:any)=>({...s,score:s.questions.reduce((sum:number,q:any)=>sum+q.score,0)}));keyCopy.practiceId=payload.practiceId;
   const answerDoc=answerKey.answerHTML?new DOMParser().parseFromString(answerKey.answerHTML,'text/html'):new DOMParser().parseFromString('<!doctype html>'+clone.outerHTML,'text/html'),answerTemplate=answerDoc.querySelector('#paper-template') as HTMLTemplateElement;
   answerTemplate.content.querySelectorAll<HTMLElement>('[data-question]').forEach(el=>{if(!ids.has(el.dataset.question))el.remove();else if(!answerKey.answerHTML){const q=keyCopy.sections.flatMap((s:any)=>s.questions).find((q:any)=>q.id===el.dataset.question);if(el.dataset.continuation&&el.dataset.continuation!=='0'){el.remove();return;}const heading=el.querySelector('.question-heading')?.outerHTML||'<b>'+q.number+'.</b>';el.className='paper-chunk question answer-question';el.innerHTML=heading+'<p><b>答案：</b>'+escape(Array.isArray(q.solution)?q.solution.join('；'):q.solution)+'</p><p><b>解析：</b>'+escape(q.explanation)+'</p><p class="source-citation"><b>原文出处：</b>'+escape(q.source.title||q.source.blockId)+(q.source.page!==undefined?' · 第 '+escape(q.source.page)+' 页':'')+'</p><blockquote>'+escape(q.source.exact)+'</blockquote>';}});
   answerTemplate.content.querySelectorAll<HTMLElement>('section').forEach(el=>{const section=keyCopy.sections.find((s:any)=>s.id===el.dataset.section);if(!section)el.remove();else el.querySelector('h2')!.textContent=section.title+'（共 '+section.questions.length+' 小题，共 '+section.score+' 分）';});answerTemplate.content.querySelector('h1')!.textContent=payload.title;answerTemplate.content.querySelector('.exam-kind')!.textContent=data.subject+' · 答案卷';answerTemplate.content.querySelector('.exam-meta')!.innerHTML='考试时间：'+data.durationMinutes+' 分钟　满分：<b>'+payload.totalScore+'</b> 分';const answerEnd=answerTemplate.content.querySelector('.paper-end');if(answerEnd)answerEnd.textContent='（答案卷结束）';answerDoc.body.dataset.kind='answers';answerDoc.querySelector('#start-exam')?.remove();answerDoc.querySelector('#submit-exam')?.remove();answerDoc.querySelector('#practice-data')!.textContent=JSON.stringify(keyCopy).replace(/</g,'\\u003c');const answerInitial=initialPage.cloneNode(true) as HTMLElement;answerInitial.querySelector('.page-content')!.innerHTML=answerTemplate.innerHTML;answerDoc.querySelector('#paper-root')!.replaceChildren(answerInitial);answerDoc.querySelector('title')!.textContent='《'+payload.title+'》-答案卷';exportedFiles.push({name:'《'+payload.title+'》-答案卷.html',text:'<!doctype html>'+answerDoc.documentElement.outerHTML});
  }else say('错题本已导出；导入答案卷后，可同时导出对应答案。');
  download(zipFiles(exportedFiles),'《'+payload.title+'》.zip','application/zip');
 }
 const fit=()=>{const width=(data.paperGeometry?.widthMm||210)*96/25.4,rootStyle=getComputedStyle(root),available=Math.max(50,Math.min(root.clientWidth,window.innerWidth)-parseFloat(rootStyle.paddingLeft)-parseFloat(rootStyle.paddingRight));root.style.setProperty('--paper-zoom',String(Math.max(.05,Math.min(1,available/width))));};
 if(data.screenOnly){
  const content=root.querySelector('.page-content')!;
  void content.getBoundingClientRect();
  const images=Array.from(content.querySelectorAll('img'));
  void Promise.all([document.fonts.ready,...images.map(image=>image.decode().catch(()=>{}))]).then(()=>{
   template.content.append(...Array.from(content.childNodes));paginate();document.body.dataset.ready='true';
  });
  return;
 }
 fit();window.addEventListener('resize',fit);
 const assetsReady=Promise.all([document.fonts.ready,...all.flatMap(q=>(q.attachments||[]).map((attachment:any)=>{const image=new Image();image.src=attachment.dataUrl;return image.decode().catch(()=>{});} ))]);
 if(data.preview){void assetsReady.then(()=>{paginate();fit();document.body.dataset.ready='true';});return;}
 window.addEventListener('pagehide',()=>{root.querySelectorAll<HTMLAudioElement>('audio[data-section-audio]').forEach(rememberAudio);save();});
 root.addEventListener('play',event=>{const audio=event.target;if(audio instanceof HTMLAudioElement){if(kind==='exam'&&(!state.startedAt||state.submitted)){audio.pause();return;}root.querySelectorAll<HTMLAudioElement>('audio').forEach(other=>{if(other!==audio)other.pause();});}},true);
 root.addEventListener('input',event=>{const input=event.target as HTMLInputElement|HTMLTextAreaElement;if(input.dataset.selfScore){const q=byId.get(input.dataset.selfScore),value=Number(input.value);if(input.value===''||!Number.isFinite(value)||value<0||value>q.score)return;const a=state.userState.practiceAnswers[q.id];a.score=value;a.correct=value===q.score;schedule(q.id,a.correct);state.userState.practiceMistakes=all.filter(q=>state.userState.practiceAnswers[q.id]?.correct===false).map(q=>q.id);save();const feedback=root.querySelector('[data-feedback="'+CSS.escape(q.id)+'"]>b');if(feedback)feedback.textContent=(a.correct?'正确':'错误')+' · '+a.score+' / '+q.score+' 分';results();return;}if(!input.dataset.qid||state.submitted||!state.startedAt)return;const q=byId.get(input.dataset.qid);let value:any;if(input instanceof HTMLInputElement&&input.type==='radio')value=input.value;else if(input instanceof HTMLInputElement&&input.type==='checkbox'){const selected=new Set(Array.isArray(valueOf(q))?valueOf(q):[]);if(input.checked)selected.add(input.value);else selected.delete(input.value);value=[...selected].sort();}else if(input.dataset.blank!==undefined||input.dataset.part!==undefined){value=[...(Array.isArray(valueOf(q))?valueOf(q):[])];value[Number(input.dataset.blank??input.dataset.part)]=input.value;}else value=input.value;state.userState.practiceAnswers[q.id]={value};save();});
 function showAnswerEvidence(id:string){
  const full=kind==='answers'?byId.get(id):undefined;if(!full)return;
  $('source-title').textContent='第 '+(full.displayNumber??full.number)+' 题 · 来源与核验';const body=$('source-body');body.replaceChildren();
  const append=(tag:string,text:string)=>{const node=document.createElement(tag);node.textContent=text;body.append(node);};
  if(full.answerProvenance?.notes){append('h3','答案说明');append('p',full.answerProvenance.notes);}
  const sources=[{role:'试题来源',source:full.source},...(full.supportingSources??[]).map((item:any)=>({role:({question:'原题依据',knowledge:'知识依据',answer:'答案依据',standard:'规范依据'} as any)[item.role],source:item.source})),...(full.answerProvenance?.sources??[]).map((source:any)=>({role:'参考答案来源',source})),...(full.rubric?.criteria??[]).flatMap((criterion:any)=>(criterion.evidence??[]).map((source:any)=>({role:'评分依据 · '+criterion.description,source})))];
  const seen=new Set<string>();for(const item of sources){const source=item.source,key=item.role+'|'+JSON.stringify(source);if(seen.has(key))continue;seen.add(key);const material=data.materials.find((m:any)=>m.id===source.materialId);append('h3',item.role+' · '+(source.title||material?.title||source.blockId));if(source.page!==undefined)append('p','第 '+source.page+' 页');if(material?.provenance?.version)append('p','版本：'+material.provenance.version);const url=material?.url??material?.provenance?.url;if(url)append('p',url);append('blockquote',source.exact);}
  if(full.verification){append('h3','核验记录 · '+(full.verification.status==='verified'?'已核验':'待核验'));for(const check of full.verification.checks){append('h4',check.method+' · '+({pass:'通过',fail:'未通过',unresolved:'待确认'} as any)[check.result]);append('p',check.detail);if(check.evidence)append('pre',check.evidence);}}
  ($('source-dialog') as HTMLDialogElement).showModal();
 }
 root.addEventListener('click',e=>{const choice=(e.target as HTMLElement).closest<HTMLElement>('[data-select-choice]');if(choice&&!state.submitted&&state.startedAt){const [id,value]=choice.dataset.selectChoice!.split('|'),input=root.querySelector<HTMLInputElement>('input[data-qid="'+CSS.escape(id)+'"][value="'+CSS.escape(value)+'"]');if(input){input.checked=input.type==='checkbox'?!input.checked:true;input.dispatchEvent(new Event('input',{bubbles:true}));}}const evidence=(e.target as HTMLElement).closest<HTMLElement>('[data-answer-evidence]');if(evidence){sourceOpener=evidence;showAnswerEvidence(evidence.dataset.answerEvidence!);}const button=(e.target as HTMLElement).closest<HTMLElement>('[data-source]');if(button){sourceOpener=button;showSource(byId.get(button.dataset.source!));}});
 $('section-navigation').addEventListener('click',e=>{const b=(e.target as HTMLElement).closest<HTMLElement>('[data-select-section]');if(!b)return;state.activeSection=b.dataset.selectSection;save();paginate();controls();window.scrollTo({top:0,behavior:'instant'});});
 $('section-navigation').addEventListener('keydown',e=>{const event=e as KeyboardEvent,buttons=Array.from($('section-navigation').querySelectorAll<HTMLButtonElement>('button')),at=buttons.indexOf(document.activeElement as HTMLButtonElement);if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(at+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;buttons[next].click();buttons[next].focus();});
 $('start-exam')?.addEventListener('click',()=>{state.startedAt=Date.now();save();controls();restoreInputs();say('已开始作答，记录自动保存在本机。');});
 $('submit-exam')?.addEventListener('click',()=>{const missing=all.filter(q=>!answered(q));$('unanswered-summary').textContent=missing.length?'尚未作答：'+missing.map(q=>q.number).join('、')+' 题。确认后不能修改本次作答。':'已完成全部题目。确认后不能修改本次作答。';$('unanswered-summary').classList.toggle('has-unanswered',missing.length>0);root.querySelectorAll<HTMLElement>('[data-question]').forEach(el=>el.classList.toggle('unanswered',missing.some(q=>q.id===el.dataset.question)));($('submit-dialog') as HTMLDialogElement).showModal();});
 $('cancel-submit').addEventListener('click',()=>($('submit-dialog') as HTMLDialogElement).close());$('confirm-submit').addEventListener('click',()=>{($('submit-dialog') as HTMLDialogElement).close();grade();});
 $('preview-print').addEventListener('click',()=>{state.preview=true;document.body.classList.add('print-preview');paginate();controls();say('当前为完整纸张预览，打印题面与空白作答区。');});$('close-preview').addEventListener('click',()=>{state.preview=false;document.body.classList.remove('print-preview');paginate();controls();say('');});$('print-exam').addEventListener('click',()=>window.print());
 $('export-records').addEventListener('click',()=>{const record={schemaVersion:'1.0.0',practiceId:data.practiceId,notebookId:data.notebookId,notebookRevision:data.notebookRevision,userState:state.userState,review:state.review};download(JSON.stringify(record,null,2),'《'+data.title+'》-作答记录.json');say('作答记录已导出。');});
 $('close-source').addEventListener('click',()=>($('source-dialog') as HTMLDialogElement).close());
 $('source-dialog').addEventListener('close',()=>{if(sourceOpener?.isConnected)sourceOpener.focus();sourceOpener=null;});
 $('answer-file').addEventListener('change',async e=>{const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;try{const text=await file.text(),doc=file.name.endsWith('.html')?new DOMParser().parseFromString(text,'text/html'):null,incoming=JSON.parse(doc?.querySelector('#practice-data')?.textContent||text);if((incoming.practiceId!==data.practiceId&&incoming.practiceId!==data.checkPracticeId)||incoming.notebookRevision!==data.notebookRevision)throw Error('答案卷与本试卷的 ID 或笔记版本不一致。');const incomingQuestions=incoming.sections?.flatMap((s:any)=>s.questions)||[];for(const q of all){const match=incomingQuestions.find((x:any)=>x.id===q.id);if(!match||match.number!==q.number||match.prompt!==q.prompt||typeof match.explanation!=='string'||!(typeof match.solution==='string'||Array.isArray(match.solution))||digest(normalize(q.type==='multiple'&&Array.isArray(match.solution)?match.solution.slice().sort():match.solution)+'\0'+(data.checkPracticeId||data.practiceId)+'\0'+q.id)!==q.check)throw Error('第 '+q.number+' 题答案与题目不匹配。');}answerKey=incoming;if(doc)answerKey.answerHTML=text;regradePartialSelections();paginate();results();say('答案卷已导入，解析仅在本机显示。');}catch(error){say(error instanceof Error?error.message:'无法读取答案卷。');}finally{(e.target as HTMLInputElement).value='';}});
 const tick=()=>{if(kind!=='exam')return;const remain=state.submitted?0:state.startedAt?Math.max(0,Math.ceil((state.startedAt+data.durationMinutes*60000-Date.now())/1000)):data.durationMinutes*60;$('exam-timer').textContent=state.submitted?'已交卷':`${String(Math.floor(remain/60)).padStart(2,'0')}:${String(remain%60).padStart(2,'0')}`;if(state.startedAt&&!state.submitted&&remain===0){grade();say('考试时间结束，已自动交卷。');}};
 let previewBeforePrint:boolean|undefined;
 window.addEventListener('beforeprint',()=>{previewBeforePrint??=state.preview;state.preview=true;document.body.classList.add('print-preview');paginate();controls();});
 window.addEventListener('afterprint',()=>{if(previewBeforePrint===undefined)return;state.preview=previewBeforePrint;previewBeforePrint=undefined;document.body.classList.toggle('print-preview',state.preview);paginate();controls();});

 void assetsReady.then(()=>{paginate();controls();if(state.submitted)results();tick();document.body.dataset.ready='true';});setInterval(tick,1000);
}
