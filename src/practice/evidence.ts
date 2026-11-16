import {type PracticeDocument,type PracticeError,type PracticeMaterial,type PracticeSource,type PracticeSourcePolicy,type PracticeQuestion,type PracticeSection} from './model';

/** Every cited basis, including copied intermediate materials and shared passages. */
export function questionEvidenceIds(question:PracticeQuestion,materials:PracticeMaterial[],stimulus?:PracticeSection['stimulus']):Set<string>{
 const byId=new Map(materials.map(m=>[m.id,m])),ids=new Set<string>();
 const add=(id:string|undefined)=>{if(!id||ids.has(id))return;ids.add(id);byId.get(id)?.provenance?.derivedFrom?.forEach(add);};
 [question.source,stimulus?.source,...(question.supportingSources??[]).map(e=>e.source),...(question.answerProvenance?.sources??[]),...(question.rubric?.criteria??[]).flatMap(c=>c.evidence??[])].forEach(source=>add(source?.materialId));
 return ids;
}
export function evidenceAllowed(ids:Set<string>,materials:PracticeMaterial[],policy:PracticeSourcePolicy|undefined):boolean{
 if(!policy)return true;
 const byId=new Map(materials.map(m=>[m.id,m])),allowed=policy.allowedMaterialIds?new Set(policy.allowedMaterialIds):undefined,excluded=new Set(policy.excludedMaterialIds??[]);
 for(const id of ids){
  const material=byId.get(id);if(!material||excluded.has(id))return false;
  if(allowed&&!allowed.has(id)&&material.provenance?.kind!=='authored')return false;
  if(allowed&&!allowed.has(id)&&material.provenance?.kind==='authored'&&!material.provenance.derivedFrom?.length)return false;
  if(policy.mode==='uploads-only'&&!material.provenance?.derivedFrom?.length&&!allowed?.has(id)&&!isUploaded(material))return false;
 }
 return true;
}

/** Deterministic evidence checks. Correct reasoning is established by the recorded actual review. */
export function validatePracticeEvidence(practice:PracticeDocument,policy=practice.sourcePolicy,requireVerification=practice.authoring?.requireVerification??false):PracticeError[]{
 const errors:PracticeError[]=[],add=(path:string,message:string)=>errors.push({path,message});
 const materials=new Map(practice.materials.map(m=>[m.id,m])),used=new Set<string>();
 function cite(source:PracticeSource,path:string){
  if(!source.materialId)return; // Notebook block references are checked against the supplied notebook by validatePractice.
  const material=materials.get(source.materialId),body=source.blockId===material?.id?material.text:material?.blocks?.find(b=>b.id===source.blockId)?.text;
  if(!material)add(path+'/materialId','Unknown evidence material');
  else if(!source.exact.trim()||!body?.includes(source.exact))add(path+'/exact','Evidence must be an exact nonempty passage in its cited block');
  used.add(source.materialId);
 }
 function roots(id:string,stack=new Set<string>()):Set<string>{
  if(stack.has(id)){add('/materials/'+id+'/provenance/derivedFrom','Cyclic material derivation');return new Set();}
  const material=materials.get(id);if(!material){add('/materials/'+id,'Derived material is missing');return new Set();}
  const parents=material.provenance?.derivedFrom;
  if(!parents?.length)return new Set([id]);
  const next=new Set(stack);next.add(id);return new Set(parents.flatMap(parent=>[...roots(parent,next)]));
 }
 for(const [i,material]of practice.materials.entries()){
  const p=material.provenance,path=`/materials/${i}/provenance`;if(!p)continue;
  if(p.kind==='web'&&!/^https?:\/\//.test(p.url??material.url??''))add(path+'/url','A web material needs its actual HTTP(S) source URL');
  if(p.kind==='web'&&!p.accessedAt)add(path+'/accessedAt','Record when the web source was actually read');
  for(const date of ['publishedAt','accessedAt'] as const)if(p[date]&&Number.isNaN(Date.parse(p[date]!)))add(path+'/'+date,'Use a valid source date');
  roots(material.id);
 }
 for(const [s,section]of practice.sections.entries()){
  if(section.stimulus?.source)cite(section.stimulus.source,`/sections/${s}/stimulus/source`);
  for(const [n,q]of section.questions.entries()){
   const path=`/sections/${s}/questions/${n}`;cite(q.source,path+'/source');
   for(const [i,e]of(q.supportingSources??[]).entries())cite(e.source,path+`/supportingSources/${i}/source`);
   for(const [i,e]of(q.answerProvenance?.sources??[]).entries())cite(e,path+`/answerProvenance/sources/${i}`);
   if(q.rubric){
    const ids=new Set<string>();let total=0;
    for(const [i,criterion]of q.rubric.criteria.entries()){
     if(ids.has(criterion.id))add(path+`/rubric/criteria/${i}/id`,'Rubric criterion IDs must be unique');ids.add(criterion.id);total+=criterion.points;
     for(const [j,e]of(criterion.evidence??[]).entries())cite(e,path+`/rubric/criteria/${i}/evidence/${j}`);
    }
    if(Math.abs(total-q.score)>1e-7)add(path+'/rubric/criteria',`Rubric points sum to ${total}, expected ${q.score}`);
   }
   const c=q.responseConstraints;
   if(c?.minWords!==undefined&&c.maxWords!==undefined&&c.minWords>c.maxWords)add(path+'/responseConstraints','Minimum word limit exceeds maximum');
   if(c?.answerStyle==='grid'&&c.countUnit==='words')add(path+'/responseConstraints/countUnit','Character grids count characters, not English words');
   if(q.verification?.status==='verified'&&q.verification.checks.some(check=>check.result!=='pass'))add(path+'/verification','Verified questions cannot retain failed or unresolved checks');
   if(requireVerification){
    if(q.verification?.status!=='verified'||!q.verification.checks.length)add(path+'/verification','Record actual completed question and answer checks before final delivery');
    if(!q.answerProvenance)add(path+'/answerProvenance','Record whether the answer is official, third-party or independently solved');
    if(['response','task'].includes(q.type)&&!q.rubric)add(path+'/rubric','A reviewed subjective task needs explicit scoring criteria');
   }
   if(q.answerProvenance?.kind==='official'){
    const sources=q.answerProvenance.sources??[];
    if(!sources.some(e=>materials.get(e.materialId??'')?.provenance?.sourceType==='official'))add(path+'/answerProvenance','An official answer needs an identified official source');
   }
   if(q.origin?.kind==='original'&&materials.get(q.source.materialId??'')?.provenance?.kind==='authored'&&!(q.supportingSources??[]).some(e=>e.role==='question'&&materials.get(e.source.materialId??'')?.provenance?.kind!=='authored'))add(path+'/origin','An authored question is not a historical original; cite the original question source or use generated/adapted');
  }
 }
 if(policy){
  const excluded=new Set(policy.excludedMaterialIds??[]),allowed=policy.allowedMaterialIds?new Set(policy.allowedMaterialIds):undefined;
  for(const key of ['requiredMaterialIds','allowedMaterialIds','excludedMaterialIds'] as const)for(const id of policy[key]??[])if(!materials.has(id))add('/sourcePolicy/'+key,'Unknown material: '+id);
  for(const id of policy.requiredMaterialIds??[])if(excluded.has(id)||(allowed&&!allowed.has(id)))add('/sourcePolicy/requiredMaterialIds','A required material is excluded: '+id);
  // Preserve intermediate derivations so copies cannot bypass an exclusion.
  const closure=new Set<string>();
  const includeAncestors=(id:string)=>{if(closure.has(id))return;closure.add(id);for(const parent of materials.get(id)?.provenance?.derivedFrom??[])includeAncestors(parent);};
  used.forEach(includeAncestors);
  for(const id of closure){
   if(excluded.has(id))add('/sourcePolicy/excludedMaterialIds','An excluded material was used: '+id);
   const material=materials.get(id);if(!material)continue;
   if(allowed&&!allowed.has(id)&&material.provenance?.kind!=='authored')add('/sourcePolicy/allowedMaterialIds','Evidence is outside the allowed materials: '+id);
   if(allowed&&!allowed.has(id)&&material.provenance?.kind==='authored'&&!material.provenance.derivedFrom?.length)add('/sourcePolicy/allowedMaterialIds','An authored material needs a derivation from the allowed materials: '+id);
   if(policy.mode==='uploads-only'){
    const sourceRoots=roots(id);
    for(const root of sourceRoots){const m=materials.get(root)!;if(!allowed?.has(root)&&!isUploaded(m))add('/sourcePolicy/mode','Uploads-only task used non-upload evidence: '+root);}
   }
  }
  for(const requirement of policy.requiredVersions??[]){const material=materials.get(requirement.materialId);if(!material||material.provenance?.version!==requirement.version)add('/sourcePolicy/requiredVersions','Required source version is missing or changed: '+requirement.materialId+' '+requirement.version);}
  for(const id of policy.requiredMaterialIds??[])if(!closure.has(id))add('/sourcePolicy/requiredMaterialIds','Required material was not used by the selected paper: '+id);
 }
 return errors;
}

function isUploaded(material:PracticeMaterial){return material.provenance?.kind==='upload'||(!material.provenance&&!material.url);}

export function sourcePolicyRequirements(policy:PracticeSourcePolicy|undefined):string{
 const mode=policy?.mode??'uploads-first',preference=policy?.questionPreference??'originals-first';
 const lines=[mode==='uploads-only'?'只使用已上传或明确允许的指定材料；不联网补入题目、事实或答案依据，必要信息缺失时保留具体缺项。':mode==='uploads-first'?'先完整阅读上传资料，以其范围为主；联网核对适用大纲、原题和答案，并补足实际缺口。':'围绕目标考试检索可靠原文，同时完整使用用户指定的必用材料。',preference==='originals-first'?'优先选择符合范围的可核实原题；缺口再选适当改编或新编题。':preference==='generated-first'?'以资料范围内的新编应用题为主，原题用于核准风格和难度。':'按能力蓝图组合原题、改编和新编题，保留各题真实身份。'];
 for(const [key,label]of [['requiredMaterialIds','必用材料'],['allowedMaterialIds','限定材料'],['excludedMaterialIds','排除材料']] as const)if(policy?.[key]?.length)lines.push(label+'：'+policy[key]!.join('、')+'。');
 if(policy?.requiredVersions?.length)lines.push('指定版本：'+policy.requiredVersions.map(v=>v.materialId+' '+v.version).join('、')+'；不得自行换用其他版本。');
 return lines.join('\n');
}
