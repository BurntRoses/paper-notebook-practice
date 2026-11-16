import type {PracticeDocument,PracticePresentation} from './model';
import {paperGeometry,resolvePaperTemplate} from './templates';

/** Omitted and `source` choices retain the uploaded paper's measured layout. */
export interface PaperCustomization {
 /** A small linked project credit, independent of the source paper's watermark. */
 projectMark?:boolean;
 watermark?:'source'|'none'|'custom';
 watermarkText?:string;
 integrity?:'source'|'none'|'standard'|'custom';
 integrityText?:string;
 courseCode?:string;
 institution?:string;
 security?:'source'|'none'|'custom';
 securityText?:string;
 candidateFields?:'source'|'standard'|'none';
 binding?:'source'|'binding'|'none';
 scoreTable?:'source'|'show'|'hide';
 paperSize?:'source'|'A4'|'A3';
 /** Printing changes color reproduction without replacing the source content. */
 printColor?:'source'|'color'|'grayscale';
 /** Authoring requirements, never candidate-facing paper text. */
 notes?:string;
}

export function applyPaperCustomization(paper:PracticeDocument,settings:PaperCustomization):PracticeDocument {
 const copy=structuredClone(paper),before=JSON.stringify({style:copy.style,presentation:copy.presentation});
 const layout=resolvePaperTemplate(copy.style).layout;
 const language=copy.presentation?.language??(['ielts','language'].includes(layout.headerVariant)?'en':'zh'),english=language!=='zh';
 const present=()=>copy.presentation??=( {sourceLayout:false} );
 const set=<K extends keyof PracticePresentation>(key:K,value:PracticePresentation[K])=>{
  if(JSON.stringify(copy.presentation?.[key])!==JSON.stringify(value))present()[key]=value;
 };
 const remove=(key:keyof PracticePresentation)=>{if(copy.presentation)delete copy.presentation[key];};
 const customText=(value:string|undefined,label:string)=>{if(!value?.trim())throw Error(`${label} requires nonblank text`);return value.trim();};
 if(settings.projectMark!==undefined&&settings.projectMark!==(copy.presentation?.projectMark??true))set('projectMark',settings.projectMark);
 if(settings.watermark==='none')remove('watermark');
 if(settings.watermark==='custom')set('watermark',{...copy.presentation?.watermark,text:customText(settings.watermarkText,'Custom watermark')});
 if(settings.integrity==='none')remove('integrityPledge');
 if(settings.integrity==='standard'||settings.integrity==='custom')set('integrityPledge',{
  title:english?'Candidate integrity pledge':'考生诚信承诺',
  text:settings.integrity==='custom'?customText(settings.integrityText,'Custom integrity pledge'):english?'I have read the examination rules and agree to follow them, complete this paper independently, and provide accurate candidate information.':'本人已阅读考场规则，承诺遵守考试纪律，独立完成答卷，所填信息真实准确。',
  signatureLabel:english?'Candidate signature':'考生签名',dateLabel:english?'Date':'日期'
 });
 if(settings.institution?.trim())set('institution',settings.institution.trim());
 if(settings.courseCode?.trim())set('courseCode',settings.courseCode.trim());
 if(settings.security==='none')remove('securityLine');
 if(settings.security==='custom')set('securityLine',{
  ...(copy.presentation?.securityLine??{leftMm:layout.marginLeftMm,topMm:Math.max(4,layout.marginTopMm-8),fontSizePt:12}),
  text:customText(settings.securityText,'Custom security line')
 });
 if(settings.candidateFields==='none'){
  if(!copy.presentation||copy.presentation.candidateFields?.length!==0)set('candidateFields',[]);
 }
 if(settings.candidateFields==='standard'){
  const fields=({zh:['姓名：________　班级：________','学号：________　考场：____　座号：____'],en:['Candidate name: ________________________','Candidate number: ______________________'],ja:['氏名：________________','受験番号：________________'],ko:['이름: ________________','수험번호: ________________'],fr:['Nom: ________________','Numéro de candidat: ________________'],de:['Name: ________________','Prüfungsnummer: ________________']} as const)[language].slice();
  // Generic papers already render these fields without a presentation override.
  if(copy.presentation?.sourceLayout!==false&&copy.presentation)set('candidateFields',fields);
  else if(copy.presentation?.candidateFields)set('candidateFields',fields);
 }
 if(settings.binding==='binding'||settings.binding==='none'){
  const desired=settings.binding==='binding'?'binding':'none';
  const current=copy.presentation?.sealStyle??(layout.showSeal?'candidate':'none');
  if(current!==desired)set('sealStyle',desired);
  if(desired==='binding'&&layout.marginLeftMm<19)copy.style.templateOverrides={...copy.style.templateOverrides,marginLeftMm:19};
 }
 if(settings.scoreTable==='show'||settings.scoreTable==='hide'){
  const show=settings.scoreTable==='show';
  if(Boolean(copy.presentation?.scoreTable)!==show)set('scoreTable',show);
 }
 if(settings.paperSize==='A4'||settings.paperSize==='A3'){
  const geometry=paperGeometry(layout),short=settings.paperSize==='A3'?297:210,long=settings.paperSize==='A3'?420:297;
  const widthMm=layout.orientation==='landscape'?long:short,heightMm=layout.orientation==='landscape'?short:long;
  if(geometry.widthMm!==widthMm||geometry.heightMm!==heightMm)copy.style.templateOverrides={...copy.style.templateOverrides,paperSize:settings.paperSize,widthMm,heightMm};
 }
 if(JSON.stringify({style:copy.style,presentation:copy.presentation})!==before)delete copy.original;
 if(settings.printColor==='color'||settings.printColor==='grayscale')set('printColor',settings.printColor);
 return copy;
}
