#!/usr/bin/env node
/** Build a complete Node-only skill: schema, prose, sample and portable renderer. */
import {build} from 'esbuild';
import {mkdir,writeFile,readFile,copyFile,cp} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {tsImport} from 'tsx/esm/api';
const rawAssets={name:'practice-node-raw-assets',setup(api){api.onResolve({filter:/\?raw$/},args=>({path:args.path.slice(0,-4),namespace:'practice-raw'}));api.onLoad({filter:/.*/,namespace:'practice-raw'},async args=>({contents:await readFile(fileURLToPath(import.meta.resolve(args.path)),'utf8'),loader:'text'}));}};
const root=fileURLToPath(new URL('../',import.meta.url));
const instructionRoot=root+'skills/paper-notebook-practice/prompts/';
const instructions=JSON.parse(await readFile(instructionRoot+'instructions.json','utf8'));
for(const [mode,file] of [['agent','coding-agent.txt'],['chat','conversation-model.txt']])await writeFile(instructionRoot+file,instructions[mode].trim()+'\n');
const {loadPracticeStyles,buildPracticeHtml}=await tsImport('../src/practice/build.ts',import.meta.url);
const css=await loadPracticeStyles();
const compiled=await build({stdin:{contents:"import {practiceSession,practiceDigest,normalizePracticeAnswer} from './src/practice/session.ts';import {paperExportRuntime} from './src/practice/export-runtime.ts';practiceSession(practiceDigest,normalizePracticeAnswer);paperExportRuntime();",resolveDir:root,loader:'ts'},bundle:true,platform:'browser',format:'iife',target:'es2022',minify:true,write:false});
const runtime=compiled.outputFiles[0].text;
await mkdir(root+'skills/paper-notebook-practice/scripts',{recursive:true});
await build({entryPoints:[root+'tools/practice-cli.ts'],outfile:root+'skills/paper-notebook-practice/scripts/practice.mjs',bundle:true,platform:'node',format:'esm',target:'node20',minify:true,legalComments:'inline',plugins:[rawAssets],external:['esbuild'],define:{__PRACTICE_EMBEDDED_CSS__:JSON.stringify(css),__PRACTICE_EMBEDDED_RUNTIME__:JSON.stringify(runtime)},banner:{js:"#!/usr/bin/env node\nimport {createRequire as __practiceCreateRequire} from 'node:module';const require=__practiceCreateRequire(import.meta.url);"}});
const example=JSON.parse(await readFile(root+'skills/paper-notebook-practice/examples/practice-example.json','utf8'));
await writeFile(root+'skills/paper-notebook-practice/examples/exam-paper-sample.html',await buildPracticeHtml(example,{kind:'exam'}));
for(const asset of ['practice-ingest.py','practice-ocr.swift'])await copyFile(root+'tools/'+asset,root+'skills/paper-notebook-practice/scripts/'+asset);
await copyFile(root+'LICENSE',root+'skills/paper-notebook-practice/LICENSE');
await copyFile(root+'THIRD_PARTY_NOTICES.txt',root+'skills/paper-notebook-practice/THIRD_PARTY_NOTICES.txt');
await cp(root+'licenses',root+'skills/paper-notebook-practice/licenses',{recursive:true});
console.log('Built portable practice skill runtime and exam sample.');
