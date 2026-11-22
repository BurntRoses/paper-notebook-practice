import {sourceEdition} from './source-editions';

type HomePaper={
 id:string;
 label:string;
 title:string;
 kind:'case'|'source'|'topic';
};

export const homePapers:readonly HomePaper[]=[
 {id:'zhongkao-2023-2024-recombined',label:'广东中考数学',title:'广东中考数学',kind:'case'},
 {id:'cn-p6-chinese-full',label:'小学语文 · 模拟',title:'六年级语文综合练习卷',kind:'topic'},
 {id:'england-2024-ks2-grammar',label:'英格兰小六英语',title:'英格兰六年级 · 2024 KS2 英语语法与拼写',kind:'source'},
 {id:'neea-2024-math-full',label:'高考适应性数学',title:'2024 年高考综合改革适应性测试数学',kind:'case'},
 {id:'complete-cet4-original-01',label:'英语四级 · 模拟',title:'大学英语四级模拟卷（含听力）',kind:'case'},
 {id:'real-ecnu-linear-2023',label:'华东师大线代',title:'华东师范大学线性代数 A 期末试卷',kind:'case'},
 {id:'real-ustc-probstat-2023',label:'中国科大概率统计',title:'中国科学技术大学概率论与数理统计期末试卷',kind:'case'},
 {id:'mit-chemical-science-final-2014',label:'MIT 化学',title:'MIT · 化学原理期末试题',kind:'source'},
 {id:'civil-aptitude-01',label:'行测 · 模拟',title:'行政职业能力测验模拟卷',kind:'topic'},
 {id:'civil-essay-01',label:'申论 · 模拟',title:'申论模拟卷',kind:'topic'},
 {id:'postgraduate-computing408-01',label:'考研 408 · 模拟',title:'考研计算机学科专业基础 408 模拟卷',kind:'topic'},
 {id:'constructor-1-architecture-mock-01',label:'一建建筑 · 模拟',title:'一级建造师建筑工程管理与实务模拟卷',kind:'topic'},
];

export function homePaperAsset(paper:HomePaper){
 if(paper.kind==='source')return sourceEdition(paper.id)?.publication;
 if(paper.kind==='topic')return 'skills/paper-notebook-practice/examples/topics/ 中的 '+paper.id+' 整卷';
 return 'src/practice/real-cases.json 中 practiceId 为 '+paper.id+' 的记录';
}

export function homePaperCommand(paper:HomePaper){
 if(paper.kind!=='source')return 'node tools/practice.mjs '+(paper.kind==='case'?'cases':'topics')+' '+paper.id+' --out reference-paper.json';
}
