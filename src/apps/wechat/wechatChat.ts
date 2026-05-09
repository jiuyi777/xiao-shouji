export type WeChatReplyStyle = 'auto' | 'single' | 'burst';

const narrationPrefix = /^(?:\u65c1\u767d|\u7cfb\u7edf|\u8bf4\u660e|\u52a8\u4f5c|\u53d9\u8ff0|\u5185\u5fc3|\u6ce8\u91ca)\s*[\uff1a:]/;
const listPrefix = /^(?:[-*]|\u2022|\d+[\).\u3001\uff0e]|[\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341]+[\).\u3001\uff0e])\s*/;
const edgeQuotes = /^[\"'\u201c\u201d\u2018\u2019`]+|[\"'\u201c\u201d\u2018\u2019`]+$/g;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function trimBubbleLine(line: string, speakerName?: string) {
  let next = line.replace(listPrefix, '').replace(edgeQuotes, '').trim();
  if (!next || narrationPrefix.test(next)) return '';

  if (speakerName) {
    next = next.replace(new RegExp(`^${escapeRegExp(speakerName)}\\s*[\\uff1a:]\\s*`), '').trim();
  }

  return next
    .replace(/^(AI|\u52a9\u624b|assistant|\u5fae\u4fe1|\u5bf9\u65b9|\u6211)\s*[\uff1a:]\s*/i, '')
    .trim();
}

function limitBubbleLength(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}...`;
}

export function splitAssistantBubbles(reply: string, style: WeChatReplyStyle, speakerName?: string) {
  const maxLength = style === 'burst' ? 56 : style === 'single' ? 64 : 72;
  const cleaned = reply
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => trimBubbleLine(line, speakerName))
    .filter(Boolean)
    .map((line) => limitBubbleLength(line, maxLength));

  if (style === 'single') return [limitBubbleLength(cleaned.join(' ') || reply.trim() || '...', maxLength)];
  if (cleaned.length > 1) return cleaned.slice(0, style === 'burst' ? 5 : 3);
  if (cleaned.length === 1) return cleaned;

  const text = trimBubbleLine(reply.trim(), speakerName);
  if (!text) return ['...'];
  if (style === 'burst' && /[\u3002\uff01\uff1f!?]/.test(text) && text.length > 28) {
    return text
      .split(/(?<=[\u3002\uff01\uff1f!?])/)
      .map((line) => trimBubbleLine(line, speakerName))
      .filter(Boolean)
      .slice(0, 4)
      .map((line) => limitBubbleLength(line, maxLength));
  }
  return [limitBubbleLength(text, maxLength)];
}
