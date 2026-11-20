import type {PracticeDocument,PracticePresentation} from './model';

export type PaperLocale=NonNullable<PracticePresentation['language']>|'zh-HK';

export function paperLocale(paper:Pick<PracticeDocument,'authoring'|'presentation'>,defaultLanguage:NonNullable<PracticePresentation['language']>='zh'):PaperLocale {
 const language=paper.presentation?.language??defaultLanguage;
 return language==='zh'&&paper.authoring?.region==='中国香港'?'zh-HK':language;
}

export const paperLabels={
 zh:{name:'姓名',candidate:'准考证号',time:'考试时间',practiceTime:'建议练习',minute:'分钟',total:'满分',weighted:'练习权重',point:'分',notices:'注意事项',score:'得分',criteria:'评分要点',basis:'答案依据',verification:'来源与核验',official:'官方发布',thirdParty:'第三方参考',independent:'独立解答',source:'参考资料',page:'第 {page} 页，共 {pages} 页'},
 'zh-HK':{name:'姓名',candidate:'考生編號',time:'作答時間',practiceTime:'建議練習',minute:'分鐘',total:'滿分',weighted:'練習權重',point:'分',notices:'注意事項',score:'得分',criteria:'評分要點',basis:'答案依據',verification:'來源與核對',official:'官方發布',thirdParty:'第三方參考',independent:'獨立解答',source:'參考資料',page:'第 {page} 頁，共 {pages} 頁'},
 en:{name:'Name',candidate:'Candidate number',time:'Time allowed',practiceTime:'Practice time',minute:'minutes',total:'Total',weighted:'Practice score',point:'points',notices:'Instructions to candidates',score:'Score',criteria:'Marking criteria',basis:'Answer basis',verification:'Sources and verification',official:'Official publication',thirdParty:'Third-party reference',independent:'Independent solution',source:'Source material',page:'Page {page} of {pages}'},
 ja:{name:'氏名',candidate:'受験番号',time:'試験時間',practiceTime:'練習時間の目安',minute:'分',total:'配点',weighted:'練習の配点',point:'点',notices:'注意事項',score:'得点',criteria:'採点基準',basis:'解答の根拠',verification:'出典と確認',official:'公式発表',thirdParty:'第三者の資料',independent:'独自解答',source:'資料',page:'{page} / {pages} ページ'},
 ko:{name:'성명',candidate:'수험번호',time:'시험 시간',practiceTime:'권장 연습 시간',minute:'분',total:'총점',weighted:'연습 배점',point:'점',notices:'유의 사항',score:'점수',criteria:'채점 기준',basis:'정답 근거',verification:'출처 및 검토',official:'공식 발표',thirdParty:'외부 참고 자료',independent:'독립 풀이',source:'참고 자료',page:'{page} / {pages} 쪽'},
 fr:{name:'Nom',candidate:'Numéro de candidat',time:'Durée',practiceTime:'Durée conseillée',minute:'minutes',total:'Total',weighted:'Barème indicatif',point:'points',notices:'Consignes',score:'Note',criteria:"Critères d’évaluation",basis:'Justification du corrigé',verification:'Sources et vérification',official:'Publication officielle',thirdParty:'Référence externe',independent:'Corrigé indépendant',source:'Document source',page:'Page {page} sur {pages}'},
 de:{name:'Name',candidate:'Teilnehmernummer',time:'Bearbeitungszeit',practiceTime:'Empfohlene Übungszeit',minute:'Minuten',total:'Gesamtpunktzahl',weighted:'Übungspunkte',point:'Punkte',notices:'Hinweise',score:'Punktzahl',criteria:'Bewertungskriterien',basis:'Grundlage der Lösung',verification:'Quellen und Prüfung',official:'Offizielle Veröffentlichung',thirdParty:'Externe Referenz',independent:'Eigenständige Lösung',source:'Quellenmaterial',page:'Seite {page} von {pages}'},
} as const;

export function paperInfoLine(locale:PaperLocale,minutes:number,points:number,practiceTime=false,weighted=false){
 const l=paperLabels[locale];
 return (practiceTime?l.practiceTime:l.time)+' · '+minutes+' '+l.minute+'　'+(weighted?l.weighted:l.total)+' · '+points+' '+l.point;
}

export function paperSectionDetail(locale:PaperLocale,count:number,total:number,each?:number){
 const point=paperLabels[locale].point;
 switch(locale){
  case 'zh':return '共 '+count+' 小题，'+(each===undefined?'':'每小题 '+each+' 分，')+'共 '+total+' 分';
  case 'zh-HK':return '共 '+count+' 小題，'+(each===undefined?'':'每題 '+each+' 分，')+'共 '+total+' 分';
  case 'ja':return count+' 問・'+total+' 点';
  case 'ko':return count+' 문항 · '+total+' 점';
  case 'de':return count+(count===1?' Aufgabe':' Aufgaben')+' · '+total+' '+point;
  case 'fr':
  case 'en':return count+(count===1?' question':' questions')+' · '+total+' '+point;
 }
}
