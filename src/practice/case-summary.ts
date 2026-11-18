import type {PracticeDocument,PracticeQuestion,PracticeSection} from './model';
import {questionsOf} from './model';
import {inferExamSpecification,validateExamStructure} from './exam-specification';

type CaseSection=Pick<PracticeSection,'id'|'title'|'instructions'|'score'>&{
 questions:Pick<PracticeQuestion,'id'|'score'|'type'|'number'|'displayNumber'>[];
};
export type CaseSummary=Pick<PracticeDocument,'practiceId'|'title'|'subject'|'level'|'durationMinutes'|'mode'|'totalScore'|'style'|'presentation'> & {
 materials:Pick<PracticeDocument['materials'][number],'title'|'url'|'rights'>[];
 sections:CaseSection[];
 referenceYear:number;
 questionCount:number;
 specificationId?:string;
 scoreScale?:string;
 complete:boolean;
};

/** The directory and source layouts use only metadata. Full papers are opened separately. */
export function summarizeCase(paper:PracticeDocument):CaseSummary {
 const {practiceId,title,subject,level,durationMinutes,mode,totalScore,style,presentation}=paper;
 const questions=questionsOf(paper),spec=inferExamSpecification(paper);
 return {practiceId,title,subject,level,durationMinutes,mode,totalScore,style,presentation,
  materials:paper.materials.map(({title,url,rights})=>({title,url,rights})),
  sections:paper.sections.map(({id,title,instructions,score,questions})=>({id,title,instructions,score,questions:questions.map(({id,score,type,number,displayNumber})=>({id,score,type,number,displayNumber}))})),
  referenceYear:questions.find(q=>q.origin?.year)?.origin?.year??2026,
  questionCount:questions.length,specificationId:spec?.id,scoreScale:spec?.scoreScale,complete:!!spec&&!validateExamStructure(paper,spec).length};
}
