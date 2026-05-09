import assert from 'node:assert/strict';
import { splitAssistantBubbles } from './wechatChat';

assert.deepEqual(
  splitAssistantBubbles('1. 小林：刚看到\n2. 我马上来', 'auto', '小林'),
  ['刚看到', '我马上来'],
);

assert.deepEqual(
  splitAssistantBubbles('旁白：她笑了一下\n好，我听你的。', 'auto', '小林'),
  ['好，我听你的。'],
);

assert.equal(
  splitAssistantBubbles('这是一条特别长的解释，先第一点，然后第二点，最后再补充很多没有必要的说明，像报告一样。', 'single')[0].length <= 64,
  true,
);
