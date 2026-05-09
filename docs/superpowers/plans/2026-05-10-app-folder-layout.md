# App Folder Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put each real phone software module under `src/apps/<app-name>/`.

**Architecture:** Keep shared shell, store, utils, and global CSS outside `src/apps/`. Move app-owned UI, logic, and tests into per-app folders, then update imports and maintenance docs without changing behavior.

**Tech Stack:** Vite, React, TypeScript, Zustand, existing `npx tsx` tests.

---

## File Structure

- `src/apps/wechat/`: WeChat tabs, AI helpers, stickers, chat bubble splitting helper, and WeChat structure tests.
- `src/apps/bilibili/`: B站 screen, types, logic, and tests.
- `src/apps/xiaohongshu/`: 小红书 screen, types, logic, and tests.
- `src/apps/phone/`: Phone screen and phone tests.
- `src/apps/appsStructure.test.ts`: verifies the required app folders exist.

## Tasks

### Task 1: Add App Folder Structure Test

- [x] Create `src/apps/appsStructure.test.ts`.
- [x] Run `npx tsx src/apps/appsStructure.test.ts` and confirm it fails before folders are moved.

### Task 2: Move Existing App Modules

- [x] Move `src/wechat/` to `src/apps/wechat/`.
- [x] Move `src/bilibili/` to `src/apps/bilibili/`.
- [x] Move `src/xiaohongshu/` to `src/apps/xiaohongshu/`.
- [x] Move `src/PhoneScreen.tsx` and phone tests to `src/apps/phone/`.
- [x] Move WeChat-specific helper tests to `src/apps/wechat/`.

### Task 3: Fix Imports

- [x] Update `src/App.tsx`.
- [x] Update `src/store.ts`.
- [x] Update moved app files so shared imports point back to `src/store.ts`, `src/lib/`, and `src/tts.ts`.

### Task 4: Verify

- [x] Run app folder structure test.
- [x] Run all `src/**/*.test.ts`.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.

### Task 5: Document

- [x] Update `PROJECT_OUTLINE.md`.
- [x] Update module README files for moved apps.
- [x] Append `docs/work-log.md`.
