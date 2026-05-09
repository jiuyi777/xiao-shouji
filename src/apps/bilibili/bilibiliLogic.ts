/**
 * Bilibili-only generation and parsing helpers.
 * Exports: buildBilibiliRefreshQuery, buildFallbackBilibiliPayload, normalizeBilibiliEntries, parseBilibiliPayload, withBilibiliRoleComments, isBilibiliEntryUrl.
 * Dependencies: Bilibili types from bilibiliTypes.ts.
 * Maintenance note: this module rejects external platforms so the B站 app never stores mixed browser results.
 */
import type { BilibiliComment, BilibiliVideoEntry } from './bilibiliTypes';

type RawBilibiliComment = Partial<BilibiliComment>;
export type RawBilibiliEntry = Partial<Omit<BilibiliVideoEntry, 'comments'>> & {
  comments?: RawBilibiliComment[];
};

export interface BilibiliPayload {
  summary: string;
  entries: BilibiliVideoEntry[];
}

export interface BilibiliRefreshCharacter {
  name: string;
  description?: string;
  personality?: string;
}

export interface BilibiliFallbackOptions {
  commentNames?: string[];
  upName?: string;
}

function compactText(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function toTextList(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => compactText(item)).filter(Boolean).slice(0, 8)
    : [];
}

function makeLocalBilibiliUrl(seed: string, index: number) {
  const slug = encodeURIComponent((seed.trim() || 'bilibili').replace(/\s+/g, '-'));
  return `phone://bilibili/${slug}-${index + 1}`;
}

export function isBilibiliEntryUrl(url: string) {
  if (url.startsWith('phone://bilibili/')) return true;
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'www.bilibili.com' || parsed.hostname === 'bilibili.com' || parsed.hostname === 'search.bilibili.com';
  } catch {
    return false;
  }
}

export function normalizeBilibiliEntries(entries: RawBilibiliEntry[], query: string, now = Date.now()): BilibiliVideoEntry[] {
  return entries
    .map((entry, index): BilibiliVideoEntry => {
      const rawUrl = compactText(entry.url);
      const url = isBilibiliEntryUrl(rawUrl) ? rawUrl : makeLocalBilibiliUrl(query || entry.title || 'entry', index);
      const comments = Array.isArray(entry.comments) ? entry.comments : [];
      return {
        id: compactText(entry.id) || `bili-${now}-${index}`,
        title: compactText(entry.title) || `${query || '日常'}｜刷到的 B站视频`,
        upName: compactText(entry.upName) || '匿名UP',
        cover: compactText(entry.cover),
        url,
        description: compactText(entry.description) || '一条像从手机里刷到的 B站视频条目。',
        tags: toTextList(entry.tags),
        playCount: compactText(entry.playCount) || '1.2万',
        danmakuCount: compactText(entry.danmakuCount) || '233',
        danmaku: toTextList(entry.danmaku),
        comments: comments
          .map((comment, commentIndex): BilibiliComment => ({
            id: compactText(comment.id) || `bili-comment-${now}-${index}-${commentIndex}`,
            userName: compactText(comment.userName) || '路过的观众',
            content: compactText(comment.content),
            likedCount: compactText(comment.likedCount) || '0',
            createdAt: now,
          }))
          .filter((comment) => comment.content)
          .slice(0, 8),
        createdAt: now,
        favorite: Boolean(entry.favorite),
        watchedAt: typeof entry.watchedAt === 'number' ? entry.watchedAt : undefined,
        source: entry.source || 'generated',
      };
    })
    .filter((entry) => entry.title && isBilibiliEntryUrl(entry.url))
    .slice(0, 8);
}

export function buildBilibiliRefreshQuery(characters: BilibiliRefreshCharacter[]) {
  const character = characters.find((item) => item.name.trim());
  if (!character) return '现实生活 日常 刷到的视频';
  const details = [character.name, character.description, character.personality]
    .map((item) => compactText(item))
    .filter(Boolean)
    .join(' ');
  return `${details} 相关 B站视频`;
}

function buildRoleComments(commentNames: string[]): RawBilibiliComment[] {
  return commentNames.slice(0, 2).map((name, index) => ({
    userName: name,
    content: index === 0
      ? '这个视频怎么会刷到我首页，感觉有点太贴了。'
      : '评论区比视频还会说话，我先收藏。',
    likedCount: index === 0 ? '99' : '41',
  }));
}

export function withBilibiliRoleComments(entries: BilibiliVideoEntry[], commentNames: string[], now = Date.now()) {
  const roleComments = buildRoleComments(commentNames)
    .map((comment, index): BilibiliComment => ({
      id: `bili-role-comment-${now}-${index}`,
      userName: compactText(comment.userName) || '角色',
      content: compactText(comment.content),
      likedCount: compactText(comment.likedCount) || '0',
      createdAt: now,
    }))
    .filter((comment) => comment.content);
  if (roleComments.length === 0) return entries;
  return entries.map((entry, index) => {
    const missingRoleComment = !entry.comments.some((comment) =>
      roleComments.some((roleComment) => roleComment.userName === comment.userName),
    );
    if (!missingRoleComment || index > 1) return entry;
    return { ...entry, comments: [...roleComments.slice(0, 1), ...entry.comments].slice(0, 8) };
  });
}

export function buildFallbackBilibiliPayload(query: string, now = Date.now(), options: BilibiliFallbackOptions = {}): BilibiliPayload {
  const clean = query.trim() || '最近刷到的事';
  const roleComments = buildRoleComments(options.commentNames || []);
  const upName = options.upName?.trim() || '手机里的生活区UP';
  const rawEntries: RawBilibiliEntry[] = [
    {
      title: `${clean}｜生活区突然刷到的 12 分钟`,
      upName,
      url: `https://search.bilibili.com/all?keyword=${encodeURIComponent(clean)}`,
      description: '像是随手记录的一段日常，标题不大声，但评论区很会补细节。',
      tags: ['生活', '日常', '手机记录'],
      playCount: '12.8万',
      danmakuCount: '1832',
      danmaku: ['这个氛围对了', '前面别走，后面有细节', '像真的刷到过'],
      comments: [
        ...roleComments,
        { userName: '半夜还在刷', content: '这种生活区视频就是会让人突然安静下来。', likedCount: '128' },
        { userName: '路过收藏一下', content: '标题普通，后劲好大。', likedCount: '74' },
      ],
    },
    {
      title: `${clean} 的弹幕怎么都这么懂`,
      upName: '弹幕观察员',
      url: makeLocalBilibiliUrl(clean, 1),
      description: '剪了几个像网友边看边吐槽的瞬间，弹幕比视频还会讲故事。',
      tags: ['弹幕', '剪辑', '评论区'],
      playCount: '4.6万',
      danmakuCount: '906',
      danmaku: ['哈哈哈哈这里', '别说了我也这样', '暂停看评论'],
      comments: [
        { userName: '今天也在暂停', content: '我刷 B站就是为了看这种弹幕互相接话。', likedCount: '56' },
      ],
    },
    {
      title: `如果把「${clean}」拍成一个很短的 vlog`,
      upName: '低电量胶片',
      url: makeLocalBilibiliUrl(clean, 2),
      description: '封面像夜里随手截的一帧，内容更像留在手机相册里的片段。',
      tags: ['vlog', '氛围', '剪辑'],
      playCount: '8.1万',
      danmakuCount: '1204',
      danmaku: ['封面诈骗但正向', '这个转场舒服', '像手机里翻出来的'],
      comments: [
        { userName: '存档用小号', content: '这种视频适合半夜戴耳机看。', likedCount: '92' },
      ],
    },
    {
      title: `${clean} 相关投稿合集：收藏夹又满了`,
      upName: '收藏夹整理中',
      url: makeLocalBilibiliUrl(clean, 3),
      description: '把几个相关投稿整理成一条条目，方便之后在手机里继续刷。',
      tags: ['合集', '收藏', '推荐'],
      playCount: '2.9万',
      danmakuCount: '417',
      danmaku: ['已收藏', '省流：都好看', '首页终于推点会看的'],
      comments: [
        { userName: '首页别停', content: '这个合集比搜索结果靠谱。', likedCount: '38' },
      ],
    },
  ];
  return {
    summary: `刷到 4 条和「${clean}」有关的 B站视频。`,
    entries: normalizeBilibiliEntries(rawEntries, clean, now).map((entry) => ({ ...entry, source: 'generated' })),
  };
}

export function parseBilibiliPayload(raw: string, query: string, now = Date.now()): BilibiliPayload {
  try {
    const parsed = JSON.parse(raw) as Partial<{ summary: unknown; entries: RawBilibiliEntry[] }>;
    const modelEntries = Array.isArray(parsed.entries)
      ? parsed.entries.filter((entry) => {
          const url = compactText(entry.url);
          return !url || isBilibiliEntryUrl(url);
        })
      : [];
    const entries = normalizeBilibiliEntries(modelEntries, query, now)
      .filter((entry) => isBilibiliEntryUrl(entry.url))
      .map((entry) => ({ ...entry, source: 'model' as const }));
    if (entries.length > 0) {
      return {
        summary: compactText(parsed.summary) || `刷到 ${entries.length} 条和「${query}」有关的 B站视频。`,
        entries,
      };
    }
  } catch {
    // Fall back below when a model returns prose or malformed JSON.
  }
  return buildFallbackBilibiliPayload(query, now);
}
