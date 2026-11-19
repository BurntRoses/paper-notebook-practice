import registry from './exam-specifications.json';
import type {PracticeDocument,PracticeQuestionType,PracticeError} from './model';
import {isSiteAudio} from './model';

export interface ExamPartSpecification {id:string;title:string;label?:string;count:number;questionType:PracticeQuestionType|'mixed';questionTypes?:PracticeQuestionType[];totalScore:number;pointsPerQuestion?:number;questionScores?:number[];sourceQuestionNumbers?:string[];displayStart?:number;format?:string;timingGroupId?:string;stimulusKind?:string;groups?:{count:number;optionsCount?:number}[];[key:string]:unknown}
export interface ExamSpecification {id:string;name:string;subject:string;level:string;durationMinutes:number|null;practiceDurationMinutes?:number;totalScore:number;scoreScale:string;sections:ExamPartSpecification[];sourcePracticeIds?:string[];templateIds?:string[];timingGroups?:{id:string;title:string;minutes:number;sectionIds?:string[]}[];[key:string]:unknown}
export const EXAM_SPECIFICATIONS=registry.exams as unknown as ExamSpecification[];
export const printedQuestionNumber=(value:unknown)=>String(value??'').trim().replace(/^[（(]\s*/, '').replace(/\s*[.)）．、]$/, '');
export const examQuestionCount=(spec:ExamSpecification)=>spec.sections.reduce((n,s)=>n+s.count,0);
export function validateExamSpecification(value:unknown):PracticeError[]{
 const spec=value as ExamSpecification,errors:PracticeError[]=[],add=(path:string,message:string)=>errors.push({path,message});
 if(!spec||typeof spec!=='object'||!Array.isArray(spec.sections)||!spec.sections.length)return [{path:'/specification',message:'Provide a named specification with official question groups and a source'}];
 for(const key of ['id','name','subject','level','scoreScale'])if(typeof spec[key]!=='string'||!spec[key])add('/specification/'+key,'Required string');
 if(spec.durationMinutes!==null&&(!Number.isInteger(spec.durationMinutes)||spec.durationMinutes<=0))add('/specification/durationMinutes','Use a positive integer, or null when the original does not state a time');
 if(!Number.isFinite(spec.totalScore)||spec.totalScore<=0)add('/specification/totalScore','Positive score required');
 if(new Set(spec.sections.map(s=>s.id)).size!==spec.sections.length)add('/specification/sections','Part IDs must be unique');
 for(const part of spec.sections){if(!Number.isInteger(part.count)||part.count<1)add('/specification/sections/'+part.id,'A complete specification needs an exact positive question count');if(!Number.isFinite(part.totalScore)||part.totalScore<=0)add('/specification/sections/'+part.id,'A part needs an exact positive score');if(part.groups&&part.groups.reduce((n,g)=>n+g.count,0)!==part.count)add('/specification/sections/'+part.id+'/groups','Group counts must sum to the official part count');}
 if(Math.abs(spec.sections.reduce((n,s)=>n+s.totalScore,0)-spec.totalScore)>1e-7)add('/specification/totalScore','Part scores do not sum to the examination total');
 if(!spec.source)add('/specification/source','Cite the official syllabus or the uploaded original paper');
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
export function validateExamStructure(paper:PracticeDocument,spec=inferExamSpecification(paper),requireAudio=true,siteAudio=false):PracticeError[]{
 const errors:PracticeError[]=[],add=(path:string,message:string)=>errors.push({path,message});if(!spec){add('/exam/specificationId','An authoritative examination specification is required for a full paper');return errors;}
 if(paper.sections.reduce((n,s)=>n+s.questions.length,0)!==examQuestionCount(spec))add('/exam/count',`${spec.name} requires ${examQuestionCount(spec)} answerable tasks`);
 if(Math.abs(paper.totalScore-spec.totalScore)>1e-7)add('/exam/totalScore',`Expected ${spec.totalScore} (${spec.scoreScale})`);
 if(spec.durationMinutes!==null&&paper.durationMinutes!==spec.durationMinutes)add('/exam/durationMinutes',`${spec.name} lasts ${spec.durationMinutes} minutes`);
 const mapped=paper.sections.map((s,i)=>({section:s,part:examPartId(paper,i,spec)}));
 for(const {section,part} of mapped)if(!spec.sections.some(p=>p.id===part))add('/sections/'+section.id+'/examPartId','Map this question group to its official examination part');
 for(const part of spec.sections){
  const groups=mapped.filter(s=>s.part===part.id).map(s=>s.section),questions=groups.flatMap(s=>s.questions),path='/exam/parts/'+part.id;
  if(questions.length!==part.count)add(path+'/count',`${part.title}: available ${questions.length}, required ${part.count}`);
  if(Math.abs(questions.reduce((n,q)=>n+q.score,0)-part.totalScore)>1e-7)add(path+'/score',`${part.title}: expected ${part.totalScore} points`);
  if(part.questionType!=='mixed'&&questions.some(q=>q.type!==part.questionType))add(path+'/type',`${part.title}: expected ${part.questionType}`);
  if(part.questionTypes&&questions.some((q,i)=>q.type!==part.questionTypes![i]))add(path+'/questionTypes','Question types differ from the source order');
  if(part.pointsPerQuestion!==undefined&&questions.some(q=>Math.abs(q.score-part.pointsPerQuestion!)>1e-7))add(path+'/questionScore',`Every question in ${part.title} is worth ${part.pointsPerQuestion}`);
  if(part.questionScores&&questions.some((q,i)=>Math.abs(q.score-part.questionScores![i])>1e-7))add(path+'/questionScores','Question scores differ from the source allocation');
  if(part.displayStart!==undefined&&questions.some((q,i)=>(part.sourceQuestionNumbers?String(q.number):printedQuestionNumber(q.displayNumber??q.number))!==String(part.displayStart!+i)))add(path+'/numbering',`Retain examination numbers ${part.displayStart}–${part.displayStart+part.count-1}`);
  if(part.groups){const expected=part.groups.map(g=>g.count).sort((a,b)=>a-b),actual=groups.map(g=>g.questions.length).sort((a,b)=>a-b);if(JSON.stringify(expected)!==JSON.stringify(actual))add(path+'/groups',`${part.title} requires whole question groups of ${expected.join(', ')} tasks`);}
  if(requireAudio&&part.stimulusKind==='audio')for(const group of groups){const audio=group.stimulus?.audio;if(!audio?.dataUrl&&!(siteAudio&&audio&&isSiteAudio(audio)))add('/sections/'+group.id+'/stimulus/audio','A complete listening paper requires embedded local audio for every listening group');}
 }
 return errors;
}
