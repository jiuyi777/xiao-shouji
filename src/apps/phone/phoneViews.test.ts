import { strict as assert } from 'node:assert';
import { filterPhoneRecordsForView, getPhoneListConfig } from './PhoneScreen';
import type { PhoneCallRecord } from '../../store';

const baseRecord = {
  characterId: 'char-a',
  startedAt: 1,
  endedAt: 2,
  durationSeconds: 0,
  summary: '',
  transcript: [],
} satisfies Omit<PhoneCallRecord, 'id' | 'direction' | 'status'>;

const records: PhoneCallRecord[] = [
  { ...baseRecord, id: 'answered-out', direction: 'outgoing', status: 'answered' },
  { ...baseRecord, id: 'missed-in', direction: 'incoming', status: 'missed' },
  { ...baseRecord, id: 'no-answer-out', direction: 'outgoing', status: 'no-answer' },
  { ...baseRecord, id: 'declined-in', direction: 'incoming', status: 'declined' },
];

assert.deepEqual(filterPhoneRecordsForView(records, 'recent').map((record) => record.id), [
  'answered-out',
  'missed-in',
  'no-answer-out',
  'declined-in',
]);
assert.deepEqual(filterPhoneRecordsForView(records, 'missed').map((record) => record.id), ['missed-in', 'no-answer-out']);
assert.deepEqual(filterPhoneRecordsForView(records, 'outgoing').map((record) => record.id), ['answered-out', 'no-answer-out']);
assert.deepEqual(filterPhoneRecordsForView(records, 'incoming').map((record) => record.id), ['missed-in', 'declined-in']);

assert.equal(getPhoneListConfig('recent').title, '最近通话');
assert.equal(getPhoneListConfig('missed').title, '未接来电');
assert.equal(getPhoneListConfig('outgoing').title, '拨出电话');
assert.equal(getPhoneListConfig('incoming').title, '来电记录');

console.log('phone list views ok');
