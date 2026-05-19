import assert from 'node:assert/strict';
import { parseWorldBookDraft, stringifyWorldBookForEditing } from './worldBookText';

const text = stringifyWorldBookForEditing({
  entries: [
    {
      uid: 123,
      id: 'abc',
      comment: '勇者主页',
      content: '艾尔曾经偷偷饲养过一只老鼠。',
      keys: ['童年', '秘密'],
      position: 4,
      extensions: { probability: 100 },
    },
  ],
  scan_depth: 2,
});

assert.ok(text.includes('勇者主页'));
assert.ok(text.includes('艾尔曾经偷偷饲养过一只老鼠。'));
assert.ok(text.includes('童年、秘密'));
assert.equal(text.includes('uid'), false);
assert.equal(text.includes('abc'), false);
assert.equal(text.includes('position'), false);
assert.equal(text.includes('scan_depth'), false);

assert.equal(parseWorldBookDraft(text), text);

console.log('system world book text tests passed');
