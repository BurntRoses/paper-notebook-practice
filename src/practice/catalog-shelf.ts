import cases from './real-cases.json';
import examples from './template-examples.json';
import {PAPER_TEMPLATES,type PaperTemplate} from './templates';
import {TOPIC_CASES} from './topics';
import {paperLanguageFor,type CatalogEntry,type CatalogIdentity,type CatalogLanguage,type CatalogRegion} from './catalog-identity';
import type {CatalogCategory} from './catalog-categories';
import type {PracticeDocument} from './model';

const assignments=[
 ['通用排版','general','zh', ['standard']],
 ['高中与高考','mainland','zh',['gaokao-math','gaokao-chinese','science-color','biology-visual']],
 ['大学课程','mainland','zh',['university-a4','university-a3','engineering-course']],
 ['大学课程','mainland','en',['cet4','cet6']],
 ['职业资格','mainland','zh',['cpa-accounting','cpa-audit','ncre-python','ncre-office','engineering-professional']],
 ['公务员与招聘','mainland','zh',['civil-service','shenlun']],
 ['研究生考试','mainland','zh',['postgraduate-math']],
 ['研究生考试','mainland','mixed',['postgraduate-english']],
 ['小学','mainland','zh',['primary-math','primary-chinese']],
 ['小学','mainland','mixed',['primary-english']],
 ['小学','england','en',['england-ks2-math']],
 ['小学','hongkong','zh-Hant',['hk-p6-chinese']],
 ['小学','hongkong','en',['hk-p6-english']],
 ['国际课程与升学','international','en',['cambridge-igcse-math','cambridge-alevel-math','ib-math-aa']],
 ['国际课程与升学','us','en',['sat','act','ap-calculus']],
 ['国际课程与升学','japan','ja',['eju']],
 ['语言考试','international','en',['ielts-reading','ielts-writing']],
 ['语言考试','japan','ja',['jlpt-n5','jlpt-n2','jft-basic']],
 ['语言考试','korea','ko',['topik-ii']],
 ['语言考试','mainland','zh',['hsk3']],
 ['语言考试','france','fr',['delf-b1']],
 ['语言考试','dach','de',['goethe-b1']],
 ['公民与入籍','us','en',['us-civics']],
 ['公民与入籍','uk','en',['uk-civics']],
 ['公民与入籍','canada','en',['canada-civics']],
 ['公民与入籍','australia','en',['australia-civics']],
 ['艺术与音乐','international','en',['cambridge-art','music-theory','music-performance']],
 ['艺术与音乐','us','en',['ap-art-history']],
 ['艺术与音乐','general','en',['design-studio']],
] as const satisfies readonly (readonly [CatalogCategory,CatalogRegion,CatalogLanguage,readonly string[]])[];
const identities=new Map<string,Pick<CatalogIdentity,'category'|'region'|'language'|'paperLanguage'>>();
for(const [category,region,language,ids] of assignments)for(const id of ids){
 if(identities.has(id))throw Error('Duplicate catalog assignment: '+id);
 identities.set(id,{category,region,language,paperLanguage:paperLanguageFor(language)});
}
function identityOf(id:string){
 const display=identities.get(id);
 if(!display)throw Error('Missing catalog assignment: '+id);
 return display;
}
const originalCases=cases.cases as unknown as PracticeDocument[];
const originalExamples=Object.entries(examples as unknown as Record<string,PracticeDocument>);
const templateById=new Map(PAPER_TEMPLATES.map(t=>[t.id,t]));
const registry=new Map(cases.sources.map(source=>[source.url,source]));
const officialSamples=new Set(['real-cet4-translation-2016','real-cet6-writing-translation-2016','real-neea-ethics-2024','real-neea-mao-2024']);
const caseCatalog:CatalogEntry[]=originalCases.map(paper=>{
 const {practiceId:id,title,subject,level,mode}=paper;
 const identity=paper.generation?.intent==='generate'?'original':paper.generation?.intent==='adapt'?'adapted':officialSamples.has(id)?'specimen':'authentic';
 const region=id==='real-mit-6006-final-2020'?'us':'mainland';
 const category=id==='zhongkao-2023-2024-recombined'?'初中与中考':/^(neea-2024|gaokao-2024)/.test(id)?'高中与高考':'大学课程';
 const language=paper.presentation?.language??'zh';
 const publishers=paper.materials.flatMap(material=>{
  const record=registry.get(material.url??'');
  return record?[record]:[];
 });
 const issuer=identity==='original'?'纸间 Practice':[...new Set(publishers.map(p=>p.institution))].join('／')||'发布机构未核实';
 const years=[...new Set(publishers.flatMap(p=>p.year?[p.year]:[]))];
 return {
  id,title,kind:mode==='bank'?'bank':'paper',request:{kind:'case',id},documentId:id,category,region,language,paperLanguage:language,
  subject:subject.includes('英语')?'英语':subject,grade:level,issuer,year:identity==='original'||years.length!==1?undefined:years[0],
  scope:mode==='bank'?'bank':paper.exam?.scope??'unknown',identity,
  questionCount:paper.sections.reduce((count,s)=>count+s.questions.length,0),
  aliases:subject.includes('英语四级')?['CET-4','四级']:subject.includes('英语六级')?['CET-6','六级']:undefined,
 };
});
const casesById=new Map(caseCatalog.map(entry=>[entry.id,entry]));
const primarySubjects:Record<string,string>={
 'primary-math':'数学','primary-chinese':'语文','primary-english':'英语',
 'england-ks2-math':'数学','hk-p6-chinese':'语文','hk-p6-english':'英语',
};
const primaryAliases=['小六','六年级','小学六年级','P6'];
const primaryFullPapers:Record<string,string>={
 'primary-math':'cn-p6-math-full','primary-chinese':'cn-p6-chinese-full','primary-english':'cn-p6-english-full',
};
const sampleByTemplate=new Map<string,string>();
const exampleCatalog:CatalogEntry[]=originalExamples.map(([id,paper])=>{
 const display=identityOf(id);
 const template=templateById.get(paper.style.templateId??'');
 if(!template||(!primarySubjects[id]&&template.id!==id))throw Error('Incorrect template for sample '+id);
 if(paper.presentation?.language&&paper.presentation.language!==display.paperLanguage)throw Error('Conflicting sample language: '+id);
 if(template.id===id)sampleByTemplate.set(template.id,id);
 const subject=primarySubjects[id]??paper.subject;
 const system=display.region==='england'?'KS2':display.region==='hongkong'?'香港小六':template.family==='国际中学课程'?template.level:undefined;
 return {
  ...display,id,kind:paper.mode==='bank'?'bank':'paper',request:{kind:'example',id},documentId:paper.practiceId,
  title:paper.title,issuer:'纸间 Practice',grade:paper.authoring?.grade??paper.level,subject,system,
  scope:paper.mode==='bank'?'bank':'subset',identity:'original',
  questionCount:paper.sections.reduce((count,s)=>count+s.questions.length,0),
  aliases:primarySubjects[id]?(display.region==='england'?['KS2','英格兰数学','运算']:primaryAliases):id==='civil-service'?['考公','行测','公务员']:undefined,
 };
});
function layoutEntry(t:PaperTemplate):CatalogEntry {
 const source=t.caseId?casesById.get(t.caseId):undefined;
 const display=identities.get(t.id)??source??identityOf(t.id);
 return {
  category:display.category,region:display.region,language:display.language,paperLanguage:display.paperLanguage,
  id:'layout:'+t.id,title:t.caseId&&t.id.startsWith('source-')?t.name+' · 版式':t.name,
  kind:'layout',request:{kind:'template',id:t.id},identity:'layout',scope:'layout',
  subject:primarySubjects[t.id]??source?.subject??t.subjects[0],grade:t.level,issuer:'纸间 Practice',
  details:[t.layout.paperSize,t.layout.orientation==='landscape'?'横向':'纵向',t.layout.columns===2?'双栏':'单栏'].join(' · '),
  sampleId:primaryFullPapers[t.id]??sampleByTemplate.get(t.id)??t.caseId??t.topicId,
  aliases:t.subjects,
 };
}
const topics:CatalogEntry[]=TOPIC_CASES.map(t=>({
 ...t.catalog,id:t.id,title:t.title,kind:t.mode==='bank'?'bank':'paper',request:{kind:'topic',id:t.id,file:t.file,sha256:t.sha256},documentId:t.id,questionCount:t.questionCount,
}));
export const catalogShelf:CatalogEntry[]=[...caseCatalog,...topics,...exampleCatalog,...PAPER_TEMPLATES.map(layoutEntry)];

const indexed=new Map(catalogShelf.map(entry=>[entry.id,entry]));
if(indexed.size!==catalogShelf.length)throw Error('Duplicate catalog IDs');
for(const entry of catalogShelf)if(entry.sampleId){
 const sample=indexed.get(entry.sampleId);
 if(!sample||sample.kind==='layout'||sample.region!==entry.region||sample.category!==entry.category||
    (entry.request.kind==='template'&&entry.request.id.startsWith('primary-')&&sample.subject!==entry.subject)){
  throw Error('Incorrect catalog sample binding: '+entry.id+' → '+entry.sampleId);
 }
}
