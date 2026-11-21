import ks2 from './ks2-2024.json';

type HomePaperIdentity={
 id:string;
 label:string;
 title:string;
};
export type HomePaper=HomePaperIdentity&{kind:'case'|'source'};

export const homePapers:readonly HomePaper[]=[
 {id:ks2.id,label:'英格兰六年级数学',title:ks2.title,kind:'source'},
 {id:'zhongkao-2023-2024-recombined',label:'广东中考',title:'广东中考数学',kind:'case'},
 {id:'neea-2024-math-full',label:'高考数学',title:'高考适应性测试 · 数学',kind:'case'},
 {id:'real-ecnu-linear-2023',label:'华东师大线代',title:'华东师大 · 线性代数',kind:'case'},
 {id:'real-pku-calculus-2013',label:'北大高数',title:'北京大学 · 高等数学',kind:'case'},
 {id:'real-ustc-probstat-2023',label:'中国科大概统',title:'中国科大 · 概率与数理统计',kind:'case'},
];

export function homePaperAsset(paper:HomePaper){
 if(paper.kind==='source')return ks2.publication;
 return 'src/practice/real-cases.json 中 practiceId 为 '+paper.id+' 的记录';
}

export function homePaperCommand(paper:HomePaper){
 if(paper.kind==='case')return 'node tools/practice.mjs cases '+paper.id+' --out reference-paper.json';
}
