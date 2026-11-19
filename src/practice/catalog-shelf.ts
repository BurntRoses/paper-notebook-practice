import {caseIndex} from './case-index';
import {PAPER_TEMPLATES} from './templates';
import {TOPIC_CASES} from './topics';

export const catalogShelf={
 cases:caseIndex.cases.filter(paper=>paper.complete).map(({practiceId,title,subject,level,materials,questionCount,totalScore,scoreScale})=>({
  practiceId,title,subject,level,materialTitles:materials.map(material=>material.title),questionCount,totalScore,scoreScale,
 })),
 topics:TOPIC_CASES.map(({id,title,subject,level,description,routeId,family,mode,questionCount,totalScore,durationMinutes})=>({
  id,title,subject,level,description,routeId,family,mode,questionCount,totalScore,durationMinutes,
 })),
 templates:PAPER_TEMPLATES.filter(template=>!template.caseId||['cet4','cet6'].includes(template.id)).map(template=>{
  const {id,name,family,description,subjects,level,layout}=template;
  return {id,name,family,description,subjects,level,orientation:layout.orientation,paperSize:layout.paperSize,columns:layout.columns};
 }),
};

export type CatalogShelf=typeof catalogShelf;
