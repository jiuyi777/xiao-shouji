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
