import {questionsOf,type PracticeDocument} from './model';
import {composePractice,createPracticeJob} from './workflow';

/** Use the same job and selection rules as the Agent CLI on the two built-in sources. */
export function assembleWorkbenchPaper(reference:PracticeDocument,reserve:PracticeDocument){
 const pool=structuredClone(reference);
 const selectedQuestionIds=questionsOf(pool).map(question=>question.id);
 const alternatives=structuredClone(reserve.sections);
 let number=selectedQuestionIds.length;
 for(const question of alternatives.flatMap(section=>section.questions))question.number=++number;
 pool.practiceId='demo-grade6-math-bank';
 pool.mode='bank';delete pool.exam;
 pool.sections.push(...alternatives);
 pool.materials.push(...reserve.materials);
 pool.totalScore+=reserve.totalScore;
 const job=createPracticeJob(pool,{scope:'full',specification:reference.exam?.specification,selectedQuestionIds});
 return composePractice(pool,job);
}
