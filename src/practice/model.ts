import type {ReplicaDocument} from './replica';
import type {ExamSpecification} from './exam-specification';
import type {PaperTemplateOverrides} from './templates';

/** Practice is a sidecar: it never edits the notebook body or its reader state. */
export type PracticeKind='notebook'|'past-exam'|'question-bank'|'knowledge'|'reference';
export type PracticeDifficulty='easy'|'medium'|'hard';
export interface PracticeSource {materialId?:string;blockId:string;page?:string|number;title?:string;exact:string}
export interface PracticeMaterialProvenance {
 kind:'upload'|'web'|'authored';publisher?:string;version?:string;publishedAt?:string;accessedAt?:string;url?:string;
 sourceType?:'official'|'institution'|'publisher'|'recollection'|'author';derivedFrom?:string[];
}
export interface PracticeMaterial {id:string;title:string;kind:PracticeKind;text:string;url?:string;rights?:string;sha256?:string;provenance?:PracticeMaterialProvenance;blocks?:{id:string;title?:string;text:string;page?:string|number}[]}
export interface PracticeSourcePolicy {
 mode:'uploads-only'|'uploads-first'|'open';requiredMaterialIds?:string[];allowedMaterialIds?:string[];excludedMaterialIds?:string[];
 questionPreference?:'originals-first'|'balanced'|'generated-first';requiredVersions?:{materialId:string;version:string}[];
}
export interface PracticeAuthoring {
 routeId?:string;examName?:string;examCode?:string;year?:number;region?:string;specialty?:string;profileIds?:string[];
 grade?:string;difficulty?:'source'|'easy'|'balanced'|'hard';knowledge?:string;requireVerification?:boolean;
 blueprint?:{id:string;knowledge:string;ability:string;types?:PracticeQuestionType[];count:number;points?:number;estimatedMinutes?:number;sourceIds?:string[]}[];
}
export interface PracticeRubric {
 criteria:{id:string;description:string;points:number;evidence?:PracticeSource[]}[];equivalentMethods?:string[];tolerance?:string;
}
export interface PracticeVerification {
 status:'verified'|'needs-review';checks:{method:string;detail:string;result:'pass'|'fail'|'unresolved';evidence?:string}[];reviewedAt?:string;
}
export interface PracticeAnswerProvenance {kind:'official'|'third-party'|'independent';sources?:PracticeSource[];notes?:string}
export interface PracticeResponseConstraints {minWords?:number;maxWords?:number;countUnit?:'characters'|'words';answerStyle?:'grid'|'ruled'|'blank'|'boxed'}
/** Optional published exam rule. Omit it for all-or-nothing multiple choice. */
export interface PracticeMultiSelectScoring {partialPerCorrect:number;wrongSelection:0}
export interface PracticeAssessment {knowledgePoints:string[];ability:string;estimatedMinutes?:number;difficultyRationale?:string}
export interface PracticeStyle {preset:'standard'|'stem'|'humanities'|'language';fontSize?:number;lineHeight?:number;sealed?:boolean;templateId?:string;templateOverrides?:PaperTemplateOverrides}
export type PracticeQuestionType='choice'|'multiple'|'truefalse'|'blank'|'response'|'task';
export const PRACTICE_TYPE_NAMES:Record<PracticeQuestionType,string>={choice:'单项选择',multiple:'多项选择',truefalse:'判断题',blank:'填空题',response:'解答题',task:'操作与任务'};
export interface PracticePresentation {printColor?:'color'|'grayscale';projectMark?:boolean;sourceLayout?:boolean;institution?:string;courseCode?:string;integrityPledge?:{title:string;text:string;signatureLabel?:string;dateLabel?:string};securityLine?:{text:string;leftMm?:number;topMm?:number;fontSizePt?:number};titleLineSizesPt?:number[];answerCard?:{template:'school'|'cet'|'university'|'ruled'|'boxed'|'essay-grid';title?:string;candidateDigits?:number;roomDigits?:number;seatDigits?:number;pages?:number};questionGrid?:{label?:string;rows:number;columns:number;startNumber?:number};appendix?:{title:string;text:string}[];sourcePageNumbers?:number[];sourcePageCount?:number;runningHeader?:{skipFirst?:boolean;left?:string;center?:string;right?:string;rule?:boolean;even?:{left?:string;center?:string;right?:string}};sideLabel?:{text:string;side:'left'|'right';firstPageOnly?:boolean;topMm?:number};watermark?:{text:string;rotation?:number;opacity?:number;fontSizePt?:number};sealStyle?:'candidate'|'binding'|'none';bindingText?:string;noticeLabel?:string;titleLines?:string[];subtitle?:string;metaLines?:string[];candidateFields?:string[];notices?:string[];scoreTable?:boolean;scoreColumns?:string[];footerTemplate?:string;endText?:string;questionScores?:'show'|'hide';sectionDetails?:boolean;answerSpace?:'ruled'|'blank'|'none';language?:'zh'|'en'|'ja'|'ko'|'fr'|'de';titleFont?:'song'|'hei'|'times';headerStyle?:string;titleGapMm?:number;headerRows?:{cells:string[];align?:'left'|'center'}[];titleSizePt?:number;sectionSizePt?:number;questionGapMm?:number;headerAlign?:'center'|'left';headerRule?:boolean}
export interface PracticeQuestion {multiSelectScoring?:PracticeMultiSelectScoring;supportingSources?:{role:'question'|'knowledge'|'answer'|'standard';source:PracticeSource}[];rubric?:PracticeRubric;verification?:PracticeVerification;answerProvenance?:PracticeAnswerProvenance;responseConstraints?:PracticeResponseConstraints;assessment?:PracticeAssessment;id:string;number:number;displayNumber?:string;scoreLabel?:string;breakBefore?:boolean;gapBeforeMm?:number;pageBreakBeforeLines?:number[];answerRows?:number;answerBoxMm?:number;gapAfterMm?:number;optionColumns?:1|2|4;scorePosition?:'before'|'after';promptNewline?:boolean;type:PracticeQuestionType;prompt:string;score:number;options?:{id:string;text:string}[];solution:string|string[];explanation:string;source:PracticeSource;chapter:string;tags?:string[];difficulty?:PracticeDifficulty;origin?:{kind:'original'|'adapted'|'generated';number?:string;year?:number};attachments?:{colorRequired?:boolean;grayscaleDataUrl?:string;id:string;dataUrl:string;alt:string;caption?:string;float?:'left'|'right';afterLine?:number;widthMm?:number}[]}
export interface PracticeSection {examPartId?:string;format?:'word-bank'|'paragraph-matching';listeningOnly?:boolean;choicesAsCodes?:boolean;sharedOptions?:{id:string;text:string}[];id:string;title:string;instructions:string;instructionsStyle?:'directions';displayLabel?:string;scoreLabel?:string;headingStyle?:'plain'|'part'|'section';questionColumns?:1|2|3;questionColumnWeights?:number[];inlineFirstQuestion?:boolean;inlineInstructions?:boolean;inlineStimulus?:boolean;headingFont?:'song'|'hei'|'times';headingWeight?:'normal'|'bold';gapBeforeMm?:number;breakBefore?:boolean;stimulus?:{title?:string;text:string;source?:PracticeSource;audio?:{dataUrl:string;mimeType:string;title:string;durationSeconds?:number;transcriptSource?:{materialId:string;blockId:string}}};score:number;questions:PracticeQuestion[]}
export interface PracticeAnswer {value:string|string[];submitted?:boolean;correct?:boolean;score?:number}
export interface PracticeDocument {authoring?:PracticeAuthoring;sourcePolicy?:PracticeSourcePolicy;original?:ReplicaDocument;exam?:{specificationId:string;scope:'full'|'subset';scoreScale:string;specification?:ExamSpecification};schemaVersion:'1.0.0';practiceId:string;notebookId:string;notebookRevision:number;title:string;subject:string;level:string;durationMinutes:number;totalScore:number;mode:'mock'|'bank';presentation?:PracticePresentation;style:PracticeStyle;materials:PracticeMaterial[];sections:PracticeSection[];assembly?:{choiceOrder:'preserve'|'balanced';seed:string;sourceQuestionIds:string[]};generation?:{intent:'generate'|'original'|'adapt';sourceManifest?:string;ocrReviewed:boolean;unresolved:string[];notes?:string};review?:Record<string,{stage:number;due:string}>;userState?:{practiceAnswers:Record<string,PracticeAnswer>;practiceMistakes:string[]}}
export interface PracticeError {path:string;message:string}
export const REVIEW_DAYS=[1,2,4,7,15,30] as const;
export const questionsOf=(practice:Pick<PracticeDocument,'sections'>)=>practice.sections.flatMap(section=>section.questions);
export function createReview(previous:{stage:number;due:string}|undefined,correct:boolean,now=new Date()){const stage=correct?Math.min(5,(previous?.stage??-1)+1):0;const next=new Date(now);next.setDate(next.getDate()+REVIEW_DAYS[stage]);return {stage,due:next.toISOString().slice(0,10)};}
/** Candidate data uses an explicit field set; author evidence stays in the answer paper. */
export function questionOnly(practice:PracticeDocument){
 const {schemaVersion,practiceId,notebookId,notebookRevision,title,subject,level,durationMinutes,totalScore,mode,presentation,style,exam,assembly}=structuredClone(practice);
 const publicSource=({materialId,blockId,page,title}:PracticeSource)=>({materialId,blockId,page,title});
 const visibleMaterials=new Set<string>();
 const sections=practice.sections.map(section=>{
  const {examPartId,format,listeningOnly,choicesAsCodes,sharedOptions,id,title,instructions,instructionsStyle,displayLabel,scoreLabel,headingStyle,questionColumns,questionColumnWeights,inlineFirstQuestion,inlineInstructions,inlineStimulus,headingFont,headingWeight,gapBeforeMm,breakBefore,score}=section;
  const stimulus=section.stimulus&&!listeningOnly?{
   title:section.stimulus.title,text:section.stimulus.text,
   ...(section.stimulus.source?{source:publicSource(section.stimulus.source)}:{}),
   ...(section.stimulus.audio?{audio:(({dataUrl,mimeType,title,durationSeconds})=>({dataUrl,mimeType,title,durationSeconds}))(section.stimulus.audio)}:{})
  }:section.stimulus?.audio?{audio:(({dataUrl,mimeType,title,durationSeconds})=>({dataUrl,mimeType,title,durationSeconds}))(section.stimulus.audio)}:undefined;
  if(!listeningOnly&&section.stimulus?.source?.materialId)visibleMaterials.add(section.stimulus.source.materialId);
  const questions=section.questions.map(question=>{
   const {id,number,displayNumber,scoreLabel,breakBefore,gapBeforeMm,pageBreakBeforeLines,answerRows,answerBoxMm,gapAfterMm,optionColumns,scorePosition,promptNewline,type,prompt,score,options,chapter,tags,difficulty,origin,attachments,responseConstraints,multiSelectScoring}=question;
   if(question.source.materialId)visibleMaterials.add(question.source.materialId);
   return {id,number,displayNumber,scoreLabel,breakBefore,gapBeforeMm,pageBreakBeforeLines,answerRows,answerBoxMm,gapAfterMm,optionColumns,scorePosition,promptNewline,type,prompt,score,options,chapter,tags,difficulty,origin,attachments,responseConstraints,multiSelectScoring,source:publicSource(question.source)};
  });
  return {examPartId,format,listeningOnly,choicesAsCodes,sharedOptions,id,title,instructions,instructionsStyle,displayLabel,scoreLabel,headingStyle,questionColumns,questionColumnWeights,inlineFirstQuestion,inlineInstructions,inlineStimulus,headingFont,headingWeight,gapBeforeMm,breakBefore,score,stimulus,questions};
 });
 return structuredClone({schemaVersion,practiceId,notebookId,notebookRevision,title,subject,level,durationMinutes,totalScore,mode,presentation,style,exam,assembly,
  materials:practice.materials.filter(m=>visibleMaterials.has(m.id)).map(({id,title,kind})=>({id,title,kind})),sections});
}
