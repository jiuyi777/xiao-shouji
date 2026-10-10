# 应用源码

## 2026-10-10维护导航

- 职责：应用源码（src）。
- 当前阶段与下一步：[总计划](../MAINTENANCE_OUTLINE.md)、[NEXT](../NEXT.md)。本目录不另记独立进度。
- 数据/发布红线：[保护清单](../docs/PROTECTION_AND_RELEASE.md)。只提交与软件直接相关的源码、必要说明和实际运行资源。
- 直接文件：`App.deepseekResponse.test.ts`、`App.tsx`、`index.css`、`lifeEvents.test.ts`、`lifeEvents.ts`、`main.tsx`、`mobileStorageOrigin.test.ts`、`mobileWebFontInlining.test.ts`、`removedDefaultCharacters.ts`、`store.ts`、`storeAppIconOverrides.test.ts`、`storeCharacterCleanup.test.ts`、`storeCharacterCleanup.ts`、`storeChatMessages.test.ts`、`storeChatPresetEntries.test.ts`、`storeChatPresetMigration.test.ts`、`storeFontStyle.test.ts`、`storeNoDefaultCharacters.test.ts`、`storePersistence.test.ts`、`storePersistence.ts`、`storeProviderProfiles.test.ts`、`storeQqFeeds.test.ts`、`storeTtsMigration.test.ts`、`storeUserProfileBindings.test.ts`、`tts.test.ts`、`tts.ts`、`ttsAudioCache.test.ts`、`ttsAudioCache.ts`、`ttsProxyPolicy.test.ts`、`ttsProxyPolicy.ts`、`ttsQueue.test.ts`、`ttsQueue.ts`
- 子目录：`apps/`、`assets/`、`backup/`、`components/`、`lib/`、`presets/`、`shell/`、`themes/`
- 修改入口、数据结构或共享逻辑后，同步本说明和总表对应任务；查调用方、保存、重开恢复，不能仅看页面。
- 原有文件、备份、测试、许可证不能按名称猜测删除。新功能数据应复用明确权威来源，不建立第二份同义存档。
