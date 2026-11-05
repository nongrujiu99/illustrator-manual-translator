# 多语言与选中文字框翻译实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 Illustrator 插件中选择目标语言，并直接翻译选中的文字框对象。

**Architecture:** CEP 面板共用模型配置与语言选择。翻译层接收目标语言；ExtendScript 增加独立于批量扫描的选区读取与回写接口。手动操作先取得全部译文再改写选中对象，批量任务按语言隔离缓存。

**Tech Stack:** CEP、ExtendScript、ES5 面板脚本、Node.js 测试、Illustrator CC 2019。

**Spec:** `docs/superpowers/specs/2026-10-26-multilingual-selection-design.md`

## Global Constraints

- 保留现有批量中文翻译和工作副本流程。
- 手动操作仅改选中的文字框对象，不自动保存。
- 目标语言同时影响批量和手动翻译；缓存须区分语言。
- 可编辑文字、对象位置与非文字内容保持不变。

## Review Focus

- 英文源文本在手动模式下不能被英语词组保护规则整体吞掉。
- 文字编辑状态的 TextRange 或插入点不能被当成文字框对象。
- 网络失败或空译文不能触发回写。
- 翻译请求期间改变文档或选区时不能改写旧对象。
- 切换语言不能重用上一语言的缓存或输出文件名。

---

### Task 1: 目标语言进入翻译请求

**Files:** `extension/js/core/translation.js`, `extension/js/core/segments.js`, `tests/translation.test.js`, `tests/segments.test.js`。

**Interfaces:** `translateSegments(segments, glossary, config, transport, onBatch)` 从 `config.targetLanguage` 读取语言；新增手动分段函数，只保护严格的技术参数。

- [x] 写目标语言 prompt 和英文源手动分段的失败测试。
- [x] 运行相关测试并确认因缺少功能失败。
- [x] 实现最小改动，保持英语为默认。
- [x] 运行相关测试和全量测试。

### Task 2: Illustrator 选区桥接与直接回写

**Files:** `extension/host/bootstrap.jsx`, `extension/js/bridge.js`, `tests/host.test.js`, `tests/bridge.test.js`。

**Interfaces:** `TranslatorHost.scanSelection()` 返回选中文字框清单；`TranslatorHost.applySelection(payload)` 校验捕获对象及源文字后原位写入；桥接允许这两个方法。

- [x] 写选中对象、混选、空选区、变化后拒绝写回的失败测试。
- [x] 运行相关测试并确认失败原因。
- [x] 实现选区读取与原位写回；复用版面适配原则。
- [x] 运行相关测试和全量测试。

### Task 3: 面板交互与交付

**Files:** `extension/index.html`, `extension/js/panel.js`, `extension/css/panel.css`, `tests/panel.test.js`, `README.md`, `dist/illustrator-manual-translator-0.1.0.zip`。

**Interfaces:** 面板语言选择、手动按钮、状态信息；批量缓存按语言隔离，输出语言后缀。

- [x] 写无需预扫即可手动翻译、失败不回写、语言切换隔离缓存的失败测试。
- [x] 运行测试并确认预期失败。
- [x] 实现面板交互并保持单页进度展示。
- [x] 运行全量测试，更新文档和打包。
- [x] 在 CC 2019 实测选区读取和回写；更新已安装插件并核对文件。
