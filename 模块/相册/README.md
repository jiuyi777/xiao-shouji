## 2026-10-10维护导航

- 职责：模块/相册（模块/相册）。
- 当前阶段与下一步：[总计划](../../MAINTENANCE_OUTLINE.md)、[NEXT](../../NEXT.md)。本目录不另记独立进度。
- 数据/发布红线：[保护清单](../../docs/PROTECTION_AND_RELEASE.md)。只提交与软件直接相关的源码、必要说明和实际运行资源。
- 当前无直接实现文件，不将空目录计为已完成功能。
- 无子目录。
- 修改入口、数据结构或共享逻辑后，同步本说明和总表对应任务；查调用方、保存、重开恢复，不能仅看页面。
- 原有文件、备份、测试、许可证不能按名称猜测删除。新功能数据应复用明确权威来源，不建立第二份同义存档。

---

以下为原有说明；旧路径或阶段与上方当前导航冲突时，以当前源码和总表为准。

# 相册

当前相册已有独立代码目录：`src/apps/gallery/`。`src/App.tsx` 只导入 `GalleryScreen`，并在 `FeatureScreen` 的 `gallery` 路由中渲染它。

核心逻辑是上传照片后自动记录日期，按日期分组展示，用户点选或创建标签，再控制 char 可读范围，并让 char 读取和评价。

真实入口：

- 相册页面：`src/apps/gallery/GalleryScreen.tsx`
- 相册逻辑：`src/apps/gallery/galleryLogic.ts`
- 相册测试：`src/apps/gallery/galleryLogic.test.ts`
- 相册状态：`src/store.ts` 的 `GalleryPhoto[] galleryPhotos`
- 标签状态：`src/store.ts` 的 `string[] galleryTags`
- 相册新增/编辑/评价/删除/收藏：`addGalleryPhoto`、`updateGalleryPhoto`、`addGalleryPhotoReview`、`deleteGalleryPhoto`、`toggleGalleryPhotoFavorite`
- 标签新增/删除：`addGalleryTag`、`deleteGalleryTag`
- 可导入来源：桌面图床 `imageBed`、微信照片墙 `wechatPhotos`
- 查手机读取照片：`PeekScreen`，只读取 `readableByChar` 且非隐藏的照片摘要

维护备注：

- 相册 UI、筛选、分组、标签、导入草稿、隐藏切换和 char 评价文案优先放在 `src/apps/gallery/`。
- `src/store.ts` 继续持有现有数据结构和 actions；不要为了 UI 拆分改变用户数据结构。
- 后续聊天图片、朋友圈照片、查手机隐藏相册都应进入 `GalleryPhoto`，不要再新增平行图片数组。
- 修改相册数据结构时需要同步 persist migrate、`PROJECT_OUTLINE.md` 和 `docs/gallery-design.md`。

相关文档：

- `docs/gallery-design.md`：相册设计模式、页面结构和目录边界。
