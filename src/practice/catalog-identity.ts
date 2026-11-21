import type {PracticeDocument,PracticePresentation} from './model';
import type {CatalogCategory} from './catalog-categories';

export const regionNames={
 mainland:'中国大陆',hongkong:'中国香港',taiwan:'中国台湾',england:'英格兰',uk:'英国',
 us:'美国',canada:'加拿大',australia:'澳大利亚',japan:'日本',korea:'韩国',france:'法国',
 germany:'德国',dach:'德国／奥地利',international:'国际考试体系',general:'通用',unknown:'地区未核实',
} as const;
export const languageNames={zh:'简体中文','zh-Hant':'繁体中文',en:'英语',ja:'日语',ko:'韩语',fr:'法语',de:'德语',mixed:'中英双语'} as const;
export type CatalogRegion=keyof typeof regionNames;
export type CatalogLanguage=keyof typeof languageNames;
export type PaperLanguage=NonNullable<PracticePresentation['language']>;
export type ResourceKind='paper'|'bank'|'layout';
export type SourceRole='question'|'benchmark'|'scoring';
export type TopicRequest={kind:'topic';id:string;file:string;sha256:string};
export type SourcePaperRequest={kind:'source';id:string};
export type PaperRequest={kind:'case'|'example';id:string}|TopicRequest;
export const resourceNames={paper:'试卷',bank:'题库',layout:'版式'} as const;
export const sourceRoleNames={question:'题目出处',benchmark:'命题与版式依据',scoring:'评分依据'} as const;
export const identityNames={original:'原创练习',adapted:'改编练习',authentic:'真题整理',specimen:'公开样卷整理',layout:'版式示意'} as const;

export const paperEditionLabels={all:'全部',authentic:'真题',original:'原创模拟'} as const;
export type PaperEdition=keyof typeof paperEditionLabels;

export interface CatalogIdentity {
 category:CatalogCategory;
 region:CatalogRegion;
 language:CatalogLanguage;
 paperLanguage:PaperLanguage;
 subject:string;
 grade:string;
 issuer:string;
 year?:number;
 scope:'full'|'subset'|'bank'|'layout'|'unknown';
 identity:keyof typeof identityNames;
 system?:string;
 aliases?:string[];
}
export interface CatalogEntry extends CatalogIdentity {
 id:string;
 title:string;
 kind:ResourceKind;
 request:PaperRequest|SourcePaperRequest|{kind:'template';id:string};
 documentId?:string;
 questionCount?:number;
 sampleId?:string;
 details?:string;
}
export interface CatalogSource {
 role:SourceRole;
 title:string;
 issuer?:string;
 url?:string;
 note?:string;
}

export const scopeNames={full:'完整卷',subset:'样题／节选',bank:'题库',layout:'卷面设计稿',unknown:'收录范围未核实'} as const;
export const regionOrder=Object.keys(regionNames) as CatalogRegion[];
export const sourceRoles=Object.keys(sourceRoleNames) as SourceRole[];
export const paperLanguageFor=(language:CatalogLanguage):PaperLanguage=>language==='mixed'||language==='zh-Hant'?'zh':language;

/** Topic folders represent the mainland curricula and exams covered by these authored papers. */
export function topicIdentity(paper:PracticeDocument,family:string):CatalogIdentity {
 const categories:Record<string,CatalogCategory>={
  'civil-service':'公务员与招聘',postgraduate:'研究生考试',
  'engineering-course':'大学课程','engineering-qualification':'职业资格','primary-school':'小学',
 };
 const category=categories[family];
 if(!category)throw Error('Unclassified topic: '+paper.practiceId);
 const english=['postgraduate-english1-01','postgraduate-english2-01','cn-p6-english-full'].includes(paper.practiceId);
 const language=english?'mixed':paper.presentation?.language??'zh';
 const basis=paper.exam?.specification?.source;
 const caseExercise=family==='engineering-qualification'&&basis&&typeof basis==='object'&&'kind' in basis&&basis.kind==='user-blueprint';
 const aliases=paper.practiceId==='civil-aptitude-01'?['考公','行测','国考','公务员'] :
  family==='civil-service'?['考公','公务员','申论'] : family==='postgraduate'?['考研','研究生'] :
  family==='primary-school'?['小六','六年级','小学六年级','P6']:undefined;
 return {
  category,region:'mainland',language,paperLanguage:paperLanguageFor(language),subject:english?'英语':paper.subject,
  grade:paper.authoring?.grade??paper.level,issuer:'纸间 Practice',year:paper.authoring?.year,
  system:paper.authoring?.region,scope:paper.mode==='bank'?'bank':caseExercise?'subset':paper.exam?.scope??'subset',
  identity:paper.generation?.intent==='adapt'?'adapted':paper.generation?.intent==='original'?'authentic':'original',aliases,
 };
}
