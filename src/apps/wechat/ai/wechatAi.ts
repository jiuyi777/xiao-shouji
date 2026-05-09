import type { Character } from '../../../store';
import { splitAssistantBubbles, type WeChatReplyStyle } from '../wechatChat';
import { parseWeChatAiReply, type WeChatAiParsedPart } from './wechatAiMessages';

export const weChatLifeActionInstruction = [
  '你可以在很合适的时候低频主动使用生活动作，但不要每轮都用：',
  '[sticker mood=comfort] 表示发一个表情包，mood 可用 comfort、happy、shy、tease、sad、ok。',
  '[transfer amount=188 note=晚饭钱] 表示主动转账。',
  '[red-packet amount=52 note=买点甜的] 表示主动发红包。',
  '[shopping item=奶茶 amount=18 note=我下单了] 表示买了东西或下单。',
  '生活动作必须有真实动机，不能刷屏，不能像客服或系统通知。',
].join('\n');

export function buildWeChatSystemPrompt({
  characterPrompt,
  characterName,
  memberInstruction,
  chatPresetPrompt,
  styleInstruction,
}: {
  characterPrompt: string;
  characterName: string;
  memberInstruction?: string;
  chatPresetPrompt: string;
  styleInstruction: string;
}) {
  return [
    characterPrompt || `你是${characterName}，正在微信里自然聊天。`,
    memberInstruction,
    chatPresetPrompt,
    styleInstruction,
    weChatLifeActionInstruction,
    '输出只写要发送的微信消息内容，不要写角色名、引号、旁白、编号。普通消息每条尽量不超过 30 个字，像真人微信短消息。生活动作单独一行。',
  ].filter(Boolean).join('\n');
}

export function fallbackWeChatReply(content: string, responseMode: 'text' | 'voice', chatReplyStyle: WeChatReplyStyle, speaker?: Character, memberInstruction = '') {
  if (responseMode === 'voice') {
    return `我听见了。\n${content.length > 30 || chatReplyStyle === 'burst' ? '你刚刚连着说这些，我在认真听。' : '这句我想再听一遍。'}`;
  }
  if (memberInstruction && speaker) {
    return `${speaker.name}看到了。\n${content.length > 18 ? '我也想说一句。' : '我在。'}`;
  }
  if (chatReplyStyle === 'burst') return '嗯嗯，我看到了。\n你刚才这几条我都懂。';
  return '嗯，我看到了。';
}

export function parseWeChatReplyParts(reply: string, style: WeChatReplyStyle, speakerName?: string): WeChatAiParsedPart[] {
  return parseWeChatAiReply(reply).flatMap<WeChatAiParsedPart>((part) => {
    if (part.kind !== 'text') return [part];
    return splitAssistantBubbles(part.content, style, speakerName).map((content) => ({ kind: 'text' as const, content }));
  });
}
