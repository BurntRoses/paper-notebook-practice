import {applyPaperCustomization,type PaperCustomization} from './customization';
import {ENTRY_PROMPTS} from './entry-prompts';
import {EXAM_SPECIFICATIONS,type ExamSpecification} from './exam-specification';
import type {PracticeDocument,PracticePresentation,PracticeAuthoring,PracticeSourcePolicy} from './model';
import {PAPER_TEMPLATES,type PaperTemplate} from './templates';
import {getExamRoute,examRouteTemplateId} from './exam-routes';

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
 const templateId=examRouteTemplateId(route);
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

/** A compact brief carries user choices; production rules are read from GitHub. */
export function paperDraftPrompt(value:PaperDraft,mode:'agent'|'chat'):string {
 const d=restorePaperDraft(value),original=d.intent==='original',bank=d.intent==='bank';
 const customTitle=original&&d.titleOrigin==='custom';
 const editedOriginal=original&&(customTitle||hasVisualCustomization(d.customization));
 const c=d.customization;
 const modeName=original?(editedOriginal?'按原卷改编':'按原卷复刻'):bank?'整理全量题库':'制作试卷';
 const lines=[
  '制作目标 · '+modeName, '范围 · '+(d.scope==='full'?'完整范围':d.subset||'按资料确定选编范围'),
  ...(!original||customTitle?['试卷标题 · '+d.title]:[]),
  '科目与层级 · '+[d.subject,d.level,d.grade].filter(Boolean).join(' / '),
  '版式 · '+draftTemplate(d.templateId).name,
  ...(!original&&!bank?['时长与满分 · '+d.durationMinutes+' 分钟 / '+d.totalScore+' 分']:[]),
  ...(d.coverage?['内容范围 · '+d.coverage]:[]),
  '难度 · '+({source:'按资料确定',easy:'基础',balanced:'难度均衡',hard:'提升'} as const)[d.difficulty],
  ...([d.examName||getExamRoute(d.routeId)?.name,d.examCode,d.year,d.region,d.specialty].some(Boolean)?
   ['考试及适用范围 · '+[d.examName||getExamRoute(d.routeId)?.name,d.examCode,d.year,d.region,d.specialty].filter(Boolean).join(' / ')]:[]),
  '资料范围 · '+({ 'uploads-only':'仅用上传资料','uploads-first':'优先用上传资料，缺项可补充公开来源',open:'可使用上传材料与公开资料'} as const)[d.sourceMode],
  '选题偏好 · '+({'originals-first':'原题优先',balanced:'原题与原创均衡','generated-first':'原创优先'} as const)[d.questionPreference],
  ...(d.materialInstructions?['资料要求 · '+d.materialInstructions]:[]),
  ...(d.intent==='generate'&&d.blueprintMode==='custom'?d.questionGroups.map(g=>'题组 · '+g.title+' / '+DRAFT_QUESTION_TYPES[g.type]+' / '+g.count+' 题，每题 '+g.pointsPerQuestion+' 分'):[]),
  ...(original?['版式参考 · '+d.title+' / '+d.durationMinutes+' 分钟 / '+d.totalScore+' 分']:[]),
  '项目署名 · '+(c.projectMark===false?'隐藏':'显示'),
 ];
 if(c.watermark==='none')lines.push('水印 · 移除');
 if(c.watermark==='custom')lines.push('水印 · '+c.watermarkText);
 if(c.integrity==='none')lines.push('诚信承诺 · 移除');
 if(c.integrity==='standard')lines.push('诚信承诺 · 使用项目通用文案');
 if(c.integrity==='custom')lines.push('诚信承诺 · '+c.integrityText);
 if(c.security==='none')lines.push('密级标记 · 移除');
 if(c.security==='custom')lines.push('密级标记 · '+c.securityText);
 if(c.candidateFields==='none')lines.push('身份栏 · 隐藏');
 if(c.candidateFields==='standard')lines.push('身份栏 · 通用信息栏');
 if(c.binding==='binding')lines.push('装订线 · 显示');
 if(c.binding==='none')lines.push('装订线 · 隐藏');
 if(c.scoreTable==='show')lines.push('计分表 · 显示');
 if(c.scoreTable==='hide')lines.push('计分表 · 隐藏');
 if(c.paperSize&&c.paperSize!=='source')lines.push('纸张 · '+c.paperSize);
 if(c.printColor&&c.printColor!=='source')lines.push('打印颜色 · '+(c.printColor==='color'?'彩印':'黑白灰度'));
 if(c.institution)lines.push('机构 · '+c.institution);
 if(c.courseCode)lines.push('课程代码 · '+c.courseCode);
 if(c.notes)lines.push('补充版式要求 · '+c.notes);
 return ENTRY_PROMPTS[mode].prompt+'\n\n已确认的出卷要求\n'+lines.map(line=>'- '+line).join('\n');
}
