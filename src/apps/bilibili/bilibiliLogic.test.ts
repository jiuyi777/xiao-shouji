import assert from 'node:assert/strict';
import {
  buildBilibiliRefreshQuery,
  buildFallbackBilibiliPayload,
  normalizeBilibiliEntries,
  parseBilibiliPayload,
  withBilibiliRoleComments,
} from './bilibiliLogic.ts';

const fallback = buildFallbackBilibiliPayload('雨夜便利店', 1710000000000);
assert.equal(fallback.entries.length, 4);
assert.equal(
  fallback.entries.every((entry) => entry.url.includes('bilibili.com') || entry.url.startsWith('phone://bilibili/')),
  true,
);
assert.equal(fallback.entries[0].title.includes('雨夜便利店'), true);

const characterQuery = buildBilibiliRefreshQuery([
  { name: '林秋', description: '雨城旧书店常客', personality: '温柔慢热' },
]);
assert.equal(characterQuery.includes('林秋'), true);
assert.equal(characterQuery.includes('雨城旧书店常客'), true);

const realLifeQuery = buildBilibiliRefreshQuery([]);
assert.equal(realLifeQuery, '现实生活 日常 刷到的视频');

const characterFallback = buildFallbackBilibiliPayload('林秋 雨城旧书店常客', 1710000000000, {
  commentNames: ['林秋'],
  upName: '林秋的小号',
});
assert.equal(characterFallback.entries[0].upName, '林秋的小号');
assert.equal(characterFallback.entries.some((entry) => entry.comments.some((comment) => comment.userName === '林秋')), true);

const parsed = parseBilibiliPayload(JSON.stringify({
  summary: '只刷到 B站相关视频。',
  entries: [
    {
      title: 'B站视频',
      upName: '生活区UP',
      url: 'https://www.bilibili.com/video/BV1xx411c7mD',
      description: '简介',
      tags: ['生活'],
      playCount: '1.2万',
      danmakuCount: '233',
      danmaku: ['来了'],
      comments: [{ userName: '观众', content: '像真的', likedCount: '12' }],
    },
    {
      title: '别的平台',
      upName: '外站',
      url: 'https://www.zhihu.com/question/1',
      description: '简介',
      tags: ['外站'],
      playCount: '0',
      danmakuCount: '0',
      danmaku: [],
      comments: [],
    },
  ],
}), '雨夜便利店', 1710000000000);

assert.equal(parsed.entries.length, 1);
assert.equal(parsed.entries[0].url.includes('bilibili.com'), true);
assert.equal(parsed.entries[0].comments[0].createdAt, 1710000000000);

const withRoleComment = withBilibiliRoleComments(parsed.entries, ['林秋'], 1710000006000);
assert.equal(withRoleComment[0].comments[0].userName, '林秋');
assert.equal(withRoleComment[0].comments[0].createdAt, 1710000006000);

const normalized = normalizeBilibiliEntries([
  {
    title: '  标题  ',
    upName: '',
    url: 'not a url',
    description: '',
    tags: ['  日常  ', ''],
    playCount: '',
    danmakuCount: '',
    danmaku: ['  第一  '],
    comments: [],
  },
], '关键词', 1710000000000);

assert.equal(normalized[0].title, '标题');
assert.equal(normalized[0].upName, '匿名UP');
assert.equal(normalized[0].url.startsWith('phone://bilibili/'), true);
assert.deepEqual(normalized[0].tags, ['日常']);

console.log('bilibili logic tests passed');
