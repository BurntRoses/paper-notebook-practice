# 纸间 Practice

浏览完整试卷，整理题库，调整卷面并导出。免费开源，可离线使用。

[打开纸间](https://burntroses.github.io/paper-notebook-practice/) · [下载离线版](https://github.com/BurntRoses/paper-notebook-practice/releases/latest) · [使用说明](docs/practice.md)

## 开始使用

- **找试卷**：按考试、科目或地区筛选。在同一条目里查看题本、可用答案及原配答题卡。
- **做试卷**：复制首页的出卷提示词，连同教材、题库或文字需求发给 Agent 或对话模型。按提问补充要求，拿到试卷文件后导入纸间。
- **改版式**：导入纸间 JSON，调整纸型、栏数、字体和间距。导出 Word 继续编辑，或导出 PDF 打印。

## 本地运行

需要 Node.js 20.19+、npm 和用于本地预览的 Python 3。

```sh
git clone https://github.com/BurntRoses/paper-notebook-practice.git
cd paper-notebook-practice
npm ci
npm run build:site
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist/site
```

打开 `http://localhost:4173/`。运行 `npm run build` 可在 `dist/practice/` 生成离线版，无需账号或 API 密钥。命令行用法与文件格式见 [Skill](skills/paper-notebook-practice/SKILL.md)。

制作与阅读图文笔记，请使用 [Paper Notebook](https://github.com/BurntRoses/paper-notebook)。

## 许可

软件及项目原创题文采用 [MIT](LICENSE)。其他材料按各自的[第三方许可](THIRD_PARTY_NOTICES.txt)和[试题许可](docs/exam-materials.md)使用。
