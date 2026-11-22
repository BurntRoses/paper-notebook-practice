import type {PracticePresentation} from './model';
import type {PaperTemplateLayout} from './templates';

export async function nativeWordFile(doc:Document, archive:(parts:Record<string,Uint8Array>)=>Uint8Array, fontCSS?:string){
 const template=doc.querySelector<HTMLTemplateElement>('#paper-template')?.content;
 if(!template?.childElementCount)throw Error('没有可编辑的试卷正文。');
 const data=JSON.parse(doc.getElementById('practice-data')!.textContent!) as {title:string;paperKind:string;paperLayout:PaperTemplateLayout;paperGeometry:{widthMm:number;heightMm:number};presentation:PracticePresentation};
 const layout=data.paperLayout, design=data.presentation, geometry=data.paperGeometry, lang=doc.documentElement.lang||'zh-CN';
 const xml=(value:unknown)=>String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g,'').replace(/[&<>"']/g,token=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[token]!));
 const mm=(value:number)=>Math.round(value*1440/25.4),val=(name:string,value:unknown)=>`<w:${name} w:val="${xml(value)}"/>`;
 const header='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', ns='http://schemas.openxmlformats.org',word=ns+'/wordprocessingml/2006/main',rel=ns+'/officeDocument/2006/relationships',office=ns+'/officeDocument/2006',pack=ns+'/package/2006';
 const files:Record<string,Uint8Array>={},put=(path:string,content:string)=>{files[path]=new TextEncoder().encode(header+content);};
 const relItem=(id:string,type:string,target:string,external=false)=>`<Relationship Id="${id}" Type="${rel}/${type}" Target="${xml(target)}"${external?' TargetMode="External"':''}/>`;
 const rels=(items:string[])=>`<Relationships xmlns="${pack}/relationships">${items.join('')}</Relationships>`;
 const width=mm(geometry.widthMm-layout.marginLeftMm-layout.marginRightMm),columns=layout.columns,bodyWidth=(width-(columns-1)*mm(8))/columns;
 const font=layout.fontFamily==='sans'?'Arial':'Times New Roman',east=lang==='ja'?'Noto Sans JP':lang==='ko'?'Noto Sans KR':layout.fontFamily==='sans'?'Noto Sans SC':'Noto Serif SC';
 const titleEast=design.titleFont==='hei'&&east==='Noto Serif SC'?'Noto Sans SC':east;
 const fontDefs:string[]=[],fontRels:string[]=[];
 if(/[\p{Script=Han}\p{Script=Katakana}\p{Script=Hiragana}\p{Script=Hangul}]/u.test((template.textContent??'')+(design.footerTemplate??''))){
  const css=fontCSS??Array.from(doc.querySelectorAll('style'),sheet=>sheet.textContent).join('\n');
  for(const family of new Set([east,titleEast])){
   const source=css.match(new RegExp('@font-face\\s*\\{\\s*font-family:["\']'+family+'["\'];\\s*src:url\\(["\']?([^"\')]+)'))?.[1];if(!source)continue;
   const url=new URL(source,location.href);if(!/^data:font\/otf;base64,/i.test(source)&&(url.origin!==location.origin||!/^https?:$/.test(url.protocol)))throw Error('无法读取试卷字体：'+family);
   const response=await fetch(url);if(!response.ok)throw Error('试卷字体下载失败，请重试。');const binary=new Uint8Array(await response.arrayBuffer());
   const key='589A46F0-E438-4C52-9A26-1382B10D40E7',mask=key.replace(/-/g,'').match(/../g)!.reverse().map(pair=>parseInt(pair,16));
   for(let index=0;index<32;index++)binary[index]^=mask[index%16];
   const id='font'+(fontDefs.length+1),path='fonts/'+id+'.odttf';files['word/'+path]=binary;fontRels.push(relItem(id,'font',path));
   fontDefs.push(`<w:font w:name="${family}">${val('family',family.includes('Serif')?'roman':'swiss')}<w:embedRegular r:id="${id}" w:fontKey="{${key}}" w:subsetted="0"/></w:font>`);
  }
  if(fontDefs.length){
   const license=css.match(/\/\* Noto CJK embedded font license\n([\s\S]*?)\n\*\//)?.[1];if(license)files['word/fonts/OFL.txt']=new TextEncoder().encode(license);
   put('word/fontTable.xml',`<w:fonts xmlns:w="${word}" xmlns:r="${rel}">${fontDefs.join('')}</w:fonts>`);put('word/_rels/fontTable.xml.rels',rels(fontRels));
  }
 }
 const size=Math.round(layout.fontSize*2),line=Math.round(layout.fontSize*20*layout.lineHeight);
 const fonts=(latin:string,cjk:string)=>`<w:rFonts w:ascii="${xml(latin)}" w:hAnsi="${xml(latin)}" w:eastAsia="${xml(cjk)}"/>`;
 const run=(text:string,props='')=>text?`<w:r>${props?'<w:rPr>'+props+'</w:rPr>':''}<w:t xml:space="preserve">${xml(text)}</w:t></w:r>`:'';
 const br='<w:r><w:br/></w:r>',fill=(count:number)=>run('\u00a0'.repeat(Math.max(3,Math.min(64,Math.round(count)))),val('u','single'));
 const style=(id:string,name:string,pPr:string,rPr='')=>`<w:style w:type="paragraph" w:styleId="${id}">${val('name',name)}${val('basedOn','Normal')}${val('next','Normal')}<w:qFormat/><w:pPr>${pPr}</w:pPr>${rPr?'<w:rPr>'+rPr+'</w:rPr>':''}</w:style>`;
 const spacing=(before:number,after:number)=>`<w:spacing w:before="${before}" w:after="${after}"/>`;
 const compact='<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>';
 const alignment=(align:string)=>val('jc',align==='right'?'right':align==='left'?'left':'center');
 const alignTitle=template.querySelector<HTMLElement>('.exam-heading')?.style.textAlign||'center';
 const styles=style('Title','Title','<w:keepNext/><w:keepLines/>'+spacing(0,mm(design.titleGapMm??2))+alignment(alignTitle),fonts(font,titleEast)+'<w:b/>'+val('sz',Math.round((design.titleSizePt??18)*2)))
  +style('Heading1','heading 1','<w:keepNext/><w:keepLines/>'+spacing(150,60)+val('outlineLvl',0),'<w:b/>'+val('sz',Math.round((design.sectionSizePt??layout.fontSize+2)*2)))
  +style('Heading2','heading 2','<w:keepNext/><w:keepLines/>'+spacing(95,35)+val('outlineLvl',1),'<w:b/>')
  +style('Question','题目',spacing(mm(design.questionGapMm??2.2),35))+style('Option','选项',compact+'<w:ind w:left="480" w:hanging="240"/>')
  +style('Meta','卷头信息',spacing(0,35)+alignment(alignTitle))+style('Cell','表格文字',compact+alignment('center'))
  +style('Small','卷面附注',compact,val('sz',Math.min(size,18)))+style('Answer','答案与解析',spacing(20,55));
 put('word/styles.xml',`<w:styles xmlns:w="${word}"><w:docDefaults><w:rPrDefault><w:rPr>${fonts(font,east)}${val('sz',size)}<w:lang w:val="${xml(lang)}" w:eastAsia="${xml(lang)}"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:widowControl/><w:spacing w:after="50" w:line="${line}" w:lineRule="atLeast"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal">${val('name','Normal')}<w:qFormat/></w:style>${styles}</w:styles>`);
 let pendingBreak=false;
 const para=(runs:string,id='Normal',props='')=>{const page=pendingBreak?'<w:pageBreakBefore/>':'';pendingBreak=false;return `<w:p><w:pPr>${val('pStyle',id)}${page}${props}</w:pPr>${runs}</w:p>`;};
 const numDefs:string[]=[],numList=(type:number,start=1)=>{const id=numDefs.length+1;numDefs.push(`<w:num w:numId="${id}">${val('abstractNumId',type)}<w:lvlOverride w:ilvl="0">${val('startOverride',start)}</w:lvlOverride></w:num>`);return id;};
 const numbering=(id:number)=>`<w:numPr>${val('ilvl',0)}${val('numId',id)}</w:numPr>`;
 const table=(rows:string[][],tableWidth=bodyWidth,borders=true,minHeight=0,weights?:number[])=>{
  if(!rows.length)return '';
  const count=Math.max(...rows.map(row=>row.length));if(!count)return '';
  const ratios=weights?.length===count?weights:Array<number>(count).fill(1),sum=ratios.reduce((total,value)=>total+value,0),widths=ratios.map(value=>Math.floor(tableWidth*value/sum));
  const edges=['top','left','bottom','right','insideH','insideV'].map(side=>`<w:${side} w:val="${borders?'single':'nil'}"${borders?' w:sz="4" w:color="777777"':''}/>`).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="${Math.round(tableWidth)}" w:type="dxa"/><w:tblBorders>${edges}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar>${['top','left','bottom','right'].map(side=>`<w:${side} w:w="${count>10?0:35}" w:type="dxa"/>`).join('')}</w:tblCellMar></w:tblPr><w:tblGrid>${widths.map(value=>`<w:gridCol w:w="${value}"/>`).join('')}</w:tblGrid>${rows.map(row=>`<w:tr><w:trPr>${minHeight?`<w:trHeight w:val="${minHeight}" w:hRule="atLeast"/>`:''}</w:trPr>${widths.map((value,index)=>`<w:tc><w:tcPr><w:tcW w:w="${value}" w:type="dxa"/></w:tcPr>${row[index]||para('','Cell')}${row[index]?.endsWith('</w:tbl>')?para('','Cell'):''}</w:tc>`).join('')}</w:tr>`).join('')}</w:tbl>`;
 };
 const drawingNS=`xmlns:wp="${ns}/drawingml/2006/wordprocessingDrawing" xmlns:a="${ns}/drawingml/2006/main" xmlns:pic="${ns}/drawingml/2006/picture"`;
 const media=new Map<string,{id:string;width:number;height:number}>(),mediaRels:string[]=[];
 for(const img of Array.from(template.querySelectorAll('img'))){
  const source=img.getAttribute('src')??'';if(media.has(source))continue;
  if(!/^data:image\//i.test(source))throw Error('题图未内嵌，无法导出 Word：'+img.alt);
  const image=new Image();image.src=source;try{await image.decode();}catch{throw Error('题图读取失败：'+img.alt);}
  const original=/^data:image\/(png|jpeg);base64,([\s\S]+)$/i.exec(source),ext=original?.[1].toLowerCase()==='jpeg'?'jpeg':'png';
  let binary=original?.[2];if(!binary){const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d');if(!ctx)throw Error('无法转换题图：'+img.alt);ctx.drawImage(image,0,0);binary=canvas.toDataURL('image/png').split(',')[1];}
  const number=media.size+1,id='image'+number,path=`media/figure-${number}.${ext}`;files['word/'+path]=Uint8Array.from(atob(binary),character=>character.charCodeAt(0));media.set(source,{id,width:image.naturalWidth,height:image.naturalHeight});mediaRels.push(relItem(id,'image',path));
 }
 let drawingId=0;
 const drawing=(img:Element)=>{
  const asset=media.get(img.getAttribute('src')!)!,id=++drawingId,requested=parseFloat((img.closest('figure') as HTMLElement)?.style.width??'');
  const extent=Math.min(bodyWidth*635,requested?requested*36000:asset.width*9525,mm(geometry.heightMm-layout.marginTopMm-layout.marginBottomMm-10)*635*asset.width/asset.height),cx=Math.round(extent),cy=Math.round(extent*asset.height/asset.width),alt=xml(img.getAttribute('alt'));
  return `<w:r><w:drawing><wp:inline><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="Figure ${id}" descr="${alt}"/><a:graphic><a:graphicData uri="${ns}/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="Figure ${id}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${asset.id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
 };
 function equation(node:Element):string{
  const tag=node.localName,kids=Array.from(node.children),part=(index:number)=>kids[index]?equation(kids[index]):'',args=(...names:string[])=>names.map((name,index)=>`<m:${name}>${part(index)}</m:${name}>`).join('');
  if(tag==='semantics')return part(0);
  if(tag==='annotation'||tag==='annotation-xml'||tag==='mphantom')return '';
  if(tag==='mfrac')return `<m:f>${node.getAttribute('linethickness')==='0px'?'<m:fPr><m:type m:val="noBar"/></m:fPr>':''}${args('num','den')}</m:f>`;
  if(tag==='msqrt'||tag==='mroot')return `<m:rad>${tag==='msqrt'?'<m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e>'+kids.map(equation).join('')+'</m:e>':'<m:deg>'+part(1)+'</m:deg><m:e>'+part(0)+'</m:e>'}</m:rad>`;
  if(tag==='msub'||tag==='msup'||tag==='msubsup'){const kind=tag==='msub'?'sSub':tag==='msup'?'sSup':'sSubSup';return `<m:${kind}>${args(...(tag==='msub'?['e','sub']:tag==='msup'?['e','sup']:['e','sub','sup']))}</m:${kind}>`;}
  if(tag==='mover'||tag==='munder'||tag==='munderover'){
   const accent=kids[1]?.textContent;if((tag==='mover'||tag==='munder')&&accent&&/^[¯‾ˉ]$/.test(accent))return `<m:bar><m:barPr><m:pos m:val="${tag==='munder'?'bot':'top'}"/></m:barPr>${args('e')}</m:bar>`;
   if(tag==='mover'&&accent&&(/^true$/.test(node.getAttribute('accent')??'')||/^[ˆ^→˙¨~˜]$/.test(accent)))return `<m:acc><m:accPr><m:chr m:val="${xml(accent)}"/></m:accPr>${args('e')}</m:acc>`;
   const limit=(side:string,base:string,mark:string)=>`<m:lim${side}><m:e>${base}</m:e><m:lim>${mark}</m:lim></m:lim${side}>`;
   return tag==='munderover'?limit('Upp',limit('Low',part(0),part(1)),part(2)):limit(tag==='mover'?'Upp':'Low',part(0),part(1));
  }
  if(tag==='mtable')return `<m:m>${kids.map(row=>`<m:mr>${Array.from(row.children).map(cell=>`<m:e>${equation(cell)}</m:e>`).join('')}</m:mr>`).join('')}</m:m>`;
  if(tag==='mrow'&&kids.length>=3&&kids[0].localName==='mo'&&kids.at(-1)?.localName==='mo'){
   const first=kids[0].textContent??'',last=kids.at(-1)?.textContent??'';
   if(['()','[]','{}','||','‖‖','⌊⌋','⌈⌉'].includes(first+last))return `<m:d><m:dPr><m:begChr m:val="${xml(first)}"/><m:endChr m:val="${xml(last)}"/></m:dPr><m:e>${kids.slice(1,-1).map(equation).join('')}</m:e></m:d>`;
  }
  if(tag==='mrow'&&kids[0]?.getAttribute('fence')==='true'&&kids[1]?.localName==='mtable')return `<m:d><m:dPr><m:begChr m:val="${xml(kids[0].textContent)}"/><m:endChr m:val=""/></m:dPr><m:e>${kids.slice(1).map(equation).join('')}</m:e></m:d>`;
  if(kids.length)return kids.map(equation).join('');
  const variant=node.getAttribute('mathvariant')??'',script=variant.includes('double-struck')?'double-struck':variant.includes('fraktur')?'fraktur':variant.includes('script')?'script':variant.includes('sans-serif')?'sans-serif':variant.includes('monospace')?'monospace':'';
  const normal=tag==='mtext'||variant==='normal',mathStyle=normal?'<m:nor/>':(script?`<m:scr m:val="${script}"/>`:'')+(variant.includes('bold')?`<m:sty m:val="${variant.includes('italic')?'bi':'b'}"/>`:'');
  const cjk=/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(node.textContent??'');
  return `<m:r>${mathStyle?'<m:rPr>'+mathStyle+'</m:rPr>':''}${cjk?'<w:rPr>'+fonts(east,east)+'</w:rPr>':''}<m:t xml:space="preserve">${xml(tag==='mspace'?' ':node.textContent)}</m:t></m:r>`;
 }
 const skip='[hidden],script,style,button,audio,.screen-answer,.screen-media,.question-feedback,.source-citation,.answer-provenance,.word-bank-question,.shared-code-options,.continuation-label,.card-registration,.card-area-watermark,.university-card-footer';
 const numeric=(element:Element,property:string,otherwise:number)=>parseFloat((element as HTMLElement).style?.getPropertyValue(property))||otherwise;
 function inline(node:Node,props=''):string{
  if(node.nodeType===3)return run((node.textContent??'').replace(/[\t\r\n ]+/g,' '),props);
  if(node.nodeType!==1)return '';const el=node as Element,tag=el.localName;
  if(el.matches(skip))return '';
  if(el.matches('.katex')){
   const math=el.querySelector('math'),root=math?.querySelector('semantics > mrow:only-of-type');
   const under=root?.firstElementChild,base=under?.firstElementChild;
   if(root?.childElementCount===1&&under?.localName==='munder'&&under.getAttribute('accentunder')==='true'&&base&&!base.querySelector(':not(mrow,mtext,mspace)')&&base.querySelector('mtext')&&under.lastElementChild?.textContent==='‾')return run('　'+base.textContent+'　',props+val('u','single'));
   return math?'<m:oMath>'+equation(math)+'</m:oMath>':run(el.textContent??'',props);
  }
  if(el.matches('.paper-blank-line,.candidate-field-line,.blank-input,.exam-header-field i,.school-card-field i,.integrity-signatures i,.card-blank-question i,.boxed-card-blank i,.essay-card-blanks i'))return fill(el.matches('.paper-blank-line')?numeric(el,'--blank-length',10)*1.7:el.closest('.exam-header-field')?Math.max(18,numeric(el.parentElement!,'--header-blank',15)*1.7):el.matches('input')?numeric(el,'width',8)*2:24);
  if(el.matches('.filled-bubble'))return run('■',props);
  if(el.matches('.bubble'))return run(' ['+(el.textContent??'')+']',props);
  if(tag==='pre')return br+(el.textContent??'').split('\n').map(line=>run(line,props+fonts('Consolas',east))).join(br)+br;
  if(tag==='figure'){const img=el.querySelector('img'),caption=el.querySelector('figcaption');return (img?br+drawing(img):'')+(caption?br+inline(caption):'')+br;}
  if(tag==='img')return drawing(el);if(tag==='br')return br;if(tag==='input'||tag==='textarea')return '';
  const extra=tag==='b'||tag==='strong'?'<w:b/>':tag==='em'||tag==='i'?'<w:i/>':tag==='code'?fonts('Consolas',east):tag==='sup'||tag==='sub'?val('vertAlign',tag==='sup'?'superscript':'subscript'):'';
  const titleSize=el.matches('.exam-title-line')?numeric(el,'font-size',0):0;
  const content=Array.from(el.childNodes).map(child=>inline(child,props+extra+(titleSize?val('sz',Math.round(titleSize*2)):''))).join('');
  if(el.matches('.exam-title-line'))return (el.previousElementSibling?br:'')+content;
  return content;
 }
 const ruled=(count:number,rule:boolean,height=6.8)=>{
  const border=(side:string)=>`<w:${side} w:val="single" w:sz="4" w:space="1" w:color="999999"/>`;
  const props=(rule?'<w:pBdr>'+border('bottom')+border('between')+'</w:pBdr>':'')+`<w:spacing w:before="0" w:after="0" w:line="${mm(height)}" w:lineRule="atLeast"/>`;
  return Array.from({length:count},()=>para('','Normal',props)).join('');
 };
 const blockSelector='article,header,section,aside,div,h1,h2,h3,p,table,ol,figure,figcaption,pre,textarea';
 function flow(parent:Element|DocumentFragment,id='Normal'):string{
  const paragraphs:string[]=[];let buffer='';const flush=()=>{if(buffer)paragraphs.push(para(buffer,id));buffer='';};
  for(const node of Array.from(parent.childNodes)){
   if(node.nodeType===1&&(node as Element).matches(blockSelector)){flush();paragraphs.push(block(node as HTMLElement));}
   else if(node.nodeType!==3||node.textContent?.trim()||buffer)buffer+=inline(node);
  }flush();return paragraphs.join('');
 }
 function identityGrid(el:Element,available:number){
  const digits=el.querySelector('.id-writing')?.childElementCount??0;if(!digits)return '';
  const gridCell=(text:string)=>para(run(text,val('sz',15)),'Cell','<w:spacing w:before="0" w:after="0" w:line="175" w:lineRule="atLeast"/>');
  const rows=[Array<string>(digits).fill(gridCell('　')),...Array.from({length:10},(_,index)=>Array.from({length:digits},()=>gridCell(String(index))))];
  return para(run(el.getAttribute('data-card-id-type')??''),'Small','<w:keepNext/>')+table(rows,Math.min(available,mm(digits*5.5)),true);
 }
 let questionList=0,nextQuestion=0,questionPattern=-1;
 function block(el:HTMLElement):string{
  const is=(selector:string)=>el.matches(selector),children=Array.from(el.children),text=el.textContent??'';
  if(is(skip))return '';
  if(is('.cet-writing-cover[data-break-before="true"],.answer-card-page[data-break-before="true"]'))pendingBreak=true;
  if(is('h1,h2,h3'))return para(children.length&&is('.card-part,.cet-writing-lead h2')?children.map(child=>inline(child)).join(run('　')):inline(el),is('h1')?'Title':is('h2')?'Heading1':'Heading2',el.closest('header')&&!is('h1')?alignment(alignTitle):'');
  if(is('.question-heading')){
   const label=el.querySelector('.question-number'),raw=label?.textContent??'',number=/^\d+\.$|^\(\d+\)$|^（\d+）$/.test(raw)?raw.match(/\d+/):null,auto=number&&!el.querySelector('.inline-section-label')&&!el.classList.contains('score-before');
   let list='';if(auto){const value=Number(number[0]),pattern=raw.startsWith('(')?2:raw.startsWith('（')?3:0;if(value!==nextQuestion||pattern!==questionPattern||!questionList)questionList=numList(pattern,value);nextQuestion=value+1;questionPattern=pattern;list=numbering(questionList);}
   const pieces=children.filter(child=>(!auto||child!==label)&&!(child.matches('.question-points')&&el.closest('.listening-question')));
   const next=el.nextElementSibling,keep=next&&!next.matches(skip)&&next.matches('.paper-options,figure,.answer-text')?'<w:keepNext/>':'';
   return para(pieces.map(child=>inline(child)).filter(Boolean).join(run(' ')),'Question',keep+list);
  }
  if(is('.paper-options')){
   const count=Math.min(children.length,numeric(el,'--option-columns',1)),slot=bodyWidth/count;
   if(count>1&&children.every(option=>!option.querySelector('img,pre,br,.katex')&&Array.from(option.textContent??'').reduce((units,char)=>units+(/[\x00-\x7f]/.test(char)?.58:1),3)*layout.fontSize*20<slot)){
    const stops='<w:tabs>'+Array.from({length:count-1},(_,index)=>`<w:tab w:val="left" w:pos="${Math.round((index+1)*slot)}"/>`).join('')+'</w:tabs>';let result='';
    for(let index=0;index<children.length;index+=count)result+=para(children.slice(index,index+count).map(option=>Array.from(option.children).filter(child=>child.localName!=='input').map(child=>inline(child)).join(run('. '))).join('<w:r><w:tab/></w:r>'),'Normal',stops+spacing(0,35));return result;
   }
   const list=numList(1);return children.map((option,index)=>{
   const label=option.querySelector('.option-letter'),letter=label?.textContent??'',useList=letter===String.fromCharCode(65+index)&&!!label?.nextElementSibling;
   return para((useList?'':run(letter+(label?.nextElementSibling?'. ':'')))+Array.from(option.children).filter(child=>child!==label).map(child=>inline(child)).join(''),'Option',useList?numbering(list):'');
  }).join('');}
  if(is('ol')){const list=numList(0);return children.map(child=>para(inline(child),'Normal',numbering(list))).join('');}
  if(is('table')){const rows=Array.from(el.querySelectorAll('tr'),row=>Array.from(row.children,cell=>para(inline(cell),'Cell'))),caption=el.querySelector('caption');return (caption?.textContent?para(inline(caption),'Small'):'')+table(rows,bodyWidth,true,mm(6));}
  if(is('figure')){const img=el.querySelector('img'),caption=el.querySelector('figcaption');return (img?para(drawing(img),'Normal',alignment('center')):'')+(caption?para(inline(caption),'Small',alignment('center')):'');}
  if(is('.candidate-identity')&&children.length>1&&children.every(child=>child.matches('.candidate-field:not(.candidate-field-number)'))&&bodyWidth>mm(110)){
   const rows:string[][]=[];for(let index=0;index<children.length;index+=2)rows.push(children.slice(index,index+2).map(child=>para(inline(child),'Normal',spacing(0,55))));return table(rows,bodyWidth,false);
  }
  if(is('.candidate-field')){const cells=el.querySelector('.candidate-number-cells'),label=inline(el.querySelector('.candidate-field-label')!);return cells?para(label,'Small','<w:keepNext/>')+table([Array<string>(cells.childElementCount).fill('')],Math.min(bodyWidth,mm(cells.childElementCount*5.5)),true,mm(6)):para(label+fill(is('.candidate-field-wide')?32:24),'Normal',spacing(0,50));}
  if(is('.exam-header-row'))return para(children.map(child=>inline(child)).join(run('　　')),'Normal',alignment(el.style.textAlign||'left'));
  if(is('.card-id-grid'))return identityGrid(el,bodyWidth);
  if(is('.card-candidate')){
   const fields=Array.from(el.querySelectorAll('.candidate-field'),field=>para(inline(field),'Small',spacing(0,60))).join(''),grid=el.querySelector('.card-id-grid')!,barcode=el.querySelector('.card-barcode'),notes=el.querySelector('.card-fill-example,.cet-reading-fill');
   const instructions=notes?para(Array.from(notes.children).map(child=>child.localName==='b'?run(child.textContent??'','<w:b/>'):inline(child)).join(br),'Small'):'',box=barcode?table([[para(inline(barcode.children[0])+br+inline(barcode.children[1]),'Cell')]],bodyWidth*.44,true,mm(16)):'';
   return table([[fields+instructions+box,identityGrid(grid,bodyWidth*.47)]],bodyWidth,false,0,[1,1]);
  }
  if(is('.essay-character-grid'))return table(children.map(row=>Array.from(row.children,cell=>para(run(cell.textContent??'',val('sz',14)),'Cell'))),bodyWidth,true,mm(6));
  if(is('.card-ruled-area')){const start=el.querySelector('.card-writing-start');return (start?para(inline(start),'Small'):'')+ruled(el.closest('.cet-translation-card')?26:is('.cet-writing-continuation')?10:14,true);}
  if(is('textarea')){const height=numeric(el,'height',0),rows=Number(el.getAttribute('rows'))||1;return height?table([['']],bodyWidth,true,mm(height)):ruled(rows,!is('.unruled-answer'));}
  if(is('.boxed-card-area,.card-response-area,.university-blank-area,.essay-card-ruled')){
   const height=numeric(el,'height',is('.university-blank-area')?64:35),lines=numeric(el,'--answer-lines',Math.max(1,Math.round(height/7)));
   return el.closest('.card-response-ruled')||is('.essay-card-ruled')?ruled(lines,true):table([['']],bodyWidth,true,mm(height));
  }
  if(is('.card-barcode,.school-card-barcode,.cet-cover-barcode'))return table([[para(is('.card-barcode')?children.map(child=>inline(child)).join(br):inline(el),'Cell')]],Math.min(bodyWidth,mm(64)),true,mm(16));
  if(is('.card-objective-grid,.cet-listening-grid,.cet-detail-grid')){
   const groups=children.filter(child=>child.matches('.card-objective-column,.cet-choice-column')),heading=el.querySelector(':scope > b');let result=heading?para(inline(heading),'Heading2'):'';
   const capacity=Math.max(1,Math.min(3,Math.floor(bodyWidth/mm(43))));for(let offset=0;offset<groups.length;offset+=capacity){const group=groups.slice(offset,offset+capacity);result+=table(Array.from({length:Math.max(...group.map(column=>column.childElementCount))},(_,index)=>group.map(column=>column.children[index]?para(inline(column.children[index]),'Small'):'')),bodyWidth,false);}
   return result;
  }
  if(is('.question-row-grid')&&children.length>1&&bodyWidth>mm(115)&&!el.querySelector('img,textarea:not(.screen-answer),.paper-options:not(.screen-answer)'))return table([children.map(child=>block(child as HTMLElement))],bodyWidth,false);
  if(is('.worked-response-options'))return children.map(child=>para(inline(child),'Option')).join('');
  if(is('.score-box'))return para(run(text+'：')+fill(8),'Small',alignment('right'));
  if(is('pre'))return para(text.split('\n').map(line=>run(line,fonts('Consolas',east))).join(br));
  if(is('.exam-meta,.card-response-question,.section-stimulus,article,aside,section,header'))return flow(el);
  if(is('p,.answer-text,.card-section-title,.card-bottom-code,figcaption'))return para(inline(el),is('.answer-text')?'Answer':is('.card-section-title')?'Heading2':is('.card-bottom-code,figcaption')?'Small':el.closest('.exam-heading')?'Meta':'Normal',is('.paper-end')?alignment('center'):'');
  return flow(el);
 }
 const relations=[relItem('styles','styles','styles.xml'),relItem('numbers','numbering','numbering.xml'),relItem('footer','footer','footer.xml'),...mediaRels];
 const overrides:Record<string,string>={document:'document.main',styles:'styles',numbering:'numbering',footer:'footer'};
 if(fontDefs.length){relations.push(relItem('fonts','fontTable','fontTable.xml'));overrides.fontTable='fontTable';}
 const field=(instruction:string)=>`<w:fldSimple w:instr=" ${instruction} ">${run('1')}</w:fldSimple>`;
 const fieldText=(value:string)=>value.split(/(\{page\}|\{pages\}|\{title\})/g).map(token=>token==='{page}'?field('PAGE'):token==='{pages}'?field('NUMPAGES'):run(token==='{title}'?data.title:token)).join('');
 const footer=fieldText(data.paperKind==='answer-card'?'{page} / {pages}':design.footerTemplate??'{page} / {pages}');
 const mark=design.projectMark!==false,footerText=para(footer,'Small',alignment('center'))+(mark?para(`<w:hyperlink r:id="project">${run('BurntRoses / paper-notebook-practice',val('color','666666')+val('sz',14))}</w:hyperlink>`,'Small',alignment('right')):'');
 put('word/footer.xml',`<w:ftr xmlns:w="${word}" xmlns:r="${rel}">${footerText}</w:ftr>`);
 if(mark)put('word/_rels/footer.xml.rels',rels([relItem('project','hyperlink','https://github.com/BurntRoses/paper-notebook-practice',true)]));
 let headerRefs='',footerRefs='<w:footerReference w:type="default" r:id="footer"/>';const running=data.paperKind==='answer-card'?undefined:design.runningHeader,watermark=data.paperKind==='answer-card'?undefined:design.watermark?.text;
 if(running||watermark){
  const addHeader=(kind:string,labels?:{left?:string;center?:string;right?:string})=>{
   const name='header'+kind,tab='<w:r><w:tab/></w:r>',stops=`<w:tabs><w:tab w:val="center" w:pos="${Math.round(width/2)}"/><w:tab w:val="right" w:pos="${width}"/></w:tabs>`;
   const border=labels&&running?.rule?'<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="777777"/></w:pBdr>':'';
   put('word/'+name+'.xml',`<w:hdr xmlns:w="${word}">${para((labels?[labels.left,labels.center,labels.right].map(value=>fieldText(value??'')).join(tab):'')+(watermark?run(watermark):''),'Small',border+stops)}</w:hdr>`);overrides[name]='header';relations.push(relItem(name,'header',name+'.xml'));headerRefs+=`<w:headerReference w:type="${kind}" r:id="${name}"/>`;
   if(kind!=='default')footerRefs+=`<w:footerReference w:type="${kind}" r:id="footer"/>`;
  };
  addHeader('default',running);if(running?.even)addHeader('even',running.even);if(running?.skipFirst)addHeader('first');
 }
 put('word/settings.xml',`<w:settings xmlns:w="${word}">${running?.even?'<w:evenAndOddHeaders/>':''}<w:updateFields w:val="true"/></w:settings>`);overrides.settings='settings';relations.push(relItem('settings','settings','settings.xml'));
 const sect=(count:number,continuous=false)=>`<w:sectPr>${headerRefs}${footerRefs}${continuous?val('type','continuous'):''}<w:pgSz w:w="${mm(geometry.widthMm)}" w:h="${mm(geometry.heightMm)}"${geometry.widthMm>geometry.heightMm?' w:orient="landscape"':''}/><w:pgMar w:top="${mm(layout.marginTopMm)}" w:right="${mm(layout.marginRightMm)}" w:bottom="${mm(layout.marginBottomMm)}" w:left="${mm(layout.marginLeftMm)}" w:header="${mm(Math.min(5,layout.marginTopMm/4))}" w:footer="${mm(Math.min(5,layout.marginBottomMm/4))}" w:gutter="0"/><w:cols w:num="${count}" w:space="${mm(8)}"/>${running?.skipFirst?'<w:titlePg/>':''}</w:sectPr>`;
 let body='',split=false;for(const element of Array.from(template.children)){if(columns>1&&!split&&element.matches('section[data-section]')&&body){body+='<w:p><w:pPr>'+sect(1)+'</w:pPr></w:p>';split=true;}body+=block(element as HTMLElement);}
 put('word/document.xml',`<w:document xmlns:w="${word}" xmlns:r="${rel}" xmlns:m="${office}/math" ${drawingNS}><w:body>${body}${sect(columns,split)}</w:body></w:document>`);
 const abstract=(id:number,format:string,indent:number,pattern='%1.')=>`<w:abstractNum w:abstractNumId="${id}">${val('multiLevelType','singleLevel')}<w:lvl w:ilvl="0">${val('start',1)}${val('numFmt',format)}${val('suff','tab')}${val('lvlText',pattern)}${val('lvlJc','left')}<w:pPr><w:tabs><w:tab w:val="num" w:pos="${indent}"/></w:tabs><w:ind w:left="${indent}" w:hanging="320"/></w:pPr></w:lvl></w:abstractNum>`;
 put('word/numbering.xml',`<w:numbering xmlns:w="${word}">${abstract(0,'decimal',360)}${abstract(1,'upperLetter',640)}${abstract(2,'decimal',400,'(%1)')}${abstract(3,'decimal',540,'（%1）')}${numDefs.join('')}</w:numbering>`);
 put('_rels/.rels',rels([relItem('document','officeDocument','word/document.xml')]));put('word/_rels/document.xml.rels',rels(relations));
 put('[Content_Types].xml',`<Types xmlns="${pack}/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="odttf" ContentType="application/vnd.openxmlformats-officedocument.obfuscatedFont"/><Default Extension="txt" ContentType="text/plain"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/>${Object.entries(overrides).map(([name,type])=>`<Override PartName="/word/${name}.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.${type}+xml"/>`).join('')}</Types>`);
 const title=data.title.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'').slice(0,120),tag=data.paperKind==='answers'?'答案卷':data.paperKind==='answer-card'?'答题卡':'试卷';
 return {name:`《${title}》-${tag}.docx`,mime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',bytes:archive(files),pages:null};
}
