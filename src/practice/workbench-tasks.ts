import {EDITABLE_DELIVERY} from './entry-prompts';
import {homePaperAsset,homePaperCommand,homePapers} from './home-papers';

export type WorkbenchTaskId='author'|'scan'|'assemble';
export interface WorkbenchTask {
 label:string;
 exampleId:string;
 supplementaryId?:string;
 stages:readonly [string,string,string,string];
 instructions:string;
}
const authorPaperId='cn-p6-chinese-full';
const mathPaperId='cn-p6-math-full';
export const workbenchTasks:Record<WorkbenchTaskId,WorkbenchTask>={
 author:{
  label:'资料命题',exampleId:authorPaperId,
  stages:['资料与范围','命题蓝图','核题与评分','交付文件'],
  instructions:'读我提供的讲义、课文与知识范围。用内置完整样卷的分组、评分与版式作为参考，先形成各题组的能力目标、时长、题量和总分，再编写原创题目。独立核对答案和干扰项，为阅读、应用、写作等主观任务逐题编写部分分标准。按用户要求做完整卷，只有明确要求专项练习才选编。',
 },
 scan:{
  label:'扫描转卷',exampleId:mathPaperId,
  stages:['扫描原页','定位与识别','校对与排版','交付文件'],
  instructions:'使用仓库的 ingest 读取我提供的完整扫描卷或 PDF，保留原始文件和逐页提取位置。按原页核对题号、数字、符号、分数线、选项、题图和分值，记录更正与未解决问题。资料不全时，找同一原卷的缺页或向我确认范围。确认后重排成可编辑 HTML，保留原卷题组、分值与应有的版式差异。',
 },
 assemble:{
  label:'题库组卷',exampleId:mathPaperId,supplementaryId:'primary-math',
  stages:['候选题库','选题与分配','验算与溯源','交付文件'],
  instructions:'从我提供的题库或知识点出发。用参考卷的考试规格为每组确定题型、覆盖范围、题量和分值，引用符合条件的题目 ID，保留原题题分、附件与共享材料。先查明题库缺口，按我确认的范围补齐，核对总分与重题后输出整卷。',
 },
};

export function workbenchPrompt(task:WorkbenchTask,launcher:string){
 const paper=homePapers.find(item=>item.id===task.exampleId)!;
 return [
  launcher,
  '先读取项目资产作为参照：'+homePaperAsset(paper)+'。可执行 '+homePaperCommand(paper)+' 导出完整的参考作者数据。',
  task.instructions,
  '由你执行项目的 ingest、plan、run 或 build、coverage 与 verify。核对实际卷面，直接交付题目卷、答案卷、答题卡和结构验收记录。',
  EDITABLE_DELIVERY,
 ].join('\n\n');
}
