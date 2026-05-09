import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildGeneratedXiaohongshuNotes,
  buildXiaohongshuContext,
  filterXiaohongshuNotes,
  getProfileNotes,
  getSortedXiaohongshuNotes,
  getXiaohongshuFeedNotes,
} from './xiaohongshuLogic';
import type { XiaohongshuNote } from './types';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    },
    key: (index: number) => Array.from(storage.keys())[index] ?? null,
    get length() {
      return storage.size;
    },
  } as Storage,
});
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { localStorage: globalThis.localStorage },
});

const notes: XiaohongshuNote[] = [
  {
    id: 'mine',
    title: '周末咖啡',
    content: '在街角小店坐了一下午。',
    tags: ['探店', '咖啡'],
    authorId: 'user',
    authorName: '我',
    authorType: 'user',
    source: 'manual',
    favorite: false,
    createdAt: 1000,
    updatedAt: 1000,
  },
  {
    id: 'followed',
    title: '雨天穿搭',
    content: '黑色长裙和红色伞很搭。',
    tags: ['穿搭', '雨天'],
    imageUrl: 'data:image/png;base64,abc',
    authorId: 'char-1',
    authorName: '林秋',
    authorAvatar: '',
    authorType: 'character',
    source: 'generated',
    favorite: true,
    createdAt: 3000,
    updatedAt: 3000,
  },
  {
    id: 'nearby',
    title: '附近新开的甜品店',
    content: '草莓蛋糕很好看。',
    tags: ['附近', '甜品'],
    authorId: 'world-1',
    authorName: '小周今天吃什么',
    authorType: 'world',
    source: 'generated',
    location: '附近',
    createdAt: 2000,
    updatedAt: 2000,
  },
];

assert.deepEqual(
  getSortedXiaohongshuNotes(notes).map((note) => note.id),
  ['followed', 'nearby', 'mine'],
);

assert.deepEqual(
  filterXiaohongshuNotes(notes, '穿搭').map((note) => note.id),
  ['followed'],
);

assert.deepEqual(
  getXiaohongshuFeedNotes(notes, 'following', ['char-1']).map((note) => note.id),
  ['followed'],
);

assert.deepEqual(getXiaohongshuFeedNotes(notes, 'following', []).map((note) => note.id), []);

assert.deepEqual(
  getXiaohongshuFeedNotes(notes, 'nearby', []).map((note) => note.id),
  ['nearby'],
);

assert.deepEqual(
  getProfileNotes(notes).map((note) => note.id),
  ['mine'],
);

const context = buildXiaohongshuContext(notes, 3);
assert.match(context, /小红书笔记/);
assert.match(context, /雨天穿搭/);
assert.match(context, /周末咖啡/);
assert.doesNotMatch(context, /data:image|xhs-cover|xhs-avatar|<svg|style=/);

const generatedWithoutGallery = buildGeneratedXiaohongshuNotes({
  characters: [
    {
      id: 'char-1',
      name: '林秋',
      avatar: 'avatar://lin',
      description: '在雨城读书，喜欢记录咖啡店和旧书。',
      personality: '温柔、细腻、慢热',
      firstMessage: '',
      systemPrompt: '',
      worldBook: { entries: [{ comment: '雨城', content: '城市常年下雨，有旧书店和夜市。' }] },
    },
  ],
  userProfile: {
    displayName: '阿眠',
    avatar: 'avatar://user',
    bio: '喜欢夜雨和甜食。',
    styleTags: ['雨天', '甜品'],
  },
  browserWorldBook: '世界书：雨城的夜市很有名，很多人会发探店笔记。',
  now: 5000,
});

assert.ok(generatedWithoutGallery.length >= 10);
assert.equal(generatedWithoutGallery[0].authorType, 'character');
assert.equal(generatedWithoutGallery[0].authorName, '林秋');
assert.ok(new Set(generatedWithoutGallery.map((note) => note.authorName)).size >= 8);
assert.ok(generatedWithoutGallery.every((note) => note.authorAvatar));
assert.ok(generatedWithoutGallery.every((note) => !note.imageUrl));
assert.doesNotMatch(generatedWithoutGallery.map((note) => note.content).join('\n'), /entries|comment|content|语气像|�/);
assert.doesNotMatch(generatedWithoutGallery.map((note) => `${note.authorAvatar || ''}${note.imageUrl || ''}`).join('\n'), /data:image|<svg|style=/);
assert.doesNotMatch(buildXiaohongshuContext(generatedWithoutGallery, 20), /data:image|xhs-cover|xhs-avatar|<svg|style=/);

const generatedWithGallery = buildGeneratedXiaohongshuNotes({
  characters: [],
  userProfile: {
    displayName: '我',
    bio: '记录生活。',
    styleTags: [],
  },
  galleryPhotos: [
    { url: 'photo-a.png', title: '甜品', tags: ['甜品'] },
    { url: 'photo-b.png', title: '街角', tags: ['附近'] },
  ],
  now: 6000,
});

assert.ok(generatedWithGallery.some((note) => note.imageUrl === 'photo-a.png' || note.imageUrl === 'photo-b.png'));

const { useAppStore } = await import('../../store');

useAppStore.setState({ xiaohongshuNotes: [], xiaohongshuFollowingIds: [] } as Partial<ReturnType<typeof useAppStore.getState>>);

const noteId = useAppStore.getState().addXiaohongshuNote({
  title: '新开的甜品店',
  content: '草莓蛋糕很好看。',
  tags: ['探店', '甜品'],
  authorId: 'user',
  authorName: '阿眠',
  authorAvatar: '',
  authorType: 'user',
  source: 'manual',
});

assert.equal(useAppStore.getState().xiaohongshuNotes.length, 1);
assert.equal(useAppStore.getState().xiaohongshuNotes[0].id, noteId);

useAppStore.getState().toggleXiaohongshuFavorite(noteId);
assert.equal(useAppStore.getState().xiaohongshuNotes[0].favorite, true);

useAppStore.getState().toggleXiaohongshuFollow('char-1');
assert.deepEqual(useAppStore.getState().xiaohongshuFollowingIds, ['char-1']);
useAppStore.getState().toggleXiaohongshuFollow('char-1');
assert.deepEqual(useAppStore.getState().xiaohongshuFollowingIds, []);

useAppStore.getState().deleteXiaohongshuNote(noteId);
assert.equal(useAppStore.getState().xiaohongshuNotes.length, 0);

const xiaohongshuAppSource = readFileSync(new URL('./XiaohongshuApp.tsx', import.meta.url), 'utf8');
const globalCss = readFileSync(new URL('../../index.css', import.meta.url), 'utf8');

assert.match(xiaohongshuAppSource, /xhs-app/);
assert.match(globalCss, /\.theme-gothic \.xhs-app/);
assert.doesNotMatch(xiaohongshuAppSource, /bg-\[#222\]/);

console.log('xiaohongshu logic ok');
