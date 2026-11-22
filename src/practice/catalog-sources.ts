import type {CatalogSource,SourceRole} from './catalog-identity';
import type {PracticeDocument,PracticeSource} from './model';
import type {PaperTemplate} from './templates';

const webLink=(value?:string)=>{
 if(!value)return;
 try{const url=new URL(value);if(['http:','https:'].includes(url.protocol))return url.href;}catch{}
};

/** Only sources linked by the displayed document or the actual layout can appear here. */
export function catalogSources(document:PracticeDocument,template?:PaperTemplate):CatalogSource[]{
 if(template)return [{
  role:'benchmark',title:template.source.title,url:webLink(template.source.url),note:template.source.scope,
 }];
 const roles=new Map<string,Set<SourceRole>>();
 const registerId=(id:string|undefined,role:SourceRole)=>{
  if(!id)return;
  let record=roles.get(id);
  if(!record){record=new Set();roles.set(id,record);}
  record.add(role);
 };
 const register=(source:PracticeSource|undefined,role:SourceRole)=>registerId(source?.materialId,role);
 let authored=false,independent=false;
 for(const section of document.sections){
  register(section.stimulus?.source,'question');
  for(const question of section.questions){
   const isOriginal=question.origin?.kind==='generated'||document.generation?.intent==='generate'&&!question.origin?.kind;
   authored ||= isOriginal;
   independent ||= question.answerProvenance?.kind==='independent'||isOriginal;
   register(question.source,isOriginal?'benchmark':'question');
   for(const evidence of question.supportingSources??[]){
    register(evidence.source,evidence.role==='question'&&!isOriginal?'question':evidence.role==='answer'?'scoring':'benchmark');
   }
   for(const source of question.answerProvenance?.sources??[])register(source,'scoring');
   for(const criterion of question.rubric?.criteria??[])for(const source of criterion.evidence??[])register(source,'scoring');
  }
 }
 for(const part of document.authoring?.blueprint??[])for(const id of part.sourceIds??[])registerId(id,'benchmark');
 const sources:CatalogSource[]=[];
 if(authored)sources.push({role:'question',title:'纸间 Practice 原创题目',issuer:'纸间 Practice'});
 if(independent)sources.push({role:'scoring',title:'项目独立解答与评分',issuer:'纸间 Practice'});
 const unique=new Set<string>();
 for(const material of document.materials){
  const url=webLink(material.url??material.provenance?.url);
  const materialRoles=roles.get(material.id);
  if(material.provenance?.kind==='authored'||!url&&!materialRoles?.has('question'))continue;
  for(const role of materialRoles??['benchmark'] as const){
   if(role==='question'&&authored&&document.generation?.intent==='generate')continue;
   const key=[role,url,material.title].join('|');
   if(unique.has(key))continue;
   unique.add(key);
   sources.push({role,title:material.title,issuer:material.provenance?.publisher,url,note:!url?'公开出处未核实':undefined});
  }
 }
 if(document.exam?.scope==='full'&&['cet4','cet6'].includes(document.exam.specificationId))sources.push({
  role:'benchmark',title:'四六级考务：试题册封底、条形码和答题卡',issuer:'哈尔滨工业大学本科生院',
  url:'https://hituc.hit.edu.cn/2026/0609/c17860a393827/page.htm',note:'仅作卷面与答题流程参考，题目为原创模拟。',
 });
 return sources;
}
