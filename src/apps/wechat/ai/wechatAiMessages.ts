export type WeChatAiParsedPart =
  | { kind: 'text'; content: string }
  | { kind: 'sticker'; mood?: string; label?: string }
  | { kind: 'transfer'; amount: string; note?: string }
  | { kind: 'red-packet'; amount?: string; note?: string }
  | { kind: 'shopping'; itemName: string; amount?: string; note?: string };

const actionLinePattern = /^\[(sticker|transfer|red-packet|shopping)(?:\s+([^\]]+))?\]$/;
const pairPattern = /(\w[\w-]*)=(?:"([^"]*)"|'([^']*)'|([^\s]+))/g;

function parsePairs(input = '') {
  const pairs: Record<string, string> = {};
  for (const match of input.matchAll(pairPattern)) {
    pairs[match[1]] = (match[2] ?? match[3] ?? match[4] ?? '').trim();
  }
  return pairs;
}

function parseActionLine(line: string): WeChatAiParsedPart | null {
  const match = line.match(actionLinePattern);
  if (!match) return null;
  const [, action, rawPairs] = match;
  const pairs = parsePairs(rawPairs);

  if (action === 'sticker') {
    return {
      kind: 'sticker',
      mood: pairs.mood || pairs.label || undefined,
      label: pairs.label || pairs.mood || undefined,
    };
  }

  if (action === 'transfer') {
    if (!pairs.amount) return null;
    return {
      kind: 'transfer',
      amount: pairs.amount,
      note: pairs.note || undefined,
    };
  }

  if (action === 'red-packet') {
    return {
      kind: 'red-packet',
      amount: pairs.amount || undefined,
      note: pairs.note || undefined,
    };
  }

  if (action === 'shopping') {
    const itemName = pairs.item || pairs.itemName || pairs.name;
    if (!itemName) return null;
    return {
      kind: 'shopping',
      itemName,
      amount: pairs.amount || undefined,
      note: pairs.note || undefined,
    };
  }

  return null;
}

export function parseWeChatAiReply(reply: string): WeChatAiParsedPart[] {
  const lines = reply
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [{ kind: 'text', content: '嗯，我看到了。' }];

  return lines.map((line) => {
    const action = parseActionLine(line);
    return action || { kind: 'text', content: line };
  });
}

export function describeWeChatAiPart(part: WeChatAiParsedPart) {
  if (part.kind === 'sticker') return `表情包：${part.label || part.mood || '表情'}`;
  if (part.kind === 'transfer') return `转账：${part.amount}${part.note ? `，${part.note}` : ''}`;
  if (part.kind === 'red-packet') return `红包：${part.amount || '未填金额'}${part.note ? `，${part.note}` : ''}`;
  if (part.kind === 'shopping') return `购物：${part.itemName}${part.amount ? `，${part.amount}` : ''}${part.note ? `，${part.note}` : ''}`;
  return part.content;
}
