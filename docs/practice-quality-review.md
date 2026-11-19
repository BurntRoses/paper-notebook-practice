# 纸间 Practice · 全项目质量检查

范围：工作台、卷面、离线导出、Node.js CLI、OCR 交接、题库与考试规格、GitHub Pages 构建。项目没有在线 API、数据库服务或内置推理模型；浏览器使用 IndexedDB，本机 CLI 和 OCR 负责资料处理，命题由用户选择的 Agent 执行。这里审查的是这些实际存在的边界，不把模型幻觉或缺少云服务列成已复现的系统故障。

「已修」指本地代码已修改；「未关闭」指发现了可定位的不一致、性能瓶颈或缺少验收证据，未计作修复。文中的定位使用当前仓库路径；废弃文件的定位指删除内容。

## 01–20 · 工作台、文件与卷面

| 编号 | 原问题与定位 | 处置 |
| --- | --- | --- |
| 01 | 「打开试卷」允许多选，多个有效文件会依次替换，最后一个无提示胜出。 `workspace.ts/openFiles` | 已修：打开只接收一份，追加仍可批量。 |
| 02 | 无题库数据的普通 HTML 也被当成试卷，清掉当前可编辑文档。 `workspace.ts/importFiles` | 已修：拒绝缺少纸间试卷数据的 HTML，保留当前试卷。 |
| 03 | 设计稿、仅供显示的预览和完整成品共用 HTML 导入兜底。 `workspace.ts/importFiles` | 已修：区分成品、设计稿和屏幕预览，只读候选卷走单独路径。 |
| 04 | 格式不合格的答案 HTML 降级为原样预览，掩盖数据错误。 `workspace.ts/importFiles` | 已修：答案卷返回对应字段错误。 |
| 05 | 打开一份有效作者 HTML 时直接采用其数据，绕过 JSON 路径的卷面重排。 `workspace.ts/importFiles` | 已修：作者 HTML 和 JSON 都由项目重排。 |
| 06 | 把出卷任务 JSON 归为普通警告，没清楚说明为什么不能打开。 `workspace.ts/importFiles` | 已修：明确区分出卷任务和可编辑成品。 |
| 07 | 追加题库只提取扁平题目，原共享文章、词库、听力题组丢失。 `workspace.ts/bankWith` | 已修：保留原题组、材料、共享选项和录音引用。 |
| 08 | 两个题库题组 ID 相同，合并没有归并/分配规则。 `workspace.ts/bankWith` | 已修：为碰撞题组分配唯一 ID。 |
| 09 | 同 ID 但不同正文的资料被静默忽略，题目可能指向错误原文。 `workspace.ts/importFiles` | 已修：不覆盖不同正文，提示冲突。 |
| 10 | 追加后才有机会发现证据失配，已修改的工作区没有回滚。 `workspace.ts/importFiles` | 已修：新工作卷及全量库先校验，单文件成功后再更新。 |
| 11 | 工作卷与全量库合并时以当前卷资料覆盖全量库资料。 `workspace.ts/importFiles` | 已修：从两处合并资料，再检查来源。 |
| 12 | 所有文件均失败也会持久化并切换页面。 `workspace.ts/importFiles` | 已修：只有成功变更才保存和导航。 |
| 13 | 追加同一份题库只显示“资料已保存”，不知道实际上没有新内容。 `workspace.ts/importFiles` | 已修：明确提示“已在题库中”。 |
| 14 | 一批文件部分成功时，成功项和失败原因共用模糊的反馈。 `workspace.ts/importFiles` | 已修：分别给出新增题数、资料数和失败文件。 |
| 15 | 从独立候选卷继续追加资料可能直接丢掉只读卷面。 `workspace.ts/importFiles` | 已修：先要求打开可编辑题库。 |
| 16 | 空白题库可导出 JSON，但正式校验导致备份打不开。 `workspace.ts/validateEditable` | 已修：按工作台空题库规则恢复可编辑备份，正式出版校验不放宽。 |
| 17 | 题目卷、答案卷、答题卡切换后刷新，总是回到题目卷。 `workspace.ts/restore` | 已修：保存当前卷种。 |
| 18 | 切换卷种重建整段 DOM，键盘焦点掉到页面。 `workspace.ts/renderPreview` | 已修：焦点回到新选中的卷种。 |
| 19 | 模态框没有可访问名称，宽版样式还可能带到下一对话框。 `workspace.ts/openDialog` | 已修：标题关联并在重建时清理旧样式。 |
| 20 | 浏览器回退会切换底层页面，旧模态框继续留在上方。 `workspace.ts/restoreViewFromURL` | 已修：路由变化关闭旧模态框；无效路径回首页。 |

## 21–34 · 内容、交互、性能与交付

| 编号 | 原问题与定位 | 处置 |
| --- | --- | --- |
| 21 | 多词搜索要求整段连续匹配，考试名和科目之间隔着其他文本就找不到。 `workspace.ts/renderTemplates` | 已修：每个关键词独立匹配，统一全半角。 |
| 22 | 书签可带不属于当前类别的标签，标签隐藏却仍参与筛选。 `workspace.ts/renderTemplates` | 已修：丢弃当前类别不可用的标签。 |
| 23 | 键盘焦点样式全局关闭，部分输入只变浅底色。 `workspace.css` | 已修：保留明确焦点轮廓。 |
| 24 | 短时间二次点击时，前一次动作的反馈定时器可把新操作按钮改回旧标签。 `workspace.ts/action` | 已修：每个按钮只保留一个反馈定时器。 |
| 25 | 复制结果只更新按钮文字，无播报。 `workspace.ts/copyPrompt` | 已修：状态区域同步播报结果，不展开展示提示词。 |
| 26 | 导出空题库既报“尚无题目”，按钮又显示“已下载”。 `workspace.ts/downloadCurrent` | 已修：统一走动作失败路径。 |
| 27 | 系统打印改变练习为预览，打印结束后未恢复作答布局。 `session.ts/beforeprint, afterprint` | 已修：保存并恢复打印前状态；已有预览不被强制退出。 |
| 28 | 可携带字体下载没有时间上限，断网或资源卡住时导出一直等待。 `web-assets.ts/inlineFont` | 已修：限制请求时长并给出离线替代。 |
| 29 | 导出 iframe 在首次 load 之前没有超时，排版计时不会开始。 `exports.ts/exportPracticeFiles` | 已修：加载和排版各有超时，结束清理 iframe。 |
| 30 | 听力导出失败后重复拉取已成功的录音。 `delivery.ts/embedSiteAudio` | 已修：合并重复请求、有界缓存、失败资源单次重试。公网重测仍待进行。 |
| 31 | 录音请求返回 200 HTML 或空响应也会被封装成音频。 `delivery.ts/fetchRecording` | 已修：验证响应类型和字节非空。 |
| 32 | 候选卷先深拷贝完整作者数据，随后才去掉答案和来源正文。 `model.ts/questionOnly` | 已修：先投影候选字段，再复制所需内容。 |
| 33 | 上一轮公网首卷曾耗时约 12.8 秒。当前构建首卷 JS 约 0.94 MB 未压缩，之前只给外壳设预算。 `tools/build-practice-site.mjs` | 已加首卷整体预算；公网性能和进一步减包未关闭。 |
| 34 | 预览 HTML 携带全量离线听力与多语字体，独立文件仍约 58 MB。 `tools/build-practice.mjs` | 未关闭：需要拆出按需离线介质，同时保留双击和断网。 |

## 35–55 · 数据模型、选题与考试规格

| 编号 | 原问题与定位 | 处置 |
| --- | --- | --- |
| 35 | 自定义规格的 `sections` 含 `null` 时抛异常，而不是返回错误定位。 `exam-specification.ts/validateExamSpecification` | 已修：逐项先判数据类型。 |
| 36 | 缺标题、空白 ID、错误题型等可通过部分规格校验。 `exam-specification.ts/validateExamSpecification` | 已修：逐组检查名称、唯一标识、支持题型。 |
| 37 | 自定义题组可给出空组、对象而非数组，或者非法选项数。 `exam-specification.ts/validateExamSpecification` | 已修：组数、组题量、选项数均验证。 |
| 38 | 每题题型列表长度可以与题量不一致，或与该组题型冲突。 `exam-specification.ts/validateExamSpecification` | 已修：完整性及兼容性检查。 |
| 39 | 每题分值清单可以为空、过短或不合分。 `exam-specification.ts/validateExamSpecification` | 已修：校验长度、正数和合计。 |
| 40 | 单题固定分、分值清单和题组总分可以互相冲突。 `exam-specification.ts/validateExamSpecification` | 已修：校验同一分配规则。 |
| 41 | 非法起始题号、原题号列表和练习时长可以作为规格保存。 `exam-specification.ts/validateExamSpecification` | 已修：分项检查。 |
| 42 | 只检查是否有 `source`；空对象或数组也会被当成出处。 `exam-specification.ts/validateExamSpecification` | 已修：至少提供有效的来源文字，兼容既有来源记录。 |
| 43 | 附加规格的 ID 和计分制可以与试卷声明不一致。 `validate.ts`、`exam-specification.ts` | 已修：完整卷与节选都核对。 |
| 44 | 未知考试编号让试卷校验抛出，调用方拿不到字段错误。 `exam-specification.ts/validateExamStructure` | 已修：返回 `/exam/specificationId` 错误。 |
| 45 | 分组数量正确但选择题选项数不符仍判定为完整。 `exam-specification.ts/validateExamStructure` | 已修：同时核对分组题量和每题选项数，不伪造指南未固定的子组顺序。 |
| 46 | 无共享文章、错用词库格式的阅读卷仍可被判为完整。 `exam-specification.ts/validateExamStructure` | 已修：要求指定组型和共享材料。 |
| 47 | 交换整个考试大题的位置仍能通过逐组数量校验。 `exam-specification.ts/validateExamStructure` | 已修：校验大题相对顺序。 |
| 48 | 同一听力组可同时指定 URL 和内嵌音频，两者冲突时各路径取值不同。 `validate.ts` | 已修：音源必须二选一。 |
| 49 | 共享材料的笔记出处先通过原笔记校验，又被要求存在于内嵌材料表。 `validate.ts` | 已修：按出处形态使用各自的来源检查。 |
| 50 | 有长度但全是空白的题干或主观答案通过 schema。 `validate.ts` | 已修：校验有效文字。 |
| 51 | 相同题干、不同听力或阅读材料会被文本去重误删。 `bank.ts/deduplicateQuestions` | 已修：比较所属题组、选项、答案、分值和题图。 |
| 52 | “全量题库”仍按题干去重，不保证保留不同原题身份。 `bank.ts/assembleMock` | 已修：全量模式按稳定题目 ID 保留覆盖。 |
| 53 | 组卷有旧题组时，新加入但尚未归组的题从输出中消失。 `bank.ts/assembleMock` | 已修：保留原分组，并归入真正剩余的题目。 |
| 54 | 选题记录按抽取顺序保存，与最终题面顺序可能不同。 `bank.ts/assembleMock` | 已修：记录最终卷面的题序。 |
| 55 | 答案、分值或题干变化时，旧组卷 ID 可能复用旧作答记录。 `bank.ts/assembleMock` | 已修：新组卷 ID 纳入实际题面及评分字段；手工编辑的历史作答迁移尚未覆盖。 |

## 56–74 · 本机后端、Agent 工作流与发布

| 编号 | 原问题与定位 | 处置 |
| --- | --- | --- |
| 56 | 组卷重算时把题组、整卷总分统一截到两位，会与题分源失配。 `bank.ts/refreshPracticeMetadata` | 已修：保留原始分值精度；目标分选择器另行校验两位小数。 |
| 57 | 编辑题型或重排分组时，原卷仍可被标为完整规格。 `bank.ts/refreshPracticeMetadata` | 已修：检测题型与题组结构变化，转为节选。 |
| 58 | 选题会因说明包含数值而把听力/阅读专用约束替换为通用文字。 `bank.ts/refreshPracticeMetadata` | 已修：保留共享材料题组的专用要求。 |
| 59 | 打开已有自定义规格的题库生成计划时，没把自定义规格一起存下。 `workflow.ts/createPracticeJob` | 已修：继承附加规格，生成的计划可独立读取。 |
| 60 | 显式填写的完整卷题数、总分和时长会被规格直接覆盖。 `workflow.ts/createPracticeJob` | 已修：冲突以字段错误返回。 |
| 61 | 计划中的明确题目 ID 数量可与任务题数不一致。 `workflow.ts/validatePracticeJob` | 已修：抽取模式在执行前验证。 |
| 62 | 自定义组卷合并共享阅读题和无关题，或只复制文章而不复制组型与共享选项。 `workflow.ts/composePractice` | 已修：独立处理题组上下文，保留必要信息。 |
| 63 | CLI 可输出“可组卷”，虽然最终计划仍有未解决的 OCR 或要求冲突。 `tools/practice-cli.ts/preparePlan` | 已修：输出状态以最终任务和 OCR 复核状态为准。 |
| 64 | 纯文字导入会探测 Python OCR；环境缺组件时拖慢不需要 OCR 的任务。 `tools/practice-ingest.mjs/ingestPractice` | 已修：只有视觉文件触发探测，未探测记录为 `null`。 |
| 65 | 本机 CLI 可把没有可读文字的文本资料标记为可组卷。 `tools/practice-ingest.mjs/ingestPractice` | 已修：转为待核对。 |
| 66 | 读取输入计算哈希后再次读取原文件复制，两个步骤不一定拿到同一版本。 `tools/practice-ingest.mjs/ingestPractice` | 已修：原件归档用计算哈希的同一份字节。 |
| 67 | 缺答案的题显示已成功入库的序号，而不是资料题号。 `materials.ts/parseQuestionText` | 已修：直接报告原题号。 |
| 68 | 空题干、空选项、不完整答案或零分题能混入文字提取结果并拖累整个文件。 `materials.ts/parseQuestionText` | 已修：保留原文，逐题列为待核对。 |
| 69 | 普通讲义没有编号题就产生警告，用户会误以为导入失败。 `materials.ts/parseQuestionText` | 已修：普通资料按资料保存，只有确切缺项才提示。 |
| 70 | 直接运行站点构建可跳过专题校验，并把旧目录的新内容或误标 ID 发出去。 `tools/build-practice-site.mjs` | 已修：构建本身检查专题校验和、试卷 ID 和作者结构。 |
| 71 | 构建输出可误指到源码目录。 `tools/build-practice-site.mjs` | 已修：仓库内只允许专用 `dist/` 子目录，拒绝源码目录和仓库祖先目录。 |
| 72 | 七个旧的扫描/缩略图资产与入口仍留在源码，材料文档还声称网页展示原页缩略参考。 `src/practice/*pages.json`、`docs/exam-materials.md` | 已修：删除约 30 MB 死资产及旧入口，更新来源说明。 |
| 73 | Pages 发布只有类型和构建检查，没有持续的浏览器交互、打印或实际题文验收。 `.github/workflows/pages.yml` | 未关闭：本次执行了定向浏览器与 CLI 回归；尚未建立跨浏览器发布门禁，也未逐题独立重解 821 道专题题。 |
| 74 | 实际渲染中，统一卷头没有显示考试时长、总分；必须打开工作台才看得到。 `generated-paper.ts/useCatalogLayout` | 已修：卷头用一行显示，区分建议时长与练习权重。 |

## 仍需明确的限制

- 浏览器写作记录与题库历史仍是单设备数据；跨标签同时编辑没有冲突合并。
- 文本导入不自动生成题目和评分。结构校验只能核对字段、出处与分值约束，不能证明数学推导或开放题答案正确。
- 本地整改与当前 GitHub Pages 的发布状态分开记录，不能用本地构建结果替代线上验证。
