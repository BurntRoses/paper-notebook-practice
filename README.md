# 纸间 Practice

从往年卷、讲义和知识点，整理题库，制作可作答、可编辑的试卷、答案和答题纸。

[在线体验](https://burntroses.github.io/paper-notebook-practice/) · [下载离线工具](https://github.com/BurntRoses/paper-notebook-practice/releases/latest) · [使用说明](docs/practice.md)

- **找试卷**：按考试、学科或专题查看题目、答案和答题卡。
- **整理资料**：把往年卷、讲义和错题录成可编辑题库。
- **定制出卷**：按范围、题型和分值组卷，导出 Word 修改或 PDF 打印。

## 开始使用

- 智能体：从首页选一份完整样卷，复制 Agent 指令并附上自己的资料。Agent 可从 GitHub 读取同源作者数据，参考题组、规格与版式，直接交付题目卷、答案卷、答题卡及 `practice.json`。
- 网页会话：点击「复制对话模型指令」，与自己的资料一起发送。
- 成品需要修改时，把 `practice.json` 导入在线版，调整版式或转换格式。也可在离线包中打开“纸间-试卷预览.html”。

在线版从上方“在线体验”进入，不需要在网址后加 `dist/index.html`。打不开在线版时，可使用离线工具；已保存在浏览器里的试卷不会自动同步到离线包。

## 资料与试卷

支持小学、初中与中高考、大学课程、考公考研与工程，以及国际课程和海外升学、日语等语言考试、入籍公民知识、艺术设计与音乐。资料优先，原题优先；支持仅用指定资料、版本限制、材料题组、逐题解答与评分细则。专题案例附完整作者题库、题目卷、答案卷和答题纸。

在线目录只收录有来源的完整原题套卷。题本、可用答案和原配答题卡在同一条目内查看。2024 英格兰 KS2 数学保留三份题本与官方评分册的原页尺寸和排版。导入试卷后可在「我的试卷」调整版式。专题练习与题库仍可通过 Skill 和 CLI 使用。原卷和评分依据通过来源链接查阅，见[真实样卷研究](skills/paper-notebook-practice/references/reference-study.md)。

六年级原创综合卷包含数学、语文和英语笔试。每卷满分 100 分，配套答案与评分细则。项目内置的以少量题目演示题型的资料仍可在「练习」中查阅。

试卷目录直接搜索名称、科目或考试，也可按方向、地区、科目和语言缩小范围。资料命题、扫描转卷和题库组卷可以在首页的「出卷流程演示」逐步查看。试卷使用正式标题与真实纸面比例，支持明暗预览和本机 HTML、PDF、Word、PNG 导出。支持彩印与灰度，色彩辨识任务保留彩色条件；日韩文字体随离线成品嵌入。上传内容保存在当前浏览器中。Word 的文字可编辑，公式和图形保留为版面图；PDF 适合按预览版式打印。

“打开文件”可恢复成品试卷/题库，或读取已经整理好的 DOCX、TXT、Markdown 与笔记资料。PDF、扫描件和原始页面先由本机 Skill/OCR 转为结构化题库；网页只展示纸间版式，不打开原始 PDF。

## 本地开发

```sh
npm install
npm run check
npm run build
npm run build:site
```

离线成品位于 `dist/practice/`，双击成品 HTML 即可打开。静态站点位于 `dist/site/`，需通过 HTTP 服务预览，不要直接双击站点的 `index.html`。

```sh
node tools/practice.mjs sources postgraduate-math
node tools/practice.mjs routes
node tools/practice.mjs topics
node tools/practice.mjs examples
node tools/practice.mjs examples jlpt-n5 --out japanese.json
node tools/practice.mjs topics postgraduate-math1-01 --out math1.json
node tools/practice.mjs build math1.json --out papers
node tools/practice.mjs topics --family primary-school
node tools/practice.mjs topics cn-p6-math-full --out grade6-math.json
node tools/practice.mjs coverage grade6-math.json
```

[Paper Notebook](https://burntroses.github.io/paper-notebook/) 是本项目的孪生项目，用于从资料制作离线学习笔记。

## 许可

软件及项目原创题文采用 MIT；字体和第三方试题按各自许可与来源说明使用。详见 [LICENSE](LICENSE)、[第三方许可](THIRD_PARTY_NOTICES.txt)和[试题材料许可](docs/exam-materials.md)。
