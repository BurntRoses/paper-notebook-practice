import registry from './exam-specifications.json';
import type {PracticeDocument,PracticeQuestionType,PracticeError} from './model';
import {isSiteAudio} from './model';

export interface ExamPartSpecification {id:string;title:string;label?:string;count:number;questionType:PracticeQuestionType|'mixed';questionTypes?:PracticeQuestionType[];totalScore:number;pointsPerQuestion?:number;questionScores?:number[];sourceQuestionNumbers?:string[];displayStart?:number;format?:string;timingGroupId?:string;stimulusKind?:string;groups?:{count:number;optionsCount?:number}[];[key:string]:unknown}
export interface ExamSpecification {id:string;name:string;subject:string;level:string;durationMinutes:number|null;practiceDurationMinutes?:number;totalScore:number;scoreScale:string;sections:ExamPartSpecification[];sourcePracticeIds?:string[];templateIds?:string[];timingGroups?:{id:string;title:string;minutes:number;sectionIds?:string[]}[];[key:string]:unknown}
export const EXAM_SPECIFICATIONS=registry.exams as unknown as ExamSpecification[];
export const printedQuestionNumber=(value:unknown)=>String(value??'').trim().replace(/^[（(]\s*/, '').replace(/\s*[.)）．、]$/, '');
export const examQuestionCount=(spec:ExamSpecification)=>spec.sections.reduce((n,s)=>n+s.count,0);
const record=(value:unknown):value is Record<string,unknown>=>Boolean(value&&typeof value==='object'&&!Array.isArray(value));
const nonempty=(value:unknown):value is string=>typeof value==='string'&&Boolean(value.trim());
const positive=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>0;
const integer=(value:unknown):value is number=>positive(value)&&Number.isSafeInteger(value);
const questionTypes=new Set(['choice','multiple','truefalse','blank','response','task']);
export function validateExamSpecification(value:unknown):PracticeError[]{
 const errors:PracticeError[]=[],add=(path:string,message:string)=>errors.push({path:'/specification'+path,message});
 if(!record(value)||!Array.isArray(value.sections)||!value.sections.length)return [{path:'/specification',message:'Provide a named specification with question groups and a source'}];
 for(const key of ['id','name','subject','level','scoreScale'])if(!nonempty(value[key]))add('/'+key,'Required nonempty string');
 if(value.durationMinutes!==null&&(!integer(value.durationMinutes)||value.durationMinutes>1440))add('/durationMinutes','Use 1–1440 minutes, or null when no time is stated');
 if(value.practiceDurationMinutes!==undefined&&(!integer(value.practiceDurationMinutes)||value.practiceDurationMinutes>1440))add('/practiceDurationMinutes','Use 1–1440 minutes');
 if(!positive(value.totalScore))add('/totalScore','Positive score required');
 if(!record(value.source)||!Object.values(value.source).some(nonempty))add('/source','Identify the specification source');
 const ids=new Set<string>();let score=0,count=0;
 for(const [index,part] of value.sections.entries()){
  const path='/sections/'+index;
  if(!record(part)){add(path,'Expected a question group object');continue;}
  if(!nonempty(part.id)||ids.has(part.id))add(path+'/id','Part IDs must be nonempty and unique');else ids.add(part.id);
  if(!nonempty(part.title))add(path+'/title','A part needs a title');
  if(!integer(part.count))add(path+'/count','Use an exact positive question count');else count+=part.count;
  if(!positive(part.totalScore))add(path+'/totalScore','Use a positive part score');else score+=part.totalScore;
  if(part.questionType!=='mixed'&&(typeof part.questionType!=='string'||!questionTypes.has(part.questionType)))add(path+'/questionType','Unknown question type');
  if(part.questionTypes!==undefined&&(!Array.isArray(part.questionTypes)||part.questionTypes.length!==part.count||part.questionTypes.some(type=>!questionTypes.has(type)||part.questionType!=='mixed'&&type!==part.questionType)))add(path+'/questionTypes','Provide one compatible type per question');
  if(part.questionScores!==undefined&&(!Array.isArray(part.questionScores)||part.questionScores.length!==part.count||part.questionScores.some(item=>!positive(item))||positive(part.totalScore)&&Math.abs(part.questionScores.reduce((sum,item)=>sum+item,0)-part.totalScore)>1e-7))add(path+'/questionScores','Provide one positive score per question, summing to the part score');
  if(part.pointsPerQuestion!==undefined&&(!positive(part.pointsPerQuestion)||integer(part.count)&&positive(part.totalScore)&&Math.abs(part.pointsPerQuestion*part.count-part.totalScore)>1e-7||Array.isArray(part.questionScores)&&part.questionScores.some(item=>item!==part.pointsPerQuestion)))add(path+'/pointsPerQuestion','Per-question points must match the part score and allocation');
  if(part.displayStart!==undefined&&!integer(part.displayStart))add(path+'/displayStart','Use a positive integer');
  if(part.sourceQuestionNumbers!==undefined&&(!Array.isArray(part.sourceQuestionNumbers)||part.sourceQuestionNumbers.length!==part.count||!part.sourceQuestionNumbers.every(nonempty)))add(path+'/sourceQuestionNumbers','Provide one source number per question');
  if(part.groups!==undefined&&(!Array.isArray(part.groups)||!part.groups.length||part.groups.some(group=>!record(group)||!integer(group.count)||group.optionsCount!==undefined&&(!integer(group.optionsCount)||group.optionsCount<2||group.optionsCount>26))||part.groups.reduce((sum,group)=>sum+group.count,0)!==part.count))add(path+'/groups','Group counts must sum to the part count; use 2–26 options when specified');
 }
 if(count>5000)add('/sections','At most 5000 answerable tasks');
 if(positive(value.totalScore)&&Math.abs(score-value.totalScore)>1e-7)add('/totalScore','Part scores do not sum to the examination total');
 return errors;
}
export function getExamSpecification(id:string):ExamSpecification{const spec=EXAM_SPECIFICATIONS.find(s=>s.id===id);if(!spec)throw Error(`Unknown exam specification: ${id}. Run specs to see supported complete examinations, or supply --exam-spec.`);return spec;}
export function inferExamSpecification(paper?:PracticeDocument,templateId?:string):ExamSpecification|undefined{
 if(paper?.exam?.specification)return paper.exam.specification;
 if(paper?.exam?.specificationId)return getExamSpecification(paper.exam.specificationId);
 return EXAM_SPECIFICATIONS.find(spec=>spec.sourcePracticeIds?.includes(paper?.practiceId??'')||spec.templateIds?.includes(templateId??paper?.style.templateId??''));
}
export function examPartId(paper:PracticeDocument,sectionIndex:number,spec:ExamSpecification):string|undefined{
 const section=paper.sections[sectionIndex];if(section.examPartId)return section.examPartId;
 // Source papers with one authored section per official part can be mapped without guessing a type.
 if(paper.sections.length===spec.sections.length&&paper.sections.every((s,i)=>s.questions.length===spec.sections[i].count))return spec.sections[sectionIndex].id;
 return undefined;
}
/** Completeness is a content property, not a title suffix or a total-question-count shortcut. */
export function validateExamStructure(paper:PracticeDocument,spec?:ExamSpecification,requireAudio=true,siteAudio=false):PracticeError[]{
 const errors:PracticeError[]=[],add=(path:string,message:string)=>errors.push({path,message});
 try{spec??=inferExamSpecification(paper);}catch(error){return [{path:'/exam/specificationId',message:error instanceof Error?error.message:String(error)}];}
 if(!spec){add('/exam/specificationId','An authoritative examination specification is required for a full paper');return errors;}
 const specificationErrors=validateExamSpecification(spec);if(specificationErrors.length)return specificationErrors;
 if(paper.exam?.specificationId&&paper.exam.specificationId!==spec.id)add('/exam/specificationId','Does not match the attached specification ID');
 if(paper.exam?.scoreScale&&paper.exam.scoreScale!==spec.scoreScale)add('/exam/scoreScale','Does not match the specification score scale');
 const checked=spec;
 if(paper.sections.reduce((n,s)=>n+s.questions.length,0)!==examQuestionCount(spec))add('/exam/count',`${spec.name} requires ${examQuestionCount(spec)} answerable tasks`);
 if(Math.abs(paper.totalScore-spec.totalScore)>1e-7)add('/exam/totalScore',`Expected ${spec.totalScore} (${spec.scoreScale})`);
 if(spec.durationMinutes!==null&&paper.durationMinutes!==spec.durationMinutes)add('/exam/durationMinutes',`${spec.name} lasts ${spec.durationMinutes} minutes`);
 const mapped=paper.sections.map((s,i)=>({section:s,part:examPartId(paper,i,checked)}));
 const partOrder=new Map(spec.sections.map((part,index)=>[part.id,index]));
 let lastPart=-1;
 for(const {section,part} of mapped)if(!spec.sections.some(p=>p.id===part))add('/sections/'+section.id+'/examPartId','Map this question group to its official examination part');
 else if(part){const order=partOrder.get(part)!;if(order<lastPart)add('/sections/'+section.id+'/examPartId','Question groups must follow the specification part order');lastPart=order;}
 for(const part of spec.sections){
  const groups=mapped.filter(s=>s.part===part.id).map(s=>s.section),questions=groups.flatMap(s=>s.questions),path='/exam/parts/'+part.id;
  if(questions.length!==part.count)add(path+'/count',`${part.title}: available ${questions.length}, required ${part.count}`);
  if(Math.abs(questions.reduce((n,q)=>n+q.score,0)-part.totalScore)>1e-7)add(path+'/score',`${part.title}: expected ${part.totalScore} points`);
  if(part.questionType!=='mixed'&&questions.some(q=>q.type!==part.questionType))add(path+'/type',`${part.title}: expected ${part.questionType}`);
  if(part.questionTypes&&questions.some((q,i)=>q.type!==part.questionTypes![i]))add(path+'/questionTypes','Question types differ from the source order');
  if(part.pointsPerQuestion!==undefined&&questions.some(q=>Math.abs(q.score-part.pointsPerQuestion!)>1e-7))add(path+'/questionScore',`Every question in ${part.title} is worth ${part.pointsPerQuestion}`);
  if(part.questionScores&&questions.some((q,i)=>Math.abs(q.score-part.questionScores![i])>1e-7))add(path+'/questionScores','Question scores differ from the source allocation');
  if(part.displayStart!==undefined&&questions.some((q,i)=>(part.sourceQuestionNumbers?String(q.number):printedQuestionNumber(q.displayNumber??q.number))!==String(part.displayStart!+i)))add(path+'/numbering',`Retain examination numbers ${part.displayStart}–${part.displayStart+part.count-1}`);
  if(part.groups){
   const remaining=[...part.groups];
   for(const [index,group] of groups.entries()){
    const matches=remaining.findIndex(item=>item.count===group.questions.length&&(!item.optionsCount||group.questions.every(question=>question.options?.length===item.optionsCount)));
    if(matches<0)add(path+'/groups/'+index,'Group size or option count differs from the specification');
    else remaining.splice(matches,1);
   }
   if(remaining.length)add(path+'/groups',`${part.title} requires all specified question groups`);
  }
  if(['word-bank','paragraph-matching'].includes(part.format??'')&&groups.some(group=>group.format!==part.format))add(path+'/format','Question groups must use the specified matching format');
  if(['reading-passage','lettered-paragraphs','word-bank'].includes(part.stimulusKind??'')&&groups.some(group=>!group.stimulus?.text.trim()))add(path+'/stimulus','Shared reading material is missing');
  if(requireAudio&&part.stimulusKind==='audio')for(const group of groups){const audio=group.stimulus?.audio;if(!audio?.dataUrl&&!(siteAudio&&audio&&isSiteAudio(audio)))add('/sections/'+group.id+'/stimulus/audio','A complete listening paper requires embedded local audio for every listening group');}
 }
 return errors;
}
