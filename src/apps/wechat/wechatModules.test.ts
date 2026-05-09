import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const expectedModules = [
  'src/apps/wechat/chats/WeChatChats.tsx',
  'src/apps/wechat/contacts/WeChatContacts.tsx',
  'src/apps/wechat/discover/WeChatDiscover.tsx',
  'src/apps/wechat/me/WeChatMe.tsx',
];

for (const modulePath of expectedModules) {
  assert.equal(existsSync(join(root, modulePath)), true, `${modulePath} should exist`);
}
