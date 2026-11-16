/** Inline web-delivered fonts when a paper leaves the website. */
const embedded=new Map<string,Promise<string>>();
async function inlineFont(url:string):Promise<string>{
 const absolute=new URL(url,location.href).href;
 let pending=embedded.get(absolute);
 if(!pending){pending=(async()=>{const response=await fetch(absolute);if(!response.ok)throw Error('字体下载失败，请重试。');const extension=new URL(absolute).pathname.split('.').pop(),type=extension==='otf'?'font/otf':extension==='ttf'?'font/ttf':extension==='woff'?'font/woff':'font/woff2',blob=new Blob([await response.arrayBuffer()],{type});return await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('无法读取字体。'));reader.readAsDataURL(blob);});})();embedded.set(absolute,pending);pending.catch(()=>embedded.delete(absolute));}
 return pending;
}
export async function standalonePaperCSS(css:string):Promise<string>{
 const matches=[...css.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)];
 const urls=[...new Set(matches.map(match=>match[1]).filter(url=>!url.startsWith('data:')&&/\.(?:otf|woff2?|ttf)(?:[?#]|$)/i.test(url)))];
 for(const url of urls)css=css.split(url).join(await inlineFont(url));
 return css.replace(/url\(["'](data:font\/[^"']+)["']\)/g,'url($1)');
}
export async function standalonePaperHTML(html:string):Promise<string>{
 const styles=[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)];
 for(const match of styles){const css=await standalonePaperCSS(match[1]);if(css!==match[1])html=html.replace(match[0],match[0].replace(match[1],css));}
 return html;
}
