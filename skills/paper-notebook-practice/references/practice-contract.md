# Practice 作者源协议 1.0.0

[Schema](../schemas/practice.schema.json) 为结构权威。[Agent 任务](../schemas/practice-job.schema.json) 保存组卷要求与核对状态。[需求与版式收集](design-intake.md)统一智能体和网页会话的偏好收集与默认值。`practice.json` 包含答案，是作者源文件；考生 HTML 由构建器生成。主笔记无刷题指针时行为保持原状。

## 文档与版式

- `schemaVersion` 固定 `"1.0.0"`。`practiceId` 与 `notebookId` 为不同 ID。实体 ID 以英文字母开头，只含字母、数字、下划线和连字符，长度 1–128。
- `notebookRevision` 为正整数；提供原笔记时必须与其 ID、revision 一致。独立资料以稳定的来源集合 ID 作为 `notebookId`，初始 revision 为 1。
- `title`、`subject`、`level` 是标题、学科、学习层级；`durationMinutes` 为 1–1440；`totalScore` 等于所有节分值之和。
- `mode` 为 `mock` 或 `bank`。`bank` 组入过滤后的完整题库；`mock` 按题数、分值、题组与筛选条件组卷。
- `exam` 保存 `{specificationId, scope:'full'|'subset', scoreScale, specification?}`。4.0默认按完整考试规格出卷；`subset` 对应用户明确选择的题目、部分或限时小练习。`specificationId` 绑定已核定规格，可内嵌 `specification` 保存其他考试的完整定义。`scoreScale` 记录原卷题分、练习权重等计分单位。
- `style.preset` 为 `standard`、`stem`、`humanities` 或 `language`。`templateId` 选取[试卷模板](template-catalog.md)；`templateOverrides` 可设 A4/A3、方向、1/2 栏、四边距（mm）、字体、字号（pt）、行距、卷头、密封线、序号、院校、考试代码、页脚与作答位置。模板不会更改题目、时间或总分。旧版的 `fontSize`、`lineHeight`、`sealed` 继续有效。
- `materials` 保存完整来源，可为空（此时用 `--source notebook.json` 核验）。材料含唯一 `id`、`title`、`kind`、`text`，可有 `blocks`；Block 含 `id`、`text` 与可选 `title`、`page`。材料种类为 `notebook`、`past-exam`、`question-bank`、`knowledge`、`reference`。

## 题组与题目

`sections` 按纸面次序排列，每节含 `id`、`title`、`instructions`、`score`、`questions`。节分值等于题分之和。内部 `number` 唯一并按纸面次序递增，`displayNumber` 保留原印编号；错题本可保留有间隔的原题号。

完整考试的节用 `examPartId` 绑定规格题组；同一大题可含多个完整材料组。校验核对各组题量、类型、分值、考试时间、编号与必要录音。缺组时由Agent完成材料和答案，整卷要求保持不变。`scope` 与原印标题分别记录。

| 字段 | 约定 |
| --- | --- |
| `id` / `number` | 稳定题 ID / 当前显示题号 |
| `type` | `choice` 单选、`multiple` 多选、`truefalse` 判断、`blank` 填空、`response` 解答、`task` 操作任务 |
| `prompt` / `score` | 题干 / 正分值 |
| `options` | 单选、多选、判断含 2–26 项，各项含唯一 `id`、`text`；ID 符合 `^[A-Z][A-Z0-9_]{0,15}$` |
| `solution` | 单选/判断为一个选项 ID；多选为正确 ID 数组；填空为逐空字符串数组；解答/操作为参考答案字符串 |
| `explanation` | 解析、推理过程或评分要点 |
| `source` | 必填的逐字来源锚点，见下文 |
| `chapter` / `tags` / `difficulty` | 章节 / 知识点数组 / `easy`、`medium`、`hard` |
| `origin` | 可选 `{kind:'original'|'adapted'|'generated', number?, year?}`，保存来源性质、原题号与年份 |
| `attachments` | 可选图表数组，各项含 `id`、`dataUrl`、`alt`，可有 `caption`、`widthMm`；图表嵌入离线文件 |

判断题可用 `TRUE`、`FALSE`、`NOT_GIVEN`。多选默认按完整答案集合判分，顺序不影响结果，全对得分。考试明确允许少选分时，在每题设置 `multiSelectScoring: {partialPerCorrect: 0.5, wrongSelection: 0}`：全对得该题满分，少选且所选全部正确时每个所选项得0.5分，错选或空选得0分。该字段仅允许用于 `multiple`；单项部分分必须为正，最大少选集合的分值不能超过整题分值。此公开规则保留在考生卷，正确选项仍只在答案卷。导入配套答案卷前仅判定是否全对，非空未全对题的少选分显示待核；导入并校验匹配后在本机重算已提交分数，记录格式保持兼容。填空本地规范化后精确比对；同义答案可对照原解人工判断。解答与操作题由学习者参照评分要点自评；操作任务的实际运行结果在相应软件核验。

`section.format` 可为 `word-bank` 或 `paragraph-matching`，`sharedOptions` 保存共享选项，`choicesAsCodes` 只显示各题选项字母。每题仍保留完整 `options` 与正确字母，使用正常客观判分。CET词库含A–O共15词、10空各用一词且不重复；段落匹配按文章实际段落字母提供选项，允许同一字母对应多题。

`listeningOnly:true` 的题组保留真实朗读问题于作者源 `prompt`，题面只印题号和选项。`stimulus.audio` 包含 `{dataUrl, mimeType, title, durationSeconds?, transcriptSource?}`；`transcriptSource` 为 `{materialId, blockId}`，指向独立脚本Block。录音须含材料、朗读问题与作答停顿，使用可离线播放的数据URL。脚本保存在独立答案源，完整听力不能以文字脚本替代录音。

## 原题顺序与组卷记录

`assembly` 可记录 `{choiceOrder:'preserve'|'balanced', seed, sourceQuestionIds}`。Agent 流程默认 `preserve`，保留选项含义与顺序。显式 `balanced` 只重排 A–D 四选单选，使正确字母数量差不超过 1；多选、判断、非四选题保留原选项。含选项相互引用的题不能直接重排。

旧模拟卷未设置 `assembly.choiceOrder` 时继续执行原 A–D 均衡校验。`intent=original` 的任务必须保留选项顺序；需要改动原题的组卷使用 `adapt`。

`generation` 可记录 `{intent:'generate'|'original'|'adapt',sourceManifest?,ocrReviewed,unresolved,notes?}`。未解决的 OCR、来源、答案项目阻止正式构建；引用 `sourceManifest` 时必须完成核对并记录 `ocrReviewed=true`。校正过程与求解核对写入 notes，原始提取保留在 ingestion 输出。

当前登记9个已核定完整考试规格，另有10个 requirements 条目记录待补材料或评分依据。`specs` 查看规格；`plan --exam <id>` 绑定已有规格，`--exam-spec specification.json` 绑定自定义规格，`--scope full|subset` 保存范围；`coverage practice.json` 查看当前题组覆盖。CET-4/CET-6均57项、125/130分钟、100分练习权重；官方710分报道分使用官方转换机制。

## 来源锚点与答案分离

`source` 含 `blockId`、`exact`，可含 `materialId`、`page`、`title`。带 `materialId` 时，`blockId` 引用该材料的 Block；引用整份材料时 `blockId` 等于材料 ID。不带 `materialId` 时引用 `--source` 提供的笔记 Block。`exact` 是对应正文的完整连续子串。作者逐题核对题意、答案与引文是否相符。

考生卷不含 `solution` / `explanation`，并去除可能泄露答案的资料正文与逐字摘录；只保留出处定位。配套答案卷含答案、解析、来源原句与完整来源。导入答案卷时核对 practice ID、revision、题目集合与摘要。

## 作答与复习

`userState.practiceAnswers` 以题 ID 为键，值为 `{value:string|string[],submitted?,correct?,score?}`。`practiceMistakes` 为错题 ID 数组。作答不得写入题干或笔记正文。

`review` 为题 ID 到 `{stage,due}` 的映射。stage 为 0–5，间隔为 1、2、4、7、15、30 天；答对升一档，答错回第 1 天。due 为 `YYYY-MM-DD`。恢复缓存、下载 JSON 与错题导出保留记录；新组卷清除旧试卷的作答与复习状态。

## 来源试卷的内容层级

`presentation` 定义本份原卷实际出现的信息：titleLines、subtitle、metaLines、candidateFields、notices、scoreTable / scoreColumns、footerTemplate、endText。空数组或空字符串表示已确认所选来源页面 / 文档不含该项，或用户明确要求在定制版中省略；渲染器不补入通用姓名栏、须知和结束语。裁切图像中未显示某项属于待查证状态，不能编码为历史原卷确定没有该项。先核对完整首页、封面与可靠原文件，并在质量记录中说明来源完整性。headerRows 支持各行独立列数；titleFont、titleSizePt、titleGapMm、sectionSizePt、questionGapMm 与 headerStyle 控制实测字阶及卷头关系。

`presentation.integrityPledge` 保存可选诚信承诺，含 `title`、`text`，可有 `signatureLabel` 与 `dateLabel`。只在原件包含或用户选择时设置；保留原文、签名和日期栏的位置关系。

`job.customization` 保存显式纸面选择，字段和默认行为见[需求与版式收集](design-intake.md)。字段缺省表示沿用来源，`source` 保持原样；实际改变水印、卷头或其他视觉内容后，原页快照与定制产物分离。难度、范围与题组仍由考试规格和任务字段控制。

`style.templateOverrides.widthMm / heightMm` 支持非 A4/A3 原始尺寸；打印 @page 与页面本体使用同一组毫米数。以 pdf 文字层/媒体框实测的尺寸与根据扫描图归一化的尺寸须在研究说明中分别写明。

节的 `displayLabel`、`scoreLabel` 保存原件大题标签和分值文本；`headingStyle` 为 plain / part / section，Part 可以是四六级灰底横条。`headingFont`、`headingWeight`、`inlineFirstQuestion` 与 `questionColumns` 保留题头字形、行内大题和并列小题。`stimulus` 保存一组题共享的阅读文章、案例或数学条件，避免把共享材料塞进单个题干。其可选 source 与题目 source 使用相同的连续出处校验。

题目的 `number` 始终是卷内递增的唯一作答编号。`displayNumber` 保存原印题号（可重号、可空）；`origin.number` 永久记录出处题号。`scoreLabel`、`scorePosition`、`promptNewline` 保存分值位置；`breakBefore` 保存必要原页分页，重组时重新检查。`answerRows` 为作答行数。`presentation.answerSpace:none` 的原卷不在打印页面插入横线区；屏幕作答仍有输入区。独立答题卡提供完整作答空间。

材料还可记录 `url`、`rights`、`sha256`。正式出卷保持精确出处；考生卷移除题目与共享材料的 source.exact、材料正文、答案和解析，答案卷保留完整出处。

浮动图的 `attachments[].afterLine` 指定在题干第几次换行后插入（0为起始）；例如 `float:"right", afterLine:1` 保持首段全宽，并让后续小问环绕右图。原始题干与逐字出处不变。


`runningHeader` 的left/center/right支持{page}/{pages}/{title}；even可按原页偶数镜像覆写，skipFirst控制首张。`sourcePageNumbers`保存输出页对应原页（如8/9），`sourcePageCount`保留原卷总页数。`sideLabel`、`watermark`、`sealStyle`与`bindingText`保存原件边注、水印和装订文字，均只用于题目卷。

`gapBeforeMm/gapAfterMm`保存题前后留白；节支持gapBeforeMm、inlineStimulus、instructionsStyle:directions。`pageBreakBeforeLines`按题干换行索引强制续页（从1计），不会添加新题号；`answerBoxMm`设置原题固定矩形高度。所有值同时作用于离线导出。

`presentation.answerCard`独立控制答题纸：template为school/cet/university/ruled/boxed，title可覆盖卡标题，candidateDigits为1–20位，roomDigits为考场号位数（1–4，默认3），seatDigits为座位号位数（1–3，默认2）；学校卡为这三组号码分别提供书写格和0–9填涂格。pages为高校A3面数（默认2面、4逻辑页）。学校卡的空数来自正式答案数组，选项顺序来自原题。完整cet生成四面A4：卡1正写作与身份、反写作续页和听力1–25，卡2正身份和阅读26–55、反翻译；词库和匹配涂格保留实际选项字母。写作/翻译选编保留旧单项区域。高校答题纸保留空白演算面；各类答题卡不印题干或答案。

英文课程与算法题默认使用boxed答题纸，保留原Letter/A4纸型、原题号及矩形答题框，不套入中文高校装订栏。
