import { ChevronLeft, CircleUserRound, Users } from 'lucide-react';
import React from 'react';
import { cn } from '../../../lib/utils';
import type { Character, ChatMessage } from '../../../store';
import { useAppStore } from '../../../store';

export function WeChatTopBar({ title, right, onBack }: { title: string; right?: React.ReactNode; onBack?: () => void }) {
  const { goBack } = useAppStore();

  return (
    <header className="wechat-topbar">
      <button type="button" onClick={onBack || goBack} className="wechat-icon-button" aria-label="返回">
        <ChevronLeft className="h-6 w-6" />
      </button>
      <h1>{title}</h1>
      <div className="flex h-9 w-9 items-center justify-center">{right}</div>
    </header>
  );
}

export function WeChatAvatar({ src, name, large }: { src?: string | null; name: string; large?: boolean }) {
  return (
    <div className={cn('wechat-avatar', large && 'large')}>
      {src ? <img src={src} alt={name} /> : <CircleUserRound className="h-1/2 w-1/2 opacity-60" />}
    </div>
  );
}

export function WeChatGroupAvatar({ group, characters }: { group: { name: string; memberIds: string[] }; characters: Character[] }) {
  const members = group.memberIds
    .map((id) => characters.find((character) => character.id === id))
    .filter((character): character is Character => Boolean(character))
    .slice(0, 9);

  return (
    <div className="wechat-group-avatar">
      {members.length === 0
        ? <Users className="h-5 w-5" />
        : members.map((member) => (
            <span key={member.id}>
              {member.avatar ? <img src={member.avatar} alt={member.name} /> : <CircleUserRound className="h-4 w-4" />}
            </span>
          ))}
    </div>
  );
}

export function formatMessageTime(timestamp?: number) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function describeChatMessage(message: Pick<ChatMessage, 'kind' | 'content' | 'stickerLabel' | 'transcript' | 'recalled' | 'speakerId' | 'amount' | 'note' | 'itemName'>, forAi = false, speakers: Character[] = []) {
  if (message.recalled) return '已撤回一条消息';
  const speaker = message.speakerId ? speakers.find((character) => character.id === message.speakerId)?.name : '';
  const prefix = forAi && speaker ? `${speaker}：` : '';
  if (message.kind === 'sticker') return forAi ? `表情包注释：${message.stickerLabel || '表情包'}` : '表情';
  if (message.kind === 'image') return '图片';
  if (message.kind === 'voice') return `${prefix}${message.transcript || message.content || '语音'}`;
  if (message.kind === 'call-note') return `${prefix}通话：${message.content}`;
  if (message.kind === 'transfer') return `${prefix}转账：${message.amount || message.content}${message.note ? `，${message.note}` : ''}`;
  if (message.kind === 'red-packet') return `${prefix}红包：${message.note || message.content || '恭喜发财，大吉大利'}`;
  if (message.kind === 'shopping') return `${prefix}购物：${message.itemName || message.content}${message.amount ? `，${message.amount}` : ''}`;
  return `${prefix}${message.content}`;
}

export const wechatChatPresets = [
  {
    name: '自然微信',
    temperature: 0.8,
    contextDepth: 500,
    maxTokens: 520,
    replyStyle: 'auto' as const,
    prompt: '像真实微信聊天一样回复。先读完用户连续发来的几条消息，再按角色性格自然回应；可以只发一条，也可以把不同语气或补充拆成多条短气泡。不要写旁白、编号或解释。',
  },
  {
    name: '活人感微信',
    temperature: 0.88,
    contextDepth: 600,
    maxTokens: 680,
    replyStyle: 'auto' as const,
    prompt: '像真实微信里的活人一样聊天：短句、停顿、偶尔补一句，会接住对方情绪。可以低频主动发一个表情包、红包、转账或购物记录，但必须有生活动机，不能每轮都用，不能像客服或系统通知。',
  },
  {
    name: 'AI助手',
    temperature: 0.45,
    contextDepth: 500,
    maxTokens: 900,
    replyStyle: 'single' as const,
    prompt: '你是微信里的 AI 助手。先解决问题，再保持口吻自然简短；不抢戏，不写旁白，不冒充用户的现实行为。',
  },
  {
    name: '黏人连发',
    temperature: 0.92,
    contextDepth: 500,
    maxTokens: 620,
    replyStyle: 'burst' as const,
    prompt: '更主动、更黏人，容易连续补充两三条短消息。每条像微信气泡，短、具体、有情绪，但不要刷屏。',
  },
  {
    name: '克制冷淡',
    temperature: 0.62,
    contextDepth: 300,
    maxTokens: 260,
    replyStyle: 'single' as const,
    prompt: '克制、少说、像现实里不太主动的人。优先一条短回复，必要时才多发一条。',
  },
];

export function parseSillyTavernPreset(data: Record<string, unknown>) {
  const prompts = Array.isArray(data.prompts)
    ? data.prompts
        .filter((prompt): prompt is Record<string, unknown> => typeof prompt === 'object' && prompt !== null)
        .filter((prompt) => prompt.enabled !== false && typeof prompt.content === 'string' && prompt.content.trim())
        .sort((a, b) => Number(a.injection_order || 0) - Number(b.injection_order || 0))
        .map((prompt) => `【${String(prompt.name || prompt.identifier || '提示词')}】\n${String(prompt.content)}`)
    : [];

  return {
    name: String(data.name || data.preset_name || data.title || data.chat_completion_source || '导入预设'),
    prompt: prompts.join('\n\n') || String(data.prompt || data.system_prompt || data.systemPrompt || data.jailbreak || data.main_prompt || ''),
    temperature: clampNumber(Number(data.temperature ?? data.temp ?? 0.8), 0.1, 1.6),
    contextDepth: clampNumber(Math.round(Number(data.max_context_messages ?? data.depth ?? data.context_depth ?? data.openai_max_context ?? 500) / (data.openai_max_context ? 1000 : 1)) || 500, 20, 1000),
    maxTokens: clampNumber(Number(data.max_tokens ?? data.maxTokens ?? data.openai_max_tokens ?? data.response_length ?? 520), 120, 4000),
    model: String(data.deepseek_model || data.openai_model || data.custom_model || data.claude_model || data.model || ''),
  };
}
