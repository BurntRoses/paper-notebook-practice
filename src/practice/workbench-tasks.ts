export type WorkbenchTaskId='author'|'scan'|'assemble';
export interface WorkbenchTask {
 label:string;
 exampleId:string;
 supplementaryId?:string;
 stages:readonly [string,string,string,string];
}
const authorPaperId='cn-p6-chinese-full';
const mathPaperId='cn-p6-math-full';
export const workbenchTasks:Record<WorkbenchTaskId,WorkbenchTask>={
 author:{
  label:'资料命题',exampleId:authorPaperId,
  stages:['资料与范围','命题蓝图','核题与评分','交付文件'],
 },
 scan:{
  label:'扫描转卷',exampleId:mathPaperId,
  stages:['扫描原页','定位与识别','校对与排版','交付文件'],
 },
 assemble:{
  label:'题库组卷',exampleId:mathPaperId,supplementaryId:'primary-math',
  stages:['候选题库','选题与分配','验算与溯源','交付文件'],
 },
};
