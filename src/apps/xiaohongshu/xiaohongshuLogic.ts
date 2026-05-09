/**
 * Xiaohongshu note helpers.
 * Main functions: normalizeXiaohongshuProfile, normalizeXiaohongshuNotes,
 * buildGeneratedXiaohongshuNotes, getXiaohongshuFeedNotes,
 * filterXiaohongshuNotes, buildXiaohongshuContext.
 * Dependencies: XiaohongshuNote/Profile types and Character-like inputs.
 * Maintenance note: AI context must stay text-only; never include image/css tokens.
 */
import type { XiaohongshuAuthorType, XiaohongshuNote, XiaohongshuProfile } from './types';

export type XiaohongshuHomeTab = 'recommend' | 'following' | 'nearby';

type CharacterLike = {
  id: string;
  name: string;
  avatar: string;
  description: string;
  personality: string;
  firstMessage: string;
  systemPrompt: string;
  worldBook?: unknown;
};

type GalleryPhotoLike = {
  url: string;
  title?: string;
  tags?: string[];
  hidden?: boolean;
  readableByChar?: boolean;
};

type GenerateInput = {
  characters: CharacterLike[];
  userProfile: XiaohongshuProfile;
  browserWorldBook?: string;
  galleryPhotos?: GalleryPhotoLike[];
  now?: number;
};

function cleanText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function cleanTags(tags: unknown) {
  if (!Array.isArray(tags)) return [];
  return Array.from(new Set(tags.map((tag) => cleanText(tag)).filter(Boolean))).slice(0, 8);
}

function cleanNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : fallback;
}

function sanitizeImageUrl(value: unknown) {
  const url = cleanText(value);
  if (!url) return undefined;
  if (url.startsWith('xhs-cover:') || url.startsWith('xhs-avatar:')) return undefined;
  if (url.startsWith('data:image/svg')) return undefined;
  if (url.startsWith('avatar://')) return undefined;
  return url;
}

function summarize(value: string, max = 120) {
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length > max ? `${compact.slice(0, max)}...` : compact;
}

function stringifyWorldBook(worldBook: unknown) {
  if (!worldBook) return '';
  if (typeof worldBook === 'string') return summarize(worldBook, 90);
  try {
    const raw = JSON.stringify(worldBook);
    const parsed = JSON.parse(raw) as { entries?: Array<{ content?: string }> };
    if (Array.isArray(parsed.entries)) {
      return summarize(parsed.entries.map((entry) => entry.content).filter(Boolean).join(' '), 90);
    }
    return summarize(raw.replace(/[{}[\]":,]/g, ' '), 90);
  } catch {
    return '';
  }
}

function pickFrom(seed: number, values: string[]) {
  return values[Math.abs(seed) % values.length];
}

function authorSeed(authorName: string, now: number) {
  return authorName.split('').reduce((sum, char) => sum + char.charCodeAt(0), now);
}

function seededNumber(seed: number, min: number, max: number) {
  const value = Math.abs(Math.sin(seed) * 10000);
  return min + Math.floor((value - Math.floor(value)) * (max - min + 1));
}

function makeAvatar(seed: number, label: string) {
  return `xhs-avatar:${Math.abs(seed) % 12}:${encodeURIComponent(label.trim().slice(0, 1) || '我')}`;
}

function galleryPool(photos: GalleryPhotoLike[] = []) {
  return photos
    .filter((photo) => photo && photo.readableByChar !== false && !photo.hidden)
    .map((photo) => ({
      url: sanitizeImageUrl(photo.url),
      title: cleanText(photo.title, '相册照片'),
      tags: cleanTags(photo.tags),
    }))
    .filter((photo): photo is { url: string; title: string; tags: string[] } => Boolean(photo.url));
}

function pickGalleryImage(seed: number, photos: ReturnType<typeof galleryPool>) {
  if (photos.length === 0) return undefined;
  return photos[Math.abs(seed) % photos.length];
}

export function normalizeXiaohongshuProfile(profile: unknown): XiaohongshuProfile {
  const item = profile && typeof profile === 'object' ? profile as Partial<XiaohongshuProfile> : {};
  return {
    displayName: cleanText(item.displayName, '我'),
    avatar: sanitizeImageUrl(item.avatar),
    bio: cleanText(item.bio, '记录一点正在发生的生活。'),
    styleTags: cleanTags(item.styleTags),
  };
}

export function normalizeXiaohongshuNotes(notes: unknown): XiaohongshuNote[] {
  if (!Array.isArray(notes)) return [];
  return notes
    .filter((note) => note && typeof note === 'object')
    .map((note, index) => {
      const item = note as Partial<XiaohongshuNote>;
      const createdAt = typeof item.createdAt === 'number' ? item.createdAt : Date.now() - index;
      const authorType: XiaohongshuAuthorType =
        item.authorType === 'character' || item.authorType === 'world' || item.authorType === 'user'
          ? item.authorType
          : 'user';
      const source: XiaohongshuNote['source'] = item.source === 'generated' ? 'generated' : 'manual';
      return {
        id: cleanText(item.id, `xhs-${index}`),
        title: cleanText(item.title, '无标题笔记'),
        content: cleanText(item.content),
        tags: cleanTags(item.tags),
        imageUrl: sanitizeImageUrl(item.imageUrl),
        authorId: cleanText(item.authorId, authorType),
        authorName: cleanText(item.authorName, authorType === 'world' ? '同城用户' : '我'),
        authorAvatar: cleanText(item.authorAvatar) || undefined,
        authorType,
        source,
        mood: cleanText(item.mood) || undefined,
        location: cleanText(item.location) || undefined,
        likes: cleanNumber(item.likes),
        comments: cleanNumber(item.comments),
        favorite: Boolean(item.favorite),
        createdAt,
        updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : createdAt,
      };
    })
    .filter((note) => note.title || note.content);
}

export function buildGeneratedXiaohongshuNotes({
  characters,
  userProfile,
  browserWorldBook = '',
  galleryPhotos = [],
  now = Date.now(),
}: GenerateInput): XiaohongshuNote[] {
  const profile = normalizeXiaohongshuProfile(userProfile);
  const worldHint = summarize(browserWorldBook.replace(/^世界书[:：]\s*/, ''), 90);
  const photos = galleryPool(galleryPhotos);
  const notes: XiaohongshuNote[] = [];
  const topicPool = [
    '今天这家店真的有点会',
    '随手记录一下生活里的小事',
    '附近新开的地方值得去吗',
    '把最近的心情整理成一篇',
    '这条路晚上比白天好看',
    '一些不费力的小灵感',
  ];
  const worldAuthorNames = [
    '鹿眠不睡',
    '小周今天吃什么',
    '阿盐在附近',
    '薄荷汽水',
    '夜市观察员',
    '一口甜桃',
    '旧巷摄影',
    '今天也想出门',
    '慢慢逛的人',
    '路过雨城',
    '小熊便利贴',
    '匿名种草机',
  ];

  characters.slice(0, 5).forEach((character, index) => {
    const seed = authorSeed(character.name, now + index);
    const theme = pickFrom(seed, ['今天的日常切片', '出门前的一点灵感', '路上拍到的生活感', '想留下来的瞬间']);
    const tag = pickFrom(seed + 1, ['日常', '穿搭', '探店', '心情', '生活感']);
    const world = stringifyWorldBook(character.worldBook);
    const photo = pickGalleryImage(seed, photos);
    notes.push({
      id: `xhs-generated-character-${character.id}-${now}-${index}`,
      title: `${theme} | ${character.name}`,
      content: [
        character.description ? summarize(character.description, 44) : `${character.name}今天随手记录了一点生活。`,
        character.personality ? `文字气质偏${summarize(character.personality, 28)}，像本人会发的碎碎念。` : '',
        world ? `背景里带到：${world}` : '',
        profile.styleTags.length > 0 ? `刷到${profile.displayName}常看的 #${profile.styleTags[0]}，顺手也记了一笔。` : '',
      ].filter(Boolean).join('\n'),
      tags: Array.from(new Set([tag, ...profile.styleTags.slice(0, 2), ...(photo?.tags.slice(0, 1) || [])])),
      imageUrl: photo?.url,
      authorId: character.id,
      authorName: character.name,
      authorAvatar: sanitizeImageUrl(character.avatar) || makeAvatar(seed, character.name),
      authorType: 'character',
      source: 'generated',
      mood: pickFrom(seed + 2, ['想记录', '轻松', '有点心动', '慢慢来']),
      location: pickFrom(seed + 3, ['', '附近', '街角', '回家路上']) || undefined,
      likes: seededNumber(seed, 26, 420),
      comments: seededNumber(seed + 7, 2, 68),
      favorite: false,
      createdAt: now - index * 60000,
      updatedAt: now - index * 60000,
    });
  });

  worldAuthorNames.forEach((author, index) => {
    const seed = authorSeed(author, now + index * 13);
    const topic = pickFrom(seed, topicPool);
    const photo = pickGalleryImage(seed + index, photos);
    const localHint = worldHint || pickFrom(seed + 9, [
      '附近最近多了几家小店，晚上路灯很好看。',
      '今天首页刷到很多生活感照片。',
      '这个世界里的人好像都很会记录日常。',
    ]);
    notes.push({
      id: `xhs-generated-world-${now}-${index}`,
      title: topic,
      content: [
        localHint,
        pickFrom(seed + 5, [
          '评论区已经有人在问地址了，先收藏一下。',
          '没有很用力拍，但这种随手感反而刚刚好。',
          '适合下午去，光线会更软一点。',
          '如果和熟人一起去，应该会更有意思。',
        ]),
      ].join('\n'),
      tags: [pickFrom(seed + 1, ['同城', '探店', '生活', '灵感', '附近']), pickFrom(seed + 2, ['种草', '日常', '拍照']), ...photo?.tags.slice(0, 1) || []],
      imageUrl: photo?.url,
      authorId: `world-${index}`,
      authorName: author,
      authorAvatar: makeAvatar(seed, author),
      authorType: 'world',
      source: 'generated',
      mood: pickFrom(seed + 3, ['热闹', '种草', '随手记']),
      location: pickFrom(seed + 4, ['同城', '附近', '世界角落']),
      likes: seededNumber(seed, 8, 860),
      comments: seededNumber(seed + 11, 0, 96),
      favorite: false,
      createdAt: now - (characters.length + index) * 60000,
      updatedAt: now - (characters.length + index) * 60000,
    });
  });

  return notes;
}

export function getSortedXiaohongshuNotes(notes: XiaohongshuNote[]) {
  return [...notes].sort((left, right) => right.createdAt - left.createdAt);
}

export function filterXiaohongshuNotes(notes: XiaohongshuNote[], tag: string) {
  const activeTag = tag.trim();
  const sorted = getSortedXiaohongshuNotes(notes);
  if (!activeTag || activeTag === '全部') return sorted;
  return sorted.filter((note) => note.tags.includes(activeTag));
}

export function getXiaohongshuFeedNotes(notes: XiaohongshuNote[], tab: XiaohongshuHomeTab, followingIds: string[]) {
  if (tab === 'following') {
    const followed = new Set(followingIds);
    return getSortedXiaohongshuNotes(notes.filter((note) => followed.has(note.authorId)));
  }
  if (tab === 'nearby') {
    return getSortedXiaohongshuNotes(notes.filter((note) => note.location?.includes('附近') || note.tags.includes('附近')));
  }
  return getSortedXiaohongshuNotes(notes);
}

export function getProfileNotes(notes: XiaohongshuNote[]) {
  return getSortedXiaohongshuNotes(notes.filter((note) => note.authorType === 'user'));
}

export function buildXiaohongshuContext(notes: XiaohongshuNote[], limit = 12) {
  const readableNotes = getSortedXiaohongshuNotes(notes).slice(0, limit);
  if (readableNotes.length === 0) return '小红书笔记：暂无。';
  return [
    '小红书笔记：',
    ...readableNotes.map((note) => {
      const tags = note.tags.length > 0 ? ` #${note.tags.join(' #')}` : '';
      const author = note.authorName ? `${note.authorName}：` : '';
      const meta = [note.location, note.mood, note.favorite ? '已收藏' : ''].filter(Boolean).join(' / ');
      return `- ${author}${note.title}${tags}${meta ? `（${meta}）` : ''}：${summarize(note.content)}`;
    }),
  ].join('\n');
}
