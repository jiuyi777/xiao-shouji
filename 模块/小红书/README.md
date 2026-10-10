## 2026-10-10维护导航

- 职责：模块/小红书（模块/小红书）。
- 当前阶段与下一步：[总计划](../../MAINTENANCE_OUTLINE.md)、[NEXT](../../NEXT.md)。本目录不另记独立进度。
- 数据/发布红线：[保护清单](../../docs/PROTECTION_AND_RELEASE.md)。只提交与软件直接相关的源码、必要说明和实际运行资源。
- 当前无直接实现文件，不将空目录计为已完成功能。
- 无子目录。
- 修改入口、数据结构或共享逻辑后，同步本说明和总表对应任务；查调用方、保存、重开恢复，不能仅看页面。
- 原有文件、备份、测试、许可证不能按名称猜测删除。新功能数据应复用明确权威来源，不建立第二份同义存档。

---

以下为原有说明；旧路径或阶段与上方当前导航冲突时，以当前源码和总表为准。

﻿# 小红书

当前真实代码入口：

- App 入口：`src/App.tsx` -> `FeatureScreen` -> `XiaohongshuApp`
- 小红书模块：`src/apps/xiaohongshu/XiaohongshuApp.tsx`
- 小红书类型：`src/apps/xiaohongshu/types.ts`
- 小红书逻辑：`src/apps/xiaohongshu/xiaohongshuLogic.ts`

相关状态：

- `src/store.ts`：`xiaohongshuProfile`、`xiaohongshuNotes`
- store actions：`setXiaohongshuProfile`、`addXiaohongshuNote`、`updateXiaohongshuNote`、`deleteXiaohongshuNote`、`toggleXiaohongshuFavorite`、`replaceXiaohongshuGeneratedNotes`

当前交互：

- 桌面第二页“小红书”图标打开独立小红书 App。
- 首页只读取 `xiaohongshuNotes`，不借用朋友圈或浏览器数据。
- 首页按小红书习惯分为“推荐 / 关注 / 附近”，关注只显示已关注作者，附近只显示带附近地点或标签的笔记，没有内容时显示空界面。
- “我的”页展示玩家自己发布的笔记；形象编辑移到独立编辑入口，头像可点击从本机图片替换。
- 点首页“刷新”会根据玩家形象、角色设定、角色世界书、浏览器世界书和可读相册生成角色笔记与世界路人笔记。
- 没有相册图片时，生成笔记不伪造封面图；有可读相册图片时，可以把相册图片用于生成笔记或发布笔记。
- 支持发布笔记：标题、正文、标签、相册/本机图片、心情、地点。
- 支持按标签筛选、打开详情、关注作者、收藏和删除。
- AI 上下文里的“小红书”区块只读取小红书条目的文字内容，不发送图片、CSS token 或视觉占位。

维护时同步：

- 修改小红书入口、状态字段或 AI 读取规则后，同步本文件和 `PROJECT_OUTLINE.md`。
- 持久化结构变化时同步 `src/store.ts` persist version 和 migrate。
