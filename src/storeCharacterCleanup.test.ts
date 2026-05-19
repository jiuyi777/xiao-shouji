import assert from 'node:assert/strict';
import { cleanupCharacterReferences } from './storeCharacterCleanup';

const cleaned = cleanupCharacterReferences({
  characterId: 'char-a',
  characterName: '阿甲',
  state: {
    characters: [
      { id: 'char-a', name: '阿甲' },
      { id: 'char-b', name: '阿乙' },
    ],
    chatSessions: {
      'wechat:char-a': { characterId: 'char-a', channel: 'wechat', messages: [{ id: 'm1' }] },
      'qq:char-a': { characterId: 'char-a', channel: 'qq', messages: [{ id: 'm2' }] },
      'wechat:group-1': {
        characterId: 'group-1',
        channel: 'wechat',
        messages: [
          { id: 'gm-a', speakerId: 'char-a' },
          { id: 'gm-b', speakerId: 'char-b' },
        ],
      },
    },
    activeChatId: 'char-a',
    activeScreen: 'chat',
    previousScreen: 'wechat',
    groupChats: [
      { id: 'group-1', memberIds: ['char-a', 'char-b'] },
      { id: 'group-empty', memberIds: ['char-a'] },
    ],
    contactTags: { 'char-a': ['亲密'], 'char-b': ['朋友'] },
    purchaseRecords: [{ characterId: 'char-a' }, { characterId: 'char-b' }],
    lifeEvents: [{ characterId: 'char-a' }, { characterId: 'char-b' }, {}],
    phoneCallRecords: [{ characterId: 'char-a' }, { characterId: 'char-b' }],
    diaries: [
      { id: 'diary-a', characterId: 'char-a' },
      { id: 'diary-user', owner: 'user', reviews: [{ characterId: 'char-a' }, { characterId: 'char-b' }] },
    ],
    calendarEvents: [{ characterId: 'char-a' }, { characterId: 'char-b' }, { owner: 'user' }],
    galleryPhotos: [
      { id: 'photo-a', characterId: 'char-a' },
      { id: 'photo-shared', reviews: [{ characterId: 'char-a' }, { characterId: 'char-b' }] },
    ],
    memos: [{ characterId: 'char-a' }, { characterId: 'char-b' }, {}],
    memoCharWriter: { characterId: 'char-a', enabled: true },
    theaterScenes: [
      { id: 'scene-keep', characterIds: ['char-a', 'char-b'] },
      { id: 'scene-drop', characterIds: ['char-a'] },
    ],
    xiaohongshuNotes: [
      { authorId: 'char-a', authorType: 'character' },
      { authorId: 'char-b', authorType: 'character' },
      { authorId: 'char-a', authorType: 'user' },
    ],
    xiaohongshuFollowingIds: ['char-a', 'char-b'],
    musicTracks: [
      { id: 'track-a', characterId: 'char-a' },
      { id: 'track-name', source: 'char', artist: '阿甲' },
      { id: 'track-b', characterId: 'char-b' },
    ],
    musicPlaylists: [{ trackIds: ['track-a', 'track-name', 'track-b'] }],
    musicListenRecords: [
      { characterId: 'char-a', trackId: 'track-a' },
      { characterId: 'char-b', trackId: 'track-b' },
      { trackId: 'track-name' },
    ],
    musicPlayer: { trackId: 'track-a', playing: true, progress: 42, duration: 180, repeat: true, shuffle: true },
  } as any,
});

assert.deepEqual(cleaned.characters.map((item) => item.id), ['char-b']);
assert.equal(cleaned.chatSessions['wechat:char-a'], undefined);
assert.equal(cleaned.chatSessions['qq:char-a'], undefined);
assert.deepEqual(cleaned.chatSessions['wechat:group-1'].messages.map((item) => item.id), ['gm-b']);
assert.deepEqual(cleaned.groupChats, [{ id: 'group-1', memberIds: ['char-b'] }]);
assert.deepEqual(cleaned.contactTags, { 'char-b': ['朋友'] });
assert.deepEqual(cleaned.purchaseRecords, [{ characterId: 'char-b' }]);
assert.deepEqual(cleaned.lifeEvents, [{ characterId: 'char-b' }, {}]);
assert.deepEqual(cleaned.phoneCallRecords, [{ characterId: 'char-b' }]);
assert.deepEqual(cleaned.diaries, [{ id: 'diary-user', owner: 'user', reviews: [{ characterId: 'char-b' }] }]);
assert.deepEqual(cleaned.calendarEvents, [{ characterId: 'char-b' }, { owner: 'user' }]);
assert.deepEqual(cleaned.galleryPhotos, [{ id: 'photo-shared', reviews: [{ characterId: 'char-b' }] }]);
assert.deepEqual(cleaned.memos, [{ characterId: 'char-b' }, {}]);
assert.deepEqual(cleaned.memoCharWriter, { enabled: false });
assert.deepEqual(cleaned.theaterScenes, [{ id: 'scene-keep', characterIds: ['char-b'] }]);
assert.deepEqual(cleaned.xiaohongshuNotes, [
  { authorId: 'char-b', authorType: 'character' },
  { authorId: 'char-a', authorType: 'user' },
]);
assert.deepEqual(cleaned.xiaohongshuFollowingIds, ['char-b']);
assert.deepEqual(cleaned.musicTracks, [{ id: 'track-b', characterId: 'char-b' }]);
assert.deepEqual(cleaned.musicPlaylists, [{ trackIds: ['track-b'] }]);
assert.deepEqual(cleaned.musicListenRecords, [{ characterId: 'char-b', trackId: 'track-b' }]);
assert.deepEqual(cleaned.musicPlayer, { playing: false, progress: 0, duration: 0, repeat: false, shuffle: false });
assert.equal(cleaned.activeChatId, null);
assert.equal(cleaned.activeScreen, 'wechat');

console.log('store character cleanup tests passed');
