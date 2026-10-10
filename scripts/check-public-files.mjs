/** Read-only publication scope gate. Never uploads, deletes, or reads file contents. */
import { execFileSync } from 'node:child_process';
const mode = process.argv[2] || '--staged';
if (!['--staged', '--tracked'].includes(mode)) throw new Error('Use --staged or --tracked');
const args = mode === '--staged'
  ? ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']
  : ['ls-files', '-z'];
const files = execFileSync('git', args, { encoding: 'utf8' }).split('\0').filter(Boolean);
export function isPrivateOrProcessPath(file) {
  const p = file.replaceAll('\\', '/');
  return /(^|\/)(node_modules|\.git|\.expo|\.mobile-tools|\.gradle)(\/|$)/.test(p)
    || /^(work|designs|主题美化|气泡美化|qa-screenshots|qa-edge-profile|release-delivery|dist|build|\.verification-build[^/]*)\//.test(p)
    || /^docs\/(tasks|archive|superpowers)\//.test(p)
    || /^docs\/(work-log\.md|verification-2026-09-10-backup-theater\.md|ui-ux-visual-audit-2026-08-16\.md)$/.test(p)
    || /^data\/(?!README\.md$)/.test(p)
    || /(^|\/)\.env(?!\.example$)(\.|$)/.test(p)
    || /(^|\/)(?:small-phone-backup-.*\.json|p5-visual-.*\.png)$/.test(p)
    || /\.(apk|log|pem|key|p12|pfx)$/i.test(p);
}
const blocked = files.filter(isPrivateOrProcessPath);
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const required = tracked.includes('package.json') ? [
  'README.md', 'NEXT.md', 'MAINTENANCE_OUTLINE.md', 'PROJECT_OUTLINE.md',
  'docs/PROTECTION_AND_RELEASE.md', 'docs/DATA_BACKEND_PLAN.md',
] : [];
const missing = required.filter(file => !tracked.includes(file));
const undocumented = [...new Set(tracked
  .filter(file => /^(src|api|server)\/.*\.(tsx?|jsx?|cjs)$/.test(file))
  .map(file => file.slice(0, file.lastIndexOf('/')) + '/README.md'))]
  .filter(file => !tracked.includes(file));
if (missing.length || undocumented.length) {
  console.error('Publication blocked: required maintenance documents missing from index:\n' + [...missing, ...undocumented].join('\n'));
  process.exitCode = 1;
}
if (blocked.length) {
  console.error('Publication blocked: local/private/process paths:\n' + blocked.join('\n'));
  process.exitCode = 1;
} else if (!process.exitCode) console.log(`Publication scope OK: ${files.length} ${mode.slice(2)} paths; maintenance entrypoints present. This is not a secret-content scan.`);
