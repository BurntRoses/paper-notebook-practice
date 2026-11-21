import type {PracticeDocument,PracticePresentation} from './model';
import {resolvePaperTemplate} from './templates';
import {EXAM_SPECIFICATIONS} from './exam-specification';
import {paperInfoLine,paperLabels,paperLocale} from './paper-labels';

const bounded=(value:number|undefined,min:number,max:number,fallback:number)=>Math.min(max,Math.max(min,value??fallback));

/** Catalog papers share the HTML renderer and retain the material's own page design. */
export function catalogPaper(paper:PracticeDocument):PracticeDocument {
 const copy=structuredClone(paper);
 delete copy.original;
 const presentation=copy.presentation??={};
 const layout=resolvePaperTemplate(copy.style).layout;
 presentation.language??=['ielts','language'].includes(layout.headerVariant)?'en':'zh';
 presentation.sourceLayout=true;
 if(!presentation.titleLines?.length)presentation.titleLines=[copy.title];
 const printPageCount=presentation.sourcePageCount;
 // Output pagination follows the editable HTML, even if the source had a fixed folio.
 delete presentation.sourcePageNumbers;
 delete presentation.sourcePageCount;
 if(presentation.footerTemplate&&printPageCount){
  presentation.footerTemplate=presentation.footerTemplate.replace(/共\s*\d+\s*页/g,'共{pages}页');
 }
 if(presentation.metaLines){
  presentation.metaLines=presentation.metaLines.map(line=>line.replace(/共\s*\d+\s*页[，,、\s]*/g,''));
 }
 const specification=copy.exam?.specification??EXAM_SPECIFICATIONS.find(item=>item.id===copy.exam?.specificationId);
 const practiceTime=specification?.durationMinutes===null||copy.generation?.intent==='generate'&&copy.exam?.scope!=='full';
 if(!presentation.metaLines?.length&&copy.generation?.intent==='generate'){
  presentation.metaLines=[paperInfoLine(paperLocale(copy),copy.durationMinutes,copy.totalScore,practiceTime,copy.exam?.scoreScale==='practice-weighted-100')];
 }
 const locale=paperLabels[paperLocale(copy)];
 presentation.candidateFields??=[locale.name+'：________________',locale.candidate+'：________________'];
 if(presentation.headerStyle==='neea-math-2024'){
  presentation.titleLines=['数　学'];
  presentation.titleSizePt=27;
  presentation.titleGapMm=8;
  // The published paper uses a compact single-column text block with a subject-only heading.
  copy.style.templateOverrides={...copy.style.templateOverrides,marginTopMm:13,marginBottomMm:12,
   marginLeftMm:8,marginRightMm:8,fontSize:12.75,lineHeight:1.55};
  copy.style.fontSize=12.75;
  presentation.sectionSizePt=12;
  if(copy.exam?.scope==='subset'){
   for(const section of copy.sections)for(const question of section.questions){
    delete question.gapBeforeMm;
    delete question.gapAfterMm;
   }
  }
 }
 if(presentation.headerStyle==='guangdong-2024'){
  presentation.titleLineSizesPt=[18,18];
  presentation.titleGapMm=2;
  presentation.questionGapMm=2.5;
  copy.style.templateOverrides={...copy.style.templateOverrides,marginTopMm:20,marginBottomMm:18,
   marginLeftMm:27,marginRightMm:25,fontSize:11.25,lineHeight:1.5};
  copy.style.fontSize=11.25;
 }
 if(copy.style.templateId==='cambridge-igcse-math'){
  presentation.headerStyle='igcse-maths-practice';
  presentation.titleLines=['Cambridge IGCSE Mathematics'];
  presentation.candidateFields=['Name: ____________________','Candidate number: ____________________'];
  presentation.headerRows=[{cells:['MATHEMATICS','0580/02 · Paper 2 style']},{cells:['Non-calculator practice','Original practice questions']}];
  presentation.headerRule=true;
 }
 if(copy.style.templateId==='cambridge-art'){
  presentation.headerStyle='igcse-art-practice';
  presentation.titleLines=['Art & Design'];
  presentation.headerRows=[{cells:['Externally Set Assignment · practice','0400/02 · task format']}];
  presentation.headerRule=true;
 }
 if(copy.style.templateId==='us-civics'){
  presentation.headerStyle='civics-interview';
  presentation.titleLines=['U.S. Naturalization · Civics Practice'];
  presentation.headerRule=true;
 }
 return copy;
}

/** Reflow a paper for reading and printing while retaining its real identity and content. */
export function generatedPaper(paper:PracticeDocument):PracticeDocument {
 const copy=structuredClone(paper);
 delete copy.original;
 // The first pass removes source crop geometry; later passes retain the user's design edits.
 if(copy.presentation?.sourceLayout===true||copy.presentation?.headerStyle==='generated')return copy;
 const source=resolvePaperTemplate(copy.style).layout;
 const presentation:PracticePresentation=copy.presentation??{};
 const english=presentation.language==='en'||(!presentation.language&&['ielts','language'].includes(source.headerVariant));
 const securityRow=presentation.headerRows?.find(row=>row.cells.length===1&&/^(绝密|机密).*启用前/.test(row.cells[0]));
 if(securityRow&&!presentation.securityLine){
  presentation.securityLine={text:securityRow.cells[0]};
  presentation.headerRows=presentation.headerRows!.filter(row=>row!==securityRow);
 }
 const school=/初中|高中|中考|高考/.test(copy.level+' '+copy.title);
 const margins={
  marginTopMm:bounded(source.marginTopMm,presentation.securityLine?35:25,35,25),
  marginBottomMm:bounded(source.marginBottomMm,22,30,25),
  marginLeftMm:bounded(source.marginLeftMm,25,source.showSeal?38:30,25),
  marginRightMm:bounded(source.marginRightMm,25,30,25)
 };
 const fontSize=bounded(source.fontSize,10.5,12,11),lineHeight=bounded(source.lineHeight,english?1.45:1.55,1.8,1.6);
 copy.style={...copy.style,fontSize,lineHeight,templateOverrides:{
  ...copy.style.templateOverrides,...margins,fontSize,
  lineHeight,
  fontFamily:english?'times':source.fontFamily,
  ...(english&&source.headerVariant==='standard'?{headerVariant:'language' as const}:{}),
  // Cropped handbook pages are not a useful physical size for a newly reflowed paper.
  ...(source.widthMm&&source.widthMm<205?{widthMm:210,heightMm:297,paperSize:'A4' as const,orientation:'portrait' as const}:{})
 }};
 const printedTitle=presentation.titleLines?.filter(line=>line.trim());
 if(!printedTitle?.length||printedTitle.every(line=>line.replace(/\s/g,'')===copy.subject.replace(/\s/g,''))){
  const parts=copy.title.split('·');
  presentation.titleLines=parts.length===2&&parts[1].trim()===copy.subject?[parts[0],copy.subject]:[copy.title];
 }else presentation.titleLines=printedTitle;
 presentation.sourceLayout=true;
 // Source-specific CSS includes absolute crop offsets and fixed historical answer boxes.
 presentation.headerStyle='generated';
 delete presentation.sourcePageNumbers;
 delete presentation.sourcePageCount;
 presentation.titleSizePt=bounded(presentation.titleSizePt,16,20,english?18:17);
 presentation.titleLineSizesPt=presentation.titleLines.map((line,i)=>{
  const subjectLine=i>0&&line.replace(/\s/g,'')===copy.subject.replace(/\s/g,'');
  return subjectLine?20:bounded(presentation.titleLineSizesPt?.[i],16,line.length>34?16:20,presentation.titleSizePt!);
 });
 presentation.titleGapMm=bounded(presentation.titleGapMm,1,4,2);
 presentation.sectionSizePt=bounded(presentation.sectionSizePt,fontSize,12,fontSize);
 presentation.questionGapMm=bounded(presentation.questionGapMm,3,6,4);
 if(presentation.metaLines===undefined)presentation.metaLines=[english?`Time allowed: ${copy.durationMinutes} minutes　Total: ${copy.totalScore} points`:`考试时间：${copy.durationMinutes} 分钟　满分：${copy.totalScore} 分`];
 if(presentation.candidateFields===undefined)presentation.candidateFields=english?['Name: ____________________','Candidate No.: ____________________']:['姓名：________________　　准考证号：________________'];
 if(presentation.securityLine){
  presentation.securityLine.leftMm=margins.marginLeftMm;
  presentation.securityLine.topMm=margins.marginTopMm-9;
 }
 // Printed archive totals belong to the source; page totals here follow actual pagination.
 if(presentation.footerTemplate)presentation.footerTemplate=presentation.footerTemplate.replace(/共\s*\d+\s*页/g,'共{pages}页');
 if(presentation.metaLines)presentation.metaLines=presentation.metaLines.map(line=>line.replace(/共\s*\d+\s*页[，,、\s]*/g,''));
 if(presentation.sideLabel?.topMm)presentation.sideLabel.topMm=Math.min(presentation.sideLabel.topMm,180);
 copy.presentation=presentation;
 for(const section of copy.sections){
  delete section.gapBeforeMm;
  // Full listening/reading sections may start on a fresh page; historical crops do not.
  if(!section.examPartId)delete section.breakBefore;
  if(section.questionColumns&&section.questionColumns>1){
   section.questionColumns=1;
   delete section.questionColumnWeights;
  }
  for(const q of section.questions){
   delete q.gapBeforeMm;
   delete q.gapAfterMm;
   delete q.breakBefore;
   delete q.pageBreakBeforeLines;
   if(q.answerBoxMm&&presentation.answerSpace==='none')delete q.answerBoxMm;
   else if(q.answerBoxMm)q.answerBoxMm=bounded(q.answerBoxMm,30,100,45);
   if(school&&q.attachments)for(const attachment of q.attachments){
    if(attachment.widthMm)attachment.widthMm=Math.min(attachment.widthMm,140);
   }
  }
 }
 return copy;
}
