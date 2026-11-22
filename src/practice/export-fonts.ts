import {gunzipSync} from 'fflate';

const fonts=new Map<string,Promise<Uint8Array<ArrayBuffer>>>();
type FontFile={size:number;partSize:number;sha256:string};
type Profile=FontFile&{chars:string;general:boolean};
const manifests=new Map<string,Promise<FontFile&{compact?:Profile[]}>>();

async function read(url:URL){
 const response=await fetch(url,{signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error(String(response.status));
 return new Uint8Array(await response.arrayBuffer());
}

export async function exportFont(url:URL,family='',progress?:(message:string)=>void,text?:string){
 const match=/\/([a-f0-9]{20})\.otf$/.exec(url.pathname);
 if(!match||url.origin!==location.origin||!/^https?:$/.test(url.protocol))return {bytes:await read(url),subset:false};
 const address=(prefix:string,suffix:string)=>new URL(prefix+'.font'+suffix,url);
 let manifest=manifests.get(url.href);if(!manifest){manifest=read(address(match[1],'.json')).then(bytes=>JSON.parse(new TextDecoder().decode(bytes))).catch(error=>{manifests.delete(url.href);throw error;});manifests.set(url.href,manifest);}
 const full=await manifest,valid=(file:FontFile)=>Number.isSafeInteger(file.size)&&file.size>0&&file.size<=32*1024*1024&&Number.isSafeInteger(file.partSize)&&file.partSize>=65536&&file.partSize<=1024*1024&&/^[a-f0-9]{64}$/.test(file.sha256);
 if(!valid(full)||!full.sha256.startsWith(match[1]))throw Error('字体清单不匹配');
 const chars=text===undefined?undefined:[...new Set(text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu)??[])];
 const profile=chars&&full.compact?.find(file=>valid(file)&&chars.every(char=>file.chars.includes(char)));
 const meta=profile||full,key=address(meta.sha256.slice(0,20),'').href;
 const existing=fonts.get(key);if(existing)return {bytes:await existing,subset:!!profile};
 const pending=(async()=>{
  const output=new Uint8Array(meta.size),count=Math.ceil(meta.size/meta.partSize),label=family.includes('JP')?'日文字体':family.includes('KR')?'韩文字体':family.includes('Serif')?'宋体':'黑体';let next=0,done=0,stopped=false;
  const worker=async()=>{while(next<count&&!stopped){
   const index=next++,offset=index*meta.partSize,partAddress=address(meta.sha256.slice(0,20),`-${index}.bin`);let part:Uint8Array|undefined;
   for(let attempt=0;attempt<2&&!part;attempt++)try{const decoded=gunzipSync(await read(partAddress));if(decoded.length!==Math.min(meta.partSize,meta.size-offset))throw Error('字体分段不完整');part=decoded;}catch(error){if(attempt){stopped=true;throw error;}}
   output.set(part!,offset);if(!stopped)progress?.(`正在准备${label} · ${Math.round(++done/count*100)}%`);
  }};
  await Promise.all(Array.from({length:Math.min(count,6)},worker));
  if(globalThis.crypto?.subtle){const digest=await crypto.subtle.digest('SHA-256',output);if(Array.from(new Uint8Array(digest),value=>value.toString(16).padStart(2,'0')).join('')!==meta.sha256)throw Error('字体校验失败');}
  progress?.('正在生成可编辑的 Word 文档');return output;
 })().catch(()=>{fonts.delete(key);throw Error('试卷字体未下载完整，请重新导出。');});
 fonts.set(key,pending);return {bytes:await pending,subset:!!profile};
}
