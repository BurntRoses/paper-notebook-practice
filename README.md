# 纸间 Practice

从往年卷、讲义和知识点，整理题库，制作可作答、可编辑的试卷、答案和答题纸。

[在线体验](https://burntroses.github.io/paper-notebook-practice/) · [下载离线工具](https://github.com/BurntRoses/paper-notebook-practice/releases/latest) · [使用说明](docs/practice.md)

- **学生**：把讲义和错题整理成专题练习，做完再对答案。
- **老师**：按教学进度组卷，下载 Word 改题、用 PDF 打印。
- **家长**：按孩子学过的内容准备小练习，用独立答案一起核对。

## 开始使用

- 智能体：`请读取 https://github.com/BurntRoses/paper-notebook-practice 的 AGENTS.md，按项目要求和我的资料、需求制作试卷或整理题库。`
- 网页会话：同一句话，将入口换为 `WEB_CHAT.md`。
- 本机预览：下载完整离线包，打开其中的“纸间-试卷预览.html”。

## 资料与试卷

支持小学、初中与中高考、大学课程、考公考研与工程，以及国际课程和海外升学、日语等语言考试、入籍公民知识、艺术设计与音乐。资料优先，原题优先；支持仅用指定资料、版本限制、材料题组、逐题解答与评分细则。专题案例附完整作者题库、题目卷、答案卷和答题纸。

每类版式关联实际读取的真实参考卷或评估任务与评分依据，见[真实样卷研究](skills/paper-notebook-practice/references/reference-study.md)。查看样例与应用版式分别操作。示例可逐页翻阅，支持首末页、页码跳转和方向键。外部原件受站点限制时，可打开来源，或读取已取得的本机 PDF。试做与校准案例见[命题校准](skills/paper-notebook-practice/references/authoring-calibration.md)。

试卷与版式采用单层考试方向分类，支持资源类型和关键词筛选。定制流程直接生成智能体或网页对话的个性化提示词。试卷使用正式标题与真实纸面比例，支持明暗预览和本机 HTML、PDF、Word、PNG 导出。支持彩印与灰度，色彩辨识任务保留彩色条件；日韩文字体随离线成品嵌入。上传内容保存在当前浏览器中。Word 的文字可编辑，公式和图形保留为版面图；PDF 适合按预览版式打印。

“打开文件”可恢复成品试卷/题库，或读取 PDF、DOCX、TXT 与笔记资料。普通资料在本机整理，下载出题资料包与个性化提示词后交给当前智能体或网页对话制作。

## 本地开发

```sh
npm install
npm run check
npm run build
npm run build:site
```

离线成品位于 `dist/practice/`，静态站点位于 `dist/site/`。

```sh
node tools/practice.mjs sources postgraduate-math
node tools/practice.mjs routes
node tools/practice.mjs topics
node tools/practice.mjs examples
node tools/practice.mjs examples jlpt-n5 --out japanese.json
node tools/practice.mjs topics postgraduate-math1-01 --out math1.json
node tools/practice.mjs build math1.json --out papers
```

[Paper Notebook](https://burntroses.github.io/paper-notebook/) 是本项目的孪生项目，用于从资料制作离线学习笔记。

## 许可

软件及项目原创题文采用 MIT；字体和第三方试题按各自许可与来源说明使用。详见 [LICENSE](LICENSE)、[第三方许可](THIRD_PARTY_NOTICES.txt)和[试题材料许可](docs/exam-materials.md)。
