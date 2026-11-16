# 试卷模板、来源与复现范围

模板定义位于 `src/practice/templates.ts`，完整考试规格位于 `src/practice/exam-specifications.json`。所有版式均可离线导出，项目代码采用 MIT 许可。原题案例保留逐题出处，来源材料按各自许可使用。发布包不分发完整第三方源PDF或整页扫描图。4.0默认 `full`：规格确定题型、题量、题组、时间与分值，模板确定纸面呈现；用户明确选编时记录 `subset`。

## 完整考试规格（4.0）

`specs` 列出9个已核定规格。`plan --exam <id>` 选择规格，`--exam-spec specification.json` 保存Agent根据其他官方规定或完整原卷核定的规格，`--scope full|subset` 记录范围。`coverage practice.json` 核对当前题库与完整要求；缺失题组、共享材料、录音或答案由Agent完成后交付。

|规格ID|完整可作答项|时间（分钟）|计分|
|---|---:|---:|---|
|cet4|57|125|100分练习权重|
|cet6|57|130|100分练习权重|
|neea-2024-math|19|120|150分原卷题分|
|guangdong-2024-math|23|120|120分原卷题分|
|neea-2024-chinese|23|150|150分原卷题分|
|pku-calculus-2013|14|原件未注明；练习120|100分原卷题分|
|ecnu-linear-2023|19|原件未注明；练习120|100分原卷题分|
|ustc-probstat-2023|22|120|100分原卷题分|
|mit-6006-final-2020|21（含身份填写任务）|180|180分原卷题分|

另有10个 requirements 条目，分别要求补齐：指定院校课程原卷、CPA科目年份原卷、NCRE Python完整卷及公共基础、NCRE Office软件版本原卷、IELTS Academic Reading完整模块、IELTS Academic Writing图表和量表、浙大大学英语Ⅲ全卷核对、浙大马原完整材料题、自考思法题分依据、自考毛概题分依据。已知部分参数保留在条目中，Agent补齐依据后建立完整规格。通用模板的示例蓝图不能替代这些依据。

四六级规格均为57项：写作1、听力25、阅读30、翻译1。四级听力为新闻7/长对话8/篇章10，六级为长对话8/篇章7/讲座讲话10；阅读均为选词10/匹配10/深读10。100分练习权重为写作15、听力35、阅读35、翻译15；710分报道分遵循官方等值与常模转换。完整练习含本地AAC音频与答题停顿，题面不印脚本和朗读问题。

## 原题与原创完整案例

`cases` 列出16份案例、218个可作答项、19个材料来源，包括14份原题案例和2份原创MIT完整四六级卷。`cases <id> --out practice.json` 写出可编辑作者源。每个案例对应 `source-<practiceId>` 模板，保存卷头、字阶、纸张和题组约定；目录的 `scope` 记录完整或选编，纸面标题保持其原始内容。

|案例|范围|关键组织|
|---|---|---|
|complete-cet4-original-01|原创完整57项100分，125分钟|Writing、新闻3组、长对话2组、篇章3组、三种阅读及Translation；本地AAC|
|full-cet6-original-01|原创完整57项100分，130分钟|Writing、长对话2组、篇章2组、讲话3组、三种阅读及Translation；本地AAC|
|neea-2024-math-full|完整19题150分|数学单标题、3条须知、4页、题号1—19，原页6/12/18后分页|
|zhongkao-2023-2024-recombined|2024广东6题24分|原题1/5/7/8/9/20、机密标识、原页1/2/4|
|gaokao-2024-probability-selected|原1/5/16题|原页1/3及题间留白|
|gaokao-2024-chinese-poetry-selected|古诗与默写3题15分|共享宋词、阅读题组与默写|
|real-pku-calculus-2013|完整8大题14小题100分|Letter、单页、三列极限/积分、小题重号、无密封线与页脚|
|real-ecnu-linear-2023|完整8大题19小题100分|5页、原评分表、矩阵与方程组|
|real-ustc-probstat-2023|完整5大题22小题100分|2题页、装订线、统计表、共享条件与附录|
|real-cet4-translation-2016|完整翻译任务|194×266mm、灰底Part条、Directions|
|real-cet6-writing-translation-2016|完整写作及翻译任务|原Part I/IV层级、独立题组|
|real-university-english3-2016|原14/16/20题|Quiz/Form F、Spelling填词|
|real-zju-marxism-2016|原1/4/9题|学期/开课学院/日期/课程号、评分表|
|real-neea-ethics-2024|原1/2/27题|附录参考样卷、选择/简答|
|real-neea-mao-2024|原3/4/28题|附录参考样卷、选择/简答|
|real-mit-6006-final-2020|原Problem 2(a/c/d)|Letter、T/F加理由，分项自评|

字体来自原PDF文字层记录或原图视觉辨认。可编辑版保留内容与可测组织，宋体/黑体使用本机字体回退，KaTeX与原数学字形仍有差异；严格原页输出使用replicate保留原文件及图像。扫描件无可靠DPI时的A4值为归一化编辑尺寸。来源与适用范围见各案例的材料记录。

## 使用方式

- `specs` 确认完整考试要求；`templates` 列出内置模板及其来源，`plan --template <id>` 选择版式。
- `style.templateId` 确定基础版式；`style.templateOverrides` 覆盖纸型、方向、栏数、字体、字号、行距、四边页距、密封线、学校/机构、卷号和页脚。
- 模板切换只改变版式，保留题目、资料、答案、时间和分数。调整题量与分值使用组卷计划。
- `renderPractice(practice, {preview:true})` 显示完整空白题面，隐藏作答控件以外的界面操作，不读取保存记录、不计时、不保存状态，可在不带 `allow-same-origin` 的 iframe 中使用。

## 来源核对

核对日期：2026-11-13。以下分别记录来源已确认的事实和项目的版式选择；不是对各考试所有年度、地区和科目的统一规定。

| 模板 ID | 公开来源 | 来源观察与本项目实现 |
| --- | --- | --- |
| `standard` | Paper Notebook 原创 | A4 中文通用卷，题目、分值、作答区和密封线独立分层。 |
| `gaokao-math` | [教育部教育考试院，2024 年数学适应性测试](https://www.neea.edu.cn/xhtml1/report/2401/426-1.htm) | 已读取官方第一页扫描图：居中“数学”，考试须知、中文大题、小题连续编号、分值与选项；页脚有科目及总页数。扫描图是像素图，未据此宣称物理纸型。项目采用 A4 可编辑练习版，添加练习标题、考生信息与作答区。 |
| `gaokao-chinese` | [教育部教育考试院，2024 年语文适应性测试](https://www.neea.edu.cn/html1/report/2401/376-1.htm) | 官方说明确认依课程标准命题；按现代文、古诗文、语言文字运用、写作组织题组。中文阅读使用较宽行距，题组指令与材料分层。 |
| `university-a4` | [南京航空航天大学教务处，2024-07-01 试卷相关表格下载](https://aao.nuaa.edu.cn/_t753/2024/0701/c19082a348509/page.htm) | 官方页面分别提供 A4 中文、英文卷及答案评分模板。项目实现课程/学期抬头、考生信息框、得分区和密封线；学校专用原件字段由上传模板提取。 |
| `university-a3` | [湖南工学院教务处，2025-04-10 模板更新通知](https://www.hnit.edu.cn/jwc/info/1056/11093.htm) | 官方通知明确试卷及答题纸采用 A3。附件下载页要求验证码，未把附件当作已读原件。项目采用独立定义的 A3 横向双栏：左栏排满再进入右栏，两栏排满再翻页。 |
| `cpa-accounting` / `cpa-audit` | [中国注册会计师协会，2024 年机考练习网站公告](https://www.cicpa.org.cn/xxfb/tzgg/202405/t20240529_64870.html)；[官方考试助手](https://cpaexam.cicpa.org.cn/assistant.html) | 官方考试是机考，助手按年份和科目提供练习。这里是机考题面的纸面练习版；会计适合计算/综合案例，审计适合判断/简答案例，采用专业文字与分问层级。 |
| `ncre-python` | [教育部教育考试院，2025-01-02 二级 Python 样题](https://www.neea.edu.cn/xhtml1/report/2501/88-1.htm) | 已下载、渲染并查看官方 PDF：9 页，612 × 792 pt（US Letter），居中三行抬头、单项选择/基本操作/简单应用/综合应用四组，代码片段与正文分层。项目采用 A4 便于本地打印，保留任务分组，正文用中文衬线字体；原 PDF 的 Letter 不是本模板的 A4 测量依据。 |
| `ncre-office` | [教育部教育考试院，2025 年 WPS Office 样题 PDF](https://www.neea.edu.cn/res/Home/2508/a1a667aaf0c4fe94703259727083ec6b.pdf) | 已下载并核对 PDF 元数据：8 页，595.3 × 841.9 pt，A4。模板按知识选择、文字处理、电子表格、演示文稿组织。源截图、表格与操作结果可作为题目附件。 |
| `ielts-reading` | [IELTS，Academic Reading sample tasks 2023](https://ielts.org/cdn/Sample-tests/ielts-academic-reading-sample-tasks-2023.pdf) | 官方 PDF 有题组指令、匹配选项列表、单选和 TRUE/FALSE/NOT GIVEN；页脚使用英文页码。项目采用 A4、英文抬头/指令/页脚、无密封线，保留多字符选项 ID。 |
| `ielts-writing` | [IELTS，Academic Writing sample tasks 2023](https://ielts.org/cdn/Sample-tests/ielts-academic-writing-sample-tasks-2023.pdf)；[British Council 官方说明](https://takeielts.britishcouncil.org/prepare/ielts-free-practice-mock-tests/academic/writing) | 已核对 PDF 文本：26 页；Task 1 至少 150 词、约 20 分钟，Task 2 至少 250 词、约 40 分钟；Task 2 权重更高。A4 英文题面为项目打印选择，写作区加长。蓝图 33/67 是练习权重，官方 band 依评分描述另评。 |
| `cet4` | [教育部教育考试院，大学英语四、六级考试大纲](https://www.neea.edu.cn/res/Home/1704/55b02330ac17274664f06d9d3db8249d.pdf) | 公开大纲包含四级笔试样卷；按写作、听力、阅读、翻译分组。模板以 Times 正文、英文罗马大题编号和较宽阅读行距组织；练习分与官方报道分转换分开。 |
| `civil-service` | Paper Notebook 原创 | 通用能力客观题练习，支持言语、数量、推理和资料分析等组卷，不预设某地区或某年的官方卷式。 |

IELTS PDF 已通过官方页面/PDF 文本读取；本机直连其 CDN 下载返回 HTTP 403，因此没有将其物理尺寸、字体或边距称为实测。项目未用第三方复印件补齐未知尺寸。

## 内置物理版式

所有数值为本项目定义的可编辑打印参数，页距顺序为上 / 右 / 下 / 左，单位 mm。密封线位于左页距内，不挤占题干。A3 双栏栏间距为 14 mm。

| 模板 | 纸张 / 栏数 | 字号 / 行距 | 页距 | 密封线 | 页眉 |
| --- | --- | --- | --- | --- | --- |
| standard | A4 纵向 / 1 | 10.5 pt / 1.5 | 25 / 25 / 25 / 46 | 有 | 通用中文 |
| gaokao-math | A4 纵向 / 1 | 10.5 pt / 1.7 | 25 / 23 / 25 / 28 | 无 | 科目居中 |
| gaokao-chinese | A4 纵向 / 1 | 10.5 pt / 1.8 | 25 / 23 / 25 / 27 | 无 | 科目居中 |
| university-a4 | A4 纵向 / 1 | 10.5 pt / 1.6 | 20 / 20 / 20 / 38 | 有 | 高校课程 |
| university-a3 | A3 横向 / 2 | 10.5 pt / 1.6 | 20 / 20 / 20 / 35 | 有 | 高校课程 |
| cpa-accounting | A4 纵向 / 1 | 10.5 pt / 1.65 | 22 / 24 / 22 / 24 | 无 | 专业资格 |
| cpa-audit | A4 纵向 / 1 | 10.5 pt / 1.75 | 22 / 24 / 22 / 24 | 无 | 专业资格 |
| ncre-python / ncre-office | A4 纵向 / 1 | 10.5 pt / 1.65 | 20 / 23 / 20 / 23 | 无 | 计算机任务 |
| ielts-reading | A4 纵向 / 1 | 10.5 pt / 1.6 | 20 / 22 / 22 / 22 | 无 | 英文 |
| ielts-writing | A4 纵向 / 1 | 11 pt / 1.75 | 20 / 22 / 22 / 22 | 无 | 英文 |
| cet4 | A4 纵向 / 1 | 11 pt / 1.7 | 20 / 22 / 22 / 22 | 无 | 英文 |
| civil-service | A4 纵向 / 1 | 10.5 pt / 1.6 | 20 / 22 / 20 / 22 | 无 | 通用专业 |

## 用户原件的 1:1 复刻

需要与上传往年卷逐页一致时，使用 `replicate` 的原件页图。它保留原来的页面、字体外观、图表、页眉页脚与位置；`captured-template.json` 同时记录页面 pt 尺寸、文字/图片/线条边界、候选字体、页距和栏轨供编辑版参考。

编辑版按用户资料重排，可继续修改题目、换题、组模拟卷。原件页图用于原卷精确预览；OCR 文字与编辑版不承担像素一致性的承诺。扫描件未识别清楚的公式、表格或图形直接保留为附件，并在 Agent 审核清单中标出待核对位置。

## 验证

- `tests/practice-templates.test.ts`：模板与三种输出（题面/答案/答题卡）、来源元数据、覆盖参数、原题内容保护、新题型与答案隔离。
- `tests/practice-templates-browser.mjs`：Chromium/WebKit 实际物理页面、整页和列边界、全部题组、A3 左右栏、窄屏、无同源 iframe、预览零存储/零计时器/零网络、多选集合判分、判断、填空顺序、操作题自评和答案导入。
- 浏览器 PDF 输出的 A3 页面已用 `pdfinfo` 确认：1191.12 × 841.92 pt，A3 横向。


## 独立答题卡

|类型|纸型与区域|参考|
|---|---|---|
|school / ruled|A4，原题号、客观选项涂格、实际填空与非选择题作答区；ruled保留书写横线|本项目按题型组织|
|cet|完整卷为四面A4：卡1正面写作/身份，背面写作续页/听力1–25；卡2正面身份/阅读26–55，背面翻译。灰条、注册标、边框、虚线、淡水印、准考证涂格和条码区独立排版；词库A–O，匹配按实际段落字母|NEEA《全国大学英语四、六级考试大纲（2016年修订版）》PDF194—201页；选编写作/翻译保留对应单项区域|
|university|A3横向、每面两逻辑页、评分表、装订线及空白演算区|[东南大学本科生考试答题纸](https://jwc.seu.edu.cn/_upload/article/files/5a/6b/db52564d465f9814cceefd37a94b/3ec60a74-f9d7-4455-a312-ce33c7d4072f.pdf)，标题按课程学校设置|

由presentation.answerCard覆盖类型、标题、准考证位数与A3面数。原卷题纸和答题卡分别确认打印几何，不复制题纸中的来源水印和留白参数。

英文课程与算法题默认使用boxed答题纸，保留原Letter/A4纸型、原题号及矩形答题框，不套入中文高校装订栏。


## 国际、语言、公民与艺术版式

以下为可编辑版式与原创可作答范例。考试局、年份和模块由用户目标及当期官方资料确定；完整考试要求另由规格和来源核定。`node tools/practice.mjs examples <模板ID> --out practice.json` 读取同源范例，安装包入口为 `node scripts/practice.mjs examples`。

| 模板ID | 名称 | 纸型与输出 | 参考来源 |
| --- | --- | --- | --- |
| `cambridge-igcse-math` | IGCSE · 数学 | A4 纵向；保留原色，可选灰度 | [Cambridge IGCSE Mathematics 0580: 2025–2027 syllabus](https://www.cambridgeinternational.org/Images/662466-2025-2027-syllabus.pdf) |
| `cambridge-alevel-math` | A Level · 数学 | A4 纵向；保留原色，可选灰度 | [Cambridge International AS & A Level Mathematics 9709: 2026–2027 syllabus](https://www.cambridgeinternational.org/Images/697427-2026-2027-syllabus.pdf) |
| `ib-math-aa` | IB DP · 数学 AA | A4 纵向；保留原色，可选灰度 | [IB Diploma sample exam papers: Mathematics AA](https://ibo.org/programmes/diploma-programme/assessment-and-exams/sample-exam-papers/) |
| `sat` | SAT · 读写与数学 | A4 纵向；保留原色，可选灰度 | [College Board: How the SAT is structured](https://satsuite.collegeboard.org/sat/whats-on-the-test/structure) |
| `act` | ACT · 英语、数学与阅读 | A4 纵向；保留原色，可选灰度 | [ACT: Exam sections, structure and timing](https://www.act.org/content/act/en/products-and-services/the-act/test-preparation/act-exam-sections-and-structure.html) |
| `ap-calculus` | AP · 微积分 AB | A4 纵向；保留原色，可选灰度 | [College Board: AP Calculus AB exam](https://apcentral.collegeboard.org/courses/ap-calculus-ab/exam) |
| `jlpt-n5` | JLPT · 日语 N5 | A4 纵向；保留原色，可选灰度 | [JLPT: Composition of test sections and items](https://www.jlpt.jp/e/guideline/testsections.html) |
| `jlpt-n2` | JLPT · 日语 N2 | A4 纵向；保留原色，可选灰度 | [JLPT: Composition of test sections and items](https://www.jlpt.jp/e/guideline/testsections.html) |
| `jft-basic` | JFT-Basic · 生活日语 | A4 纵向；保留原色，可选灰度 | [Japan Foundation: About the JFT-Basic](https://www.jpf.go.jp/jft-basic/e/about/index.html) |
| `eju` | EJU · 日本留学考试 | A4 纵向；保留原色，可选灰度 | [JASSO: EJU past exam questions](https://www.jasso.go.jp/en/ryugaku/eju/examinee/pastpaper_sample/index.html) |
| `topik-ii` | TOPIK II · 韩语读写 | A4 纵向；保留原色，可选灰度 | [NIIED: Test of Proficiency in Korean](https://www.niied.go.kr/web/niied/contents/niied_topik) |
| `hsk3` | HSK 三级 · 中文读写 | A4 纵向；保留原色，可选灰度 | [中文考试服务网：HSK Level 3](https://www.chinesetest.cn/HSK/3) |
| `delf-b1` | DELF B1 · 法语 | A4 纵向；保留原色，可选灰度 | [France Éducation international: DELF B1 sample papers](https://www.france-education-international.fr/diplome/delf-tout-public/niveau-b1/exemples-sujets) |
| `goethe-b1` | Goethe B1 · 德语 | A4 纵向；保留原色，可选灰度 | [Goethe-Institut: B1 practice materials](https://www.goethe.de/en/m/spr/prf/ueb/pb1.html) |
| `us-civics` | 美国入籍 · 公民口试 | A4 纵向；保留原色，可选灰度 | [USCIS: 2025 civics questions and answers](https://www.uscis.gov/sites/default/files/document/questions-and-answers/2025-Civics-Test-128-Questions-and-Answers.pdf) |
| `uk-civics` | 英国入籍 · Life in the UK | A4 纵向；保留原色，可选灰度 | [GOV.UK: Life in the UK Test](https://www.gov.uk/life-in-the-uk-test) |
| `canada-civics` | 加拿大入籍 · Citizenship | A4 纵向；保留原色，可选灰度 | [IRCC: Study for the citizenship test](https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-citizenship/test/study.html) |
| `australia-civics` | 澳大利亚入籍 · Citizenship | A4 纵向；保留原色，可选灰度 | [Home Affairs: Learn about the citizenship test](https://immi.homeaffairs.gov.au/citizenship/test-and-interview/learn-about-citizenship-interview-and-test/learn-about-citizenship-test) |
| `cambridge-art` | IGCSE · 艺术与设计 | A4 纵向；彩色 | [Cambridge IGCSE Art & Design 0400: 2026 syllabus](https://www.cambridgeinternational.org/Images/697135-2026-syllabus.pdf) |
| `ap-art-history` | AP · 艺术史 | A4 纵向；彩色 | [College Board: AP Art History exam](https://apcentral.collegeboard.org/courses/ap-art-history/exam) |
| `music-theory` | 乐理 · 读谱与分析 | A4 纵向；保留原色，可选灰度 | [ABRSM: Music Theory](https://www.abrsm.org/en-gb/music-theory) |
| `music-performance` | 演奏 · 曲目与评价 | A4 纵向；保留原色，可选灰度 | [ABRSM Teacher Hub: What is a Performance Grade exam?](https://teacherhub.abrsm.org/mod/page/view.php?id=2018) |
| `design-studio` | 设计 · 项目与作品集 | A3 横向；彩色 | [University of the Arts London: Portfolio advice](https://www.arts.ac.uk/study-at-ual/apply/portfolio-advice) |
| `science-color` | 地理与遥感 · 彩色图像 | A4 纵向；彩色 | [NASA Earth Observatory: Interpreting a false-color satellite image](https://science.nasa.gov/earth/earth-observatory/how-to-interpret-a-false-color-satellite-image/) |
| `biology-visual` | 生物实验 · 观察与图像 | A4 纵向；彩色 | [OpenStax Biology 2e: Studying Cells](https://openstax.org/books/biology-2e/pages/4-1-studying-cells) |

新增范例使用项目原创题文和图像，含独立答案与按任务拆分的评分项。艺术色彩辨识题的图像标记 `colorRequired`；无等价灰度图时输出器要求保留彩印。科学图像同时使用标号、图例或线型，不以颜色作为唯一编码。日韩语采用对应 Noto 字体并随离线文件和 Word 嵌入，字体许可随包保留。
