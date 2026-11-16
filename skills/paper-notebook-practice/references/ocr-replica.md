# 资料识别、OCR 与原卷复刻

用户上传资料后，由当前 Agent 完成读取、核对和出卷。资料目录可混合笔记、往年卷、题库、知识点和参考资料；先运行本地识别，再查看原始页面，随后组织题库。预览工作台用于查看成品、人工选题和必要修订。

## 本地执行

仓库环境：

```sh
node tools/practice.mjs capabilities
node tools/practice.mjs ingest ./用户资料 --out output/sources --ocr auto
node tools/practice.mjs replicate output/sources/source-manifest.json --out output/replica
```

独立安装的 Skill 在本目录上级执行 `node scripts/practice.mjs`，命令与参数一致。也可直接调用仓库中的 `node tools/practice-ingest.mjs`。

`ingest` 接受单文件或资料目录，支持 PDF、PNG/JPEG/WebP/TIFF/BMP、DOCX、TXT、Markdown、笔记 HTML 与 JSON。多页 TIFF 逐帧保留页码、图像和各页 DPI 尺寸。目录递归读取并按内容哈希去重；原文件复制到 `originals/`。文字提取不更改源文件。

| 输出 | 用途 |
| --- | --- |
| `source-manifest.json` | 资料 ID、文件哈希、原页码、提取方法、原始文字、置信度、待核对项和兼容题库的 materials |
| `raw/*.txt` | 未改写的原始提取文字 |
| `pages/*/*.png` | 按实际页尺寸渲染的原始页面，默认 200 dpi |
| `assets/*/*` | DOCX 中内嵌图片的原始字节与哈希；结合原文核对图题和上下文 |
| `layout.json` | PDF 点坐标、文本/图片/线段边界、字体与字号；坐标原点在页面左上角 |
| `captured-template.json` | 实测纸张、正文范围、边距、栏数、字体样本、卷头和页脚候选区域；标为待 Agent 复核 |
| `agent-handoff.md` | 本次材料的识别与组织步骤 |

文本 PDF 优先读取文字层；每页文字不足时自动运行本地 OCR。`--ocr always` 强制逐页识别，`--ocr never` 只读现有文字层。扫描原图始终保留。页面的 `status`、`ocrReviewRequired`、`uncertain` 和 `warnings` 是当前 Agent 必须处理的项目。

## 环境与免费运行

TXT、Markdown、JSON、笔记 HTML 和 DOCX 正文提取使用独立技能中已打包的 Node 运行库。PDF 页图与版面提取使用本机 Python：

```sh
python3 -m pip install pdfplumber pypdfium2 Pillow
```

可通过 `PRACTICE_PYTHON` 指定 Python。macOS 使用系统 Swift 与 Apple Vision 的本地中英 OCR。其他系统使用本机 Tesseract，可通过 `TESSERACT` 指定可执行文件、`OCR_LANG` 指定语言（默认 `chi_sim+eng`）。Linux 可安装 `tesseract-ocr`、`tesseract-ocr-chi-sim` 与 `tesseract-ocr-eng`。工具不连接 OCR 服务，也不需要模型 API 密钥。

`capabilities` 报告实际能力。缺少本地依赖时，原文件仍会保留，资料标为 `needs-extraction` / `needs-ocr`；Agent 使用当前环境的视觉/OCR 能力读取，或配置相应本地工具后继续，不能用空文字宣称已经识别。

本项目代码使用 MIT 许可。可选本地依赖遵循各自的开源许可：pdfplumber 为 MIT，pypdfium2 为 BSD-3-Clause / Apache-2.0 及其依赖许可，Pillow 为 MIT-CMU，Tesseract 为 Apache-2.0。Apple Vision 是 macOS 自带系统框架，不随本项目分发；需要全开源运行环境时使用 Linux 与 Tesseract。以上路径均无需付费 OCR 服务。用户资料和原卷继续保留自身的来源与许可。

## OCR 的核对与更正

1. 同时打开原始页面和提取文字，核对题号、分栏顺序、否定词、单位、公式上下标、正负号、根号、选项字母和表格关系。置信度高也不代替公式核对。
2. `rawText` 保持原样。更正记录放在相应 source 的 `corrections` 中，至少包含 `page`、`original`、`corrected`、`reason` 和 `reviewedBy`；术语统一记录在 `glossary`。
3. 给标准化题库使用经核对的材料文本，同时保留原提取记录、页面图和更正记录。每题的 `source.exact` 对应实际采用的材料文字；页码与 source ID 不丢失。
4. 缺少答案的原题继续保留。由 Agent 根据原卷条件与资料求解，逐题检查答案；未解决项目保持草稿，不伪造官方答案。
5. 不确定图形与公式优先保留原页局部图，并补充可读文字。Agent 重建图形时保持几何、坐标、单位和标注，随后与原图对照。

## 原卷 1:1 复刻

`replicate` 的依据是原始页面图像和测得的物理页尺寸，不用 OCR 文字重新猜测排版。它生成离线 `原卷复刻.html`、原文件副本和 `replica-proof.json`。

- 原始 PDF 副本与上传文件逐字节一致，保留矢量、字体和原始文件结构。
- HTML 嵌入提取时保存的每页原始图像，校验 SHA-256，按该页的实际宽高打印，支持同一文件中的混合纸张尺寸。页面图默认 200 dpi，可在 ingest 时用 `--dpi 300` 提高分辨率。
- OCR 文字和可编辑版面独立保存，不叠加到原卷图像上，也不改变原卷的公式、图形、密封线和页码。
- 输入图片无可靠 DPI 时，暂以 300 dpi 计算物理页尺寸并标记 `physicalSizeAssumed`。Agent 应根据原纸或用户说明核定尺寸，再声明物理 1:1；图像内容本身完整保留。
- DOCX 的文字提取不等于 Word 的物理分页。需要原卷精确页面时使用同版本 Word 导出的 PDF，再执行 ingest / replicate；不要把 XML 段落重排称为原版复刻。

## 提取模板后制作新卷

`captured-template.json` 是可编辑的实测版面。Agent 根据页面图识别标题、科目、考试时间、满分、考生信息、题组、材料、选项、图表、作答区、密封线和页脚的角色；文字框、图片框与线段均使用点坐标。

先核对纸张、方向、栏数与内容边界，再核对字体、字号、行距和编号。新卷沿用用户指定原卷的这些规则；题量变化后按内容重新分页，检查材料和选项的阅读顺序、题目跨页和作答区。现成考试模板用于没有上传版式参考时的起点；有原卷时以实际原卷为准。

逐页检查可编辑重建稿与原页的差异，并按真实证据报告已经一致的范围。原始图像复刻和可编辑重排分别交付，避免用模板名称代替源卷核验。
