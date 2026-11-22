/** Inline web-delivered fonts when a paper leaves the website. */
const embedded=new Map<string,Promise<string>>();
async function inlineFont(url:string):Promise<string>{
 const absolute=new URL(url,location.href).href;
 let pending=embedded.get(absolute);
 if(!pending){pending=(async()=>{try{
  const address=new URL(absolute),extension=address.pathname.split('.').pop(),type=extension==='otf'?'font/otf':extension==='ttf'?'font/ttf':extension==='woff'?'font/woff':'font/woff2';
  let binary:ArrayBuffer;
  if(extension==='otf')binary=(await (await import('./export-fonts')).exportFont(address)).bytes.buffer;
  else{const response=await fetch(address,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(String(response.status));binary=await response.arrayBuffer();}
  return await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(new Blob([binary],{type}));});
 }catch{throw Error('字体未能下载，请重试或使用离线工具导出。');}})();embedded.set(absolute,pending);pending.catch(()=>embedded.delete(absolute));}
 return pending;
}
export async function standalonePaperCSS(css:string):Promise<string>{
 const matches=[...css.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)];
 const urls=[...new Set(matches.map(match=>match[1]).filter(url=>!url.startsWith('data:')&&/\.(?:otf|woff2?|ttf)(?:[?#]|$)/i.test(url)))];
 const inlined=await Promise.all(urls.map(async url=>[url,await inlineFont(url)] as const));
 const replacements=new Map(inlined);
 css=css.replace(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g,(match,url)=>replacements.has(url)?'url('+replacements.get(url)+')':match);
 return css.replace(/url\(["'](data:font\/[^"']+)["']\)/g,'url($1)');
}
export async function standalonePaperHTML(html:string):Promise<string>{
 const styles=[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)];
 for(const match of styles){const css=await standalonePaperCSS(match[1]);if(css!==match[1])html=html.replace(match[0],match[0].replace(match[1],css));}
 return html;
}
