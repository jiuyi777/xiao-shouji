import { strict as assert } from 'node:assert';
import { useAppStore } from '../../store';

useAppStore.setState({ phoneCallRecords: [] } as Partial<ReturnType<typeof useAppStore.getState>>);

const startedAt = 1710000000000;
const id = useAppStore.getState().addPhoneCallRecord({
  characterId: 'char-1',
  direction: 'outgoing',
  status: 'answered',
  startedAt,
  answeredAt: startedAt + 2000,
  endedAt: startedAt + 62000,
  durationSeconds: 60,
  summary: '短短聊了一分钟。',
  transcript: [
    { speaker: 'user', text: '喂？', timestamp: startedAt + 3000 },
    { speaker: 'char', text: '嗯，我在。', timestamp: startedAt + 5000 },
  ],
});

let records = useAppStore.getState().phoneCallRecords;
assert.equal(records.length, 1);
assert.equal(records[0].id, id);
assert.equal(records[0].status, 'answered');
assert.equal(records[0].durationSeconds, 60);

useAppStore.getState().togglePhoneCallFavorite(id);
assert.equal(useAppStore.getState().phoneCallRecords[0].favorite, true);

useAppStore.getState().updatePhoneCallRecord(id, { summary: '更新后的摘要。' });
assert.equal(useAppStore.getState().phoneCallRecords[0].summary, '更新后的摘要。');

useAppStore.getState().deletePhoneCallRecord(id);
records = useAppStore.getState().phoneCallRecords;
assert.equal(records.length, 0);

console.log('phone store actions ok');
