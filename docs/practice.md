# 资料出卷与成品预览

纸间提供智能体与网页对话两种入口，默认按已核定考试规格或明确的课程蓝图制作完整试卷。由当前会话先识别考试、学科、年度、难度和题型，再读取资料、按需检索、整理题库、补齐题组、独立求解并交付成品；预览台用于成品核对、选题和局部修订。MIT 免费开源，成品可离线使用。

## 一句话开始

**智能体** · Codex、Claude Code、DeepSeek Harness、WorkBuddy

```text
请阅读 https://github.com/BurntRoses/paper-notebook-practice 的 AGENTS.md，先读我上传的资料并一次确认范围、版式、水印和导出格式，再按我的回复制作试卷、答案卷、答题卡或全量题库。
```

**网页对话** · ChatGPT、DeepSeek 等

```text
请阅读 https://github.com/BurntRoses/paper-notebook-practice 的 WEB_CHAT.md，先读我上传的资料并一次确认范围、版式、水印和导出格式，再按我的回复制作试卷、答案卷、答题卡或全量题库。
```

上传资料后由当前会话继续执行。intro 是可选入口，其选择可附成个性化要求，不需要重新填写。[网页会话入口](../WEB_CHAT.md) 根据实际文件读取、视觉与执行工具完成交付；以下为智能体的完整本地工作流。

两份完整指令随包提供：[智能体指令](../skills/paper-notebook-practice/prompts/coding-agent.txt)、[网页会话指令](../skills/paper-notebook-practice/prompts/conversation-model.txt)。它们共用[学科与年级出题策略](../skills/paper-notebook-practice/references/exam-authoring.md)及[策略注册表](../skills/paper-notebook-practice/references/authoring-profiles.json)：学科与课程策略、五种层级分别规定目标、题目设计、独立核对和评分方式。

## 研究与学科路线

[路线注册表](../skills/paper-notebook-practice/references/exam-routes.json)包含69条路线：既有45条考公、考研与工程方法，新增24条国际课程、海外升学、语言、公民知识与艺术音乐方法。考研涵盖数一/二/三、英一/二、政治、199、396、408与院校专业课；工程覆盖力学与土木水利、机械电气电子控制、计算机化工热能材料环境、安全测绘矿业，以及建造、造价、监理和注册工程资格。资格考试先区分级别、基础/专业、知识/案例、方向和目标年度。

路线决定学科方法，`exam.specification` 决定整卷题组、题数、时长和计分，模板决定纸面。课程期末或自命题专题可明确采用 `source.kind: user-blueprint` 的作者蓝图；不能把一套课程题、资格案例或某院校结构写成所有年份通用的官方整卷。完整方法、来源边界和交付设计见[研究与命题流程](../skills/paper-notebook-practice/references/research-workflow.md)。

### 国际、语言与艺术任务

Cambridge IGCSE/AS/A Level、IB DP、AP、SAT/ACT先核对考试局、年度、科目、级别和component；JLPT/JFT-Basic/EJU、TOPIK、HSK、DELF与Goethe按实际版本设计原语言任务。美国公民知识分2008/2025口试版本，英国、加拿大、澳洲依据当期官方手册。艺术史、视觉创作、设计作品集、乐理、演奏和彩色科学图像各用对应作答证据和评分量表，纸面任务不代替实际音视频、作品或操作。

完整方法和官方研究入口见[国际命题](../skills/paper-notebook-practice/references/global-exams-authoring.md)；[题型模式库](../skills/paper-notebook-practice/references/question-pattern-library.md)含25种任务模式及12份已解原创教学任务。`examples`列出可作答模板范例，`examples <template-id> --out practice.json`取得共享作者数据后可继续`build`；示例身份、实际范围与完整规格分开保存。

打印可选择保留原色、彩印或灰度；页面明暗主题不影响打印政策。颜色是答题依据时保留彩印，或另做已核对的等价灰度任务。图像可保存`colorRequired`与`grayscaleDataUrl`，最终打印设置使用`presentation.printColor`，定制选择用`job.customization.printColor`。日文、韩文、法文与德文逐格式检查字形和标点。图像、谱例与音频各自许可保留，新增原创任务不冒充官方真题。

### 上传优先与指定资料

默认 `sourcePolicy.mode: uploads-first`、`questionPreference: originals-first`。Agent先完整检索允许的用户资料，选择范围、难度匹配的可核实原题和完整题组；缺口再实际读取网络原文、改编或新编。新编数学题包含真实计算、证明与建模，申论围绕给定材料组织作答要点，工程题给出工况、图纸、参数和单位，再按适用关系或规范求解。

| 设置 | 行为 |
| --- | --- |
| `uploads-only` | 仅用上传或明确允许的指定资料，允许据此独立求解和新编；缺少事实、公式或条文时记录缺项 |
| `uploads-first` | 先读用户资料，再为实际缺口补充网络原文 |
| `open` | 可结合上传与网络资料，仍遵守必用、排除和版本要求 |
| `requiredMaterialIds` / `allowedMaterialIds` / `excludedMaterialIds` | 分别记录必用、限定、排除的材料ID |
| `requiredVersions` | 记录指定材料版次；工程以目标考试指定版本及其效力为准 |

原创材料的 `provenance.derivedFrom` 保存实际依赖资料，排除与限定规则沿派生关系检查。题源、知识、答案、规范依据分别用 `supportingSources` 保存；`answerProvenance` 区分官方、机构与独立解答。权威网页可以证明大纲范围、规则或条文，项目原创题仍使用 `origin.kind: generated`，不因引用大纲而成为历史原题。

## 第一轮确认，下一轮交付

安装完整的 [`skills/paper-notebook-practice`](../skills/paper-notebook-practice/) 到所用 Agent 的技能目录，上传资料并发送对应的一句话。Agent 先读资料、已有指示与 intro 选择，第一轮简述实际读取内容，按[需求与版式收集](../skills/paper-notebook-practice/references/design-intake.md)将关键缺项在一条编号消息里问齐，并给出默认值。范围与制作方式、考试身份、题型题数与计分、纸型字体、答案与答题卡、原件水印、右下角 GitHub 项目标志与链接、HTML / PDF / Word（.docx）/ 逐页 PNG 按相关性收集。原件水印与可移除的项目署名是独立选项。

有关键缺项时先等待用户回复，下一轮按答案完成制作和导出；不先生成任意套版文件，也不在制作时再次请求同样的确认。已有要求直接沿用，已全部明确或用户回复“按默认值，你决定”时继续执行。默认主成品为离线 HTML，其他格式按选择交付；intro 可选，不要求重复填写。

Agent 按[完整工作流](../skills/paper-notebook-practice/references/agent-workflow.md)执行：

1. `capabilities` 检测本机读取、OCR 和页面处理能力。
2. `ingest` 保留原文件、全文、页面图像、页码、哈希和版面区域。
3. `routes` 选择学科方法，`specs` 选择已核定的完整考试规格，或由 Agent 根据目标官方规定、上传原卷、用户课程蓝图建立自定义规格；`plan` 默认生成 `scope: full` 的任务，`--brief` 复用已确认要求。
4. Agent检查扫描页、公式、图表和不确定符号，建立知识—能力—作答证据—评分蓝图；按允许资料补齐题组、共享文章、听力及答案。先独立求解，再与已有答案、第二算法、边界或材料条文核对；解决 `quality.unresolved`。`coverage` 核对完整结构的差距。
5. `run` 按模板和题组出卷，自动校验来源、题分、总分、题号及答案隔离。
6. Agent 打开实际页面，核对版面与打印，交付题目卷、答案卷、答题卡、题库与必要原卷复刻文件。

用户不需要先打开管理后台，也不需要自行复制任务包、拆分资料、转存 OCR 或维护 JSON。

新编与改编先建立“知识点—能力目标—作答证据—题型—题量—评分”的蓝图，再按年级和教学进度编题。题型、各类题数、每题或每组分值与总分可配置；完整考试仍以核定规格为准，冲突时先落实具体调整。选择题逐项核对并以实际误解设计干扰项，主观题提供分步评分和等价方法。年级与教学进度保存在作者要求和质量记录中，题组配置使用现有Schema字段。

`verification`只保存实际完成的推导、计算、回材料和查条文记录；主观题的 `rubric.criteria` 合计等于题分，并写明材料要点、可观察步骤、等价方法及数值容差。结构校验会检查引用、合分、资料权限和核验记录，学科正确性仍由实际求解与语义复核确定。范文提供一种作答方式，评分不以背诵固定措辞为条件。

## 完整范围与选编

内置9个已核定的完整考试规格，另有10个 requirements 条目记录待补原卷、题分或评分量表。题量、材料长度、题组结构、时间和计分由考试规格确定；模板负责纸面呈现。仅有版式或样题片段时，Agent 先核定完整规格。

默认范围为 `full`。题库缺题时保持整卷目标，Agent 补齐后继续出卷。制作新模拟卷时，补编题标记 `origin.kind: generated`；复刻指定历史原卷时，补取该原卷的缺失内容并保留原题身份。用户明确要求某部分、指定题目或限时小练习时使用 `--scope subset`，保存实际收入范围。纸面原卷标题与 `exam.scope` 分开记录。

全量题库使用 `mode: bank`，按上传资料覆盖整理全部可用题目、知识点和关联材料；保留原题关系并求解无参考答案题，不凑整卷题量、不强制听力或考试时长。

完整 CET-4/CET-6 各有57个可作答项，时长分别为125/130分钟。写作15、听力35、阅读35、翻译15构成100分练习权重；官方710分报道分使用等值与常模转换。听力题组含本地AAC录音、朗读问题和作答停顿，脚本留在独立答案源。词库有15个选项、10个答案各用一次；段落匹配允许重复选择，选项采用文章真实段落字母。

## 输入与 OCR

| 资料 | 处理 |
| --- | --- |
| PDF | 文字层提取、物理尺寸、字体与区域；按页保留原图 |
| 扫描 PDF / PNG / JPEG / TIFF 等 | Apple Vision 或 Tesseract 本地 OCR，保留位置、置信度与待核对项 |
| DOCX | 段落文字、原始文件；指定精确原页时使用 Word 导出的原 PDF |
| TXT / Markdown | 完整文字与明确编号题；原文、答案、解析可分别整理 |
| Paper Notebook HTML / JSON | 嵌入的笔记正文与原有练习 |
| practice.json | 正式题库，可直接制定组卷任务与渲染 |

完整 Skill 的基础读取、组卷和渲染只需 Node.js 20.19+。视觉 PDF、图片与 OCR 的免费本地适配器使用 Python 的 `pdfplumber`、`pypdfium2`、`Pillow`；macOS 可运行系统 Apple Vision，其他环境可使用本机 Tesseract。Agent 可使用当前环境自带的视觉能力，并记录实际识别方法。详细设置与复核流程见 [OCR 与复刻](../skills/paper-notebook-practice/references/ocr-replica.md)。

## 模板与往年卷格式

`templates` 提供带来源的高考、大学期末、注册会计师、计算机二级、雅思等模板。它们共用同一渲染器，但有不同纸张、方向、栏数、字体、标题、题组与答题形式。模板目录记录参考来源与适用范围。

用户提供往年卷时优先原文件。`ingest` 输出 `layout.json` 与 `captured-template.json`；`plan` 读取实测边距、栏数、纸张方向和字体样本，Agent 再核对区域用途、页间差异与字体替代。先确认完整首页、封面、题号和总页数；被裁切的网页图不能证明历史原卷没有大标题、密级或其他卷头信息。完整标题、考生须知、诚信承诺、课程代码、评分表、考生信息、装订线、页眉页脚与留白按原件逐项保留。可编辑新卷通过 `templateOverrides` 沿用这些参数，最终按实际原页对照。

`replicate` 输出原页离线 HTML、未改变字节的原始 PDF / 图片和校验证据。HTML 保留原页图像与测得纸张尺寸；原 PDF 保留原有文字与矢量图形。没有 DPI 的图片先核定尺寸。预置模板不冒充任意年份原卷；可编辑重排的复刻程度依据逐页比较结果报告。

## Agent 命令

仓库环境先 `npm install`，使用 `node tools/practice.mjs`。安装包无需项目依赖，命令改为 `node scripts/practice.mjs`：

```sh
node tools/practice.mjs capabilities
node tools/practice.mjs ingest /path/to/uploads --out work/sources --ocr auto
node tools/practice.mjs specs
node tools/practice.mjs specs cet4 --out work/cet4-specification.json
node tools/practice.mjs routes
node tools/practice.mjs routes postgrad-math-1
node tools/practice.mjs topics --family postgraduate
node tools/practice.mjs topics postgraduate-math1-01 --out work/math1.json
node tools/practice.mjs build work/math1.json --out output/math1
node tools/practice.mjs plan work/sources/source-manifest.json --out work/job --exam cet4
node tools/practice.mjs templates
node tools/practice.mjs examples
node tools/practice.mjs examples jlpt-n5 --out work/japanese.json
# Agent 完成 bank.json、job.json 与复核记录后执行：
node tools/practice.mjs coverage work/job/bank.json
node tools/practice.mjs run work/job/bank.json --plan work/job/job.json --out output
node tools/practice.mjs verify 'output/《标题》-试卷.html'
node tools/practice.mjs replicate work/sources/source-manifest.json --out output/原卷
```

也可分步 `compose bank.json --plan job.json --out practice.json`、`validate practice.json`、`build practice.json --out output`。`verify` 默认读取成品旁的 `practice.json`，或用 `--practice` 指定完整作者源；笔记来源可额外 `--source notebook.json` 绑定 revision。

`topics`按目录校验作者源哈希后读取专题，支持 `--family civil-service|postgraduate|engineering-course|engineering-qualification`。修改专题作者源后通过构建流程更新目录，旧哈希不匹配时不会静默读取。`cases`继续保留历史原题及完整CET目录，原有命令兼容。

intro导出的个性化要求可存成 `work/brief.json`，交给 `plan`，也可直接提交一份部分任务对象：

```sh
node tools/practice.mjs plan work/sources/source-manifest.json --out work/job \
  --brief work/brief.json --route postgrad-math-1 --year 2027 \
  --source-mode uploads-only --question-preference originals-first
```

`--brief`接受 `{job: ...}` 或任务对象，包含 `authoring`、`sourcePolicy`、题组与定制版式等已有协议字段。命令行显式参数覆盖对应简报选项，实际提取产生的OCR与答案缺项仍累计保留；简报中的“已核对”不能清除尚未处理的上传问题。仅指定路线并不会自动取得目标年度完整考试规格，必要时同时传入 `--exam-spec`。

其他已核定考试通过 `plan ... --exam <id>` 指定。自定义规格使用 `plan ... --exam-spec work/exam-specification.json`。选编任务使用 `plan ... --exam cet4 --scope subset`，随后按用户指定的题组、题目或练习时长设置任务。`coverage practice.json` 报告整卷要求和当前覆盖，缺失完整题组时由 Agent 继续完成。

`job.customization` 可保存用户明确选择的水印、诚信承诺、院校、课程代码、密级、考生信息、装订线、评分表、纸型和打印色彩，字段缺省时沿用来源；详见[需求与版式收集](../skills/paper-notebook-practice/references/design-intake.md)。实际视觉修改后，定制的可编辑纸面与原页快照分离。内部生成要求只保存在任务与元数据中。

`job.json` 可指定题组、固定题目、学科 / 章节 / 知识点 / 题型 / 难度、题数、时长、总分、模板及版式覆盖。原题保留原选项顺序；只有明确启用 `balanceChoices` 才均衡独立 A–D 单选选项。支持多选、判断、填空、解答和操作任务；原题、改编与新编分开标记，图表与截图内嵌到题目附件。

`build-proof.json` 证明结构和渲染协议校验结果，不代替视觉核验。存在未解决 OCR、缺失答案或无法定位的出处时，任务保持草稿，Agent 继续处理；正式组卷不跳过这些问题。

## 人工预览与选题

运行 `npm run build` 后，打开 `dist/practice/纸间-试卷预览.html`。此单文件可直接离线打开，导入 Agent 的题库或成品，预览试卷、查看模板、筛选和人工选择题目、调整分值并导出。它与 Agent Skill 使用相同 Schema、模板与渲染器。

完整技能包为 `paper-notebook-practice-skill.zip`，保留 `SKILL.md`、references、schemas、examples、scripts 和许可。公开的免费安装不依赖本地工作区路径。

## 7.0 离线专题交付

`npm run build`的主包名为 `paper-notebook-practice-v1.0.0.zip`；其中提供预览台、Skill、专题包、说明和许可。独立安装包继续使用 `paper-notebook-practice-skill.zip`，完整四六级仍单独提供 `paper-notebook-practice-complete-cet.zip`。

`paper-notebook-practice-topics.zip`包含考公、考研、工程课程与工程资格的专题目录。完整解压后打开 `index.html`，每卷可打开题目卷、答案与评分、答题纸及 `practice.json`。`catalog.json`列出实际收入范围，`manifest.json`记录每份文件与源数据哈希；题量和年份身份以各卷作者源为准。

专题包使用共享本地 `assets/paper-styles.js` 与 `assets/paper-runtime.js`，保留它们和各专题目录的相对位置后即可断网使用，无需本地服务器。字体、公式、图形、评分和导出运行文件均随包保存；PDF、真实Word（.docx）及逐页PNG在本机生成。

需要可单独移动的HTML时，从某卷 `practice.json`运行 `build`，或将作者源导入预览台下载整套成品，资源会嵌入各HTML。共享资源专题包与自包含成品分别满足整库浏览和单卷发送；不可只从专题包抽走一个HTML而遗漏其 `assets/`。

## 成品作答与打印

题目卷、答案卷与答题卡分别生成。题目卷中没有答案、解析和可能含答案的原始资料；作者源 `practice.json` 含答案，用于编辑与备份，交给考生时分发独立题目卷与答题卡。

打开题目卷开始作答，可切换大题、输入答案与计时。交卷前列出未答题，时间结束自动交卷。客观题本机判分；解答和操作任务按参考要点自评。导入配套答案卷后查看解析、定位原文并高亮 3 秒，导出错题本与 1、2、4、7、15、30 天复习排期。

多选默认沿用完整集合全对得分。正式规则允许少选分的试题可设置 `multiSelectScoring: {partialPerCorrect: 0.5, wrongSelection: 0}`：全对得题分，少选且均正确时每个所选项0.5分，错选或空选0分。考生卷保存公开规则与全对检查摘要，正确集合留在答案卷；导入前非空未全对题显示少选分待核，匹配答案卷导入后自动重算已提交得分。部分分与错题标记保存在现有作答记录中，旧题库仍按全对规则。

打印预览使用实际模板纸张与分页，隐藏控件、计时器、反馈和个人作答。题目卷打印题面，答案卷打印答案、解析与出处；原卷复刻按保留的原页尺寸打印。完整四六级答题卡为四面A4：卡1正面写作与身份，背面写作续页与听力1–25；卡2正面身份与阅读26–55，背面翻译。选编的写作、翻译任务继续生成对应单项答题区域。

## 本地记录、免费与主笔记独立

资料和题库保存在预览台的 IndexedDB；试卷作答保存在本机存储。可携带记录为 `userState.practiceAnswers`、`practiceMistakes` 和 `review`。清理浏览器或更换设备前导出备份。工具不向服务器上传资料，不调用模型服务；当前 Agent 的使用沿用用户所选服务。

主笔记 Skill 与刷题 Skill 分开安装。笔记正文和原有字段不变；可选 sidecar 指针为：

```json
{"extensions":{"practice":{"practiceFile":"practice.json","version":1}}}
```

项目使用 [MIT](../LICENSE)，第三方许可随包保留。免费本机使用，无登录、计费或托管服务。私有开发仓库的 GitHub 校验采用手动触发，本地完整测试、构建和使用均独立于 GitHub Actions。

## 4.0 案例与逐卷模板

运行 `cases` 可列出16份案例、235个可作答项，`cases <id> --out practice.json` 写出本地可编辑数据。其中14份来自原卷，另两套为原创MIT完整四六级练习，含可离线播放的本地AAC。预览台“试卷与版式”只展示结构核验通过的完整生成卷；部分题组仍可通过命令行目录读取，出处与内容身份保留在作者数据中。

案例材料共19个来源，覆盖中高考、北大/华师大/中科大数学、四六级、大学英语、马原/思法/毛概和MIT算法。收入范围、原题号、文件哈希与许可逐份记录于命令行目录和来源元数据，原题纸面保持真实原标题。模板ID `source-<practiceId>` 带自定义卷头信息；空须知、无得分框、无密封线和无页脚均按原件处理。完整目录见Skill的template-catalog.md。

`presentation`、section.stimulus、原印题号、固定选项列、同排小题、分值前置、页前断点和附件浮动支持真实题卷结构。手动选题或按知识点抽题保留共享阅读材料与章节。题目卷、答案卷、答题卡各自导出，题面不包含隐藏答案或原始答案材料。

## 4.1 原卷页面

历史试卷的来源页图像保存在作者源中，CLI `build` 与 `replicate` 可交付独立原卷HTML。浏览器首页、案例目录和预览使用生成纸面，只展示通过结构核验的完整试卷；打开后直接查看题目卷、答案卷和答题卡。浏览器下载的试卷包包含三份HTML与可编辑题库JSON，原页归档单独保存。

原卷保留原页图像、标题、密级、装订线、水印与页脚。原PDF按实际纸张尺寸打印；无DPI的源图片保留长宽比，并在数据中记录 physicalSizeAssumed。当前收录的NEEA适应性数学页面图像显示“数 学”卷头，未显示全国统考标题或“绝密”行；这只能说明现有图像的内容，不能据此断言历史原卷没有其他封面或完整卷头。复刻前查证完整首页与可靠原文件，记录资料完整性；原图保持原样，确认原件没有的标志不补造。全国统考通用模板另设密级行及分层标题。

生成纸面保留真实标题、题号和内容，边距、字号、层级与分页按生成版整理；人工修改继续保存到当前试卷与导出文件。历史源页的题目范围可能大于某份案例的可作答范围，收入范围保存在作者元数据与命令行目录中。原试题权利沿用各材料来源说明，代码保持MIT免费开源。

## 自定义题型与分值

在“定制我的试卷”的“内容”步骤选择“自定义”，逐组设置名称、题型、题量和每题分值。总分自动合计，实时卷面和两类出卷指令同步更新；切回“依照考试”恢复所选考试的默认总分。年级、知识范围与难度进入学科命题要求。

指令中的 `job.sections` 使用现有 `types`、`count`、`pointsPerQuestion` 字段。完整自定义卷同时附带 `specification.source.kind: user-blueprint` 的用户规格，按该规格组卷并检查题型、题数和分值；资料不足时报出具体缺少的题组。原卷复刻与全量题库按实际资料覆盖整理，不用制卷草稿的题量改写原题范围。
