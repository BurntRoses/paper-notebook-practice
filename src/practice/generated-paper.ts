import type {PracticeDocument,PracticePresentation} from './model';
import {resolvePaperTemplate} from './templates';

const bounded=(value:number|undefined,min:number,max:number,fallback:number)=>Math.min(max,Math.max(min,value??fallback));

/** Reflow a paper for reading and printing while retaining its real identity and content. */
export function generatedPaper(paper:PracticeDocument):PracticeDocument {
 const copy=structuredClone(paper);
 delete copy.original;
 // The first pass removes source crop geometry; later passes retain the user's design edits.
 if(copy.presentation?.headerStyle==='generated')return copy;
 const source=resolvePaperTemplate(copy.style).layout;
 const presentation:PracticePresentation=copy.presentation??{};
 const securityRow=presentation.headerRows?.find(row=>row.cells.length===1&&/^(绝密|机密).*启用前/.test(row.cells[0]));
 if(securityRow&&!presentation.securityLine){
  presentation.securityLine={text:securityRow.cells[0]};
  presentation.headerRows=presentation.headerRows!.filter(row=>row!==securityRow);
 }
 const english=presentation.language==='en'||(!presentation.language&&['ielts','language'].includes(source.headerVariant));
 const school=/初中|高中|中考|高考/.test(copy.level+' '+copy.title);
 const margins={
  marginTopMm:bounded(source.marginTopMm,presentation.securityLine?35:25,35,25),
  marginBottomMm:bounded(source.marginBottomMm,22,30,25),
  marginLeftMm:bounded(source.marginLeftMm,25,source.showSeal?38:30,25),
  marginRightMm:bounded(source.marginRightMm,25,30,25)
 };
 const fontSize=bounded(source.fontSize,10.5,12,11);
 copy.style={...copy.style,fontSize,lineHeight:bounded(source.lineHeight,english?1.45:1.55,1.8,1.6),templateOverrides:{
  ...copy.style.templateOverrides,...margins,fontSize,
  lineHeight:bounded(source.lineHeight,english?1.45:1.55,1.8,1.6),
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
