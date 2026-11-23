# 纸间 Practice

浏览完整试卷，整理题库，调整卷面并导出。免费开源，可离线使用。

[打开纸间](https://burntroses.github.io/paper-notebook-practice/) · [下载离线版](https://github.com/BurntRoses/paper-notebook-practice/releases/latest) · [使用说明](docs/practice.md)

## 开始使用

- **找试卷**：按考试、科目或地区筛选。在同一条目里查看题本、可用答案及原配答题卡。
- **做试卷**：在首页选一份样卷，复制出卷指令，将指令和自己的资料一起发送给所用的 Agent 或对话模型。
- **改版式**：导入纸间 JSON，调整纸型、栏数、字体和间距。导出 Word 继续编辑，或导出 PDF 打印。

## 本地运行

```sh
npm ci
npm run build:site
```

通过 HTTP 服务打开 `dist/site/`。运行 `npm run build` 可在 `dist/practice/` 生成离线版。命令行与资料协议见 [Skill](skills/paper-notebook-practice/SKILL.md)。

## 许可

软件及项目原创题文采用 [MIT](LICENSE)。其他材料按各自的[第三方许可](THIRD_PARTY_NOTICES.txt)和[试题许可](docs/exam-materials.md)使用。
