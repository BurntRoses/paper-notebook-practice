import {validatePracticeEvidence} from './evidence';
import Ajv from 'ajv';
import schema from '../../skills/paper-notebook-practice/schemas/practice.schema.json';
import {textOf,type NotebookDocument} from '../model/types';
import {validateExamSpecification,validateExamStructure} from './exam-specification';
import {isSiteAudio,questionsOf,type PracticeDocument,type PracticeError} from './model';
let schemaValidator:ReturnType<Ajv['compile']>|undefined;
const close=(left:number,right:number)=>Math.abs(left-right)<1e-7;
/** The schema validates structure; these checks bind scores and provenance to actual content. */
export function validatePractice(value:unknown,source?:NotebookDocument,siteAudio=false):{valid:boolean;errors:PracticeError[]}{
 const validateSchema=schemaValidator??=new Ajv({allErrors:true,strict:false}).compile(schema);
 const errors:PracticeError[]=[];
 if(!validateSchema(value)){for(const error of validateSchema.errors||[]){const tail=error.keyword==='required'?'/'+error.params.missingProperty:error.keyword==='additionalProperties'?'/'+error.params.additionalProperty:'';errors.push({path:(error.instancePath+tail)||'/',message:error.message||'Invalid field'});}return {valid:false,errors};}
 const practice=value as unknown as PracticeDocument,add=(path:string,message:string)=>errors.push({path,message});
 if(practice.practiceId===practice.notebookId)add('/practiceId','Must differ from notebookId');
 if(source){if(practice.notebookId!==source.notebook?.id)add('/notebookId','Does not match the source notebook ID');if(practice.notebookRevision!==source.notebook?.revision)add('/notebookRevision','Source revision changed; regenerate before replacing the sidecar');}
 const seen=new Set<string>(),seenNumbers=new Set<number>();
 const unique=(id:string,path:string)=>{if(seen.has(id))add(path,'Duplicate ID: '+id);seen.add(id);};
 unique(practice.practiceId,'/practiceId');unique(practice.notebookId,'/notebookId');
 const materialMap=new Map(practice.materials.map((material,index)=>{unique(material.id,`/materials/${index}/id`);const blocks=new Set<string>();for(const [j,block] of (material.blocks||[]).entries()){if(blocks.has(block.id))add(`/materials/${index}/blocks/${j}/id`,'Duplicate block ID');blocks.add(block.id);}return [material.id,material] as const;}));
 const notebookBlocks=new Map((source?.notebook?.chapters||[]).flatMap(chapter=>chapter.pages.flatMap(page=>page.blocks.map(block=>[block.id,textOf(block)] as const))));
 const checkNotebookEvidence=(citation:{materialId?:string;blockId:string;exact:string},path:string)=>{
  if(citation.materialId)return;
  const body=notebookBlocks.get(citation.blockId);
  if(body===undefined)add(path+'/blockId','Evidence notebook block not found; supply its source notebook');
  else if(!citation.exact.trim()||!body.includes(citation.exact))add(path+'/exact','Evidence differs from the supplied notebook block');
 };
 const counts={A:0,B:0,C:0,D:0};let sectionTotal=0,previousNumber=0;
 for(const [s,section] of practice.sections.entries()){
  const base=`/sections/${s}`;unique(section.id,base+'/id');let questionTotal=0;
  if(section.stimulus?.source)checkNotebookEvidence(section.stimulus.source,base+'/stimulus/source');
  if(section.stimulus?.audio?.transcriptSource){const ref=section.stimulus.audio.transcriptSource;if(!materialMap.get(ref.materialId)?.blocks?.some(b=>b.id===ref.blockId))add(base+'/stimulus/audio/transcriptSource','Listening transcript block is missing');}
  if(section.stimulus?.audio?.url&&!(siteAudio&&isSiteAudio(section.stimulus.audio)))add(base+'/stimulus/audio/url','Listening asset references are only supported in the hosted catalog');
  if(section.stimulus?.audio?.url&&section.stimulus.audio.dataUrl)add(base+'/stimulus/audio','Choose one audio source, not both URL and embedded audio');
  if(section.sharedOptions){const ids=section.sharedOptions.map(o=>o.id);if(new Set(ids).size!==ids.length)add(base+'/sharedOptions','Shared option IDs must be unique');for(const q of section.questions)if(q.options&&JSON.stringify(q.options.map(o=>o.id))!==JSON.stringify(ids))add(base+'/sharedOptions','Question option codes must match the shared option bank');}
  if(section.format==='statement-matching'){
   if(!section.sharedOptions?.length)add(base+'/sharedOptions','Statement matching requires shared statements');
   else for(const [index,question] of section.questions.entries())if(question.type!=='choice'||question.options?.length!==section.sharedOptions.length||!section.sharedOptions.every((option,position)=>question.options?.[position]?.id===option.id&&question.options[position].text===option.text))add(base+'/questions/'+index+'/options','Each matching question must use the same statement texts and codes');
  }
  for(const [q,question] of section.questions.entries()){
   const path=base+`/questions/${q}`;unique(question.id,path+'/id');questionTotal+=question.score;
   for(const [i,e]of(question.supportingSources??[]).entries())checkNotebookEvidence(e.source,path+`/supportingSources/${i}/source`);
   for(const [i,e]of(question.answerProvenance?.sources??[]).entries())checkNotebookEvidence(e,path+`/answerProvenance/sources/${i}`);
   for(const [i,c]of(question.rubric?.criteria??[]).entries())for(const [j,e]of(c.evidence??[]).entries())checkNotebookEvidence(e,path+`/rubric/criteria/${i}/evidence/${j}`);
   if(seenNumbers.has(question.number))add(path+'/number','Duplicate question number');seenNumbers.add(question.number);
   if(question.number<=previousNumber)add(path+'/number','Question numbers must increase in paper order');previousNumber=question.number;
   let body:string|undefined;
   if(question.source.materialId){const material=materialMap.get(question.source.materialId);if(!material)add(path+'/source/materialId','Unknown material ID');else if(question.source.blockId===material.id)body=material.text;else body=material.blocks?.find(block=>block.id===question.source.blockId)?.text;}
   else body=notebookBlocks.get(question.source.blockId);
   if(body===undefined)add(path+'/source/blockId','Source block not found; supply --source or an embedded source material');
   else if(!question.source.materialId&&(!question.source.exact.trim()||!body.includes(question.source.exact)))add(path+'/source/exact','Must be an exact, nonempty substring of the cited block body');
   if(!question.prompt.trim())add(path+'/prompt','Question text cannot be blank');
   if(question.type!=='choice'&&question.type!=='multiple'&&question.type!=='truefalse'&&(Array.isArray(question.solution)?question.solution:[question.solution]).some(answer=>!answer.trim()))add(path+'/solution','Answer text cannot be blank');
   if(source&&question.source.materialId&&materialMap.get(question.source.materialId)?.kind==='notebook'){if(!notebookBlocks.has(question.source.blockId))add(path+'/source/blockId','Cited notebook block does not exist in the supplied original');else if(!notebookBlocks.get(question.source.blockId)!.includes(question.source.exact))add(path+'/source/exact','Embedded notebook excerpt differs from the supplied original block');}
   if(['choice','multiple','truefalse'].includes(question.type)){
    const options=question.options||[],ids=options.map(option=>option.id);
    if(new Set(ids).size!==ids.length)add(path+'/options','Option identifiers must be unique');
    const solution=Array.isArray(question.solution)?question.solution:[question.solution];
    if(question.type==='multiple'){if(new Set(solution).size!==solution.length||!solution.length||solution.some(id=>!ids.includes(id)))add(path+'/solution','Multiple-choice solution must contain unique option IDs');}
    else if(solution.length!==1||!ids.includes(solution[0]))add(path+'/solution','Solution must identify exactly one available option');
    if(question.type==='choice'&&ids.length===4&&['A','B','C','D'].every(id=>ids.includes(id))&&solution.length===1&&solution[0] in counts)counts[solution[0] as keyof typeof counts]++;
   }
   if(question.multiSelectScoring){
    const rule=question.multiSelectScoring,correctCount=Array.isArray(question.solution)?question.solution.length:1;
    if(question.type!=='multiple')add(path+'/multiSelectScoring','Partial selection scoring is only allowed for multiple-choice questions');
    if((correctCount-1)*rule.partialPerCorrect>question.score+1e-7)add(path+'/multiSelectScoring/partialPerCorrect','The largest incomplete correct selection must not exceed the question score');
   }
   const attachmentIds=new Set<string>();
   for(const [index,attachment]of(question.attachments||[]).entries()){if(attachmentIds.has(attachment.id))add(path+`/attachments/${index}/id`,'Duplicate attachment ID');attachmentIds.add(attachment.id);}

  }
  if(!close(questionTotal,section.score))add(base+'/score',`Questions sum to ${questionTotal}, not ${section.score}`);sectionTotal+=section.score;
 }
 if(!close(sectionTotal,practice.totalScore))add('/totalScore',`Sections sum to ${sectionTotal}, not ${practice.totalScore}`);
 if(practice.mode==='mock'&&practice.assembly?.choiceOrder!=='preserve'&&Math.max(...Object.values(counts))-Math.min(...Object.values(counts))>1)add('/sections','Choice answers must be balanced across A/B/C/D (counts differ by at most one); preserve original order in bank mode');
 if(practice.generation?.unresolved.length)add('/generation/unresolved','Resolve OCR, source and answer findings before formal delivery');
 if(practice.generation?.sourceManifest&&!practice.generation.ocrReviewed)add('/generation/ocrReviewed','Record source/OCR review before formal delivery');
 errors.push(...validatePracticeEvidence(practice));
 const questionIds=new Set(questionsOf(practice).map(question=>question.id));
 for(const key of Object.keys(practice.review||{}))if(!questionIds.has(key))add('/review/'+key,'Review refers to an unknown question');
 for(const key of Object.keys(practice.userState?.practiceAnswers||{}))if(!questionIds.has(key))add('/userState/practiceAnswers/'+key,'Answer refers to an unknown question');
 for(const [index,key] of (practice.userState?.practiceMistakes||[]).entries())if(!questionIds.has(key))add('/userState/practiceMistakes/'+index,'Mistake refers to an unknown question');
 if(practice.exam?.scope==='full')errors.push(...validateExamStructure(practice,undefined,true,siteAudio));
 else if(practice.exam?.specification){
  errors.push(...validateExamSpecification(practice.exam.specification));
  if(practice.exam.specification.id!==practice.exam.specificationId)add('/exam/specificationId','Does not match the attached specification ID');
  if(practice.exam.specification.scoreScale!==practice.exam.scoreScale)add('/exam/scoreScale','Does not match the specification score scale');
 }
 return {valid:errors.length===0,errors};
}
export function assertPractice(value:unknown,source?:NotebookDocument):PracticeDocument{const result=validatePractice(value,source);if(!result.valid)throw new Error(result.errors.map(error=>error.path+': '+error.message).join('\n'));return value as PracticeDocument;}
