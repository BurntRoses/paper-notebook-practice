/** Optional hosting endpoints. Offline HTML carries its own topic data. */
import {isSiteAudio,type PracticeDocument} from './model';
export interface PracticeWebDelivery {
 skillUrl:string;
 topicBaseUrl:string;
 caseBaseUrl?:string;
 exampleBaseUrl?:string;
}
export function webDelivery():PracticeWebDelivery|undefined{
 return (globalThis as typeof globalThis&{__PRACTICE_WEB__?:PracticeWebDelivery}).__PRACTICE_WEB__;
}
export function siteAudioBase(){
 const endpoint=webDelivery()?.caseBaseUrl;
 if(!endpoint)return;
 const base=new URL('../',new URL(endpoint,location.href));
 if(/^https?:$/.test(base.protocol)&&base.origin===location.origin)return base.href;
}
export async function embedSiteAudio(paper:PracticeDocument):Promise<PracticeDocument>{
 if(!paper.sections.some(section=>section.stimulus?.audio?.url))return paper;
 const copy=structuredClone(paper),base=siteAudioBase();
 await Promise.all(copy.sections.map(async section=>{
  const audio=section.stimulus?.audio;
  if(!audio?.url)return;
  if(!base||!isSiteAudio(audio))throw Error('听力资源地址无效。');
  const response=await fetch(new URL(audio.url,base),{redirect:'error',signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('听力下载失败，请重试。');
  const blob=new Blob([await response.arrayBuffer()],{type:audio.mimeType});
  audio.dataUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('无法读取听力文件。'));reader.readAsDataURL(blob);});
  delete audio.url;
 }));
 return copy;
}
export function downloadWebFile(url:string,name:string){
 const anchor=document.createElement('a');anchor.href=new URL(url,location.href).href;anchor.download=name;anchor.rel='noopener';document.body.append(anchor);anchor.click();anchor.remove();
}
export async function fetchTopicBytes(file:string):Promise<Uint8Array|undefined>{
 const target=webDelivery();if(!target)return;
 const base=new URL(target.topicBaseUrl,location.href);
 try{
  const response=await fetch(new URL(file,base),{signal:AbortSignal.timeout(25000)});
  if(response.ok)return new Uint8Array(await response.arrayBuffer());
 }catch{}
 throw Error('试卷资料暂时未能下载，请重试。');
}

export async function fetchPaperDocument(kind:'case'|'example',id:string):Promise<unknown|undefined>{
 const target=webDelivery(),base=kind==='case'?target?.caseBaseUrl:target?.exampleBaseUrl;
 if(!base)return;
 try{
  const response=await fetch(new URL(encodeURIComponent(id)+'.json',new URL(base,location.href)),{signal:AbortSignal.timeout(25000)});
  if(response.ok)return await response.json();
 }catch{/* Keep network and parsing errors actionable in the preview. */}
 throw Error('试卷资料未能下载，请重试。');
}
