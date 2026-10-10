# 构建与测试

## 2026-10-10维护导航

- 职责：构建与测试（scripts）。
- 发布检查：`check-public-files.mjs --staged` 检查暂存区，`--tracked` 检查当前追踪文件；`prepare-release-files.mjs` 仅挑指定APK和公告创建新交付目录，不上传、不覆盖现有目录。
- 当前阶段与下一步：[总计划](../MAINTENANCE_OUTLINE.md)、[NEXT](../NEXT.md)。本目录不另记独立进度。
- 数据/发布红线：[保护清单](../docs/PROTECTION_AND_RELEASE.md)。只提交与软件直接相关的源码、必要说明和实际运行资源。
- 直接文件：`ascii-node-host.cjs`、`doubao-tts-smoke-test.ts`、`full-appearance-visual-audit.mjs`、`make-mobile-app-cover-icon.mjs`、`mobile-export-login-regression.test.mjs`、`mobile-export-native-bridge.test.mjs`、`nai-model-matrix-smoke-test.ts`、`nai-smoke-test.ts`、`qa-v12.mjs`、`run-tests.mjs`、`selected-theme-visual-regression.mjs`、`test-apk-upgrade.ps1`、`theme-identity-visual-regression.mjs`、`v112-ui-regression.mjs`、`wechat-proactive-image-smoke-test.ts`
- 无子目录。
- 修改入口、数据结构或共享逻辑后，同步本说明和总表对应任务；查调用方、保存、重开恢复，不能仅看页面。
- 原有文件、备份、测试、许可证不能按名称猜测删除。新功能数据应复用明确权威来源，不建立第二份同义存档。
