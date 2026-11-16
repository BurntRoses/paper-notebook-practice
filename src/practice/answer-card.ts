import type {PracticeDocument,PracticeQuestion} from './model';
import type {PaperTemplateLayout} from './templates';

/** Blank identity labels become measured writing fields; literal source rows remain intact. */
export function candidateIdentityMarkup(fields:string[],e:(value:unknown)=>string,options:{digits?:number;english?:boolean}={}){
 const known=/^(?:姓名|学校|班级|学号|考号|准考证号|报考单位|报考专业|报考院校|考点|考场|考场号|座号|座位号|专业|单位|Name|Candidate name|Candidate number|Candidate No\.?|Student (?:ID|number)|Class|School|Institution|Course|Registration (?:No\.?|number))$/i;
 const entries=fields.flatMap<{label:string}|{raw:string}>(line=>{
  const trimmed=line.trim();
  if(known.test(trimmed))return [{label:trimmed}];
  const matches=[...line.matchAll(/([^_＿:：\n]+?)[:：]\s*[_＿]{2,}/g)];
  if(matches.length&&line.replace(/([^_＿:：\n]+?)[:：]\s*[_＿]{2,}/g,'').trim()===''&&matches.every(m=>known.test(m[1].trim())))return matches.map(m=>({label:m[1].trim()}));
  return [{raw:line}];
 });
 return `<div class="candidate-identity${options.english?' candidate-identity-latin':''}">${entries.map(entry=>{
  if('raw'in entry)return `<div class="candidate-identity-original">${e(entry.raw)}</div>`;
  const label=entry.label,number=/准考证号|考号|Candidate (?:number|No\.?)|Registration (?:No\.?|number)/i.test(label),wide=/单位|院校|学校|专业|School|Institution|Course/i.test(label),digits=number&&options.digits;
  return `<div class="candidate-field${wide?' candidate-field-wide':''}${digits?' candidate-field-number':''}" data-candidate-field="${e(label)}"><span class="candidate-field-label">${e(label)}${options.english?':':'：'}</span>${digits?`<span class="candidate-number-cells" style="--candidate-digits:${digits}" aria-hidden="true">${Array.from({length:digits},()=>'<i></i>').join('')}</span>`:'<span class="candidate-field-line" aria-hidden="true"></span>'}</div>`;
 }).join('')}</div>`;
}

/** Dedicated answer papers: the source paper's margins and question gaps never leak into a card. */
export function makeAnswerCard(practice:PracticeDocument,source:PaperTemplateLayout,e:(value:unknown)=>string){
 const config=practice.presentation?.answerCard;
 const cet=/^real-cet[46]-/.test(practice.practiceId)||config?.template==='cet';
 const english=practice.presentation?.language==='en'||['ielts','language'].includes(source.headerVariant);
 const boxed=config?.template==='boxed'||(!config&&!cet&&english);
 const essayGrid=config?.template==='essay-grid';
 const university=config?.template==='university'||(!config&&!cet&&!boxed&&(source.headerVariant==='university'||/^real-(pku|ecnu|ustc|zju)/.test(practice.practiceId)));
 const style=cet?'cet':boxed?'boxed':university?'university':config?.template??'school';
 const layout:PaperTemplateLayout={...source,widthMm:boxed?source.widthMm:undefined,heightMm:boxed?source.heightMm:undefined,paperSize:university?'A3':'A4',orientation:university?'landscape':'portrait',columns:1,marginTopMm:boxed?25.4:university?10:essayGrid?17:12,marginBottomMm:boxed?25.4:university?10:essayGrid?17:12,marginLeftMm:boxed?25.4:university?12:essayGrid?12:14,marginRightMm:boxed?25.4:university?12:essayGrid?12:14,showSeal:false,fontSize:10.5,lineHeight:1.5};
 const all=practice.sections.flatMap(s=>s.questions);
 const attributes=(q:PracticeQuestion)=>`data-question="${e(q.id)}" data-number="${q.number}" data-score="${q.score}"`;
 const anchors=(questions:PracticeQuestion[])=>questions.map(q=>`<span class="card-question-anchor" hidden ${attributes(q)}></span>`).join('');
 const label=(q:PracticeQuestion)=>e(q.displayNumber||q.origin?.number||q.number);
 const constraints=(q:PracticeQuestion)=>{const r=q.responseConstraints;if(!r)return '';const unit=r.countUnit==='words'?'词':'字';return r.minWords&&r.maxWords?`${r.minWords}—${r.maxWords} ${unit}`:r.maxWords?`不超过 ${r.maxWords} ${unit}`:r.minWords?`不少于 ${r.minWords} ${unit}`:'';};
 const responseLineCount=(q:PracticeQuestion)=>q.answerRows??(q.responseConstraints?.countUnit==='words'&&q.responseConstraints.maxWords?Math.max(10,Math.ceil(q.responseConstraints.maxWords/8)):Math.max(5,Math.ceil(q.score*.75)));
 const digits=config?.candidateDigits??(cet?15:14);
 const bubble=(text:string)=>`<span class="bubble">${e(text)}</span>`;
 const idGrid=(title='准考证号',count=digits)=>`<div class="card-id-grid" data-card-id-type="${e(title)}" style="--id-digits:${count}"><b>${e(title)}</b><div class="id-writing">${Array.from({length:count},()=>'<span></span>').join('')}</div><div class="id-bubbles">${Array.from({length:count},()=>`<div>${Array.from({length:10},(_,i)=>bubble(String(i))).join('')}</div>`).join('')}</div></div>`;
 const marks='<div class="card-registration registration-top"></div><div class="card-registration registration-right"></div>';
 const candidate=()=>`<div class="card-candidate"><div class="card-person"><div>学校：</div><div>姓名：</div><div class="card-fill-example"><b>填涂<br>要求</b><span>正确填涂方式<br><i class="filled-bubble"></i><br>错误填涂方式<br>×　√　／　○</span></div></div><div class="card-barcode"><p>请将试题册背面条形码粘贴条<br>揭下后粘贴到以下框内</p><div>条形码粘贴区<br>请勿在框内涂写</div></div>${idGrid()}</div>`;
 let content='';
 if(cet){
  const band=/cet[-_]?6|Band\s*6|六级/i.test(practice.practiceId+' '+practice.title+' '+practice.exam?.specificationId)?'六':'四';
  const inPart=(name:string)=>practice.sections.filter(s=>(s.examPartId??s.title).toLowerCase().includes(name)).flatMap(s=>s.questions);
  const writingQuestions=inPart('writing'),translationQuestions=inPart('translation');
  const listening=practice.sections.filter(s=>s.listeningOnly||/listening/i.test(s.examPartId??s.title)).flatMap(s=>s.questions),reading=inPart('reading');
  const complete=all.length===57&&writingQuestions.length===1&&translationQuestions.length===1&&listening.length===25&&reading.length===30;
  if(complete){
   const writing=writingQuestions[0],translation=translationQuestions[0];
   const questionAttributes=(q:PracticeQuestion)=>`${attributes(q)} data-question-id="${e(q.id)}"`;
   const fullMarks=(back:boolean)=>`<div class="card-registration registration-top"></div><div class="card-registration registration-${back?'left':'right'}"></div><div class="card-registration registration-bottom"></div>`;
   const part=(part:string,name:string,minutes:number)=>`<h2 class="card-part"><span>Part ${part}</span><b>${name}</b><span>(${minutes} minutes)</span></h2>`;
   const penNote=(name:string)=>`<p class="card-pen-note">必须使用黑色字迹签字笔书写。非${name}答题内容或超出以下红色矩形边框限定区域的作答均为无效。</p>`;
   const ruled=(name:string,start:string,extraClass='')=>`<div class="card-ruled-area${extraClass?' '+extraClass:''}"><div class="card-rule-lines">${Array.from({length:40},()=>'<span></span>').join('')}</div><span class="card-area-watermark">${name}</span>${start?`<span class="card-writing-start">${start}</span>`:''}</div>`;
   const bottom=(card:number,side:string)=>`<div class="card-bottom-code">中国大学英语四、六级考试委员会监制<span>答题卡 ${card} · ${side}</span></div>`;
   const page=(side:string,back:boolean,body:string,q?:PracticeQuestion)=>`<article class="paper-chunk answer-card-page cet-card cet-complete-card${back?' cet-card-back':''}${side==='card-2-back'?' cet-translation-card':''}" data-cet-side="${side}" data-break-before="${side!=='card-1-front'}"${q?' '+questionAttributes(q):''}>${fullMarks(back)}${body}</article>`;
   const choiceRow=(q:PracticeQuestion)=>`<div class="cet-choice-row" ${questionAttributes(q)}><b>${label(q).replace(/[.．]$/,'')}</b>${(q.options??[]).map(o=>bubble(o.id)).join('')}</div>`;
   const columns=(qs:PracticeQuestion[],className:string)=>`<div class="${className}">${Array.from({length:Math.ceil(qs.length/5)},(_,i)=>`<div class="cet-choice-column">${qs.slice(i*5,i*5+5).map(choiceRow).join('')}</div>`).join('')}</div>`;
   const readingCandidate=()=>`<div class="card-candidate cet-reading-candidate"><div class="card-person"><div>学校：</div><div>姓名：</div></div><div class="cet-reading-fill"><b>填涂要求</b><span>正确填涂方式</span><i class="filled-bubble"></i><span>错误填涂方式</span><small>×　√　／　○</small></div>${idGrid()}</div>`;
   const words=practice.sections.filter(s=>s.format==='word-bank'||/reading-words/.test(s.examPartId??'')).flatMap(s=>s.questions);
   const matching=practice.sections.filter(s=>s.format==='paragraph-matching'||/reading-matching/.test(s.examPartId??'')).flatMap(s=>s.questions);
   const detail=reading.filter(q=>!words.includes(q)&&!matching.includes(q));
   content=page('card-1-front',false,`<h1>全国大学英语${band}级考试答题卡1</h1>${candidate()}${part('I','Writing',30)}<p class="card-direction">（请于正式开考后半小时内完成该部分，之后将进行听力考试！）</p>${penNote('作文')}${ruled('Writing','作文题从此处开始作答')}<p class="cet-continue-notice">请接背面继续作答　➜</p>${bottom(1,'正面')}`,writing)
    +page('card-1-back',true,`<h1>答题卡1</h1>${penNote('作文')}${ruled('Writing','','cet-writing-continuation')}${part('II','Listening Comprehension',band==='六'?30:25)}<p class="cet-listening-notice">听力录音播放完毕后，监考员将立即回收此卡。</p>${columns(listening,'cet-listening-grid')}<div class="cet-no-answer">此处请勿作答</div>${bottom(1,'背面')}`)
    +page('card-2-front',false,`<h1>全国大学英语${band}级考试答题卡2</h1>${readingCandidate()}${part('III','Reading Comprehension',40)}<div class="cet-reading-grid"><div class="cet-word-rows">${words.map(choiceRow).join('')}</div><div class="cet-matching-rows">${matching.map(choiceRow).join('')}</div>${columns(detail,'cet-detail-grid')}</div>${bottom(2,'正面')}`)
    +page('card-2-back',true,`<h1>答题卡2</h1>${part('IV','Translation',30)}${penNote('翻译')}${ruled('Translation','翻译题从此处开始作答')}${bottom(2,'背面')}`,translation);
  }else content=all.map((q,i)=>{
   const writing=/writ|写作/i.test(q.chapter+' '+practice.sections.find(s=>s.questions.includes(q))?.title),name=writing?'Writing':'Translation',part=writing?'I':'IV',card=writing?'1':'2';
   return `<article class="paper-chunk answer-card-page cet-card${writing?'':' cet-translation-card'}" data-break-before="${i>0}" ${attributes(q)}>${marks}<h1>${writing?`全国大学英语${band}级考试答题卡${card}`:`答题卡${card}`}</h1>${writing?candidate():''}<h2 class="card-part"><span>Part ${part}</span><b>${name}</b><span>(30 minutes)</span></h2>${writing?'<p class="card-direction">（请于正式开考后半小时内完成该部分，之后将进行听力考试！）</p>':''}<p class="card-pen-note">必须使用黑色字迹签字笔书写。非${writing?'作文':'翻译'}答题内容或超出以下红色矩形边框限定区域的作答均为无效。</p><div class="card-ruled-area"><div class="card-rule-lines">${Array.from({length:40},()=>'<span></span>').join('')}</div><span class="card-area-watermark">${name}</span><span class="card-writing-start">${writing?'作文':'翻译'}题从此处开始作答</span></div><div class="card-bottom-code">中国大学英语四、六级考试委员会监制<span>答题卡 ${card}</span></div></article>`;
  }).join('');
 }else if(essayGrid){
  let face=0;
  for(const q of all){
   const r=q.responseConstraints,grid=r?.countUnit!=='words'&&r?.answerStyle!=='ruled'&&r?.answerStyle!=='blank'&&r?.answerStyle!=='boxed'&&['response','task'].includes(q.type);
   const capacity=grid?(r?.maxWords??Math.max(600,r?.minWords??0,(q.answerRows??0)*25)):0;
   const totalRows=grid?Math.ceil(capacity/25):Math.max(10,responseLineCount(q));
   let startRow=0,part=0;
   do{
    const rows=Math.min(part?28:24,totalRows-startRow),first=part===0;
    const heading=first?`<header class="essay-card-heading"><h1>${e(config?.title??practice.title)}</h1><h2>答题纸</h2><div class="essay-card-candidate">${candidateIdentityMarkup(['姓名','准考证号'],e,{digits:config?.candidateDigits})}</div><p>请在指定区域内作答，勿在边框外书写。</p></header>`:`<header class="essay-card-continuation"><span>${e(config?.title??practice.title)} · 答题纸</span><div class="essay-continuation-identity">${candidateIdentityMarkup(['姓名'],e)}</div></header>`;
    const gridRows=grid?Array.from({length:rows},(_,row)=>{const index=(startRow+row)*25,cells=Math.min(25,capacity-index);return `<div class="essay-grid-row" data-row-start="${index+1}" data-row-end="${index+cells}">${Array.from({length:cells},(_,i)=>`<span class="essay-grid-cell" data-cell="${index+i+1}"></span>`).join('')}<span class="essay-grid-count">${index+cells}</span></div>`;}).join(''):'';
    const area=grid?`<div class="essay-character-grid" data-capacity="${Math.min(rows*25,capacity-startRow*25)}">${gridRows}</div>`:['choice','multiple','truefalse'].includes(q.type)?`<div class="essay-card-objective">${(q.options??[]).map(o=>bubble(o.id)).join('')}</div>`:q.type==='blank'?`<div class="essay-card-blanks">${Array.from({length:Array.isArray(q.solution)?q.solution.length:1},()=>'<i></i>').join('')}</div>`:`<div class="essay-card-ruled" style="--answer-lines:${rows};height:${rows*7}mm">${Array.from({length:rows},()=>'<span></span>').join('')}</div>`;
    content+=`<article class="paper-chunk answer-card-page essay-card${first?'':' essay-card-continued'}" data-break-before="${face>0}" ${first?attributes(q):`data-question-continuation="${e(q.id)}"`} data-answer-part="${part}">${heading}<div class="essay-card-task"><b>第 ${label(q)} 题${first?'':'（续）'}</b><span>${constraints(q)?e(constraints(q))+'　':''}（${q.score} 分）</span></div>${area}<p class="essay-card-foot">${startRow+rows<totalRows?'请接下页继续作答':'本题作答区域结束'}</p></article>`;
    startRow+=rows;part++;face++;
   }while(startRow<totalRows);
  }
 }else if(boxed){
  content=`<header class="paper-chunk boxed-card-heading"><h1>${e(config?.title??practice.title)}</h1><p>Answer Sheet</p>${candidateIdentityMarkup(['Name','Candidate number'],e,{digits:config?.candidateDigits,english:true})}${source.headerVariant==='ielts'?'<small>Instructions to candidates: Write your answers in the spaces provided.</small>':''}</header>`;
  for(const q of all){
   if(['choice','multiple','truefalse'].includes(q.type))content+=`<div class="paper-chunk boxed-card-choice" ${attributes(q)}><b>${label(q)}</b>${(q.options??[]).map(o=>bubble(o.id)).join('')}</div>`;
   else if(q.type==='blank')content+=`<div class="paper-chunk boxed-card-blank" ${attributes(q)}><b>${label(q)}</b>${Array.from({length:Array.isArray(q.solution)?q.solution.length:1},()=>'<i></i>').join('')}</div>`;
   else content+=`<article class="paper-chunk boxed-card-question" ${attributes(q)}><b>${label(q)}</b>${q.options?.length?`<div class="card-response-options">${q.options.map(o=>bubble(o.id)).join('')}</div>`:''}<div class="boxed-card-area" style="height:${q.answerBoxMm??Math.max(45,q.score*3)}mm"></div></article>`;
  }
 }else if(university){
  const institution=practice.title.match(/^(.+?大学)/)?.[1]??source.institution;
  const title=config?.title??`${institution||'本科生'}${institution?'本科生':''}考试答题纸`;
  const pages=config?.pages??2;
  const cells=practice.sections.map(s=>s.displayLabel?.replace(/[、.\s]/g,'')||s.title);
  const table=`<table class="university-card-score"><tbody><tr><th>题目</th>${cells.map(s=>`<td>${e(s)}</td>`).join('')}<td>总分</td></tr><tr><th>得分</th>${cells.map(()=>'<td></td>').join('')}<td></td></tr><tr><th>阅卷人</th>${cells.map(()=>'<td></td>').join('')}<td></td></tr></tbody></table>`;
  content=Array.from({length:pages},(_,i)=>`<article class="paper-chunk answer-card-page university-card" data-break-before="${i>0}">${i===0?anchors(all):''}<div class="university-card-seal"><span>专业：________________　班级：________________　学号：________________　姓名：________________</span><b>装　订　线</b><small>请勿在密封线内答题</small></div><div class="university-card-halves"><section class="university-card-half">${i===0?`<h1>${e(title)}</h1>${table}<div class="university-card-instructions"><div><b>注意事项</b><ol><li>考生须在试题指定的答题纸上作答。</li><li>在答题纸上写清试卷题号及答案。</li><li>用黑色或蓝色字迹的钢笔、签字笔作答。</li><li>答案不得超过装订线及答题纸边框。</li><li>考试结束后，将试卷和答题纸一并交回。</li></ol></div><p>课程代码：__________________<br><br>课程名称：__________________</p></div>`:''}<div class="university-blank-area"></div><p class="university-card-footer">第 ${i*2+1} 页，共 ${pages*2} 页</p></section><section class="university-card-half"><div class="university-blank-area"></div><p class="university-card-footer">第 ${i*2+2} 页，共 ${pages*2} 页</p></section></div></article>`).join('');
 }else{
  const title=config?.title??practice.title;
  const fields=['学校','姓名','考场','座位号'].map(name=>`<div class="school-card-field" data-candidate-field="${name}"><span>${name}：</span><i aria-hidden="true"></i></div>`).join('');
  content=`<header class="paper-chunk school-card-heading"><h1>${e(title)}</h1><h2>答题卡</h2><div class="school-card-info"><div class="school-card-fields">${fields}</div><div class="school-card-barcode">条形码粘贴区</div></div><div class="school-card-notices"><b>注意事项</b><ol><li>填写学校、姓名、考场、座位号；在下方对应栏填写、填涂准考证号、考场号和座位号，核对条形码。</li><li>选择题及号码栏用2B铅笔填涂；非选择题用黑色字迹签字笔在指定区域内作答。</li><li>保持答题卡平整、清洁，请勿折叠。缺考标记由监考员填涂。</li></ol></div><div class="school-card-mark-examples"><span><b>填涂样例</b>　正确填涂 <i class="filled-bubble"></i></span><span>缺考标记 □　<small>（由监考员填涂）</small></span></div><div class="school-card-identification">${idGrid()}${idGrid('考场号',config?.roomDigits??3)}${idGrid('座位号',config?.seatDigits??2)}</div></header>`;
  for(const section of practice.sections){
   content+=`<div class="paper-chunk card-section-title"><b>${e(section.displayLabel??'')}${e(section.title)}</b><span>（${section.score}分）</span></div>`;
   const objective=section.questions.filter(q=>['choice','multiple','truefalse'].includes(q.type));
   if(objective.length)content+=`<div class="paper-chunk card-objective-grid">${Array.from({length:Math.ceil(objective.length/5)},(_,i)=>`<div class="card-objective-column">${objective.slice(i*5,i*5+5).map(q=>`<div class="card-objective-row" ${attributes(q)}><b>${label(q)}</b>${(q.options??[]).map(o=>bubble(q.type==='truefalse'?(o.id==='TRUE'?'T':o.id==='FALSE'?'F':o.id):o.id)).join('')}</div>`).join('')}</div>`).join('')}</div>`;
   for(const q of section.questions.filter(q=>!['choice','multiple','truefalse'].includes(q.type))){
    if(q.type==='blank'){
     const count=Array.isArray(q.solution)?q.solution.length:1;
     const numbers=[...q.prompt.matchAll(/(?:^|\n)\s*[（(](\d+)[）)]/g)].map(m=>m[1]);
     const grouped=numbers.length>0&&count%numbers.length===0;
     const blanks=grouped?numbers.map(n=>`<span>（${e(n)}）${Array.from({length:count/numbers.length},()=>'<i></i>').join('')}</span>`).join(''):Array.from({length:count},()=>'<span><i></i></span>').join('');
     content+=`<div class="paper-chunk card-blank-question" ${attributes(q)}><b>${label(q)}</b><div>${blanks}</div></div>`;
    }else{
     const rows=Math.max(1,Math.ceil(responseLineCount(q)/5)),ruled=q.responseConstraints?.answerStyle==='ruled'||q.responseConstraints?.countUnit==='words'||style==='ruled';
     for(let i=0;i<rows;i++)content+=`<div class="paper-chunk card-response-question${ruled?' card-response-ruled':''}" ${i?`data-question-continuation="${e(q.id)}"`:attributes(q)}><b>${label(q)}${i?'（续）':''}</b>${!i&&constraints(q)?`<span class="card-response-limit">${e(constraints(q))}</span>`:''}${!i&&q.options?.length?`<div class="card-response-options">${q.options.map(o=>bubble(o.id)).join('')}</div>`:''}<div class="card-response-area"></div></div>`;
    }
   }
  }
  content+='<p class="paper-chunk card-end-note">请在各题目的答题区域内作答，超出黑色矩形边框限定区域的答案无效。</p>';
 }
 return {content,layout,style};
}
