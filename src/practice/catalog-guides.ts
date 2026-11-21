import type {CatalogCategory} from './catalog-categories';

export interface CatalogGuide {
 sample:string;
 name:string;
 structure:string;
 reference?:{title:string;url:string};
}

export const catalogGuides={
 '小学':{sample:'primary-math',name:'六年级 · 数学',structure:'数与运算、图形与测量、解决问题。每组直接留出书写和演算位置。'},
 '初中与中考':{sample:'zhongkao-2023-2024-recombined',name:'广东中考 · 数学',structure:'从密级、双行卷头和四条考生须知开始。选择、填空和三组解答题沿用原卷编排。'},
 '高中与高考':{sample:'neea-2024-math-full',name:'高考适应性测试 · 数学',structure:'保留原页居中的数学科目标题、三条考生须知，以及单选、多选、填空与解答题顺序。'},
 '大学课程':{sample:'real-ecnu-linear-2023',name:'华东师大期末 · 线性代数',structure:'学期、课程性质、学号和阅卷计分表集中在卷头。题目用矩阵、证明和计算题组组织。'},
 '研究生考试':{sample:'postgraduate-math1-01',name:'考研 · 数学一',structure:'独立科目标题、选择与填空题组、连续编号的解答题，以及单独的答题纸。',
  reference:{title:'2024 年全国硕士研究生招生考试数学（一）公开整理题本',url:'https://gjb.ztbu.edu.cn/attachment/sites/item/2025_09/18_17/1066d05b0b708445.pdf'}},
 '公务员与招聘':{sample:'civil-aptitude-01',name:'国考 · 行政职业能力测验',structure:'按能力模块推进，资料分析保留共享表格和连续题号。切到答题卡可看到填涂与身份栏。'},
 '职业资格':{sample:'constructor-1-economics-full-01',name:'一级建造师 · 建设工程经济',structure:'卷首列明单选、多选及少选给分规则，题面集中呈现条件、单位和计算。'},
 '国际课程与升学':{sample:'cambridge-igcse-math',name:'Cambridge IGCSE · 数学',structure:'考号、试卷编号和非计算器条件置于卷首。题后直接预留演算区。',
  reference:{title:'Cambridge IGCSE Mathematics 0580/02 · 2025 Specimen Paper',url:'https://www.cambridgeinternational.org/Images/663664-2025-specimen-paper-2.pdf'}},
 '语言考试':{sample:'jlpt-n5',name:'JLPT · 日语 N5',structure:'日文卷头、氏名与受験番号。文字词汇、语法、阅读各有自己的短指令和选项。',
  reference:{title:'日本語能力試験 · 官方题型样例',url:'https://www.jlpt.jp/e/samples/forlearners.html'}},
 '公民与入籍':{sample:'us-civics',name:'美国入籍 · 公民知识口试',structure:'以面试主题、口答提示和考官记录组织，切换答案查看参考要点。',
  reference:{title:'USCIS · 128 Civics Questions and Answers (2025 version)',url:'https://www.uscis.gov/sites/default/files/document/questions-and-answers/2025-Civics-Test-128-Questions-and-Answers.pdf'}},
 '艺术与音乐':{sample:'cambridge-art',name:'Cambridge IGCSE · 艺术与设计',structure:'任务简报按观察、发展和最终成果推进，答卷保留过程记录和评价依据。',
  reference:{title:'Cambridge IGCSE Art & Design 0400/02 · 2025 Specimen Paper',url:'https://www.cambridgeinternational.org/Images/730863-2025-specimen-paper-2.pdf'}},
 '通用排版':{sample:'standard',name:'物理 · 运动与能量',structure:'按学科和题型组合的可编辑练习，适合日常出卷。'},
} satisfies Record<CatalogCategory,CatalogGuide>;
