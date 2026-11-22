export function paperBlankText(text:string,escape:(value:string)=>string){
 return text.split(/([_＿]{2,}(?:[ \t　]+[_＿]+)*|[（(][ \t]{2,}[）)])/g).map((part,index,parts)=>{
  if(index%2===0||/[a-z0-9]$/i.test(parts[index-1])&&/^[a-z0-9]/i.test(parts[index+1]))return escape(part);
  if(/^[（(]/.test(part))return `<span class="paper-spaced-blank">${escape(part)}</span>`;
  const length=Math.min(44,Math.max(2.5,Array.from(part).reduce((width,character)=>width+(character==='＿'?1.7:1),0)));
  return `<span class="paper-blank-line" style="--blank-length:${length}ch" aria-hidden="true"></span>`;
 }).join('');
}

export function paperHeaderField(text:string,escape:(value:string)=>string){
 const field=/^((?:[\p{Script=Han}、]{2,12}|[A-Za-z][A-Za-z .]{1,24})[:：])[ \t　]*([_＿]{2,}(?:[ \t　]+[_＿]+)*)$/u.exec(text.trim());
 if(!field)return;
 const [,label,blank]=field;
 const units=Array.from(blank).reduce((width,character)=>width+(character==='＿'?1.7:1),0);
 return `<span class="exam-header-field" style="--header-blank:${Math.ceil(units*1.15)}ch"><span>${escape(label)}</span><i aria-hidden="true"></i></span>`;
}
