# API Test and Resume Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify the current model configuration and resume an interrupted multi-batch translation without resending completed batches.

**Architecture:** The translation core performs a short connection request and reports each completed batch through an optional callback. The CEP panel persists batches in the existing job snapshot and selects only missing translations on retry; a deliberate retranslation clears old unreviewed drafts before beginning.

**Tech Stack:** CEP 9 JavaScript, Node HTTPS, node:test.

**Spec:** `docs/superpowers/specs/2026-10-26-api-test-resume-design.md`

## Global Constraints

- Keep the API Key only in panel memory, never in localStorage or diagnostic output.
- Use the current configured endpoint and model; no automatic provider switch.
- Do not send manual text during connection testing.
- Preserve completed batches and user-reviewed edits on API failure.
- This directory has no Git repository, so commit steps do not apply.

## Review Focus

- 401/403 stops without retry and suggests checking Key and region.
- 429/5xx/network retries at most three times, then preserves prior batches.
- Restarting the panel restores partial translation and selects only missing entries.
- Deliberate retranslation protects reviewed edits.
- Connection test changes no document or job state.

### Task 1: Translation core

**Files:** Modify `extension/js/core/translation.js`; test `tests/translation.test.js`.

**Interfaces:** `testConnection(config, transport): Promise<boolean>`; `translateSegments(segments, glossary, config, transport, onBatch?)` invokes `onBatch(batchResults)` after each parsed batch.

- [x] Add failing tests for short connection request, partial batch callback on later failure, and auth failure without retry.
- [x] Run `node --test tests/translation.test.js` and confirm failures.
- [x] Implement connection test, batch callback, and propagated error status.
- [x] Run `node --test tests/translation.test.js` and confirm pass.

### Task 2: Panel workflow

**Files:** Modify `extension/index.html`, `extension/js/panel.js`, `extension/css/panel.css`; test `tests/panel.test.js`.

**Interfaces:** `testApi` button in advanced settings; panel persists each onBatch result, shows progress, retries only missing translations, and maps HTTP errors to Chinese guidance.

- [x] Add failing panel tests for test button, partial progress and resume, and deliberate retranslation that preserves reviewed edits.
- [x] Run `node --test tests/panel.test.js` and confirm failures.
- [x] Implement the panel changes and concise status messages.
- [x] Run `node --test tests/panel.test.js` and confirm pass.

### Task 3: Delivery

**Files:** Modify `README.md`; update installed CEP extension and `dist/illustrator-manual-translator-0.1.0.zip`.

- [x] Document test call and resume behavior.
- [x] Run `npm test` and inspect all results (33 passed).
- [x] Sync the installed plugin and rebuild ZIP.
- [x] Check extension hashes in workspace, installed copy, and ZIP.
