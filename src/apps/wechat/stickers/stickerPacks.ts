export interface WeChatStarterSticker {
  id: string;
  label: string;
  url: string;
}

export interface WeChatStickerPack {
  id: string;
  name: string;
  source: string;
  license: string;
  note: string;
  stickers: WeChatStarterSticker[];
}

export const wechatStarterStickerPacks: WeChatStickerPack[] = [
  {
    id: 'openmoji-emotions',
    name: 'OpenMoji 情绪包',
    source: 'https://github.com/hfg-gmuend/openmoji',
    license: 'CC BY-SA 4.0',
    note: '开源 emoji 风格表情包，不是斗图包。',
    stickers: [
      { id: 'openmoji-smile-hearts', label: 'OpenMoji 开心爱心表情，表示喜欢和贴贴', url: 'https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@master/color/svg/1F970.svg' },
      { id: 'openmoji-relieved', label: 'OpenMoji 松一口气表情，表示安慰和放心', url: 'https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@master/color/svg/1F60C.svg' },
      { id: 'openmoji-thinking', label: 'OpenMoji 思考表情，表示疑惑和认真想', url: 'https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@master/color/svg/1F914.svg' },
      { id: 'openmoji-pleading', label: 'OpenMoji 可怜请求表情，表示撒娇和求你了', url: 'https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@master/color/svg/1F97A.svg' },
    ],
  },
  {
    id: 'noto-emoji-emotions',
    name: 'Noto Emoji 情绪包',
    source: 'https://github.com/googlefonts/noto-emoji',
    license: 'Apache 2.0 / OFL',
    note: 'Google Noto emoji 风格表情包，适合通用情绪。',
    stickers: [
      { id: 'noto-grin', label: 'Noto 咧嘴笑表情，表示开心和收到', url: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/svg/emoji_u1f604.svg' },
      { id: 'noto-hug', label: 'Noto 拥抱表情，表示安慰和抱抱', url: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/svg/emoji_u1fac2.svg' },
      { id: 'noto-cry', label: 'Noto 哭哭表情，表示委屈和难过', url: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/svg/emoji_u1f622.svg' },
      { id: 'noto-ok', label: 'Noto OK 手势表情，表示好和没问题', url: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/svg/emoji_u1f44c.svg' },
    ],
  },
  {
    id: 'twemoji-emotions',
    name: 'Twemoji 情绪包',
    source: 'https://github.com/twitter/twemoji',
    license: 'CC BY 4.0 / MIT',
    note: 'Twemoji emoji 风格表情包，作为轻量补充包。',
    stickers: [
      { id: 'twemoji-laugh', label: 'Twemoji 笑哭表情，表示被逗笑', url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@master/assets/svg/1f602.svg' },
      { id: 'twemoji-wink', label: 'Twemoji 眨眼表情，表示调皮和暗示', url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@master/assets/svg/1f609.svg' },
      { id: 'twemoji-heart', label: 'Twemoji 红心表情，表示喜欢和确认心意', url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@master/assets/svg/2764.svg' },
      { id: 'twemoji-party', label: 'Twemoji 庆祝表情，表示开心和恭喜', url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@master/assets/svg/1f973.svg' },
    ],
  },
];

export const starterStickerItems = wechatStarterStickerPacks.flatMap((pack) =>
  pack.stickers.map((sticker) => ({
    ...sticker,
    label: `${pack.name}：${sticker.label}`,
  })),
);
