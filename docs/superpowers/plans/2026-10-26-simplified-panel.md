# Simplified Illustrator Translation Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show only the Illustrator translation controls relevant to the current step.

**Architecture:** Keep the existing host and translation modules. Add progressive sections and collapsed disclosures to the CEP panel, with a small `updateView` state function. Render review rows only when its disclosure opens.

**Tech Stack:** CEP 9 HTML/CSS, ES2017 JavaScript, Node `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-26-simplified-panel-design.md`

## Global Constraints

- Illustrator CC 2019 remains supported.
- Process all artboards; translate only Chinese editable text; preserve existing English.
- Do not persist the API Key; do not alter document writeback behavior.
- This directory has no Git repository, so commit steps are inapplicable.

## Review Focus

- Scan failure leaves later sections hidden and provides an actionable error.
- New scan hides prior translation, application, and save state.
- A restored job shows the correct next step without revealing stale data.
- Expanding review loads text rows and allows editing before applying.
- Writeback failure does not expose an enabled save button.

### Task 1: Progressive panel states

**Files:** Modify `extension/index.html`, `extension/css/panel.css`, `extension/js/panel.js`; test `tests/panel.test.js`.

**Interfaces:** `updateView(phase)` sets visible sections and primary actions; `showSegments()` renders the editor when expanded.

- [x] Add failing panel tests for initial, scanned, translated, and applied visibility; lazy review; scan failure/reset.
- [x] Run `node --test tests/panel.test.js` and confirm expected failure.
- [x] Implement the phased markup, CSS, and panel state transitions.
- [x] Run `node --test tests/panel.test.js` and confirm pass.

### Task 2: Delivery

**Files:** Modify `README.md`, installed CEP extension, and `dist/illustrator-manual-translator-0.1.0.zip`.

**Interfaces:** Existing installation script `tools/update-dev.ps1` copies extension files.

- [x] Update README to match the new controls.
- [x] Run `npm test` and inspect all results (14 passed).
- [x] Update the installed development extension and rebuild ZIP.
- [x] Confirm installed files match workspace files and ZIP contains the new panel.
