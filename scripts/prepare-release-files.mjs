/** Copy only an explicitly selected APK and Chinese announcement into a NEW delivery directory. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const args = process.argv.slice(2);
const values = {};
for (let i = 0; i < args.length; i += 2) {
  if (!['--apk', '--notes', '--out'].includes(args[i]) || !args[i + 1]) throw new Error('Use --apk FILE --notes FILE --out NEW_DIRECTORY');
  values[args[i]] = args[i + 1];
}
if (!values['--apk'] || !values['--notes'] || !values['--out']) throw new Error('Use --apk FILE --notes FILE --out NEW_DIRECTORY');
const apk = path.resolve(values['--apk']);
const notes = path.resolve(values['--notes']);
const out = path.resolve(values['--out']);
if (path.extname(apk).toLowerCase() !== '.apk' || path.extname(notes).toLowerCase() !== '.md') throw new Error('Expected .apk and .md');
if (!fs.statSync(apk).isFile() || !fs.statSync(notes).isFile()) throw new Error('Inputs must be files');
if (fs.existsSync(out)) throw new Error('Output already exists; choose a new directory. Nothing was overwritten.');
const apkData = fs.readFileSync(apk);
if (apkData[0] !== 0x50 || apkData[1] !== 0x4b) throw new Error('APK must be a ZIP container');
const notesData = fs.readFileSync(notes);
if (!/[\u3400-\u9fff]/u.test(notesData.toString('utf8'))) throw new Error('Chinese release notes are required');
if (path.basename(apk) === 'RELEASE.md') throw new Error('Name collision');
fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(apk, path.join(out, path.basename(apk)), fs.constants.COPYFILE_EXCL);
fs.writeFileSync(path.join(out, 'RELEASE.md'), notesData, { flag: 'wx' });
const sha = data => createHash('sha256').update(data).digest('hex');
const manifest = {
  createdAt: new Date().toISOString(),
  files: [
    { name: path.basename(apk), bytes: apkData.length, sha256: sha(apkData) },
    { name: 'RELEASE.md', bytes: notesData.length, sha256: sha(notesData) },
  ],
  checksStillRequired: ['package/version/signature', 'embedded web parity', 'upgrade and data restore', 'remote asset readback'],
};
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output: out, files: manifest.files }, null, 2));
