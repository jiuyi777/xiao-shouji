import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const srcDir = dirname(dirname(fileURLToPath(import.meta.url)));
const appsDir = join(srcDir, 'apps');
const requiredApps = ['wechat', 'bilibili', 'xiaohongshu', 'phone'];

assert(existsSync(appsDir), 'src/apps directory must exist');

for (const appName of requiredApps) {
  assert(existsSync(join(appsDir, appName)), `src/apps/${appName} must exist`);
}

assert(existsSync(join(appsDir, 'wechat', 'ai', 'wechatAi.ts')), 'WeChat AI module must live under src/apps/wechat');
assert(existsSync(join(appsDir, 'bilibili', 'BilibiliScreen.tsx')), 'Bilibili screen must live under src/apps/bilibili');
assert(existsSync(join(appsDir, 'xiaohongshu', 'XiaohongshuApp.tsx')), 'Xiaohongshu screen must live under src/apps/xiaohongshu');
assert(existsSync(join(appsDir, 'phone', 'PhoneScreen.tsx')), 'Phone screen must live under src/apps/phone');

console.log('apps folder structure ok');
