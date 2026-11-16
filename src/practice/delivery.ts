/** Optional hosting endpoints. Offline HTML continues to use its embedded Skill. */
export interface PracticeWebDelivery {
 skillUrl:string;
 topicBaseUrl:string;
 caseBaseUrl?:string;
 downloadUrl?:string;
}
export function webDelivery():PracticeWebDelivery|undefined{
 return (globalThis as typeof globalThis&{__PRACTICE_WEB__?:PracticeWebDelivery}).__PRACTICE_WEB__;
}
export function downloadWebFile(url:string,name:string){
 const anchor=document.createElement('a');anchor.href=new URL(url,location.href).href;anchor.download=name;anchor.rel='noopener';document.body.append(anchor);anchor.click();anchor.remove();
}
export async function fetchTopicBytes(file:string):Promise<Uint8Array|undefined>{
 const target=webDelivery();if(!target)return;
 const base=new URL(target.topicBaseUrl,location.href),response=await fetch(new URL(file,base));
 if(!response.ok)throw Error('试卷资料暂时未能下载，请重试。');
 return new Uint8Array(await response.arrayBuffer());
}

export async function fetchCaseDocument(id:string):Promise<unknown|undefined>{
 const target=webDelivery();if(!target?.caseBaseUrl)return;
 const response=await fetch(new URL(encodeURIComponent(id)+'.json',new URL(target.caseBaseUrl,location.href)));
 if(!response.ok)throw Error('试卷资料暂时未能下载，请重试。');
 return response.json();
}
