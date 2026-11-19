import {evidenceAllowed,questionEvidenceIds} from './evidence';
import {PRACTICE_TYPE_NAMES,type PracticeDocument,type PracticeQuestion,type PracticeSection,type PracticeStyle,type PracticeMaterial,PracticePresentation,type PracticeSourcePolicy} from './model';
import { stablePracticeId } from './materials';

export interface BankFilter {search?:string;chapter?:string;type?:PracticeQuestion['type'];difficulty?:PracticeQuestion['difficulty'];tags?:string[]}
export interface AssembleOptions extends BankFilter {title:string;subject:string;level:string;count:number;durationMinutes:number;seed?:string;targetScore?:number;mode?:'mock'|'bank';notebookId?:string;notebookRevision?:number;materials:PracticeMaterial[];style?:PracticeStyle;sourceSections?:PracticeSection[];sourceDocument?:PracticeDocument;presentation?:PracticePresentation;balanceChoices?:boolean;sourcePolicy?:PracticeSourcePolicy;questionPreference?:'originals-first'|'balanced'|'generated-first'}

/** Recomposition keeps source conditions and numbering, but replaces source-specific totals. */
type PaperMetadataReference=Pick<PracticeDocument,'title'|'subject'|'level'|'durationMinutes'|'mode'|'totalScore'|'style'|'presentation'>&{
 sections:(Pick<PracticeSection,'id'|'title'>&{questions:Pick<PracticeQuestion,'id'|'score'|'type'>[]})[];
};
export function refreshPracticeMetadata(paper:PracticeDocument,reference:PaperMetadataReference):PracticeDocument{
 const sameQuestions=(left:PaperMetadataReference['sections'][number]['questions'],right:typeof left)=>left.length===right.length&&left.every((q,i)=>q.id===right[i].id&&q.score===right[i].score&&q.type===right[i].type);
 const current=paper.sections.flatMap(s=>s.questions),previous=reference.sections.flatMap(s=>s.questions);
 const actualTotal=paper.sections.reduce((total,s)=>total+s.questions.reduce((sum,q)=>sum+q.score,0),0);
 const sectionStructure=(sections:PaperMetadataReference['sections'])=>JSON.stringify(sections.map(s=>[s.id,s.title,s.questions.map(q=>q.id)]));
 const changed=paper.title!==reference.title||paper.subject!==reference.subject||paper.level!==reference.level||paper.durationMinutes!==reference.durationMinutes||paper.mode!==reference.mode||paper.totalScore!==reference.totalScore||Math.abs(actualTotal-paper.totalScore)>1e-7||!sameQuestions(current,previous)||sectionStructure(paper.sections)!==sectionStructure(reference.sections);
 const snapshotChanged=paper.original&&(changed||JSON.stringify(paper.sections)!==JSON.stringify(reference.sections)||JSON.stringify(paper.style)!==JSON.stringify(reference.style)||JSON.stringify(paper.presentation)!==JSON.stringify(reference.presentation));
 if(!changed){if(snapshotChanged&&paper.original){const detached=structuredClone(paper);delete detached.original;return detached;}return paper;}
 const result=structuredClone(paper);delete result.original;if(result.exam&&(paper.mode==='bank'||!sameQuestions(current,previous)||sectionStructure(paper.sections)!==sectionStructure(reference.sections)||paper.durationMinutes!==reference.durationMinutes||Math.abs(actualTotal-reference.totalScore)>1e-7))result.exam.scope='subset';const english=result.presentation?.language==='en';
 const countsOrScores=/(?:\d+(?:\.\d+)?\s*(?:分|题|小题|道|points?\b|questions?\b)|第\s*[\d一二三四五六七八九十]+\s*(?:题|小题)|Questions?\s+\d)/i;
 const sectionInstructions=(section:PracticeSection)=>{
  const types=new Set(section.questions.map(q=>q.type));
  if(english){if([...types].every(t=>['choice','multiple','truefalse'].includes(t)))return 'Choose the answer or answers required by each question.';if(types.size===1&&types.has('blank'))return 'Write your answers in the blanks.';return 'Answer each selected question according to its directions.';}
  if([...types].every(t=>['choice','multiple','truefalse'].includes(t)))return '按各题要求选择答案。';
  if(types.size===1&&types.has('blank'))return '将答案填写在对应横线上。';
  return '按各题要求作答，写出必要的推理、计算或论述过程。';
 };
 const oldQuestions=new Map(previous.map(q=>[q.id,q]));let sectionChanged=false;
 for(const section of result.sections){
  const original=reference.sections.find(s=>s.id===section.id),altered=!original||section.title!==original.title||!sameQuestions(section.questions,original.questions);
  section.score=section.questions.reduce((sum,q)=>sum+q.score,0);
  for(const q of section.questions){const old=oldQuestions.get(q.id);if(!old||q.score!==old.score)delete q.scoreLabel;}
  if(!altered)continue;
  sectionChanged=true;delete section.scoreLabel;
  // Some original papers put their counts in the heading rather than scoreLabel.
  section.title=section.title.replace(/[（(]([^（）()]*)[）)]/g,(whole,inside:string)=>countsOrScores.test(inside)?'':whole).trim()||([...new Set(section.questions.map(q=>PRACTICE_TYPE_NAMES[q.type]))].join('与'));
  if(countsOrScores.test(section.instructions)&&!section.stimulus&&!section.format&&!section.listeningOnly)section.instructions=sectionInstructions(section);
 }
 result.totalScore=result.sections.reduce((sum,s)=>sum+s.score,0);
 if(result.presentation){
  const p=result.presentation;p.titleLines=[result.title];delete p.headerRows;delete p.scoreColumns;
  p.subtitle='';
  p.metaLines=[english?`${current.length} questions · ${result.durationMinutes} minutes · Total: ${result.totalScore} points`:`共 ${current.length} 题　考试时间：${result.durationMinutes} 分钟　满分：${result.totalScore} 分`];
  p.notices=(p.notices??[]).filter(text=>!countsOrScores.test(text));
  if(p.footerTemplate)p.footerTemplate=english?'{title} · Page {page} of {pages}':'{title}　第 {page} 页，共 {pages} 页';
  delete p.sourcePageNumbers;delete p.sourcePageCount;
  if(sectionChanged)p.sectionDetails=true;
 }
 return result;
}
export function filterQuestionBank(questions:PracticeQuestion[],filter:BankFilter={}):PracticeQuestion[]{
 const search=filter.search?.trim().toLocaleLowerCase();return questions.filter(question=>(!filter.chapter||question.chapter===filter.chapter)&&(!filter.type||question.type===filter.type)&&(!filter.difficulty||question.difficulty===filter.difficulty)&&(!filter.tags?.length||filter.tags.every(tag=>question.tags?.includes(tag)))&&(!search||[question.prompt,question.chapter,...(question.tags||[])].join('\n').toLocaleLowerCase().includes(search)));
}
export function deduplicateQuestions(questions:PracticeQuestion[],contexts:ReadonlyMap<string,string>=new Map()):{questions:PracticeQuestion[];duplicates:PracticeQuestion[]}{
 const seen=new Set<string>(),ids=new Set<string>();const unique:PracticeQuestion[]=[],duplicates:PracticeQuestion[]=[];
 for(const question of questions){
  const key=JSON.stringify([question.type,question.prompt.replace(/\s+/g,' ').trim(),question.options,question.solution,question.score,contexts.get(question.id),question.attachments?.map(attachment=>attachment.dataUrl)]);
  if(seen.has(key)||ids.has(question.id))duplicates.push(question);else{seen.add(key);ids.add(question.id);unique.push(question);}
 }
 return {questions:unique,duplicates};
}
function seededRandom(seed:string){let value=2166136261;for(const char of seed)value=Math.imul(value^char.charCodeAt(0),16777619);return ()=>{value+=0x6D2B79F5;let t=Math.imul(value^value>>>15,1|value);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};}
function shuffled<T>(items:T[],random:()=>number){const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
function chooseConstrained(candidates:PracticeQuestion[],count:number,target:number|undefined,preference:AssembleOptions['questionPreference'],required:string[]=[],evidence=new Map<string,Set<string>>()):PracticeQuestion[]{
 if(target!==undefined&&(!Number.isFinite(target)||target<=0))throw new Error('目标总分必须大于 0。');
 if(target!==undefined&&Math.abs(target*100-Math.round(target*100))>1e-7)throw new Error('目标总分最多保留两位小数。');
 if(target!==undefined&&candidates.some(question=>Math.abs(question.score*100-Math.round(question.score*100))>1e-7))throw new Error('题目分值最多保留两位小数。');
 const prefer=preference&&preference!=='balanced';
 const preferenceCost=(indices:number[])=>indices.reduce((sum,index)=>{const kind=candidates[index].origin?.kind;const preferred=preference==='generated-first'?'generated':'original';return sum+(kind===preferred?0:count+1)+(kind==='adapted'?0:kind===preferred?0:1);},0);
 const goal=target===undefined?0:Math.round(target*100),allMask=(1n<<BigInt(required.length))-1n;
 const masks=candidates.map(q=>required.reduce((mask,id,i)=>evidence.get(q.id)?.has(id)?mask|(1n<<BigInt(i)):mask,0n));
 for(const id of required)if(!candidates.some(q=>evidence.get(q.id)?.has(id)))throw Error('/sourcePolicy/requiredMaterialIds: no eligible question uses required material '+id);
 let states=new Map<string,{indices:number[];mask:bigint;n:number;total:number}>([['0:0:0',{indices:[],mask:0n,n:0,total:0}]]);
 for(let i=0;i<candidates.length;i++){
  const score=target===undefined?0:Math.round(candidates[i].score*100),next=new Map(states);
  for(const state of states.values()){
   if(state.n>=count||state.total+score>goal)continue;
   const mask=state.mask|masks[i],n=state.n+1,total=state.total+score,key=`${n}:${total}:${mask}`,indices=[...state.indices,i],previous=next.get(key);
   if(!previous||(prefer&&preferenceCost(indices)<preferenceCost(previous.indices)))next.set(key,{indices,mask,n,total});
  }
  states=next;const result=states.get(`${count}:${goal}:${allMask}`);
  if(result&&!prefer)return result.indices.map(index=>candidates[index]);
  if(states.size>150000)throw new Error('当前题数、目标分数与必用材料组合过多，请缩小范围或分题组组卷。');
 }
 const best=states.get(`${count}:${goal}:${allMask}`);if(best)return best.indices.map(index=>candidates[index]);
 throw new Error(`现有题目无法同时满足 ${count} 题${target===undefined?'':`、${target} 分`}${required.length?'及全部必用材料':''}。请调整题数、范围或目标分值；题目原始分值未被改写。`);
}
/** Reorder option labels in a new mock only; the source bank remains untouched. */
export function balanceChoiceAnswers(questions:PracticeQuestion[],seed='paper-notebook'):PracticeQuestion[]{
 const dependsOnOrder=/(?:选项|答案)\s*[A-D]|[A-D]\s*(?:和|与|、|及|或|and\b|or\b|&)\s*[A-D]|(?:all|none)\s+of\s+(?:the\s+)?(?:above|other)|(?:both|either)\s+[A-D]|以上(?:选项|各项|均|都|全|皆)|以上$|上述(?:选项|各项|说法|结论)|上述$|前[两二三四]项|其他(?:选项|三项)|[A-D]\s*项/i;
 const dependent=questions.find(question=>question.type==='choice'&&question.options?.length===4&&question.options?.some(option=>dependsOnOrder.test(option.text)));
 if(dependent)throw new Error(`第 ${dependent.number} 题的选项相互引用，不能直接重排字母。请保留为全量题库，或先将选项改为独立表述后组模拟卷。原题未修改。`);
 const random=seededRandom(seed);const choices=questions.filter(question=>question.type==='choice'&&question.options?.length===4&&'ABCD'.split('').every(id=>question.options?.some(option=>option.id===id)));const targets=shuffled(choices.map((_,i)=>'ABCD'[i%4]),random);let index=0;
 return questions.map(question=>{const copy=structuredClone(question);if(!choices.some(question=>question.id===copy.id))return copy;const solution=Array.isArray(copy.solution)?copy.solution[0]:copy.solution;const original=copy.options?.find(option=>option.id===solution);if(!original||copy.options?.length!==4)throw new Error(`题目 ${copy.number} 的单选答案或选项不完整。`);const target=targets[index++];const distractors=shuffled(copy.options.filter(option=>option.id!==solution),random);let distractor=0;const mapping=new Map<string,string>();copy.options=[...'ABCD'].map(id=>{const old=id===target?original:distractors[distractor++];mapping.set(old.id,id);return {id:id as 'A'|'B'|'C'|'D',text:old.text};});copy.solution=target;
 // Map each original option identity, including equal distractor text; replace labels once.
 const relabel=(text:string)=>text.replace(/((?:选项|答案(?:为|是)?|应选|故选|选择)\s*)([A-D])(?![A-Za-z])|\b([A-D])(?=\s*(?:项|选项|正确|错误|符合|不符))/g,(_,prefix,id,bare)=>(prefix??'')+mapping.get(id??bare));
 copy.explanation=relabel(copy.explanation);
 if(copy.rubric)copy.rubric.criteria.forEach(c=>c.description=relabel(c.description));
 if(copy.origin?.kind==='original')copy.origin={...copy.origin,kind:'adapted'};
 if(copy.answerProvenance){copy.answerProvenance={...copy.answerProvenance,kind:'independent',notes:[copy.answerProvenance.notes,'选项已重排，答案字母由实际选项内容重新映射（原→本卷）：'+[...mapping].map(([a,b])=>a+'→'+b).join('、')].filter(Boolean).join('；')};}
 if(copy.verification)copy.verification.checks.push({method:'option-content-mapping',detail:'重排后的答案选项内容与原正确项逐字一致；显式选项引用同步映射。',result:'pass',evidence:[...mapping].map(([a,b])=>a+'→'+b).join(', ')});
 return copy;});
}
export function assembleMock(questions:PracticeQuestion[],options:AssembleOptions):PracticeDocument{
 if(!Number.isInteger(options.count)||options.count<1)throw new Error('题数必须是大于 0 的整数。');if(!Number.isFinite(options.durationMinutes)||options.durationMinutes<=0)throw new Error('考试时长必须大于 0。');
 const mode=options.mode||'mock';
 const sourceGroups=new Map(options.sourceSections?.flatMap(section=>section.questions.map(question=>[question.id,section] as const)));
 const contexts=new Map([...sourceGroups].filter(([,section])=>section.stimulus||section.format||section.listeningOnly).map(([id,section])=>[id,section.id]));
 const evidence=new Map(questions.map(q=>[q.id,questionEvidenceIds(q,options.materials,sourceGroups.get(q.id)?.stimulus)]));
 const filtered=filterQuestionBank(questions,options).filter(q=>evidenceAllowed(evidence.get(q.id)!,options.materials,options.sourcePolicy));
 const available=mode==='bank'?[...new Map(filtered.map(q=>[q.id,q])).values()]:deduplicateQuestions(filtered,contexts).questions;const count=mode==='bank'?available.length:options.count;
 if(!available.length)throw new Error('当前筛选没有可用题目。');if(count>available.length)throw new Error(`当前筛选只有 ${available.length} 道题，无法抽取 ${count} 道。`);
 const seed=options.seed||'paper-notebook';const candidates=mode==='bank'?available:shuffled(available,seededRandom(seed));
 if(mode!=='bank'&&options.questionPreference&&options.questionPreference!=='balanced'){const preferred=options.questionPreference==='generated-first'?'generated':'original';const rank=(q:PracticeQuestion)=>q.origin?.kind===preferred?0:q.origin?.kind==='adapted'?1:2;candidates.sort((a,b)=>rank(a)-rank(b));}
 let selected=mode==='bank'?candidates:options.targetScore!==undefined||options.sourcePolicy?.requiredMaterialIds?.length?chooseConstrained(candidates,count,options.targetScore,options.questionPreference,options.sourcePolicy?.requiredMaterialIds,evidence):candidates.slice(0,count);
 if(mode==='mock'&&options.balanceChoices!==false)selected=balanceChoiceAnswers(selected,seed);else selected=structuredClone(selected);
 const types:PracticeQuestion['type'][]=['choice','multiple','truefalse','blank','response','task'];const labels=PRACTICE_TYPE_NAMES;const instructions:Record<PracticeQuestion['type'],string>={choice:'每题只有一个正确选项，请选择相应字母。',multiple:'选择所有符合题意的选项。',truefalse:'根据题意与材料选择对应判断。',blank:'将答案填写在对应横线上。',response:'写出必要的推理、计算或论述过程。',task:'按任务要求完成操作，并记录关键步骤与结果。'};let number=0;
 let sections:PracticeSection[]=types.flatMap(type=>{const group=selected.filter(question=>question.type===type).map(question=>({...question,number:++number}));return group.length?[{id:`section-${type}`,title:labels[type],instructions:instructions[type],score:group.reduce((sum,question)=>sum+question.score,0),questions:group}]:[];});
 if(options.sourceSections?.length){
  number=0;const chosen=new Map(selected.map(q=>[q.id,q])),ids=new Set(options.sourceSections.map(section=>section.id));
  const grouped=options.sourceSections.flatMap(original=>{const group=original.questions.flatMap(question=>{const next=chosen.get(question.id);if(!next)return [];chosen.delete(question.id);delete next.breakBefore;return [next];});if(!group.length)return [];const section={...structuredClone(original),questions:group,score:group.reduce((sum,q)=>sum+q.score,0)};delete section.breakBefore;if(group.length!==original.questions.length)delete section.scoreLabel;return [section];});
  for(const section of sections){const remaining=section.questions.filter(question=>chosen.has(question.id));if(remaining.length){let id=section.id;while(ids.has(id))id+='-new';ids.add(id);grouped.push({...section,id,questions:remaining,score:remaining.reduce((sum,question)=>sum+question.score,0)});}}
  sections=grouped.map(section=>({...section,questions:section.questions.map(question=>({...question,number:++number}))}));
 }
 const signature=JSON.stringify([sections.map(section=>section.questions.map(question=>[question.id,question.prompt,question.options,question.solution,question.score])),seed,options.title,mode,options.durationMinutes,options.notebookRevision]);
 const paper:PracticeDocument={schemaVersion:'1.0.0',practiceId:stablePracticeId('practice',signature),notebookId:options.notebookId||stablePracticeId('notebook',options.materials.map(material=>material.id).join('|')),notebookRevision:options.notebookRevision||1,title:options.title,subject:options.subject,level:options.level,durationMinutes:options.durationMinutes,totalScore:sections.reduce((sum,section)=>sum+section.score,0),mode,...(options.sourcePolicy?{sourcePolicy:structuredClone(options.sourcePolicy)}:{}),...(options.presentation?{presentation:structuredClone(options.presentation)}:{}),assembly:{choiceOrder:mode==='mock'&&options.balanceChoices!==false?'balanced':'preserve',seed,sourceQuestionIds:sections.flatMap(section=>section.questions.map(question=>question.id))},style:structuredClone(options.style||{preset:'standard',sealed:true}),materials:structuredClone(options.materials),sections};
 const reference=options.sourceDocument??(options.sourceSections?{...paper,sections:options.sourceSections,totalScore:options.sourceSections.reduce((sum,s)=>sum+s.score,0)}:undefined);
 return reference?refreshPracticeMetadata(paper,reference):paper;
}
export function bankFacets(questions:PracticeQuestion[]){return {chapters:[...new Set(questions.map(question=>question.chapter))],tags:[...new Set(questions.flatMap(question=>question.tags||[]))],types:[...new Set(questions.map(question=>question.type))],difficulties:[...new Set(questions.map(question=>question.difficulty||'medium'))]};}
