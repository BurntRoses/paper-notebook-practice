import {REFERENCE_COLLECTIONS,referenceCollectionsFor,referenceStudy} from '../src/practice/reference-papers';
import {EXAM_ROUTES,getExamRoute} from '../src/practice/exam-routes';
import {TOPIC_CASES,getTopicCase} from '../src/practice/topics';
import {EXAM_SPECIFICATIONS,getExamSpecification,inferExamSpecification,validateExamStructure} from '../src/practice/exam-specification';
import realCatalog from '../src/practice/real-cases.json';
import {readFile,writeFile,mkdir,stat,copyFile} from 'node:fs/promises';
import {resolve,dirname,join,basename} from 'node:path';
import {assertPractice} from '../src/practice/validate';
import {questionsOf,type PracticeDocument,type PracticeMaterial} from '../src/practice/model';
import {buildPracticeHtml,verifyPracticeHtml} from '../src/practice/build';
import {createPracticeJob,authoringBrief,composePractice,assertPracticeJob,type PracticeJob} from '../src/practice/workflow';
import templateExamples from '../src/practice/template-examples.json';
import {PAPER_TEMPLATES,getPaperTemplate,applyPaperTemplate} from '../src/practice/templates';
import {parseQuestionText,stablePracticeId} from '../src/practice/materials';
import {assembleMock} from '../src/practice/bank';
import jobSchema from '../skills/paper-notebook-practice/schemas/practice-job.schema.json';
import practiceSchema from '../skills/paper-notebook-practice/schemas/practice.schema.json';
// Node-only adapters; the portable build inlines this helper and ships its Python/Swift assets.
import {ingestPractice,replicatePractice,validatePracticeLayout,practiceIngestCapabilities} from './practice-ingest.mjs';
import {renderReplica} from '../src/practice/replica';
import {createHash} from 'node:crypto';
import type {NotebookDocument} from '../src/model/types';

async function topicPractice(id:string){
 const entry=getTopicCase(id);if(!entry)throw Error('Unknown topic paper: '+id);
 const paths=[new URL('../examples/topics/'+entry.file,import.meta.url),new URL('../skills/paper-notebook-practice/examples/topics/'+entry.file,import.meta.url)];
 for(const path of paths){
  let bytes:Buffer;try{bytes=await readFile(path);}catch(error){if((error as {code?:string}).code==='ENOENT')continue;throw error;}
  if(createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error('Topic paper checksum changed: '+entry.file+'; rebuild its catalog after editing.');
  return assertPractice(JSON.parse(bytes.toString('utf8')));
 }
 throw Error('Topic paper is missing from the installed Skill: examples/topics/'+entry.file);
}

const [command,...tokens]=process.argv.slice(2);
const flags=new Set(['--balance']);
const option=(name:string)=>{const at=tokens.indexOf(name);if(at<0)return undefined;const value=tokens[at+1];if(!value||value.startsWith('--'))throw Error(name+' requires a value');return value;};
const positional=tokens.filter((value,index)=>!value.startsWith('--')&&(index===0||!tokens[index-1].startsWith('--')||flags.has(tokens[index-1])));
const input=positional[0],jsonFile=async(path:string)=>JSON.parse(await readFile(resolve(path),'utf8'));
const usage=`Paper Notebook Practice · Agent Skill (MIT / free / local)\n\n  specs [id] [--out exam-specification.json]\n  routes [id] [--out exam-route.json]\n  sources [template-id|collection-id|paper-id] [--out reference-study.json]\n  topics [id] [--family postgraduate|civil-service|engineering-course|engineering-qualification] [--out practice.json]\n  coverage practice.json\n  templates [id]\n  examples [template-id] [--out practice.json]\n  cases [id] [--out practice.json]\n  capabilities\n  ingest <file|directory> --out sources [--ocr auto|always|never]\n  plan <source-manifest.json|bank.json|directory> --out job [--template id] [--subject 科目] [--level 层级] [--capture captured-template.json] [--exam cet4|cet6|...] [--exam-spec specification.json] [--scope full|subset] [--brief brief.json] [--route id] [--year 2026] [--region 地区] [--specialty 专业] [--source-mode uploads-only|uploads-first|open] [--question-preference originals-first|balanced|generated-first]\n  validate-job job.json\n  compose bank.json --plan job.json --out practice.json\n  run bank.json --plan job.json --out output\n  build practice.json --out output [--template id] [--source notebook.json]\n  validate practice.json [--source notebook.json]\n  verify exam.html [--practice practice.json] [--source notebook.json]\n  replicate source-manifest.json --out replica\n  validate-layout layout.json\n\nInstalled Skill: node scripts/practice.mjs <command>\nRepository: node tools/practice.mjs <command>`;
const print=(value:unknown)=>console.log(JSON.stringify(value,null,2));
async function writeJson(path:string,value:unknown){await mkdir(dirname(resolve(path)),{recursive:true});await writeFile(resolve(path),JSON.stringify(value,null,2)+'\n');}
async function deliver(practice:PracticeDocument,out:string,source?:NotebookDocument){
 const title=practice.title.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'').slice(0,120)||'练习',files:Record<string,string>={},proofs:Record<string,unknown>={};
 for(const [kind,label]of[['exam',practice.mode==='bank'?'全量题库':'试卷'],['answers','答案卷'],['answer-card','答题卡']] as const){const filename=`《${title}》-${label}.html`,html=await buildPracticeHtml(practice,{kind}),proof=verifyPracticeHtml(html,practice,source);if(!proof.valid)throw Error(proof.errors.map(error=>error.path+': '+error.message).join('\n'));files[filename]=html;proofs[filename]=proof;}
 if(practice.original){
  for(const source of practice.original.sources)for(const page of source.pages){const actual=createHash('sha256').update(Buffer.from(page.imageData.split(',')[1],'base64')).digest('hex');if(actual!==page.imageSha256)throw Error(`Original image checksum differs: ${source.id} page ${page.page}`);}
  const filename=`《${title}》-原卷.html`;files[filename]=renderReplica(practice.original);proofs[filename]={valid:true,kind:'original-page-facsimile',pages:practice.original.sources.flatMap(s=>s.pages.map(p=>({source:s.id,page:p.page,imageSha256:p.imageSha256,widthPt:p.widthPt,heightPt:p.heightPt,physicalSizeAssumed:p.physicalSizeAssumed??false})))};
 }
 await mkdir(out,{recursive:true});for(const [name,html]of Object.entries(files))await writeFile(join(out,name),html);await writeJson(join(out,'practice.json'),practice);await writeJson(join(out,'build-proof.json'),{schemaVersion:'1.0.0',kind:'practice-build-proof',practiceId:practice.practiceId,templateId:practice.style.templateId||null,sourceBound:Boolean(source)||practice.materials.length>0,proofs,visualReview:'Agent must inspect actual pages; structural proof does not establish pixel-perfect editable reconstruction.'});
 return {valid:true,output:out,files:[...Object.keys(files),'practice.json','build-proof.json']};
}
async function preparePlan(path:string,out:string){
 const briefPath=option('--brief'),briefValue=briefPath?await jsonFile(briefPath):{};
 if(!briefValue||typeof briefValue!=='object'||Array.isArray(briefValue))throw Error('--brief requires a partial job object or a wizard object containing job');
 const brief=(briefValue.job??briefValue) as Partial<PracticeJob>;
 if(!brief||typeof brief!=='object'||Array.isArray(brief))throw Error('--brief /job must be an object');
 const requestedSubject=option('--subject')??brief.subject,requestedLevel=option('--level')??brief.level;
 let actual=resolve(path),value:any;
 if((await stat(actual)).isDirectory()){const result=await ingestPractice(actual,{out:join(out,'sources'),ocr:option('--ocr')||'auto'});actual=result.manifest;}
 value=await jsonFile(actual);let bank:PracticeDocument|undefined,materials:PracticeMaterial[]=[],warnings:string[]=[],manifestStatus:'ready'|'needs-review'|'needs-ocr'='ready';
 if(value.practiceId){bank=assertPractice(value);materials=bank.materials;}
 else if(value.kind==='practice-sources'){
  materials=value.materials||[];manifestStatus=value.status||'needs-review';const questions=materials.flatMap(material=>{const parsed=parseQuestionText(material);warnings.push(...parsed.warnings);return parsed.questions;});
  let number=0;questions.forEach(question=>{const originalNumber=question.source.exact.match(/^\s*(?:\*\*)?(?:第\s*)?(\d+)\s*(?:[.．、)）]|题[：:])/)?.[1];question.number=++number;question.origin={kind:'original',number:originalNumber||String(question.number)};});
  if(questions.length)bank=assembleMock(questions,{title:'资料题库',subject:requestedSubject||'待 Agent 确定',level:requestedLevel||'待 Agent 确定',count:questions.length,durationMinutes:Number(option('--duration')||60),materials,mode:'bank',balanceChoices:false});
 }else throw Error('plan expects a practice.json bank, an ingest source-manifest.json, or a directory of source files.');
 let capturedOverrides:PracticeJob['templateOverrides'];let capturePath=option('--capture');
 if(!capturePath&&value.kind==='practice-sources'&&value.capturedTemplateFile)capturePath=join(dirname(actual),value.capturedTemplateFile);
 let capturedReview=false;
 if(capturePath){const captured=await jsonFile(capturePath);const page=captured.sources?.flatMap((source:any)=>source.pages||[])[0];if(page){const mm=(pt:number)=>Math.round(pt*25.4/72*100)/100,margins=page.measuredMarginsPt||{};capturedOverrides={paperSize:Math.max(page.widthPt,page.heightPt)>1000?'A3':'A4',widthMm:mm(page.widthPt),heightMm:mm(page.heightPt),orientation:page.widthPt>page.heightPt?'landscape':'portrait',columns:page.columns===2?2:1,...Object.fromEntries(Object.entries({marginTopMm:mm(margins.top),marginBottomMm:mm(margins.bottom),marginLeftMm:mm(margins.left),marginRightMm:mm(margins.right)}).filter(([,v])=>Number.isFinite(v)&&v>=0&&v<=70))};const font=page.fontSamples?.[0];if(font?.sizePt>=8&&font?.sizePt<=22)capturedOverrides.fontSize=font.sizePt;capturedReview=true;}}
 const unresolved:string[]=[];if(capturedReview)unresolved.push('已抽取原卷尺寸、内容边距、栏数与字体样本；Agent 需核对 captured-template.json 的标题、题组、作答区与字体替代。');if(manifestStatus!=='ready')unresolved.push(`资料状态为 ${manifestStatus}，需要 Agent 核对 OCR、不确定区域与版面。`);if(warnings.length)unresolved.push('题目提取存在待核对项目，Agent 需逐项检查 extraction-findings.json，并补全未识别题目、缺失答案或确认材料用途。');if(!bank)unresolved.push('原文尚未形成带答案的正式题库；当前 Agent 需提取题目、求解核对并填写 bank.json。');
 if(!requestedSubject&&!bank?.subject)unresolved.push('需要确定科目。');if(!requestedLevel&&!bank?.level)unresolved.push('需要确定学习层级。');
 // A brief supplies confirmed requirements. Extraction findings remain additive;
 // a prefilled ocrReviewed=true cannot clear findings from the actual upload.
 const cli:Partial<PracticeJob>={};
 for(const [flag,key]of [['--title','title'],['--subject','subject'],['--level','level'],['--exam','examId'],['--scope','scope'],['--mode','mode'],['--intent','intent'],['--template','templateId'],['--seed','seed'],['--requirements','requirements']] as const){const value=option(flag);if(value!==undefined)(cli as Record<string,unknown>)[key]=value;}
 for(const [flag,key]of [['--duration','durationMinutes'],['--count','count'],['--score','targetScore']] as const){const value=option(flag);if(value!==undefined)cli[key]=Number(value);}
 if(tokens.includes('--balance'))cli.balanceChoices=true;
 if(option('--exam-spec'))cli.specification=await jsonFile(option('--exam-spec')!);
 const authoring={...bank?.authoring,...brief.authoring};
 for(const [flag,key]of [['--route','routeId'],['--region','region'],['--specialty','specialty']] as const){const value=option(flag);if(value!==undefined)authoring[key]=value;}
 if(option('--year'))authoring.year=Number(option('--year'));
 if(authoring.routeId&&!getExamRoute(authoring.routeId))throw Error('Unknown exam route: '+authoring.routeId);
 const sourcePolicy={mode:'uploads-first' as const,questionPreference:'originals-first' as const,...bank?.sourcePolicy,...brief.sourcePolicy};
 if(option('--source-mode'))sourcePolicy.mode=option('--source-mode') as typeof sourcePolicy.mode;
 if(option('--question-preference'))sourcePolicy.questionPreference=option('--question-preference') as typeof sourcePolicy.questionPreference;
 const combinedFindings=[...new Set([...unresolved,...brief.quality?.unresolved??[]])];
 const job=createPracticeJob(bank,{title:bank?.title||'学习资料试卷',subject:bank?.subject||'待 Agent 确定',level:bank?.level||'待 Agent 确定',requirements:'依据全部资料组织知识点、题库和试卷。原题保留出处与选项顺序；新题与改编题注明来源。',...brief,...cli,
  ...(capturedOverrides||brief.templateOverrides?{templateOverrides:{...capturedOverrides,...brief.templateOverrides}}:{}),
  ...(Object.keys(authoring).length?{authoring}:{}),sourcePolicy,
  ...(value.kind==='practice-sources'?{ingestion:{manifest:actual,status:manifestStatus}}:{}),
  quality:{ocrReviewed:manifestStatus==='ready'&&brief.quality?.ocrReviewed!==false,unresolved:combinedFindings,notes:brief.quality?.notes??''}});

 await mkdir(out,{recursive:true});if(job.examId)await writeJson(join(out,'exam-specification.json'),job.specification??getExamSpecification(job.examId));await writeJson(join(out,'job.json'),job);await writeJson(join(out,'materials.json'),materials);await writeJson(join(out,'practice.schema.json'),practiceSchema);await writeJson(join(out,'practice-job.schema.json'),jobSchema);
 const bankName=bank?'bank.json':'draft-bank.json';await writeJson(join(out,bankName),bank||{schemaVersion:'1.0.0',kind:'practice-draft-bank',materials,questions:[],pending:materials.map(material=>({materialId:material.id,title:material.title,status:'agent-authoring-required'}))});
 await writeJson(join(out,'reference-study.json'),referenceStudy(job));
 const status=job.quality.unresolved.length||job.ingestion&&!job.quality.ocrReviewed?'needs-agent-review':'ready-to-compose';
 await writeFile(join(out,'authoring.md'),authoringBrief(job,'materials.json',bankName));await writeJson(join(out,'extraction-findings.json'),{status,unresolved:job.quality.unresolved,warnings,source:actual,questionsReady:bank?questionsOf(bank).length:0,materials:materials.length});
 return {output:out,job:join(out,'job.json'),bank:join(out,bankName),brief:join(out,'authoring.md'),referenceStudy:join(out,'reference-study.json'),status,questions:bank?questionsOf(bank).length:0,warnings};
}

try{
 if(!command||command==='help'||command==='--help')console.log(usage);
 else if(command==='specs'){const result=input?getExamSpecification(input):EXAM_SPECIFICATIONS;if(option('--out')){await writeJson(resolve(option('--out')!),result);print({valid:true,output:resolve(option('--out')!)});}else print(result);}
 else if(command==='sources'){const result=input?referenceCollectionsFor(input):REFERENCE_COLLECTIONS;if(!result.length)throw Error('No reference collection: '+input);if(option('--out')){await writeJson(resolve(option('--out')!),result);print({valid:true,output:resolve(option('--out')!)});}else print(result);}
 else if(command==='routes'){const result=input?getExamRoute(input):EXAM_ROUTES;if(!result)throw Error('Unknown exam route: '+input);if(option('--out')){await writeJson(resolve(option('--out')!),result);print({valid:true,output:resolve(option('--out')!)});}else print(result);}
 else if(command==='coverage'){const paper=assertPractice(await jsonFile(input)),spec=inferExamSpecification(paper),errors=validateExamStructure(paper,spec);print({complete:errors.length===0,specificationId:spec?.id??null,errors});if(errors.length)process.exitCode=1;}
 else if(command==='templates')print(input?getPaperTemplate(input):PAPER_TEMPLATES);
 else if(command==='examples'){
  const examples=templateExamples as unknown as Record<string,PracticeDocument>;
  if(input){
   const topicId=PAPER_TEMPLATES.find(template=>template.id===input)?.topicId;
   const paper=examples[input]??(topicId?await topicPractice(topicId):undefined);
   if(!paper)throw Error('Unknown template example: '+input);
   if(option('--out')){await writeJson(resolve(option('--out')!),paper);print({valid:true,output:resolve(option('--out')!)});}else print(paper);
  }else{
   const entries=Object.entries(examples);
   for(const template of PAPER_TEMPLATES)if(template.topicId&&!examples[template.id])entries.push([template.id,await topicPractice(template.topicId)]);
   print(entries.map(([templateId,p])=>({templateId,id:p.practiceId,title:p.title,subject:p.subject,questions:questionsOf(p).length,totalScore:p.totalScore,scope:p.exam?.scope??'subset'})));
  }
 }
 else if(command==='cases'){const cases=realCatalog.cases as unknown as PracticeDocument[];if(input){const paper=cases.find(p=>p.practiceId===input);if(!paper)throw Error('Unknown case: '+input);if(option('--out')){await writeJson(resolve(option('--out')!),paper);print({valid:true,output:resolve(option('--out')!)});}else print(paper);}else print(cases.map(p=>({id:p.practiceId,title:p.title,subject:p.subject,level:p.level,questions:questionsOf(p).length,totalScore:p.totalScore,templateId:'source-'+p.practiceId})));}
 else if(command==='topics'){if(input){const paper=await topicPractice(input);if(option('--out')){await writeJson(resolve(option('--out')!),paper);print({valid:true,output:resolve(option('--out')!)});}else print(paper);}else print(TOPIC_CASES.filter(item=>!option('--family')||item.family===option('--family')));}
 else if(command==='capabilities')print(await practiceIngestCapabilities());
 else if(!input)throw Error(usage);
 else if(command==='ingest')print(await ingestPractice(input,{out:option('--out')||'output/sources',ocr:option('--ocr')||'auto',kind:option('--kind'),dpi:option('--dpi')}));
 else if(command==='replicate')print(await replicatePractice(input,{out:option('--out')||'output/replica',title:option('--title')}));
 else if(command==='validate-layout'){const result=await validatePracticeLayout(input);print(result);if(!result.valid)process.exitCode=1;}
 else if(command==='plan')print(await preparePlan(input,resolve(option('--out')||'output/agent-job')));
 else if(command==='validate-job'){const job=assertPracticeJob(await jsonFile(input));print({valid:true,kind:job.kind,count:job.count,unresolved:job.quality.unresolved,status:job.quality.unresolved.length?'needs-agent-review':'ready-to-compose'});}
 else if(['validate','build','verify','compose','run'].includes(command)){
  const sourcePath=option('--source'),source:NotebookDocument|undefined=sourcePath?await jsonFile(sourcePath):undefined;if(source&&(!source.notebook||!Array.isArray(source.notebook.chapters)))throw Error('--source: expected a Paper Notebook document');
  if(command==='verify'){
   const html=await readFile(resolve(input),'utf8'),practicePath=option('--practice')||join(dirname(resolve(input)),'practice.json');let expected:PracticeDocument;
   try{expected=assertPractice(await jsonFile(practicePath),source);}catch(error){if((error as {code?:string}).code==='ENOENT')throw Error('verify requires matching practice.json beside the HTML, or --practice <practice.json>.');throw error;}
   const proof=verifyPracticeHtml(html,expected,source);if(!proof.valid)throw Error(proof.errors.map(error=>error.path+': '+error.message).join('\n'));print({...proof,htmlBytes:Buffer.byteLength(html)});
  }else{
   let practice=assertPractice(await jsonFile(input),source);
   if(command==='compose'||command==='run'){const planPath=option('--plan');if(!planPath)throw Error('--plan job.json is required');practice=composePractice(practice,await jsonFile(planPath));}
   if(option('--template'))practice=assertPractice(applyPaperTemplate(practice,option('--template')!));
   if(command==='validate')print({valid:true,practiceId:practice.practiceId,questions:questionsOf(practice).length,totalScore:practice.totalScore,durationMinutes:practice.durationMinutes,templateId:practice.style.templateId});
   else if(command==='compose'){const out=resolve(option('--out')||'output/practice.json');await writeJson(out,practice);print({valid:true,output:out,questions:questionsOf(practice).length,totalScore:practice.totalScore});}
   else print(await deliver(practice,resolve(option('--out')||'output/practice'),source));
  }
 }else throw Error('Unknown command: '+command+'\n'+usage);
}catch(error){console.error(error instanceof Error?error.message:String(error));process.exitCode=1;}
