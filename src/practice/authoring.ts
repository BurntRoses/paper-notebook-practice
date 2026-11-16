import registry from '../../skills/paper-notebook-practice/references/authoring-profiles.json';
import {resolveExamRoute,type ExamRouteContext} from './exam-routes';

export type AuthoringDifficulty='source'|'balanced'|'hard'|'easy';
export interface AuthoringContext extends ExamRouteContext {
 subject:string;level?:string;grade?:string;difficulty?:AuthoringDifficulty;knowledge?:string;
 mode?:'mock'|'bank';intent?:'original'|'adapt'|'generate';profileIds?:string[];requireVerification?:boolean;
 sourcePolicy?:{mode:'uploads-only'|'uploads-first'|'open';questionPreference?:'originals-first'|'balanced'|'generated-first';requiredMaterialIds?:string[];allowedMaterialIds?:string[];excludedMaterialIds?:string[];requiredVersions?:{materialId:string;version:string}[]};
 blueprint?:{type?:string;count:number;pointsPerQuestion?:number;id?:string;knowledge?:string;ability?:string;types?:string[];points?:number;estimatedMinutes?:number;sourceIds?:string[]}[];
}
export interface AuthoringProfile {
 id:string;label:string;subjectPattern:string;focus:string;design:string[];checks:string[];rubric:string;
 exemplars:{caseId:string;scope:string;strategy:string}[];
}
export interface AuthoringStage {id:string;label:string;requirements:string[]}
export const AUTHORING_PROFILES=registry.profiles as AuthoringProfile[];
export const AUTHORING_STAGES=registry.stages as AuthoringStage[];
export const AUTHORING_DIFFICULTIES=registry.difficultyDistributions;
export const selectAuthoringRoute=resolveExamRoute;

function inferProfile(context:AuthoringContext):AuthoringProfile {
 const specialised=['calculus','linear-algebra','probability-statistics','engineering-mechanics','electrical-electronics','control-systems','fluid-thermal','process-engineering','materials-science','engineering-safety','engineering-regulations','surveying-computation','english-reading-writing','civil-essay','civil-aptitude','computer-systems','logic-reasoning','argumentative-writing','quantitative-data','engineering-design'];
 const ordered=[...specialised.map(id=>AUTHORING_PROFILES.find(p=>p.id===id)!),...AUTHORING_PROFILES.filter(p=>!specialised.includes(p.id)&&p.id!=='general')];
 return ordered.find(p=>new RegExp(p.subjectPattern,'i').test(context.subject))??AUTHORING_PROFILES.find(p=>p.id==='general')!;
}

/** Composite exams select several methods; specific course methods precede broad subject families. */
export function selectAuthoringProfiles(context:AuthoringContext):AuthoringProfile[] {
 const route=selectAuthoringRoute(context),inferred=inferProfile(context);
 const specialistRoute=route?.id==='postgrad-specialist'?resolveExamRoute({subject:context.subject.replace(/院校专业课|考研专业课|自命题专业课|专业课自命题/g,'')}):undefined;
 const ids=[...(context.profileIds??[]),...(route?.profileIds??[]),...(specialistRoute?.profileIds??[]),...(!route||route.id==='postgrad-specialist'?[inferred.id]:[])];
 const profiles=[...new Set(ids)].map(id=>AUTHORING_PROFILES.find(p=>p.id===id)).filter((p):p is AuthoringProfile=>Boolean(p));
 const chosen=profiles.length>1?profiles.filter(p=>p.id!=='general'):profiles;
 return chosen.length?chosen:[AUTHORING_PROFILES.find(p=>p.id==='general')!];
}
export function selectAuthoringProfile(context:AuthoringContext):AuthoringProfile {return selectAuthoringProfiles(context)[0];}

export function selectAuthoringStage(context:AuthoringContext):AuthoringStage|undefined {
 const infer=(text:string)=>{
  if(/职业|中职|高职|中专|大专|技校|资格|vocational/i.test(text))return 'vocational';
  if(/大学|本科|研究生|硕士|博士|考研|大[一二三四五]|college|university|graduate/i.test(text))return 'university';
  if(/高中|高[一二三123]|高考|senior|high school|grade\s*(10|11|12)\b/i.test(text))return 'high';
  if(/初中|初[一二三123]|中考|junior|middle school|grade\s*[789]\b|[七八九789]年级/i.test(text))return 'middle';
  if(/小学|primary|elementary|grade\s*[1-6]\b|[一二三四五六1-6]年级/i.test(text))return 'primary';
  return undefined;
 };
 const route=selectAuthoringRoute(context);
 const id=infer(context.level??'')??infer(context.grade??'')??(route?.family==='postgraduate'||route?.family==='engineering-course'?'university':route?.family==='engineering-qualification'?'vocational':route?.family==='school-assessment'?'primary':undefined);
 return AUTHORING_STAGES.find(s=>s.id===id);
}

function sourceRequirements(context:AuthoringContext):string[] {
 const policy=context.sourcePolicy,mode=policy?.mode??'uploads-first',preference=policy?.questionPreference??'originals-first';
 return [
  mode==='uploads-only'?'【资料边界】仅使用用户允许的上传资料，不检索或引入外部题目、事实、公式依据或参考答案。可由当前 Agent 对这些资料独立求解、改编或新编；新编材料记录 derivedFrom，所需依据缺失时记录具体缺口。':mode==='uploads-first'?'【资料边界】先读用户上传且允许使用的资料，按用户指定材料与版本定位知识和原题；仅针对规格、题目、答案或规范依据的实际缺口检索互联网补充。':'【资料边界】可结合上传资料与互联网研究；优先原始公开材料、官方大纲/原卷/勘误和院校课程来源，实际读取正文再引用。',
  preference==='originals-first'?'【选题偏好】默认原题优先，先筛选范围、版本、难度和题组相符的可用原题，缺口再改编或新编；不得把回忆题、机构整理或新写内容冒充官方原题。':preference==='generated-first'?'【选题偏好】优先围绕指定知识与能力编写真实任务，独立求解后补入原题作覆盖；原创身份与依据分别保留。':'【选题偏好】在原题覆盖、迁移练习与新增任务之间按蓝图安排；原题、改编、新编逐题记录。',
  ...(policy?.requiredMaterialIds?.length?[`【必用资料】${policy.requiredMaterialIds.join('、')}；逐项映射到实际题目与证据，资料中没有适用内容时保留具体缺口。`]:[]),
  ...(policy?.allowedMaterialIds?.length?[`【允许资料】${policy.allowedMaterialIds.join('、')}；派生作者材料的依据也须在允许范围内。`]:[]),
  ...(policy?.excludedMaterialIds?.length?[`【排除资料】${policy.excludedMaterialIds.join('、')}；不得通过复制到作者材料绕过排除。`]:[]),
  ...(policy?.requiredVersions?.length?[`【指定版本】${policy.requiredVersions.map(v=>v.materialId+'='+v.version).join('；')}；规范条款和答案按指定版本核对，历史题与现行规则冲突要分别处理。`]:[])
 ];
}

/** This brief instructs the current assistant; production metadata never enters the candidate paper. */
export function authoringRequirements(context:AuthoringContext):string {
 const profiles=selectAuthoringProfiles(context),stage=selectAuthoringStage(context),route=selectAuthoringRoute(context);
 const requestedDifficulty=context.difficulty??'source';
 const difficulty=context.intent==='original'||context.mode==='bank'?'source':requestedDifficulty;
 const distribution=difficulty==='source'?undefined:AUTHORING_DIFFICULTIES[difficulty];
 const lines=[
  `【出题目标】学科：${context.subject||'按上传资料确认'}；层级：${context.level||stage?.label||'按课程资料确认'}；年级：${context.grade||'按资料和课程进度确认'}。`,
  ...(route?[`【考试路线】${route.name}（${route.id}）；${[context.year&&String(context.year)+'年',context.region,context.specialty].filter(Boolean).join('；')||'年度、地区及专业以用户资料为准'}。路线提供出题方法，不等同已核定完整考试规格。`,...route.sourceGuidance]:[]),
  ...sourceRequirements(context),
  ...profiles.map(profile=>`【学科方法】${profile.label}：${profile.focus}。`),
  ...(context.knowledge?.trim()?[`【知识范围】${context.knowledge.trim()}。保留用户重点，按资料定位，不自行扩展到未学内容。`]:[]),
  ...(stage?stage.requirements:[]),
  ...profiles.flatMap(profile=>profile.design),
  ...(route?.exclusions?.map(exclusion=>`【范围排除】${exclusion}。`)??[]),
  ...(context.mode==='bank'?['【全量题库】覆盖上传资料中全部可用题目与知识范围，保留章节、知识点、题型、难度和原题关系；不为凑整卷题量增题，不强制补录音或套整卷时间。']:['【整卷蓝图】先核定考试规格与用户指定题型、题量、每题或每组分值、总分及时间；按知识点与认知要求分配题目，完整保留共享材料和题组。']),
  ...(context.blueprint?.length?[`【题型配置】${context.blueprint.map(p=>`${p.type??p.types?.join('/')??p.id??'任务'} ${p.count}题${p.pointsPerQuestion===undefined?'':`×${p.pointsPerQuestion}分`}${p.points===undefined?'':`/共${p.points}分`}${p.knowledge?'；知识：'+p.knowledge:''}${p.ability?'；能力：'+p.ability:''}${p.estimatedMinutes===undefined?'':`；预计${p.estimatedMinutes}分钟`}${p.sourceIds?.length?'；来源：'+p.sourceIds.join('、'):''}`).join('；')}。题分、组分与总分逐级相等；配置与完整考试规格冲突时先指出具体冲突并解决。`]:[]),
  distribution?`【新编难度】建议题量分布：基础${Math.round(distribution.easy*100)}%、中等${Math.round(distribution.medium*100)}%、综合${Math.round(distribution.hard*100)}%；按实际题数取整并保持总数。难度依据所需步骤、抽象程度与迁移要求标注，仍以当前年级课程为界；未试测前作为命题预期记录。`:'【难度】沿用原题、课程与指定考试要求，不为统一标签改写原题或改分。',
  ...registry.commonRequirements,
  ...profiles.flatMap(profile=>profile.checks),
  ...(route?.checks??[]),
  ...profiles.map(profile=>`【评分·${profile.label}】${profile.rubric}`),
  '【研究记录】按资料与知识定位→缺口检索→实际读取→证据比对→命题→独立求解→复核推进；记录检索目的、URL、发布机构、版本与获取日期。找到网页、填入字段或校验通过均不证明答案已独立验证。',
  '【资料与交付】每题保留可定位的知识或题目出处；新编材料明确记录作者身份。制作独立题目卷、答案卷、答题卡和可复用题库，实际检查内容、分值、编号、图表、分页及作答空间。'
 ];
 return [...new Set(lines)].join('\n');
}
