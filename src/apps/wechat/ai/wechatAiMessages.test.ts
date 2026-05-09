import { strict as assert } from 'node:assert';
import { parseWeChatAiReply } from './wechatAiMessages';

const parsed = parseWeChatAiReply([
  '到了说一声',
  '[sticker mood=comfort]',
  '[transfer amount=188 note=晚饭钱]',
  '[red-packet amount=52 note=买点甜的]',
  '[shopping item=奶茶 amount=18 note=我下单了]',
].join('\n'));

assert.equal(parsed.length, 5);
assert.equal(parsed[0].kind, 'text');
assert.equal(parsed[0].content, '到了说一声');
assert.equal(parsed[1].kind, 'sticker');
assert.equal(parsed[1].mood, 'comfort');
assert.equal(parsed[2].kind, 'transfer');
assert.equal(parsed[2].amount, '188');
assert.equal(parsed[2].note, '晚饭钱');
assert.equal(parsed[3].kind, 'red-packet');
assert.equal(parsed[3].amount, '52');
assert.equal(parsed[4].kind, 'shopping');
assert.equal(parsed[4].itemName, '奶茶');

const fallback = parseWeChatAiReply('[transfer note=少了金额]');
assert.equal(fallback[0].kind, 'text');
assert.equal(fallback[0].content, '[transfer note=少了金额]');

const quoted = parseWeChatAiReply('[shopping item="热奶茶" amount="18.5" note="别喝冰的"]');
assert.equal(quoted[0].kind, 'shopping');
assert.equal(quoted[0].itemName, '热奶茶');
assert.equal(quoted[0].amount, '18.5');
assert.equal(quoted[0].note, '别喝冰的');

console.log('wechatAiMessages tests passed');
