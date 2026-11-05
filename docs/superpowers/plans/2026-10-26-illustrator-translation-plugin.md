# Illustrator 说明书翻译插件 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Illustrator 中处理当前说明书的全部画板，将可编辑中文文字翻译成英语，保持原位并另存可编辑 `.ai`，对无法自动排好的对象给出可定位报告。

**Architecture:** CC 2019 使用 CEP 9 面板和 ExtendScript 宿主脚本。面板读取当前文档的对象清单、调用可配置的外部大模型接口并提供校对；宿主脚本在工作副本上回写文字、排版检查并保存。`.ai` 与已在 Illustrator 打开的 PDF 走同一套当前文档流程。

**Tech Stack:** Illustrator CC 2019（ILST 23 / CEP 9）、CEP HTML/CSS/JavaScript、ExtendScript JSX、Node.js 内置 `node:test` 用于纯逻辑测试、OpenAI 兼容的 HTTPS 聊天接口（URL/模型/密钥由用户配置）。

**Spec:** `docs/superpowers/specs/2026-10-26-illustrator-manual-translation-design.md`

## Global Constraints

- 输入是已在 Illustrator 中打开的当前文档；插件不要求用户选择 `.ai` 或 PDF 类型。
- 翻译当前文件的所有画板；首版不批量处理文件夹。
- 仅翻译中文内容；已有英文、全英文文字框和空白画板保持原样。中英混合文字框必须保护现有英文，无法可靠分段时报告人工处理。
- 输出为另存的可编辑 `.ai`；原文件不能被覆盖。
- 文字保持原位置；可小幅缩小字号或行距，默认最大缩字 10%，仍溢出时报告并保留全文。
- 不处理扫描件、转曲文字及图片内文字。
- 兼容基线为 Illustrator CC 2019；CS6 不在范围内；更新版本需实际验证。
- 允许向外部大模型发送需要翻译的文字和必要上下文；不上传整个原稿；密钥不写入日志或任务快照。
- 开始实际插件开发前需要用户提供至少一份真实 `.ai` 和一份真实 PDF 供只读导入检查；没有样例时仅能完成合成文档验证，不能声称 PDF 保真验收通过。

## 已收到样例的只读预检（2026-10-26）

- 项目目录现有 `F3TEST.ai` 与 `F3TEST.pdf`。两者的 PDF 兼容层均为 44 页，逐页提取的文字相同；抽查页面外观基本一致。这是一套说明书的两种文件形式，不能替代更多版式的兼容样例。
- PDF 兼容层总计 606 个文字 span、约 7221 个字符；17 页未提取到文字。抽看的部分无文字页是空白页，但正式清单仍以 Illustrator 当前文档中的对象为准。
- `.ai` 文件检测到 Illustrator 私有编辑数据标记，PDF 未检测到同类标记。此观察不能代替在 CC 2019 中打开后的文字框检查。
- 样例部分页面已同时有中文和英文，另有独立英文页。用户确认仅翻译中文，保留现有英文和空白画板；Task 2 和 Task 3 须覆盖这一规则。

## Review Focus

1. PDF 导入后同一段文字拆成多个框：预检应报告碎片化，不能把译文随意写入某一小框。由 Task 2 的合成碎片样例和 Task 6 的真实 PDF 检查覆盖。
2. 隐藏、锁定、画板外文字：不得静默修改或遗漏报告。由 Task 2 的 Illustrator 样例检查覆盖。
3. 跨画板及串接文字框：不得重复翻译或截断。由 Task 2 的对象清单测试及 Task 4 的回写测试覆盖。
4. 已有英文、型号、数字和单位：翻译服务不得更改；空白画板不进入任务。由 Task 2、Task 3 的纯逻辑测试和 Task 6 的真实样例检查覆盖。
5. 英文溢出和混合样式：不得丢字或悄悄把整框统一成一个样式。由 Task 4 的 Illustrator 样例检查覆盖。

---

## 文件结构

- `extension/CSXS/manifest.xml`：CEP 9 / Illustrator ILST 23+ 扩展声明。
- `extension/index.html`、`extension/css/panel.css`、`extension/js/panel.js`：单一面板的预检、翻译、校对和异常列表。
- `extension/js/bridge.js`：面板与 ExtendScript 的受限 RPC；仅允许 `scan`、`apply`、`locate`、`saveCopy`。
- `extension/js/core/segments.js`：从对象清单生成翻译段落，保护不可翻译标记。
- `extension/js/core/translation.js`：模型请求、结构校验、重试及译文映射。
- `extension/js/core/job.js`：任务状态、校对修改、异常与恢复快照。
- `extension/js/core/*.js` 同时暴露给 CEP 面板和 Node `require`，保持纯逻辑文件不依赖 Illustrator 全局对象。
- `extension/host/bootstrap.jsx`、`extension/host/scan.jsx`、`extension/host/apply.jsx`、`extension/host/save.jsx`：Illustrator 当前文档读取、回写、定位与另存。
- `tools/install-dev.ps1`：将扩展安装到当前用户的 CEP 扩展目录；只在实施时执行。
- `tests/segments.test.js`、`tests/translation.test.js`、`tests/job.test.js`：可在 Node 中运行的纯逻辑测试。
- `tests/illustrator-fixtures/create-fixtures.jsx`、`tests/illustrator-fixtures/smoke.jsx`：在 CC 2019 内生成和检查多画板、隐藏/锁定、串接、混合样式、溢出等情形。
- `README.md`、`package.json`：安装、运行与测试命令。当前目录还不是 Git 仓库，首次实施时初始化后再按任务提交。

## Task 1: CC 2019 宿主能力验证与最小 CEP 面板

**Files:** Create `extension/CSXS/manifest.xml`, `extension/index.html`, `extension/js/bridge.js`, `extension/host/bootstrap.jsx`, `tests/illustrator-fixtures/create-fixtures.jsx`, `tests/illustrator-fixtures/smoke.jsx`, `tools/install-dev.ps1`, `README.md`, `package.json`.

**Interfaces:** `bridge.invoke(method, payload, callback)` 将白名单方法发送至 `TranslatorHost[method](encodedPayload)`；宿主方法返回 JSON 字符串 `{ok, data, error}`。`TranslatorHost.scan()` 此任务先返回文档名、画板数和文字框数。

- [ ] **Step 1: 在 CC 2019 中完成真实样例预检。** 使用已提供的 `F3TEST.ai` 与 `F3TEST.pdf`，分别打开并记录画板、文字框、字体、PDF 链接/碎片化情况。上面的 PDF 兼容层检查已经完成；此步要补齐 Illustrator 对象层检查。原稿不写入 Git。
- [ ] **Step 2: 建立可复现的宿主样例。** `create-fixtures.jsx` 在 CC 2019 创建两个画板及普通/区域/路径/串接文字框，并另存临时 `.ai`；`smoke.jsx` 断言画板和文字框数量、`lines` 可访问性、在副本上改字后仍为文字对象。
- [ ] **Step 3: 运行样例并记录结果。** 在 Illustrator 的“文件 → 脚本 → 其他脚本”执行；预期 `smoke.jsx` 输出逐项 PASS。若面积文字的溢出无法由脚本稳定识别，先记录可复现实例与可行检测方法，再进入 Task 4。
- [ ] **Step 4: 建立 CEP 9 面板和受限 RPC。** `manifest.xml` 声明 ILST 23 起；面板显示当前文档名、画板数和文字框数；`bridge.invoke` 仅允许四个预定方法，并对载荷编码，防止文字中的引号破坏 JSX 调用。
- [ ] **Step 5: 安装并在 CC 2019 打开面板。** `tools/install-dev.ps1` 安装到当前用户扩展目录；在 Illustrator 打开合成文档，面板显示预期计数；空文档和无活动文档返回可读错误。安装脚本须检查目标路径，不能覆盖其他扩展。
- [ ] **Step 6: 初始化 Git 并提交。** 提交设计、计划、宿主样例和最小面板；不把生成的 `.ai`、密钥或用户原稿提交进去。

## Task 2: 全画板文字预检与对象映射

**Files:** Create `extension/host/scan.jsx`, `extension/js/core/segments.js`, `tests/segments.test.js`; modify `extension/host/bootstrap.jsx`, `tests/illustrator-fixtures/create-fixtures.jsx`, `tests/illustrator-fixtures/smoke.jsx`.

**Interfaces:** `TranslatorHost.scan()` 产出 `DocumentSnapshot`：`{documentName, artboards, frames, issues}`。每个 `Frame` 含 `sessionId`（本次扫描中的序号）、`artboardIndex`、`sourceText`、`kind`、`bounds`、`styleRuns`、`flags`。`segments.createSegments(snapshot)` 返回 `{segments, issues}`；每个段落保存源 `sessionId` 列表。

- [ ] **Step 1: 写纯逻辑失败测试。** `tests/segments.test.js` 断言正常中文框映射到所属画板、纯英文框与空白画板跳过、中英混合框仅中文片段进入翻译或在不可可靠分段时进入 `issues`；碎片框被列为待确认、跨画板/串接框只出现一次、隐藏/锁定/画板外对象不进入自动翻译清单。
- [ ] **Step 2: 运行 `node --test tests/segments.test.js`。** 预期因 `createSegments` 尚未定义而失败。
- [ ] **Step 3: 实现 `segments.createSegments(snapshot)`。** 将对象映射与排除规则置于纯 JS；未知归属或不可靠的多框拼接一律标记复核，不推测阅读顺序。
- [ ] **Step 4: 实现宿主扫描。** 在 `scan.jsx` 遍历当前文档文字对象及画板；记录层可见性、锁定状态、样式段、几何范围和相邻/串接关系；扫描不得改动文档。回写前必须重新校验 `sessionId` 对应对象的原文与位置。
- [ ] **Step 5: 验证。** `node --test tests/segments.test.js` 全部 PASS；`smoke.jsx` 在合成文档断言两个画板、组内文字、隐藏/锁定、跨画板和串接对象的清单行为；提交。

## Task 3: 外部大模型翻译与可恢复校对任务

**Files:** Create `extension/js/core/translation.js`, `extension/js/core/job.js`, `tests/translation.test.js`, `tests/job.test.js`; modify `extension/js/core/segments.js`, `package.json`.

**Interfaces:** `translation.translateSegments(segments, glossary, config, transport, callback)` 返回与每个段落 ID 对应的英文及校验错误；`config` 为 `{endpoint, model, apiKey}`，只允许 HTTPS。`job.create(snapshot)`、`job.setTranslation(id, text)`、`job.serialize()` 和 `job.restore(json)` 管理任务，但序列化结果不含密钥。

- [ ] **Step 1: 写失败测试。** 模拟模型响应，断言翻译结果与段落 ID 一一对应；原有英文、型号 `AB-1200`、`220 V`、数字和单位保持；遗漏、重复 ID 或被改写的保护标记产生错误；HTTP 超时与限流可重试；任务快照恢复后译文及人工修改保留，但没有 `apiKey`。
- [ ] **Step 2: 运行 `node --test tests/translation.test.js tests/job.test.js`。** 预期失败。
- [ ] **Step 3: 实现分段与保护标记。** `segments.protectTokens(text)` 返回 `{template, tokens}`，将已有英文片段、型号、数字与单位作为占位符；翻译完成后按标记复原并校验，不让模型自由重写已有英文或技术参数。无法可靠区分中文和已有英文时标记人工复核。
- [ ] **Step 4: 实现翻译客户端和任务状态。** `translateSegments` 使用可注入的 HTTPS transport、结构化 JSON 提示和有界重试；任务支持校对修改与从本地快照恢复。密钥仅保存在面板会话内，错误信息不含请求头或密钥。
- [ ] **Step 5: 验证。** 两个测试文件全部 PASS，并用假 transport 跑包含标题、正文、参数与警告语的完整段落集合；提交。

## Task 4: 回写、样式保留与溢出处理

**Files:** Create `extension/host/apply.jsx`; modify `extension/host/bootstrap.jsx`, `tests/illustrator-fixtures/create-fixtures.jsx`, `tests/illustrator-fixtures/smoke.jsx`.

**Interfaces:** `TranslatorHost.apply(payload)` 接收 `{documentFingerprint, tempAiPath, changes:[{sessionId, sourceText, bounds, translation}]}`，先将当前文档另存为临时 `.ai` 工作副本，再在该副本回写，返回 `{workingCopyPath, applied, issues}`；`TranslatorHost.locate({sessionId})` 选择对应对象并激活所属画板。`tempAiPath` 必须是插件专用任务目录中的新路径。

- [ ] **Step 1: 扩充 Illustrator 失败样例。** 建立普通、区域、路径、混合样式、串接文字和有意溢出的框；断言回写前后非文字对象数量与坐标不变，文字仍可编辑，源文档不被覆盖。
- [ ] **Step 2: 在 CC 2019 运行 `smoke.jsx`。** 预期新断言失败，记录具体对象类型。
- [ ] **Step 3: 实现身份与冲突校验及工作副本。** 回写前核对文档指纹、`sessionId`、原文和几何；用户在等待翻译时改动了对象则只报冲突，不覆盖其修改。验证临时路径后用 Illustrator 另存为 `.ai` 工作副本，后续更改只作用于副本。
- [ ] **Step 4: 实现替换与适配。** 在保留框位置、样式段和完整译文的前提下先调整换行，再小幅调整行距，最后将字号降至原始值的至少 90%；对面积文字使用 Task 1 在 CC 2019 实测有效的溢出判定。路径或串接文字无法安全适配时直接标记人工处理。不得裁字。
- [ ] **Step 5: 验证。** 合成文档各对象类型逐项 PASS；`locate` 能定位异常框；抽查输出 `.ai` 中译文仍为文字且非文字对象未移动；提交。

## Task 5: 面板流程、保存副本与任务恢复

**Files:** Create `extension/css/panel.css`, `extension/js/panel.js`, `extension/host/save.jsx`; modify `extension/index.html`, `extension/host/bootstrap.jsx`, `extension/js/core/job.js`, `tests/job.test.js`, `README.md`.

**Interfaces:** 面板顺序为“预检 → 填入模型配置/术语 → 翻译 → 校对 → 应用 → 异常定位 → 另存”；`TranslatorHost.saveCopy({targetPath})` 仅接受新 `.ai` 路径，并返回实际保存路径。

- [ ] **Step 1: 写任务状态失败测试。** 断言翻译失败可仅重试失败段、校对过的译文不被重试覆盖、未应用时不能保存英语版、与现有文件同名的目标路径拒绝覆盖、恢复快照时需重新核对文档指纹。
- [ ] **Step 2: 运行 `node --test tests/job.test.js`。** 预期失败。
- [ ] **Step 3: 实现面板界面和任务状态。** 显示逐画板进度、原译文列表、术语表、可修改译文和异常定位；不出现 `.ai`/PDF 类型切换。密钥输入只存在当前会话，快照保存至用户数据目录。
- [ ] **Step 4: 实现 `saveCopy`。** 通过 Illustrator 的另存机制生成新 `.ai`，禁止与源文件或已有文件同路径；保存失败显示原因并保持任务状态以便重试。
- [ ] **Step 5: 验证。** 单元测试 PASS；在 CC 2019 面板中完成合成文档的完整流程，关闭并重开面板后恢复任务；检查原文件字节未改变、英语版可打开并编辑；提交。

## Task 6: 真实样例验收、安装文档与兼容边界

**Files:** Modify `README.md`, `tests/illustrator-fixtures/smoke.jsx`，必要时仅修复前五项中暴露的缺陷。

**Interfaces:** 无新增公共接口。输出一个逐画板验收记录，列出原稿、导入方式、文字框数量、异常数量、视觉核对结果和 Illustrator 版本。

- [ ] **Step 1: 使用 Task 1 已收集的真实样例。** 确认 PDF 是以可编辑方式在 Illustrator 中打开，并覆盖全部需要处理的页面；原稿仍不进入 Git。
- [ ] **Step 2: 只读预检两个样例。** 对比插件文字清单与人工看到的画板文字，确认 PDF 的碎片、字体、阅读顺序和链接对象行为；检查现有英文与空白画板均不进入翻译清单，将发现写入验收记录。
- [ ] **Step 3: 使用测试用模型配置生成译文并另存副本。** 逐画板核对源图形没有意外改变、译文没有遗漏或截断、异常可以定位、英文仍可编辑；对缺陷回到对应任务修复并重跑其验证。
- [ ] **Step 4: 验证兼容边界。** 在可获得的更新版 Illustrator 上重复面板打开、扫描、翻译与保存；未实测的版本仅标记为“待验证”，不宣称兼容。
- [ ] **Step 5: 完成安装和使用文档并提交。** 记录所需 Illustrator 版本、API 配置、PDF 正确打开方式、缩字上限、异常含义以及隐私范围；运行 `node --test tests/*.test.js` 并确认全部 PASS。

## 计划自检

- 设计方案中的当前文档、所有画板、可编辑 `.ai`、原稿保留、翻译校对、术语、溢出、异常定位与 PDF 风险均对应到 Task 1–6。
- 五项 Review Focus 均有对应的合成或真实样例检查。
- 真实文件尚未提供，因此 Task 6 的最终保真结论需要以用户样例为准；无样例时不能把该任务标记完成。
