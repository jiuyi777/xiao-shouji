import {
  Bot,
  BookOpen,
  Check,
  CircleUserRound,
  Clock,
  Copy,
  FileText,
  Image as ImageIcon,
  Import,
  KeyRound,
  Link,
  MessageCircle,
  Mic,
  Palette,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  Users,
  Zap,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { parseCharacterCard } from '../../lib/charaParser';
import { cn } from '../../lib/utils';
import type { Character, ChatMessage, DiaryEntry, GalleryPhoto, MemoEntry, MemoEntryColor, MemoEntryType, MusicTrack, Screen } from '../../store';
import { useAppStore } from '../../store';
import { speakWithConfiguredTts } from '../../tts';
import type { XiaohongshuNote } from '../xiaohongshu/types';
import { buildXiaohongshuContext } from '../xiaohongshu/xiaohongshuLogic';
import { Header, Panel, Pill, Field, Row, Empty, Avatar } from '../shared/AppPrimitives';
import { describeChatMessage } from '../shared/aiText';
import { themeOptions } from '../../themes/themeOptions';
import { appPresetDefinitions, roleMap, type AppPresetEntry, type AppPresetKey, type GeminiPresetRole } from '../../presets/softwarePresets';
import { parseWorldBookDraft, stringifyWorldBookForEditing } from './worldBookText';

const presetCards = [
  ['手机沉浸破限预设', '允许模拟微信、QQ、电话、日记、查手机等手机行为。'],
  ['日常陪伴', '适合语音条、聊天、朋友圈评论、生活琐事。'],
  ['剧情推进', '适合小剧场、偷窥 char、隐藏相册、搜索记录。'],
  ['强沉浸通话', '电话/视频通话时强调画面、停顿、环境声。'],
];

type ChatCompletionMessage = { role: 'user' | 'assistant' | 'system'; content: string };

function normalizeApiBaseUrl(url: string) {
  const trimmed = url.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.endsWith('/v1') ? trimmed : trimmed + '/v1';
}

async function fetchModelList(baseUrl: string, apiKey: string) {
  const endpoint = normalizeApiBaseUrl(baseUrl) + '/models';
  const response = await fetch(endpoint, {
    headers: apiKey ? { Authorization: 'Bearer ' + apiKey } : undefined,
  });
  if (!response.ok) throw new Error('Failed to fetch models: ' + response.status);
  const data = await response.json();
  return Array.isArray(data?.data) ? data.data.map((item: { id?: string }) => item.id).filter(Boolean) as string[] : [];
}

function speak(text: string) {
  const { ttsConfig } = useAppStore.getState();
  speakWithConfiguredTts(text, ttsConfig);
}

function formatDateLabel(time: number) {
  const date = new Date(time);
  return (date.getMonth() + 1) + '?' + date.getDate() + '?';
}

function getDiarySummary(entry: DiaryEntry) {
  return entry.content.replace(/\s+/g, ' ').slice(0, 62) || '还没有正文';
}

export function SettingsScreen() {
  const {
    ttsEnabled,
    setTtsEnabled,
    ttsConfig,
    setTtsConfig,
    userName,
    setUserName,
    apiBaseUrl,
    apiKey,
    availableModels,
    selectedModel,
    setModelConfig,
    setAvailableModels,
    imageGenerationConfig,
    setImageGenerationConfig,
    communityVerificationConfig,
    setCommunityVerificationConfig,
    addAppLog,
  } = useAppStore();
  const [tab, setTab] = useState<'model' | 'tts' | 'image' | 'community'>('model');
  const [modelStatus, setModelStatus] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [modelPulled, setModelPulled] = useState(false);

  const pullModels = async () => {
    if (!apiBaseUrl.trim()) {
      setModelStatus('先填写接口地址');
      return;
    }
    setModelStatus('正在拉取模型...');
    setModelPulled(false);
    try {
      const models = await fetchModelList(apiBaseUrl, apiKey);
      setAvailableModels(models);
      setModelStatus(models.length > 0 ? `已拉取 ${models.length} 个模型` : '接口可访问，但没有返回模型列表');
      setModelPulled(true);
      addAppLog({ type: 'success', title: '成功获取模型列表', detail: models.join('\n') || '接口可访问，但没有返回模型列表' });
    } catch (error) {
      const message = error instanceof Error ? error.message : '拉取失败';
      setModelStatus(message);
      addAppLog({ type: 'error', title: '拉取模型失败', detail: message });
    }
  };

  const saveSettings = () => {
    setSaveStatus('保存成功');
    window.setTimeout(() => setSaveStatus(''), 1800);
  };

  return (
    <section className="no-scrollbar flex h-full flex-col overflow-y-auto pb-4">
      <Header
        title="扩展设置"
        onSave={saveSettings}
        tabs={
          <>
            <Pill active={tab === 'model'} icon={<Settings />} label="文本大模型" onClick={() => setTab('model')} />
            <Pill active={tab === 'tts'} icon={<Mic />} label="TTS 语音" onClick={() => setTab('tts')} />
            <Pill active={tab === 'image'} icon={<Palette />} label="生图配置" onClick={() => setTab('image')} />
            <Pill active={tab === 'community'} icon={<Shield />} label="社区验证" onClick={() => setTab('community')} />
          </>
        }
      />
      {saveStatus ? (
        <div className="grid flex-1 place-items-center px-4">
          <div className="w-full rounded-[30px] border-[3px] border-[#111] bg-[#edf7ed] p-8 text-center shadow-[3px_4px_0_rgba(0,0,0,0.16)]">
            <Check className="mx-auto h-10 w-10" />
            <p className="mt-3 text-2xl font-black">保存成功</p>
          </div>
        </div>
      ) : (
        <>

      {tab === 'model' && (
        <>
          <Panel>
            <Field icon={<Link />} label="大模型接口地址">
              <input value={apiBaseUrl} onChange={(event) => setModelConfig({ apiBaseUrl: event.target.value })} className="hand-input w-full" placeholder="例如：http://127.0.0.1:8000/v1" />
            </Field>
            <Field icon={<KeyRound />} label="API 密钥 / Token">
              <input value={apiKey} onChange={(event) => setModelConfig({ apiKey: event.target.value })} className="hand-input w-full" type="password" placeholder="没有密钥可留空" />
            </Field>
            {availableModels.length > 0 && (
              <Field icon={<Bot />} label="选择模型">
                <select value={selectedModel} onChange={(event) => setModelConfig({ selectedModel: event.target.value })} className="hand-input w-full">
                  {availableModels.map((model) => <option key={model} value={model}>{model}</option>)}
                </select>
              </Field>
            )}
            <button onClick={pullModels} className={cn('fetch-button mt-2', modelPulled && 'bg-[#dceecd]')}>
              {modelPulled ? <Check className="h-5 w-5" /> : <RefreshCw className="h-5 w-5" />}
              {modelPulled ? '成功获取模型' : '点击拉取模型'}
            </button>
            {modelStatus && <p className="mt-3 text-sm font-black opacity-70">{modelStatus}</p>}
          </Panel>
          <div className="hand-note mx-4 mt-5 p-4">
            <div className="flex gap-3">
              <Zap className="mt-1 h-6 w-6 shrink-0" />
              <p className="text-sm font-black leading-relaxed">若使用本地网关（Oobabooga / OneAPI / vLLM），在此处填写对应地址。</p>
            </div>
          </div>
        </>
      )}

      {tab === 'tts' && (
        <Panel>
          <Field icon={<Mic />} label="TTS 提供商">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setTtsConfig({ provider: 'browser' })} className={cn('pill w-full', ttsConfig.provider === 'browser' && 'active')}>浏览器免费</button>
              <button onClick={() => setTtsConfig({ provider: 'local', baseUrl: ttsConfig.baseUrl || 'http://127.0.0.1:9880/tts' })} className={cn('pill w-full', ttsConfig.provider === 'local' && 'active')}>本地 HTTP</button>
              <button onClick={() => setTtsConfig({ provider: 'openai', model: ttsConfig.model || 'gpt-4o-mini-tts', voiceId: ttsConfig.voiceId || 'alloy' })} className={cn('pill w-full', ttsConfig.provider === 'openai' && 'active')}>OpenAI</button>
              <button onClick={() => setTtsConfig({ provider: 'gemini', model: ttsConfig.model || 'gemini-2.5-flash-preview-tts', voiceId: ttsConfig.voiceId || 'Kore' })} className={cn('pill w-full', ttsConfig.provider === 'gemini' && 'active')}>Gemini</button>
            </div>
          </Field>
          {ttsConfig.provider !== 'browser' && (
            <Field icon={<Link />} label="TTS 接口地址">
              <input
                value={ttsConfig.baseUrl}
                onChange={(event) => setTtsConfig({ baseUrl: event.target.value })}
                className="hand-input w-full"
                placeholder={ttsConfig.provider === 'local' ? '例如：http://127.0.0.1:9880/tts' : ttsConfig.provider === 'gemini' ? '默认：Google Gemini v1beta，可留空' : '默认：https://api.openai.com/v1，可留空'}
              />
            </Field>
          )}
          {(ttsConfig.provider === 'openai' || ttsConfig.provider === 'gemini') && (
            <>
              <Field icon={<KeyRound />} label="TTS API Key">
                <input value={ttsConfig.apiKey} onChange={(event) => setTtsConfig({ apiKey: event.target.value })} className="hand-input w-full" type="password" placeholder="官方 API key" />
              </Field>
              <Field icon={<Bot />} label="TTS 模型">
                <input
                  value={ttsConfig.model}
                  onChange={(event) => setTtsConfig({ model: event.target.value })}
                  className="hand-input w-full"
                  placeholder={ttsConfig.provider === 'gemini' ? 'gemini-2.5-flash-preview-tts' : 'gpt-4o-mini-tts'}
                />
              </Field>
            </>
          )}
          <Field icon={<KeyRound />} label="音色 / Voice ID">
            <input
              value={ttsConfig.voiceId}
              onChange={(event) => setTtsConfig({ voiceId: event.target.value })}
              className="hand-input w-full"
              placeholder={ttsConfig.provider === 'gemini' ? 'Kore' : ttsConfig.provider === 'openai' ? 'alloy' : 'default'}
            />
          </Field>
          <button onClick={() => setTtsEnabled(!ttsEnabled)} className="fetch-button mt-2">
            {ttsEnabled ? '关闭微信/电话 TTS' : '开启微信/电话 TTS'}
          </button>
          <button onClick={() => speak('这是一条 TTS 试听语音。')} className="fetch-button mt-3 bg-[#fff0bd]">
            试听 TTS
          </button>
          <p className="mt-3 text-xs font-black leading-5 opacity-60">
            浏览器免费语音无需 key；OpenAI/Gemini 需要官方 API key，本地 HTTP 适合 Piper、GPT-SoVITS、IndexTTS 等服务。
          </p>
        </Panel>
      )}

      {tab === 'image' && (
        <Panel>
          <p className="mb-4 text-sm font-black leading-6 opacity-65">这里保存全局 NAI 生图配置，微信、小红书和主动事件需要图片时会读取这里。</p>
          <Field icon={<Palette />} label="生图接口地址">
            <input
              value={imageGenerationConfig.baseUrl}
              onChange={(event) => setImageGenerationConfig({ baseUrl: event.target.value })}
              className="hand-input w-full"
              placeholder="https://image.novelai.net/ai/generate-image"
            />
          </Field>
          <Field icon={<KeyRound />} label="NAI API Key">
            <input
              value={imageGenerationConfig.apiKey}
              onChange={(event) => setImageGenerationConfig({ apiKey: event.target.value })}
              className="hand-input w-full"
              type="password"
              placeholder="只保存在本机浏览器里"
            />
          </Field>
          <Field icon={<Bot />} label="模型">
            <input
              value={imageGenerationConfig.model}
              onChange={(event) => setImageGenerationConfig({ model: event.target.value })}
              className="hand-input w-full"
              placeholder="nai-diffusion-3"
            />
          </Field>
          <Field icon={<ImageIcon />} label="默认尺寸">
            <div className="grid grid-cols-2 gap-2">
              <input
                value={imageGenerationConfig.width}
                onChange={(event) => setImageGenerationConfig({ width: Number(event.target.value) || 512 })}
                className="hand-input min-w-0"
                inputMode="numeric"
                placeholder="宽"
              />
              <input
                value={imageGenerationConfig.height}
                onChange={(event) => setImageGenerationConfig({ height: Number(event.target.value) || 512 })}
                className="hand-input min-w-0"
                inputMode="numeric"
                placeholder="高"
              />
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field icon={<RefreshCw />} label="步数">
              <input
                value={imageGenerationConfig.steps}
                onChange={(event) => setImageGenerationConfig({ steps: Number(event.target.value) || 18 })}
                className="hand-input w-full"
                inputMode="numeric"
              />
            </Field>
            <Field icon={<Sparkles />} label="CFG">
              <input
                value={imageGenerationConfig.scale}
                onChange={(event) => setImageGenerationConfig({ scale: Number(event.target.value) || 5 })}
                className="hand-input w-full"
                inputMode="decimal"
              />
            </Field>
          </div>
          <Field icon={<Sparkles />} label="通用正向提示串">
            <textarea
              value={imageGenerationConfig.promptPreset}
              onChange={(event) => setImageGenerationConfig({ promptPreset: event.target.value })}
              className="hand-input min-h-20 w-full resize-none"
            />
          </Field>
          <Field icon={<FileText />} label="反向提示">
            <textarea
              value={imageGenerationConfig.negativePrompt}
              onChange={(event) => setImageGenerationConfig({ negativePrompt: event.target.value })}
              className="hand-input min-h-20 w-full resize-none"
            />
          </Field>
        </Panel>
      )}

      {tab === 'community' && (
        <Panel>
          <p className="mb-4 text-sm font-black leading-6 opacity-65">后门码不写入前端或 APK。这里仅填写独立后端服务地址，真正的 48 小时代码和固定维护码都在后端环境变量里。</p>
          <Field icon={<KeyRound />} label="后门服务地址">
            <input
              value={communityVerificationConfig.backdoorApiUrl}
              onChange={(event) => setCommunityVerificationConfig({ backdoorApiUrl: event.target.value.trim() })}
              className="hand-input w-full"
              placeholder="例如：https://your-domain.example"
            />
          </Field>
          <Field icon={<KeyRound />} label="Discord Client ID">
            <input
              value={communityVerificationConfig.discordClientId}
              onChange={(event) => setCommunityVerificationConfig({ discordClientId: event.target.value.trim() })}
              className="hand-input w-full"
            />
          </Field>
          <Field icon={<Users />} label="Discord Guild ID">
            <textarea
              value={communityVerificationConfig.discordGuildIds.join('\n')}
              onChange={(event) => setCommunityVerificationConfig({ discordGuildIds: event.target.value.split(/[\n,，、]+/).map((item) => item.trim()).filter(Boolean) })}
              className="hand-input min-h-20 w-full resize-none"
            />
          </Field>
          <Field icon={<Users />} label="需要的社区/身份组名称">
            <textarea
              value={communityVerificationConfig.requiredGroups.join('\n')}
              onChange={(event) => setCommunityVerificationConfig({ requiredGroups: event.target.value.split(/[\n,，、]+/).map((item) => item.trim()).filter(Boolean) })}
              className="hand-input min-h-20 w-full resize-none"
            />
          </Field>
        </Panel>
      )}

      <Panel>
        <Field icon={<CircleUserRound />} label="你的名字">
          <input value={userName} onChange={(event) => setUserName(event.target.value)} className="hand-input w-full" />
        </Field>
      </Panel>
        </>
      )}
    </section>
  );
}

export function LogsScreen() {
  const { appLogs, clearAppLogs } = useAppStore();
  return (
    <section className="no-scrollbar h-full overflow-y-auto pb-8">
      <Header title="后台记录" subtitle="报错、模型请求、TTS 和音乐 API 调用" onSave={clearAppLogs} saveLabel="清空" />
      <Panel>
        {appLogs.length > 0 ? appLogs.map((log) => (
          <article key={log.id} className="border-b-[2px] border-[#111]/15 py-3 last:border-b-0">
            <div className="flex items-center justify-between gap-3">
              <span className={cn('app-chip justify-center text-xs', log.type === 'error' && 'bg-[#ffd6d6]', log.type === 'success' && 'bg-[#dceecd]', log.type === 'ai' && 'bg-[#f4edbd]', log.type === 'tts' && 'bg-[#cfe5ef]')}>{log.type}</span>
              <span className="shrink-0 text-[10px] font-black opacity-50">{new Date(log.createdAt).toLocaleTimeString()}</span>
            </div>
            <h3 className="mt-2 text-sm font-black">{log.title}</h3>
            {log.detail && <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-2xl bg-white/60 p-3 text-[11px] font-bold leading-5">{log.detail}</pre>}
          </article>
        )) : <Empty text="还没有后台记录。" />}
      </Panel>
    </section>
  );
}

export function ThemesScreen() {
  const { theme, setTheme } = useAppStore();
  return (
    <section className="h-full overflow-y-auto pb-8">
      <Header title="主题" subtitle="保持干净手机尺寸，也支持多个主题" />
      <Panel className="themes-panel">
        <div className="grid gap-3">
          {themeOptions.map((item) => (
            <button key={item.id} onClick={() => setTheme(item.id)} className={cn('theme-card', theme === item.id && 'active')}>
              <p className="text-lg font-black">{item.name}</p>
              <p className="text-sm font-bold opacity-65">{item.desc}</p>
            </button>
          ))}
        </div>
      </Panel>
    </section>
  );
}

type ContextRangeKey = 'today' | '1d' | '3d' | '5d' | '7d';
type ContextBudgetKey = 'light' | 'standard' | 'full';

const contextRangeOptions: Array<{ id: ContextRangeKey; label: string; days: number; desc: string }> = [
  { id: 'today', label: '今天', days: 0, desc: '当天 00:00 到现在' },
  { id: '1d', label: '近1天', days: 1, desc: '往前 24 小时' },
  { id: '3d', label: '近3天', days: 3, desc: '短期连续剧情' },
  { id: '5d', label: '近5天', days: 5, desc: '默认推荐' },
  { id: '7d', label: '近7天', days: 7, desc: '周总结' },
];

const contextBudgetOptions: Record<ContextBudgetKey, { label: string; min: number; max: number }> = {
  light: { label: '轻量', min: 8000, max: 12000 },
  standard: { label: '标准', min: 15000, max: 25000 },
  full: { label: '完整', min: 30000, max: 50000 },
};

type ContextPreviewRow = {
  app: string;
  range: string;
  content: string;
  count: number;
  method: string;
  chars: number;
};

function getContextRangeStart(range: ContextRangeKey) {
  const now = Date.now();
  if (range === 'today') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.getTime();
  }
  const option = contextRangeOptions.find((item) => item.id === range);
  return now - (option?.days || 5) * 24 * 60 * 60 * 1000;
}

function formatContextDateTime(time: number) {
  return new Date(time).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function summarizeText(text: string, maxLength: number) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '暂无内容';
  return clean.length > maxLength ? `${clean.slice(0, maxLength)}...` : clean;
}

function isHighImportanceMessage(message: ChatMessage) {
  if (message.favorite) return true;
  const text = `${message.content} ${message.transcript || ''} ${message.stickerLabel || ''}`;
  return /喜欢|想你|生气|难过|吃醋|对不起|约定|承诺|分手|和好|秘密|不要告诉|记住|设定|以后|永远|讨厌|害怕|崩溃|抱抱/.test(text);
}

function getSessionMessages(
  chatSessions: Record<string, { messages: ChatMessage[] }>,
  channel: 'wechat' | 'qq',
  targetId: string,
  startAt: number,
  limit: number,
) {
  const session = chatSessions[`${channel}:${targetId}`];
  return (session?.messages || [])
    .filter((message) => message.timestamp >= startAt)
    .slice(-limit);
}

function buildChatSection({
  title,
  messages,
  character,
  speakers,
}: {
  title: string;
  messages: ChatMessage[];
  character: Character;
  speakers: Character[];
}) {
  const important = messages.filter(isHighImportanceMessage).slice(-18);
  const recent = messages.slice(-30);
  const importantLines = important.map((message, index) => {
    const speaker = message.role === 'user'
      ? '用户'
      : message.speakerId
        ? speakers.find((item) => item.id === message.speakerId)?.name || character.name
        : character.name;
    return `${index + 1}. ${formatContextDateTime(message.timestamp)} ${speaker}：${describeChatMessage(message, true, speakers)}`;
  });
  const recentLines = recent.map((message) => {
    const speaker = message.role === 'user'
      ? '用户'
      : message.speakerId
        ? speakers.find((item) => item.id === message.speakerId)?.name || character.name
        : character.name;
    return `- ${formatContextDateTime(message.timestamp)} ${speaker}：${summarizeText(describeChatMessage(message, true, speakers), 80)}`;
  });
  return [
    `【${title}】`,
    `消息数量：${messages.length}`,
    importantLines.length ? '关键原话：' : '关键原话：暂无',
    ...importantLines,
    recentLines.length ? '最近聊天摘要：' : '最近聊天摘要：暂无',
    ...recentLines,
  ].join('\n');
}

function buildContextPackage({
  character,
  range,
  wechatLimit,
  qqLimit,
  state,
}: {
  character: Character;
  range: ContextRangeKey;
  wechatLimit: number;
  qqLimit: number;
  state: ReturnType<typeof useAppStore.getState>;
}) {
  const startAt = getContextRangeStart(range);
  const now = Date.now();
  const rangeLabel = `${formatContextDateTime(startAt)} - ${formatContextDateTime(now)}`;
  const todayStart = getContextRangeStart('today');
  const previewRows: ContextPreviewRow[] = [];
  const sections: string[] = [];
  const addSection = (row: Omit<ContextPreviewRow, 'chars'>, content: string) => {
    const chars = content.length;
    previewRows.push({ ...row, chars });
    sections.push(content);
  };

  const wechatMessages = getSessionMessages(state.chatSessions, 'wechat', character.id, startAt, wechatLimit);
  const qqMessages = getSessionMessages(state.chatSessions, 'qq', character.id, startAt, qqLimit);
  addSection(
    { app: '微信单聊', range: rangeLabel, content: `${character.name} 私聊`, count: wechatMessages.length, method: '关键原话 + 最近摘要' },
    buildChatSection({ title: `${character.name} / 微信单聊`, messages: wechatMessages, character, speakers: state.characters }),
  );
  addSection(
    { app: 'QQ单聊', range: rangeLabel, content: `${character.name} 私聊`, count: qqMessages.length, method: '关键原话 + 最近摘要' },
    buildChatSection({ title: `${character.name} / QQ单聊`, messages: qqMessages, character, speakers: state.characters }),
  );

  const groupSections = state.groupChats
    .filter((group) => group.memberIds.includes(character.id))
    .map((group) => {
      const messages = getSessionMessages(state.chatSessions, 'wechat', group.id, startAt, Math.min(wechatLimit, 200));
      return { group, messages, content: buildChatSection({ title: `${character.name} / 微信群聊 / ${group.name}`, messages, character, speakers: state.characters }) };
    })
    .filter((item) => item.messages.length > 0);
  if (groupSections.length > 0) {
    const content = groupSections.map((item) => item.content).join('\n\n');
    addSection(
      { app: '微信群聊', range: rangeLabel, content: `${character.name} 参与的群聊`, count: groupSections.reduce((sum, item) => sum + item.messages.length, 0), method: '只含当前角色参与群' },
      content,
    );
  }

  const diaryEntries = state.diaries
    .filter((entry) => entry.createdAt >= startAt)
    .filter((entry) => entry.owner === 'user' || entry.characterId === character.id);
  const diaryContent = [
    `【${character.name} / 日记关联】`,
    ...diaryEntries.map((entry) => {
      const isToday = entry.createdAt >= todayStart;
      const owner = entry.owner === 'char' ? character.name : '用户';
      const body = isToday ? summarizeText(entry.content, 900) : summarizeText(entry.content, 120);
      return `- ${formatContextDateTime(entry.createdAt)} ${owner}《${entry.title}》${entry.mood ? ` 情绪：${entry.mood}` : ''}\n  ${isToday ? '当天内容' : '旧日记摘要'}：${body}`;
    }),
  ].join('\n');
  addSection(
    { app: '日记', range: rangeLabel, content: '当天较完整，旧日记摘要', count: diaryEntries.length, method: '当天正文 / 旧日记50-120字' },
    diaryContent,
  );

  const browserItems = [
    ...state.browserSearches.filter((item) => item.createdAt >= startAt).map((item) => `搜索：${item.query}。${summarizeText(item.summary, 100)}`),
    ...state.browserHistory.filter((item) => item.visitedAt >= startAt).map((item) => `访问：${item.title} ${item.query ? `（来自搜索：${item.query}）` : ''}`),
    ...state.browserBookmarks.filter((item) => item.createdAt >= startAt).map((item) => `收藏：${item.title}。${summarizeText(item.snippet, 80)}`),
  ].slice(0, 30);
  const browserContent = [
    `【${character.name} / 浏览与内容消费】`,
    '说明：浏览器只作为兴趣和状态线索；搜索过不等于世界事实。',
    state.browserWorldBook ? `世界书摘要：${summarizeText(state.browserWorldBook, 600)}` : '世界书摘要：暂无',
    browserItems.length ? '最近浏览主题：' : '最近浏览主题：暂无',
    ...browserItems.map((item) => `- ${item}`),
  ].join('\n');
  addSection(
    { app: '浏览器', range: rangeLabel, content: '兴趣和搜索主题', count: browserItems.length, method: '聚合总结' },
    browserContent,
  );

  const xiaohongshuNotes = state.xiaohongshuNotes.filter((note) => note.createdAt >= startAt);
  addSection(
    { app: '小红书', range: rangeLabel, content: '图文笔记、标签、收藏状态', count: xiaohongshuNotes.length, method: '只读取小红书条目' },
    buildXiaohongshuContext(xiaohongshuNotes, 20),
  );

  const listenRecords = state.musicListenRecords
    .filter((record) => record.createdAt >= startAt && record.characterId === character.id)
    .slice(0, 30);
  const charTracks = state.musicTracks
    .filter((track) => track.characterId === character.id || track.source === 'char')
    .filter((track) => (track.lastPlayedAt || track.createdAt) >= startAt)
    .slice(0, 20);
  const musicContent = [
    `【${character.name} / 音乐】`,
    `一起听次数：${listenRecords.length}`,
    ...listenRecords.map((record) => {
      const track = state.musicTracks.find((item) => item.id === record.trackId);
      return `- ${formatContextDateTime(record.createdAt)} 一起听：${track?.title || '未知歌曲'}${record.durationSeconds ? `，约 ${Math.round(record.durationSeconds / 60)} 分钟` : ''}${record.note ? `。备注：${record.note}` : ''}`;
    }),
    charTracks.length ? 'char 相关歌曲：' : 'char 相关歌曲：暂无',
    ...charTracks.map((track) => `- ${track.title} / ${track.artist}${track.liked ? '（我喜欢）' : ''}${track.lyrics ? `。歌词摘要：${summarizeText(track.lyrics, 80)}` : ''}`),
  ].join('\n');
  addSection(
    { app: '音乐', range: rangeLabel, content: '一起听、最近播放、char创作', count: listenRecords.length + charTracks.length, method: '摘要 + 排行' },
    musicContent,
  );

  const photos = state.galleryPhotos
    .filter((photo) => photo.createdAt >= startAt)
    .filter((photo) => photo.characterId === character.id || photo.readableByChar)
    .slice(0, 20);
  const galleryContent = [
    `【${character.name} / 相册】`,
    ...photos.map((photo) => `- ${formatContextDateTime(photo.createdAt)} ${photo.title}。标签：${photo.tags.join('、') || '无'}${photo.note ? `。备注：${summarizeText(photo.note, 80)}` : ''}`),
  ].join('\n');
  addSection(
    { app: '相册', range: rangeLabel, content: `可给 ${character.name} 看或关联该角色`, count: photos.length, method: '标题 + 标签 + 备注' },
    galleryContent,
  );

  const memos = state.memos
    .filter((memo) => memo.createdAt >= startAt || (memo.reminderAt || 0) >= startAt)
    .filter((memo) => !memo.characterId || memo.characterId === character.id || memo.readableByChar)
    .slice(0, 20);
  const events = state.calendarEvents
    .filter((event) => event.startAt >= startAt || event.createdAt >= startAt)
    .filter((event) => event.owner === 'shared' || event.owner === 'user' || event.characterId === character.id)
    .slice(0, 20);
  const taskContent = [
    `【${character.name} / 备忘录与日历】`,
    memos.length ? '备忘录：' : '备忘录：暂无',
    ...memos.map((memo) => `- ${memo.completed ? '已完成' : '未完成'} ${memo.title}：${summarizeText(memo.content, 80)}`),
    events.length ? '日历：' : '日历：暂无',
    ...events.map((event) => `- ${formatContextDateTime(event.startAt)} ${event.title}${event.note ? `：${summarizeText(event.note, 80)}` : ''}`),
  ].join('\n');
  addSection(
    { app: '备忘录/日历', range: rangeLabel, content: '待办、约定、未来事件', count: memos.length + events.length, method: '摘要' },
    taskContent,
  );

  const relationshipSignals = [
    wechatMessages.length ? `微信 ${wechatMessages.length} 条` : '',
    qqMessages.length ? `QQ ${qqMessages.length} 条` : '',
    listenRecords.length ? `一起听 ${listenRecords.length} 次` : '',
    diaryEntries.length ? `关联日记 ${diaryEntries.length} 篇` : '',
  ].filter(Boolean).join('，') || '暂无明显新互动';

  const header = [
    '你将接收一份小手机 App 的跨软件上下文总结。请把它当作长期记忆和当前状态参考。',
    '',
    '要求：',
    '1. 优先遵守用户当前消息。',
    '2. 使用总结中的事实保持连续性。',
    '3. 不要把总结逐字复述给用户。',
    '4. 当信息冲突时，以时间更新的记录为准。',
    '5. 默认只使用当前角色相关上下文，不要主动提其他角色私密内容。',
    '6. 如果缺少关键信息，先自然询问，不要编造。',
    '',
    `当前角色：${character.name}`,
    `汇总范围：${rangeLabel}`,
    `聊天数量上限：微信 ${wechatLimit} / QQ ${qqLimit}`,
    '',
    '【全局摘要】',
    `用户昵称：${state.userName || '我'}。本次按现实时间汇总，只发送 ${character.name} 相关内容。最近关系线索：${relationshipSignals}。`,
    '',
    '【当前角色状态】',
    `角色：${character.name}`,
    `人设摘要：${summarizeText([character.description, character.personality].filter(Boolean).join(' '), 240)}`,
    `待延续事项：优先延续高重要聊天、当天日记、一起听记录和未完成待办。`,
    '',
    '【各软件详细信息】',
  ].join('\n');

  const text = `${header}\n\n${sections.join('\n\n')}`;
  return { text, previewRows, rangeLabel, totalChars: text.length };
}

export function AIContextScreen() {
  const state = useAppStore();
  const {
    characters,
    addAppLog,
  } = state;
  const [characterId, setCharacterId] = useState(characters[0]?.id || '');
  const [range, setRange] = useState<ContextRangeKey>('5d');
  const [budget, setBudget] = useState<ContextBudgetKey>('standard');
  const [wechatLimit, setWechatLimit] = useState(300);
  const [qqLimit, setQqLimit] = useState(200);
  const [status, setStatus] = useState('');
  const character = characters.find((item) => item.id === characterId) || characters[0];

  useEffect(() => {
    if (!characterId && characters[0]?.id) setCharacterId(characters[0].id);
  }, [characterId, characters]);

  if (!character) {
    return (
      <section className="no-scrollbar h-full overflow-y-auto pb-8">
        <Header title="AI 上下文" subtitle="先导入角色，再生成角色独立上下文" />
        <Panel>
          <Empty text="还没有角色。导入角色卡后，这里会按角色拆分微信、QQ、日记、音乐和浏览内容。" />
        </Panel>
      </section>
    );
  }

  const contextPackage = buildContextPackage({ character, range, wechatLimit, qqLimit, state });
  const budgetInfo = contextBudgetOptions[budget];
  const overBudget = contextPackage.totalChars > budgetInfo.max;
  const overHardLimit = contextPackage.totalChars > 60000;

  const copyContext = async () => {
    try {
      await navigator.clipboard.writeText(contextPackage.text);
      setStatus('已复制上下文。');
    } catch {
      setStatus('浏览器不允许自动复制，可以先写入后台记录再手动复制。');
    }
  };

  const recordContext = () => {
    addAppLog({
      type: overHardLimit ? 'error' : 'ai',
      title: `AI上下文：${character.name}`,
      detail: [
        `角色：${character.name}`,
        `范围：${contextPackage.rangeLabel}`,
        `字符数：${contextPackage.totalChars}`,
        `预算：${budgetInfo.label}`,
        `微信上限：${wechatLimit}`,
        `QQ上限：${qqLimit}`,
        '',
        contextPackage.text,
      ].join('\n'),
    });
    setStatus('已写入后台记录。');
  };

  return (
    <section className="no-scrollbar h-full overflow-y-auto pb-8">
      <Header title="AI 上下文" subtitle="按现实时间和当前角色生成记忆包" />
      <Panel>
        <Field icon={<CircleUserRound />} label="当前角色">
          <select value={character.id} onChange={(event) => setCharacterId(event.target.value)} className="hand-input w-full">
            {characters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Field>
        <Field icon={<Clock />} label="现实时间范围">
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {contextRangeOptions.map((item) => (
              <Pill key={item.id} icon={<Clock />} label={item.label} active={range === item.id} onClick={() => setRange(item.id)} />
            ))}
          </div>
          <p className="mt-2 text-xs font-bold opacity-60">{contextRangeOptions.find((item) => item.id === range)?.desc}</p>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field icon={<MessageCircle />} label="微信条数">
            <select value={wechatLimit} onChange={(event) => setWechatLimit(Number(event.target.value))} className="hand-input w-full">
              {[100, 300, 500, 1000].map((value) => <option key={value} value={value}>最近 {value} 条</option>)}
            </select>
          </Field>
          <Field icon={<Bot />} label="QQ条数">
            <select value={qqLimit} onChange={(event) => setQqLimit(Number(event.target.value))} className="hand-input w-full">
              {[100, 200, 300, 500, 1000].map((value) => <option key={value} value={value}>最近 {value} 条</option>)}
            </select>
          </Field>
        </div>
        <Field icon={<Shield />} label="上下文预算">
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {(Object.entries(contextBudgetOptions) as Array<[ContextBudgetKey, typeof contextBudgetOptions[ContextBudgetKey]]>).map(([id, item]) => (
              <Pill key={id} icon={<Shield />} label={item.label} active={budget === id} onClick={() => setBudget(id)} />
            ))}
          </div>
        </Field>
      </Panel>

      <Panel>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-black">发送预览</p>
            <p className="text-sm font-bold opacity-60">默认角色隔离，不发送其他角色私聊和专属日记。</p>
          </div>
          <span className={cn('rounded-full border-[2px] border-[#111] px-3 py-1 text-xs font-black', overHardLimit ? 'bg-[#ffd6d6]' : overBudget ? 'bg-[#fff0b8]' : 'bg-white/70')}>
            {contextPackage.totalChars} 字
          </span>
        </div>
        <div className="mt-4 overflow-hidden rounded-[18px] border-[3px] border-[#111] bg-white/65">
          {contextPackage.previewRows.map((row) => (
            <div key={`${row.app}-${row.content}`} className="grid grid-cols-[74px_1fr_54px] gap-2 border-b-[2px] border-[#111]/15 p-3 text-xs font-bold last:border-b-0">
              <span className="font-black">{row.app}</span>
              <span className="min-w-0">
                <span className="block truncate">{row.content}</span>
                <span className="block opacity-55">{row.method} · {row.range}</span>
              </span>
              <span className="text-right">{row.count}条<br />{row.chars}字</span>
            </div>
          ))}
        </div>
        {overHardLimit && <p className="mt-3 text-sm font-black text-[#9d1f1f]">超过 60000 字，建议分包或降低聊天条数。</p>}
        {!overHardLimit && overBudget && <p className="mt-3 text-sm font-black text-[#7a4b00]">超过当前预算档位，建议降低聊天条数或改轻量档。</p>}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" onClick={copyContext} disabled={overHardLimit} className="fetch-button disabled:opacity-45">
            <Copy className="h-5 w-5" />
            复制上下文
          </button>
          <button type="button" onClick={recordContext} className="fetch-button">
            <FileText className="h-5 w-5" />
            写入记录
          </button>
        </div>
        {status && <p className="mt-3 text-sm font-black opacity-70">{status}</p>}
      </Panel>

      <Panel>
        <p className="text-lg font-black">生成内容</p>
        <textarea readOnly value={contextPackage.text} className="hand-input mt-3 min-h-72 w-full resize-none text-xs leading-5" />
      </Panel>
    </section>
  );
}

export function PresetsScreen() {
  const { presetName, setPresetName, appPresets, setAppPreset, resetAppPreset, resetAllAppPresets } = useAppStore();
  const [activePresetKey, setActivePresetKey] = useState<AppPresetKey>('wechat');
  const activeDefinition = appPresetDefinitions.find((item) => item.key === activePresetKey) || appPresetDefinitions[0];
  const activePreset = appPresets[activePresetKey];
  const activeEntry = activePreset.entries.find((entry) => entry.id === activePreset.activeEntryId) || activePreset.entries[0];
  const commitEntries = (entries: AppPresetEntry[], activeEntryId = activePreset.activeEntryId) => {
    const selected = entries.find((entry) => entry.id === activeEntryId) || entries[0];
    setAppPreset(activePresetKey, {
      entries,
      activeEntryId: selected?.id,
      name: selected?.name || activePreset.name,
      prompt: selected?.prompt || activePreset.prompt,
      role: selected?.role || activePreset.role,
    });
  };
  const updateActiveEntry = (updates: Partial<Omit<AppPresetEntry, 'id'>>) => {
    const entries = activePreset.entries.map((entry) =>
      entry.id === activeEntry.id ? { ...entry, ...updates } : entry,
    );
    commitEntries(entries, activeEntry.id);
  };
  const addEntry = () => {
    const id = `${activePresetKey}-${Date.now()}`;
    const entry: AppPresetEntry = {
      id,
      name: '新条目',
      role: 'system',
      prompt: '',
    };
    commitEntries([...activePreset.entries, entry], id);
  };
  const deleteEntry = () => {
    if (activePreset.entries.length <= 1) return;
    const entries = activePreset.entries.filter((entry) => entry.id !== activeEntry.id);
    commitEntries(entries, entries[0]?.id);
  };
  const selectEntry = (id: string) => commitEntries(activePreset.entries, id);

  return (
    <section className="no-scrollbar h-full overflow-y-auto px-1 pb-24">
      <Header title="预设" subtitle="每个软件都有自己的提示词，玩家可以单独改写。" />
      <Panel>
        {presetCards.map(([name, desc]) => (
          <button key={name} onClick={() => setPresetName(name)} className={cn('theme-card mb-3 last:mb-0', presetName === name && 'active')}>
            <p className="text-lg font-black">{name}</p>
            <p className="text-sm font-bold opacity-65">{desc}</p>
          </button>
        ))}
      </Panel>
      <Panel>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-black">软件预设</p>
            <p className="mt-1 text-sm font-bold opacity-65">每个软件可以建多条预设，选择当前启用条目，并指定这条内容以什么身份发送。</p>
          </div>
          <button type="button" onClick={resetAllAppPresets} className="icon-button h-10 w-10 shrink-0" title="全部恢复默认">
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {appPresetDefinitions.map((definition) => (
            <button
              key={definition.key}
              type="button"
              onClick={() => setActivePresetKey(definition.key)}
              className={cn('rounded-[18px] border-[2px] border-[#111]/20 bg-white/60 p-3 text-left text-sm font-black transition', activePresetKey === definition.key && 'border-[#111] bg-[var(--theme-panel)] shadow-[3px_3px_0_#111]')}
            >
              <span className="block truncate">{definition.label}</span>
              <span className="mt-1 block truncate text-[11px] opacity-55">{appPresets[definition.key]?.name || definition.name}</span>
            </button>
          ))}
        </div>
      </Panel>
      <Panel>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-black">{activeDefinition.appName}</p>
            <p className="mt-1 text-sm font-bold opacity-65">{activeDefinition.summary}</p>
          </div>
          <button type="button" onClick={() => resetAppPreset(activePresetKey)} className="icon-button h-10 w-10 shrink-0" title="恢复这个软件默认">
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        <Field icon={<Search />} label="预设名称">
          <input
            value={activeEntry.name}
            onChange={(event) => updateActiveEntry({ name: event.target.value })}
            className="hand-input w-full"
          />
        </Field>

        <Field icon={<FileText />} label="条目选择">
          <div className="grid gap-2">
            {activePreset.entries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => selectEntry(entry.id)}
                className={cn('theme-card p-3 text-left', activeEntry.id === entry.id && 'active')}
              >
                <span className="block truncate text-sm font-black">{entry.name}</span>
                <span className="mt-1 block text-xs font-bold opacity-60">{roleMap[entry.role].label} · {entry.prompt.trim() ? `${entry.prompt.trim().length} 字` : '空内容'}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={addEntry} className="fetch-button">
              新增条目
            </button>
            <button type="button" onClick={deleteEntry} disabled={activePreset.entries.length <= 1} className="fetch-button disabled:opacity-45">
              删除条目
            </button>
          </div>
        </Field>

        <Field icon={<Bot />} label="这条内容以什么发送">
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(roleMap) as GeminiPresetRole[]).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => updateActiveEntry({ role })}
                className={cn('rounded-[14px] border-[2px] border-[#111]/20 bg-white/60 px-2 py-2 text-xs font-black', activeEntry.role === role && 'border-[#111] bg-[var(--theme-accent)] text-white shadow-[2px_2px_0_#111]')}
              >
                {roleMap[role].label}
              </button>
            ))}
          </div>
          <div className="mt-3 rounded-[16px] border-[2px] border-[#111]/15 bg-white/55 p-3 text-xs font-bold leading-5 opacity-75">
            <p>OpenAI: {roleMap[activeEntry.role].openAiRole}</p>
            <p>Gemini: {roleMap[activeEntry.role].geminiRole}</p>
            <p>{roleMap[activeEntry.role].hint}</p>
          </div>
        </Field>

        <Field icon={<FileText />} label="预设内容">
          <textarea
            value={activeEntry.prompt}
            onChange={(event) => updateActiveEntry({ prompt: event.target.value })}
            className="hand-input min-h-56 w-full resize-y text-sm leading-6"
          />
        </Field>
      </Panel>
    </section>
  );
}

function repairMojibake(text: string) {
  if (!/[ÃÂâäåæçèé]/.test(text)) return text;
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

export function ContactsScreen() {
  const { characters, addCharacter, updateCharacter, deleteCharacter, openChat } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('支持导入酒馆 PNG/JSON 角色卡。');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [worldBookDrafts, setWorldBookDrafts] = useState<Record<string, string>>({});
  const character = characters.find((item) => item.id === editingId) || null;

  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = (await parseCharacterCard(file)) as Character;
      addCharacter(imported);
      setEditingId(imported.id);
      setStatus(`已导入：${imported.name}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '导入失败');
    } finally {
      event.target.value = '';
    }
  };

  if (character) {
    const worldBookText = worldBookDrafts[character.id] ?? stringifyWorldBookForEditing(character.worldBook);
    const saveCharacter = () => {
      const draft = worldBookDrafts[character.id];
      if (draft !== undefined) {
        updateCharacter(character.id, { worldBook: parseWorldBookDraft(draft) });
      }
      setEditingId(null);
    };
    const removeCharacter = () => {
      const confirmed = window.confirm(`确定删除「${character.name}」吗？通讯录、微信聊天、群聊成员、电话、日记、相册、备忘录、音乐等关联记录都会一起删除。`);
      if (!confirmed) return;
      deleteCharacter(character.id);
      setWorldBookDrafts((state) => {
        const next = { ...state };
        delete next[character.id];
        return next;
      });
      setEditingId(null);
      setStatus(`已删除：${character.name}`);
    };
    return (
      <section className="character-profile-screen h-full overflow-y-auto pb-4">
        <Header title="角色资料" subtitle="人设、世界书和开场白都可以自己改" onSave={saveCharacter} />
        <Panel className="character-profile-panel">
          <div className="mb-2 flex items-center gap-3">
            <Avatar character={character} />
            <div className="min-w-0">
              <p className="text-lg font-black">{character.name}</p>
              <p className="text-xs font-bold opacity-60">导入后停留在资料页，不会强制跳微信</p>
            </div>
          </div>
          <Field icon={<CircleUserRound />} label="名字">
            <input value={character.name} onChange={(event) => updateCharacter(character.id, { name: event.target.value })} className="hand-input w-full" />
          </Field>
          <Field icon={<BookOpen />} label="人设 / Description">
            <textarea value={character.description} onChange={(event) => updateCharacter(character.id, { description: event.target.value })} className="hand-input min-h-20 w-full resize-none" />
          </Field>
          <Field icon={<Sparkles />} label="性格 / Personality">
            <textarea value={character.personality} onChange={(event) => updateCharacter(character.id, { personality: event.target.value })} className="hand-input min-h-20 w-full resize-none" />
          </Field>
          <Field icon={<MessageCircle />} label="开场白">
            <textarea value={character.firstMessage} onChange={(event) => updateCharacter(character.id, { firstMessage: event.target.value })} className="hand-input min-h-20 w-full resize-none" />
          </Field>
          <Field icon={<Shield />} label="系统提示词">
            <textarea value={character.systemPrompt} onChange={(event) => updateCharacter(character.id, { systemPrompt: event.target.value })} className="hand-input min-h-20 w-full resize-none" />
          </Field>
          <Field icon={<FileText />} label="世界书">
            <textarea
              value={worldBookText}
              onChange={(event) => setWorldBookDrafts((state) => ({ ...state, [character.id]: event.target.value }))}
              className="hand-input min-h-28 w-full resize-y text-sm leading-6"
            />
          </Field>
          <div className="character-profile-actions">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => openChat(character.id, 'wechat')} className="fetch-button">微信聊天</button>
              <button onClick={saveCharacter} className="fetch-button bg-[#fff0bd]">保存返回</button>
            </div>
            <button type="button" onClick={removeCharacter} className="character-profile-delete-button">
              <Trash2 className="h-5 w-5" />
              删除角色
            </button>
          </div>
        </Panel>
      </section>
    );
  }

  return (
    <section className="h-full overflow-y-auto pb-8">
      <Header title="通讯录" subtitle={status} />
      <Panel>
        <button onClick={() => inputRef.current?.click()} className="fetch-button">
          <Import className="h-5 w-5" />
          导入酒馆卡
        </button>
        <input ref={inputRef} type="file" accept=".png,.json" onChange={importFile} className="hidden" />
      </Panel>
      <Panel>
        {characters.length === 0 && <Empty text="导入后，这里会成为 char 的通讯录。" />}
        {characters.map((item) => (
          <button key={item.id} onClick={() => setEditingId(item.id)} className="list-row">
            <Avatar character={item} />
            <div className="min-w-0 flex-1 text-left">
              <p className="text-lg font-black">{item.name}</p>
              <p className="truncate text-sm font-bold opacity-60">{item.description || item.personality || '酒馆卡角色'}</p>
            </div>
          </button>
        ))}
      </Panel>
    </section>
  );
}
