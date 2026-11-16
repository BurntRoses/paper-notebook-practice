import {applyPaperCustomization,type PaperCustomization} from './customization';
import {ENTRY_PROMPTS} from './entry-prompts';
import {EXAM_SPECIFICATIONS,type ExamSpecification} from './exam-specification';
import type {PracticeDocument,PracticePresentation,PracticeAuthoring,PracticeSourcePolicy} from './model';
import {PAPER_TEMPLATES,type PaperTemplate} from './templates';
import {authoringRequirements} from './authoring';
import {getExamRoute} from './exam-routes';

export interface DraftQuestionGroup {id:string;title:string;type:'choice'|'multiple'|'truefalse'|'blank'|'response'|'task';count:number;pointsPerQuestion:number}
export const DRAFT_QUESTION_TYPES={choice:'单项选择',multiple:'多项选择',truefalse:'判断题',blank:'填空题',response:'解答与论述',task:'操作、作品与实践任务'} as const;
export const blueprintTotal=(groups:DraftQuestionGroup[])=>Math.round(groups.reduce((sum,g)=>sum+g.count*g.pointsPerQuestion,0)*100)/100;
export function defaultDraftGroups(draft:Pick<PaperDraft,'templateId'|'subject'>):DraftQuestionGroup[]{
 const spec=EXAM_SPECIFICATIONS.find(s=>s.templateIds?.includes(draft.templateId)&&s.subject===draft.subject);
 if(spec){const groups:DraftQuestionGroup[]=[];for(const part of spec.sections){for(let i=0;i<part.count;i++){const points=part.questionScores?.[i]??part.pointsPerQuestion??part.totalScore/part.count,type=part.questionTypes?.[i]??(part.questionType==='mixed'?'response':part.questionType),previous=groups.at(-1);if(previous&&previous.title===part.title&&previous.type===type&&previous.pointsPerQuestion===points)previous.count++;else groups.push({id:`group-${groups.length+1}`,title:part.title,type,count:1,pointsPerQuestion:points});}}return groups;}
 const template=PAPER_TEMPLATES.find(t=>t.id===draft.templateId);
 if(template?.blueprint.sections.length)return template.blueprint.sections.map((part,i)=>({id:`group-${i+1}`,title:part.title,type:part.questionType,count:part.count??1,pointsPerQuestion:Math.round(((part.score??template.blueprint.totalScore/template.blueprint.sections.length)/(part.count??1))*100)/100}));
 return [{id:'group-1',title:'单项选择题',type:'choice',count:10,pointsPerQuestion:3},{id:'group-2',title:'解答题',type:'response',count:5,pointsPerQuestion:14}];
}

/** A design brief, independent of an imported bank or the user's working paper. */
export interface PaperDraft {
 templateId:string;subject:string;level:string;grade:string;title:string;titleOrigin:'template'|'custom';
 intent:'original'|'generate'|'bank';scope:'full'|'subset';subset:string;coverage:string;
 difficulty:'source'|'easy'|'balanced'|'hard';durationMinutes:number;totalScore:number;
 customization:PaperCustomization;
 blueprintMode:'auto'|'custom';questionGroups:DraftQuestionGroup[];
 routeId:string;examName:string;examCode:string;year:string;region:string;specialty:string;
 sourceMode:PracticeSourcePolicy['mode'];questionPreference:NonNullable<PracticeSourcePolicy['questionPreference']>;materialInstructions:string;
}

/** Editable profiles only. CET profiles use their specification, never their attached example bank. */
export const DRAFT_TEMPLATES:PaperTemplate[]=PAPER_TEMPLATES
 .filter(t=>!t.id.startsWith('source-')&&(!t.caseId||t.id==='cet4'||t.id==='cet6'))
 .map(({caseId:_caseId,...template})=>structuredClone(template));
const draftTemplate=(id:unknown)=>DRAFT_TEMPLATES.find(t=>t.id===id)??DRAFT_TEMPLATES.find(t=>t.id==='gaokao-math')!;
const sourceChoices=():PaperCustomization=>({projectMark:true,watermark:'source',integrity:'source',security:'source',candidateFields:'source',binding:'source',scoreTable:'source',paperSize:'source',printColor:'source'});
const defaultTitles:Record<string,string>={
 standard:'学科考试',
 'gaokao-math':'普通高等学校招生全国统一考试',
 'gaokao-chinese':'普通高等学校招生全国统一考试',
 'university-a4':'课程期末考试','university-a3':'课程期末考试',
 'cpa-accounting':'注册会计师全国统一考试','cpa-audit':'注册会计师全国统一考试',
 'ncre-python':'全国计算机等级考试','ncre-office':'全国计算机等级考试',
 'ielts-reading':'IELTS Academic Reading','ielts-writing':'IELTS Academic Writing',
 cet4:'全国大学英语四级考试',cet6:'全国大学英语六级考试','civil-service':'行政职业能力测验',
 shenlun:'申论','postgraduate-math':'全国硕士研究生招生考试','postgraduate-english':'全国硕士研究生招生考试',
 'engineering-course':'课程考核','engineering-professional':'专业实务考试'
};
export function createPaperDraft(templateId='gaokao-math'):PaperDraft {
 const template=draftTemplate(templateId);
 return {templateId:template.id,subject:template.subjects[0],level:template.level,grade:'',blueprintMode:'auto',questionGroups:[],title:defaultTitles[template.id]??template.name,titleOrigin:'template',
  intent:'generate',scope:'full',subset:'',coverage:'',difficulty:'source',routeId:'',examName:'',examCode:'',year:'',region:'',specialty:'',sourceMode:'uploads-first',questionPreference:'originals-first',materialInstructions:'',
  durationMinutes:template.blueprint.durationMinutes,totalScore:template.blueprint.totalScore,customization:sourceChoices()};
}
export function changeDraftTemplate(draft:PaperDraft,id:string):PaperDraft {
 const current=restorePaperDraft(draft),next=createPaperDraft(id);
 return {...next,grade:current.grade,intent:current.intent,scope:current.scope,subset:current.subset,coverage:current.coverage,difficulty:current.difficulty,year:current.year,region:current.region,specialty:current.specialty,sourceMode:current.sourceMode,questionPreference:current.questionPreference,materialInstructions:current.materialInstructions,customization:structuredClone(draft.customization)};
}
/** A route supplies subject context; uploaded originals still decide their own structure. */
export function changeDraftRoute(draft:PaperDraft,id:string):PaperDraft {
 const current=restorePaperDraft(draft),route=getExamRoute(id);
 if(!route)return {...current,routeId:''};
 const templateId=route.templateId??(route.family==='civil-service'?(route.id==='civil-essay'?'shenlun':'civil-service'):route.family==='postgraduate'?(/english/.test(route.id)?'postgraduate-english':/math/.test(route.id)?'postgraduate-math':'university-a4'):route.family==='engineering-course'?'engineering-course':route.family==='engineering-qualification'?'engineering-professional':'standard');
 const next=changeDraftTemplate(current,templateId);
 return {...next,routeId:route.id,subject:route.subject,level:route.family==='postgraduate'?'硕士研究生招生考试':next.level,...(route.family==='postgraduate'?{title:'全国硕士研究生招生考试'}:{}),examName:route.name,examCode:route.aliases.find(alias=>/^\d{3}$/.test(alias))??'',specialty:current.specialty};
}
const record=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const text=(value:unknown,fallback='',limit=2000)=>typeof value==='string'?value.trim().slice(0,limit):fallback;
const choice=<const T extends string>(value:unknown,options:readonly T[],fallback:T):T=>typeof value==='string'&&options.includes(value as T)?value as T:fallback;
const positive=(value:unknown,fallback:number,max:number,integer=false)=>{
 const n=typeof value==='number'?value:typeof value==='string'&&value.trim()?Number(value):NaN;
 return Number.isFinite(n)&&n>0&&n<=max&&(!integer||Number.isInteger(n))?n:fallback;
};
/** Restore only known, usable fields; malformed stored values cannot break preview rendering. */
export function restorePaperDraft(value:unknown):PaperDraft {
 if(typeof value==='string'){try{value=JSON.parse(value);}catch{value=undefined;}}
 const input=record(value),base=createPaperDraft(typeof input.templateId==='string'?input.templateId:undefined),settings=record(input.customization);
 const title=text(input.title,base.title,500)||base.title;
 const titleOrigin=choice(input.titleOrigin,['template','custom'],title===base.title?'template':'custom');
 const customization:PaperCustomization={
  projectMark:typeof settings.projectMark==='boolean'?settings.projectMark:true,
  watermark:choice(settings.watermark,['source','none','custom'],'source'),
  integrity:choice(settings.integrity,['source','none','standard','custom'],'source'),
  security:choice(settings.security,['source','none','custom'],'source'),
  candidateFields:choice(settings.candidateFields,['source','standard','none'],'source'),
  binding:choice(settings.binding,['source','binding','none'],'source'),
  scoreTable:choice(settings.scoreTable,['source','show','hide'],'source'),
  paperSize:choice(settings.paperSize,['source','A4','A3'],'source'),
  printColor:choice(settings.printColor,['source','color','grayscale'],'source')
 };
 for(const key of ['watermarkText','integrityText','securityText','institution','courseCode','notes'] as const){
  const content=text(settings[key],'',key==='notes'?6000:key==='integrityText'?4000:300);
  if(content)customization[key]=content;
 }
 for(const [key,contentKey] of [['watermark','watermarkText'],['integrity','integrityText'],['security','securityText']] as const){
  if(customization[key]==='custom'&&!customization[contentKey])customization[key]='source';
 }
 const questionGroups:DraftQuestionGroup[]=Array.isArray(input.questionGroups)?input.questionGroups.slice(0,30).flatMap((item,i)=>{const row=record(item),count=positive(row.count,0,5000,true),pointsPerQuestion=Math.round(positive(row.pointsPerQuestion,0,1000)*100)/100;return count&&pointsPerQuestion?[{id:`group-${i+1}`,title:text(row.title,`题组 ${i+1}`,200)||`题组 ${i+1}`,type:choice(row.type,Object.keys(DRAFT_QUESTION_TYPES) as DraftQuestionGroup['type'][],'response'),count,pointsPerQuestion}]:[];}):[];
 const validGroups=questionGroups.reduce((n,g)=>n+g.count,0)<=5000&&blueprintTotal(questionGroups)<=10000;
 const blueprintMode=input.blueprintMode==='custom'&&questionGroups.length&&validGroups?'custom':'auto';
 return {...base,grade:text(input.grade,'',100),blueprintMode,questionGroups,
  routeId:getExamRoute(text(input.routeId))?.id??'',examName:text(input.examName,'',300),examCode:text(input.examCode,'',80),year:/^(19|20|21)\d{2}$/.test(text(input.year))?text(input.year):'',region:text(input.region,'',200),specialty:text(input.specialty,'',300),
  sourceMode:choice(input.sourceMode,['uploads-only','uploads-first','open'],'uploads-first'),questionPreference:choice(input.questionPreference,['originals-first','balanced','generated-first'],'originals-first'),materialInstructions:text(input.materialInstructions,'',6000),
  subject:text(input.subject,base.subject,200)||base.subject,level:text(input.level,base.level,200)||base.level,title,titleOrigin,
  intent:choice(input.intent,['original','generate','bank'],base.intent),scope:choice(input.scope,['full','subset'],base.scope),
  subset:text(input.subset),coverage:text(input.coverage,'',6000),difficulty:choice(input.difficulty,['source','easy','balanced','hard'],base.difficulty),
  durationMinutes:positive(input.durationMinutes,base.durationMinutes,1440,true),totalScore:blueprintMode==='custom'&&input.intent!=='original'&&input.intent!=='bank'?blueprintTotal(questionGroups):positive(input.totalScore,base.totalScore,10000),customization};
}
function draftAuthoring(draft:PaperDraft):PracticeAuthoring {
 return {...(draft.routeId?{routeId:draft.routeId}:{}),...(draft.examName?{examName:draft.examName}:{}),...(draft.examCode?{examCode:draft.examCode}:{}),...(draft.year?{year:Number(draft.year)}:{}),...(draft.region?{region:draft.region}:{}),...(draft.specialty?{specialty:draft.specialty}:{}),...(draft.grade?{grade:draft.grade}:{}),difficulty:draft.difficulty,...(draft.coverage?{knowledge:draft.coverage}:{}),requireVerification:true};
}
const draftSourcePolicy=(draft:PaperDraft):PracticeSourcePolicy=>({mode:draft.sourceMode,questionPreference:draft.questionPreference});
/** Never borrow an unrelated university case's question counts or source content. */
function draftSpecification(draft:PaperDraft):ExamSpecification|undefined {
 return EXAM_SPECIFICATIONS.find(spec=>spec.templateIds?.includes(draft.templateId)&&spec.subject===draft.subject);
}
function specificationFits(draft:PaperDraft,spec:ExamSpecification):boolean {
 return draft.totalScore===spec.totalScore&&(spec.durationMinutes===null||draft.durationMinutes===spec.durationMinutes);
}
function hasVisualCustomization(settings:PaperCustomization):boolean {
 return ['watermark','integrity','security','candidateFields','binding','scoreTable','paperSize'].some(key=>{const value=settings[key as keyof PaperCustomization];return value!==undefined&&value!=='source';})||Boolean(settings.institution?.trim()||settings.courseCode?.trim());
}
function draftPresentation(draft:PaperDraft,template:PaperTemplate):PracticePresentation {
 const language=template.presentation?.language??(['ielts','language'].includes(template.layout.headerVariant)?'en':'zh'),english=language==='en';
 const presentation:PracticePresentation={...structuredClone(template.presentation??{sourceLayout:false}),
  titleLines:draft.title.includes('\n')?draft.title.split('\n').filter(Boolean):template.layout.headerVariant==='gaokao'||['postgraduate-math','postgraduate-english'].includes(template.id)?[draft.title,draft.subject]:[draft.title],
  metaLines:[({zh:`考试时间：${draft.durationMinutes} 分钟　满分：${draft.totalScore} 分`,en:`Time allowed: ${draft.durationMinutes} minutes　Total: ${draft.totalScore} points`,ja:`試験時間：${draft.durationMinutes}分　配点：${draft.totalScore}点`,ko:`시험 시간: ${draft.durationMinutes}분　배점: ${draft.totalScore}점`,fr:`Durée : ${draft.durationMinutes} minutes　Total : ${draft.totalScore} points`,de:`Bearbeitungszeit: ${draft.durationMinutes} Minuten　Gesamt: ${draft.totalScore} Punkte`} as const)[language]],
  sectionDetails:false,endText:'',subtitle:'',language,
  footerTemplate:({zh:`${draft.subject}试题　第 {page} 页（共 {pages} 页）`,en:'Page {page} of {pages}',ja:'{page} / {pages} ページ',ko:'{page} / {pages} 페이지',fr:'Page {page} sur {pages}',de:'Seite {page} von {pages}'} as const)[language]
 };
 if(!template.subjects.includes(draft.subject)){
  presentation.notices=english?['Read the instructions and answer as directed.','Return the paper and answer sheet at the end of the examination.']:['请认真阅读题目要求，按指定方式作答。','考试结束后，请将试卷和答题卡一并交回。'];
  if(presentation.answerCard)presentation.answerCard={...presentation.answerCard,title:`${draft.subject}答题卡`};
 }
 // Counts refer to the future sourced paper, never to the currently empty design document.
 if(['cet4','cet6'].includes(template.id))presentation.answerCard={template:'cet'};
 else if(template.layout.headerVariant==='university')presentation.answerCard={template:'university'};
 else if(template.layout.headerVariant==='ielts')presentation.answerCard={template:'boxed'};
 return presentation;
}
/** Empty sections are intentional: use renderPractice(..., {outline:true}), never final-paper validation. */
export function paperDraftDocument(value:PaperDraft):PracticeDocument {
 const draft=restorePaperDraft(value),template=draftTemplate(draft.templateId),referenceSpec=draftSpecification(draft);
 const spec=draft.blueprintMode==='auto'&&draft.intent==='generate'&&draft.scope==='full'&&referenceSpec&&specificationFits(draft,referenceSpec)?referenceSpec:undefined;
 const matchingSubject=template.subjects.includes(draft.subject),parts=spec?.sections;
 const matchingBlueprint=draft.durationMinutes===template.blueprint.durationMinutes&&draft.totalScore===template.blueprint.totalScore;
 const neutralTitle=['ielts','language'].includes(template.layout.headerVariant)?'Questions':'题目';
 const sections=draft.intent==='generate'&&draft.blueprintMode==='custom'?draft.questionGroups.map(g=>({id:g.id,title:g.title,instructions:'',score:Math.round(g.count*g.pointsPerQuestion*100)/100,scoreLabel:`（${g.count} 小题，每题 ${g.pointsPerQuestion} 分，共 ${Math.round(g.count*g.pointsPerQuestion*100)/100} 分）`,questions:[]})):draft.intent!=='generate'||draft.scope==='subset'||!matchingSubject?[{id:'draft-questions',title:neutralTitle,instructions:'',score:0,questions:[]}]:parts?parts.map(part=>({id:part.id,examPartId:part.id,title:part.title,displayLabel:'',
  instructions:typeof part.instructions==='string'?part.instructions:'',score:part.totalScore,
  scoreLabel:`（${part.count} ${draft.subject==='英语'?'tasks':'小题'}，${part.totalScore} ${draft.subject==='英语'?'points':'分'}）`,questions:[]})):
  template.blueprint.sections.map((part,i)=>({id:`draft-section-${i+1}`,title:part.title,instructions:part.instructions,score:matchingBlueprint&&!referenceSpec?part.score??0:0,questions:[]}));
 const paper:PracticeDocument={schemaVersion:'1.0.0',practiceId:'paper-design-draft',notebookId:'paper-design-draft',notebookRevision:1,
  title:draft.title,subject:draft.subject,level:draft.level,durationMinutes:draft.durationMinutes,totalScore:draft.totalScore,
  mode:draft.intent==='bank'?'bank':'mock',
  style:{templateId:template.id,preset:['ielts','language'].includes(template.layout.headerVariant)?'language':draft.subject.includes('数学')?'stem':draft.subject==='语文'?'humanities':'standard'},
  presentation:draftPresentation(draft,template),materials:[],sections,
  authoring:draftAuthoring(draft),sourcePolicy:draftSourcePolicy(draft),
  generation:{intent:draft.intent==='original'?(draft.titleOrigin==='custom'||hasVisualCustomization(draft.customization)?'adapt':'original'):'generate',ocrReviewed:false,unresolved:['尚待上传资料、完成题目与答案核对；当前仅为卷面设计稿。']}
 };
 if(spec)paper.exam={specificationId:spec.id,scope:draft.scope,scoreScale:spec.scoreScale};
 return applyPaperCustomization(paper,draft.customization);
}

/** The brief records wizard answers; the receiving conversation finishes source reading and authoring. */
export function paperDraftPrompt(value:PaperDraft,mode:'agent'|'chat'):string {
 const draft=restorePaperDraft(value),template=draftTemplate(draft.templateId),spec=draftSpecification(draft);
 const matchingSubject=template.subjects.includes(draft.subject),conflict=draft.blueprintMode==='auto'&&spec&&!specificationFits(draft,spec);
 const sourceOriginal=draft.intent==='original',bank=draft.intent==='bank';
 const customizedTitle=sourceOriginal&&draft.titleOrigin==='custom';
 const customizedOriginal=sourceOriginal&&(customizedTitle||hasVisualCustomization(draft.customization));
 const structureRequirement=sourceOriginal?'原卷以上传源件核定真实纸型、边距、题组、题量、时长、分值和完整原印标题；向导模板、学科层级、时间与总分只作设计参考，不覆盖原页。用户选择与源件冲突时，在一次集中补问中明确采用原件还是独立定制编辑版，不能静默改写原卷。':bank?'全量题库指上传资料中符合范围的题目全量，不是完整考试；按资料组织学科、章节、知识点和原有共享材料，不强制凑齐某考试的题量、题组、总分或录音。已有听力和录音按资料保留，只有用户明确要求制作听力题时补齐所需录音。':draft.blueprintMode==='custom'?`按我设置的题组、题型、题量和每题分值制作${draft.scope==='subset'?'指定部分，不扩展到整卷':'完整试卷'}；这是用户自定规格，不套用其他考试的固定题量。`:!matchingSubject?`当前学科“${draft.subject}”与参考模板学科不匹配，模板仅用于纸面样式。请依据新学科和上传资料重新确定题型、题组、题量与计分，不沿用旧学科的内容结构。`:draft.scope==='subset'?'本次仅制作指定部分，按该范围确定题组、题量、分值和材料，不按完整考试规格补齐其余题目。':conflict?`当前设置与${spec.name}的标准规格（${spec.durationMinutes===null?'原卷未注明时长':spec.durationMinutes+' 分钟'}、${spec.totalScore} 分）存在冲突。保留我设置的 ${draft.durationMinutes} 分钟、${draft.totalScore} 分，不静默改回标准值，也不套用标准题量或分段分值；请在一次集中补问中确认采用标准考试还是用户自定练习规格，若我授权沿用当前设置，则按自定规格制作。`:spec?'按同学科考试规格核对完整题组、题量、分值和材料。':'这是通用纸面模板，不预设统一题量，请依资料和具体课程核定题型、题组与题分。';
 const intent=sourceOriginal?(customizedOriginal?'依据上传原卷制作独立定制编辑版':draft.scope==='subset'?'从上传原卷提取指定部分并保留来源版式':'按上传的完整原卷逐页还原'):bank?'整理和交付全量题库':'根据上传资料制作新试卷';
 const titleRequirement=sourceOriginal?(customizedTitle?`自定义正式标题：${JSON.stringify(draft.title)}。此标题仅用于独立定制编辑版，任务标记为改编；原卷原文件和原印标题独立保留，不将定制版冒称原卷或原卷逐页复刻。`:`向导中的模板标题 ${JSON.stringify(draft.title)} 仅为设计占位，不作为原卷的改名要求。读取上传原卷后以完整原印标题、年份、地区、卷别及科目层级为准，不能用通用模板标题覆盖原卷标题。`):`正式标题：${JSON.stringify(draft.title)}。仅使用此标题。`;
 const difficulty={easy:'基础巩固，以直接应用与清晰推理为主',source:'沿用原件或资料的难度',balanced:'难度均衡、覆盖基础与综合应用',hard:'提高综合性与区分度'}[draft.difficulty];
 const customSpec:ExamSpecification|undefined=!sourceOriginal&&!bank&&draft.blueprintMode==='custom'?{id:'user-paper-blueprint',name:draft.title,subject:draft.subject,level:draft.level,durationMinutes:draft.durationMinutes,totalScore:draft.totalScore,scoreScale:'user-points',source:{kind:'user-blueprint',title:'用户题型与分值设置'},sections:draft.questionGroups.map(g=>({id:g.id,title:g.title,count:g.count,questionType:g.type,totalScore:Math.round(g.count*g.pointsPerQuestion*100)/100,pointsPerQuestion:g.pointsPerQuestion}))}:undefined;
 const job={...(customSpec?{specification:customSpec}:{}),...(!sourceOriginal||customizedTitle?{title:draft.title}:{}),
  ...(!sourceOriginal?{subject:draft.subject,level:draft.level}:{}),
  ...(!sourceOriginal&&!bank?{templateId:draft.templateId,durationMinutes:draft.durationMinutes,targetScore:draft.totalScore}:{}),
  ...(!sourceOriginal&&!bank&&draft.blueprintMode==='custom'?{count:draft.questionGroups.reduce((sum,g)=>sum+g.count,0),sections:draft.questionGroups.map(g=>({id:g.id,title:g.title,count:g.count,types:[g.type],pointsPerQuestion:g.pointsPerQuestion}))}:{}),
  intent:sourceOriginal?(customizedOriginal?'adapt':'original'):'generate',mode:bank?'bank':'mock',scope:draft.scope,customization:draft.customization,authoring:draftAuthoring(draft),sourcePolicy:draftSourcePolicy(draft)};
 const designReference=sourceOriginal||bank?{title:draft.title,titleOrigin:draft.titleOrigin,subject:draft.subject,level:draft.level,templateId:draft.templateId,durationMinutes:draft.durationMinutes,totalScore:draft.totalScore}:undefined;
 const scopeRequirement=draft.scope==='subset'?`指定部分：${draft.subset||'具体部分待结合资料确认'}`:bank?'上传资料范围内的全量题库':'完整考试 / 完整原卷';
 const customizationRequirement=sourceOriginal?(customizedOriginal?'已明确选择的自定义标题或非 source 纸面设置仅落实在独立定制编辑版，原件和原页复刻保持独立，不能将编辑版称为原卷。':'本次所有纸面选项沿用源件，模板默认卷头、纸型、装饰和留白不替代原件。'):'';
 return `${ENTRY_PROMPTS[mode].prompt}\n\n我的出卷要求：\n`+
  `- 制作目标：${intent}；本次范围以此为准：${scopeRequirement}。${draft.scope==='subset'?'不扩大为整卷；自由文本范围由当前会话结合资料落实，范围不明确时只补问实际缺项。':''}\n`+
  `- ${titleRequirement}${sourceOriginal?'参考学科':'学科'}：${draft.subject}；${sourceOriginal?'参考层级':'层级'}：${draft.level}；年级：${draft.grade||'依据资料确定'}。纸面不加“选编”“模拟”“重组”等制作标签；来源身份和实际范围保存在元数据与交付说明。\n`+
  `- 参考版式：${template.name}；${sourceOriginal||bank?'参考时间':'考试时间'}：${draft.durationMinutes} 分钟；${sourceOriginal||bank?'参考总分':'总分'}：${draft.totalScore} 分。${structureRequirement}${customizationRequirement}\n`+
  `- 打印颜色：${{source:'保留原件或模板中的颜色',color:'彩印，保留图像与作品原色',grayscale:'黑白灰度，图例同时使用编号、线型或形状；若题目考查颜色，先换用等价可作答材料，不直接去色'}[draft.customization.printColor??'source']}。色彩辨识题的附件标记 colorRequired:true；无等价黑白替代时保持彩印，并说明打印要求。\n`+
  `- 知识范围与重点：${draft.coverage||'按上传资料覆盖'}；${sourceOriginal?'难度选择仅作参考，以原题为准':'难度'}：${difficulty}。${draft.scope==='subset'&&draft.subset?'只收入所指定的部分，保留完整共享材料。':''}\n\n`+
  `- 考试目标：${draft.examName||'结合科目与资料识别'}${draft.examCode?'；科目代码：'+draft.examCode:''}${draft.year?'；考试年份：'+draft.year:''}${draft.region?'；地区：'+draft.region:''}${draft.specialty?'；专业 / 方向：'+draft.specialty:''}。未填写的年份、地区和适用规范，以资料或正式发布内容核实。\n`+
  `- 资料来源：${{ 'uploads-only':'仅用上传资料，不检索网络、不补入外部材料','uploads-first':'优先上传资料；资料不足时检索可靠互联网来源补齐',open:'结合上传资料与可靠互联网来源'}[draft.sourceMode]}。题目偏好：${{'originals-first':'优先核实的原题，缺口再改编或新编',balanced:'原题、改编与新编按考查目标搭配','generated-first':'优先围绕资料新编实质题目'}[draft.questionPreference]}。${draft.materialInstructions?'指定资料要求：'+draft.materialInstructions+'。先把文件名映射到实际 materialId，再写入 requiredMaterialIds / allowedMaterialIds / excludedMaterialIds；不能用猜测的 ID。':''}\n\n`+
  `${authoringRequirements({subject:draft.subject,level:draft.level,...draftAuthoring(draft),sourcePolicy:draftSourcePolicy(draft),mode:draft.intent==='bank'?'bank':'mock',intent:sourceOriginal?(customizedOriginal?'adapt':'original'):'generate',blueprint:draft.blueprintMode==='custom'&&draft.intent==='generate'?draft.questionGroups:undefined})}\n\n`+
  `结构化组卷要求（job.customization 记录全部纸面选择；source 表示沿用原件，不增删原件内容）：\n\`\`\`json\n${JSON.stringify({job,...(designReference?{designReference}:{})},null,2)}\n\`\`\`\n\n`+
  `${designReference?'designReference 仅记录向导设计参考，不是最终 job 的强制属性；读完资料后再核定真实规格。\n':''}资料尚待我上传，当前向导只确定卷面设计和制作偏好，尚未完成题目、答案或原卷复刻。请先读取我上传的往年卷、题库、知识点和参考资料，以及本条已有选择；将仍影响成品的缺失偏好一次集中询问，已在向导中回答的内容不要重复询问。我授权自行决定的项目按资料和合理默认值继续。\n`+
  `原卷任务先核对完整首页、封面、页序和总页数，保留真实标题、密级、诚信承诺、课程代码、考生栏、须知、装订线、评分表、水印、装饰、页眉页脚与留白；网页裁切图不证明历史原卷缺少相应内容。自定义视觉内容使用独立可编辑版，保留原始文件。${sourceOriginal?(draft.scope==='subset'?'指定部分只保留源件中该部分的完整共享材料与已有录音，不补造原题、不扩展到整卷。':'完整原卷保留全部原题、共享材料与已有录音，缺页继续取得可靠原件，不补造历史试题。'):bank?'全量题库按上传资料的实际题目与材料整理，不补造整套考试；保留该范围原有的共享材料与已有录音。':'新卷按实际学科、已选范围与相应规格完成题组、材料和必要录音；指定部分只补齐该部分的完整共享材料和录音，不扩展到整卷。'}\n`+
  `逐题核对题号、题干、选项、公式、图表、单位、答案、评分与总分，检查答题卡的实际题号、选项、空数及作答空间，再检查渲染和打印。交付离线题目卷、独立答案卷、答题卡和可复用题库；需要时另附原卷复刻。沿用项目免费、MIT、离线流程，无需账户、付费OCR或模型 API 密钥；识别、数据整理、命令和文件生成由当前会话完成。`;
}
