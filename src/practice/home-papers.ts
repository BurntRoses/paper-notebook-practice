type HomePaperIdentity={
 id:string;
 label:string;
 title:string;
};
export type HomePaper=HomePaperIdentity&({kind:'case'}|{kind:'topic';file:string});

export const homePapers:readonly HomePaper[]=[
 {id:'cn-p6-math-full',label:'六年级数学',title:'六年级数学综合练习卷',kind:'topic',file:'primary-school/grade6-math.json'},
 {id:'cn-p6-chinese-full',label:'六年级语文',title:'六年级语文综合练习卷',kind:'topic',file:'primary-school/grade6-chinese.json'},
 {id:'cn-p6-english-full',label:'六年级英语',title:'六年级英语综合笔试',kind:'topic',file:'primary-school/grade6-english.json'},
 {id:'zhongkao-2023-2024-recombined',label:'广东中考',title:'广东中考数学',kind:'case'},
 {id:'neea-2024-math-full',label:'高考数学',title:'高考适应性测试 · 数学',kind:'case'},
 {id:'real-ecnu-linear-2023',label:'华东师大线代',title:'华东师大 · 线性代数',kind:'case'},
 {id:'real-pku-calculus-2013',label:'北大高数',title:'北京大学 · 高等数学',kind:'case'},
 {id:'real-ustc-probstat-2023',label:'中国科大概统',title:'中国科大 · 概率与数理统计',kind:'case'},
 {id:'complete-cet4-original-01',label:'英语四级',title:'英语四级 · 原创模拟卷',kind:'case'},
 {id:'full-cet6-original-01',label:'英语六级',title:'英语六级 · 原创模拟卷',kind:'case'},
 {id:'postgraduate-math1-01',label:'考研数学',title:'考研数学（一）',kind:'topic',file:'postgraduate/math1.json'},
 {id:'civil-aptitude-01',label:'国考行测',title:'行政职业能力测验',kind:'topic',file:'civil-service/aptitude.json'},
 {id:'constructor-1-economics-full-01',label:'一建经济',title:'一级建造师 · 建设工程经济',kind:'topic',file:'engineering-qualification/economics-full.json'},
];

export function homePaperAsset(paper:HomePaper){
 if(paper.kind==='topic')return 'skills/paper-notebook-practice/examples/topics/'+paper.file;
 return 'src/practice/real-cases.json 中 practiceId 为 '+paper.id+' 的记录';
}

export function homePaperCommand(paper:HomePaper){
 return 'node tools/practice.mjs '+(paper.kind==='topic'?'topics':'cases')+' '+paper.id+' --out reference-paper.json';
}
