## 2026-10-10维护导航

- 职责：微信（src/apps/wechat/stickers）。
- 当前阶段与下一步：[总计划](../../../../MAINTENANCE_OUTLINE.md)、[NEXT](../../../../NEXT.md)。本目录不另记独立进度。
- 数据/发布红线：[保护清单](../../../../docs/PROTECTION_AND_RELEASE.md)。只提交与软件直接相关的源码、必要说明和实际运行资源。
- 直接文件：`stickerPacks.ts`
- 无子目录。
- 修改入口、数据结构或共享逻辑后，同步本说明和总表对应任务；查调用方、保存、重开恢复，不能仅看页面。
- 原有文件、备份、测试、许可证不能按名称猜测删除。新功能数据应复用明确权威来源，不建立第二份同义存档。

---

以下为原有说明；旧路径或阶段与上方当前导航冲突时，以当前源码和总表为准。

# 微信表情包素材

这里记录微信内置 starter 表情包。只放 emoji / sticker 风格表情包，不放斗图包。

## 当前来源

- OpenMoji：https://github.com/hfg-gmuend/openmoji
- Noto Emoji：https://github.com/googlefonts/noto-emoji
- Twemoji：https://github.com/twitter/twemoji

`stickerPacks.ts` 使用 CDN URL 拉取精选 SVG。后续如果要离线化，再把单个 SVG 下载到本目录，并保留来源和许可说明。

## 维护规则

- 不加入版权不清晰的中文斗图仓库。
- 每个表情都要写清楚情绪用途，AI 会根据 label/mood 选择。
- 新增整套表情时先少量精选，不直接导入完整仓库。
