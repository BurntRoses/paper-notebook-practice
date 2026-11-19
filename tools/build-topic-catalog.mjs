#!/usr/bin/env node
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {tsImport} from 'tsx/esm/api';
const root=fileURLToPath(new URL('../',import.meta.url)),base=root+'skills/paper-notebook-practice/examples/topics/';
const {resolveExamRoute}=await tsImport('../src/practice/exam-routes.ts',import.meta.url);
const {assertPractice}=await tsImport('../src/practice/validate.ts',import.meta.url);
const topics=[];
async function scan(folder=''){
 for(const item of (await readdir(base+folder,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
  const file=folder+item.name;if(item.isDirectory()){await scan(file+'/');continue;}if(!file.endsWith('.json'))continue;
  const bytes=await readFile(base+file),raw=JSON.parse(bytes);if(!raw?.practiceId)continue;
  if(raw.original)throw Error(`Topic ${file} must not bundle original pages`);
  const paper=assertPractice(raw),route=resolveExamRoute({subject:paper.subject,...paper.authoring});
  topics.push({id:paper.practiceId,title:paper.title,subject:paper.subject,level:paper.level,family:file.split('/')[0],...(route?{routeId:route.id}:{}),file,questionCount:paper.sections.reduce((n,s)=>n+s.questions.length,0),mode:paper.mode,durationMinutes:paper.durationMinutes,totalScore:paper.totalScore,sha256:createHash('sha256').update(bytes).digest('hex')});
 }
}
await scan();
if(new Set(topics.map(t=>t.id)).size!==topics.length)throw Error('Duplicate topic paper IDs');
const content=JSON.stringify({schemaVersion:'1.0.0',topics},null,2)+'\n';
for(const file of [root+'src/practice/topic-catalog.json',base+'catalog.json']){
 if(process.argv.includes('--check')){if(await readFile(file,'utf8')!==content)throw Error('Stale topic catalog: '+file);}
 else await writeFile(file,content);
}
console.log(`Topic catalog: ${topics.length} papers, ${topics.reduce((n,t)=>n+t.questionCount,0)} answerable tasks.`);
