import assert from 'node:assert/strict';
import {
  canAcceptLifeCard,
  getPendingResponseMode,
  shouldAutoReplyAfterUserAction,
} from './wechatInteraction';

assert.equal(shouldAutoReplyAfterUserAction('text'), false);
assert.equal(shouldAutoReplyAfterUserAction('voice'), false);
assert.equal(shouldAutoReplyAfterUserAction('sticker'), true);
assert.equal(shouldAutoReplyAfterUserAction('transfer'), true);
assert.equal(shouldAutoReplyAfterUserAction('red-packet'), true);
assert.equal(shouldAutoReplyAfterUserAction('shopping'), true);
assert.equal(shouldAutoReplyAfterUserAction('image'), true);

assert.equal(getPendingResponseMode([{ kind: 'text' }, { kind: 'voice' }]), 'voice');
assert.equal(getPendingResponseMode([{ kind: 'sticker' }, { kind: 'transfer' }]), 'text');

assert.equal(canAcceptLifeCard({ role: 'model', kind: 'transfer', status: 'pending' }), true);
assert.equal(canAcceptLifeCard({ role: 'model', kind: 'red-packet', status: 'pending' }), true);
assert.equal(canAcceptLifeCard({ role: 'model', kind: 'shopping', status: 'pending' }), false);
assert.equal(canAcceptLifeCard({ role: 'user', kind: 'transfer', status: 'pending' }), false);
assert.equal(canAcceptLifeCard({ role: 'model', kind: 'transfer', status: 'accepted' }), false);

console.log('wechatInteraction tests passed');
