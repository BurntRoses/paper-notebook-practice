# 纸间 Practice

从往年卷、讲义和知识点，整理题库，制作可作答、可编辑的试卷、答案和答题纸。

[在线体验](https://burntroses.github.io/paper-notebook-practice/) · [下载离线工具](https://github.com/BurntRoses/paper-notebook-practice/releases/latest) · [使用说明](docs/practice.md)

## 开始使用

- 智能体：请阅读本仓库的 [AGENTS.md](AGENTS.md)，上传资料并说明考试目标。
- 网页会话：请阅读 [WEB_CHAT.md](WEB_CHAT.md)，按同一流程制作成品。
- 本机预览：下载完整离线包，打开其中的“纸间-试卷预览.html”。

## 资料与试卷

支持考公行测与申论、考研数学与英语、政治和综合科目，以及工程课程和工程资格。资料优先，原题优先；支持仅用指定资料、版本限制、材料题组、逐题解答与评分细则。专题案例附完整作者题库、题目卷、答案卷和答题纸。

试卷使用正式标题与真实纸面比例，支持明暗预览和本机 HTML、PDF、Word、PNG 导出。上传内容保存在当前浏览器中。

## 本地开发

```sh
npm install
npm run check
npm run build
npm run build:site
```

离线成品位于 `dist/practice/`，静态站点位于 `dist/site/`。

```sh
node tools/practice.mjs routes
node tools/practice.mjs topics
node tools/practice.mjs topics postgraduate-math1-01 --out math1.json
node tools/practice.mjs build math1.json --out papers
```

## 许可

软件及项目原创题文采用 MIT；字体和第三方试题按各自许可与来源说明使用。详见 [LICENSE](LICENSE)、[第三方许可](THIRD_PARTY_NOTICES.txt)和[试题材料许可](docs/exam-materials.md)。
