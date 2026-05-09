# 小手机工作记录

每次修改项目都要在这里追加记录。记录只写本次真实发生的事情，不写未来愿望。

## 记录格式

```md
## YYYY-MM-DD 标题

- 范围：改了哪些模块或文件。
- 原因：为什么要改。
- 内容：实际做了什么。
- 文档：同步了哪些文档。
- 验证：跑了哪些命令，结果如何。
- 后续：还剩什么明确事项。
```

## 2026-05-10 生活系统框架和文档规则

- 范围：新增总框架文档和工作记录规则，更新项目维护流程。
- 原因：后续小手机要先有文档框架，再按模块逐步实现；每次修改都需要留下可追踪记录。
- 内容：新增 `docs/life-system-framework.md`，定义手机壳层、生活 App 层、生活事件层、角色记忆层、主动事件层；新增 `docs/work-log.md` 作为每次修改的记录入口。
- 文档：同步 `CLAUDE.md` 和 `PROJECT_OUTLINE.md` 的文档维护要求。
- 验证：`npm run lint` 通过；`npm run build` 通过，保留 Vite chunk 体积提示。
- 后续：下一轮如果开始实现，应先从生活事件结构或锁屏通知中心二选一写具体设计。

## 2026-05-10 App 壳第一刀拆分

- 范围：手机壳桌面 App 目录和 `src/App.tsx` 顶层依赖。
- 原因：`src/App.tsx` 仍是巨型入口，后续锁屏、通知中心和生活事件接入前，需要先从低风险的纯目录数据开始拆。
- 内容：新增 `src/shell/appCatalog.tsx`，把桌面分页图标和 Dock 图标从 `src/App.tsx` 抽出；新增 `src/shell/appCatalog.test.ts`，校验目录数量、分页、Dock 顺序和 screen 去重；`src/App.tsx` 改为从 shell catalog 导入目录数据。
- 文档：新增 `docs/superpowers/plans/2026-05-10-app-shell-split.md`，同步 `PROJECT_OUTLINE.md`。
- 验证：`npx tsx src/shell/appCatalog.test.ts` 通过；全部 `src/**/*.test.ts` 通过；`npm run lint` 通过；`npm run build` 通过，保留 Vite chunk 体积提示；源码中未发现 `crypto.randomUUID` / `randomUUID` 直调。
- 后续：下一刀可拆 `FeatureScreen` 路由，或继续拆 `Desktop` / `AppIcon` / `Draggable` 到 `src/shell/`。

## 2026-05-10 每个软件独立文件夹

- 范围：微信、B站、小红书、电话四个已成型软件的目录结构。
- 原因：用户明确要求每个软件是一个文件夹，后续扩展音乐、QQ、备忘录升级时也要遵守 `src/apps/<软件名>/` 的组织方式。
- 内容：新增 `src/apps/appsStructure.test.ts`；移动微信到 `src/apps/wechat/`，B站到 `src/apps/bilibili/`，小红书到 `src/apps/xiaohongshu/`，电话到 `src/apps/phone/`；软件相关测试也跟随移动；更新 `src/App.tsx` 和 `src/store.ts` import。
- 文档：新增 `docs/superpowers/plans/2026-05-10-app-folder-layout.md`，同步 `PROJECT_OUTLINE.md`、`docs/wechat.md`、`docs/bilibili-plan.md` 和相关 `模块/*/README.md`。
- 验证：`npx tsx src/apps/appsStructure.test.ts` 通过；全部 `src/**/*.test.ts` 通过；`npm run lint` 通过；`npm run build` 通过，保留 Vite chunk 体积提示；源码中未发现 `crypto.randomUUID` / `randomUUID` 直调。
- 后续：下一轮拆未成型软件时，按同样规则建立 `src/apps/music/`、`src/apps/memo/`、`src/apps/qq/` 等目录，不再把软件代码直接放在 `src/` 根目录。
