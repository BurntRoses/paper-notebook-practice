# 文件格式与离线导出

默认主成品是可直接打开的离线 HTML。用户选择 PDF、Word（`.docx`）或逐页 PNG 时，当前会话生成并交付实际文件。HTML 内置相同的导出器，后续使用无需联网、账号或模型密钥。

## 选择格式

| 格式 | 成品与用途 |
| --- | --- |
| HTML | 单文件，内嵌题目与所需资源，可离线作答、打印和再次导出；答案卷独立 |
| PDF | 固定纸型与物理分页，保留页面字形、公式和图形；项目链接可点击 |
| Word `.docx` | 真正的 OOXML 文档，保留物理页版式与可编辑文字，公式和图形保留实际渲染结果 |
| PNG | 按物理页导出清晰图片，多页放入 ZIP，文件名包含页序 |

先读取资料和环境能力，再在首轮需求确认中收集所需格式。不要承诺当前环境不能生成的文件，也不要要求用户承担当前会话能完成的导出步骤。

## 当前会话执行

先用项目的 `build` 或 `run` 生成题目卷、答案卷与答题卡 HTML。打开真实文件，等待 `body[data-ready=true]` 后，使用文件顶栏的“导出格式”和“导出文件”。每个文件只导出当前卷种。

已具备 Playwright 的 Node 环境可以直接使用内置下载操作；此工具用于当前会话执行，不是要求用户安装的新依赖：

```js
import {chromium} from 'playwright';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(resolve('output/exam-paper.html')).href);
await page.waitForFunction(() => document.body.dataset.ready === 'true');
await page.selectOption('#paper-export-format', 'docx'); // pdf / docx / png
const pending = page.waitForEvent('download', {timeout: 120000});
await page.click('#export-paper-file');
const file = await pending;
await file.saveAs(resolve('output', file.suggestedFilename()));
await browser.close();
```

同一能力也由页面内 `window.paperExports.run('pdf' | 'docx' | 'png')` 暴露，返回实际 `name`、`mime`、`bytes` 和 `pages`。网页会话可用其自身已有的浏览器执行环境操作，不能以一个未运行的脚本代替最终文件。

## 标志、水印与验证

`presentation.projectMark` 控制右下角 GitHub 项目标志与链接；默认保留，`false` 去除。制卷要求使用 `job.customization.projectMark`。HTML 顶栏的“项目标志”也可切换，导出沿用当前选择。原卷来源水印由独立的 `presentation.watermark` 和 `job.customization.watermark` 控制。

按本次实际交付格式检查文件：核对试卷标题、题号、分值、页数、纸张尺寸、中文与拉丁字体、公式、图形、答题区和页脚。打开实际 DOCX 检查缺字与分页，查看 PDF 和 PNG 渲染，不只检查扩展名、ZIP 成员或 XML。考生卷保持答案隔离；答案与解析仍在独立答案卷中。
