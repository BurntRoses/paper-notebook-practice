import type {CatalogCategory} from './catalog-categories';

export interface CatalogGuide {
 sample:string;
 name:string;
 reference?:{title:string;url:string};
}

export const catalogGuides={
 '小学':{sample:'england-2024-ks2-maths',name:'英格兰六年级 · 2024 KS2 数学'},
 '初中与中考':{sample:'zhongkao-2023-2024-recombined',name:'广东中考 · 数学'},
 '高中与高考':{sample:'neea-2024-math-full',name:'高考适应性测试 · 数学'},
 '大学课程':{sample:'real-ecnu-linear-2023',name:'华东师大期末 · 线性代数'},
 '研究生考试':{sample:'postgraduate-math1-01',name:'考研 · 数学一',
  reference:{title:'2024 年全国硕士研究生招生考试数学（一）公开整理题本',url:'https://gjb.ztbu.edu.cn/attachment/sites/item/2025_09/18_17/1066d05b0b708445.pdf'}},
 '公务员与招聘':{sample:'civil-aptitude-01',name:'国考 · 行政职业能力测验'},
 '职业资格':{sample:'constructor-1-economics-full-01',name:'一级建造师 · 建设工程经济'},
 '国际课程与升学':{sample:'cambridge-igcse-math',name:'Cambridge IGCSE · 数学',
  reference:{title:'Cambridge IGCSE Mathematics 0580/02 · 2025 Specimen Paper',url:'https://www.cambridgeinternational.org/Images/663664-2025-specimen-paper-2.pdf'}},
 '语言考试':{sample:'jlpt-n5',name:'JLPT · 日语 N5',
  reference:{title:'日本語能力試験 · 官方题型样例',url:'https://www.jlpt.jp/e/samples/forlearners.html'}},
 '公民与入籍':{sample:'us-civics',name:'美国入籍 · 公民知识口试',
  reference:{title:'USCIS · 128 Civics Questions and Answers (2025 version)',url:'https://www.uscis.gov/sites/default/files/document/questions-and-answers/2025-Civics-Test-128-Questions-and-Answers.pdf'}},
 '艺术与音乐':{sample:'cambridge-art',name:'Cambridge IGCSE · 艺术与设计',
  reference:{title:'Cambridge IGCSE Art & Design 0400/02 · 2025 Specimen Paper',url:'https://www.cambridgeinternational.org/Images/730863-2025-specimen-paper-2.pdf'}},
 '通用排版':{sample:'standard',name:'物理 · 运动与能量'},
} satisfies Record<CatalogCategory,CatalogGuide>;
