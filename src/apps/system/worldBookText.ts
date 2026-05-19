const textKeys = new Set(['content', 'comment', 'name', 'title', 'memo', 'note', 'description']);
const listTextKeys = new Set(['keys', 'keywords']);
const ignoredKeys = new Set([
  'uid',
  'id',
  'key',
  'position',
  'order',
  'probability',
  'depth',
  'scan_depth',
  'extensions',
  'enabled',
  'selected',
  'constant',
  'selective',
  'disable',
  'display_index',
  'insertion_order',
]);

function repairMojibake(text: string) {
  if (!/[脙脗芒盲氓忙莽猫茅]/.test(text)) return text;
  try {
    const bytes = Uint8Array.from(text, (char) => char.charCodeAt(0) & 0xff);
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const originalCjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const decodedCjk = (decoded.match(/[\u4e00-\u9fff]/g) || []).length;
    return decodedCjk > originalCjk ? decoded : text;
  } catch {
    return text;
  }
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? repairMojibake(value).trim() : '';
}

function entryToText(entry: unknown): string {
  if (typeof entry === 'string') return cleanText(entry);
  if (!entry || typeof entry !== 'object') return '';
  const record = entry as Record<string, unknown>;
  const lines: string[] = [];

  for (const key of textKeys) {
    const value = cleanText(record[key]);
    if (value) lines.push(value);
  }

  for (const key of listTextKeys) {
    const value = record[key];
    if (Array.isArray(value)) {
      const text = value.map(cleanText).filter(Boolean).join('、');
      if (text) lines.push(text);
    }
  }

  if (lines.length === 0) {
    for (const [key, value] of Object.entries(record)) {
      if (ignoredKeys.has(key)) continue;
      if (typeof value === 'string') {
        const text = cleanText(value);
        if (text) lines.push(text);
      }
    }
  }

  return Array.from(new Set(lines)).join('\n');
}

function collectEntries(worldBook: unknown): unknown[] {
  if (!worldBook || typeof worldBook !== 'object') return [];
  if (Array.isArray(worldBook)) return worldBook;
  const record = worldBook as Record<string, unknown>;
  for (const key of ['entries', 'entry', 'worldInfo', 'world_info']) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  return [worldBook];
}

export function stringifyWorldBookForEditing(worldBook: unknown) {
  if (typeof worldBook === 'string') return repairMojibake(worldBook);
  const text = collectEntries(worldBook)
    .map(entryToText)
    .filter(Boolean)
    .join('\n\n');
  if (text) return text;
  try {
    return repairMojibake(JSON.stringify(worldBook || {}, null, 2));
  } catch {
    return '';
  }
}

export function parseWorldBookDraft(draft: string) {
  return repairMojibake(draft).trim();
}
