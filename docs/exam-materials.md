# 试题材料与代码许可

Paper Notebook Practice 的代码、渲染器、原创模板参数，以及两套完整原创 CET-4/CET-6 的题目、文章、脚本、参考答案和评分要点采用 MIT。两套原创卷的本地AAC录音随成品内嵌，离线播放无需TTS服务。来源试题、原 PDF、扫描页、阅读文章和第三方答案保留各自权利，不因收录链接或用于本地研究而改为 MIT。

原创四六级练习卷按[教育考试院试卷结构](https://cet.neea.edu.cn/xhtml1/folder/16113/1586-1.htm)与[公开考务指引](https://hituc.hit.edu.cn/2026/0609/c17860a393827/page.htm)排版：写作在试题册封底，条形码从封底移贴至答题卡 1；卡 1 用于写作与听力，卡 2 用于阅读与翻译。封底的模拟粘贴条仅标位置，不包含真实识别码；考务示意图不嵌入卷面，模拟卷不标为正式试题或原件扫描。

真实案例逐份记录发布机构、年份、原始链接、文件 SHA-256、原题号及材料权利。数学表达式、数值条件、原题结构与解题过程用于可编辑案例；收入范围写入目录、generation.notes和研究说明；纸面使用原卷标题与原题号，不添加制作说明。答案分别标明原配套答案、官方解答或本项目编写的参考答案与评分要点；发现的原答案排印错误记录在 generation.notes 和研究说明中。

目录共16份案例、235个可作答项、19个材料来源，包括14份原题案例与2份原创完整四六级卷。原创卷只使用NEEA大纲核定结构与权重；内容身份记录为 `generated`。四级57项125分钟、六级57项130分钟，100分为练习权重；官方710分报道分依官方转换机制计算。完整与选编写入 `exam.scope` 和目录覆盖信息，独立于原卷印刷标题。

七份语言与专业课选编中，CET4/6、思法、毛概的 NEEA 样卷未声明开放内容许可，原题保留原权利；浙江大学大学英语与马原原试卷也保留原作者权利，QSCTech/zju-icicles 的 CC BY-NC-SA 4.0 只适用于贡献者编写的部分。MIT 6.006 选编归属于 Erik Demaine、Jason Ku、Justin Solomon 及 MIT OpenCourseWare，原卷、官方答案及本项目的选编、公式转写和中文解析改编遵循 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)。

工具免费、在本地运行，不要求账户、付费模型服务或 API 密钥。资料的来源许可与软件 MIT 许可分别适用。

原始资料可从案例所列发布页获取。用户也可上传自己的原件，通过 `ingest` 和 `replicate` 生成本地成品。

案例清单见 `skills/paper-notebook-practice/examples/real-exams/catalog.json`；每份可编辑 JSON 中的 materials 包含来源与权利说明。

## 真实参考卷与任务集合

`skills/paper-notebook-practice/references/authentic-*-papers.json` 保存参考试卷、题库和评估任务的来源、公开范围及命题记录。站点展示从题库重新排版的卷面，原件只保留发布者链接。第三方题文和题图沿用来源许可；MIT 适用于项目代码与原创内容。完整卷、单项组件、口试与作品任务分别标识。

大学转载的全国统考卷、机构回忆整理与官方原卷分开标注；独立求解、机构参考答案和官方评分分开记录。具体缺页、缺图、答案疑错与年度适用性写在各集合中，出卷时继续解决，不因来源名称而自动采纳。

## 2024 英格兰 KS2 数学

Standards and Testing Agency 于 2024 年 5 月发布的 Year 6 数学套卷包含运算卷 20 页、两份推理卷各 24 页和评分册 40 页。本站在统一翻页界面呈现保留原页尺寸的 SVG 矢量及可选文字层，按许可排除机构标识，不代理或内嵌 PDF。三份原题本提供卷内作答区，对应在线套卷提供三份题本及一份官方评分册。原题本、核验用 SHA-256 及各页标识位置见 `src/practice/ks2-2024.json`。

Contains material developed by the Standards and Testing Agency for 2024 national curriculum assessments and licensed under [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/). [发布页](https://www.gov.uk/government/publications/key-stage-2-tests-2024-mathematics-test-materials) · [版权说明](https://www.gov.uk/government/publications/key-stage-2-tests-2024-mathematics-test-materials/2024-copyright-ownership-key-stage-2-national-curriculum-tests)

## 英格兰 KS2 英语与 MIT 期末试卷

- 英格兰 2024 KS2 英语语法与拼写有两份考生题本（32、4 页）、官方评分册（20 页）、听写口令和语法卷监考须知（各 8 页）。与同年数学卷使用同一再利用许可和归属声明。 [发布页](https://www.gov.uk/government/publications/key-stage-2-tests-2024-english-grammar-punctuation-and-spelling-test-materials)
- MIT 6.006 算法导论 2020 年春季期末考试提供题本和官方解答（各 21 页），保留原有运算图表和草稿页。 [发布页](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/exams/)
- MIT 14.01 微观经济学期末考试为 2010 年秋季原卷（23 页）及官方解答（12 页），由 2011 年课程公开。 [发布页](https://ocw.mit.edu/courses/14-01sc-principles-of-microeconomics-fall-2011/resources/exams/)
- MIT 5.111 化学原理 2014 年秋季期末考试提供题本和官方解答（各 17 页），包括原卷的图表和作图位置。 [发布页](https://ocw.mit.edu/courses/5-111sc-principles-of-chemical-science-fall-2014/pages/exams/)
- MIT 8.012 经典力学 2008 年秋季期末考试提供题本（13 页）和官方解答（26 页），含原卷的公式表。预览从试题首页开始，仍可回翻到发布说明。 [发布页](https://ocw.mit.edu/courses/8-012-physics-i-classical-mechanics-fall-2008/resources/exams/)

MIT 各卷随页标明出版者、课程和 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) 许可。原件链接、页数和再利用说明见 `src/practice/source-editions.json`。
