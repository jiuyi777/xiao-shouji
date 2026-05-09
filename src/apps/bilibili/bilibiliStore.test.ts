import { strict as assert } from 'node:assert';
import { useAppStore } from '../../store';

useAppStore.setState({ bilibiliEntries: [], bilibiliSearches: [] } as Partial<ReturnType<typeof useAppStore.getState>>);

const id = useAppStore.getState().addBilibiliEntries([
  {
    title: '雨夜便利店切片',
    upName: '生活区UP',
    cover: '',
    url: 'https://www.bilibili.com/video/BV1xx411c7mD',
    description: '一条像生活记录的视频。',
    tags: ['生活'],
    playCount: '2.3万',
    danmakuCount: '321',
    comments: [],
    danmaku: ['来了'],
    createdAt: 1710000000000,
    source: 'generated',
  },
])[0];

assert.equal(useAppStore.getState().bilibiliEntries.length, 1);
useAppStore.getState().toggleBilibiliFavorite(id);
assert.equal(useAppStore.getState().bilibiliEntries[0].favorite, true);
useAppStore.getState().markBilibiliWatched(id, 1710000005000);
assert.equal(useAppStore.getState().bilibiliEntries[0].watchedAt, 1710000005000);

const searchId = useAppStore.getState().addBilibiliSearch({
  query: '雨夜',
  summary: '搜索摘要',
  entryIds: [id],
  source: 'generated',
});
assert.equal(useAppStore.getState().bilibiliSearches[0].id, searchId);
assert.deepEqual(useAppStore.getState().bilibiliSearches[0].entryIds, [id]);

useAppStore.getState().deleteBilibiliEntry(id);
assert.equal(useAppStore.getState().bilibiliEntries.length, 0);

console.log('bilibili store actions ok');
