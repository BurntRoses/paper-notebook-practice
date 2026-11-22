import {gunzipSync} from 'fflate';

const fonts=new Map<string,Promise<Uint8Array<ArrayBuffer>>>();

async function read(url:URL){
 const response=await fetch(url,{signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error(String(response.status));
 return new Uint8Array(await response.arrayBuffer());
}

export function exportFont(url:URL,family='',progress?:(message:string)=>void){
 const key=url.href,existing=fonts.get(key);if(existing)return existing;
 const pending=(async()=>{
  const match=/\/([a-f0-9]{20})\.otf$/.exec(url.pathname);
  if(!match||url.origin!==location.origin||!/^https?:$/.test(url.protocol))return read(url);
  const partUrl=(suffix:string)=>{const address=new URL(url);address.pathname=address.pathname.slice(0,-4)+'.font'+suffix;return address;};
  const meta=JSON.parse(new TextDecoder().decode(await read(partUrl('.json'))));
  if(!Number.isSafeInteger(meta.size)||meta.size<1||meta.size>32*1024*1024||!Number.isSafeInteger(meta.partSize)||meta.partSize<65536||meta.partSize>1024*1024||typeof meta.sha256!=='string'||!/^[a-f0-9]{64}$/.test(meta.sha256)||!meta.sha256.startsWith(match[1]))throw Error('字体清单不匹配');
  const output=new Uint8Array(meta.size),count=Math.ceil(meta.size/meta.partSize),label=family.includes('JP')?'日文字体':family.includes('KR')?'韩文字体':family.includes('Serif')?'宋体':'黑体';let next=0,done=0,stopped=false;
  const worker=async()=>{while(next<count&&!stopped){
   const index=next++,offset=index*meta.partSize,address=partUrl(`-${index}.bin`);let part:Uint8Array|undefined;
   for(let attempt=0;attempt<2&&!part;attempt++)try{const decoded=gunzipSync(await read(address));if(decoded.length!==Math.min(meta.partSize,meta.size-offset))throw Error('字体分段不完整');part=decoded;}catch(error){if(attempt){stopped=true;throw error;}}
   output.set(part!,offset);if(!stopped)progress?.(`正在准备${label} · ${Math.round(++done/count*100)}%`);
  }};
  await Promise.all(Array.from({length:Math.min(count,6)},worker));
  if(globalThis.crypto?.subtle){const digest=await crypto.subtle.digest('SHA-256',output);if(Array.from(new Uint8Array(digest),value=>value.toString(16).padStart(2,'0')).join('')!==meta.sha256)throw Error('字体校验失败');}
  progress?.('正在生成可编辑的 Word 文档');return output;
 })().catch(()=>{fonts.delete(key);throw Error('试卷字体未下载完整，请重新导出。');});
 fonts.set(key,pending);return pending;
}
