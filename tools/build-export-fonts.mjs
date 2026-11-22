import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import subsetFont from 'subset-font';

const base=Array.from({length:224},(_,index)=>String.fromCodePoint(index+32)).join('')+'　，。：；、？！“”‘’（）《》【】「」『』—…·■○新增题目说明理由并写出计算步骤';
const chars=text=>[...new Set(text.match(/[^\u0000-\u007f]/gu)??[])].sort().join('');
const eastAsian=text=>[...new Set(text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu)??[])].sort().join('');

export function recordGlyphs(paper,render,hasCard,profiles){
 let text=base+JSON.stringify(paper.presentation??{});
 for(const kind of hasCard?['exam','answers','answer-card']:['exam','answers']){
  const html=render(paper,{kind,runtime:''});
  text+=(html.match(/<template id="paper-template">([\s\S]*?)<\/template>/)?.[1]??'').replace(/<[^>]*>/g,'');
 }
 profiles.add(chars(text));
}

export async function writeExportFonts(directory,font,family,profiles){
 const save=async(bytes,partSize)=>{
  const sha256=createHash('sha256').update(bytes).digest('hex'),prefix=directory+'/'+sha256.slice(0,20)+'.font';
  for(let offset=0;offset<bytes.length;offset+=partSize)await writeFile(`${prefix}-${offset/partSize}.bin`,gzipSync(bytes.subarray(offset,offset+partSize)));
  return {size:bytes.length,partSize,sha256};
 };
 const full=await save(font,128*1024),compact=[];
 const sets=[...profiles].filter(text=>family.endsWith(' JP')?/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text):family.endsWith(' KR')?/\p{Script=Hangul}/u.test(text):true);
 const union=chars(sets.join('')+base);
 for(const text of new Set([...sets,union])){
  const bytes=await subsetFont(font,base+text,{targetFormat:'sfnt',preserveNameIds:[0,7,8,9,11,13,14,16,17]});
  if(bytes.subarray(0,4).toString()!=='OTTO')throw Error('Invalid Word font: '+family);
  compact.push({...await save(bytes,64*1024),chars:eastAsian(base+text),general:text===union});
 }
 compact.sort((left,right)=>left.size-right.size);
 await writeFile(`${directory}/${full.sha256.slice(0,20)}.font.json`,JSON.stringify({...full,compact}));
}
