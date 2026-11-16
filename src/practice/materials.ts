import { unzipSync, strFromU8 } from 'fflate';
import { textOf, type NotebookDocument } from '../model/types';
import type { PracticeDocument, PracticeMaterial, PracticeQuestion, PracticeKind } from './model';

export interface PracticeInputFile {name:string;text():Promise<string>;arrayBuffer():Promise<ArrayBuffer>}
export interface MaterialImport {material:PracticeMaterial;questions:PracticeQuestion[];warnings:string[];practice?:PracticeDocument;notebook?:NotebookDocument}
export interface MaterialImportOptions {kind?:PracticeKind;chapter?:string;subject?:string}
/** IDs depend on complete content, never on a filename or a shortened excerpt. */
export function stablePracticeId(prefix:string,value:string){let a=2166136261,b=0x9e3779b9;for(let i=0;i<value.length;i++){a=Math.imul(a^value.charCodeAt(i),16777619);b=Math.imul(b+value.charCodeAt(i),2246822519);}return `${prefix}-${(a>>>0).toString(36)}${(b>>>0).toString(36)}`;}
export function materialFromText(text:string,title='导入资料',kind:PracticeKind='reference'):PracticeMaterial{
 const clean=text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
 if(!clean.trim())throw new Error('资料中没有可读取的文字。扫描件请先用自己的 AI 或 OCR 提取，并核对公式与题号。');
 const id=stablePracticeId('material',clean);return {id,title,kind,text:clean,blocks:[{id:`${id}-text`,title,text:clean,page:1}]};
}
function xmlText(xml:string){return xml.replace(/<w:tab\b[^>]*\/?\s*>/g,'\t').replace(/<w:br\b[^>]*\/?\s*>/g,'\n').replace(/<\/w:p>/g,'\n').replace(/<[^>]+>/g,'').replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');}
export function extractDocx(buffer:ArrayBuffer):string{
 const files=unzipSync(new Uint8Array(buffer));const document=files['word/document.xml'];
 if(!document)throw new Error('此文件不是有效的 DOCX 文档。旧版 .doc 请另存为 .docx 或导出文字。');
 return xmlText(strFromU8(document));
}
export function extractNotebookMaterial(value:unknown,title='学习笔记'):MaterialImport{
 const document=value as NotebookDocument;if(!document?.notebook?.id||!Array.isArray(document.notebook.chapters))throw new Error('JSON 不是可读取的 Paper Notebook 笔记。');
 const blocks:NonNullable<PracticeMaterial['blocks']>=[];const questions:PracticeQuestion[]=[];let pageNumber=0;
 for(const chapter of document.notebook.chapters){for(const page of chapter.pages){pageNumber++;for(const block of page.blocks){const text=textOf(block);if(!text.trim())continue;blocks.push({id:block.id,title:block.title||page.title,text,page:pageNumber});
  if(block.type==='exercise'&&block.solution?.length&&block.question){const options=block.options?.map((option,index)=>({id:'ABCD'[index] as 'A'|'B'|'C'|'D',text:option.text}));const single=block.questionType==='single'&&options?.length===4;const answer=single?block.solution.map(id=>'ABCD'[block.options!.findIndex(option=>option.id===id)]).join(''):block.solution.join('\n');if(single&&!/^[ABCD]$/.test(answer))continue;
   questions.push({id:stablePracticeId('question',document.notebook.id+block.id),number:questions.length+1,type:single?'choice':'response',prompt:block.question,score:typeof block.points==='number'?block.points:single?2:5,options:single?options:undefined,solution:answer,explanation:block.explanation||'请结合原文中的定义、条件与例题核对作答。',source:{materialId:stablePracticeId('material',document.notebook.id+':'+document.notebook.revision),blockId:block.id,page:pageNumber,title:block.title||page.title,exact:block.question},chapter:chapter.title,tags:[page.subject||'general'],difficulty:'medium'});
  }
 }}}
 const material:PracticeMaterial={id:stablePracticeId('material',document.notebook.id+':'+document.notebook.revision),title:document.notebook.title||title,kind:'notebook',provenance:{kind:'upload',version:String(document.notebook.revision)},text:blocks.map(b=>b.text).join('\n\n'),blocks};
 return {material,questions,warnings:questions.length?[]:['已保留全部笔记原文。没有带参考答案的单选题或解答题，可选取原句制作填空题，或导出资料交给自己的 AI 出题。'],notebook:document};
}
function notebookFromHtml(html:string){const scripts=[...html.matchAll(/<script\b[^>]*\btype=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi)];for(const match of scripts){try{const value=JSON.parse(match[1]);if(value.notebook?.chapters)return value;}catch{ /* Other JSON scripts are not notebook data. */ }}throw new Error('HTML 中未找到 Paper Notebook 的嵌入原文。请导入笔记 JSON 或从阅读器导出的完整 HTML。');}
export async function importPracticeFile(file:PracticeInputFile,options:MaterialImportOptions={}):Promise<MaterialImport>{
 const extension=file.name.toLowerCase().split('.').pop();const title=file.name.replace(/\.[^.]+$/,'');const kind=options.kind||'reference';let material:PracticeMaterial;let warnings:string[]=[];
 if(extension==='pdf'){
  const {extractPdfMaterial}=await import('./pdf');const extracted=await extractPdfMaterial(await file.arrayBuffer(),title,kind);material=extracted.material;warnings=extracted.warnings;
 }else if(extension==='docx')material=materialFromText(extractDocx(await file.arrayBuffer()),title,kind);
 else if(extension==='doc')throw new Error('旧版 DOC 暂不能直接读取。请另存为 DOCX、PDF 或纯文字后导入。');
 else{
  const text=await file.text();if(extension==='html'||extension==='htm')return extractNotebookMaterial(notebookFromHtml(text),title);
  if(extension==='json'){
   let value:unknown;try{value=JSON.parse(text);}catch{throw new Error('JSON 语法无效，请检查引号、逗号和文件是否完整。');}
   const data=value as PracticeDocument;
   if(data.practiceId&&Array.isArray(data.sections)){return {material:materialFromText(text,title,'question-bank'),questions:data.sections.flatMap(section=>section.questions),warnings:[],practice:data};}
   if((value as NotebookDocument)?.notebook?.chapters)return extractNotebookMaterial(value,title);
   if(Array.isArray(value))throw new Error('题库 JSON 请使用 practice.json 协议，确保每题带原文出处、题型、分值和参考答案。也可导入编号的 TXT / Markdown 题库。');
   throw new Error('JSON 未包含 practice.json 题库或 Paper Notebook 笔记。');
  }
  if(!['txt','md','markdown','csv',''].includes(extension||''))throw new Error(`暂不支持 .${extension}。可导入 PDF、DOCX、TXT、Markdown、笔记 HTML 和 practice.json。`);
  material=materialFromText(text,title,kind);
 }
 material.provenance??={kind:'upload'};
 const parsed=parseQuestionText(material,{chapter:options.chapter,subject:options.subject});return {material,questions:parsed.questions,warnings:[...warnings,...parsed.warnings]};
}

/** Parse only explicit, numbered questions. An answer is never inferred from prose. */
export function parseQuestionText(material:PracticeMaterial,options:{chapter?:string;subject?:string}={}):{questions:PracticeQuestion[];warnings:string[]}{
 const questions:PracticeQuestion[]=[];const warnings:string[]=[];let chapter=options.chapter||material.title;
 // PDF questions may continue on the next page. Parse their continuous extracted
 // text and retain the starting physical page, while citing the full material.
 const multiPage=(material.blocks?.length||0)>1&&material.blocks?.every(block=>typeof block.page==='number');
 const blocks=multiPage?[{id:material.id,text:material.text,title:material.title,page:1}]:material.blocks?.length?material.blocks:[{id:material.id,text:material.text,title:material.title}];
 for(const block of blocks){
  const lines=block.text.split('\n');let offsets:number[]=[];let offset=0;for(const line of lines){offsets.push(offset);offset+=line.length+1;}
  const starts:{line:number;heading:string}[]=[];
  lines.forEach((line,index)=>{if(/^\s*(?:#{1,6}\s+|第[一二三四五六七八九十百\d]+章\s*)/.test(line))chapter=line.replace(/^\s*#{1,6}\s*/,'').trim();if(/^\s*(?:\*\*)?(?:第\s*)?\d+\s*(?:[.．、)）]|题[：:])\s*\S/.test(line))starts.push({line:index,heading:chapter});});
  for(let i=0;i<starts.length;i++){
   const first=starts[i].line;const end=i+1<starts.length?starts[i+1].line:lines.length;const raw=block.text.slice(offsets[first],end<lines.length?offsets[end]:block.text.length).trimEnd();
   const numbered=raw.replace(/^\s*(?:\*\*)?(?:第\s*)?\d+\s*(?:[.．、)）]|题[：:])\s*/, '').replace(/^\*\*/,'');
   const answerMatch=numbered.match(/(?:^|\n)\s*(?:\*\*)?(?:参考答案|正确答案|答案|Answer)\s*(?:\*\*)?[：:]\s*([^\n]+)/i);
   if(!answerMatch){warnings.push(`${block.title||material.title}：第 ${questions.length+1} 个编号题缺少“答案：”，已保留原文，未收入可判分题库。`);continue;}
   const body=numbered.slice(0,answerMatch.index).trim();const answer=answerMatch[1].replace(/\*\*/g,'').trim();
   const explanationMatch=numbered.slice((answerMatch.index||0)+answerMatch[0].length).match(/(?:^|\n)\s*(?:\*\*)?(?:解析|解答|Explanation)\s*(?:\*\*)?[：:]\s*([\s\S]+)/i);
   const explanation=explanationMatch?.[1].replace(/\n\s*#{1,6}\s[\s\S]*$/,'').trim()||'参考答案来自导入资料；请结合原题条件核对。';
   // The option body is sliced by the next explicit option, preserving line wraps.
   const optionStarts=[...body.matchAll(/(?:^|\n|[ \t]+)([A-Z][A-Z0-9_]{0,15})[.．、)）:：][ \t]*/g)];
   let type:PracticeQuestion['type']='response';let prompt=body;let solution:string|string[]=answer;let questionOptions:PracticeQuestion['options'];
   if(optionStarts.length){
    const ids=optionStarts.map(match=>match[1]),upper=answer.toUpperCase();
    const answers=ids.includes(upper)?[upper]:/^[A-Z]+$/.test(upper)&&ids.every(id=>id.length===1)?[...upper]:upper.split(/[\s,，、;；]+/).filter(Boolean);
    if(ids.length<2||ids.length>10||new Set(ids).size!==ids.length||!answers.length||new Set(answers).size!==answers.length||answers.some(id=>!ids.includes(id))){warnings.push(`${block.title||material.title}：选择题需 2–10 个不同的完整选项和对应答案 ID，已保留原文等待核对。`);continue;}
    type=answers.length>1?'multiple':'choice';prompt=body.slice(0,optionStarts[0].index).trim();questionOptions=optionStarts.map((match,index)=>({id:match[1],text:body.slice((match.index||0)+match[0].length,index+1<optionStarts.length?optionStarts[index+1].index:body.length).trim()}));solution=answers.length>1?answers:answers[0];
    if(answers.length===1&&ids.every(id=>['TRUE','FALSE','NOT_GIVEN'].includes(id)))type='truefalse';
   }else if(/_{2,}|（\s*）|\(\s*\)|\[\s*\]/.test(body)){type='blank';solution=answer.split(/\s*[；;]\s*/).filter(Boolean);}
   else if(/^(?:TRUE|FALSE|NOT[ _]GIVEN|正确|错误|对|错)$/i.test(answer)){type='truefalse';const normalized=answer.toUpperCase().replace(/ /g,'_');solution=/^(?:TRUE|正确|对)$/.test(normalized)?'TRUE':/^(?:FALSE|错误|错)$/.test(normalized)?'FALSE':'NOT_GIVEN';questionOptions=[{id:'TRUE',text:'TRUE / 正确'},{id:'FALSE',text:'FALSE / 错误'},...(solution==='NOT_GIVEN'?[{id:'NOT_GIVEN',text:'NOT GIVEN / 未提及'}]:[])];}
   else if(/^(?:【(?:操作题|编程题|任务题)】|\[(?:task|操作题|编程题)\])/i.test(body))type='task';
   const scoreMatch=prompt.match(/[（(]\s*(\d+(?:\.\d+)?)\s*分\s*[）)]/);const tags=[...prompt.matchAll(/#([\p{L}\p{N}_-]+)/gu)].map(match=>match[1]);const difficulty=/\[困难\]|【困难】/.test(prompt)?'hard':/\[简单\]|【简单】/.test(prompt)?'easy':'medium';
   let sourcePage=block.page;if(multiPage){let offset=0;for(const page of material.blocks!){if(offsets[first]<offset+page.text.length+2){sourcePage=page.page;break;}offset+=page.text.length+2;}}
   questions.push({id:stablePracticeId('question',material.id+'|'+block.id+'|'+raw),number:questions.length+1,type,prompt:prompt.replace(/[（(]\s*\d+(?:\.\d+)?\s*分\s*[）)]/,'').trim(),score:scoreMatch?Number(scoreMatch[1]):['choice','multiple','truefalse'].includes(type)?2:type==='blank'?3:5,options:questionOptions,solution,explanation,source:{materialId:material.id,blockId:block.id,page:sourcePage,title:block.title||material.title,exact:raw},origin:{kind:'original',number:raw.match(/^\s*(?:\*\*)?(?:第\s*)?(\d+)/)?.[1]||String(questions.length+1)},chapter:starts[i].heading,tags:[...(options.subject?[options.subject]:[]),...tags],difficulty});
  }
 }
 if(!questions.length)warnings.push('原文已完整保存。可导出出题任务交给自己的 AI，或选取确切原句制作填空题。');return {questions,warnings};
}

export function createClozeQuestion(material:PracticeMaterial,exact:string,answer:string,options:{chapter?:string;score?:number;explanation?:string;blockId?:string}={}):PracticeQuestion{
 const block=material.blocks?.find(item=>(!options.blockId||item.id===options.blockId)&&item.text.includes(exact));const text=block?.text||material.text;
 if(!exact.trim()||!text.includes(exact))throw new Error('所选原句必须是资料中的完整、连续原文。');
 if(!answer.trim()||!exact.includes(answer))throw new Error('填空答案必须是所选原句中确切出现的文字。');
 const start=exact.indexOf(answer);return {id:stablePracticeId('question',material.id+'|cloze|'+exact+'|'+answer),number:1,type:'blank',prompt:exact.slice(0,start)+'____'+exact.slice(start+answer.length),score:options.score||3,solution:[answer],explanation:options.explanation||`原文：${exact}`,source:{materialId:material.id,blockId:block?.id||material.id,page:block?.page,title:block?.title||material.title,exact},chapter:options.chapter||material.title,tags:['原句填空'],difficulty:'easy'};
}
export function buildGenerationTask(materials:PracticeMaterial[],options:{subject?:string;level?:string;count?:number;durationMinutes?:number;mode?:'mock'|'bank';instructions?:string;notebookId?:string;notebookRevision?:number}={}):string{
 const notebookId=options.notebookId||stablePracticeId('notebook',materials.map(material=>material.id).join('|'));
 const metadata={schemaVersion:'1.0.0',practiceId:stablePracticeId('practice',materials.map(material=>material.id).join('|')+'|'+JSON.stringify(options)),notebookId,notebookRevision:options.notebookRevision||1,subject:options.subject||'根据资料填写',level:options.level||'根据资料填写',durationMinutes:options.durationMinutes||60,mode:options.mode||'mock'};
 return `请按 paper-notebook-practice Skill 与随附的 practice.schema.json，用以下资料制作可校验的 practice.json。\n目标题数：${options.count||20}。\n固定元数据（逐项原样保留）：\n${JSON.stringify(metadata,null,2)}\n${options.instructions?.trim()?`\n用户出题要求：\n${options.instructions.trim()}\n`:''}\n输出协议：\n- 返回完整 JSON，不输出 HTML。顶层除固定元数据外，含 title、totalScore、style、materials、sections。style.preset 为 standard / stem / humanities / language，可设 fontSize（9–20）、lineHeight（1.2–2.2）、sealed。\n- materials 使用下列材料对象，保留 id、title、kind、text、blocks。原文不得改写。\n- sections 每节含 id、title、instructions、score、questions；每题含 id、number、type（choice / multiple / truefalse / blank / response / task）、prompt、score、solution、explanation、source、chapter，可含 tags 和 difficulty（easy / medium / hard）。id 用字母开头，后接字母、数字、横线或下划线；各实体 ID 不重复；number 按试卷顺序递增。\n- source 必含 materialId、blockId、exact，可含 title、page。blockId 对应材料中的 Block；无 blocks 时可引用材料 id。exact 必须是该 Block 正文完整、连续、非空的子串。保留题源、页码、原题号与公式；不要编造出处。\n- choice / multiple / truefalse 含 2–10 个不同 ID 的 options（id 为大写英文字母开头，可含大写字母、数字、下划线）。choice、truefalse 的 solution 为唯一正确选项 ID；multiple 为正确 ID 数组；判断题可用 TRUE / FALSE / NOT_GIVEN。blank 的 solution 为逐空答案字符串数组；response、task 为参考解答字符串。每题 explanation 给出依据、推理或评分要点。\n- 每节 score 等于该节题分之和，totalScore 等于各节之和。默认保留原题和原选项顺序，assembly.choiceOrder="preserve"；仅在用户明确需要均衡时对 A–D 四选单选均衡，并记录 choiceOrder="balanced"。选项相互引用时保留含义，不能仅换字母。\n- 按章节、题型、难度与知识点组织。题目用 origin.kind 区分 original / adapted / generated；原题用 origin.number 保留原题号。无法依据资料确定的答案留待核对，不编造。题面只放题目，答案与解析只放在 solution / explanation。\n\n资料（JSON）：\n${JSON.stringify(materials,null,2)}\n`;
}
