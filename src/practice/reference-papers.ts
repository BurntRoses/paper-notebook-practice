import china from '../../skills/paper-notebook-practice/references/authentic-china-papers.json';
import global from '../../skills/paper-notebook-practice/references/authentic-global-papers.json';
import realCatalog from './real-cases.json';
import {resolveExamRoute,getExamRoute,examRouteTemplateId} from './exam-routes';

export interface ReferencePaper {
 id:string;title:string;year?:number|null;board:string;paperUrl:string;answerUrl?:string;specificationUrl?:string;
 language:string;pages?:number;sha256?:string;scope:string;readNotes:string[];authoringLessons:string[];
 rights:{redistribute:boolean;note:string};collectionId:string;collectionTitle:string;templateIds:string[];
}
export interface ReferenceCollection {
 id:string;title:string;category:string;templateIds:string[];
 papers:Omit<ReferencePaper,'collectionId'|'collectionTitle'|'templateIds'>[];
 gaps?:string[];
}
const baseTemplates:Record<string,string[]>={
 'neea-2024-math':['gaokao-math','standard'], 'neea-2024-chinese':['gaokao-chinese'],
 'guangdong-2024-math':['standard'], 'pku-calculus-2013':['university-a4','university-a3'],
 'ecnu-linear-2023':['university-a4','university-a3'], 'ustc-probstat-2023':['university-a4','university-a3'],
 'neea-cet4-2016':['cet4','source-complete-cet4-original-01'],
 'neea-cet6-2016':['cet6','source-full-cet6-original-01'],
 'mit-6006-final-2020':['engineering-course']
};
// Reuse the source identities already attached to inspected historical cases.
const historical:ReferenceCollection[]=realCatalog.sources.filter(source=>!source.id.includes('original-complete')).flatMap(source=>{
 const cases=realCatalog.cases.filter(p=>p.materials.some(m=>m.url===source.url));
 if(!cases.length)return [];
 return [{id:'historical-'+source.id,title:source.title,category:source.subject,
  templateIds:[...new Set([...baseTemplates[source.id]??[],...cases.map(p=>'source-'+p.practiceId)])],
  papers:[{id:source.id,title:source.title,year:source.year,board:source.institution,paperUrl:source.url,
   language:source.id.startsWith('mit-')||source.id.includes('english')||source.id.includes('cet')?'en':'zh',
   pages:source.pageCount??undefined,sha256:source.sha256,scope:source.scope??'历史原文件，案例收入范围另记',
   readNotes:[source.scope??'保留来源身份与实际收入范围',`发布形态：${source.format}`],
   authoringLessons:[source.subject.includes('数学')?'逐题核对运算、条件与证明；从完整原卷确认题组和分数，不能把所选小题的范围套作整卷。':'保留原卷任务顺序、共享材料与实际题号；从完整原件区分公开样卷、题目节选和完整考试。',
    '项目可作答案例的收入范围与原文件分别记录；项目独立解答不能标为官方评分。'],
   rights:{redistribute:false,note:source.rights}}]}];
});
export const REFERENCE_COLLECTIONS:ReferenceCollection[]=[...historical,...china.collections as ReferenceCollection[],...global.collections as ReferenceCollection[]];
const paperIndex=new Map<string,ReferencePaper>();
for(const c of REFERENCE_COLLECTIONS)for(const p of c.papers){
 const prior=paperIndex.get(p.id);
 paperIndex.set(p.id,{...prior,...p,collectionId:c.id,collectionTitle:c.title,
  templateIds:[...new Set([...prior?.templateIds??[],...c.templateIds])],
  readNotes:[...new Set([...prior?.readNotes??[],...p.readNotes])],
  authoringLessons:[...new Set([...prior?.authoringLessons??[],...p.authoringLessons])]});
}
export const REFERENCE_PAPERS:ReferencePaper[]=[...paperIndex.values()];
export function referencePapersForTemplate(templateId:string):ReferencePaper[]{return REFERENCE_PAPERS.filter(p=>p.templateIds.includes(templateId));}
export function getReferencePaper(id:string):ReferencePaper|undefined{return REFERENCE_PAPERS.find(p=>p.id===id);}
export function referenceCollectionsFor(id:string):ReferenceCollection[]{const route=getExamRoute(id),templateId=route?examRouteTemplateId(route):id;return REFERENCE_COLLECTIONS.filter(c=>c.id===id||c.templateIds.includes(templateId)||c.papers.some(p=>p.id===id));}
export function referenceStudy(context:{templateId?:string;subject?:string;level?:string;authoring?:{routeId?:string;examName?:string;examCode?:string;specialty?:string};sourcePolicy?:{mode?:string}}){
 const route=resolveExamRoute({subject:context.subject,...context.authoring})??(/小学|primary|elementary/i.test(context.level??'')?resolveExamRoute({subject:'小学'+context.subject}):undefined);
 const templateId=route?examRouteTemplateId(route):context.templateId;
 const ids=[templateId,context.templateId].filter((id):id is string=>Boolean(id));
 const collections=[...new Map(ids.flatMap(referenceCollectionsFor).map(c=>[c.id,c])).values()];
 return {kind:'reference-study',templateId:templateId??null,layoutTemplateId:context.templateId??null,routeId:route?.id??null,
  target:{subject:context.subject??null,level:context.level??null,examName:context.authoring?.examName??route?.name??null},
  contentPolicy:context.sourcePolicy?.mode??'uploads-first',
  instructions:'Read references/reference-study.md. Collections provide authentic references for the selected layout family; they do not establish that every subject, region or examination in that family is covered. Select the papers matching the target subject and component; obtain missing target papers instead of adopting an unrelated course or jurisdiction. A different layout reference is only for page design. Inspect the matching question papers and scoring sources, establish the exact target component and year, then save source comparisons, an ability blueprint and independent solutions. Uploads-only forbids importing external questions or knowledge; use only permitted sources.',
  collections,
  unresolved:collections.length?collections.flatMap(c=>c.gaps??[]):['Select the exact board, stage, subject and component; obtain its authentic paper and scoring evidence before adopting a full-exam specification.']};
}
