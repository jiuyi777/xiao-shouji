# B站模块

## 当前入口

- 桌面第二屏 `B站` 图标：`src/App.tsx` -> `FeatureScreen` -> `BilibiliScreen`。
- 真实 UI：`src/apps/bilibili/BilibiliScreen.tsx`。
- 生成和解析：`src/apps/bilibili/bilibiliLogic.ts`。
- 类型：`src/apps/bilibili/bilibiliTypes.ts`。
- 状态：`src/store.ts` 的 `bilibiliEntries`、`bilibiliSearches` 和相关 actions。

## 当前能力

- 展示独立 B站视频流，不再使用通用占位页。
- 搜索关键词后生成 B站视频条目。
- 模型可用时尝试严格 JSON 生成；失败或未配置模型时使用本地 fallback。
- 解析模型结果时过滤外站链接，只保存 B站或 `phone://bilibili/` 模拟条目。
- 条目支持详情页、弹幕、评论、收藏和观看记录。

## 维护边界

- 不在本模块里抓取真实 B站网页。
- 不下载或抽取 B站音频。
- 不复用浏览器通用搜索结果类型；B站条目使用 `BilibiliVideoEntry`。
- 修改持久化字段时同步提升 `src/store.ts` persist version，并更新 `PROJECT_OUTLINE.md`。
