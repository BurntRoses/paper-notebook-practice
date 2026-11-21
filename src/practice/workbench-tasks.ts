import type {PaperRequest} from './catalog-identity';
import {EDITABLE_DELIVERY} from './entry-prompts';

export type WorkbenchTaskId='author'|'scan'|'assemble';
export interface WorkbenchTask {
 label:string;
 attachment:string;
 example:PaperRequest;
 stages:readonly [string,string,string];
 instructions:string;
}
export const workbenchTasks:Record<WorkbenchTaskId,WorkbenchTask>={
 author:{
  label:'根据资料命题',attachment:'讲义、笔记或考试范围',
  example:{kind:'example',id:'primary-chinese'},
  stages:['命题资料','题组与评分','成品试卷'],
  instructions:'根据我附上的资料和考试范围编写原创题目，先确定覆盖范围、难度、题型和分值，然后制作可作答试卷、答案与评分要点。为每题保留资料依据并核对答案。',
 },
 scan:{
  label:'扫描卷转可编辑试卷',attachment:'扫描件、照片或 PDF',
  example:{kind:'example',id:'primary-math'},
  stages:['扫描页','核对后的题目','成品试卷'],
  instructions:'识别我附上的扫描卷或 PDF，按页核对文字、题号、公式、图表、选项和分值。保留原卷内容及可确认的版式结构。遇到无法辨认的题目先列出页码和疑点。用结构化题目和可编辑版式重排卷面。',
 },
 assemble:{
  label:'从题库选题组卷',attachment:'题库、知识点与题型要求',
  example:{kind:'example',id:'primary-english'},
  stages:['候选题目','组卷规则','成品试卷'],
  instructions:'根据我附上的题库、知识点和题型要求筛选题目，优先采用已核对的原题。保留共享阅读或听力材料、原题出处与评分，按要求编排题组并核对题数和总分。',
 },
};

export function workbenchPrompt(task:WorkbenchTask,launcher:string){
 return [launcher,task.instructions,EDITABLE_DELIVERY].join('\n\n');
}
