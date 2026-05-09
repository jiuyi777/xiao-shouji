/**
 * Small phone app shell and current production UI.
 * Main functions/components: App, AppErrorBoundary, Desktop, FeatureScreen, XiaohongshuApp, BilibiliScreen, WeChatApp,
 * WeChatApp, ChatScreen, Bubble, repairMojibake,
 * fetchModelList, requestChatCompletion, describeChatMessage, getCharacterPrompt,
 * delay, formatMessageTime, clampNumber,
 * CalendarScreen, GalleryScreen, ContactsScreen, SettingsScreen, ThemesScreen, VideoCallScreen.
 * State dependencies: useAppStore from src/store.ts; Character/Screen/ThemeType/CalendarEvent/GalleryPhoto types.
 * Utility dependencies: pageApps/dockApps from src/shell/appCatalog.tsx, PhoneScreen from src/apps/phone/PhoneScreen.tsx, BilibiliScreen from src/apps/bilibili/BilibiliScreen.tsx, speakWithConfiguredTts from src/tts.ts, parseCharacterCard from src/lib/charaParser.ts, cn/createId from src/lib/utils.ts.
 * Styling dependencies: src/index.css owns theme variables, phone shell, WeChat, chat, desktop styles.
 * Maintenance note: this file is still the active UI entry; src/pages/* are placeholders until routed in.
 */
import {
  BookOpen,
  Bot,
  CalendarDays,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Clock,
  Clapperboard,
  Compass,
  Copy,
  Droplets,
  FileText,
  Gift,
  Grid2X2,
  Heart,
  Headphones,
  Image as ImageIcon,
  ImagePlus,
  Import,
  KeyRound,
  Link,
  LockKeyhole,
  MapPin,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Music,
  Pause,
  Palette,
  Phone,
  Play,
  Plus,
  Quote,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  ShoppingBag,
  Shuffle,
  SkipBack,
  SkipForward,
  SmilePlus,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Undo2,
  Users,
  UserPlus,
  Video,
  Volume2,
  Wand2,
  Zap,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { parseCharacterCard } from './lib/charaParser';
import { PhoneScreen } from './apps/phone/PhoneScreen';
import { speakWithConfiguredTts } from './tts';
import { BrowserSearchResult, CalendarEvent, Character, ChatMessage, CustomWidget, DiaryEntry, GalleryPhoto, LayoutMode, MemoEntry, MemoEntryColor, MemoEntryType, MusicPlaylist, MusicTrack, Screen, StickerItem, TheaterScene, TheaterWorldBookEntry, ThemeType, useAppStore } from './store';
import { cn, createId } from './lib/utils';
import { BilibiliScreen } from './apps/bilibili/BilibiliScreen';
import { XiaohongshuApp } from './apps/xiaohongshu/XiaohongshuApp';
import { buildXiaohongshuContext } from './apps/xiaohongshu/xiaohongshuLogic';
import type { XiaohongshuNote } from './apps/xiaohongshu/types';
import { dockApps, pageApps } from './shell/appCatalog';
import { buildWeChatSystemPrompt, fallbackWeChatReply, parseWeChatReplyParts } from './apps/wechat/ai/wechatAi';
import type { WeChatAiParsedPart } from './apps/wechat/ai/wechatAiMessages';
import { WeChatChats } from './apps/wechat/chats/WeChatChats';
import { WeChatContacts } from './apps/wechat/contacts/WeChatContacts';
import { WeChatDiscover } from './apps/wechat/discover/WeChatDiscover';
import { WeChatMe } from './apps/wechat/me/WeChatMe';
import { WeChatAvatar } from './apps/wechat/shared/WeChatShared';
import {
  buildTheaterLengthInstruction,
  buildTheaterSystemPrompt,
  buildTheaterUserPrompt,
  getRandomBlocks,
  getTheaterMaxTokens,
  parseTheaterTopicImport,
  parseWorldBookJson,
  resolveTavernRandom,
  rollWorldBookEntries,
  theaterLengthLabels,
} from './theaterLogic';

const gothicDesktopPositions: Record<string, { x: number; y: number }> = {
  wechat: { x: 24, y: 72 },
  qq: { x: 108, y: 72 },
  gallery: { x: 24, y: 172 },
  calendar: { x: 108, y: 172 },
  diary: { x: 38, y: 382 },
  memo: { x: 132, y: 382 },
  peek: { x: 226, y: 382 },
  'image-bed': { x: 198, y: 86 },
  'time-card': { x: 18, y: 270 },
};

const themeOptions: Array<{ id: ThemeType; name: string; desc: string }> = [
  { id: 'pastel', name: '奶油手绘', desc: '粗描边、浅色块、正常手机桌面。' },
  { id: 'gothic', name: '哥特玻璃', desc: '参考图二的灰黑玻璃手机，叠加红黑素材纹理。' },
];

const presetCards = [
  ['手机沉浸破限预设', '允许模拟微信、QQ、电话、日记、查手机等手机行为。'],
  ['日常陪伴', '适合语音条、聊天、朋友圈评论、生活琐事。'],
  ['剧情推进', '适合小剧场、偷窥 char、隐藏相册、搜索记录。'],
  ['强沉浸通话', '电话/视频通话时强调画面、停顿、环境声。'],
];

function speak(text: string) {
  const { ttsConfig, addAppLog } = useAppStore.getState();
  void speakWithConfiguredTts(text, ttsConfig).catch((error) => {
    addAppLog?.({
      type: 'tts',
      title: 'TTS 播放失败',
      detail: error instanceof Error ? error.message : '未知错误',
    });
  });
}

function normalizeApiBaseUrl(url: string) {
  const trimmed = url.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
}

async function fetchModelList(baseUrl: string, apiKey: string) {
  const endpoint = `${normalizeApiBaseUrl(baseUrl)}/models`;
  const response = await fetch(endpoint, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
  });
  if (!response.ok) throw new Error(`拉取模型失败：${response.status}`);
  const data = await response.json();
  const models = Array.isArray(data?.data)
    ? data.data.map((item: { id?: string }) => item.id).filter(Boolean)
    : [];
  return models as string[];
}

async function requestChatCompletion({
  baseUrl,
  apiKey,
  model,
  messages,
  temperature,
  maxTokens,
}: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  temperature: number;
  maxTokens: number;
}) {
  const endpoint = `${normalizeApiBaseUrl(baseUrl)}/chat/completions`;
  useAppStore.getState().addAppLog?.({
    type: 'ai',
    title: '发送给 AI 的消息',
    detail: JSON.stringify({ endpoint, model, messages, temperature, maxTokens }, null, 2),
  });
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });
  if (!response.ok) {
    useAppStore.getState().addAppLog?.({ type: 'error', title: 'AI 接口失败', detail: `${endpoint}\n${response.status}` });
    throw new Error(`聊天接口失败：${response.status}`);
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || '';
  useAppStore.getState().addAppLog?.({ type: 'ai', title: 'AI 返回内容', detail: content });
  return content;
}

async function requestChatCompletionStream({
  baseUrl,
  apiKey,
  model,
  messages,
  temperature,
  onToken,
}: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  temperature: number;
  onToken: (token: string) => void;
}) {
  const endpoint = `${normalizeApiBaseUrl(baseUrl)}/chat/completions`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      stream: true,
    }),
  });
  if (!response.ok) throw new Error(`聊天接口失败：${response.status}`);
  if ((response.headers.get('content-type') || '').includes('application/json')) {
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';
    onToken(content);
    return content;
  }
  if (!response.body) {
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';
    onToken(content);
    return content;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let fullText = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const dataText = trimmed.replace(/^data:\s*/, '');
      if (!dataText || dataText === '[DONE]') continue;
      try {
        const data = JSON.parse(dataText);
        const token = data?.choices?.[0]?.delta?.content || data?.choices?.[0]?.text || '';
        if (token) {
          fullText += token;
          onToken(token);
        }
      } catch {
        // Ignore non-JSON keepalive chunks from OpenAI-compatible gateways.
      }
    }
  }
  return fullText;
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function formatMessageTime(timestamp?: number) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function describeChatMessage(message: Pick<ChatMessage, 'kind' | 'content' | 'stickerLabel' | 'transcript' | 'recalled' | 'speakerId' | 'amount' | 'note' | 'itemName'>, forAi = false, speakers: Character[] = []) {
  if (message.recalled) return '已撤回一条消息';
  const speaker = message.speakerId ? speakers.find((character) => character.id === message.speakerId)?.name : '';
  const prefix = forAi && speaker ? `${speaker}：` : '';
  if (message.kind === 'sticker') return forAi ? `表情包注释：${message.stickerLabel || '表情包'}` : '表情';
  if (message.kind === 'image') return '图片';
  if (message.kind === 'voice') return `${prefix}${message.transcript || message.content || '语音'}`;
  if (message.kind === 'call-note') return `${prefix}通话：${message.content}`;
  if (message.kind === 'transfer') return `${prefix}转账：${message.amount || message.content}${message.note ? `，${message.note}` : ''}`;
  if (message.kind === 'red-packet') return `${prefix}红包：${message.note || message.content || '恭喜发财，大吉大利'}${message.amount ? `，${message.amount}` : ''}`;
  if (message.kind === 'shopping') return `${prefix}购物：${message.itemName || message.content}${message.amount ? `，${message.amount}` : ''}${message.note ? `，${message.note}` : ''}`;
  return `${prefix}${message.content}`;
}

function stringifyForPrompt(value: unknown, maxLength = 6000) {
  if (!value) return '';
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n...` : text;
}

function getCharacterPrompt(character: Character) {
  return [
    `角色名：${character.name}`,
    character.description && `简介：${character.description}`,
    character.personality && `性格：${character.personality}`,
    character.firstMessage && `开场白参考：${character.firstMessage}`,
    character.systemPrompt && `角色系统提示：${character.systemPrompt}`,
    character.worldBook && `世界书：\n${stringifyForPrompt(character.worldBook)}`,
  ].filter(Boolean).join('\n');
}

function buildMemoWorldContext({
  characters,
  chatSessions,
  wechatMoments,
  purchaseRecords,
  diaries,
  calendarEvents,
  galleryPhotos,
  memos,
  xiaohongshuNotes,
  characterId,
}: {
  characters: Character[];
  chatSessions: Record<string, { characterId: string; messages: ChatMessage[] }>;
  wechatMoments: string[];
  purchaseRecords: Array<{ itemName: string; amount: string; note: string }>;
  diaries: DiaryEntry[];
  calendarEvents: CalendarEvent[];
  galleryPhotos: GalleryPhoto[];
  memos: MemoEntry[];
  xiaohongshuNotes: XiaohongshuNote[];
  characterId?: string;
}) {
  const character = characters.find((item) => item.id === characterId);
  const recentMessages = Object.values(chatSessions)
    .filter((session) => !character || session.characterId === character.id)
    .flatMap((session) => session.messages.slice(-10).map((message) => `${message.role === 'user' ? '用户' : character?.name || 'char'}：${describeChatMessage(message, true, characters)}`))
    .slice(-24)
    .join('\n');
  const moments = wechatMoments.slice(0, 8).map((moment) => `朋友圈：${moment}`).join('\n');
  const orders = purchaseRecords.slice(0, 6).map((record) => `订单：${record.itemName} ${record.amount} ${record.note}`).join('\n');
  const diaryNotes = diaries.slice(0, 5).map((entry) => `日记：${entry.title}：${getDiarySummary(entry)}`).join('\n');
  const calendarNotes = calendarEvents.slice(0, 6).map((event) => `日历：${formatDateLabel(event.startAt)} ${event.title}${event.note ? `：${event.note}` : ''}`).join('\n');
  const photoNotes = galleryPhotos.slice(0, 5).map((photo) => `相册：${photo.title}：${photo.description || photo.note || photo.tags.join('、')}`).join('\n');
  const memoNotes = memos.filter((memo) => !memo.locked).slice(0, 8).map((memo) => `备忘录：${memo.title}：${memo.content}`).join('\n');
  const xiaohongshuContext = xiaohongshuNotes.length > 0 ? buildXiaohongshuContext(xiaohongshuNotes, 8) : '';
  return [
    recentMessages && `最近聊天\n${recentMessages}`,
    moments && `朋友圈\n${moments}`,
    xiaohongshuContext,
    diaryNotes && `最近日记\n${diaryNotes}`,
    calendarNotes && `最近日历\n${calendarNotes}`,
    photoNotes && `最近相册\n${photoNotes}`,
    orders && `最近订单\n${orders}`,
    memoNotes && `已有备忘\n${memoNotes}`,
  ].filter(Boolean).join('\n\n') || '当前没有太多最近记录，请写一条符合角色世界观的短备忘。';
}

function useMemoCharWriterAutomation() {
  const {
    memoCharWriter,
    characters,
    chatSessions,
    wechatMoments,
    purchaseRecords,
    diaries,
    calendarEvents,
    galleryPhotos,
    memos,
    xiaohongshuNotes,
    apiBaseUrl,
    apiKey,
    selectedModel,
    chatTemperature,
    addMemoEntry,
    setMemoCharWriter,
  } = useAppStore();

  useEffect(() => {
    if (!memoCharWriter.enabled || !memoCharWriter.scheduledAt) return;
    const tick = async () => {
      const scheduledAt = memoCharWriter.scheduledAt || 0;
      if (Date.now() < scheduledAt || (memoCharWriter.lastRunAt || 0) >= scheduledAt) return;
      const character = characters.find((item) => item.id === memoCharWriter.characterId) || characters[0];
      if (!character) return;
      setMemoCharWriter({ lastRunAt: Date.now() });
      const context = buildMemoWorldContext({
        characters,
        chatSessions,
        wechatMoments,
        purchaseRecords,
        diaries,
        calendarEvents,
        galleryPhotos,
        memos,
        xiaohongshuNotes,
        characterId: character.id,
      });
      let content = '';
      if (apiBaseUrl && selectedModel) {
        try {
          content = await requestChatCompletion({
            baseUrl: apiBaseUrl,
            apiKey,
            model: selectedModel,
            temperature: chatTemperature,
            maxTokens: 320,
            messages: [
              {
                role: 'system',
                content: [
                  getCharacterPrompt(character) || `你是${character.name}。`,
                  '你会在固定时间打开备忘录，总结最近发生的事，写一条短备忘。只输出备忘录正文，不要编号，不要解释。',
                ].join('\n'),
              },
              {
                role: 'user',
                content: `现在到了设定时间：${new Date(scheduledAt).toLocaleString('zh-CN')}。\n请结合这些最近内容写一条符合世界观的备忘：\n\n${context}`,
              },
            ],
          });
        } catch {
          content = '';
        }
      }
      const finalContent = content.trim() || `${character.name}把最近发生的事整理成一句：明天继续确认那些还没有说完、也不该被忘掉的细节。`;
      addMemoEntry({
        title: `${character.name}的备忘`,
        content: finalContent,
        type: 'note',
        tags: ['给char看', '收藏'],
        color: 'yellow',
        characterId: character.id,
        readableByChar: true,
        reminderAt: scheduledAt,
        pinned: true,
        locked: false,
        completed: false,
        source: 'char',
      });
      setMemoCharWriter({ enabled: false, lastRunAt: Date.now() });
    };
    const timer = window.setInterval(tick, 15000);
    void tick();
    return () => window.clearInterval(timer);
  }, [memoCharWriter, characters, chatSessions, wechatMoments, purchaseRecords, diaries, calendarEvents, galleryPhotos, memos, apiBaseUrl, apiKey, selectedModel, chatTemperature, addMemoEntry, setMemoCharWriter]);
}

export default function App() {
  const { theme, activeScreen } = useAppStore();
  useMemoCharWriterAutomation();

  return (
    <AppErrorBoundary>
      <div className={cn('min-h-screen phone-stage flex items-center justify-center bg-[#101010] p-2 sm:p-4', `theme-${theme}`)}>
        <main className={cn('phone-shell relative h-[844px] max-h-[calc(100dvh-16px)] w-[390px] max-w-full overflow-hidden bg-[var(--phone-bg)] text-[var(--phone-text)] rounded-[34px] border-[8px] border-[#111]', `screen-${activeScreen}`)}>
          <GlobalMusicAudio />
          {activeScreen === 'desktop' && <Desktop />}
          {activeScreen === 'chat' && <ChatScreen />}
          {activeScreen !== 'desktop' && activeScreen !== 'chat' && <FeatureScreen screen={activeScreen} />}
        </main>
      </div>
    </AppErrorBoundary>
  );
}

function GlobalMusicAudio() {
  const { musicTracks, musicPlayer, setMusicPlayer } = useAppStore();
  const currentTrack = musicTracks.find((track) => track.id === musicPlayer.trackId);
  const lastTrackId = useRef<string | undefined>(undefined);

  useEffect(() => {
    const audio = document.getElementById('global-music-audio') as HTMLAudioElement | null;
    if (!audio || !currentTrack?.audioUrl) return;
    if (lastTrackId.current !== currentTrack.id && audio.src !== currentTrack.audioUrl) {
      audio.src = currentTrack.audioUrl;
      lastTrackId.current = currentTrack.id;
    }
    if (musicPlayer.playing) {
      audio.play().catch(() => setMusicPlayer({ playing: false }));
    } else {
      audio.pause();
      audio.muted = false;
      audio.volume = 1;
    }
  }, [currentTrack?.audioUrl, currentTrack?.id, musicPlayer.playing, setMusicPlayer]);

  return (
    <audio
      id="global-music-audio"
      preload="auto"
      className="hidden"
      onLoadedMetadata={(event) => setMusicPlayer({ duration: Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0 })}
      onTimeUpdate={(event) => {
        const audio = event.currentTarget;
        const duration = Number.isFinite(audio.duration) ? audio.duration : musicPlayer.duration;
        setMusicPlayer({ duration, progress: duration > 0 ? (audio.currentTime / duration) * 100 : 0 });
      }}
      onEnded={(event) => {
        if (musicPlayer.repeat) {
          event.currentTarget.currentTime = 0;
          event.currentTarget.play().catch(() => setMusicPlayer({ playing: false }));
          setMusicPlayer({ playing: true, progress: 0 });
          return;
        }
        setMusicPlayer({ playing: false, progress: 100 });
      }}
      onError={() => setMusicPlayer({ playing: false })}
    />
  );
}

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { message: string | null }> {
  declare props: Readonly<{ children: React.ReactNode }>;

  state = { message: null };

  static getDerivedStateFromError(error: unknown) {
    return { message: error instanceof Error ? error.message : '未知界面错误' };
  }

  render() {
    if (this.state.message) {
      return (
        <div className="min-h-screen bg-[#101010] p-4 text-[#111]">
          <main className="mx-auto flex h-[844px] max-h-[calc(100dvh-32px)] w-[390px] max-w-full flex-col justify-center rounded-[34px] border-[8px] border-[#111] bg-[#fffaf0] p-6">
            <h1 className="text-2xl font-black">小手机界面崩了</h1>
            <p className="mt-3 rounded-2xl border-[3px] border-[#111] bg-white p-4 text-sm font-bold leading-relaxed">
              {this.state.message}
            </p>
            <button type="button" onClick={() => window.location.reload()} className="fetch-button mt-5">
              重新载入
            </button>
          </main>
        </div>
      );
    }

    return this.props.children;
  }
}

function Desktop() {
  const {
    theme,
    setScreen,
    imageBed,
    setImageBed,
    layoutPositions,
    setLayoutPosition,
    layoutMode,
    setLayoutMode,
    desktopPage,
    setDesktopPage,
    customWidgets,
    addCustomWidget,
    updateCustomWidget,
    removeCustomWidget,
  } = useAppStore();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const page = desktopPage;
  const now = new Date();
  const dateText = now.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'long' });
  const themedPos = (id: string, fallback: { x: number; y: number }) =>
    theme === 'gothic' ? gothicDesktopPositions[id] || fallback : fallback;

  const uploadImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageBed(reader.result as string);
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  return (
    <section className={cn('cream-screen relative h-full overflow-hidden px-5 pb-28 pt-10', editMode && 'select-none')}>
      <div className="layout-controls">
        <button onClick={() => setEditMode(!editMode)} className={cn('layout-toggle', editMode && 'active')}>
          {editMode ? '完成' : '编辑布局'}
        </button>
        {editMode && (
          <>
            <button onClick={() => setLayoutMode(layoutMode === 'snap' ? 'free' : 'snap')} className="layout-toggle">
              {layoutMode === 'snap' ? '自动对齐' : '自由移动'}
            </button>
            <button onClick={() => setShowWidgetPicker(true)} className="layout-toggle">
              <Plus className="h-3.5 w-3.5" /> 添加组件
            </button>
          </>
        )}
      </div>

      <div ref={canvasRef} className={cn('desktop-canvas', layoutMode === 'snap' && editMode && 'snap-grid')}>
        {page === 0 && (
          <>
            <Draggable id="image-bed" defaultPos={themedPos('image-bed', { x: 188, y: 24 })} editMode={editMode} layoutMode={layoutMode} canvasRef={canvasRef} positions={layoutPositions} setPosition={setLayoutPosition}>
              <button onClick={() => !editMode && imageInputRef.current?.click()} className="image-bed">
                {imageBed ? <img src={imageBed} className="h-full w-full object-cover" /> : <><ImageIcon className="mb-2 h-10 w-10" /><span>图床</span></>}
              </button>
            </Draggable>
            <input ref={imageInputRef} type="file" accept="image/*" onChange={uploadImage} className="hidden" />

            <Draggable id="time-card" defaultPos={themedPos('time-card', { x: 20, y: 242 })} editMode={editMode} layoutMode={layoutMode} canvasRef={canvasRef} positions={layoutPositions} setPosition={setLayoutPosition}>
              <div className="time-card">
                <div className="min-w-0">
                  <div className="time-text">{now.toLocaleTimeString('zh-CN', { hour12: false })}</div>
                  <div className="date-text">{dateText}</div>
                </div>
                <button onClick={() => !editMode && setShowGuide(!showGuide)} className="guide-mark" aria-label="教程">
                  42
                  <Sparkles className="absolute -right-2 -top-2 h-5 w-5 fill-[#f9e58f] text-[#111]" />
                </button>
              </div>
            </Draggable>
          </>
        )}

        {pageApps.filter((app) => app.page === page).map((app) => (
          <Draggable key={app.id} id={app.id} defaultPos={themedPos(app.id, { x: app.x, y: app.y })} editMode={editMode} layoutMode={layoutMode} canvasRef={canvasRef} positions={layoutPositions} setPosition={setLayoutPosition}>
            <AppIcon {...app} onClick={() => !editMode && setScreen(app.screen)} />
          </Draggable>
        ))}

        {customWidgets.filter((widget) => widget.page === page).map((widget) => (
          <Draggable key={widget.id} id={`widget-${widget.id}`} defaultPos={{ x: widget.x, y: widget.y }} editMode={editMode} layoutMode={layoutMode} canvasRef={canvasRef} positions={layoutPositions} setPosition={setLayoutPosition}>
            <CustomWidgetView widget={widget} editMode={editMode} updateWidget={updateCustomWidget} removeWidget={removeCustomWidget} />
          </Draggable>
        ))}
      </div>

      <div className="page-dots">
        <button onClick={() => setDesktopPage(0)} className={cn(page === 0 && 'active')} />
        <button onClick={() => setDesktopPage(1)} className={cn(page === 1 && 'active')} />
      </div>

      {showGuide && (
        <div className="guide-modal">
          <div className="guide-panel">
            <button onClick={() => setShowGuide(false)} className="widget-delete guide-close">
              ×
            </button>
            <h2>小手机教程</h2>
            <p>通讯录负责导入和编辑酒馆卡，保存后会回到通讯录列表。微信里包含朋友圈和视频通话。</p>
            <p>点“编辑布局”后可以拖动 app、图床、时间和小组件。布局模式可以在自动对齐和自由移动之间切换。</p>
            <p>点“添加组件”会打开选择面板，可以添加便签、照片或状态组件。组件在编辑模式下可以改字、传照片、删除。</p>
          </div>
        </div>
      )}

      {showWidgetPicker && (
        <div className="guide-modal">
          <div className="guide-panel compact">
            <button onClick={() => setShowWidgetPicker(false)} className="widget-delete guide-close">
              ×
            </button>
            <h2>添加小组件</h2>
            <div className="widget-picker">
              <button onClick={() => { addCustomWidget(page, 'note'); setShowWidgetPicker(false); }} className="feature-tile">便签</button>
              <button onClick={() => { addCustomWidget(page, 'photo'); setShowWidgetPicker(false); }} className="feature-tile">照片</button>
              <button onClick={() => { addCustomWidget(page, 'status'); setShowWidgetPicker(false); }} className="feature-tile">状态</button>
            </div>
          </div>
        </div>
      )}

      <div className="dock">
        {dockApps.map((app) => (
          <button key={app.label} onClick={() => setScreen(app.screen)} className="flex flex-col items-center gap-1">
            <span className={cn('dock-icon', app.color)}>
              {React.cloneElement(app.icon as React.ReactElement<{ className?: string }>, { className: 'h-6 w-6' })}
            </span>
            <span className="text-[11px] font-black">{app.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function Draggable({
  id,
  defaultPos,
  editMode,
  layoutMode,
  canvasRef,
  positions,
  setPosition,
  children,
}: {
  key?: React.Key;
  id: string;
  defaultPos: { x: number; y: number };
  editMode: boolean;
  layoutMode: LayoutMode;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  positions: Record<string, { x: number; y: number }>;
  setPosition: (id: string, position: { x: number; y: number }) => void;
  children: React.ReactNode;
}) {
  const position = positions[id] || defaultPos;

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!editMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const startX = event.clientX - rect.left - position.x;
    const startY = event.clientY - rect.top - position.y;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    const move = (moveEvent: PointerEvent) => {
      const rawX = moveEvent.clientX - rect.left - startX;
      const rawY = moveEvent.clientY - rect.top - startY;
      const snappedX = layoutMode === 'snap' ? Math.round(rawX / 16) * 16 : rawX;
      const snappedY = layoutMode === 'snap' ? Math.round(rawY / 16) * 16 : rawY;
      const nextX = Math.max(0, Math.min(rect.width - target.offsetWidth, snappedX));
      const nextY = Math.max(0, Math.min(rect.height - target.offsetHeight, snappedY));
      setPosition(id, { x: nextX, y: nextY });
    };

    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  };

  return (
    <div className={cn('draggable-item', editMode && 'editing')} style={{ left: position.x, top: position.y }} onPointerDown={startDrag}>
      {children}
    </div>
  );
}

function CustomWidgetView({
  widget,
  editMode,
  updateWidget,
  removeWidget,
}: {
  widget: CustomWidget;
  editMode: boolean;
  updateWidget: (id: string, updates: Partial<CustomWidget>) => void;
  removeWidget: (id: string) => void;
}) {
  const photoInputRef = useRef<HTMLInputElement>(null);

  const uploadWidgetImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateWidget(widget.id, { image: reader.result as string });
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  return (
    <div className={cn('custom-widget', `widget-${widget.type}`)}>
      {editMode && (
        <button
          className="widget-delete"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            removeWidget(widget.id);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      {editMode ? (
        <>
          <input
            value={widget.title}
            onPointerDown={(event) => event.stopPropagation()}
            onChange={(event) => updateWidget(widget.id, { title: event.target.value })}
            className="widget-input font-black"
          />
          {widget.type === 'photo' && (
            <>
              <button
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  photoInputRef.current?.click();
                }}
                className="widget-photo-button"
              >
                {widget.image ? <img src={widget.image} className="h-full w-full object-cover" /> : '上传照片'}
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" onChange={uploadWidgetImage} className="hidden" />
            </>
          )}
          <textarea
            value={widget.content}
            onPointerDown={(event) => event.stopPropagation()}
            onChange={(event) => updateWidget(widget.id, { content: event.target.value })}
            className="widget-input mt-2 min-h-12 resize-none text-sm"
          />
        </>
      ) : (
        <>
          {widget.type === 'photo' && widget.image && <img src={widget.image} className="mb-2 h-20 w-full rounded-xl border-2 border-[#111] object-cover" />}
          <p className="font-black">{widget.title}</p>
          <p className="mt-1 text-sm font-bold opacity-70">{widget.type === 'photo' && !widget.content ? '编辑布局后可上传照片/填描述' : widget.content}</p>
        </>
      )}
    </div>
  );
}

function AppIcon({ label, icon, color, onClick }: { key?: React.Key; label: string; icon: React.ReactNode; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="app-button">
      <span className={cn('app-icon', color)}>{React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'h-7 w-7' })}</span>
      <span className="app-label">{label}</span>
    </button>
  );
}

function Header({
  title,
  subtitle,
  tabs,
  onSave,
  onBack,
  saveLabel = '保存',
}: {
  title: string;
  subtitle?: string;
  tabs?: React.ReactNode;
  onSave?: () => void;
  onBack?: () => void;
  saveLabel?: string;
}) {
  const { goBack } = useAppStore();
  return (
    <header className="sticky top-0 z-30 bg-[var(--phone-bg)] px-4 pb-4 pt-6">
      <div className="grid grid-cols-[48px_1fr_56px] items-center">
        <button onClick={onBack || goBack} className="circle-button">
          <ChevronLeft className="h-7 w-7" />
        </button>
        <div className="min-w-0 text-center">
          <h1 className="truncate text-2xl font-black">{title}</h1>
          {subtitle && <p className="truncate text-xs font-bold opacity-60">{subtitle}</p>}
        </div>
        {onSave ? <button onClick={onSave} className="save-button">{saveLabel}</button> : <span />}
      </div>
      {tabs && <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto">{tabs}</div>}
    </header>
  );
}

type MusicTab = 'library' | 'player' | 'char' | 'me';
type MusicLibraryView = 'index' | 'liked' | 'playlists' | 'playlist-detail' | 'history';

type MusicPlaylistDraft = {
  name: string;
  description: string;
  cover: string;
  trackIds: string[];
};

type MusicSearchResult = {
  id: string;
  sourceId?: string;
  title: string;
  artist: string;
  album?: string;
  cover?: string;
  audioUrl?: string;
  sourceUrl?: string;
  access: 'playable' | 'preview' | 'unplayable';
  source: 'audius' | 'netease' | 'qq' | 'custom' | 'demo';
};

const demoMusicResult: MusicSearchResult = {
  id: 'demo-soundhelix-1',
  title: 'Public Demo Song',
  artist: 'SoundHelix',
  album: '测试声音',
  cover: 'linear-gradient(135deg,#111,#7e1114)',
  audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  access: 'playable',
  source: 'demo',
};

type MusicApiRecord = Record<string, unknown>;

function asMusicRecord(value: unknown): MusicApiRecord {
  return value && typeof value === 'object' ? value as MusicApiRecord : {};
}

function musicText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function musicNumber(value: unknown) {
  return typeof value === 'number' ? value : undefined;
}

function trimMusicBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function pickNestedText(record: MusicApiRecord, keys: string[]) {
  for (const key of keys) {
    const parts = key.split('.');
    let cursor: unknown = record;
    for (const part of parts) cursor = asMusicRecord(cursor)[part];
    const text = musicText(cursor);
    if (text) return text;
  }
  return '';
}

function pickFirstArray(value: unknown, paths: string[]) {
  for (const path of paths) {
    let cursor: unknown = value;
    for (const part of path.split('.')) cursor = asMusicRecord(cursor)[part];
    if (Array.isArray(cursor)) return cursor;
  }
  return [];
}

type CharSongDraft = {
  characterId: string;
  title: string;
  mood: string;
  melody: string;
  arrangement: string;
  lyrics: string;
};

function formatMusicTime(seconds: number) {
  const current = Math.max(0, Math.floor(seconds || 0));
  const minute = Math.floor(current / 60);
  const second = String(current % 60).padStart(2, '0');
  return `${minute}:${second}`;
}

function formatMusicDuration(seconds?: number) {
  if (!seconds) return '0秒';
  const minute = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  if (minute <= 0) return `${rest}秒`;
  return `${minute}分${String(rest).padStart(2, '0')}秒`;
}

function musicPlaylistDraft(playlist?: MusicPlaylist): MusicPlaylistDraft {
  return {
    name: playlist?.name || '',
    description: playlist?.description || '',
    cover: playlist?.cover || '',
    trackIds: playlist?.trackIds || [],
  };
}

function MusicCover({ track, playlist, className }: { track?: MusicTrack; playlist?: MusicPlaylist; className?: string }) {
  const cover = track?.cover || playlist?.cover;
  const title = track?.title || playlist?.name || '♪';
  const style = cover
    ? cover.startsWith('linear-gradient')
      ? { background: cover }
      : { backgroundImage: `url(${cover})` }
    : { background: 'linear-gradient(135deg, var(--accent), #e9c4d5)' };
  return (
    <div className={cn('flex shrink-0 items-center justify-center overflow-hidden border-[3px] border-[#111] bg-cover bg-center text-lg font-black shadow-[2px_3px_0_rgba(0,0,0,0.16)]', className)} style={style}>
      {!cover?.startsWith('http') && !cover?.startsWith('data:') && <span className="px-2 text-center text-white drop-shadow">{title.slice(0, 2)}</span>}
    </div>
  );
}

function MusicIconButton({ icon, label, active, dark, onClick }: { icon: React.ReactNode; label: string; active?: boolean; dark?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={cn('circle-button small shrink-0', dark ? 'border-white/45 bg-black/70 text-white shadow-[0_8px_18px_rgba(0,0,0,.28)]' : 'bg-[#f8f1df] text-[#111]', active && (dark ? 'bg-[#d64545] text-white' : 'bg-[#ffb3ca]'))} title={label} aria-label={label}>
      {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: cn('h-4 w-4', active && 'fill-current') })}
    </button>
  );
}

function MusicTrackRow({
  track,
  active,
  onPlay,
  onLike,
  onDelete,
}: {
  key?: React.Key;
  track: MusicTrack;
  active?: boolean;
  onPlay: () => void;
  onLike: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className={cn('grid grid-cols-[48px_1fr_auto] items-center gap-3 border-b-[2px] border-[#111]/15 py-3 last:border-b-0', active && 'rounded-2xl bg-black/5 px-2')}>
      <button onClick={onPlay} className="contents" title="播放">
        <MusicCover track={track} className="h-12 w-12 rounded-2xl" />
        <span className="min-w-0 text-left">
          <span className="block truncate text-sm font-black">{track.title}</span>
          <span className="block truncate text-xs font-bold opacity-60">{track.artist}{track.album ? ` · ${track.album}` : ''}</span>
        </span>
      </button>
      <span className="flex items-center justify-end gap-1">
        <MusicIconButton icon={<Heart />} label="喜欢" active={track.liked} onClick={onLike} />
        {onDelete && <MusicIconButton icon={<Trash2 />} label="删除" onClick={onDelete} />}
      </span>
    </div>
  );
}

function MusicScreen() {
  const {
    characters,
    chatSessions,
    browserWorldBook,
    apiBaseUrl,
    apiKey,
    selectedModel,
    chatTemperature,
    userName,
    userAvatar,
    setUserName,
    setUserAvatar,
    galleryPhotos,
    musicTracks,
    musicPlaylists,
    musicListenRecords,
    musicPlayer,
    musicSourceConfig,
    ttsConfig,
    ttsEnabled,
    addMusicTrack,
    updateMusicTrack,
    deleteMusicTrack,
    toggleMusicTrackLiked,
    addMusicPlaylist,
    updateMusicPlaylist,
    deleteMusicPlaylist,
    toggleMusicPlaylistFavorite,
    addTrackToMusicPlaylist,
    removeTrackFromMusicPlaylist,
    setMusicPlayer,
    setMusicSourceConfig,
    playMusicTrack,
    addMusicListenRecord,
    addAppLog,
  } = useAppStore();
  const [tab, setTab] = useState<MusicTab>('library');
  const [libraryView, setLibraryView] = useState<MusicLibraryView>('index');
  const [query, setQuery] = useState('');
  const [externalQuery, setExternalQuery] = useState('');
  const [searchingMusic, setSearchingMusic] = useState(false);
  const [musicSearchResults, setMusicSearchResults] = useState<MusicSearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [musicStatus, setMusicStatus] = useState('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [quickPlaylistId, setQuickPlaylistId] = useState('');
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [playlistDraft, setPlaylistDraft] = useState<MusicPlaylistDraft>(() => musicPlaylistDraft());
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [listenCharacterId, setListenCharacterId] = useState('');
  const [listenStartedAt, setListenStartedAt] = useState<number | null>(null);
  const [listenElapsed, setListenElapsed] = useState(0);
  const [listenGreeting, setListenGreeting] = useState('等好友加入中...');
  const [charSongDraft, setCharSongDraft] = useState<CharSongDraft>(() => ({ characterId: '', title: '', mood: '晚风、想念、耳机共享', melody: '', arrangement: '', lyrics: '' }));
  const [charSongStatus, setCharSongStatus] = useState('');
  const [generatingCharSong, setGeneratingCharSong] = useState(false);
  const [activeCharSongId, setActiveCharSongId] = useState<string | null>(null);
  const [customUrl, setCustomUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [showPlayerLyrics, setShowPlayerLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [playerBackground, setPlayerBackground] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playableTracks = musicTracks.filter((track) => Boolean(track.audioUrl));
  const currentTrack = playableTracks.find((track) => track.id === musicPlayer.trackId) || playableTracks[0];
  const likedTracks = playableTracks.filter((track) => track.liked);
  const recentTracks = [...playableTracks].filter((track) => track.lastPlayedAt).sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0));
  const selectedPlaylist = musicPlaylists.find((playlist) => playlist.id === selectedPlaylistId) || musicPlaylists[0];
  const playlistTracks = selectedPlaylist ? selectedPlaylist.trackIds.map((id) => musicTracks.find((track) => track.id === id)).filter(Boolean) as MusicTrack[] : [];
  const filteredTracks = playableTracks.filter((track) => {
    const text = `${track.title} ${track.artist} ${track.album || ''} ${track.tags.join(' ')}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  });
  const playlistTrackOptions = [...playableTracks].sort((a, b) => Number(b.liked) - Number(a.liked) || a.title.localeCompare(b.title));
  const listenCharacter = characters.find((character) => character.id === listenCharacterId);
  const charWriter = characters.find((character) => character.id === charSongDraft.characterId) || characters[0];
  const activeCharSong = musicTracks.find((track) => track.id === activeCharSongId);
  const charSongs = musicTracks.filter((track) => track.source === 'char' && (track.characterId === charWriter?.id || track.artist === charWriter?.name));
  const togetherRecords = musicListenRecords.filter((record) => record.mood === '一起听' && record.characterId);
  const togetherRanking = characters
    .map((character) => {
      const records = togetherRecords.filter((record) => record.characterId === character.id);
      const seconds = records.reduce((sum, record) => sum + (record.durationSeconds || 0), 0);
      return { character, records, seconds };
    })
    .filter((item) => item.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds);
  const togetherSeconds = togetherRecords.reduce((sum, record) => sum + (record.durationSeconds || 0), 0) + (listenStartedAt ? listenElapsed : 0);
  const myPlayCount = musicTracks.reduce((sum, track) => sum + track.playCount, 0);
  const playerBackgroundImage = playerBackground
    || (currentTrack?.cover && !currentTrack.cover.startsWith('linear-gradient') ? currentTrack.cover : '')
    || galleryPhotos[0]?.url
    || '';
  const sortedMusicSearchResults = [...musicSearchResults].sort((a, b) => {
    const weight = { playable: 0, preview: 1, unplayable: 2 };
    return weight[a.access] - weight[b.access] || a.title.localeCompare(b.title);
  });

  const searchAccessLabel = (result: MusicSearchResult) => {
    if (result.access === 'playable') return '可听';
    if (result.access === 'preview') return '试听';
    return '不可播';
  };

  const searchAccessClass = (result: MusicSearchResult) => {
    if (result.access === 'playable') return 'bg-[#dceecd]';
    if (result.access === 'preview') return 'bg-[#f4edbd]';
    return 'bg-[#e5e5e5] opacity-70';
  };

  const searchSourceLabel = (result: MusicSearchResult) => {
    if (result.source === 'audius') return 'Audius';
    if (result.source === 'netease') return '网易云';
    if (result.source === 'qq') return 'QQ';
    if (result.source === 'demo') return '测试';
    return '我的';
  };

  const sourceTag = (result: MusicSearchResult) => searchSourceLabel(result);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 1;
    if (!musicPlayer.playing) audio.pause();
  }, [musicPlayer.playing]);

  useEffect(() => {
    if (!listenStartedAt) return;
    const timer = window.setInterval(() => setListenElapsed(Math.floor((Date.now() - listenStartedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [listenStartedAt]);

  const playAudioUrl = async (track: MusicTrack, directUrl = track.audioUrl, restart = false) => {
    if (!directUrl) {
      setMusicStatus('这首歌没有可播放音频源。');
      return;
    }
    const audio = (document.getElementById('global-music-audio') as HTMLAudioElement | null) || audioRef.current;
    if (!audio) return;
    try {
      const sameSource = audio.src === directUrl || decodeURIComponent(audio.src) === directUrl;
      audio.muted = false;
      audio.volume = 1;
      if (!sameSource) {
        audio.pause();
        audio.src = directUrl;
        audio.currentTime = 0;
        audio.load();
      } else if (restart) {
        audio.currentTime = 0;
      }
      await audio.play();
      playMusicTrack(track.id);
      setMusicPlayer({ trackId: track.id, playing: true, progress: restart || !sameSource ? 0 : musicPlayer.progress, duration: Number.isFinite(audio.duration) ? audio.duration : musicPlayer.duration });
      setMusicStatus('');
    } catch {
      setMusicPlayer({ trackId: track.id, playing: false, progress: 0 });
      setMusicStatus('这个音频源被浏览器或来源站点拦住了，换一首或换一个可直连音频源。');
    }
  };

  const play = (trackId?: string) => {
    const track = musicTracks.find((item) => item.id === (trackId || currentTrack?.id));
    if (!track) return;
    void playAudioUrl(track);
  };

  const togglePlay = () => {
    const audio = (document.getElementById('global-music-audio') as HTMLAudioElement | null) || audioRef.current;
    if (!currentTrack || !audio) return;
    if (musicPlayer.playing) {
      audio.pause();
      setMusicPlayer({ playing: false });
      return;
    }
    if (currentTrack.audioUrl && (audio.src === currentTrack.audioUrl || decodeURIComponent(audio.src) === currentTrack.audioUrl)) {
      audio.muted = false;
      audio.volume = 1;
      audio.play()
        .then(() => setMusicPlayer({ playing: true }))
        .catch(() => setMusicStatus('浏览器没有允许继续播放，请再点一次播放。'));
      return;
    }
    void playAudioUrl(currentTrack);
  };

  const moveTrack = (direction: 1 | -1) => {
    if (playableTracks.length === 0) return;
    const currentIndex = playableTracks.findIndex((track) => track.id === currentTrack?.id);
    const nextIndex = musicPlayer.shuffle
      ? Math.floor(Math.random() * playableTracks.length)
      : (currentIndex + direction + playableTracks.length) % playableTracks.length;
    play(playableTracks[nextIndex]?.id);
  };

  const searchAudiusMusic = async (term: string): Promise<MusicSearchResult[]> => {
    const response = await fetch(`https://api.audius.co/v1/tracks/search?query=${encodeURIComponent(term)}&limit=24`);
    if (!response.ok) throw new Error(`Audius ${response.status}`);
    const data = await response.json();
    return Array.isArray(data?.data)
      ? data.data
          .filter((item: { id?: string; title?: string }) => item.id && item.title)
          .map((item: { id: string; title?: string; user?: { name?: string; handle?: string }; album?: string; artwork?: { '150x150'?: string; '480x480'?: string; '1000x1000'?: string }; permalink?: string }) => ({
            id: `audius-${item.id}`,
            sourceId: item.id,
            title: item.title || '未命名歌曲',
            artist: item.user?.name || item.user?.handle || 'Audius',
            album: item.album || 'Audius',
            cover: item.artwork?.['1000x1000'] || item.artwork?.['480x480'] || item.artwork?.['150x150'],
            audioUrl: `https://api.audius.co/v1/tracks/${item.id}/stream?app_name=small_phone_music`,
            sourceUrl: item.permalink,
            access: 'playable' as const,
            source: 'audius' as const,
          }))
      : [];
  };

  const searchNeteaseMusic = async (term: string): Promise<MusicSearchResult[]> => {
    const baseUrl = trimMusicBaseUrl(musicSourceConfig.neteaseBaseUrl);
    if (!baseUrl) return [];
    addAppLog({ type: 'music', title: 'NeteaseCloudMusicApi 搜索', detail: `${baseUrl}/search?keywords=${term}` });
    const searchResponse = await fetch(`${baseUrl}/search?keywords=${encodeURIComponent(term)}&limit=20&type=1`);
    if (!searchResponse.ok) throw new Error(`Netease ${searchResponse.status}`);
    const searchData = await searchResponse.json();
    const songs = pickFirstArray(searchData, ['result.songs', 'body.result.songs', 'songs']);
    return Promise.all(songs.map(async (raw): Promise<MusicSearchResult | null> => {
      const song = asMusicRecord(raw);
      const id = String(song.id || song.mid || song.songmid || '').trim();
      const title = musicText(song.name) || musicText(song.title);
      if (!id || !title) return null;
      const artists = Array.isArray(song.artists) ? song.artists : Array.isArray(song.ar) ? song.ar : [];
      const artist = artists.map((item) => musicText(asMusicRecord(item).name)).filter(Boolean).join(' / ') || '网易云';
      const albumRecord = asMusicRecord(song.album || song.al);
      let audioUrl = '';
      try {
        const urlResponse = await fetch(`${baseUrl}/song/url/v1?id=${encodeURIComponent(id)}&level=standard`);
        if (urlResponse.ok) {
          const urlData = await urlResponse.json();
          const urlItem = pickFirstArray(urlData, ['data', 'body.data'])[0];
          audioUrl = pickNestedText(asMusicRecord(urlItem), ['url']);
        }
      } catch {
        audioUrl = '';
      }
      return {
        id: `netease-${id}`,
        sourceId: id,
        title,
        artist,
        album: musicText(albumRecord.name) || '网易云',
        cover: pickNestedText(albumRecord, ['picUrl', 'cover', 'img1v1Url']),
        audioUrl: audioUrl || undefined,
        sourceUrl: `https://music.163.com/#/song?id=${id}`,
        access: audioUrl ? 'playable' : 'unplayable',
        source: 'netease',
      };
    })).then((results) => results.filter(Boolean) as MusicSearchResult[]);
  };

  const searchQqMusic = async (term: string): Promise<MusicSearchResult[]> => {
    const baseUrl = trimMusicBaseUrl(musicSourceConfig.qqBaseUrl);
    if (!baseUrl) return [];
    addAppLog({ type: 'music', title: 'QQ 音乐 API 搜索', detail: baseUrl });
    const endpoints = [
      `${baseUrl}/api/search?key=${encodeURIComponent(term)}&pageNo=1&pageSize=20`,
      `${baseUrl}/search?key=${encodeURIComponent(term)}&pageNo=1&pageSize=20`,
      `${baseUrl}/search?keyword=${encodeURIComponent(term)}&page=1&limit=20`,
    ];
    let searchData: unknown = null;
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          searchData = await response.json();
          break;
        }
      } catch {
        searchData = null;
      }
    }
    const songs = pickFirstArray(searchData, ['data.list', 'data.song.list', 'data', 'list', 'result.songs']);
    return Promise.all(songs.map(async (raw): Promise<MusicSearchResult | null> => {
      const song = asMusicRecord(raw);
      const id = musicText(song.songmid) || musicText(song.mid) || String(song.id || '').trim();
      const title = musicText(song.songname) || musicText(song.name) || musicText(song.title);
      if (!id || !title) return null;
      const singers = Array.isArray(song.singer) ? song.singer : Array.isArray(song.singers) ? song.singers : [];
      const artist = singers.map((item) => musicText(asMusicRecord(item).name)).filter(Boolean).join(' / ') || musicText(song.artist) || 'QQ音乐';
      let audioUrl = musicText(song.url) || musicText(song.src);
      if (!audioUrl) {
        const urlEndpoints = [
          `${baseUrl}/api/song/url?id=${encodeURIComponent(id)}`,
          `${baseUrl}/song/url?id=${encodeURIComponent(id)}`,
          `${baseUrl}/song/url?mid=${encodeURIComponent(id)}`,
        ];
        for (const endpoint of urlEndpoints) {
          try {
            const response = await fetch(endpoint);
            if (!response.ok) continue;
            const urlData = await response.json();
            audioUrl = pickNestedText(asMusicRecord(urlData), ['data.url', 'data', 'url', 'src']);
            if (audioUrl) break;
          } catch {
            audioUrl = '';
          }
        }
      }
      const album = asMusicRecord(song.album);
      const albumMid = musicText(album.mid) || musicText(song.albummid);
      return {
        id: `qq-${id}`,
        sourceId: id,
        title,
        artist,
        album: musicText(album.name) || musicText(song.albumname) || 'QQ音乐',
        cover: musicText(song.pic) || musicText(song.cover) || (albumMid ? `https://y.qq.com/music/photo_new/T002R300x300M000${albumMid}.jpg` : undefined),
        audioUrl: audioUrl || undefined,
        sourceUrl: `https://y.qq.com/n/ryqq/songDetail/${id}`,
        access: audioUrl ? 'playable' : 'unplayable',
        source: 'qq',
      };
    })).then((results) => results.filter(Boolean) as MusicSearchResult[]);
  };

  const searchExternalMusic = async () => {
    const term = externalQuery.trim();
    if (!term) return;
    setSearchingMusic(true);
    setMusicStatus('');
    try {
      const enabledSources = [
        searchAudiusMusic(term),
        musicSourceConfig.neteaseBaseUrl.trim() ? searchNeteaseMusic(term) : Promise.resolve([]),
        musicSourceConfig.qqBaseUrl.trim() ? searchQqMusic(term) : Promise.resolve([]),
      ];
      const settled = await Promise.allSettled(enabledSources);
      const results = settled.flatMap((item) => item.status === 'fulfilled' ? item.value : []);
      const failedCount = settled.filter((item) => item.status === 'rejected').length;
      setMusicSearchResults(results);
      setShowSearchResults(true);
      setMusicStatus(results.length > 0 ? `搜到 ${results.length} 首，来自 ${new Set(results.map((item) => searchSourceLabel(item))).size} 个来源。${failedCount ? `有 ${failedCount} 个来源没连上。` : ''}` : '没有搜到可听结果。');
    } catch {
      setMusicSearchResults([]);
      setShowSearchResults(true);
      setMusicStatus('搜索失败，可以先用上传或 URL。');
    } finally {
      setSearchingMusic(false);
    }
  };

  const resolveSearchResultAudioUrl = async (result: MusicSearchResult) => {
    if (result.audioUrl) return result.audioUrl;
    const id = result.sourceId || result.id.replace(/^(netease|qq)-/, '');
    if (result.source === 'netease') {
      const baseUrl = trimMusicBaseUrl(musicSourceConfig.neteaseBaseUrl);
      if (!baseUrl || !id) return '';
      const response = await fetch(`${baseUrl}/song/url/v1?id=${encodeURIComponent(id)}&level=standard`);
      if (!response.ok) return '';
      const data = await response.json();
      const item = pickFirstArray(data, ['data', 'body.data'])[0];
      return pickNestedText(asMusicRecord(item), ['url']);
    }
    if (result.source === 'qq') {
      const baseUrl = trimMusicBaseUrl(musicSourceConfig.qqBaseUrl);
      if (!baseUrl || !id) return '';
      const endpoints = [
        `${baseUrl}/api/song/url?id=${encodeURIComponent(id)}`,
        `${baseUrl}/song/url?id=${encodeURIComponent(id)}`,
        `${baseUrl}/song/url?mid=${encodeURIComponent(id)}`,
      ];
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint);
          if (!response.ok) continue;
          const data = await response.json();
          const url = pickNestedText(asMusicRecord(data), ['data.url', 'data', 'url', 'src']);
          if (url) return url;
        } catch {
          // try next shape
        }
      }
    }
    return '';
  };

  const playableSearchResult = async (result: MusicSearchResult) => {
    const audioUrl = await resolveSearchResultAudioUrl(result);
    if (!audioUrl) return null;
    return { ...result, audioUrl, access: 'playable' as const };
  };

  const playSearchResult = async (result: MusicSearchResult) => {
    const resolved = await playableSearchResult(result);
    if (!resolved) {
      setMusicStatus('这条结果暂时没有从 API 拿到可播放地址，换一首或检查 NeteaseCloudMusicApi / QQ API 是否运行。');
      return;
    }
    const existing = musicTracks.find((track) => track.audioUrl === resolved.audioUrl);
    const id = existing?.id || addMusicTrack({
        title: resolved.title,
        artist: resolved.artist,
        album: resolved.album,
        cover: resolved.cover,
        audioUrl: resolved.audioUrl,
        lyrics: '',
        tags: [sourceTag(resolved), '可听'],
        source: 'browser',
        liked: false,
      });
    if (quickPlaylistId) addTrackToMusicPlaylist(quickPlaylistId, id);
    const track: MusicTrack = existing || {
      id,
      title: resolved.title,
      artist: resolved.artist,
      album: resolved.album,
      cover: resolved.cover,
      audioUrl: resolved.audioUrl,
      lyrics: '',
      tags: [sourceTag(resolved), '可听'],
      liked: false,
      playCount: 0,
      source: 'browser',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setTab('player');
    await playAudioUrl(track, resolved.audioUrl, true);
  };

  const likeSearchResult = async (result: MusicSearchResult) => {
    const resolved = await playableSearchResult(result);
    if (!resolved) {
      setMusicStatus('这条结果暂时没有从 API 拿到可播放地址，不能加入我喜欢。');
      return;
    }
    const existing = musicTracks.find((track) => track.audioUrl === resolved.audioUrl);
    const id = existing?.id || addMusicTrack({
      title: resolved.title,
      artist: resolved.artist,
      album: resolved.album,
      cover: resolved.cover,
      audioUrl: resolved.audioUrl,
      lyrics: '',
      tags: [sourceTag(resolved), '可听'],
      source: 'browser',
      liked: false,
    });
    if (!existing?.liked) toggleMusicTrackLiked(id);
    setMusicStatus('已加入我喜欢。');
  };

  const addSearchResultToLibrary = async (result: MusicSearchResult) => {
    const resolved = await playableSearchResult(result);
    if (!resolved) {
      setMusicStatus('这条结果暂时没有从 API 拿到可播放地址，不能导入曲库。');
      return;
    }
    const existing = musicTracks.find((track) => track.audioUrl === resolved.audioUrl);
    const id = existing?.id || addMusicTrack({
      title: resolved.title,
      artist: resolved.artist,
      album: resolved.album,
      cover: resolved.cover,
      audioUrl: resolved.audioUrl,
      lyrics: '',
      tags: [sourceTag(resolved), '可听'],
      source: 'browser',
      liked: false,
    });
    if (quickPlaylistId) addTrackToMusicPlaylist(quickPlaylistId, id);
    setMusicStatus(quickPlaylistId ? '已加入曲库和选中的歌单。' : '已加入曲库。');
  };

  const playDemoSound = () => {
    void playSearchResult(demoMusicResult);
  };

  const addCustomUrlTrack = () => {
    const url = customUrl.trim();
    if (!url) {
      setMusicStatus('先填一个可以直接播放的音频 URL。');
      return;
    }
    const title = customTitle.trim() || decodeURIComponent(url.split('/').pop()?.split('?')[0] || '自定义音频');
    const trackPayload = {
      title,
      artist: '自有音源',
      album: 'URL 导入',
      cover: 'linear-gradient(135deg,#111,#7e1114)',
      audioUrl: url,
      lyrics: `${title}\n歌词未检测到\n可以在后续歌词编辑里补充`,
      tags: ['自有URL', '可听'],
      source: 'manual' as const,
      liked: false,
    };
    const id = addMusicTrack(trackPayload);
    setCustomUrl('');
    setCustomTitle('');
    setMusicStatus('已加入曲库，正在播放。');
    void playAudioUrl({ ...trackPayload, id, playCount: 0, createdAt: Date.now(), updatedAt: Date.now() });
    setTab('player');
  };

  const addUploadedTrack = (file?: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const title = file.name.replace(/\.[^.]+$/, '');
    const trackPayload = {
      title,
      artist: '本地上传',
      album: '上传 MP3',
      cover: 'linear-gradient(135deg,#050505,#324c4a)',
      audioUrl: url,
      lyrics: `${title}\n本地音频已导入\n暂无内嵌歌词解析`,
      tags: ['本地上传', '可听'],
      source: 'manual' as const,
      liked: false,
    };
    const id = addMusicTrack(trackPayload);
    setMusicStatus('本地 MP3 已加入本次会话曲库并开始播放。');
    void playAudioUrl({ ...trackPayload, id, playCount: 0, createdAt: Date.now(), updatedAt: Date.now() });
    setTab('player');
  };

  const startTogether = () => {
    if (!currentTrack?.audioUrl) {
      setMusicStatus('先在曲库里播放一首能出声的歌，再开始一起听。');
      return;
    }
    setListenStartedAt(Date.now());
    setListenElapsed(0);
    setListenGreeting(listenCharacter ? `${listenCharacter.name}：我进来了，先听这一首。` : '等好友加入中...');
    void playAudioUrl(currentTrack);
  };

  const stopTogether = () => {
    if (!currentTrack || !listenStartedAt) return;
    const durationSeconds = Math.max(1, Math.floor((Date.now() - listenStartedAt) / 1000));
    addMusicListenRecord({
      trackId: currentTrack.id,
      characterId: listenCharacterId || undefined,
      mood: '一起听',
      note: listenCharacter ? `和 ${listenCharacter.name} 一起听了 ${formatMusicDuration(durationSeconds)}` : `一起听了 ${formatMusicDuration(durationSeconds)}`,
      durationSeconds,
    });
    setListenStartedAt(null);
    setListenElapsed(0);
    setListenGreeting(listenCharacter ? `${listenCharacter.name}：下次继续一起听。` : '一起听已结束。');
    setMusicStatus('一起听记录已保存。');
  };

  const uploadMyMusicAvatar = (file?: File) => {
    if (!file) return;
    setUserAvatar(URL.createObjectURL(file));
  };

  const startNewPlaylist = () => {
    setEditingPlaylistId(null);
    setPlaylistDraft(musicPlaylistDraft());
    setShowCoverPicker(false);
  };

  const startEditPlaylist = (playlist: MusicPlaylist) => {
    setEditingPlaylistId(playlist.id);
    setSelectedPlaylistId(playlist.id);
    setPlaylistDraft(musicPlaylistDraft(playlist));
    setShowCoverPicker(false);
  };

  const savePlaylist = () => {
    const payload = {
      name: playlistDraft.name,
      description: playlistDraft.description,
      cover: playlistDraft.cover,
      trackIds: playlistDraft.trackIds,
      source: 'manual' as const,
      favorite: false,
    };
    const id = editingPlaylistId || addMusicPlaylist(payload);
    if (editingPlaylistId) updateMusicPlaylist(editingPlaylistId, payload);
    setSelectedPlaylistId(id);
    setEditingPlaylistId(null);
    setPlaylistDraft(musicPlaylistDraft());
    setShowCoverPicker(false);
  };

  const saveCharSongTrack = (payload: { title: string; mood: string; melody: string; arrangement: string; lyrics: string; character: Character }) => {
    const lyrics = cleanLyricsText(payload.lyrics) || fallbackSongLyrics(payload.title, payload.character);
    addMusicTrack({
      title: payload.title,
      artist: payload.character.name,
      album: 'char 创作',
      cover: payload.character.avatar || 'linear-gradient(135deg,#050505,#7e1114)',
      audioUrl: '',
      lyrics,
      melody: payload.melody,
      arrangement: payload.arrangement,
      characterId: payload.character.id,
      tags: ['char创作', ...payload.mood.split(/[，,、\s]+/).filter(Boolean).slice(0, 4)],
      source: 'char',
      liked: true,
    });
  };

  const readSongSection = (text: string, label: string) => {
    const bracketPattern = new RegExp(`【${label}】([\\s\\S]*?)(?=\\n【|$)`);
    const bracket = text.match(bracketPattern)?.[1]?.trim();
    if (bracket) return bracket;
    const loosePattern = new RegExp(`(?:^|\\n)\\s*(?:#+\\s*)?${label}\\s*[:：]\\s*([\\s\\S]*?)(?=\\n\\s*(?:#+\\s*)?(?:歌名|风格|旋律|编曲|歌词)\\s*[:：]|$)`);
    return text.match(loosePattern)?.[1]?.trim() || '';
  };

  const cleanLyricsText = (text?: string) => {
    if (!text) return '';
    const section = readSongSection(text, '歌词') || text
      .replace(/【歌名】[\s\S]*?(?=\n【|$)/g, '')
      .replace(/【风格】[\s\S]*?(?=\n【|$)/g, '')
      .replace(/【旋律】[\s\S]*?(?=\n【|$)/g, '')
      .replace(/【编曲】[\s\S]*?(?=\n【|$)/g, '')
      .replace(/【歌词】/g, '')
      .trim();
    return section
      .split('\n')
      .filter((line) => !/^\s*(旋律|编曲|风格|说明|歌名)[:：]/.test(line))
      .join('\n')
      .trim();
  };

  const fallbackSongLyrics = (songTitle: string, character: Character) => [
    `《${songTitle}》`,
    '把灯关小一点，让心事慢慢靠近',
    `${character.name} 在耳机另一边，轻轻喊你的姓名`,
    '主歌像雨落在窗沿，副歌把夜色唱明',
    '如果世界忽然安静，我就用这首歌回应',
    '',
    '你听见了吗，风也放慢了呼吸',
    '我把想念写成旋律，绕过人群奔向你',
    '就算明天隔着很远很远的距离',
    '这句副歌还会替我，停在你掌心',
  ].join('\n');

  const generateCharSong = async () => {
    const character = charWriter;
    if (!character) {
      setCharSongStatus('先导入或选择一个 char。');
      return;
    }
    const title = charSongDraft.title.trim() || `${character.name} 写给你的歌`;
    const mood = charSongDraft.mood.trim() || '想念、夜晚、耳机共享';
    const manualMelody = charSongDraft.melody.trim();
    const manualArrangement = charSongDraft.arrangement.trim();
    const manualLyrics = charSongDraft.lyrics.trim();
    const pastSongs = musicTracks
      .filter((track) => track.source === 'char' && (track.characterId === character.id || track.artist === character.name))
      .slice(0, 6)
      .map((track) => `- ${track.title}：${track.tags.join('、')}${track.melody ? `；旋律：${track.melody}` : ''}`)
      .join('\n') || '暂无';
    const recentTalk = Object.values(chatSessions)
      .filter((session) => session.characterId === character.id)
      .flatMap((session) => session.messages.slice(-8).map((message) => `${message.role === 'user' ? '用户' : character.name}：${describeChatMessage(message)}`))
      .slice(-16)
      .join('\n') || '暂无';

    if (apiBaseUrl && selectedModel) {
      setGeneratingCharSong(true);
      setCharSongStatus('正在创作歌曲...');
      try {
        const songMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
          {
            role: 'system',
            content: [
              '你是手机音乐 App 里的歌曲创作助手，要根据角色人设和历史创作真正写一首歌。',
              '不要写解释，不要写教学。只输出以下五个栏目，栏目名必须完整保留：',
              '【歌名】',
              '【风格】',
              '【旋律】',
              '【编曲】',
              '【歌词】',
              '旋律要能让人想象怎么唱，例如主歌/副歌走向、音域、节奏、重复 hook。',
              '编曲要包含乐器、速度、段落结构和情绪推进。',
              '【歌词】里必须至少写两段主歌和一段副歌，只能写真正会唱出来的歌词，不许混入旋律、编曲、解释、旁白或小标题。',
            ].join('\n'),
          },
          {
            role: 'user',
            content: [
              `角色人设：\n${getCharacterPrompt(character)}`,
              `世界书/浏览器世界书：\n${browserWorldBook || '暂无'}`,
              `最近聊天：\n${recentTalk}`,
              `过去这个 char 创作过的歌曲：\n${pastSongs}`,
              `这次想写的歌名：${title}`,
              `情绪/关键词：${mood}`,
              `用户已有旋律想法：${manualMelody || '可由你创作'}`,
              `用户已有编曲想法：${manualArrangement || '可由你创作'}`,
              `用户已有歌词方向：\n${manualLyrics || '可由你创作完整歌词'}`,
            ].join('\n\n'),
          },
        ];
        addAppLog({ type: 'ai', title: '发送 char 写歌请求', detail: JSON.stringify({ model: selectedModel, messages: songMessages }, null, 2) });
        const content = await requestChatCompletion({
          baseUrl: apiBaseUrl,
          apiKey,
          model: selectedModel,
          temperature: chatTemperature || 0.85,
          maxTokens: 1100,
          messages: songMessages,
        });
        addAppLog({ type: 'ai', title: 'char 写歌返回', detail: content });
        const nextTitle = readSongSection(content, '歌名') || title;
        const style = readSongSection(content, '风格') || mood;
        const melody = readSongSection(content, '旋律') || manualMelody || '主歌低声靠近，副歌抬高半个八度，结尾用一句重复 hook 收住。';
        const arrangement = readSongSection(content, '编曲') || manualArrangement || '中速鼓组、干净电钢、低频合成器，副歌加入和声铺底。';
        const lyrics = cleanLyricsText(readSongSection(content, '歌词') || manualLyrics || content.trim()) || fallbackSongLyrics(nextTitle, character);
        saveCharSongTrack({ title: nextTitle, mood: style, melody, arrangement, lyrics, character });
        setCharSongDraft({ characterId: character.id, title: nextTitle, mood: style, melody, arrangement, lyrics });
        setCharSongStatus('已创作并保存到这个 char 名下。');
      } catch {
        setCharSongStatus('AI 创作失败，已用当前填写内容保存一版。');
        const lyrics = manualLyrics || [
          `${title}`,
          `你把今天藏进耳机里`,
          `${character.name} 在另一端轻轻回应`,
          `如果世界忽然安静`,
          `这首歌就替我靠近你`,
        ].join('\n');
        saveCharSongTrack({
          title,
          mood,
          melody: manualMelody || '主歌轻声，副歌旋律上扬，最后一句回到低音区。',
          arrangement: manualArrangement || '慢速鼓点、木吉他、电钢和轻微环境音。',
          lyrics,
          character,
        });
      } finally {
        setGeneratingCharSong(false);
      }
      return;
    }

    const lyrics = manualLyrics || [
      `${title}`,
      `你把今天藏进耳机里`,
      `${character.name} 在另一端轻轻回应`,
      `如果世界忽然安静`,
      `这首歌就替我靠近你`,
    ].join('\n');
    const melody = manualMelody || '主歌低声、短句，副歌上扬并重复歌名，结尾把最后一句放慢。';
    const arrangement = manualArrangement || '72 BPM，电钢和轻鼓开场，副歌加入合成器 pad 与低声和声。';
    saveCharSongTrack({
      title,
      mood,
      melody,
      arrangement,
      lyrics,
      character,
    });
    setCharSongDraft({ characterId: character.id, title, mood, melody, arrangement, lyrics });
    setCharSongStatus('已保存到这个 char 名下。配置 AI 后可以按人设和历史创作更完整版本。');
  };

  const singWithTts = async (track?: MusicTrack) => {
    const title = track?.title || charSongDraft.title || 'char 创作歌曲';
    const text = cleanLyricsText(track?.lyrics || charSongDraft.lyrics);
    const melody = track?.melody || charSongDraft.melody;
    const arrangement = track?.arrangement || charSongDraft.arrangement;
    if (!ttsEnabled) {
      setCharSongStatus('先接 TTS/歌声模型。');
      return;
    }
    if (!text) {
      setCharSongStatus('先写几句歌词，再接 TTS/歌声模型。');
      return;
    }
    const endpoint = ttsConfig.baseUrl.trim();
    if (!endpoint) {
      setCharSongStatus('先在设置里填写 TTS/歌声模型接口。');
      return;
    }
    setCharSongStatus('正在发送给 TTS/歌声模型...');
    addAppLog({ type: 'tts', title: '发送唱歌请求', detail: JSON.stringify({ endpoint, title, voice: ttsConfig.voiceId, melody, arrangement, lyrics: text }, null, 2) });
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          lyrics: text,
          title,
          melody,
          arrangement,
          voice: ttsConfig.voiceId,
          voiceId: ttsConfig.voiceId,
          mode: 'sing',
        }),
      });
      if (!response.ok) throw new Error(`TTS 失败：${response.status}`);
      const contentType = response.headers.get('content-type') || '';
      let audioUrl = '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        audioUrl = musicText(data?.audioUrl) || musicText(data?.url) || musicText(data?.data?.audioUrl) || musicText(data?.data?.url);
      } else {
        audioUrl = URL.createObjectURL(await response.blob());
      }
      if (!audioUrl) throw new Error('TTS 没有返回音频地址');
      const targetId = track?.id || activeCharSong?.id;
      if (targetId) updateMusicTrack(targetId, { audioUrl });
      setCharSongStatus('唱歌音频已生成，正在播放。');
      addAppLog({ type: 'success', title: '唱歌音频生成成功', detail: audioUrl });
      const targetTrack = track || activeCharSong;
      if (targetTrack) {
        await playAudioUrl({ ...targetTrack, audioUrl }, audioUrl);
        setTab('player');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'TTS/歌声模型调用失败';
      setCharSongStatus(message);
      addAppLog({ type: 'error', title: '唱歌失败', detail: message });
    }
  };

  const renderPlayer = () => (
    <div
      className="mx-4 mt-4 overflow-hidden rounded-[30px] border-[3px] border-[#111] bg-cover bg-center shadow-[3px_4px_0_rgba(0,0,0,0.16)]"
      style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.42), rgba(0,0,0,.72))${playerBackgroundImage ? `, url(${playerBackgroundImage})` : ''}` }}
    >
      <div className="p-5 text-white">
        <div className="grid place-items-center">
          <button onClick={() => setShowPlayerLyrics(!showPlayerLyrics)} className={cn('relative w-full max-w-[260px] overflow-hidden shadow-[0_12px_26px_rgba(0,0,0,.35)]', showPlayerLyrics ? 'min-h-56 rounded-[28px] bg-black/35 p-4' : 'h-48 w-48 rounded-full border-[8px] border-[#050505] bg-[radial-gradient(circle,#f6f1e8_0_15%,#111_16%_22%,#050505_23%_100%)]')} title="点击切换唱片/歌词">
            {showPlayerLyrics ? (
              <div className="max-h-52 overflow-y-auto text-center text-sm font-bold leading-7">
                {currentTrack?.lyrics ? currentTrack.lyrics.split('\n').map((line, index) => <p key={`${line}-${index}`}>{line}</p>) : <p className="opacity-70">暂无歌词</p>}
              </div>
            ) : (
              <div className={cn('absolute inset-7 overflow-hidden rounded-full border-[4px] border-[#111] bg-cover bg-center', musicPlayer.playing && 'animate-spin')} style={{ animationDuration: '9s' }}>
                <MusicCover track={currentTrack} className="h-full w-full rounded-full border-0 shadow-none" />
              </div>
            )}
          </button>
          <h2 className="mt-5 line-clamp-2 text-center text-2xl font-black leading-tight">{currentTrack?.title || '先点一首歌'}</h2>
          <p className="mt-1 line-clamp-1 text-center text-sm font-bold opacity-80">{currentTrack?.artist || '曲库测试音源可直接播放'}</p>
        </div>
        <select value={playerBackground} onChange={(event) => setPlayerBackground(event.target.value)} className="hand-input mt-4 w-full text-sm text-[#111]">
          <option value="">背景图：跟随歌曲封面</option>
          {galleryPhotos.map((photo) => <option key={photo.id} value={photo.url}>背景图：{photo.title}</option>)}
        </select>
        <div className="mt-4">
          <input
            type="range"
            min="0"
            max="100"
            value={musicPlayer.progress}
            onChange={(event) => {
              const progress = Number(event.target.value);
              const audio = (document.getElementById('global-music-audio') as HTMLAudioElement | null) || audioRef.current;
              if (audio && musicPlayer.duration > 0) audio.currentTime = (progress / 100) * musicPlayer.duration;
              setMusicPlayer({ progress });
            }}
            className="w-full accent-[var(--accent)]"
          />
          <div className="mt-1 flex justify-between text-xs font-black opacity-60">
            <span>{formatMusicTime(((musicPlayer.progress || 0) / 100) * (musicPlayer.duration || 0))}</span>
            <span>{formatMusicTime(musicPlayer.duration || 0)}</span>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button onClick={() => setMusicPlayer({ shuffle: !musicPlayer.shuffle })} className={cn('flex h-12 w-12 items-center justify-center rounded-full border-[2px] border-white/35 bg-black/65 text-white', musicPlayer.shuffle && 'bg-[#d64545]')} title="随机"><Shuffle className="h-5 w-5" /></button>
          <button onClick={() => moveTrack(-1)} className="flex h-12 w-12 items-center justify-center rounded-full border-[2px] border-white/35 bg-black/65 text-white" title="上一首"><SkipBack className="h-5 w-5" /></button>
          <button onClick={togglePlay} className="rounded-full border-[2px] border-white/60 bg-[#d64545] px-5 py-3 text-sm font-black text-white shadow-[0_10px_22px_rgba(0,0,0,.35)]" title={musicPlayer.playing ? '暂停' : '继续'}>
            {musicPlayer.playing ? <Pause className="mr-1 inline h-5 w-5" /> : <Play className="mr-1 inline h-5 w-5 fill-current" />}
            {musicPlayer.playing ? '暂停' : '播放'}
          </button>
          <button onClick={() => moveTrack(1)} className="flex h-12 w-12 items-center justify-center rounded-full border-[2px] border-white/35 bg-black/65 text-white" title="下一首"><SkipForward className="h-5 w-5" /></button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={() => setMusicPlayer({ repeat: !musicPlayer.repeat })} className={cn('rounded-2xl border-[2px] border-white/35 bg-black/55 px-3 py-2 text-xs font-black text-white', musicPlayer.repeat && 'bg-[#d64545]')}><RefreshCw className="mr-1 inline h-4 w-4" />单曲循环</button>
          <button onClick={() => setShowQueue(!showQueue)} className={cn('rounded-2xl border-[2px] border-white/35 bg-black/55 px-3 py-2 text-xs font-black text-white', showQueue && 'bg-[#d64545]')}><MoreHorizontal className="mr-1 inline h-4 w-4" />播放队列</button>
        </div>
        {showQueue && (
          <div className="mt-3 max-h-56 overflow-y-auto rounded-3xl bg-black/25 p-2">
            {musicPlaylists.length > 0 && (
              <div className="mb-2 border-b border-white/15 pb-2">
                <p className="px-3 pb-1 text-[10px] font-black opacity-70">歌单</p>
                {musicPlaylists.map((playlist) => (
                  <button key={playlist.id} onClick={() => { setSelectedPlaylistId(playlist.id); setLibraryView('playlist-detail'); setTab('library'); }} className="grid w-full grid-cols-[1fr_auto] items-center gap-2 rounded-2xl px-3 py-2 text-left text-xs font-black">
                    <span className="truncate">{playlist.name}</span>
                    <span className="opacity-65">{playlist.trackIds.length} 首</span>
                  </button>
                ))}
              </div>
            )}
            <p className="px-3 pb-1 text-[10px] font-black opacity-70">当前可播放列表</p>
            {playableTracks.map((track) => (
              <button key={track.id} onClick={() => play(track.id)} className="grid w-full grid-cols-[1fr_auto] items-center gap-2 rounded-2xl px-3 py-2 text-left text-xs font-black">
                <span className="truncate">{track.title}</span>
                {track.id === currentTrack?.id && <Headphones className="h-4 w-4" />}
              </button>
            ))}
          </div>
        )}
        <div className="mt-4 rounded-[28px] border-[2px] border-white/25 bg-black/30 p-3">
          <div className="mb-3 flex items-center justify-center gap-4">
            <label className="grid cursor-pointer place-items-center gap-1">
              <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-white/80 text-[#111]">
                {userAvatar ? <img src={userAvatar} className="h-full w-full object-cover" /> : <Headphones className="h-6 w-6" />}
              </span>
              <span className="text-[10px] font-black opacity-80">我</span>
              <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadMyMusicAvatar(event.target.files?.[0])} />
            </label>
            <div className="max-w-[108px] text-center text-xs font-black opacity-85">{listenStartedAt ? listenGreeting : '等待好友加入'}</div>
            <div className="grid place-items-center gap-1">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-white/80 text-[#111]">
                {listenCharacter?.avatar ? <img src={listenCharacter.avatar} className="h-full w-full object-cover" /> : <CircleUserRound className="h-7 w-7" />}
              </div>
              <span className="max-w-[70px] truncate text-[10px] font-black opacity-80">{listenCharacter?.name || 'char'}</span>
            </div>
          </div>
          <div className="grid grid-cols-[1fr_auto] items-center gap-2">
            <select value={listenCharacterId} onChange={(event) => setListenCharacterId(event.target.value)} className="hand-input min-w-0 text-sm text-[#111]">
              <option value="">选择一起听的 char</option>
              {characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
            </select>
            <span className="rounded-2xl border-[2px] border-white/30 bg-black/60 px-3 py-2 text-xs font-black text-white">{listenStartedAt ? formatMusicDuration(listenElapsed) : '未开始'}</span>
          </div>
          <button onClick={listenStartedAt ? stopTogether : startTogether} className="mt-2 w-full rounded-2xl border-[2px] border-white/40 bg-black/70 px-3 py-2 text-sm font-black text-white">
            {listenStartedAt ? '结束一起听并记录' : '开始一起听'}
          </button>
          <p className="mt-2 text-center text-[10px] font-black opacity-70">{listenStartedAt ? '一起听中' : listenCharacter ? '已加入，等你开始' : '等待好友加入'}</p>
        </div>
      </div>
    </div>
  );

  return (
    <section className="music-screen no-scrollbar h-full overflow-y-auto overflow-x-hidden overscroll-contain pb-5">
      <Header
        title="音乐"
        subtitle={currentTrack ? `${currentTrack.title} · ${musicPlayer.playing ? '播放中' : '暂停'}` : '搜索后点击即可播放'}
        onBack={
          activeCharSongId
            ? () => setActiveCharSongId(null)
            : tab !== 'library'
              ? () => setTab('library')
              : libraryView !== 'index'
                ? () => setLibraryView('index')
                : undefined
        }
        tabs={
          <>
            <Pill icon={<Search />} label="曲库" active={tab === 'library'} onClick={() => setTab('library')} />
            <Pill icon={<Headphones />} label="听歌" active={tab === 'player'} onClick={() => setTab('player')} />
            <Pill icon={<Sparkles />} label="char创作" active={tab === 'char'} onClick={() => setTab('char')} />
            <Pill icon={<CircleUserRound />} label="我的" active={tab === 'me'} onClick={() => setTab('me')} />
          </>
        }
      />

      {tab === 'player' && renderPlayer()}

      {tab === 'library' && libraryView !== 'index' && (
        <div className="mx-4 mt-4">
          <button onClick={() => setLibraryView('index')} className="circle-button small" title="返回曲库"><ChevronLeft className="h-4 w-4" /></button>
        </div>
      )}

      {tab === 'library' && libraryView === 'index' && (
        <>
          <Panel>
            <h3 className="mb-3 text-xl font-black">曲库</h3>
            <button onClick={() => setLibraryView('liked')} className="flex w-full items-center gap-3 border-b-[2px] border-[#111]/15 py-4 text-left">
              <span className="app-chip"><Heart className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block text-lg font-black">我喜欢</span><span className="block truncate text-xs font-bold opacity-60">{likedTracks.length} 首</span></span>
              <ChevronRight className="h-5 w-5" />
            </button>
            <button onClick={() => setLibraryView('playlists')} className="flex w-full items-center gap-3 border-b-[2px] border-[#111]/15 py-4 text-left">
              <span className="app-chip"><Star className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block text-lg font-black">歌单</span><span className="block truncate text-xs font-bold opacity-60">{musicPlaylists.length} 张</span></span>
              <ChevronRight className="h-5 w-5" />
            </button>
            <button onClick={() => setLibraryView('history')} className="flex w-full items-center gap-3 py-4 text-left">
              <span className="app-chip"><Clock className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block text-lg font-black">历史</span><span className="block truncate text-xs font-bold opacity-60">{musicListenRecords.length} 条记录</span></span>
              <ChevronRight className="h-5 w-5" />
            </button>
          </Panel>
          <Panel>
            <h3 className="mb-3 text-xl font-black">搜索音乐</h3>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input value={externalQuery} onChange={(event) => setExternalQuery(event.target.value)} className="hand-input min-w-0 text-sm" placeholder="搜歌名 / 歌手" />
              <button onClick={searchExternalMusic} disabled={searchingMusic} className="circle-button" title="搜索"><Search className="h-5 w-5" /></button>
            </div>
            <div className="mt-3 grid gap-2">
              <input
                value={musicSourceConfig.neteaseBaseUrl}
                onChange={(event) => setMusicSourceConfig({ neteaseBaseUrl: event.target.value })}
                className="hand-input w-full text-xs"
                placeholder="网易云 API Base URL，例如 http://localhost:3002"
              />
              <input
                value={musicSourceConfig.qqBaseUrl}
                onChange={(event) => setMusicSourceConfig({ qqBaseUrl: event.target.value })}
                className="hand-input w-full text-xs"
                placeholder="QQ 音乐 API Base URL，例如 http://localhost:3300"
              />
            </div>
            {musicStatus && <p className="mt-2 text-xs font-black opacity-60">{musicStatus}</p>}
            <div className="mt-3 rounded-3xl border-[2px] border-[#111]/15">
              <button onClick={() => setShowSearchResults(!showSearchResults)} className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left">
                <span className="min-w-0">
                  <span className="block text-sm font-black">搜索结果</span>
                  <span className="block truncate text-xs font-bold opacity-55">{musicSearchResults.length > 0 ? '点开选歌' : '搜索后出现'}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="app-chip justify-center text-xs">{sortedMusicSearchResults.length}</span>
                  <ChevronRight className={cn('h-5 w-5 transition-transform', showSearchResults && 'rotate-90')} />
                </span>
              </button>
              {showSearchResults && (
                <div className="grid gap-2 border-t-[2px] border-[#111]/15 p-3">
                  {musicPlaylists.length > 0 && (
                    <select value={quickPlaylistId} onChange={(event) => setQuickPlaylistId(event.target.value)} className="hand-input w-full text-sm">
                      <option value="">加入曲库时不放入歌单</option>
                      {musicPlaylists.map((playlist) => <option key={playlist.id} value={playlist.id}>同时加入：{playlist.name}</option>)}
                    </select>
                  )}
                  {sortedMusicSearchResults.map((result) => (
                    <div key={result.id} className="grid grid-cols-[48px_1fr_auto] items-center gap-3 rounded-2xl border-[2px] border-[#111]/15 p-2">
                      <button onClick={() => void playSearchResult(result)} className={cn('contents', result.access === 'unplayable' && 'cursor-not-allowed')} title={result.access === 'unplayable' ? '不可播放' : '播放并加入曲库'}>
                        <MusicCover track={{ ...result, audioUrl: result.audioUrl || '', tags: [], playCount: 0, createdAt: 0, updatedAt: 0 }} className="h-12 w-12 rounded-2xl" />
                        <span className="min-w-0 text-left">
                          <span className="block truncate text-sm font-black">{result.title}</span>
                          <span className="block truncate text-xs font-bold opacity-60">{result.artist}{result.album ? ` · ${result.album}` : ''}</span>
                          <span className="mt-1 flex flex-wrap gap-1">
                            <span className="inline-flex rounded-full border-[2px] border-[#111]/15 bg-white/70 px-2 py-0.5 text-[10px] font-black">{searchSourceLabel(result)}</span>
                            <span className={cn('inline-flex rounded-full border-[2px] border-[#111]/15 px-2 py-0.5 text-[10px] font-black', searchAccessClass(result))}>{searchAccessLabel(result)}</span>
                          </span>
                        </span>
                      </button>
                      <span className="flex gap-1">
                        <button onClick={() => void likeSearchResult(result)} className="circle-button small" title="加入我喜欢"><Heart className="h-4 w-4" /></button>
                        <button onClick={() => void addSearchResultToLibrary(result)} className="circle-button small" title="加入曲库/歌单"><Plus className="h-4 w-4" /></button>
                      </span>
                    </div>
                  ))}
                  {sortedMusicSearchResults.length === 0 && <Empty text="还没有搜索结果。" />}
                </div>
              )}
            </div>
          </Panel>
          <Panel>
            <h3 className="mb-3 text-xl font-black">我的音乐</h3>
            <div className="grid gap-2 rounded-3xl border-[2px] border-[#111]/15 p-3">
              <input value={customTitle} onChange={(event) => setCustomTitle(event.target.value)} className="hand-input w-full text-sm" placeholder="歌名（可选）" />
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input value={customUrl} onChange={(event) => setCustomUrl(event.target.value)} className="hand-input min-w-0 text-sm" placeholder="音频 URL" />
                <button onClick={addCustomUrlTrack} className="circle-button" title="加入 URL"><Link className="h-5 w-5" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="fetch-button justify-center">
                  <Import className="h-5 w-5" />
                  上传 MP3
                  <input type="file" accept="audio/*,.mp3" className="hidden" onChange={(event) => addUploadedTrack(event.target.files?.[0])} />
                </label>
                <button onClick={playDemoSound} className="fetch-button justify-center">
                  <Volume2 className="h-5 w-5" />
                  测试声音
                </button>
              </div>
            </div>
          </Panel>
          <Panel>
            <div className="mb-3 grid grid-cols-[1fr_auto] gap-2">
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="hand-input min-w-0 text-sm" placeholder="筛选已加入歌曲" />
              <span className="app-chip justify-center text-xs">{filteredTracks.length}</span>
            </div>
            {filteredTracks.length > 0 ? filteredTracks.map((track) => (
              <MusicTrackRow key={track.id} track={track} active={track.id === currentTrack?.id} onPlay={() => play(track.id)} onLike={() => toggleMusicTrackLiked(track.id)} onDelete={() => deleteMusicTrack(track.id)} />
            )) : <Empty text="还没有可播放歌曲。先搜索并点击一首歌。" />}
          </Panel>
        </>
      )}

      {tab === 'library' && libraryView === 'liked' && (
        <Panel>
          <h3 className="mb-3 text-xl font-black">我喜欢</h3>
          {likedTracks.length > 0 ? likedTracks.map((track) => (
            <MusicTrackRow key={track.id} track={track} active={track.id === currentTrack?.id} onPlay={() => play(track.id)} onLike={() => toggleMusicTrackLiked(track.id)} />
          )) : <Empty text="喜欢的歌会出现在这里。" />}
        </Panel>
      )}

      {tab === 'library' && libraryView === 'playlists' && (
        <>
          <Panel>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-xl font-black">歌单</h3>
              <button onClick={startNewPlaylist} className="circle-button small" title="新建歌单"><Plus className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-2">
              {musicPlaylists.length > 0 ? musicPlaylists.map((playlist) => {
                const count = playlist.trackIds.length;
                const coverTrack = musicTracks.find((track) => track.id === playlist.trackIds[0]);
                return (
                  <button key={playlist.id} onClick={() => { setSelectedPlaylistId(playlist.id); setLibraryView('playlist-detail'); }} className="grid w-full grid-cols-[56px_1fr_auto] items-center gap-3 rounded-2xl border-[2px] border-[#111]/15 p-2 text-left">
                    <MusicCover track={coverTrack} playlist={playlist} className="h-14 w-14 rounded-2xl" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">{playlist.favorite ? '♥ ' : ''}{playlist.name}</span>
                      <span className="block truncate text-xs font-bold opacity-60">{count} 首 · {playlist.description || '点开查看详情'}</span>
                    </span>
                    <ChevronRight className="h-5 w-5" />
                  </button>
                );
              }) : (
                <Empty text="还没有歌单。下面可以新建一张。" />
              )}
            </div>
          </Panel>
          <Panel>
            <h3 className="mb-3 text-xl font-black">{editingPlaylistId ? '编辑歌单' : '新建歌单'}</h3>
            <Field icon={<Star />} label="歌单名"><input value={playlistDraft.name} onChange={(event) => setPlaylistDraft({ ...playlistDraft, name: event.target.value })} className="hand-input w-full text-sm" placeholder="今晚一起听" /></Field>
            <Field icon={<Quote />} label="描述"><textarea value={playlistDraft.description} onChange={(event) => setPlaylistDraft({ ...playlistDraft, description: event.target.value })} className="hand-input min-h-20 w-full resize-none text-sm" /></Field>
            <Field icon={<ImageIcon />} label="封面">
              <button onClick={() => setShowCoverPicker(!showCoverPicker)} className="fetch-button w-full justify-center"><ImageIcon className="h-5 w-5" />从相册选择</button>
              {showCoverPicker && (
                <div className="no-scrollbar mt-3 grid max-h-44 grid-cols-4 gap-2 overflow-y-auto">
                  {galleryPhotos.map((photo) => (
                    <button key={photo.id} onClick={() => setPlaylistDraft({ ...playlistDraft, cover: photo.url })} className={cn('h-16 overflow-hidden rounded-2xl border-[3px] border-[#111]', playlistDraft.cover === photo.url && 'ring-4 ring-[#111]/20')} title={photo.title}>
                      <img src={photo.url} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              {galleryPhotos.length === 0 && <p className="mt-2 text-xs font-black opacity-55">相册还没有照片。</p>}
            </Field>
            <div className="mb-4 grid gap-2">
              {playlistTrackOptions.map((track) => {
                const checked = playlistDraft.trackIds.includes(track.id);
                return (
                  <button key={track.id} onClick={() => setPlaylistDraft({ ...playlistDraft, trackIds: checked ? playlistDraft.trackIds.filter((id) => id !== track.id) : [...playlistDraft.trackIds, track.id] })} className={cn('grid grid-cols-[1fr_20px] items-center rounded-2xl border-[2px] border-[#111]/20 px-3 py-2 text-left text-sm font-black', checked && 'bg-[#dceecd]')}>
                    <span className="min-w-0 truncate pr-2">{track.liked ? '♥ ' : ''}{track.title} · {track.artist}</span>
                    {checked && <Check className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
            <button onClick={savePlaylist} className="save-button w-full">保存</button>
          </Panel>
        </>
      )}

      {tab === 'library' && libraryView === 'playlist-detail' && selectedPlaylist && (
        <>
          <Panel>
            <div className="grid grid-cols-[88px_1fr] gap-4">
              <button onClick={() => { startEditPlaylist(selectedPlaylist); setShowCoverPicker(true); setLibraryView('playlists'); }} title="从相册换封面">
                <MusicCover playlist={selectedPlaylist} className="h-24 w-24 rounded-[22px]" />
              </button>
              <div className="min-w-0">
                <h2 className="line-clamp-2 text-xl font-black leading-tight">{selectedPlaylist.name}</h2>
                <p className="mt-1 line-clamp-2 text-xs font-bold opacity-65">{selectedPlaylist.description || '还没有描述。'}</p>
                <div className="mt-3 flex gap-2">
                  <MusicIconButton icon={<Heart />} label="收藏" active={selectedPlaylist.favorite} onClick={() => toggleMusicPlaylistFavorite(selectedPlaylist.id)} />
                  <MusicIconButton icon={<FileText />} label="编辑" onClick={() => { startEditPlaylist(selectedPlaylist); setLibraryView('playlists'); }} />
                  <MusicIconButton icon={<Trash2 />} label="删除" onClick={() => { deleteMusicPlaylist(selectedPlaylist.id); setLibraryView('playlists'); }} />
                </div>
              </div>
            </div>
          </Panel>
          <Panel>
            {playlistTracks.length > 0 ? playlistTracks.map((track) => (
              <MusicTrackRow key={track.id} track={track} active={track.id === currentTrack?.id} onPlay={() => play(track.id)} onLike={() => toggleMusicTrackLiked(track.id)} onDelete={() => removeTrackFromMusicPlaylist(selectedPlaylist.id, track.id)} />
            )) : <Empty text="这张歌单还没有可听歌曲。" />}
          </Panel>
        </>
      )}

      {tab === 'library' && libraryView === 'history' && (
        <>
          <Panel>
            <h3 className="mb-3 text-xl font-black">一起听排行</h3>
            {togetherRanking.length > 0 ? togetherRanking.map((item, index) => (
              <div key={item.character.id} className="grid grid-cols-[40px_1fr_auto] items-center gap-3 border-b-[2px] border-[#111]/15 py-3 last:border-b-0">
                <span className="text-lg font-black">#{index + 1}</span>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-[2px] border-[#111] bg-white">
                    {item.character.avatar ? <img src={item.character.avatar} className="h-full w-full object-cover" /> : <CircleUserRound className="h-5 w-5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">{item.character.name}</span>
                    <span className="block truncate text-xs font-bold opacity-55">{item.records.length} 次一起听</span>
                  </span>
                </span>
                <span className="app-chip justify-center text-xs">{formatMusicDuration(item.seconds)}</span>
              </div>
            )) : <Empty text="结束一次一起听后会生成排行。" />}
          </Panel>
          <Panel>
            <h3 className="mb-3 text-xl font-black">历史</h3>
            {musicListenRecords.length > 0 ? musicListenRecords.map((record) => {
              const track = musicTracks.find((item) => item.id === record.trackId);
              const character = characters.find((item) => item.id === record.characterId);
              if (!track) return null;
              return (
                <div key={record.id} className="border-b-[2px] border-[#111]/15 py-3 last:border-b-0">
                  <MusicTrackRow track={track} active={track.id === currentTrack?.id} onPlay={() => play(track.id)} onLike={() => toggleMusicTrackLiked(track.id)} />
                  <p className="mt-1 truncate text-xs font-bold opacity-55">{new Date(record.createdAt).toLocaleString()} {character ? `· ${character.name}` : ''} {record.durationSeconds ? `· ${formatMusicDuration(record.durationSeconds)}` : ''}</p>
                  {record.note && <p className="mt-1 line-clamp-2 text-sm font-bold opacity-70">{record.note}</p>}
                </div>
              );
            }) : <Empty text="播放或一起听后会留下记录。" />}
          </Panel>
        </>
      )}

      {tab === 'me' && (
        <>
          <Panel>
            <div className="flex items-center gap-4">
              <label className="block cursor-pointer">
                <span className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[28px] border-[3px] border-[#111] bg-white">
                  {userAvatar ? <img src={userAvatar} className="h-full w-full object-cover" /> : <CircleUserRound className="h-12 w-12 opacity-60" />}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadMyMusicAvatar(event.target.files?.[0])} />
              </label>
              <div className="min-w-0">
                <h3 className="truncate text-2xl font-black">{userName || '我'}</h3>
                <p className="mt-1 text-sm font-bold opacity-60">听歌资料</p>
                <p className="mt-3 rounded-2xl bg-white/60 px-3 py-2 text-xs font-black">一起听 {formatMusicDuration(togetherSeconds)} · 播放 {myPlayCount} 次</p>
              </div>
            </div>
            <Field icon={<CircleUserRound />} label="我的名字">
              <input value={userName} onChange={(event) => setUserName(event.target.value)} className="hand-input w-full text-sm" />
            </Field>
          </Panel>
          <Panel>
            <h3 className="mb-3 text-xl font-black">我的听歌排行</h3>
            {[...playableTracks].sort((a, b) => b.playCount - a.playCount).slice(0, 8).map((track, index) => (
              <div key={track.id} className="grid grid-cols-[32px_48px_1fr_auto] items-center gap-3 border-b-[2px] border-[#111]/15 py-3 last:border-b-0">
                <span className="font-black">#{index + 1}</span>
                <MusicCover track={track} className="h-12 w-12 rounded-2xl" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black">{track.title}</span>
                  <span className="block truncate text-xs font-bold opacity-55">{track.artist}</span>
                </span>
                <span className="app-chip justify-center text-xs">{track.playCount} 次</span>
              </div>
            ))}
            {playableTracks.length === 0 && <Empty text="播放歌曲后会出现排行。" />}
          </Panel>
          <Panel>
            <h3 className="mb-3 text-xl font-black">一起听排行</h3>
            {togetherRanking.length > 0 ? togetherRanking.map((item, index) => (
              <div key={item.character.id} className="grid grid-cols-[32px_44px_1fr_auto] items-center gap-3 border-b-[2px] border-[#111]/15 py-3 last:border-b-0">
                <span className="font-black">#{index + 1}</span>
                <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-[2px] border-[#111] bg-white">
                  {item.character.avatar ? <img src={item.character.avatar} className="h-full w-full object-cover" /> : <CircleUserRound className="h-5 w-5" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black">{item.character.name}</span>
                  <span className="block truncate text-xs font-bold opacity-55">{item.records.length} 次一起听</span>
                </span>
                <span className="app-chip justify-center text-xs">{formatMusicDuration(item.seconds)}</span>
              </div>
            )) : <Empty text="还没有一起听记录。" />}
          </Panel>
        </>
      )}

      {tab === 'char' && activeCharSong && (
        <Panel>
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-[#111] bg-white">
              {characters.find((character) => character.id === activeCharSong.characterId)?.avatar ? (
                <img src={characters.find((character) => character.id === activeCharSong.characterId)?.avatar} className="h-full w-full object-cover" />
              ) : <CircleUserRound className="h-7 w-7" />}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xl font-black">{activeCharSong.title}</span>
              <span className="block truncate text-xs font-bold opacity-60">{activeCharSong.artist} 名下</span>
            </span>
          </div>
          <Field icon={<Music />} label="修改歌名">
            <input
              value={activeCharSong.title}
              onChange={(event) => updateMusicTrack(activeCharSong.id, { title: event.target.value })}
              className="hand-input w-full text-sm"
            />
          </Field>
          <Field icon={<Volume2 />} label="旋律"><p className="rounded-2xl bg-white/55 p-3 text-sm font-bold leading-6">{activeCharSong.melody || '暂无旋律记录'}</p></Field>
          <Field icon={<Headphones />} label="编曲"><p className="rounded-2xl bg-white/55 p-3 text-sm font-bold leading-6">{activeCharSong.arrangement || '暂无编曲记录'}</p></Field>
          <Field icon={<Quote />} label="歌词"><p className="whitespace-pre-wrap rounded-2xl bg-white/55 p-3 text-sm font-bold leading-7">{cleanLyricsText(activeCharSong.lyrics) || '暂无歌词'}</p></Field>
          <button onClick={() => void singWithTts(activeCharSong)} className="save-button mb-2 w-full">唱歌</button>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => toggleMusicTrackLiked(activeCharSong.id)} className="fetch-button justify-center">{activeCharSong.liked ? '已收藏' : '收藏'}</button>
            <button onClick={() => {
              setCharSongDraft({
                characterId: activeCharSong.characterId || '',
                title: activeCharSong.title,
                mood: activeCharSong.tags.filter((tag) => tag !== 'char创作').join('、'),
                melody: activeCharSong.melody || '',
                arrangement: activeCharSong.arrangement || '',
                lyrics: activeCharSong.lyrics || '',
              });
              setActiveCharSongId(null);
            }} className="fetch-button justify-center">继续改</button>
            <button onClick={() => { deleteMusicTrack(activeCharSong.id); setActiveCharSongId(null); }} className="fetch-button justify-center bg-[#ffd6d6]">删除</button>
          </div>
        </Panel>
      )}

      {tab === 'char' && !activeCharSong && (
        <Panel>
          <h3 className="mb-3 text-xl font-black">char 创作</h3>
          <Field icon={<CircleUserRound />} label="选择 char">
            <select value={charSongDraft.characterId} onChange={(event) => setCharSongDraft({ ...charSongDraft, characterId: event.target.value })} className="hand-input w-full text-sm">
              <option value="">默认角色</option>
              {characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
            </select>
          </Field>
          <Field icon={<Music />} label="歌名"><input value={charSongDraft.title} onChange={(event) => setCharSongDraft({ ...charSongDraft, title: event.target.value })} className="hand-input w-full text-sm" placeholder="让 char 写一首歌" /></Field>
          <Field icon={<Tag />} label="情绪"><input value={charSongDraft.mood} onChange={(event) => setCharSongDraft({ ...charSongDraft, mood: event.target.value })} className="hand-input w-full text-sm" /></Field>
          <Field icon={<Volume2 />} label="旋律"><textarea value={charSongDraft.melody} onChange={(event) => setCharSongDraft({ ...charSongDraft, melody: event.target.value })} className="hand-input min-h-20 w-full resize-none text-sm" placeholder="比如：主歌低声，副歌上扬，hook 重复歌名" /></Field>
          <Field icon={<Headphones />} label="编曲"><textarea value={charSongDraft.arrangement} onChange={(event) => setCharSongDraft({ ...charSongDraft, arrangement: event.target.value })} className="hand-input min-h-20 w-full resize-none text-sm" placeholder="比如：电钢、鼓组、合成器 pad，副歌加和声" /></Field>
          <Field icon={<Quote />} label="歌词"><textarea value={charSongDraft.lyrics} onChange={(event) => setCharSongDraft({ ...charSongDraft, lyrics: event.target.value })} className="hand-input min-h-32 w-full resize-none text-sm" placeholder="可留空，让 AI 按人设和过去创作写完整歌曲" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => void generateCharSong()} disabled={generatingCharSong} className="save-button w-full">{generatingCharSong ? '创作中' : '创作'}</button>
            <button onClick={() => void singWithTts()} className="save-button w-full">唱歌</button>
          </div>
          <p className="mt-2 text-xs font-black opacity-55">接入 TTS/歌声模型后可以唱歌。</p>
          {charSongStatus && <p className="mt-3 rounded-2xl bg-white/55 px-3 py-2 text-xs font-black leading-5 opacity-70">{charSongStatus}</p>}
          <div className="mt-4 grid gap-2">
            {charSongs.slice(0, 8).map((track) => (
              <button key={track.id} onClick={() => setActiveCharSongId(track.id)} className="grid grid-cols-[44px_1fr_auto_auto] items-center gap-2 rounded-2xl border-[2px] border-[#111]/15 px-3 py-2 text-left">
                <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-[2px] border-[#111] bg-white">
                  {characters.find((character) => character.id === track.characterId)?.avatar ? (
                    <img src={characters.find((character) => character.id === track.characterId)?.avatar} className="h-full w-full object-cover" />
                  ) : <CircleUserRound className="h-5 w-5" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black">{track.title}</span>
                  <span className="block truncate text-xs font-bold opacity-55">{track.artist} · {track.melody || '已保存到 char 名下'}</span>
                </span>
                <button onClick={(event) => { event.stopPropagation(); toggleMusicTrackLiked(track.id); }} className="circle-button small" title="收藏"><Heart className={cn('h-4 w-4', track.liked && 'fill-current')} /></button>
                <button onClick={(event) => { event.stopPropagation(); deleteMusicTrack(track.id); }} className="circle-button small" title="删除"><Trash2 className="h-4 w-4" /></button>
              </button>
            ))}
          </div>
        </Panel>
      )}
    </section>
  );
}
type TheaterStyle = TheaterScene['style'];
type TheaterLength = TheaterScene['length'];
type TheaterView = 'create' | 'favorites' | 'history' | 'topics' | 'worldbook';

const theaterLengthShortLabels: Record<TheaterLength, string> = {
  short: '短',
  medium: '中',
  long: '长',
  custom: '自定',
};

const theaterLengthHints: Record<TheaterLength, string> = {
  short: '约 200-600 字',
  medium: '约 400-800 字',
  long: '约 800-1500 字',
  custom: '自定义字数',
};

function buildFallbackTheaterScene(theme: string, actors: Character[], length: TheaterLength, rollResult = '') {
  const names = actors.length > 0 ? actors.map((actor) => actor.name).join('、') : '你们';
  const extra = length === 'long'
    ? '\n\n【尾声】\n这段事被悄悄留在手机里，像一条没发出去的消息，等下一次被重新点开。'
    : '';
  return [
    `《${theme || '无题小剧场'}》`,
    '',
    '【出场】',
    names,
    '',
    '【剧情】',
    `夜里屏幕亮了一下，${names}因为“${theme || rollResult.split('\n').find(Boolean) || '一次突然的误会'}”这件事被拉进同一个完整的故事。`,
    actors[0] ? `${actors[0].name}先开口，语气像是忍了很久：“所以，你刚才其实都看见了？”` : '有人先开口：“所以，你刚才其实都看见了？”',
    actors[1] ? `${actors[1].name}没有立刻回答，只把手机扣在掌心，像在藏住一个比答案更重的停顿。` : '对面没有立刻回答，只把手机扣在掌心，像在藏住一个比答案更重的停顿。',
    '他们从误会开始，一句一句把事情摊开，又在最难承认的地方发现彼此真正害怕的不是答案，而是被丢下。',
    '',
    '【收束】',
    `最后，${actors[0]?.name || '那个人'}把声音放轻：“这次先别跳过我。”`,
    extra,
  ].join('\n');
}

function TheaterScreen() {
  const {
    characters,
    theaterScenes,
    theaterTopicEntries,
    theaterWorldBookEntries,
    apiBaseUrl,
    apiKey,
    selectedModel,
    chatTemperature,
    addTheaterScene,
    updateTheaterScene,
    deleteTheaterScene,
    toggleTheaterSceneFavorite,
    addTheaterTopicEntry,
    importTheaterTopicEntries,
    deleteTheaterTopicEntry,
    toggleTheaterTopicFavorite,
    importTheaterWorldBookEntries,
    updateTheaterWorldBookEntry,
    deleteTheaterWorldBookEntry,
    addDiary,
    addMessage,
    openChat,
  } = useAppStore();
  const worldBookInputRef = useRef<HTMLInputElement>(null);
  const topicInputRef = useRef<HTMLInputElement>(null);
  const [theme, setTheme] = useState('');
  const [length, setLength] = useState<TheaterLength>('medium');
  const [customLengthText, setCustomLengthText] = useState('1200');
  const [selectedIds, setSelectedIds] = useState<string[]>(() => characters[0]?.id ? [characters[0].id] : []);
  const [actorsOpen, setActorsOpen] = useState(false);
  const [content, setContent] = useState('');
  const [activeId, setActiveId] = useState<string | null>(theaterScenes[0]?.id || null);
  const [status, setStatus] = useState('');
  const [rollResult, setRollResult] = useState('');
  const [worldBookOpenId, setWorldBookOpenId] = useState<string | null>(null);
  const [topicDraft, setTopicDraft] = useState('');
  const [topicCategory, setTopicCategory] = useState('默认');
  const [topicFilter, setTopicFilter] = useState('全部');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'favorite'>('all');
  const [theaterView, setTheaterView] = useState<TheaterView>('create');
  const [isGenerating, setIsGenerating] = useState(false);

  const activeScene = theaterScenes.find((scene) => scene.id === activeId) || null;
  const actors = selectedIds.map((id) => characters.find((character) => character.id === id)).filter(Boolean) as Character[];
  const previewContent = content || activeScene?.content || '';
  const rollableEntries = theaterWorldBookEntries.filter((entry) => entry.enabled && entry.selected);
  const topicCategories = Array.from(new Set(['全部', '默认', ...theaterTopicEntries.map((entry) => entry.category || '默认')]));
  const filteredTopicEntries = theaterTopicEntries.filter((entry) => topicFilter === '全部' || entry.category === topicFilter);
  const visibleScenes = historyFilter === 'favorite' ? theaterScenes.filter((scene) => scene.favorite) : theaterScenes;
  const actorSummary = actors.length > 0 ? actors.map((actor) => actor.name).join('、') : '未选择角色';
  const activeLengthHint = length === 'custom' ? `约 ${customLengthText.match(/\d+/)?.[0] || '自定'} 字` : theaterLengthHints[length];

  const toggleActor = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };
  const loadScene = (scene: TheaterScene) => {
    setActiveId(scene.id);
    setTheme(scene.theme);
    setLength(scene.length);
    setCustomLengthText(scene.customLengthText || '1200');
    setSelectedIds(scene.characterIds);
    setContent(scene.content);
    setRollResult(scene.rollResult || '');
    setStatus('');
    setTheaterView('create');
  };
  const resetDraft = () => {
    setActiveId(null);
    setTheme('');
    setLength('medium');
    setCustomLengthText('1200');
    setSelectedIds(characters[0]?.id ? [characters[0].id] : []);
    setContent('');
    setRollResult('');
    setStatus('');
    setTheaterView('create');
  };
  const saveScene = (overrideContent?: string) => {
    const cleanContent = (overrideContent ?? content).trim();
    if (!cleanContent) {
      setStatus('先生成或写一段剧情。');
      return '';
    }
    const title = (theme.trim() || cleanContent.split('\n').find(Boolean) || '小剧场').replace(/[《》]/g, '').slice(0, 24);
    const payload = {
      title,
      theme: theme.trim() || title,
      characterIds: selectedIds,
      style: 'random' as TheaterStyle,
      length,
      customLengthText: length === 'custom' ? customLengthText.trim() : '',
      rollResult: rollResult.trim(),
      content: cleanContent,
      beats: cleanContent.split('\n').map((line) => line.trim()).filter((line) => line.startsWith('【')).slice(0, 6),
      source: 'manual' as const,
    };
    if (activeId) {
      updateTheaterScene(activeId, payload);
      setStatus('已更新小剧场。');
      return activeId;
    }
    const id = addTheaterScene(payload);
    setActiveId(id);
    setStatus('已保存小剧场。');
    return id;
  };
  const toggleActiveFavorite = () => {
    const existing = activeId || saveScene();
    if (!existing) return;
    toggleTheaterSceneFavorite(existing);
    setStatus(activeScene?.favorite ? '已取消收藏。' : '已收藏。');
  };
  const importTopicFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const entries = parseTheaterTopicImport(text, topicCategory || '默认');
      if (entries.length === 0) {
        setStatus('没有识别到可用主题。');
        return;
      }
      importTheaterTopicEntries(entries);
      setStatus(`已导入 ${entries.length} 个主题。`);
    } catch (error) {
      setStatus(error instanceof Error ? `主题导入失败：${error.message}` : '主题导入失败。');
    } finally {
      event.target.value = '';
    }
  };
  const addTopicFromDraft = () => {
    const clean = topicDraft.trim() || theme.trim();
    if (!clean) {
      setStatus('先写一个主题。');
      return;
    }
    addTheaterTopicEntry({
      title: clean.replace(/\s+/g, ' ').slice(0, 24),
      content: clean,
      category: topicCategory.trim() || '默认',
    });
    setTopicDraft('');
    setStatus('已保存到主题库。');
  };
  const useTopic = (content: string) => {
    setTheme(resolveTavernRandom(content));
    setStatus('已选入主题。');
    setTheaterView('create');
  };
  const randomTopic = () => {
    const source = filteredTopicEntries.length > 0 ? filteredTopicEntries : theaterTopicEntries;
    const picked = source[Math.floor(Math.random() * source.length)];
    if (!picked) {
      setStatus('主题库还是空的。');
      return;
    }
    useTopic(picked.content);
  };
  const importWorldBookFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const entries = parseWorldBookJson(text);
      if (entries.length === 0) {
        setStatus('没有识别到可用世界书条目。');
        return;
      }
      importTheaterWorldBookEntries(entries);
      setStatus(`已导入 ${entries.length} 条世界书。`);
    } catch (error) {
      setStatus(error instanceof Error ? `导入失败：${error.message}` : '导入失败。');
    } finally {
      event.target.value = '';
    }
  };
  const rollWorldBook = () => {
    const result = rollWorldBookEntries(rollableEntries);
    if (result.length === 0) {
      setStatus('先导入世界书，并打开至少一个条目的 roll。');
      return;
    }
    const text = result.join('\n');
    setRollResult(text);
    setStatus(`已生成世界输入，可直接修改后生成。`);
  };
  const appendRollToTheme = () => {
    if (!rollResult.trim()) {
      setStatus('先 roll 一次。');
      return;
    }
    setTheme((current) => [current.trim(), rollResult.trim()].filter(Boolean).join('\n\n'));
    setStatus('已复制到主题。');
  };
  const saveRollAsTopic = () => {
    const clean = rollResult.trim();
    if (!clean) {
      setStatus('先 roll 一次。');
      return;
    }
    addTheaterTopicEntry({
      title: clean.split('\n').find((line) => line.trim())?.replace(/[【】]/g, '').slice(0, 24) || '随机结果',
      content: clean,
      category: topicCategory.trim() || '默认',
    });
    setStatus('已把随机结果保存为主题。');
  };
  const confirmDeleteScene = (id: string) => {
    if (!window.confirm('确定删除这个小剧场吗？\n删除后不可恢复。')) return;
    deleteTheaterScene(id);
    if (activeId === id) resetDraft();
    setStatus('已删除小剧场。');
  };
  const generateScene = async () => {
    const cleanTheme = theme.trim();
    let effectiveRollResult = rollResult.trim();
    if (!cleanTheme && !effectiveRollResult) {
      setStatus('先写一个主题，或点随机主题 / 世界输入。');
      return;
    }
    const sceneActors = actors.length > 0 ? actors : characters.slice(0, 2);
    setIsGenerating(true);
    setStatus('正在生成小剧场...');
    try {
      let nextContent = '';
      if (apiBaseUrl && selectedModel) {
        nextContent = await requestChatCompletion({
          baseUrl: apiBaseUrl,
          apiKey,
          model: selectedModel,
          temperature: chatTemperature,
          maxTokens: getTheaterMaxTokens(length, customLengthText),
          messages: [
            {
              role: 'system',
              content: buildTheaterSystemPrompt(sceneActors.map(getCharacterPrompt).filter(Boolean).join('\n\n')),
            },
            {
              role: 'user',
              content: buildTheaterUserPrompt({
                theme: cleanTheme,
                length,
                customLengthText,
                actorNames: sceneActors.map((actor) => actor.name),
                rollResult: effectiveRollResult,
              }),
            },
          ],
        });
      }
      const finalContent = nextContent.trim() || buildFallbackTheaterScene(cleanTheme, sceneActors, length, effectiveRollResult);
      setContent(finalContent);
      const id = addTheaterScene({
        title: (cleanTheme || effectiveRollResult.split('\n').find(Boolean) || '随机小剧场').slice(0, 24),
        theme: cleanTheme || '随机小剧场',
        characterIds: sceneActors.map((actor) => actor.id),
        style: 'random',
        length,
        customLengthText: length === 'custom' ? customLengthText.trim() : '',
        rollResult: effectiveRollResult,
        content: finalContent,
        beats: finalContent.split('\n').map((line) => line.trim()).filter((line) => line.startsWith('【')).slice(0, 6),
        source: apiBaseUrl && selectedModel ? 'ai' : 'manual',
      });
      setSelectedIds(sceneActors.map((actor) => actor.id));
      setActiveId(id);
      setStatus(apiBaseUrl && selectedModel ? '已生成并保存。' : '没有配置模型，已生成本地示例。');
    } catch (error) {
      const fallback = buildFallbackTheaterScene(cleanTheme, sceneActors, length, effectiveRollResult);
      setContent(fallback);
      setStatus(error instanceof Error ? `生成失败，已给出本地草稿：${error.message}` : '生成失败，已给出本地草稿。');
    } finally {
      setIsGenerating(false);
    }
  };
  const saveToDiary = () => {
    const cleanContent = previewContent.trim();
    if (!cleanContent) {
      setStatus('没有可保存的剧情。');
      return;
    }
    addDiary({
      owner: 'user',
      title: `小剧场：${(theme || activeScene?.theme || '未命名').slice(0, 16)}`,
      content: cleanContent,
      tags: ['小剧场'],
      source: 'manual',
      relatedMessageIds: [],
      favorite: false,
    });
    setStatus('已保存到日记。');
  };
  const sendToChat = () => {
    const cleanContent = previewContent.trim();
    const characterId = selectedIds[0] || characters[0]?.id;
    if (!cleanContent || !characterId) {
      setStatus('需要至少一个角色和一段剧情。');
      return;
    }
    addMessage(characterId, 'wechat', {
      id: createId('msg'),
      role: 'model',
      content: `【小剧场】${theme || activeScene?.theme || '剧情片段'}\n${cleanContent.slice(0, 700)}`,
      timestamp: Date.now(),
      kind: 'call-note',
    });
    openChat(characterId, 'wechat');
  };

  const renderHeader = (subtitle: string) => (
    <Header
      title="小剧场"
      subtitle={subtitle}
      onSave={theaterView === 'create' ? () => void generateScene() : undefined}
      onBack={theaterView === 'create' ? undefined : () => setTheaterView('create')}
      saveLabel={isGenerating ? '生成中' : '生成'}
      tabs={
        <>
          <Pill active={theaterView === 'create'} icon={<Clapperboard />} label="创作" onClick={resetDraft} />
          <Pill active={theaterView === 'favorites'} icon={<Star />} label="收藏夹" onClick={() => { setHistoryFilter('favorite'); setTheaterView('favorites'); }} />
          <Pill active={theaterView === 'history'} icon={<BookOpen />} label="历史" onClick={() => { setHistoryFilter('all'); setTheaterView('history'); }} />
        </>
      }
    />
  );

  const renderHiddenInputs = () => (
    <>
      <input ref={worldBookInputRef} type="file" accept=".json,application/json" onChange={(event) => void importWorldBookFile(event)} className="hidden" />
      <input ref={topicInputRef} type="file" accept=".json,.txt,text/plain,application/json" onChange={(event) => void importTopicFile(event)} className="hidden" />
    </>
  );

  const renderSceneList = (scenes: TheaterScene[], emptyText: string) => (
    <Panel>
      {scenes.length === 0 && <Empty text={emptyText} />}
      <div className="grid gap-3">
        {scenes.map((scene) => (
          <article key={scene.id} className={cn('rounded-2xl border-[2px] border-[#111]/15 p-4 text-left', activeId === scene.id && 'bg-[#fff0bd]')}>
            <div className="flex items-start justify-between gap-3">
              <button onClick={() => loadScene(scene)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-base font-black">{scene.title}</p>
                <p className="mt-1 line-clamp-2 text-xs font-bold opacity-60">{scene.content.replace(/\s+/g, ' ').slice(0, 82)}</p>
              </button>
              <button onClick={() => toggleTheaterSceneFavorite(scene.id)} className={cn('circle-button small shrink-0', scene.favorite && 'bg-[#fff0bd]')} title={scene.favorite ? '取消收藏' : '收藏'}>
                <Star className={cn('h-4 w-4', scene.favorite && 'fill-current')} />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-black">{theaterLengthHints[scene.length]}</span>
              {scene.favorite && <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-black">已收藏</span>}
              <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-black">{formatDateLabel(scene.updatedAt)}</span>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );

  const renderTopicLibrary = () => (
    <Panel>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-black">主题库</h2>
          <p className="mt-1 truncate text-xs font-bold opacity-60">{theaterTopicEntries.length} 个主题 · {topicFilter}</p>
        </div>
        <button onClick={() => topicInputRef.current?.click()} className="save-button">导入</button>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input value={topicCategory} onChange={(event) => setTopicCategory(event.target.value)} className="hand-input min-w-0 text-sm" placeholder="分类 / 圈" />
        <button onClick={addTopicFromDraft} className="circle-button" title="新增主题"><Plus className="h-5 w-5" /></button>
      </div>
      <textarea value={topicDraft} onChange={(event) => setTopicDraft(event.target.value)} className="hand-input mt-2 min-h-[76px] w-full resize-none text-sm" placeholder="新主题，或留空把创作页主题保存进主题库" />
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {topicCategories.map((category) => (
          <button key={category} onClick={() => setTopicFilter(category)} className={cn('pill shrink-0 px-3 py-2 text-xs', topicFilter === category && 'active')}>{category}</button>
        ))}
      </div>
      <div className="mt-3 grid gap-2">
        {filteredTopicEntries.length === 0 && <Empty text="还没有这个分类的主题。" />}
        {filteredTopicEntries.map((entry) => (
          <article key={entry.id} className="rounded-2xl border-[2px] border-[#111]/15 p-3">
            <div className="flex items-start justify-between gap-2">
              <button onClick={() => useTopic(entry.content)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-black">{entry.title}</p>
                <p className="mt-1 line-clamp-2 text-[11px] font-bold opacity-60">{entry.content.replace(/\s+/g, ' ').slice(0, 96)}</p>
              </button>
              <button onClick={() => toggleTheaterTopicFavorite(entry.id)} className={cn('circle-button small shrink-0', entry.favorite && 'bg-[#fff0bd]')} title={entry.favorite ? '取消收藏主题' : '收藏主题'}>
                <Star className={cn('h-4 w-4', entry.favorite && 'fill-current')} />
              </button>
              <button onClick={() => deleteTheaterTopicEntry(entry.id)} className="circle-button small shrink-0" title="删除主题">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-black">{entry.category}</span>
              {entry.favorite && <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-black">已收藏</span>}
            </div>
          </article>
        ))}
      </div>
      {status && <p className="mt-3 rounded-2xl bg-white/55 px-3 py-2 text-xs font-black leading-5 opacity-70">{status}</p>}
    </Panel>
  );

  const renderWorldBookManager = () => (
    <>
      <Panel>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-black">主题随机</h2>
            <p className="mt-1 truncate text-xs font-bold opacity-60">{theaterTopicEntries.length} 个主题 · {topicFilter}</p>
          </div>
          <button onClick={() => topicInputRef.current?.click()} className="save-button">导入主题</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={randomTopic} className="fetch-button bg-[#edf7ed]">
            <Shuffle className="h-5 w-5" />
            随机主题
          </button>
          <button onClick={addTopicFromDraft} className="fetch-button bg-[#fff0bd]">
            <Plus className="h-5 w-5" />
            保存当前主题
          </button>
        </div>
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <input value={topicCategory} onChange={(event) => setTopicCategory(event.target.value)} className="hand-input min-w-0 text-sm" placeholder="分类 / 圈" />
          <button onClick={addTopicFromDraft} className="circle-button" title="新增主题"><Plus className="h-5 w-5" /></button>
        </div>
        <textarea value={topicDraft} onChange={(event) => setTopicDraft(event.target.value)} className="hand-input mt-2 min-h-[70px] w-full resize-none text-sm" placeholder="新主题，或留空把创作页主题保存进主题库" />
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {topicCategories.map((category) => (
            <button key={category} onClick={() => setTopicFilter(category)} className={cn('pill shrink-0 px-3 py-2 text-xs', topicFilter === category && 'active')}>{category}</button>
          ))}
        </div>
        <div className="mt-3 grid gap-2">
          {filteredTopicEntries.length === 0 && <Empty text="还没有这个分类的主题。" />}
          {filteredTopicEntries.slice(0, 8).map((entry) => (
            <article key={entry.id} className="rounded-2xl border-[2px] border-[#111]/15 p-3">
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => useTopic(entry.content)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-black">{entry.title}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] font-bold opacity-60">{entry.content.replace(/\s+/g, ' ').slice(0, 96)}</p>
                </button>
                <button onClick={() => toggleTheaterTopicFavorite(entry.id)} className={cn('circle-button small shrink-0', entry.favorite && 'bg-[#fff0bd]')} title={entry.favorite ? '取消收藏主题' : '收藏主题'}>
                  <Star className={cn('h-4 w-4', entry.favorite && 'fill-current')} />
                </button>
                <button onClick={() => deleteTheaterTopicEntry(entry.id)} className="circle-button small shrink-0" title="删除主题">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
        {status && <p className="mt-3 rounded-2xl bg-white/55 px-3 py-2 text-xs font-black leading-5 opacity-70">{status}</p>}
      </Panel>

      <Panel>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-black">世界书随机</h2>
            <p className="mt-1 truncate text-xs font-bold opacity-60">{theaterWorldBookEntries.length} 条 · {rollableEntries.length} 条参与随机</p>
          </div>
          <button onClick={() => worldBookInputRef.current?.click()} className="save-button">导入世界书</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={rollWorldBook} className="fetch-button">
            <Shuffle className="h-5 w-5" />
            世界书 Roll
          </button>
          <button onClick={appendRollToTheme} className="fetch-button bg-[#fff0bd]">
            <Copy className="h-5 w-5" />
            复制到主题
          </button>
          <button onClick={() => { setTheaterView('create'); void generateScene(); }} className="fetch-button bg-[#edf7ed]">
            <Sparkles className="h-5 w-5" />
            使用生成
          </button>
          <button onClick={saveRollAsTopic} className="fetch-button bg-[#f4edbd]">
            <Plus className="h-5 w-5" />
            保存为主题
          </button>
        </div>
        {rollResult && (
          <textarea value={rollResult} onChange={(event) => setRollResult(event.target.value)} className="hand-input mt-3 min-h-[130px] w-full resize-none text-sm" />
        )}
        <div className="mt-4 grid gap-2">
          {theaterWorldBookEntries.length === 0 && <Empty text="导入 SillyTavern 世界书 JSON 后，这里会显示条目开关。" />}
          {theaterWorldBookEntries.map((entry) => {
            const randomCount = getRandomBlocks(entry.content).length;
            const opened = worldBookOpenId === entry.id;
            return (
              <article key={entry.id} className={cn('rounded-2xl border-[2px] border-[#111]/15 p-3', !entry.enabled && 'opacity-50')}>
                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                  <button onClick={() => setWorldBookOpenId(opened ? null : entry.id)} className="min-w-0 text-left">
                    <p className="truncate text-sm font-black">{entry.comment}</p>
                    <p className="mt-1 truncate text-[11px] font-bold opacity-55">{entry.category || (entry.source === 'low' ? '默认 low' : '玩家导入')} · {randomCount ? `${randomCount} 组 random` : '固定条目'} · {entry.keys.slice(0, 3).join('、') || '无关键词'}</p>
                  </button>
                  <button onClick={() => updateTheaterWorldBookEntry(entry.id, { enabled: !entry.enabled })} className={cn('pill px-3 py-2 text-xs', entry.enabled && 'active')}>
                    {entry.enabled ? '开' : '关'}
                  </button>
                  <button onClick={() => updateTheaterWorldBookEntry(entry.id, { selected: !entry.selected })} className={cn('pill px-3 py-2 text-xs', entry.selected && 'active')}>
                    Roll
                  </button>
                </div>
                {opened && (
                  <div className="mt-3">
                    <div className="max-h-44 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-white/55 p-3 text-xs font-bold leading-5">{entry.content}</div>
                    <button onClick={() => deleteTheaterWorldBookEntry(entry.id)} className="save-button mt-2 bg-[#ffd6d6]">删除条目</button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </Panel>
    </>
  );

  if (theaterView === 'favorites') {
    const favoriteScenes = theaterScenes.filter((scene) => scene.favorite);
    return (
      <section className="no-scrollbar h-full overflow-y-auto pb-8">
        {renderHeader(`${favoriteScenes.length} 段收藏`)}
        {renderHiddenInputs()}
        {renderSceneList(favoriteScenes, '收藏夹还是空的。')}
      </section>
    );
  }

  if (theaterView === 'history') {
    return (
      <section className="no-scrollbar h-full overflow-y-auto pb-8">
        {renderHeader(`${theaterScenes.length} 段历史`)}
        {renderHiddenInputs()}
        {renderSceneList(theaterScenes, '还没有保存的小剧场。')}
      </section>
    );
  }

  if (theaterView === 'worldbook') {
    return (
      <section className="no-scrollbar h-full overflow-y-auto pb-8">
        {renderHeader('高级随机')}
        {renderHiddenInputs()}
        {renderWorldBookManager()}
      </section>
    );
  }

  return (
    <section className="no-scrollbar h-full overflow-y-auto pb-8">
      {renderHeader(`${theaterScenes.length} 段剧情`)}
      {renderHiddenInputs()}
      <Panel>
        <Field icon={<Sparkles />} label="主题">
          <textarea value={theme} onChange={(event) => setTheme(event.target.value)} className="hand-input min-h-[92px] w-full resize-none" placeholder="比如：雨夜误会、偷看手机后冷战、梦里重逢" />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={randomTopic} className="fetch-button bg-[#edf7ed]">
            <Shuffle className="h-5 w-5" />
            随机主题
          </button>
          <button onClick={() => setTheaterView('worldbook')} className="fetch-button bg-[#f4edbd]">
            <Settings className="h-5 w-5" />
            管理
          </button>
          <button onClick={rollWorldBook} className="fetch-button bg-[#fff0bd]">
            <Wand2 className="h-5 w-5" />
            世界输入
          </button>
        </div>
        {rollResult && (
          <Field icon={<Shuffle />} label="世界输入">
            <textarea value={rollResult} onChange={(event) => setRollResult(event.target.value)} className="hand-input min-h-[120px] w-full resize-none text-sm" />
          </Field>
        )}
        <Field icon={<Users />} label="出场角色">
          <button onClick={() => setActorsOpen((current) => !current)} className="pill w-full justify-between">
            <span className="truncate">{actorSummary}</span>
            <span className="text-xs opacity-60">{actorsOpen ? '收起' : '展开'}</span>
          </button>
          {actorsOpen && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {characters.map((character) => (
                <button key={character.id} onClick={() => toggleActor(character.id)} className={cn('pill min-w-0 justify-start', selectedIds.includes(character.id) && 'active')}>
                  <Avatar character={character} />
                  <span className="truncate">{character.name}</span>
                </button>
              ))}
            </div>
          )}
          {characters.length === 0 && <Empty text="先去通讯录导入角色。" />}
        </Field>
        <Field icon={<FileText />} label="长度">
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(theaterLengthShortLabels) as TheaterLength[]).map((item) => (
              <button key={item} onClick={() => setLength(item)} className={cn('pill w-full justify-center', length === item && 'active')}>{theaterLengthShortLabels[item]}</button>
            ))}
          </div>
          {length === 'custom' && (
            <input value={customLengthText} onChange={(event) => setCustomLengthText(event.target.value)} className="hand-input mt-2 w-full text-sm" placeholder="约 1200 字" />
          )}
          <p className="mt-2 text-xs font-black opacity-60">{activeLengthHint}</p>
        </Field>
        <button onClick={() => void generateScene()} disabled={isGenerating} className="fetch-button w-full">{isGenerating ? '生成中' : '生成完整小剧场'}</button>
        {status && <p className="mt-3 rounded-2xl bg-white/55 px-3 py-2 text-xs font-black leading-5 opacity-70">{status}</p>}
      </Panel>

      <Panel>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-black">生成结果</h2>
            <p className="mt-1 truncate text-xs font-bold opacity-60">{activeScene ? activeScene.title : '还没有生成'}</p>
          </div>
          {activeId && (
            <button onClick={() => confirmDeleteScene(activeId)} className="circle-button small" title="删除">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
        {activeScene && (
          <div className="mb-3 grid gap-2 rounded-2xl bg-white/55 p-3 text-xs font-bold leading-5 opacity-75">
            <p>角色：{activeScene.characterIds.map((id) => characters.find((character) => character.id === id)?.name).filter(Boolean).join('、') || '未指定'}</p>
            <p>主题：{activeScene.theme || '随机小剧场'}</p>
            <p>长度：{activeScene.length === 'custom' ? buildTheaterLengthInstruction('custom', activeScene.customLengthText || customLengthText) : theaterLengthHints[activeScene.length]}</p>
            <p>创建：{formatDateLabel(activeScene.createdAt)}</p>
            {activeScene.rollResult && <p className="whitespace-pre-wrap">随机结果：{activeScene.rollResult}</p>}
          </div>
        )}
        {previewContent ? (
          <div className="whitespace-pre-wrap rounded-2xl bg-white/55 p-4 text-sm font-bold leading-7">{previewContent}</div>
        ) : (
          <Empty text="写主题、选角色和长度后生成。" />
        )}
        {previewContent && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={toggleActiveFavorite} className="fetch-button bg-[#f4edbd]">{activeScene?.favorite ? '取消收藏' : '收藏'}</button>
            <button onClick={sendToChat} className="fetch-button bg-[#edf7ed]">进聊天</button>
            {activeId && <button onClick={() => confirmDeleteScene(activeId)} className="fetch-button bg-[#ffd6d6]">删除</button>}
            <button onClick={() => void generateScene()} disabled={isGenerating} className="fetch-button bg-[#fff0bd]">{isGenerating ? '生成中' : '重新生成'}</button>
          </div>
        )}
      </Panel>
    </section>
  );
}

function FeatureScreen({ screen }: { screen: Screen }) {
  if (screen === 'wechat') return <WeChatApp />;
  if (screen === 'qq') return <ChatList channel={screen} />;
  if (screen === 'phone') return <PhoneScreen />;
  if (screen === 'video') return <VideoCallScreen />;
  if (screen === 'diary') return <DiaryScreen />;
  if (screen === 'calendar') return <CalendarScreen />;
  if (screen === 'gallery') return <GalleryScreen />;
  if (screen === 'peek') return <PeekScreen />;
  if (screen === 'settings') return <SettingsScreen />;
  if (screen === 'themes') return <ThemesScreen />;
  if (screen === 'presets') return <PresetsScreen />;
  if (screen === 'logs') return <LogsScreen />;
  if (screen === 'ai-context') return <AIContextScreen />;
  if (screen === 'import' || screen === 'contacts') return <ContactsScreen />;
  if (screen === 'memo') return <MemoScreen />;
  if (screen === 'browser') return <BrowserScreen />;
  if (screen === 'bilibili') return <BilibiliScreen />;
  if (screen === 'xiaohongshu') return <XiaohongshuApp />;
  if (screen === 'music') return <MusicScreen />;
  if (screen === 'theater') return <TheaterScreen />;

  const copy: Record<string, [string, string, string[]]> = {
    gallery: ['相册 / 图床', '上传图片，给 char 看，也能换壁纸。', ['图床点击上传照片', '相册分类：自拍、截图、风景、隐藏相册', '后续接图片理解，让 char 点评生活']],
    calendar: ['日历', '纪念日、约会、事件提醒。', ['日程安排', '生日/纪念日', '触发剧情事件']],
    moments: ['朋友圈', '动态、评论、可见范围。', ['char 发动态', 'NPC 评论区', '仅你可见 / 不让你看见']],
    xiaohongshu: ['小红书', '图文笔记和生活感。', ['穿搭/探店/心情帖子', '收藏夹', '评论互动']],
    bilibili: ['B站', '视频、弹幕、评论区。', ['刷到的视频', 'char 投稿', '弹幕吐槽']],
    theater: ['小剧场', '输入主题生成角色剧情。', ['日常/暧昧/吵架/梦境', '可保存到日记', '可变成聊天事件']],
    music: ['音乐', '一起听歌和共同歌单。', ['播放页', '共同听过的歌', '歌单心情']],
    browser: ['浏览器', '搜索记录和浏览历史。', ['搜索历史', '浏览记录', '隐藏标签页']],
  };
  const [title, subtitle, bullets] = copy[screen] || ['功能', '先占位，后面继续填。', []];

  return (
    <section className="h-full overflow-y-auto pb-8">
      <Header title={title} subtitle={subtitle} />
      <Panel>
        {bullets.map((item) => (
          <Row key={item} icon={<Sparkles />} title={item} desc="保留入口和数据结构，下一步接 AI 生成逻辑。" />
        ))}
      </Panel>
    </section>
  );
}

type CalendarTab = 'month' | 'today' | 'list';
type CalendarView = 'main' | 'edit' | 'detail';
type CalendarDraft = {
  owner: CalendarEvent['owner'];
  characterId: string;
  title: string;
  note: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  repeat: NonNullable<CalendarEvent['repeat']>;
  reminder: 'none' | 'start' | '15m' | '1h' | '1d';
  tags: string;
  source: NonNullable<CalendarEvent['source']>;
  relatedDiaryIds: string[];
};

const calendarSourceLabels: Record<NonNullable<CalendarEvent['source']>, string> = {
  manual: '手动',
  wechat: '微信',
  qq: 'QQ',
  diary: '日记',
  memo: '备忘录',
  moment: '朋友圈',
  order: '订单',
};

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function formatDateInput(time: number) {
  const date = new Date(time);
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function formatTimeInput(time?: number) {
  if (!time) return '';
  const date = new Date(time);
  return `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}

function formatDateLabel(time: number) {
  const date = new Date(time);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatEventTime(event: CalendarEvent) {
  if (event.allDay) return '全天';
  const start = formatTimeInput(event.startAt);
  const end = formatTimeInput(event.endAt);
  return end ? `${start}-${end}` : start;
}

function getDayStart(time: number) {
  const date = new Date(time);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function isSameCalendarDay(left: number, right: number) {
  return getDayStart(left) === getDayStart(right);
}

function isEventOnDay(event: CalendarEvent, day: number) {
  const dayStart = getDayStart(day);
  const eventStart = getDayStart(event.startAt);
  const eventEnd = getDayStart(event.endAt || event.startAt);
  return dayStart >= eventStart && dayStart <= eventEnd;
}

function getHolidayEvents(year: number): CalendarEvent[] {
  const makeHoliday = (id: string, title: string, month: number, day: number, tags: string[] = ['节日']): CalendarEvent => ({
    id: `holiday-${year}-${id}`,
    owner: 'shared',
    title,
    note: '按当前年份内置节日显示。',
    startAt: new Date(year, month - 1, day).getTime(),
    allDay: true,
    repeat: 'yearly',
    tags,
    source: 'manual',
    favorite: false,
    createdAt: new Date(year, month - 1, day).getTime(),
    updatedAt: new Date(year, month - 1, day).getTime(),
  });
  const fixed = [
    makeHoliday('new-year', '元旦', 1, 1),
    makeHoliday('valentine', '情人节', 2, 14, ['节日', '约会']),
    makeHoliday('women', '妇女节', 3, 8),
    makeHoliday('qingming', '清明节', 4, 4),
    makeHoliday('labor', '劳动节', 5, 1),
    makeHoliday('childrens', '儿童节', 6, 1),
    makeHoliday('national', '国庆节', 10, 1),
    makeHoliday('christmas', '圣诞节', 12, 25),
  ];
  if (year === 2026) {
    return [
      ...fixed,
      makeHoliday('spring', '春节', 2, 17, ['节日', '团圆']),
      makeHoliday('lantern', '元宵节', 3, 3, ['节日']),
      makeHoliday('dragon-boat', '端午节', 6, 19, ['节日']),
      makeHoliday('qixi', '七夕', 8, 19, ['节日', '约会']),
      makeHoliday('mid-autumn', '中秋节', 9, 25, ['节日', '团圆']),
    ];
  }
  return fixed;
}

function getCalendarEventTone(event: CalendarEvent) {
  const text = `${event.title} ${event.tags.join(' ')}`;
  if (/月经|经期|生理|姨妈/.test(text)) return 'period';
  if (/约会|情人|七夕|纪念|喜欢|爱/.test(text)) return 'date';
  if (/节日|春节|元旦|清明|劳动|端午|中秋|国庆|圣诞/.test(text)) return 'holiday';
  if (/生日|礼物|惊喜/.test(text)) return 'gift';
  if (/地点|出门|旅行|见面|电影|吃饭/.test(text)) return 'place';
  return 'default';
}

function CalendarToneIcon({ event, className = 'h-5 w-5' }: { event: CalendarEvent; className?: string }) {
  const tone = getCalendarEventTone(event);
  if (tone === 'period') return <Droplets className={className} />;
  if (tone === 'date') return <Heart className={className} />;
  if (tone === 'holiday') return <Sparkles className={className} />;
  if (tone === 'gift') return <Gift className={className} />;
  if (tone === 'place') return <MapPin className={className} />;
  return <CalendarDays className={className} />;
}

function parseCalendarTime(dateValue: string, timeValue: string, allDay: boolean) {
  const [year, month, day] = dateValue.split('-').map(Number);
  if (allDay || !timeValue) return new Date(year, month - 1, day).getTime();
  const [hours, minutes] = timeValue.split(':').map(Number);
  return new Date(year, month - 1, day, hours || 0, minutes || 0).getTime();
}

function emptyCalendarDraft(date = Date.now()): CalendarDraft {
  return {
    owner: 'user',
    characterId: '',
    title: '',
    note: '',
    location: '',
    date: formatDateInput(date),
    startTime: '09:00',
    endTime: '',
    allDay: false,
    repeat: 'none',
    reminder: 'none',
    tags: '',
    source: 'manual',
    relatedDiaryIds: [],
  };
}

function draftFromCalendarEvent(event: CalendarEvent): CalendarDraft {
  let reminder: CalendarDraft['reminder'] = 'none';
  if (event.reminderAt === event.startAt) reminder = 'start';
  if (event.reminderAt === event.startAt - 15 * 60 * 1000) reminder = '15m';
  if (event.reminderAt === event.startAt - 60 * 60 * 1000) reminder = '1h';
  if (event.reminderAt === event.startAt - 24 * 60 * 60 * 1000) reminder = '1d';
  return {
    owner: event.owner,
    characterId: event.characterId || '',
    title: event.title,
    note: event.note || '',
    location: event.location || '',
    date: formatDateInput(event.startAt),
    startTime: event.allDay ? '' : formatTimeInput(event.startAt),
    endTime: event.allDay ? '' : formatTimeInput(event.endAt),
    allDay: Boolean(event.allDay),
    repeat: event.repeat || 'none',
    reminder,
    tags: event.tags.join('、'),
    source: event.source || 'manual',
    relatedDiaryIds: event.relatedDiaryIds || [],
  };
}

function calendarEventFromDraft(draft: CalendarDraft): Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> {
  const startAt = parseCalendarTime(draft.date, draft.startTime, draft.allDay);
  const endAt = draft.endTime && !draft.allDay ? parseCalendarTime(draft.date, draft.endTime, false) : undefined;
  const reminderOffsets: Record<CalendarDraft['reminder'], number | null> = {
    none: null,
    start: 0,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
  };
  const offset = reminderOffsets[draft.reminder];
  return {
    owner: draft.owner,
    characterId: draft.owner === 'user' ? undefined : draft.characterId || undefined,
    title: draft.title,
    note: draft.note,
    location: draft.location,
    startAt,
    endAt: endAt && endAt > startAt ? endAt : undefined,
    allDay: draft.allDay,
    repeat: draft.repeat,
    reminderAt: offset === null ? undefined : startAt - offset,
    tags: draft.tags.split(/[，,、\s]+/).map((tag) => tag.trim()).filter(Boolean),
    source: draft.source,
    relatedDiaryIds: draft.relatedDiaryIds,
    relatedMessageIds: [],
    favorite: false,
  };
}

function CalendarScreen() {
  const {
    characters,
    diaries,
    memos,
    calendarEvents,
    addCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    toggleCalendarEventFavorite,
  } = useAppStore();
  const [tab, setTab] = useState<CalendarTab>('month');
  const [view, setView] = useState<CalendarView>('main');
  const [visibleMonth, setVisibleMonth] = useState(() => getDayStart(Date.now()));
  const [selectedDay, setSelectedDay] = useState(() => getDayStart(Date.now()));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CalendarDraft>(() => emptyCalendarDraft());
  const [ownerFilter, setOwnerFilter] = useState<'all' | CalendarEvent['owner']>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | NonNullable<CalendarEvent['source']>>('all');
  const holidayEvents = getHolidayEvents(new Date(visibleMonth).getFullYear());
  const allCalendarEvents = [...calendarEvents, ...holidayEvents].sort((a, b) => a.startAt - b.startAt);
  const activeEvent = allCalendarEvents.find((event) => event.id === activeId);
  const selectedDayEvents = allCalendarEvents.filter((event) => isEventOnDay(event, selectedDay));
  const todayEvents = allCalendarEvents.filter((event) => isEventOnDay(event, Date.now()));
  const upcomingEvents = calendarEvents.filter((event) => event.startAt >= getDayStart(Date.now())).slice(0, 12);
  const upcomingHolidayEvents = getHolidayEvents(new Date().getFullYear())
    .filter((event) => event.startAt >= getDayStart(Date.now()))
    .slice(0, 2);
  const tagOptions = Array.from(new Set(allCalendarEvents.flatMap((event) => event.tags))).slice(0, 8);
  const filteredEvents = allCalendarEvents.filter((event) => {
    if (ownerFilter !== 'all' && event.owner !== ownerFilter) return false;
    if (sourceFilter !== 'all' && event.source !== sourceFilter) return false;
    return true;
  });
  const monthDate = new Date(visibleMonth);
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthDays = Array.from({ length: new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate() }, (_, index) =>
    new Date(monthDate.getFullYear(), monthDate.getMonth(), index + 1),
  );
  const calendarCells = [...Array(firstDay.getDay()).fill(null), ...monthDays];

  const openCreate = (date = selectedDay, preset?: Partial<CalendarDraft>) => {
    setActiveId(null);
    setDraft({ ...emptyCalendarDraft(date), ...preset });
    setView('edit');
  };
  const openEdit = (event: CalendarEvent) => {
    setActiveId(event.id);
    setDraft(draftFromCalendarEvent(event));
    setView('edit');
  };
  const saveEvent = () => {
    if (!draft.title.trim()) return;
    const payload = calendarEventFromDraft(draft);
    if (activeId) {
      updateCalendarEvent(activeId, payload);
      setView('detail');
      return;
    }
    const id = addCalendarEvent(payload);
    setActiveId(id);
    setSelectedDay(getDayStart(payload.startAt));
    setView('detail');
  };
  const convertDiary = (entry: DiaryEntry) => {
    openCreate(entry.createdAt, {
      title: `${entry.title} 相关日程`,
      note: getDiarySummary(entry),
      owner: entry.owner === 'char' ? 'char' : 'user',
      characterId: entry.characterId || '',
      source: 'diary',
      tags: entry.tags.length > 0 ? entry.tags.join('、') : '日记',
      relatedDiaryIds: [entry.id],
    });
  };
  const convertMemo = (memo: MemoEntry) => {
    openCreate(memo.reminderAt || Date.now(), {
      title: memo.title,
      note: memo.content,
      source: 'memo',
      tags: memo.tags.length > 0 ? memo.tags.join('、') : '备忘录',
    });
  };
  const recordPeriod = (date = selectedDay) => {
    const startAt = getDayStart(date);
    const id = addCalendarEvent({
      owner: 'user',
      title: '经期记录',
      note: '经期开始。默认显示 5 天，可以进详情编辑备注。',
      startAt,
      endAt: startAt + 4 * 24 * 60 * 60 * 1000,
      allDay: true,
      repeat: 'none',
      tags: ['月经', '经期', '健康'],
      source: 'manual',
      relatedDiaryIds: [],
      relatedMessageIds: [],
      favorite: false,
    });
    setActiveId(id);
    setSelectedDay(startAt);
    setView('detail');
  };
  const isReadonlyEvent = activeEvent?.id.startsWith('holiday-');

  if (view === 'edit') {
    return (
      <section className="calendar-screen h-full overflow-y-auto pb-8">
        <Header title={activeId ? '编辑日程' : '新增日程'} subtitle="标题、时间、角色和来源" onBack={() => setView(activeId ? 'detail' : 'main')} onSave={saveEvent} saveLabel={activeId ? '更新' : '添加'} />
        <Panel>
          <Field icon={<CalendarDays />} label="标题">
            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="hand-input w-full" placeholder="例如：一起去看电影" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field icon={<CalendarDays />} label="日期">
              <input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} className="hand-input w-full" />
            </Field>
            <Field icon={<Zap />} label="全天">
              <button onClick={() => setDraft({ ...draft, allDay: !draft.allDay, startTime: draft.allDay ? '09:00' : '', endTime: '' })} className={cn('pill w-full', draft.allDay && 'active')}>
                {draft.allDay ? '已开启' : '未开启'}
              </button>
            </Field>
          </div>
          {!draft.allDay && (
            <div className="grid grid-cols-2 gap-3">
              <Field icon={<CalendarDays />} label="开始">
                <input type="time" value={draft.startTime} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} className="hand-input w-full" />
              </Field>
              <Field icon={<CalendarDays />} label="结束">
                <input type="time" value={draft.endTime} onChange={(event) => setDraft({ ...draft, endTime: event.target.value })} className="hand-input w-full" />
              </Field>
            </div>
          )}
          <Field icon={<Users />} label="归属">
            <select value={draft.owner} onChange={(event) => setDraft({ ...draft, owner: event.target.value as CalendarEvent['owner'] })} className="hand-input w-full">
              <option value="user">用户</option>
              <option value="char">char</option>
              <option value="shared">共同</option>
            </select>
          </Field>
          {draft.owner !== 'user' && (
            <Field icon={<CircleUserRound />} label="关联角色">
              <select value={draft.characterId} onChange={(event) => setDraft({ ...draft, characterId: event.target.value })} className="hand-input w-full">
                <option value="">未指定</option>
                {characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
              </select>
            </Field>
          )}
          <Field icon={<Search />} label="地点">
            <input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} className="hand-input w-full" placeholder="可留空" />
          </Field>
          <Field icon={<RefreshCw />} label="重复">
            <select value={draft.repeat} onChange={(event) => setDraft({ ...draft, repeat: event.target.value as CalendarDraft['repeat'] })} className="hand-input w-full">
              <option value="none">不重复</option>
              <option value="daily">每天</option>
              <option value="weekly">每周</option>
              <option value="monthly">每月</option>
              <option value="yearly">每年</option>
            </select>
          </Field>
          <Field icon={<Zap />} label="提醒">
            <select value={draft.reminder} onChange={(event) => setDraft({ ...draft, reminder: event.target.value as CalendarDraft['reminder'] })} className="hand-input w-full">
              <option value="none">不提醒</option>
              <option value="start">开始时</option>
              <option value="15m">提前 15 分钟</option>
              <option value="1h">提前 1 小时</option>
              <option value="1d">提前 1 天</option>
            </select>
          </Field>
          <Field icon={<Tag />} label="标签">
            <input value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} className="hand-input w-full" placeholder="约会、纪念日、工作" />
          </Field>
          <Field icon={<FileText />} label="备注">
            <textarea value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} className="hand-input min-h-[112px] w-full resize-none" placeholder="写一点细节" />
          </Field>
        </Panel>
      </section>
    );
  }

  if (view === 'detail' && activeEvent) {
    const character = characters.find((item) => item.id === activeEvent.characterId);
    const relatedDiaries = diaries.filter((entry) => activeEvent.relatedDiaryIds?.includes(entry.id));
    return (
      <section className="calendar-screen h-full overflow-y-auto pb-8">
        <Header title="日程详情" subtitle={formatDateLabel(activeEvent.startAt)} onBack={() => setView('main')} />
        <Panel>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-2xl font-black leading-tight">{activeEvent.title}</p>
              <p className="mt-2 text-sm font-black opacity-60">{formatEventTime(activeEvent)} · {calendarSourceLabels[activeEvent.source || 'manual']}</p>
            </div>
            {!isReadonlyEvent && (
              <button onClick={() => toggleCalendarEventFavorite(activeEvent.id)} className={cn('circle-button small shrink-0', activeEvent.favorite && 'bg-[#fff0b8]')}>
                <Star className={cn('h-5 w-5', activeEvent.favorite && 'fill-[#111]')} />
              </button>
            )}
          </div>
          <div className="mt-4 grid gap-3 text-sm font-bold">
            <p>归属：{activeEvent.owner === 'user' ? '用户' : activeEvent.owner === 'char' ? 'char' : '共同'}{character ? ` · ${character.name}` : ''}</p>
            {activeEvent.location && <p>地点：{activeEvent.location}</p>}
            {activeEvent.repeat && activeEvent.repeat !== 'none' && <p>重复：{activeEvent.repeat}</p>}
            {activeEvent.reminderAt && <p>提醒：{formatDateLabel(activeEvent.reminderAt)} {formatTimeInput(activeEvent.reminderAt)}</p>}
            {activeEvent.tags.length > 0 && <p>标签：{activeEvent.tags.join('、')}</p>}
          </div>
          {activeEvent.note && <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-white/70 p-4 text-sm font-bold leading-7">{activeEvent.note}</p>}
          {relatedDiaries.length > 0 && (
            <div className="mt-4 border-t-[2px] border-[#111]/15 pt-3">
              <p className="text-sm font-black opacity-60">关联日记</p>
              {relatedDiaries.map((entry) => <p key={entry.id} className="mt-2 text-sm font-bold">{entry.title}：{getDiarySummary(entry)}</p>)}
            </div>
          )}
          {!isReadonlyEvent && (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button onClick={() => openEdit(activeEvent)} className="fetch-button">编辑</button>
              <button onClick={() => { deleteCalendarEvent(activeEvent.id); setActiveId(null); setView('main'); }} className="fetch-button bg-[#ffd6d6]">
                删除
              </button>
            </div>
          )}
        </Panel>
      </section>
    );
  }

  return (
    <section className="calendar-screen h-full overflow-y-auto pb-8">
      <Header
        title="日历"
        subtitle="生活时间线和 char 日程"
        onSave={() => openCreate(selectedDay)}
        saveLabel="新增"
        tabs={
          <>
            <Pill active={tab === 'month'} icon={<CalendarDays />} label="月视图" onClick={() => setTab('month')} />
            <Pill active={tab === 'today'} icon={<Zap />} label="今天" onClick={() => setTab('today')} />
            <Pill active={tab === 'list'} icon={<FileText />} label="日程" onClick={() => setTab('list')} />
          </>
        }
      />

      {tab === 'month' && (
        <>
          <Panel>
            <div className="mb-4 flex items-center justify-between">
              <button onClick={() => setVisibleMonth(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1).getTime())} className="circle-button small">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <p className="text-xl font-black">{monthDate.getFullYear()}年 {monthDate.getMonth() + 1}月</p>
              <button onClick={() => setVisibleMonth(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1).getTime())} className="circle-button small">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-black opacity-60">
              {['日', '一', '二', '三', '四', '五', '六'].map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {calendarCells.map((date, index) => {
                if (!date) return <span key={`empty-${index}`} className="aspect-square" />;
                const time = date.getTime();
                const events = allCalendarEvents.filter((event) => isEventOnDay(event, time));
                return (
                  <button key={time} onClick={() => setSelectedDay(getDayStart(time))} className={cn('calendar-day-cell flex aspect-square flex-col items-center justify-center rounded-2xl border-[2px] border-[#111]/10 bg-white/60 text-sm font-black', isSameCalendarDay(time, selectedDay) && 'border-[#111] bg-[#d9e8f6]', isSameCalendarDay(time, Date.now()) && 'bg-[#fff0b8]', events.some((event) => getCalendarEventTone(event) === 'period') && 'calendar-day-period', events.some((event) => getCalendarEventTone(event) === 'date') && 'calendar-day-date')}>
                    {date.getDate()}
                    {events.length > 0 && (
                      <span className="mt-1 flex gap-0.5">
                        {events.slice(0, 3).map((event) => (
                          <span key={event.id} className={cn('h-1.5 w-1.5 rounded-full bg-[#111]', getCalendarEventTone(event) === 'period' && 'bg-[#e65d8f]', getCalendarEventTone(event) === 'date' && 'bg-[#ff6b9a]', getCalendarEventTone(event) === 'holiday' && 'bg-[#e4b13c]')} />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Panel>
          <Panel>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-lg font-black">{formatDateLabel(selectedDay)}</p>
              <div className="flex gap-2">
                <button onClick={() => recordPeriod(selectedDay)} className="pill"><Droplets className="h-4 w-4" />经期</button>
                <button onClick={() => openCreate(selectedDay)} className="pill active"><Plus className="h-4 w-4" />添加</button>
              </div>
            </div>
            {selectedDayEvents.length > 0 ? selectedDayEvents.map((event) => (
              <CalendarEventRow key={event.id} event={event} characters={characters} onClick={() => { setActiveId(event.id); setView('detail'); }} />
            )) : <Empty text="这一天还没有日程。" />}
          </Panel>
        </>
      )}

      {tab === 'today' && (
        <>
          <Panel>
            <p className="text-2xl font-black">今天</p>
            <p className="mt-1 text-sm font-bold opacity-60">{formatDateLabel(Date.now())} · {todayEvents.length} 个日程</p>
            <div className="mt-4">
              {todayEvents.length > 0 ? todayEvents.map((event) => (
                <CalendarEventRow key={event.id} event={event} characters={characters} onClick={() => { setActiveId(event.id); setView('detail'); }} />
              )) : <Empty text="今天没有安排，可以临时加一条。" />}
            </div>
          </Panel>
          <Panel>
            <p className="text-lg font-black">接下来</p>
            {upcomingEvents.length > 0 ? upcomingEvents.map((event) => (
              <CalendarEventRow key={event.id} event={event} characters={characters} onClick={() => { setActiveId(event.id); setView('detail'); }} />
            )) : <Empty text="还没有未来日程。" />}
          </Panel>
          <Panel>
            <p className="text-lg font-black">最近节日</p>
            {upcomingHolidayEvents.length > 0 ? upcomingHolidayEvents.map((event) => (
              <CalendarEventRow key={event.id} event={event} characters={characters} showDate onClick={() => { setActiveId(event.id); setView('detail'); }} />
            )) : <Empty text="今年后面没有内置节日。" />}
          </Panel>
        </>
      )}

      {tab === 'list' && (
        <>
          <Panel>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <Pill active={ownerFilter === 'all'} icon={<Users />} label="全部" onClick={() => setOwnerFilter('all')} />
              <Pill active={ownerFilter === 'user'} icon={<CircleUserRound />} label="用户" onClick={() => setOwnerFilter('user')} />
              <Pill active={ownerFilter === 'char'} icon={<LockKeyhole />} label="char" onClick={() => setOwnerFilter('char')} />
              <Pill active={ownerFilter === 'shared'} icon={<MessageCircle />} label="共同" onClick={() => setOwnerFilter('shared')} />
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              <Pill active={sourceFilter === 'all'} icon={<Sparkles />} label="来源" onClick={() => setSourceFilter('all')} />
              {Object.entries(calendarSourceLabels).map(([source, label]) => (
                <Pill key={source} active={sourceFilter === source} icon={<Tag />} label={label} onClick={() => setSourceFilter(source as NonNullable<CalendarEvent['source']>)} />
              ))}
            </div>
          </Panel>
          <Panel>
            {filteredEvents.length > 0 ? filteredEvents.map((event) => (
              <CalendarEventRow key={event.id} event={event} characters={characters} showDate onClick={() => { setActiveId(event.id); setView('detail'); }} />
            )) : <Empty text="筛选下没有日程。" />}
          </Panel>
          <Panel>
            <p className="text-lg font-black">从日记/备忘录转入</p>
            {diaries.slice(0, 3).map((entry) => (
              <button key={entry.id} onClick={() => convertDiary(entry)} className="w-full border-b-[2px] border-[#111]/15 py-3 text-left last:border-b-0">
                <p className="text-sm font-black">{entry.title}</p>
                <p className="line-clamp-1 text-xs font-bold opacity-60">{getDiarySummary(entry)}</p>
              </button>
            ))}
            {memos.slice(0, 3).map((memo) => (
              <button key={memo.id} onClick={() => convertMemo(memo)} className="w-full border-b-[2px] border-[#111]/15 py-3 text-left last:border-b-0">
                <p className="text-sm font-black">{memo.title}</p>
                <p className="line-clamp-1 text-xs font-bold opacity-60">{memo.content || '转为备忘录来源日程'}</p>
              </button>
            ))}
            {diaries.length === 0 && memos.length === 0 && <Empty text="暂无可转入内容。" />}
          </Panel>
          {tagOptions.length > 0 && (
            <Panel>
              <p className="text-lg font-black">常用标签</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {tagOptions.map((tag) => <span key={tag} className="rounded-full border-[2px] border-[#111] bg-white px-3 py-1 text-xs font-black">{tag}</span>)}
              </div>
            </Panel>
          )}
        </>
      )}
    </section>
  );
}

function CalendarEventRow({ event, characters, showDate, onClick }: { key?: React.Key; event: CalendarEvent; characters: Character[]; showDate?: boolean; onClick: () => void }) {
  const character = characters.find((item) => item.id === event.characterId);
  const tone = getCalendarEventTone(event);
  return (
    <button onClick={onClick} className="flex w-full gap-3 border-b-[2px] border-[#111]/15 py-3 text-left last:border-b-0">
      <div className={cn('app-chip', event.favorite && 'bg-[#fff0b8]', tone === 'period' && 'bg-[#ffe1ec]', tone === 'date' && 'bg-[#ffd6e4]', tone === 'holiday' && 'bg-[#fff0b8]', tone === 'gift' && 'bg-[#e9c4d5]', tone === 'place' && 'bg-[#dceecd]')}>
        <CalendarToneIcon event={event} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-base font-black">{event.title}</p>
          <span className="shrink-0 text-xs font-black opacity-60">{formatEventTime(event)}</span>
        </div>
        <p className="line-clamp-1 text-xs font-bold opacity-60">
          {showDate ? `${formatDateLabel(event.startAt)} · ` : ''}{calendarSourceLabels[event.source || 'manual']} · {event.owner === 'user' ? '用户' : event.owner === 'char' ? 'char' : '共同'}{character ? ` · ${character.name}` : ''}
        </p>
        {event.tags.length > 0 && <p className="mt-1 line-clamp-1 text-xs font-black opacity-50">{event.tags.join('、')}</p>}
      </div>
    </button>
  );
}

type GalleryTab = 'all' | 'favorites' | 'hidden' | 'wechat';
type GalleryView = 'grid' | 'detail';
const galleryAlbums: GalleryPhoto['album'][] = ['生活', '自拍', '截图', '风景', '隐藏', '聊天'];

function GalleryScreen() {
  const {
    galleryPhotos,
    galleryTags,
    imageBed,
    wechatPhotos,
    addGalleryPhoto,
    updateGalleryPhoto,
    addGalleryPhotoReview,
    deleteGalleryPhoto,
    toggleGalleryPhotoFavorite,
    addGalleryTag,
    deleteGalleryTag,
    characters,
  } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<GalleryTab>('all');
  const [albumFilter, setAlbumFilter] = useState<'全部' | GalleryPhoto['album']>('全部');
  const [view, setView] = useState<GalleryView>('grid');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reviewDraft, setReviewDraft] = useState('');
  const [newTag, setNewTag] = useState('');
  const activePhoto = galleryPhotos.find((photo) => photo.id === activeId);
  const visiblePhotos = galleryPhotos
    .filter((photo) => {
      if (tab === 'favorites' && !photo.favorite) return false;
      if (tab === 'hidden' && !photo.hidden && photo.album !== '隐藏') return false;
      if (tab === 'wechat' && photo.source !== 'wechat') return false;
      if (tab === 'all' && photo.hidden) return false;
      if (albumFilter !== '全部' && photo.album !== albumFilter) return false;
      return true;
    })
    .sort((a, b) => b.createdAt - a.createdAt);
  const groupedPhotos = visiblePhotos.reduce<Array<{ day: string; photos: GalleryPhoto[] }>>((groups, photo) => {
    const day = formatDateLabel(photo.createdAt);
    const latest = groups.at(-1);
    if (latest?.day === day) latest.photos.push(photo);
    else groups.push({ day, photos: [photo] });
    return groups;
  }, []);

  const addPhotoUrl = (url: string, source: NonNullable<GalleryPhoto['source']>, title = '新照片', createdAt = Date.now()) => {
    const id = addGalleryPhoto({
      url,
      title,
      album: source === 'wechat' ? '聊天' : '生活',
      description: '',
      note: '',
      tags: source === 'wechat' ? ['微信'] : [],
      characterId: '',
      readableByChar: true,
      reviews: [],
      source,
      favorite: false,
      hidden: false,
      createdAt,
      updatedAt: Date.now(),
    });
    setActiveId(id);
    setView('detail');
  };
  const uploadPhotos = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(event.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => addPhotoUrl(reader.result as string, 'upload', file.name.replace(/\.[^.]+$/, '') || '新照片', file.lastModified || Date.now());
      reader.readAsDataURL(file);
    });
    event.target.value = '';
  };
  const importWechatPhoto = (url: string) => {
    const exists = galleryPhotos.some((photo) => photo.url === url);
    if (!exists) addPhotoUrl(url, 'wechat', '微信照片');
  };
  const generatePhotoReview = () => {
    if (!activePhoto) return;
    const character = characters.find((item) => item.id === activePhoto.characterId) || characters[0];
    const subject = activePhoto.description || activePhoto.note || activePhoto.tags.join('、') || activePhoto.title;
    const content = reviewDraft.trim()
      || (character
        ? `${character.name}看了这张照片：${subject}。`
        : `这张照片的线索是：${subject}。`);
    addGalleryPhotoReview(activePhoto.id, {
      characterId: character?.id,
      content,
    });
    setReviewDraft('');
  };
  const togglePhotoTag = (tag: string) => {
    if (!activePhoto) return;
    const exists = activePhoto.tags.includes(tag);
    updateGalleryPhoto(activePhoto.id, {
      tags: exists ? activePhoto.tags.filter((item) => item !== tag) : [...activePhoto.tags, tag],
    });
  };
  const createGalleryTag = () => {
    const tag = newTag.trim();
    if (!tag) return;
    addGalleryTag(tag);
    if (activePhoto && !activePhoto.tags.includes(tag)) {
      updateGalleryPhoto(activePhoto.id, { tags: [...activePhoto.tags, tag] });
    }
    setNewTag('');
  };

  if (view === 'detail' && activePhoto) {
    return (
      <section className="gallery-screen h-full overflow-y-auto pb-8">
        <Header title="照片" subtitle={formatDateLabel(activePhoto.createdAt)} onBack={() => setView('grid')} />
        <Panel className="overflow-hidden p-0">
          <img src={activePhoto.url} alt={activePhoto.title} className="max-h-[430px] w-full object-cover" />
        </Panel>
        <Panel>
          <Field icon={<ImageIcon />} label="标题">
            <input value={activePhoto.title} onChange={(event) => updateGalleryPhoto(activePhoto.id, { title: event.target.value })} className="hand-input w-full" />
          </Field>
          <Field icon={<Grid2X2 />} label="相簿">
            <select value={activePhoto.album} onChange={(event) => updateGalleryPhoto(activePhoto.id, { album: event.target.value as GalleryPhoto['album'], hidden: event.target.value === '隐藏' })} className="hand-input w-full">
              {galleryAlbums.map((album) => <option key={album} value={album}>{album}</option>)}
            </select>
          </Field>
          <div className="mb-5">
            <span className="mb-2 flex items-center gap-2 text-lg font-black">
              <Tag className="h-5 w-5" />
              标签
            </span>
            <div className="flex flex-wrap gap-2">
              {galleryTags.map((tag) => (
                <button key={tag} onClick={() => togglePhotoTag(tag)} className={cn('pill', activePhoto.tags.includes(tag) && 'active')}>
                  {tag}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input value={newTag} onChange={(event) => setNewTag(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && createGalleryTag()} className="hand-input min-w-0 flex-1" placeholder="新标签" />
              <button onClick={createGalleryTag} className="pill active">
                <Plus className="h-4 w-4" />
                创建
              </button>
            </div>
          </div>
          <Field icon={<CircleUserRound />} label="给谁看">
            <select value={activePhoto.characterId || ''} onChange={(event) => updateGalleryPhoto(activePhoto.id, { characterId: event.target.value })} className="hand-input w-full">
              <option value="">所有 char</option>
              {characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
            </select>
          </Field>
          <Field icon={<FileText />} label="备注">
            <textarea value={activePhoto.description || ''} onChange={(event) => updateGalleryPhoto(activePhoto.id, { description: event.target.value })} className="hand-input min-h-[72px] w-full resize-none" placeholder="可选，补一句照片说明" />
          </Field>
          <Field icon={<MessageCircle />} label="评价提示">
            <textarea value={reviewDraft} onChange={(event) => setReviewDraft(event.target.value)} className="hand-input min-h-[76px] w-full resize-none" placeholder="可选：想让 char 从什么角度评价" />
          </Field>
          <button onClick={generatePhotoReview} className="fetch-button mb-4">
            <MessageCircle className="h-5 w-5" />
            让 char 评价这张照片
          </button>
          {(activePhoto.reviews || []).length > 0 && (
            <div className="mb-4 rounded-2xl bg-white/70 p-3">
              <p className="text-sm font-black opacity-60">char 评价</p>
              {(activePhoto.reviews || []).map((review) => {
                const character = characters.find((item) => item.id === review.characterId);
                return (
                  <p key={`${review.createdAt}-${review.content}`} className="mt-2 text-sm font-bold leading-6">
                    {character ? `${character.name}：` : ''}{review.content}
                  </p>
                );
              })}
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => toggleGalleryPhotoFavorite(activePhoto.id)} className={cn('fetch-button', activePhoto.favorite && 'bg-[#fff0b8]')}>
              <Star className={cn('h-5 w-5', activePhoto.favorite && 'fill-[#111]')} />
            </button>
            <button onClick={() => updateGalleryPhoto(activePhoto.id, { readableByChar: !activePhoto.readableByChar })} className={cn('fetch-button', activePhoto.readableByChar && 'bg-[#dceecd]')}>
              <CircleUserRound className="h-5 w-5" />
            </button>
            <button onClick={() => updateGalleryPhoto(activePhoto.id, { hidden: !activePhoto.hidden, album: activePhoto.hidden ? '生活' : '隐藏' })} className="fetch-button">
              <LockKeyhole className="h-5 w-5" />
            </button>
          </div>
          <button onClick={() => { deleteGalleryPhoto(activePhoto.id); setActiveId(null); setView('grid'); }} className="fetch-button mt-3 bg-[#ffd6d6]">
              <Trash2 className="h-5 w-5" />
            </button>
        </Panel>
      </section>
    );
  }

  return (
    <section className="gallery-screen h-full overflow-y-auto pb-8">
      <Header
        title="相册"
        subtitle="按日期整理照片，点选标签"
        onSave={() => inputRef.current?.click()}
        saveLabel="上传"
        tabs={
          <>
            <Pill active={tab === 'all'} icon={<ImageIcon />} label="全部" onClick={() => setTab('all')} />
            <Pill active={tab === 'favorites'} icon={<Star />} label="收藏" onClick={() => setTab('favorites')} />
            <Pill active={tab === 'hidden'} icon={<LockKeyhole />} label="隐藏" onClick={() => setTab('hidden')} />
            <Pill active={tab === 'wechat'} icon={<MessageCircle />} label="微信" onClick={() => setTab('wechat')} />
          </>
        }
      />
      <input ref={inputRef} type="file" accept="image/*" multiple onChange={uploadPhotos} className="hidden" />
      <Panel>
        <button onClick={() => inputRef.current?.click()} className="fetch-button">
          <ImagePlus className="h-5 w-5" />
          上传照片
        </button>
        <p className="mt-3 text-sm font-bold leading-6 opacity-65">照片会自动记录日期。上传后点进照片，像现实相册一样点选标签，也可以创建新标签。</p>
      </Panel>
      <Panel>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Pill active={albumFilter === '全部'} icon={<Grid2X2 />} label="全部相簿" onClick={() => setAlbumFilter('全部')} />
          {galleryAlbums.map((album) => (
            <Pill key={album} active={albumFilter === album} icon={album === '隐藏' ? <LockKeyhole /> : <ImageIcon />} label={album} onClick={() => setAlbumFilter(album)} />
          ))}
        </div>
      </Panel>
      <Panel className="p-4">
        {visiblePhotos.length > 0 ? (
          <div className="grid gap-4">
            {groupedPhotos.map((group) => (
              <div key={group.day}>
                <p className="mb-2 text-sm font-black opacity-60">{group.day}</p>
                <div className="grid grid-cols-3 gap-2">
                  {group.photos.map((photo) => (
                    <button key={photo.id} onClick={() => { setActiveId(photo.id); setView('detail'); }} className="relative aspect-square overflow-hidden rounded-[18px] border-[3px] border-[#111] bg-white">
                      <img src={photo.url} alt={photo.title} className="h-full w-full object-cover" />
                      {photo.favorite && <Star className="absolute right-1 top-1 h-4 w-4 fill-[#fff0b8] text-[#111]" />}
                      {photo.hidden && <LockKeyhole className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-white p-0.5 text-[#111]" />}
                      {photo.readableByChar && <MessageCircle className="absolute bottom-1 left-1 h-4 w-4 rounded-full bg-white p-0.5 text-[#111]" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="这里还没有照片。" />
        )}
      </Panel>
      {(imageBed || wechatPhotos.length > 0) && (
        <Panel>
          <p className="text-lg font-black">可导入</p>
          {imageBed && (
            <button onClick={() => addPhotoUrl(imageBed, 'image-bed', '图床照片')} className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-white/70 p-3 text-left">
              <img src={imageBed} alt="图床照片" className="h-14 w-14 rounded-2xl object-cover" />
              <span className="text-sm font-black">导入图床照片，继续点选标签</span>
            </button>
          )}
          {wechatPhotos.slice(0, 6).map((url) => (
            <button key={url} onClick={() => importWechatPhoto(url)} className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-white/70 p-3 text-left">
              <img src={url} alt="微信照片" className="h-14 w-14 rounded-2xl object-cover" />
              <span className="text-sm font-black">导入微信照片墙，继续点选标签</span>
            </button>
          ))}
        </Panel>
      )}
    </section>
  );
}

type WeChatTab = 'chats' | 'contacts' | 'discover' | 'me';

function WeChatApp() {
  const [tab, setTab] = useState<WeChatTab>('chats');
  const chatSessions = useAppStore((state) => state.chatSessions);
  const wechatPhotos = useAppStore((state) => state.wechatPhotos);
  const unreadCount = Object.values(chatSessions)
    .filter((session) => session.channel === 'wechat')
    .reduce((count, session) => count + (session.unread || 0), 0);

  return (
    <section className="wechat-shell flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'chats' && <WeChatChats onAddFriend={() => setTab('contacts')} />}
        {tab === 'contacts' && <WeChatContacts />}
        {tab === 'discover' && <WeChatDiscover />}
        {tab === 'me' && <WeChatMe />}
      </div>
      <nav className="wechat-tabs">
        <WeChatTabButton active={tab === 'chats'} icon={<MessageCircle />} label="微信" badge={unreadCount || undefined} onClick={() => setTab('chats')} />
        <WeChatTabButton active={tab === 'contacts'} icon={<Users />} label="通讯录" onClick={() => setTab('contacts')} />
        <WeChatTabButton active={tab === 'discover'} icon={<Compass />} label="发现" badge={wechatPhotos.length > 0 ? 'dot' : undefined} onClick={() => setTab('discover')} />
        <WeChatTabButton active={tab === 'me'} icon={<CircleUserRound />} label="我" onClick={() => setTab('me')} />
      </nav>
    </section>
  );
}

function WeChatTabButton({
  active,
  icon,
  label,
  badge,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  badge?: number | 'dot';
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={cn('wechat-tab-button', active && 'active')}>
      <span className="wechat-tab-icon">
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'h-6 w-6' })}
        {badge !== undefined && <span className={cn('wechat-tab-badge', badge === 'dot' && 'dot')}>{badge === 'dot' ? '' : badge}</span>}
      </span>
      <span>{label}</span>
    </button>
  );
}

function ChatList({ channel }: { channel: 'wechat' | 'qq' }) {
  const { characters, chatSessions, openChat, setScreen } = useAppStore();
  const title = channel === 'wechat' ? '微信' : 'QQ';
  const sessions = Object.values(chatSessions).filter((session) => session.channel === channel);

  return (
    <section className="h-full overflow-y-auto pb-8">
      <Header title={title} subtitle={channel === 'wechat' ? '聊天、群聊、朋友圈、语音条、TTS' : '单聊、群聊、空间、戳一戳、语音'} />
      <Panel>
        <button onClick={() => setScreen('contacts')} className="fetch-button mb-4">
          <UserPlus className="h-5 w-5" />
          去通讯录导入酒馆卡
        </button>
        {characters.length === 0 && <Empty text="还没有角色。先导入 PNG/JSON 酒馆卡。" />}
        {characters.map((character) => {
          const session = sessions.find((item) => item.characterId === character.id);
          const lastMessage = session?.messages.at(-1);
          return (
            <button key={character.id} onClick={() => openChat(character.id, channel)} className="list-row">
              <Avatar character={character} />
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-lg font-black">{character.name}</p>
                <p className="truncate text-sm opacity-65">{lastMessage ? describeChatMessage(lastMessage) : character.firstMessage || '点开建立聊天会话'}</p>
              </div>
            </button>
          );
        })}
      </Panel>
    </section>
  );
}

type PendingChatDraft = {
  content: string;
  replyTo?: string;
  kind: 'text' | 'voice' | 'image' | 'sticker';
};

function ChatScreen() {
  const {
    activeChatId,
    activeChannel,
    characters,
    groupChats,
    chatSessions,
    addMessage,
    deleteMessage,
    toggleMessageFavorite,
    recallMessage,
    addPurchaseRecord,
    goBack,
    stickers,
    ttsEnabled,
    apiBaseUrl,
    apiKey,
    selectedModel,
    chatPresetPrompt,
    chatContextDepth,
    chatTemperature,
    chatMaxTokens,
    chatReplyStyle,
  } = useAppStore();
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [showPlusPanel, setShowPlusPanel] = useState(false);
  const [replyDraft, setReplyDraft] = useState<string | null>(null);
  const [lifeComposer, setLifeComposer] = useState<'transfer' | 'red-packet' | 'shopping' | null>(null);
  const [lifeDraft, setLifeDraft] = useState({ amount: '', note: '', itemName: '' });
  const [pendingUserDrafts, setPendingUserDrafts] = useState<PendingChatDraft[]>([]);
  const [failedDraft, setFailedDraft] = useState<{ drafts: PendingChatDraft[]; mode: 'text' | 'voice'; error?: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [activeToolMessageId, setActiveToolMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const directCharacter = characters.find((item) => item.id === activeChatId);
  const activeGroup = groupChats.find((item) => item.id === activeChatId);
  const groupMembers = activeGroup
    ? activeGroup.memberIds
        .map((id) => characters.find((item) => item.id === id))
        .filter((item): item is Character => Boolean(item))
    : [];
  const character = directCharacter || (activeGroup
    ? {
        id: activeGroup.id,
        name: activeGroup.name,
        avatar: '',
        description: `微信群聊，成员：${activeGroup.memberIds.map((id) => characters.find((item) => item.id === id)?.name).filter(Boolean).join('、')}`,
        personality: '群聊会自然地出现不同成员的短回复。',
        firstMessage: `${activeGroup.name} 已创建，可以开始聊天。`,
        systemPrompt: [
          `你正在模拟微信群聊「${activeGroup.name}」。`,
          '你要同时扮演群里的多个成员，不要只扮演一个人。',
          '每条回复用「成员名：消息内容」格式，像微信群里不同人轮流说话。',
          activeGroup.memberIds
            .map((id) => characters.find((item) => item.id === id))
            .filter((item): item is Character => Boolean(item))
            .map((item) => getCharacterPrompt(item))
            .join('\n\n---\n\n'),
        ].filter(Boolean).join('\n\n'),
      } satisfies Character
    : undefined);
  const session = activeChatId ? chatSessions[`${activeChannel}:${activeChatId}`] : undefined;
  const messages = session?.messages || [];
  const isWechat = activeChannel === 'wechat';
  const chatSubtitle = activeGroup ? `${groupMembers.length}个成员` : activeChannel === 'qq' ? 'QQ聊天' : '';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, activeChatId]);

  if (!character || !activeChatId) return <EmptyScreen title="没有选中角色" />;

  const formatDrafts = (drafts: PendingChatDraft[]) =>
    drafts.map((draft, index) => {
      const prefix = drafts.length > 1 ? `第${index + 1}条：` : '';
      return `${prefix}${draft.replyTo ? `引用「${draft.replyTo}」回复：` : ''}${draft.content}`;
    }).join('\n');

  const pickStickerForMood = (mood?: string) => {
    if (stickers.length === 0) return undefined;
    const keyword = (mood || '').toLowerCase();
    return stickers.find((sticker) => sticker.label.toLowerCase().includes(keyword)) || stickers[0];
  };

  const buildLifeMessage = (part: WeChatAiParsedPart, speaker?: Character): ChatMessage => {
    const base = {
      id: createId('msg'),
      role: 'model' as const,
      timestamp: Date.now(),
      speakerId: activeGroup && speaker ? speaker.id : undefined,
    };
    if (part.kind === 'sticker') {
      const sticker = pickStickerForMood(part.mood || part.label);
      if (!sticker) {
        return {
          ...base,
          content: part.label || part.mood || '发你一个表情。',
          kind: 'text',
        };
      }
      return {
        ...base,
        content: sticker.url,
        kind: 'sticker',
        stickerLabel: sticker.label,
      };
    }
    if (part.kind === 'transfer') {
      return {
        ...base,
        content: part.note || '转账',
        kind: 'transfer',
        amount: part.amount,
        note: part.note,
        status: 'pending',
      };
    }
    if (part.kind === 'red-packet') {
      return {
        ...base,
        content: part.note || '恭喜发财，大吉大利',
        kind: 'red-packet',
        amount: part.amount,
        note: part.note || '恭喜发财，大吉大利',
        status: 'pending',
      };
    }
    if (part.kind === 'shopping') {
      return {
        ...base,
        content: part.note || part.itemName,
        kind: 'shopping',
        itemName: part.itemName,
        amount: part.amount,
        note: part.note,
      };
    }
    return {
      ...base,
      content: part.content,
      kind: 'text',
    };
  };

  const addAssistantReply = async (drafts: PendingChatDraft[], responseMode: 'text' | 'voice') => {
    const content = formatDrafts(drafts);
    setIsTyping(true);
    const styleInstruction =
      chatReplyStyle === 'single'
        ? '这次尽量只回复一条微信气泡。'
        : chatReplyStyle === 'burst'
          ? '这次允许像真人一样连发两到四条短微信气泡；每条气泡单独一行。'
          : '这次根据角色性格决定一条还是多条；如果拆成多条，每条气泡单独一行。';

    const spokenReplies: string[] = [];
    const requestOneReply = async (speaker: Character, memberInstruction = '') => {
      const reply = apiBaseUrl && selectedModel
        ? await requestChatCompletion({
          baseUrl: apiBaseUrl,
          apiKey,
          model: selectedModel,
          temperature: chatTemperature,
          maxTokens: chatMaxTokens,
          messages: [
            {
              role: 'system',
              content: buildWeChatSystemPrompt({
                characterPrompt: getCharacterPrompt(character),
                characterName: character.name,
                memberInstruction,
                chatPresetPrompt,
                styleInstruction,
              }),
            },
            ...messages.slice(-Math.max(4, chatContextDepth)).filter((message) => !message.recalled).map((message) => ({
              role: message.role === 'model' ? 'assistant' as const : 'user' as const,
              content: describeChatMessage(message, true, characters),
            })),
            { role: 'user', content },
          ],
        })
        : fallbackWeChatReply(content, responseMode, chatReplyStyle, speaker, memberInstruction);
      return parseWeChatReplyParts(reply, chatReplyStyle, speaker.name);
    };

    const speakers = activeGroup && groupMembers.length > 0 ? groupMembers : [character];
    for (let speakerIndex = 0; speakerIndex < speakers.length; speakerIndex += 1) {
      const speaker = speakers[speakerIndex];
      const memberInstruction = activeGroup
        ? [
            `现在只允许你扮演群成员「${speaker.name}」。`,
            getCharacterPrompt(speaker),
            `你是群聊「${activeGroup.name}」中的一个成员。轮到你发言，按你自己的人设回应用户刚才的消息。`,
          ].join('\n')
        : '';
      const parts = await requestOneReply(speaker, memberInstruction);
      for (let index = 0; index < parts.length; index += 1) {
        const part = parts[index];
        const speakable = part.kind === 'text' ? part.content : part.kind === 'sticker' ? '表情包' : describeChatMessage(buildLifeMessage(part, speaker));
        await delay(Math.min(1400, Math.max(420, speakable.length * 55)));
        const message = buildLifeMessage(part, speaker);
        if (part.kind === 'text' && responseMode === 'voice') {
          message.kind = 'voice';
          message.duration = Math.max(2, Math.ceil(message.content.length / 4));
          message.transcript = message.content;
        }
        message.timestamp = Date.now() + index + speakerIndex;
        addMessage(activeChatId, activeChannel, message);
        if (message.kind === 'shopping') {
          addPurchaseRecord({
            characterId: speaker.id,
            itemName: message.itemName || message.content,
            amount: message.amount || '',
            note: message.note || '微信聊天里提到的购物',
          });
        }
        if (message.kind === 'text' || message.kind === 'voice') spokenReplies.push(message.content);
      }
    }
    setIsTyping(false);
    if (ttsEnabled && responseMode === 'voice' && !activeGroup) speak(spokenReplies.join('\n'));
  };

  const send = async () => {
    const content = input.trim();
    if (sending) return;
    if (!content) {
      if (pendingUserDrafts.length === 0) return;
      const responseMode = pendingUserDrafts.some((draft) => draft.kind === 'voice') ? 'voice' : 'text';
      setSending(true);
      try {
        await addAssistantReply(pendingUserDrafts, responseMode);
        setPendingUserDrafts([]);
        setFailedDraft(null);
      } catch (error) {
        setFailedDraft({ drafts: pendingUserDrafts, mode: responseMode, error: error instanceof Error ? error.message : undefined });
      } finally {
        setIsTyping(false);
        setSending(false);
      }
      return;
    }
    const kind = mode === 'voice' ? 'voice' : 'text';
    const replyTo = replyDraft || undefined;
    addMessage(activeChatId, activeChannel, {
      id: createId('msg'),
      role: 'user',
      content,
      timestamp: Date.now(),
      kind,
      duration: Math.max(2, Math.ceil(content.length / 4)),
      transcript: kind === 'voice' ? content : undefined,
      replyTo,
    });
    setPendingUserDrafts((drafts) => [...drafts, { content, replyTo, kind }]);
    setInput('');
    setReplyDraft(null);
    setFailedDraft(null);
  };

  const retryFailed = async () => {
    if (!failedDraft || sending) return;
    setSending(true);
    try {
      await addAssistantReply(failedDraft.drafts, failedDraft.mode);
      setFailedDraft(null);
      setPendingUserDrafts([]);
    } catch (error) {
      setFailedDraft((current) => current ? { ...current, error: error instanceof Error ? error.message : undefined } : failedDraft);
    } finally {
      setIsTyping(false);
      setSending(false);
    }
  };

  const sendSticker = (sticker: StickerItem) => {
    const replyTo = replyDraft || undefined;
    addMessage(activeChatId, activeChannel, {
      id: createId('msg'),
      role: 'user',
      content: sticker.url,
      timestamp: Date.now(),
      kind: 'sticker',
      stickerLabel: sticker.label,
      replyTo,
    });
    setPendingUserDrafts((drafts) => [...drafts, { content: `表情包：${sticker.label}`, replyTo, kind: 'sticker' }]);
    setReplyDraft(null);
    setFailedDraft(null);
    setShowPlusPanel(false);
  };

  const addCallNote = (type: 'voice' | 'video') => {
    const label = type === 'voice' ? '发起语音通话' : '发起视频通话';
    addMessage(activeChatId, activeChannel, {
      id: createId('msg'),
      role: 'user',
      content: label,
      timestamp: Date.now(),
      kind: 'call-note',
    });
    setPendingUserDrafts((drafts) => [...drafts, { content: label, kind: 'text' }]);
    setShowPlusPanel(false);
  };

  const sendImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || sending) return;
    const replyTo = replyDraft || undefined;
    const reader = new FileReader();
    reader.onload = async () => {
      const imageUrl = reader.result as string;
      const safeFileName = file.name.length > 42 ? `${file.name.slice(0, 22)}…${file.name.slice(-12)}` : file.name;
      addMessage(activeChatId, activeChannel, {
        id: createId('msg'),
        role: 'user',
        content: imageUrl,
        timestamp: Date.now(),
        kind: 'image',
        stickerLabel: safeFileName,
        replyTo,
      });
      setPendingUserDrafts((drafts) => [...drafts, { content: `图片：${safeFileName}`, replyTo, kind: 'image' }]);
      setReplyDraft(null);
      setFailedDraft(null);
      event.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const resetLifeDraft = () => {
    setLifeDraft({ amount: '', note: '', itemName: '' });
    setLifeComposer(null);
  };

  const sendLifeCard = () => {
    if (!lifeComposer) return;
    const amount = lifeDraft.amount.trim();
    const note = lifeDraft.note.trim();
    const itemName = lifeDraft.itemName.trim();
    if ((lifeComposer === 'transfer' || lifeComposer === 'red-packet') && !amount) return;
    if (lifeComposer === 'shopping' && !itemName) return;
    const replyTo = replyDraft || undefined;
    const message: ChatMessage = {
      id: createId('msg'),
      role: 'user',
      content: note || itemName || (lifeComposer === 'red-packet' ? '恭喜发财，大吉大利' : '转账'),
      timestamp: Date.now(),
      kind: lifeComposer,
      amount: amount || undefined,
      note: note || undefined,
      itemName: itemName || undefined,
      status: 'pending',
      replyTo,
    };
    addMessage(activeChatId, activeChannel, message);
    if (lifeComposer === 'shopping') {
      addPurchaseRecord({
        characterId: directCharacter?.id || groupMembers[0]?.id || '',
        itemName,
        amount,
        note,
      });
    }
    setPendingUserDrafts((drafts) => [...drafts, {
      content: describeChatMessage(message, true, characters),
      replyTo,
      kind: 'text',
    }]);
    setReplyDraft(null);
    setFailedDraft(null);
    resetLifeDraft();
    setShowPlusPanel(false);
  };

  return (
    <section className={cn('flex h-full flex-col', isWechat && 'wechat-chat-screen')}>
      <div className={cn('bg-[var(--phone-bg)] px-4 pb-4 pt-6', isWechat && 'wechat-chat-header')}>
        <div className="grid grid-cols-[46px_1fr_46px] items-center">
          <button onClick={goBack} className="circle-button small">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="min-w-0 text-center">
            <h2 className="truncate text-xl font-black">{character.name}</h2>
            {chatSubtitle && <p className="text-xs font-bold opacity-60">{chatSubtitle}</p>}
          </div>
          <button type="button" className="wechat-icon-button" aria-label="聊天信息">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className={cn('flex-1 overflow-y-auto bg-[#efe9dd] px-4 py-4', isWechat && 'wechat-message-list')}>
        {messages.length === 0 && character.firstMessage && (
          <Bubble role="model" content={character.firstMessage} kind="text" channel={activeChannel} character={character} />
        )}
        {messages.map((message) => {
          const speaker = message.speakerId ? characters.find((item) => item.id === message.speakerId) : character;
          return (
            <Bubble
              key={message.id}
              role={message.role}
              content={message.content}
              kind={message.kind}
              duration={message.duration}
              transcript={message.transcript}
              stickerLabel={message.stickerLabel}
              favorite={message.favorite}
              replyTo={message.replyTo}
              amount={message.amount}
              note={message.note}
              itemName={message.itemName}
              status={message.status}
              timestamp={message.timestamp}
              showTools={activeToolMessageId === message.id}
              channel={activeChannel}
              character={speaker || character}
              onToggleTools={() => setActiveToolMessageId((id) => (id === message.id ? null : message.id))}
              onDelete={message.role === 'model' ? () => deleteMessage(activeChatId, activeChannel, message.id) : undefined}
              onToggleFavorite={() => toggleMessageFavorite(activeChatId, activeChannel, message.id)}
              onCopy={() => navigator.clipboard?.writeText(describeChatMessage(message))}
              onReply={() => setReplyDraft(describeChatMessage(message).slice(0, 60))}
              onRecall={message.role === 'user' ? () => recallMessage(activeChatId, activeChannel, message.id) : undefined}
            />
          );
        })}
        {isTyping && !activeGroup && (
          <div className="wechat-typing">
            <WeChatAvatar src={character.avatar} name={character.name} />
            <span>{character.name} 正在输入中</span>
            <i />
            <i />
            <i />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={cn('border-t-[3px] border-[#111] bg-[var(--phone-bg)] p-3', isWechat && 'wechat-input-bar')}>
        {replyDraft && (
          <div className="wechat-reply-draft">
            <span>引用：{replyDraft}</span>
            <button type="button" onClick={() => setReplyDraft(null)}>取消</button>
          </div>
        )}
        {failedDraft && (
          <div className="wechat-failed-draft">
            <span>{failedDraft.drafts.length} 条消息还没等到回复，点重试再试一次。</span>
            <button type="button" onClick={retryFailed}>重试</button>
          </div>
        )}
        {showPlusPanel && (
          <div className="wechat-plus-panel">
            <button type="button" onClick={() => { setMode((current) => (current === 'voice' ? 'text' : 'voice')); setShowPlusPanel(false); }} className="wechat-plus-action">
              <Mic className="h-5 w-5" />
              <span>{mode === 'voice' ? '文字' : '语音条'}</span>
            </button>
            <button type="button" onClick={() => imageInputRef.current?.click()} className="wechat-plus-action">
              <ImagePlus className="h-5 w-5" />
              <span>图片</span>
            </button>
            <button type="button" onClick={() => addCallNote('voice')} className="wechat-plus-action">
              <Phone className="h-5 w-5" />
              <span>语音通话</span>
            </button>
            <button type="button" onClick={() => addCallNote('video')} className="wechat-plus-action">
              <Video className="h-5 w-5" />
              <span>视频通话</span>
            </button>
            <button type="button" onClick={() => setLifeComposer((current) => current === 'transfer' ? null : 'transfer')} className="wechat-plus-action">
              <RefreshCw className="h-5 w-5" />
              <span>转账</span>
            </button>
            <button type="button" onClick={() => setLifeComposer((current) => current === 'red-packet' ? null : 'red-packet')} className="wechat-plus-action">
              <Gift className="h-5 w-5" />
              <span>红包</span>
            </button>
            <button type="button" onClick={() => setLifeComposer((current) => current === 'shopping' ? null : 'shopping')} className="wechat-plus-action">
              <ShoppingBag className="h-5 w-5" />
              <span>购物</span>
            </button>
            {lifeComposer && (
              <div className="wechat-life-composer">
                <div className="grid grid-cols-2 gap-2">
                  {lifeComposer === 'shopping' && (
                    <input value={lifeDraft.itemName} onChange={(event) => setLifeDraft((draft) => ({ ...draft, itemName: event.target.value }))} placeholder="买了什么" />
                  )}
                  <input value={lifeDraft.amount} onChange={(event) => setLifeDraft((draft) => ({ ...draft, amount: event.target.value }))} placeholder={lifeComposer === 'red-packet' ? '红包金额' : '金额'} />
                  <input value={lifeDraft.note} onChange={(event) => setLifeDraft((draft) => ({ ...draft, note: event.target.value }))} placeholder="备注" />
                </div>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={sendLifeCard}>发送</button>
                  <button type="button" onClick={resetLifeDraft}>取消</button>
                </div>
              </div>
            )}
            <p className="wechat-plus-label">
              <SmilePlus className="h-4 w-4" />
              表情包
            </p>
            <div className="wechat-sticker-tray">
              {stickers.map((sticker) => (
                <button key={sticker.id} onClick={() => sendSticker(sticker)} className="wechat-sticker-send-button" title={sticker.label}>
                  <img src={sticker.url} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="wechat-compose-row">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            placeholder={mode === 'voice' ? '语音文字' : '说点什么...'}
            rows={1}
            className="hand-input wechat-chat-input min-h-11 flex-1 resize-none"
          />
          <input ref={imageInputRef} type="file" accept="image/*" onChange={sendImage} className="hidden" />
          <button onClick={() => setShowPlusPanel((visible) => !visible)} className={cn('circle-button small', showPlusPanel && 'bg-[#d9e8f6]')}>
            <Plus className="h-5 w-5" />
          </button>
          <button onClick={send} className="circle-button small bg-[#d9e8f6]">
            {sending ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </section>
  );
}

function Bubble({
  role,
  content,
  kind,
  duration,
  transcript,
  stickerLabel,
  favorite,
  replyTo,
  amount,
  note,
  itemName,
  status,
  timestamp,
  showTools,
  channel,
  character,
  onToggleTools,
  onDelete,
  onToggleFavorite,
  onCopy,
  onReply,
  onRecall,
}: {
  key?: React.Key;
  role: 'user' | 'model';
  content: string;
  kind: string;
  duration?: number;
  transcript?: string;
  stickerLabel?: string;
  favorite?: boolean;
  replyTo?: string;
  amount?: string;
  note?: string;
  itemName?: string;
  status?: 'pending' | 'accepted';
  timestamp?: number;
  showTools?: boolean;
  channel?: 'wechat' | 'qq';
  character?: Character;
  onToggleTools?: () => void;
  onDelete?: () => void;
  onToggleFavorite?: () => void;
  onCopy?: () => void;
  onReply?: () => void;
  onRecall?: () => void;
}) {
  const isUser = role === 'user';
  const isWechat = channel === 'wechat';
  const { userAvatar, userName } = useAppStore();
  const [showTranscript, setShowTranscript] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const runTool = (event: React.MouseEvent<HTMLButtonElement>, action?: () => void) => {
    event.stopPropagation();
    action?.();
  };
  const messageTools = showTools ? (
    <div className={cn('wechat-message-tools', isUser ? 'justify-end' : 'justify-start')}>
      {onReply && (
        <button type="button" onClick={(event) => runTool(event, onReply)} className="quote" title="引用">
          <Quote className="h-3.5 w-3.5" />
          <span>引用</span>
        </button>
      )}
      {onToggleFavorite && (
        <button type="button" onClick={(event) => runTool(event, onToggleFavorite)} className={cn(favorite && 'active')} title={favorite ? '取消收藏' : '收藏'}>
          <Star className="h-3.5 w-3.5" />
          <span>{favorite ? '已收藏' : '收藏'}</span>
        </button>
      )}
      {onCopy && (
        <button type="button" onClick={(event) => runTool(event, onCopy)} title="复制">
          <Copy className="h-3.5 w-3.5" />
          <span>复制</span>
        </button>
      )}
      {onRecall && (
        <button type="button" onClick={(event) => runTool(event, onRecall)} className="recall" title="撤回">
          <Undo2 className="h-3.5 w-3.5" />
          <span>撤回</span>
        </button>
      )}
      {!isUser && onDelete && (
        <button type="button" onClick={(event) => runTool(event, onDelete)} title="删除">
          <Trash2 className="h-3.5 w-3.5" />
          <span>删除</span>
        </button>
      )}
    </div>
  ) : null;

  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const playVoice = () => {
    setIsPlaying(true);
    speak(content);
    window.setTimeout(() => setIsPlaying(false), Math.max(900, (duration || 3) * 1000));
  };

  const armMessageTools = () => {
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => onToggleTools?.(), 360);
  };

  const messageEvents = {
    onClick: onToggleTools,
    onContextMenu: (event: React.MouseEvent) => {
      event.preventDefault();
      onToggleTools?.();
    },
    onPointerDown: armMessageTools,
    onPointerUp: clearLongPress,
    onPointerCancel: clearLongPress,
    onPointerLeave: clearLongPress,
  };

  const meta = timestamp ? <span className="wechat-message-time">{formatMessageTime(timestamp)}</span> : null;

  if (content === '' && kind === 'text') {
    return <p className="wechat-recalled-text">{isUser ? '你撤回了一条消息' : '对方撤回了一条消息'}</p>;
  }

  const replyLine = replyTo ? <p className="wechat-reply-line">引用：{replyTo}</p> : null;

  if (kind === 'call-note') {
    const isVideoCall = content.includes('视频');
    return (
      <div className="wechat-call-note">
        {isVideoCall ? <Video className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
        <span>{content}</span>
        {meta}
      </div>
    );
  }

  if (kind === 'transfer' || kind === 'red-packet' || kind === 'shopping') {
    const isRedPacket = kind === 'red-packet';
    const isShopping = kind === 'shopping';
    const title = isShopping ? itemName || content || '购物记录' : isRedPacket ? note || content || '恭喜发财，大吉大利' : note || content || '转账';
    const amountText = amount ? `¥${amount}` : isRedPacket ? '红包' : '未填金额';
    return (
      <div className={cn('wechat-message mb-3 flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
        {isWechat && !isUser && <WeChatAvatar src={character?.avatar} name={character?.name || 'char'} />}
        <div className={cn('flex max-w-[78%] flex-col', isUser ? 'items-end' : 'items-start')}>
          {replyLine}
          <button type="button" className={cn('wechat-life-card', kind)} {...messageEvents}>
            <span className="wechat-life-icon">
              {isShopping ? <ShoppingBag className="h-5 w-5" /> : isRedPacket ? <Gift className="h-5 w-5" /> : <RefreshCw className="h-5 w-5" />}
            </span>
            <span className="min-w-0 flex-1">
              <strong>{title}</strong>
              <small>{isShopping ? (note || '生活购物') : status === 'accepted' ? '已收' : '待收'}</small>
            </span>
            <b>{amountText}</b>
          </button>
          {meta}
          {isWechat && messageTools}
        </div>
        {isWechat && isUser && <WeChatAvatar src={userAvatar} name={userName} />}
      </div>
    );
  }

  if (kind === 'sticker') {
    if (isWechat) {
      return (
        <div className={cn('wechat-message mb-3 flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
          {!isUser && <WeChatAvatar src={character?.avatar} name={character?.name || 'char'} />}
          <figure className="wechat-sticker-wrap" {...messageEvents}>
            {replyLine}
            <img src={content} className="wechat-sticker" alt={stickerLabel || '表情包'} />
            {meta}
            {messageTools}
          </figure>
          {isUser && <WeChatAvatar src={userAvatar} name={userName} />}
        </div>
      );
    }

    return (
      <div className={cn('mb-3 flex', isUser ? 'justify-end' : 'justify-start')}>
        <img src={content} className="max-h-36 max-w-36 rounded-2xl border-[3px] border-[#111] object-cover" />
      </div>
    );
  }
  if (kind === 'image') {
    if (isWechat) {
      return (
        <div className={cn('wechat-message mb-3 flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
          {!isUser && <WeChatAvatar src={character?.avatar} name={character?.name || 'char'} />}
          <figure className="wechat-image-wrap" {...messageEvents}>
            {replyLine}
            <img src={content} className="wechat-image-message" alt={stickerLabel || '聊天图片'} />
            {stickerLabel && <figcaption>{stickerLabel}</figcaption>}
            {meta}
            {messageTools}
          </figure>
          {isUser && <WeChatAvatar src={userAvatar} name={userName} />}
        </div>
      );
    }

    return (
      <div className={cn('mb-3 flex', isUser ? 'justify-end' : 'justify-start')}>
        <img src={content} className="max-h-56 max-w-56 rounded-2xl border-[3px] border-[#111] object-cover" />
      </div>
    );
  }
  if (kind === 'voice') {
    if (isWechat) {
      const voiceDuration = duration || 3;
      const width = Math.min(228, Math.max(112, 92 + voiceDuration * 9));
      const transcriptText = transcript || content;
      return (
        <div className={cn('wechat-message mb-3 flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
          {!isUser && <WeChatAvatar src={character?.avatar} name={character?.name || 'char'} />}
          <div className={cn('flex max-w-[78%] flex-col', isUser ? 'items-end' : 'items-start')}>
            {replyLine}
            <button
              onClick={playVoice}
              onContextMenu={(event) => {
                event.preventDefault();
                onToggleTools?.();
              }}
              onPointerDown={() => {
                armMessageTools();
              }}
              onPointerUp={clearLongPress}
              onPointerCancel={clearLongPress}
              onPointerLeave={clearLongPress}
              className={cn('wechat-voice-bubble', isPlaying && 'is-playing', isUser ? 'wechat-voice-user' : 'wechat-voice-model')}
              style={{ width }}
              title="点击播放，长按或右键查看转写"
            >
              <span className="wechat-voice-icon">
                <Volume2 className="h-4 w-4" />
              </span>
              <span className="wechat-voice-waves" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="wechat-voice-duration">{voiceDuration}"</span>
            </button>
            <button type="button" onClick={() => setShowTranscript((visible) => !visible)} className="wechat-transcript-toggle">
              {showTranscript ? '收起转文字' : '转文字'}
            </button>
            {showTranscript && <p className="wechat-transcript">{transcriptText}</p>}
            {meta}
            {messageTools}
          </div>
          {isUser && <WeChatAvatar src={userAvatar} name={userName} />}
        </div>
      );
    }

    return (
      <div className={cn('mb-3 flex', isUser ? 'justify-end' : 'justify-start')}>
        <button onClick={playVoice} className={cn('hand-bubble flex min-w-32 items-center gap-2', isUser ? 'bg-[#d7efc7]' : 'bg-white')}>
          <Mic className="h-4 w-4" />
          <span>{duration || 3}"</span>
          <span className="text-xs opacity-65">点按播放</span>
        </button>
      </div>
    );
  }
  return (
    <div className={cn(isWechat ? 'wechat-message' : '', 'mb-3 flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {isWechat && !isUser && <WeChatAvatar src={character?.avatar} name={character?.name || 'char'} />}
      <div className={cn('flex max-w-[78%] flex-col', isUser ? 'items-end' : 'items-start')}>
        {replyLine}
        <div className={cn(isWechat && 'wechat-text-wrap', 'hand-bubble whitespace-pre-wrap leading-relaxed', isUser ? 'bg-[#d7efc7]' : 'bg-white')} {...messageEvents}>{content}</div>
        {meta}
        {isWechat && messageTools}
      </div>
      {isWechat && isUser && <WeChatAvatar src={userAvatar} name={userName} />}
    </div>
  );
}

function VideoCallScreen() {
  const [scene, setScene] = useState('画面里他坐在床边，房间只开了一盏小灯，镜头偶尔晃一下。');
  return (
    <section className="h-full overflow-y-auto pb-8">
      <Header title="视频通话" subtitle="描述画面，再用文字假装正在说话" />
      <div className="mx-4 mt-4 overflow-hidden rounded-[28px] border-[3px] border-[#111] bg-black shadow-[3px_3px_0_#111]">
        <div className="flex aspect-[9/13] items-center justify-center bg-gradient-to-br from-[#201b2f] via-[#313b4f] to-[#111] p-6 text-center text-white">
          <p className="text-lg font-bold leading-relaxed">{scene}</p>
        </div>
      </div>
      <Panel>
        <textarea value={scene} onChange={(event) => setScene(event.target.value)} className="hand-input min-h-24 w-full" />
        <div className="mt-4 grid grid-cols-4 gap-2">
          <CallButton icon={<Mic />} label="麦克" />
          <CallButton icon={<Camera />} label="镜头" />
          <CallButton icon={<Sparkles />} label="画面" />
          <CallButton icon={<Phone />} label="挂断" danger />
        </div>
      </Panel>
    </section>
  );
}

type DiaryTab = 'user' | 'char' | 'favorite';
type DiaryDraft = Pick<DiaryEntry, 'owner' | 'title' | 'content'>;

const emptyDiaryDraft = (owner: DiaryEntry['owner'] = 'user'): DiaryDraft => ({
  owner,
  title: '',
  content: '',
});

function formatDiaryDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
}

function getDiarySummary(entry: DiaryEntry) {
  return entry.content.replace(/\s+/g, ' ').slice(0, 62) || '还没有正文';
}

function DiaryScreen() {
  const {
    characters,
    chatSessions,
    wechatMoments,
    purchaseRecords,
    memos,
    xiaohongshuNotes,
    diaries,
    addDiary,
    updateDiary,
    deleteDiary,
    apiBaseUrl,
    apiKey,
    selectedModel,
    chatTemperature,
    browserPresetPrompt,
  } = useAppStore();
  const [tab, setTab] = useState<DiaryTab>('user');
  const [view, setView] = useState<'list' | 'edit' | 'detail'>('list');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DiaryDraft>(() => emptyDiaryDraft('user'));
  const [charWriterId, setCharWriterId] = useState('');
  const [reviewerIds, setReviewerIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [streamingDiaryId, setStreamingDiaryId] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState('');

  const activeEntry = diaries.find((entry) => entry.id === activeId) || null;
  const characterById = (id?: string) => characters.find((character) => character.id === id);
  const tabs: Array<{ id: DiaryTab; label: string }> = [
    { id: 'user', label: '我的日记' },
    { id: 'char', label: 'char日记' },
    { id: 'favorite', label: '收藏' },
  ];
  const visibleEntries = diaries.filter((entry) =>
    tab === 'favorite' ? entry.owner === 'char' && entry.favorite : entry.owner === tab,
  );
  const favoriteGroups = characters
    .map((character) => ({
      character,
      entries: visibleEntries.filter((entry) => entry.characterId === character.id),
    }))
    .filter((group) => group.entries.length > 0);
  const unknownFavoriteEntries = tab === 'favorite'
    ? visibleEntries.filter((entry) => !entry.characterId || !characterById(entry.characterId))
    : [];
  const currentWriterId = charWriterId || characters[0]?.id || '';

  const openNewDraft = (owner: DiaryEntry['owner']) => {
    setActiveId(null);
    setDraft(emptyDiaryDraft(owner));
    setReviewerIds(characters[0]?.id ? [characters[0].id] : []);
    setGenerationError('');
    setView('edit');
  };

  const openEdit = (entry: DiaryEntry) => {
    setActiveId(entry.id);
    setDraft({
      owner: entry.owner,
      title: entry.title,
      content: entry.content,
    });
    setReviewerIds((entry.reviews || (entry.review ? [entry.review] : []))
      .map((review) => review.characterId)
      .filter(Boolean) as string[]);
    setGenerationError('');
    setView('edit');
  };

  const writeOneUserReview = async (entry: Pick<DiaryEntry, 'title' | 'content'>, reader: Character) => {
    const createdAt = Date.now();
    if (!apiBaseUrl || !selectedModel) {
      return {
        characterId: reader.id,
        content: `${reader.name}读完后在下面留了一句：我看见了，今天这些不是小事。`,
        createdAt,
      };
    }
    try {
      const content = await requestChatCompletion({
        baseUrl: apiBaseUrl,
        apiKey,
        model: selectedModel,
        temperature: chatTemperature,
        maxTokens: 600,
        messages: [
          {
            role: 'system',
            content: [
              getCharacterPrompt(reader) || `你是${reader.name}。`,
              '你刚读完用户写的一篇私人日记。请只写一段批注式评价，不展开对话，不提“作为AI”，不要复述全文。语气要像你本人在日记页下方留下的短评。',
            ].join('\n'),
          },
          {
            role: 'user',
            content: `标题：${entry.title}\n正文：${entry.content}`,
          },
        ],
      });
      return {
        characterId: reader.id,
        content: content.trim() || `${reader.name}读完了，但什么也没写下。`,
        createdAt,
      };
    } catch (error) {
      return {
        characterId: reader.id,
        content: `${reader.name}读完了，但批注暂时写不出来。${error instanceof Error ? `（${error.message}）` : ''}`,
        createdAt,
      };
    }
  };

  const writeUserReviews = async (entry: Pick<DiaryEntry, 'title' | 'content'>) => {
    const readers = (reviewerIds.length > 0 ? reviewerIds : characters[0]?.id ? [characters[0].id] : [])
      .map((id) => characterById(id))
      .filter(Boolean) as Character[];
    if (readers.length === 0) {
      return [{ content: '还没有 char 能读这篇日记。', createdAt: Date.now() }];
    }
    return Promise.all(readers.map((reader) => writeOneUserReview(entry, reader)));
  };

  const saveDraft = async () => {
    const content = draft.content.trim();
    if (!content) return;
    const id = activeId || createId('diary');
    const now = Date.now();
    const payload = {
      owner: draft.owner,
      title: draft.title.trim() || content.slice(0, 18),
      content,
      tags: [],
      source: 'manual' as const,
    };
    if (activeId) {
      updateDiary(activeId, payload);
    } else {
      addDiary({ ...payload, id, createdAt: now, updatedAt: now });
    }
    setActiveId(id);
    setTab('user');
    setView('detail');
    setDraft(emptyDiaryDraft('user'));
    setReviewingId(id);
    const reviews = await writeUserReviews(payload);
    updateDiary(id, { review: reviews[0], reviews });
    setReviewingId(null);
  };

  const generateCharDiary = async () => {
    const character = characterById(currentWriterId);
    if (!character) {
      setGenerationError('先选择一个角色。');
      return;
    }
    if (!apiBaseUrl || !selectedModel) {
      setGenerationError('先在设置里填好接口地址和模型。');
      return;
    }
    setIsGenerating(true);
    setGenerationError('');
    const id = createId('diary');
    const createdAt = Date.now();
    addDiary({
      id,
      owner: 'char',
      characterId: character.id,
      title: `${character.name}的日记`,
      content: '',
      tags: ['char'],
      source: 'manual',
      createdAt,
      updatedAt: createdAt,
    });
    setActiveId(id);
    setTab('char');
    setView('detail');
    setStreamingDiaryId(id);
    try {
      const recentMessages = Object.values(chatSessions)
        .filter((session) => session.characterId === character.id)
        .flatMap((session) => session.messages.slice(-12).map((message) => `${message.role === 'user' ? '用户' : character.name}：${describeChatMessage(message, true, characters)}`))
        .slice(-24)
        .join('\n');
      const moments = wechatMoments.slice(0, 8).map((moment) => `朋友圈：${moment}`).join('\n');
      const xiaohongshuContext = buildXiaohongshuContext(xiaohongshuNotes, 8);
      const orders = purchaseRecords.slice(0, 6).map((record) => `订单：${record.itemName} ${record.amount} ${record.note}`).join('\n');
      const notes = memos
        .filter((memo) => !memo.locked)
        .slice(0, 5)
        .map((memo) => `备忘录：${memo.title}：${memo.content}`)
        .join('\n');
      const userDiarySummary = diaries
        .filter((entry) => entry.owner === 'user')
        .slice(0, 3)
        .map((entry) => `${entry.title}：${getDiarySummary(entry)}`)
        .join('\n');
      let streamedContent = '';
      const messages = [
        {
          role: 'system' as const,
          content: [
            getCharacterPrompt(character) || `你是${character.name}。`,
            '请按角色自己的口吻写一篇今天的私人日记。只输出日记正文，不写解释，不复述完整聊天记录，要写感受、误解、惦记和下一步想做什么。',
            '篇幅写到 800 到 1200 个中文字，像真的在手机里认真写日记，不要只写摘要。',
          ].join('\n'),
        },
        {
          role: 'user' as const,
          content: [
            recentMessages ? `近期聊天：\n${recentMessages}` : '近期聊天：暂无。',
            moments ? `微信/朋友圈内容：\n${moments}` : '微信/朋友圈内容：暂无。',
            xiaohongshuContext,
            orders ? `订单与生活事件：\n${orders}` : '订单与生活事件：暂无。',
            notes ? `备忘录：\n${notes}` : '备忘录：暂无。',
            userDiarySummary ? `用户近期日记摘要：\n${userDiarySummary}` : '用户近期日记摘要：暂无。',
          ].join('\n\n'),
        },
      ];
      const content = await requestChatCompletionStream({
        baseUrl: apiBaseUrl,
        apiKey,
        model: selectedModel,
        temperature: chatTemperature,
        messages,
        onToken: (token) => {
          streamedContent += token;
          updateDiary(id, { content: streamedContent });
        },
      });
      updateDiary(id, { content: content.trim() || streamedContent.trim() || 'TA 今天没有写出内容。' });
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : '生成失败');
      updateDiary(id, { content: `生成失败：${error instanceof Error ? error.message : '未知错误'}` });
    } finally {
      setIsGenerating(false);
      setStreamingDiaryId(null);
    }
  };

  const showDetail = (entry: DiaryEntry) => {
    setActiveId(entry.id);
    setView('detail');
  };

  if (view === 'detail' && activeEntry) {
    const character = characterById(activeEntry.characterId);
    const entryReviews = activeEntry.reviews || (activeEntry.review ? [activeEntry.review] : []);
    const toggleFavorite = () => updateDiary(activeEntry.id, { favorite: !activeEntry.favorite });
    return (
      <section className="diary-detail-screen h-full overflow-x-hidden overflow-y-auto pb-8">
        <Header title={activeEntry.owner === 'char' ? 'char日记' : '我的日记'} onBack={() => setView('list')} />
        <Panel className="!mx-auto max-w-[320px]">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black text-[#111]/45">{formatDiaryDate(activeEntry.createdAt)}</p>
              <h2 className="text-xl font-black leading-tight">{activeEntry.title}</h2>
            </div>
            {character && <img src={character.avatar} alt={character.name} className="h-11 w-11 rounded-full border-[2px] border-[#111] object-cover" />}
          </div>
          <p className="whitespace-pre-wrap break-words text-sm font-bold leading-relaxed">
            {activeEntry.content || (streamingDiaryId === activeEntry.id ? 'TA 正在写...' : '还没有正文')}
          </p>
        </Panel>
        {activeEntry.owner === 'user' && (
          <Panel className="!mx-auto max-w-[320px]">
            {reviewingId === activeEntry.id && <p className="text-sm font-black text-[#111]/65">TA 们正在读这篇日记...</p>}
            {reviewingId !== activeEntry.id && entryReviews.length === 0 && <p className="text-sm font-black text-[#111]/65">还没有批注。</p>}
            {entryReviews.map((review, index) => {
              const reviewCharacter = characterById(review.characterId) || characters[0];
              return (
                <article key={`${review.characterId || 'review'}-${index}`} className="border-b-[2px] border-[#111]/10 py-2 last:border-b-0">
                  <p className="mb-1 text-xs font-black text-[#111]/45">{reviewCharacter ? `${reviewCharacter.name}的批注` : 'char批注'}</p>
                  <p className="whitespace-pre-wrap break-words text-sm font-black leading-relaxed text-[#111]/75">{review.content}</p>
                </article>
              );
            })}
          </Panel>
        )}
        <div className="flex justify-center gap-3 px-4">
          {activeEntry.owner === 'user' && <button onClick={() => openEdit(activeEntry)} className="save-button min-w-16 px-4 text-xs">编辑</button>}
          <button onClick={toggleFavorite} className={cn('save-button min-w-16 px-4 text-xs', activeEntry.favorite && 'bg-[#fff0bd]')}>
            {activeEntry.favorite ? '已收藏' : '收藏'}
          </button>
          <button onClick={() => (deleteDiary(activeEntry.id), setView('list'))} className="save-button min-w-16 bg-[#ffd8d8] px-4 text-xs">删除</button>
        </div>
      </section>
    );
  }

  if (view === 'edit') {
    return (
      <section className="no-scrollbar h-full overflow-y-auto pb-8">
        <Header title={activeId ? '编辑我的日记' : '写日记'} onBack={() => setView('list')} onSave={saveDraft} saveLabel="提交" />
        <Panel>
          <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} className="hand-input mb-3 w-full" placeholder="标题" />
          <textarea value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} placeholder="正文" className="hand-input min-h-56 w-full" />
          <div className="mt-3">
            <p className="mb-2 text-xs font-black text-[#111]/50">选择谁来批注</p>
            {characters.length === 0 && <p className="text-sm font-black text-[#111]/55">导入角色后可以选择批注人。</p>}
            <div className="flex flex-wrap gap-2">
              {characters.map((character) => {
                const active = reviewerIds.includes(character.id);
                return (
                  <button
                    key={character.id}
                    type="button"
                    onClick={() => setReviewerIds((ids) => active ? ids.filter((id) => id !== character.id) : [...ids, character.id])}
                    className={cn('pill px-3 py-2 text-xs', active && 'active')}
                  >
                    {character.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => setView('list')} className="fetch-button bg-[#f2f2f2]">取消</button>
            <button onClick={saveDraft} className="fetch-button">提交</button>
          </div>
        </Panel>
      </section>
    );
  }

  return (
    <section className="h-full overflow-y-auto pb-8">
      <Header title="日记" />
      <div className="mb-3 flex gap-2 overflow-x-auto px-6 pb-1">
        {tabs.map((item) => (
          <button key={item.id} onClick={() => setTab(item.id)} className={`pill ${tab === item.id ? 'active' : ''}`}>
            {item.label}
          </button>
        ))}
      </div>
      <Panel>
        {tab === 'user' ? (
          <button onClick={() => openNewDraft('user')} className="fetch-button">写日记</button>
        ) : tab === 'char' ? (
          <>
            <select value={currentWriterId} onChange={(event) => setCharWriterId(event.target.value)} className="hand-input mb-3 w-full">
              <option value="">选择角色</option>
              {characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
            </select>
            <button onClick={generateCharDiary} disabled={isGenerating} className="fetch-button disabled:opacity-60">{isGenerating ? '生成中...' : '让 TA 写日记'}</button>
            {generationError && <p className="mt-2 text-xs font-black text-[#b91c1c]">{generationError}</p>}
          </>
        ) : (
          <p className="text-sm font-black text-[#111]/60">收藏的 char 日记会按角色分组放在这里。</p>
        )}
      </Panel>
      <Panel>
        {visibleEntries.length === 0 && (
          <p className="text-sm font-black text-[#111]/55">
            {tab === 'user' ? '还没有我的日记。' : tab === 'char' ? '还没有char日记。' : '还没有收藏的char日记。'}
          </p>
        )}
        {tab === 'favorite' && favoriteGroups.map((group) => (
          <section key={group.character.id} className="border-b-[2px] border-[#111]/15 py-3 last:border-b-0">
            <div className="mb-2 flex items-center gap-2">
              <img src={group.character.avatar} alt={group.character.name} className="h-8 w-8 rounded-full border-[2px] border-[#111] object-cover" />
              <h3 className="text-sm font-black">{group.character.name}</h3>
            </div>
            {group.entries.map((entry) => (
              <button key={entry.id} onClick={() => showDetail(entry)} className="block w-full rounded-2xl px-2 py-2 text-left hover:bg-[#111]/5">
                <p className="text-xs font-black text-[#111]/45">{formatDiaryDate(entry.createdAt)}</p>
                <h4 className="text-base font-black">{entry.title}</h4>
                <p className="mt-1 text-sm font-bold leading-relaxed text-[#111]/70">{getDiarySummary(entry)}</p>
              </button>
            ))}
          </section>
        ))}
        {tab === 'favorite' && unknownFavoriteEntries.length > 0 && (
          <section className="py-3">
            <h3 className="mb-2 text-sm font-black">未关联角色</h3>
            {unknownFavoriteEntries.map((entry) => (
              <button key={entry.id} onClick={() => showDetail(entry)} className="block w-full rounded-2xl px-2 py-2 text-left hover:bg-[#111]/5">
                <p className="text-xs font-black text-[#111]/45">{formatDiaryDate(entry.createdAt)}</p>
                <h4 className="text-base font-black">{entry.title}</h4>
                <p className="mt-1 text-sm font-bold leading-relaxed text-[#111]/70">{getDiarySummary(entry)}</p>
              </button>
            ))}
          </section>
        )}
        {tab !== 'favorite' && visibleEntries.map((entry) => {
          const character = characterById(entry.characterId);
          return (
            <button key={entry.id} onClick={() => showDetail(entry)} className="block w-full border-b-[2px] border-[#111]/15 py-3 text-left last:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-[#111]/45">{formatDiaryDate(entry.createdAt)}</p>
                  <h3 className="text-base font-black">{entry.title}</h3>
                </div>
                {character && <img src={character.avatar} alt={character.name} className="h-10 w-10 rounded-full border-[2px] border-[#111] object-cover" />}
              </div>
              <p className="mt-2 text-sm font-bold leading-relaxed text-[#111]/70">{getDiarySummary(entry)}</p>
              {entry.owner === 'user' && entry.review && <p className="mt-2 text-xs font-black text-[#111]/45">有批注</p>}
            </button>
          );
        })}
      </Panel>
    </section>
  );
}

function PeekScreen() {
  const { characters, diaries, memos, calendarEvents, galleryPhotos } = useAppStore();
  const character = characters[0];
  const latestCharDiary = diaries.find((entry) => entry.owner === 'char') || diaries[0];
  const peekCalendarEvents = calendarEvents
    .filter((event) => event.owner !== 'user')
    .filter((event) => !character || !event.characterId || event.characterId === character.id)
    .slice(0, 2);
  const diaryDesc = latestCharDiary
    ? `${latestCharDiary.title}：${getDiarySummary(latestCharDiary)}`
    : '还没有日记';
  const calendarDesc = peekCalendarEvents.length > 0
    ? peekCalendarEvents.map((event) => `${formatDateLabel(event.startAt)} ${event.title}`).join('；')
    : '还没有可查看日程';
  const readablePhotos = galleryPhotos
    .filter((photo) => photo.readableByChar && !photo.hidden)
    .filter((photo) => !character || !photo.characterId || photo.characterId === character.id)
    .slice(0, 2);
  const photoDesc = readablePhotos.length > 0
    ? readablePhotos.map((photo) => `${photo.title}：${photo.description || photo.tags.join('、') || '还没有描述'}`).join('；')
    : '还没有可读取照片';
  const readableMemos = memos
    .filter((memo) => memo.readableByChar && !memo.locked)
    .filter((memo) => !character || !memo.characterId || memo.characterId === character.id)
    .slice(0, 2);
  const memoDesc = readableMemos.length > 0
    ? readableMemos.map((memo) => `${memo.title}：${memo.content.slice(0, 42) || memo.tags.join('、')}`).join('；')
    : '还没有可读取备忘录';
  return (
    <section className="h-full overflow-y-auto pb-8">
      <Header title="查手机" subtitle="偷看 char 的手机内容" />
      <Panel>
        <Row icon={<MessageCircle />} title="聊天记录" desc={character ? `查看 ${character.name} 的微信/QQ 对话` : '导入角色后显示'} />
        <Row icon={<BookOpen />} title="日记" desc={diaryDesc} />
        <Row icon={<CalendarDays />} title="日历" desc={calendarDesc} />
        <Row icon={<ImageIcon />} title="相册" desc={photoDesc} />
        <Row icon={<FileText />} title="备忘录" desc={memoDesc} />
        <Row icon={<Search />} title="搜索记录" desc="后续生成 char 搜过什么、看过什么网页。" />
        <Row icon={<ImageIcon />} title="隐藏相册" desc="后续接图片上传和角色点评。" />
      </Panel>
    </section>
  );
}

function makeFallbackBrowserResults(query: string, context: string): { summary: string; results: BrowserSearchResult[] } {
  const clean = query.trim() || '最近发生的事';
  const encoded = encodeURIComponent(clean).replace(/%20/g, '+');
  const hasContext = context.trim() && !context.includes('当前没有太多最近记录');
  const summary = `找到约 4 条和「${clean}」有关的结果，包含社区讨论、笔记、短评式条目和资料页。`;
  const results = [
    {
      title: `如何看待「${clean}」最近又被提起？`,
      url: `https://www.zhihu.com/search?type=content&q=${encoded}`,
      snippet: hasContext ? `有答主从最近几件小事聊起，语气像熟人匿名分享，评论区也补了几个容易被忽略的细节。` : `有答主把这件事讲得很生活化，评论区补充了不同角度的经历和看法。`,
    },
    {
      title: `${clean}｜条目、短评与收藏`,
      url: `https://www.douban.com/search?q=${encoded}`,
      snippet: `豆瓣式条目页里有人把这件事记成一种氛围：安静、暧昧、带一点不想明说的私人感。`,
    },
    {
      title: `${clean} 相关笔记：今天也太有画面感了`,
      url: `https://www.xiaohongshu.com/search_result?keyword=${encoded}`,
      snippet: `笔记里像真人随手发的生活记录，配了地点、心情和几条热评，看起来像刚被收藏过。`,
    },
    {
      title: `${clean}_百度百科`,
      url: `https://baike.baidu.com/item/${encoded}`,
      snippet: `资料页整理了关键词、相关人物和时间线，像现实网页一样克制，但能自然接进当前世界观。`,
    },
  ];
  return { summary, results };
}

function getBrowserHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0];
  }
}

function BrowserScreen() {
  const {
    characters,
    chatSessions,
    wechatMoments,
    diaries,
    calendarEvents,
    galleryPhotos,
    memos,
    xiaohongshuNotes,
    browserSearches,
    browserBookmarks,
    browserHistory,
    browserWorldBook,
    addBrowserSearch,
    deleteBrowserSearch,
    addBrowserBookmark,
    deleteBrowserBookmark,
    addBrowserHistory,
    clearBrowserHistory,
    setBrowserWorldBook,
    browserApiBaseUrl,
    browserApiKey,
    browserSelectedModel,
    setBrowserApiConfig,
    apiBaseUrl,
    apiKey,
    selectedModel,
    chatTemperature,
    browserPresetPrompt,
  } = useAppStore();
  const worldBookInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(browserSearches[0]?.id || null);
  const [openedResult, setOpenedResult] = useState<BrowserSearchResult | null>(null);
  const [browserPanel, setBrowserPanel] = useState<'results' | 'bookmarks' | 'history' | 'settings'>('results');
  const [isSearching, setIsSearching] = useState(false);
  const [status, setStatus] = useState('');
  const activeRecord = browserSearches.find((record) => record.id === activeId) || browserSearches[0];

  const runSearch = async (overrideQuery?: string) => {
    const clean = (overrideQuery ?? query).trim();
    if (!clean) {
      setStatus('先输入要搜索的内容。');
      return;
    }
    setIsSearching(true);
    setOpenedResult(null);
    setBrowserPanel('results');
    setStatus('正在生成浏览器搜索页...');
    const context = buildMemoWorldContext({
      characters,
      chatSessions,
      wechatMoments,
      purchaseRecords: [],
      diaries,
      calendarEvents,
      galleryPhotos,
      memos,
      xiaohongshuNotes,
      characterId: characters[0]?.id,
    });
    try {
      let payload = makeFallbackBrowserResults(clean, context);
      const activeApiBaseUrl = browserApiBaseUrl || apiBaseUrl;
      const activeApiKey = browserApiKey || apiKey;
      const activeModel = browserSelectedModel || selectedModel;
      if (activeApiBaseUrl && activeModel) {
        const reply = await requestChatCompletion({
          baseUrl: activeApiBaseUrl,
          apiKey: activeApiKey,
          model: activeModel,
          temperature: chatTemperature,
          maxTokens: 700,
          messages: [
            {
              role: 'system',
              content: [
                '你是虚拟手机里的浏览器搜索页。输出严格 JSON，不要 Markdown。',
                '结构：{"summary":"...","results":[{"title":"...","url":"https://...","snippet":"..."}]}。',
                '这是给玩家看的沉浸式界面，不要出现代码、CSS、JS、发给char、example.com、phone://、生成器、开发说明。',
                '结果要像真实互联网里存在的知乎、豆瓣、小红书、微博、贴吧、百科、新闻、本地生活站等页面。',
                '不要把最近内容逐字贴进摘要，要改写成像网友、博主、条目编辑自然写出来的话。',
                browserPresetPrompt,
              ].filter(Boolean).join('\n'),
            },
            {
              role: 'user',
              content: `搜索词：${clean}\n\n浏览器世界书：\n${browserWorldBook || '未导入'}\n\n最近内容，只用于理解背景，不要逐字照抄：\n${context}`,
            },
          ],
        });
        const parsed = JSON.parse(reply) as Partial<{ summary: string; results: BrowserSearchResult[] }>;
        if (parsed.summary && Array.isArray(parsed.results) && parsed.results.length > 0) {
          const results = parsed.results
            .filter((item) => item && item.title && item.url && item.snippet)
            .slice(0, 5);
          payload = { summary: parsed.summary, results };
        }
      }
      const id = addBrowserSearch({
        query: clean,
        summary: payload.summary,
        results: payload.results,
        source: activeApiBaseUrl && activeModel ? 'model' : 'generated',
      });
      setActiveId(id);
      setQuery('');
      setStatus('已生成搜索页。');
    } catch {
      const payload = makeFallbackBrowserResults(clean, context);
      const id = addBrowserSearch({
        query: clean,
        summary: payload.summary,
        results: payload.results,
        source: 'generated',
      });
      setActiveId(id);
      setStatus('模型生成失败，已使用本地搜索页。');
    } finally {
      setIsSearching(false);
    }
  };

  const goBrowserBack = () => {
    if (openedResult) {
      setOpenedResult(null);
      return;
    }
    if (browserPanel !== 'results') {
      setBrowserPanel('results');
      return;
    }
    if (activeRecord) {
      setActiveId(null);
      return;
    }
    useAppStore.getState().goBack();
  };

  const refreshBrowser = () => {
    const target = openedResult?.title || activeRecord?.query || query;
    if (target.trim()) void runSearch(target);
  };

  const openResult = (result: BrowserSearchResult) => {
    setOpenedResult(result);
    addBrowserHistory({ title: result.title, url: result.url, query: activeRecord?.query });
  };

  const bookmarkResult = (result: BrowserSearchResult) => {
    addBrowserBookmark({ title: result.title, url: result.url, snippet: result.snippet });
    setStatus('已加入书签。');
  };

  const importBrowserWorldBook = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const utf8Text = new TextDecoder('utf-8').decode(buffer);
    const repairedText = repairMojibake(utf8Text);
    const finalText = /�|锟|Â|Ã|æ|ç|è|é/.test(repairedText)
      ? new TextDecoder('gb18030').decode(buffer)
      : repairedText;
    setBrowserWorldBook(finalText);
    setStatus(`已导入世界书：${file.name}`);
    event.target.value = '';
  };

  return (
    <section className="browser-app no-scrollbar h-full overflow-y-auto">
      <div className="browser-tabs">
        <div className="browser-tab active"><Search className="h-3.5 w-3.5" />新标签页</div>
        <button onClick={goBrowserBack} className="browser-window-button"><ChevronLeft className="h-4 w-4" /></button>
      </div>
      <div className="browser-toolbar">
        <button onClick={goBrowserBack} className="browser-tool"><ChevronLeft className="h-4 w-4" /></button>
        <button onClick={refreshBrowser} className="browser-tool"><RefreshCw className={cn('h-4 w-4', isSearching && 'animate-spin')} /></button>
        <div className="browser-address">
          <Shield className="h-4 w-4 text-[#188038]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && runSearch()} placeholder="搜索或输入网址" />
          <button onClick={() => runSearch()} disabled={isSearching}>{isSearching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}</button>
        </div>
        <button onClick={() => setBrowserPanel(browserPanel === 'settings' ? 'results' : 'settings')} className="browser-tool"><MoreHorizontal className="h-4 w-4" /></button>
      </div>

      {!activeRecord && (
        <div className="browser-home">
          <div className="browser-logo"><span>Edge</span> Search</div>
          <div className="browser-home-search">
            <Search className="h-5 w-5" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && runSearch()} placeholder="搜索世界观、最近事件或网址" />
          </div>
          {status && <p className="browser-status">{status}</p>}
        </div>
      )}

      {openedResult && (
        <div className="browser-content">
          <div className="browser-page-view">
            <div className="browser-site-line">
              <span>{getBrowserHost(openedResult.url)}</span>
              <small>{openedResult.url}</small>
            </div>
            <h2>{openedResult.title}</h2>
            <p>{openedResult.snippet}</p>
            <div className="browser-article-body">
              <p>页面内容根据当前背景世界观整理，保留真实网页的口吻和结构。</p>
              <p>相关讨论里更关注人物动机、细节时间线和旁观者的生活化反应，所以读起来不像档案，更像刚被人搜到的一页。</p>
            </div>
            <button onClick={() => bookmarkResult(openedResult)} className="browser-action-button"><Star className="h-4 w-4" />加入书签</button>
          </div>
        </div>
      )}

      {!openedResult && browserPanel === 'settings' && (
        <div className="browser-content">
          <div className="browser-result-header">
            <div>
              <p>浏览器设置</p>
              <h2>世界书</h2>
            </div>
          </div>
          <input ref={worldBookInputRef} type="file" accept=".txt,.json,.md" onChange={importBrowserWorldBook} className="hidden" />
          <button onClick={() => worldBookInputRef.current?.click()} className="browser-action-button"><Import className="h-4 w-4" />导入世界书</button>
          <textarea value={browserWorldBook} onChange={(event) => setBrowserWorldBook(event.target.value)} className="browser-worldbook-input" placeholder="粘贴或导入浏览器生成时要参考的世界书。" />
          <div className="browser-settings-grid">
            <input value={browserApiBaseUrl} onChange={(event) => setBrowserApiConfig({ browserApiBaseUrl: event.target.value })} className="browser-setting-input" placeholder="浏览器专属 API 地址" />
            <input value={browserSelectedModel} onChange={(event) => setBrowserApiConfig({ browserSelectedModel: event.target.value })} className="browser-setting-input" placeholder="浏览器专属模型" />
            <input value={browserApiKey} onChange={(event) => setBrowserApiConfig({ browserApiKey: event.target.value })} className="browser-setting-input" type="password" placeholder="浏览器专属 API Key" />
          </div>
        </div>
      )}

      {!openedResult && browserPanel === 'bookmarks' && (
        <div className="browser-content">
          <div className="browser-result-header"><div><p>收藏夹</p><h2>书签</h2></div></div>
          {browserBookmarks.length === 0 && <p className="browser-summary">还没有书签。</p>}
          {browserBookmarks.map((bookmark) => (
            <article key={bookmark.id} className="browser-result-card">
              <button onClick={() => openResult(bookmark)} className="w-full text-left">
                <div className="browser-site-line"><span>{bookmark.url.replace(/^https?:\/\//, '').split('/')[0]}</span><small>{bookmark.url}</small></div>
                <h3>{bookmark.title}</h3>
                <p>{bookmark.snippet}</p>
              </button>
              <button onClick={() => deleteBrowserBookmark(bookmark.id)} className="browser-inline-delete"><Trash2 className="h-4 w-4" />删除</button>
            </article>
          ))}
        </div>
      )}

      {!openedResult && browserPanel === 'history' && (
        <div className="browser-content">
          <div className="browser-result-header">
            <div><p>浏览记录</p><h2>历史</h2></div>
            <button onClick={clearBrowserHistory}><Trash2 className="h-4 w-4" /></button>
          </div>
          {browserHistory.length === 0 && <p className="browser-summary">还没有浏览历史。</p>}
          {browserHistory.map((item) => (
            <button key={item.id} onClick={() => openResult({ title: item.title, url: item.url, snippet: item.query ? `来自「${item.query}」的浏览记录。` : '浏览记录。' })} className="browser-history-row">
              <span>{item.title}</span>
              <small>{new Date(item.visitedAt).toLocaleString('zh-CN')}</small>
            </button>
          ))}
        </div>
      )}

      {!openedResult && browserPanel === 'results' && activeRecord && (
        <div className="browser-content">
          <div className="browser-result-header">
            <div>
              <p>搜索结果</p>
              <h2>{activeRecord.query}</h2>
            </div>
            <button onClick={() => deleteBrowserSearch(activeRecord.id)}><Trash2 className="h-4 w-4" /></button>
          </div>
          <p className="browser-summary">{activeRecord.summary}</p>
          <div className="browser-result-list">
            {activeRecord.results.map((result) => {
              let host = result.url;
              try {
                host = getBrowserHost(result.url);
              } catch {
                host = getBrowserHost(result.url);
              }
              return (
                <article key={`${activeRecord.id}-${result.url}`} className="browser-result-card">
                  <button onClick={() => openResult(result)} className="w-full text-left">
                    <div className="browser-site-line">
                      <span>{host}</span>
                      <small>{result.url}</small>
                    </div>
                    <h3>{result.title}</h3>
                    <p>{result.snippet}</p>
                  </button>
                  <button onClick={() => bookmarkResult(result)} className="browser-inline-delete"><Star className="h-4 w-4" />收藏</button>
                </article>
              );
            })}
          </div>
        </div>
      )}

      <div className="browser-history">
        <button onClick={() => setBrowserPanel('bookmarks')} className={cn(browserPanel === 'bookmarks' && 'active')}>
          <Star className="h-4 w-4" />
          <span>书签</span>
        </button>
        <button onClick={() => setBrowserPanel('history')} className={cn(browserPanel === 'history' && 'active')}>
          <Clock className="h-4 w-4" />
          <span>历史</span>
        </button>
        {browserSearches.slice(0, 8).map((record) => (
          <button key={record.id} onClick={() => { setOpenedResult(null); setBrowserPanel('results'); setActiveId(record.id); }} className={cn(activeRecord?.id === record.id && browserPanel === 'results' && 'active')}>
            <Search className="h-4 w-4" />
            <span>{record.query}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function SettingsScreen() {
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
    addAppLog,
  } = useAppStore();
  const [tab, setTab] = useState<'model' | 'tts' | 'image'>('model');
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
          <Field icon={<Palette />} label="生图接口地址">
            <input className="hand-input w-full" defaultValue="http://127.0.0.1:7860" />
          </Field>
          <Field icon={<ImageIcon />} label="默认尺寸">
            <input className="hand-input w-full" defaultValue="768 x 1024" />
          </Field>
          <button className="fetch-button mt-2">保存生图配置</button>
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

function LogsScreen() {
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

function ThemesScreen() {
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

function AIContextScreen() {
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

const phonePromptBlocks = [
  { name: 'Main Prompt', role: 'system', position: '顶部', depth: '无', desc: '控制小手机聊天的总规则：自然回复，不复述上下文，不替用户行动。' },
  { name: 'Character', role: 'system', position: '聊天历史前', depth: '无', desc: '角色卡、人设、性格、开场白、系统提示和角色世界书。' },
  { name: 'User / Persona', role: 'system', position: '聊天历史前', depth: '无', desc: '用户昵称、状态、关系边界和当前可见的用户资料。' },
  { name: 'Phone Context', role: 'system', position: '聊天历史前', depth: '无', desc: '当前角色独立的微信、QQ、日记、音乐、浏览等上下文包。' },
  { name: 'Chat History', role: 'user / assistant', position: '聊天历史', depth: '按设置', desc: '最近聊天记录，按上下文消息数截取。' },
  { name: 'Current Message', role: 'user', position: '末尾', depth: '无', desc: '用户最新发送的消息。' },
];

const browserPromptBlocks = [
  { name: 'Browser System', role: 'system', desc: '你是虚拟手机里的浏览器搜索页。输出严格 JSON，不要 Markdown。' },
  { name: 'Browser Style', role: 'system', desc: '搜索结果像真实互联网内容，不出现开发说明、example.com、phone://。' },
  { name: 'Browser Input', role: 'user', desc: '搜索词、浏览器世界书、最近背景摘要。' },
];

function PresetsScreen() {
  const { presetName, setPresetName, browserPresetName, browserPresetPrompt, setModelConfig } = useAppStore();
  return (
    <section className="no-scrollbar h-full overflow-y-auto pb-8">
      <Header title="预设" subtitle="参考酒馆 Prompt Manager 的块结构" />
      <Panel>
        {presetCards.map(([name, desc]) => (
          <button key={name} onClick={() => setPresetName(name)} className={cn('theme-card mb-3 last:mb-0', presetName === name && 'active')}>
            <p className="text-lg font-black">{name}</p>
            <p className="text-sm font-bold opacity-65">{desc}</p>
          </button>
        ))}
      </Panel>
      <Panel>
        <p className="text-lg font-black">聊天 Prompt 块</p>
        <p className="mt-1 text-sm font-bold opacity-65">后续导入酒馆预设时，按 role、顺序、位置和 depth 映射到这些块。</p>
        <div className="mt-4 overflow-hidden rounded-[18px] border-[3px] border-[#111] bg-white/65">
          {phonePromptBlocks.map((block) => (
            <div key={block.name} className="grid grid-cols-[1fr_86px] gap-3 border-b-[2px] border-[#111]/15 p-3 last:border-b-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-black">{block.name}</p>
                <p className="mt-1 text-xs font-bold opacity-60">{block.desc}</p>
              </div>
              <div className="text-right text-[11px] font-black opacity-70">
                <p>{block.role}</p>
                <p>{block.position}</p>
                <p>depth: {block.depth}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs font-bold opacity-60">assistant 末尾预填默认关闭。只有用户明确设置“回复开头 / 续写前缀”时，才把 assistant 放在最后。</p>
      </Panel>
      <Panel>
        <p className="text-lg font-black">浏览器专属预设</p>
        <p className="mt-1 text-sm font-bold opacity-65">浏览器只生成搜索页，不再使用“用户助手 / AI助手”式 assistant 预填。</p>
        <div className="mt-4 grid gap-2">
          {browserPromptBlocks.map((block) => (
            <div key={block.name} className="rounded-[16px] border-[2px] border-[#111]/20 bg-white/60 p-3">
              <p className="text-sm font-black">{block.name} · {block.role}</p>
              <p className="mt-1 text-xs font-bold opacity-60">{block.desc}</p>
            </div>
          ))}
        </div>
        <Field icon={<Search />} label="预设名称">
          <input value={browserPresetName} onChange={(event) => setModelConfig({ browserPresetName: event.target.value })} className="hand-input w-full" />
        </Field>
        <Field icon={<FileText />} label="预设内容">
          <textarea
            value={browserPresetPrompt}
            onChange={(event) => setModelConfig({ browserPresetName: '自定义浏览器预设', browserPresetPrompt: event.target.value })}
            className="hand-input min-h-40 w-full resize-none"
          />
        </Field>
      </Panel>
    </section>
  );
}

function stringifyWorldBook(worldBook: unknown) {
  if (typeof worldBook === 'string') return repairMojibake(worldBook);
  try {
    return repairMojibake(JSON.stringify(worldBook || {}, null, 2));
  } catch {
    return '';
  }
}

function parseWorldBookDraft(draft: string) {
  try {
    return JSON.parse(repairMojibake(draft) || '{}');
  } catch {
    return repairMojibake(draft);
  }
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

function ContactsScreen() {
  const { characters, addCharacter, updateCharacter, openChat } = useAppStore();
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
    const worldBookText = worldBookDrafts[character.id] ?? stringifyWorldBook(character.worldBook);
    const saveCharacter = () => {
      const draft = worldBookDrafts[character.id];
      if (draft !== undefined) {
        updateCharacter(character.id, { worldBook: parseWorldBookDraft(draft) });
      }
      setEditingId(null);
    };
    return (
      <section className="h-full overflow-y-auto pb-8">
        <Header title="角色资料" subtitle="人设、世界书和开场白都可以自己改" onSave={saveCharacter} />
        <Panel>
          <div className="mb-4 flex items-center gap-3">
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
            <textarea value={character.description} onChange={(event) => updateCharacter(character.id, { description: event.target.value })} className="hand-input min-h-28 w-full resize-none" />
          </Field>
          <Field icon={<Sparkles />} label="性格 / Personality">
            <textarea value={character.personality} onChange={(event) => updateCharacter(character.id, { personality: event.target.value })} className="hand-input min-h-24 w-full resize-none" />
          </Field>
          <Field icon={<MessageCircle />} label="开场白">
            <textarea value={character.firstMessage} onChange={(event) => updateCharacter(character.id, { firstMessage: event.target.value })} className="hand-input min-h-24 w-full resize-none" />
          </Field>
          <Field icon={<Shield />} label="系统提示词">
            <textarea value={character.systemPrompt} onChange={(event) => updateCharacter(character.id, { systemPrompt: event.target.value })} className="hand-input min-h-24 w-full resize-none" />
          </Field>
          <Field icon={<FileText />} label="世界书 / World Book JSON">
            <textarea
              value={worldBookText}
              onChange={(event) => setWorldBookDrafts((state) => ({ ...state, [character.id]: event.target.value }))}
              className="hand-input min-h-32 w-full resize-none font-mono text-xs"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => openChat(character.id, 'wechat')} className="fetch-button">微信聊天</button>
            <button onClick={saveCharacter} className="fetch-button bg-[#fff0bd]">保存返回</button>
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

type MemoTab = 'all' | 'pinned' | 'tag' | 'todo' | 'locked';
type MemoDraft = {
  title: string;
  content: string;
  type: MemoEntryType;
  tags: string[];
  color: MemoEntryColor;
  characterId: string;
  readableByChar: boolean;
  reminderDate: string;
  reminderTime: string;
  pinned: boolean;
  locked: boolean;
  completed: boolean;
};

const memoTypeLabels: Record<MemoEntryType, string> = {
  note: '普通',
  todo: '待办',
  idea: '灵感',
};

const memoColorClasses: Record<MemoEntryColor, string> = {
  yellow: 'bg-[#fff0b8]',
  green: 'bg-[#dceecd]',
  blue: 'bg-[#d9e8f6]',
  pink: 'bg-[#ffe1ec]',
  white: 'bg-white/70',
};

function emptyMemoDraft(): MemoDraft {
  return {
    title: '',
    content: '',
    type: 'note',
    tags: [],
    color: 'yellow',
    characterId: '',
    readableByChar: true,
    reminderDate: '',
    reminderTime: '',
    pinned: false,
    locked: false,
    completed: false,
  };
}

function memoDraftFromEntry(entry: MemoEntry): MemoDraft {
  const reminder = entry.reminderAt ? new Date(entry.reminderAt) : null;
  return {
    title: entry.title,
    content: entry.content,
    type: entry.type,
    tags: entry.tags,
    color: entry.color || 'yellow',
    characterId: entry.characterId || '',
    readableByChar: entry.readableByChar !== false,
    reminderDate: reminder ? formatDateInput(reminder.getTime()) : '',
    reminderTime: reminder ? formatTimeInput(reminder.getTime()) : '',
    pinned: Boolean(entry.pinned),
    locked: Boolean(entry.locked),
    completed: Boolean(entry.completed),
  };
}

function memoReminderFromDraft(draft: MemoDraft) {
  if (!draft.reminderDate) return undefined;
  return new Date(`${draft.reminderDate}T${draft.reminderTime || '09:00'}`).getTime();
}

function defaultCharMemoTime() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return date.getTime();
}

function formatDateTimeInput(timestamp: number) {
  const date = new Date(timestamp);
  return `${formatDateInput(timestamp)}T${date.toTimeString().slice(0, 5)}`;
}

function getMemoSummary(entry: MemoEntry) {
  return entry.content.replace(/\s+/g, ' ').slice(0, 72) || '还没有正文';
}

function sortMemos(entries: MemoEntry[]) {
  return [...entries].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
}

function MemoScreen() {
  const {
    characters,
    memos,
    memoTags,
    addMemoEntry,
    updateMemoEntry,
    deleteMemoEntry,
    toggleMemoPinned,
    toggleMemoLocked,
    toggleMemoCompleted,
    addMemoTag,
    deleteMemoTag,
    addCalendarEvent,
    memoCharWriter,
    setMemoCharWriter,
  } = useAppStore();
  const [tab, setTab] = useState<MemoTab>('all');
  const [view, setView] = useState<'list' | 'edit' | 'detail' | 'tags' | 'char-settings'>('list');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MemoDraft>(() => emptyMemoDraft());
  const [quickText, setQuickText] = useState('');
  const [tagDraft, setTagDraft] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [charMemoCharacterId, setCharMemoCharacterId] = useState(() => memoCharWriter.characterId || '');
  const [charMemoAt, setCharMemoAt] = useState(() => formatDateTimeInput(memoCharWriter.scheduledAt || defaultCharMemoTime()));
  const [charMemoStatus, setCharMemoStatus] = useState('');
  const activeMemo = memos.find((memo) => memo.id === activeId) || null;
  const filteredMemos = sortMemos(memos).filter((memo) => {
    if (tab === 'pinned') return memo.pinned;
    if (tab === 'tag') return selectedTag ? memo.tags.includes(selectedTag) : false;
    if (tab === 'todo') return memo.type === 'todo';
    if (tab === 'locked') return memo.locked;
    return true;
  });
  const visibleCount = memos.filter((memo) => !memo.locked).length;
  const emptyMemoText = tab === 'pinned'
    ? '还没有收藏备忘。'
    : tab === 'todo'
      ? '还没有待办备忘。'
      : tab === 'locked'
        ? '还没有锁定备忘。'
        : tab === 'tag'
          ? selectedTag ? `没有「${selectedTag}」标签的备忘。` : '先选择一个标签。'
          : '这里还没有备忘。';

  const openNew = (preset?: Partial<MemoDraft>) => {
    setActiveId(null);
    setDraft({ ...emptyMemoDraft(), ...preset });
    setView('edit');
  };
  const openEdit = (entry: MemoEntry) => {
    setActiveId(entry.id);
    setDraft(memoDraftFromEntry(entry));
    setView('edit');
  };
  const openDetail = (entry: MemoEntry) => {
    setActiveId(entry.id);
    setView('detail');
  };
  const saveMemo = () => {
    const content = draft.content.trim();
    if (!content) return;
    const payload = {
      title: draft.title.trim() || content.slice(0, 18),
      content,
      type: draft.type,
      tags: draft.tags,
      color: draft.color,
      characterId: draft.characterId || undefined,
      readableByChar: draft.locked ? false : draft.readableByChar,
      reminderAt: memoReminderFromDraft(draft),
      pinned: draft.pinned,
      locked: draft.locked,
      completed: draft.completed,
      source: 'manual' as const,
    };
    if (activeId) {
      updateMemoEntry(activeId, payload);
      setView('detail');
      return;
    }
    const id = addMemoEntry(payload);
    setActiveId(id);
    setView('detail');
  };
  const quickAdd = () => {
    const content = quickText.trim();
    if (!content) return;
    const id = addMemoEntry({
      title: content.slice(0, 18),
      content,
      type: 'note',
      tags: [],
      color: 'yellow',
      readableByChar: true,
      source: 'manual',
    });
    setQuickText('');
    setActiveId(id);
  };
  const toggleDraftTag = (tag: string) => {
    setDraft((current) => ({
      ...current,
      tags: current.tags.includes(tag) ? current.tags.filter((item) => item !== tag) : [...current.tags, tag],
    }));
  };
  const createTag = () => {
    const tag = tagDraft.trim();
    if (!tag) return;
    addMemoTag(tag);
    setDraft((current) => current.tags.includes(tag) ? current : { ...current, tags: [...current.tags, tag] });
    setTagDraft('');
  };
  const sendMemoToCalendar = (entry: MemoEntry) => {
    const startAt = entry.reminderAt || Date.now();
    addCalendarEvent({
      owner: 'user',
      title: entry.title,
      note: entry.content,
      startAt,
      allDay: !entry.reminderAt,
      repeat: 'none',
      reminderAt: entry.reminderAt,
      tags: entry.tags.length > 0 ? entry.tags : ['备忘录'],
      source: 'memo',
      relatedDiaryIds: [],
      relatedMessageIds: [],
      favorite: false,
    });
  };
  const saveCharMemoSettings = () => {
    const character = characters.find((item) => item.id === charMemoCharacterId) || characters[0];
    if (!character) {
      setCharMemoStatus('先导入或选择一个角色。');
      return;
    }
    const reminderAt = new Date(charMemoAt || formatDateTimeInput(defaultCharMemoTime())).getTime();
    const scheduledAt = Number.isNaN(reminderAt) ? defaultCharMemoTime() : reminderAt;
    setMemoCharWriter({
      characterId: character.id,
      scheduledAt,
      enabled: true,
      lastRunAt: undefined,
    });
    setCharMemoStatus(`已设置：${character.name} 会在 ${new Date(scheduledAt).toLocaleString('zh-CN')} 写备忘。`);
  };

  if (view === 'edit') {
    return (
      <section className="h-full overflow-y-auto pb-8">
        <Header title={activeId ? '编辑备忘' : '新增备忘'} subtitle="标题、正文、标签和提醒" onBack={() => setView(activeId ? 'detail' : 'list')} onSave={saveMemo} saveLabel={activeId ? '更新' : '添加'} />
        <Panel>
          <Field icon={<FileText />} label="标题">
            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="hand-input w-full" placeholder="可留空，自动取正文开头" />
          </Field>
          <Field icon={<BookOpen />} label="正文">
            <textarea value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} className="hand-input min-h-[150px] w-full resize-none" placeholder="写下要记住的事" />
          </Field>
          <Field icon={<Sparkles />} label="类型">
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(memoTypeLabels) as MemoEntryType[]).map((type) => (
                <button key={type} onClick={() => setDraft({ ...draft, type })} className={cn('pill w-full', draft.type === type && 'active')}>{memoTypeLabels[type]}</button>
              ))}
            </div>
          </Field>
          <Field icon={<Palette />} label="颜色">
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(memoColorClasses) as MemoEntryColor[]).map((color) => (
                <button key={color} onClick={() => setDraft({ ...draft, color })} aria-label={color} className={cn('h-10 rounded-2xl border-[3px] border-[#111]', memoColorClasses[color], draft.color === color && 'ring-4 ring-[#111]/20')} />
              ))}
            </div>
          </Field>
          <Field icon={<Tag />} label="标签">
            <div className="flex flex-wrap gap-2">
              {memoTags.map((tag) => (
                <button key={tag} onClick={() => toggleDraftTag(tag)} className={cn('pill', draft.tags.includes(tag) && 'active')}>{tag}</button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-[1fr_74px] gap-2">
              <input value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} className="hand-input min-w-0" placeholder="新标签" />
              <button onClick={createTag} className="save-button w-full">添加</button>
            </div>
          </Field>
          <Field icon={<CalendarDays />} label="提醒">
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={draft.reminderDate} onChange={(event) => setDraft({ ...draft, reminderDate: event.target.value })} className="hand-input w-full" />
              <input type="time" value={draft.reminderTime} onChange={(event) => setDraft({ ...draft, reminderTime: event.target.value })} className="hand-input w-full" />
            </div>
          </Field>
          <Field icon={<CircleUserRound />} label="查手机可见">
            <select value={draft.characterId} onChange={(event) => setDraft({ ...draft, characterId: event.target.value })} className="hand-input mb-3 w-full">
              <option value="">所有 char / 未指定</option>
              {characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setDraft({ ...draft, readableByChar: !draft.readableByChar })} className={cn('pill w-full', draft.readableByChar && !draft.locked && 'active')}>允许查看</button>
              <button onClick={() => setDraft({ ...draft, locked: !draft.locked, readableByChar: draft.locked ? draft.readableByChar : false })} className={cn('pill w-full', draft.locked && 'active')}>锁定</button>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setDraft({ ...draft, pinned: !draft.pinned })} className={cn('pill w-full', draft.pinned && 'active')}>收藏</button>
            <button onClick={() => setDraft({ ...draft, completed: !draft.completed })} className={cn('pill w-full', draft.completed && 'active')}>完成</button>
          </div>
        </Panel>
      </section>
    );
  }

  if (view === 'detail' && activeMemo) {
    const character = characters.find((item) => item.id === activeMemo.characterId);
    return (
      <section className="no-scrollbar h-full overflow-y-auto pb-8">
        <Header title="备忘详情" subtitle={formatDiaryDate(activeMemo.updatedAt)} onBack={() => setView('list')} />
        <Panel className={memoColorClasses[activeMemo.color || 'yellow']}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={cn('text-2xl font-black leading-tight', activeMemo.completed && 'line-through opacity-60')}>{activeMemo.title}</p>
              <p className="mt-2 text-xs font-black opacity-60">{memoTypeLabels[activeMemo.type]} · {activeMemo.locked ? '已锁定' : activeMemo.readableByChar ? '查手机可见' : '仅自己可见'}{character ? ` · ${character.name}` : ''}</p>
            </div>
            <button onClick={() => toggleMemoPinned(activeMemo.id)} className={cn('circle-button small shrink-0', activeMemo.pinned && 'bg-[#fff0b8]')}>
              <Star className={cn('h-5 w-5', activeMemo.pinned && 'fill-[#111]')} />
            </button>
          </div>
          <p className="mt-5 whitespace-pre-wrap rounded-2xl bg-white/55 p-4 text-sm font-bold leading-7">{activeMemo.locked ? '这条备忘已锁定。' : activeMemo.content}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {activeMemo.tags.map((tag) => <span key={tag} className="rounded-full border-[2px] border-[#111] bg-white/70 px-3 py-1 text-xs font-black">{tag}</span>)}
            {activeMemo.reminderAt && <span className="rounded-full border-[2px] border-[#111] bg-white/70 px-3 py-1 text-xs font-black">提醒 {formatDateLabel(activeMemo.reminderAt)} {formatTimeInput(activeMemo.reminderAt)}</span>}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button onClick={() => openEdit(activeMemo)} className="fetch-button">编辑</button>
            <button onClick={() => toggleMemoCompleted(activeMemo.id)} className="fetch-button bg-[#edf7ed]">{activeMemo.completed ? '取消完成' : '完成'}</button>
            <button onClick={() => toggleMemoLocked(activeMemo.id)} className="fetch-button">{activeMemo.locked ? '解锁' : '锁定'}</button>
            <button onClick={() => sendMemoToCalendar(activeMemo)} className="fetch-button bg-[#fff0bd]">转日历</button>
            <button onClick={() => { deleteMemoEntry(activeMemo.id); setActiveId(null); setView('list'); }} className="fetch-button bg-[#ffd6d6]">
              删除
            </button>
          </div>
        </Panel>
      </section>
    );
  }

  if (view === 'char-settings') {
    const selectedCharacter = characters.find((item) => item.id === charMemoCharacterId) || characters.find((item) => item.id === memoCharWriter.characterId) || characters[0];
    return (
      <section className="no-scrollbar h-full overflow-y-auto pb-8">
        <Header title="char 备忘设置" subtitle="到点自动综合最近内容生成" onBack={() => setView('list')} onSave={saveCharMemoSettings} saveLabel="保存" />
        <Panel>
          <Field icon={<Bot />} label="固定角色">
            <select value={charMemoCharacterId || memoCharWriter.characterId || ''} onChange={(event) => setCharMemoCharacterId(event.target.value)} className="hand-input w-full">
              <option value="">默认第一个角色</option>
              {characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
            </select>
          </Field>
          <Field icon={<CalendarDays />} label="生成时间">
            <input type="datetime-local" value={charMemoAt} onChange={(event) => setCharMemoAt(event.target.value)} className="hand-input w-full" />
          </Field>
          <div className="rounded-2xl bg-white/60 p-4 text-sm font-black leading-7 opacity-75">
            到这个时间后，{selectedCharacter?.name || 'char'} 会根据最近聊天、朋友圈、小红书笔记、日记、日历、相册、订单和已有备忘写一条新备忘。生成后会自动收藏。
          </div>
          <button onClick={saveCharMemoSettings} className="fetch-button mt-4 bg-[#fff0bd]">
            <Bot className="h-5 w-5" />
            保存定时
          </button>
          {memoCharWriter.enabled && memoCharWriter.scheduledAt && (
            <p className="mt-3 text-xs font-black opacity-60">当前启用：{new Date(memoCharWriter.scheduledAt).toLocaleString('zh-CN')}</p>
          )}
          {charMemoStatus && <p className="mt-3 text-xs font-black opacity-60">{charMemoStatus}</p>}
        </Panel>
      </section>
    );
  }

  if (view === 'tags') {
    return (
      <section className="no-scrollbar h-full overflow-y-auto pb-8">
        <Header title="标签管理" subtitle="整理备忘录标签" onBack={() => setView('list')} />
        <Panel>
          <div className="grid grid-cols-[1fr_74px] gap-2">
            <input value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} className="hand-input min-w-0" placeholder="新标签" />
            <button onClick={createTag} className="save-button w-full">添加</button>
          </div>
          <div className="mt-4 grid gap-2">
            {memoTags.map((tag) => (
              <div key={tag} className="flex items-center justify-between gap-3 border-b-[2px] border-[#111]/15 py-3 last:border-b-0">
                <span className="text-sm font-black">{tag}</span>
                <button onClick={() => deleteMemoTag(tag)} className="circle-button small"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    );
  }

  return (
    <section className="no-scrollbar h-full overflow-y-auto pb-8">
      <Header
        title="备忘录"
        subtitle={`${memos.length} 条备忘 · ${visibleCount} 条可给 char 看`}
        onSave={() => openNew()}
        saveLabel="新增"
        tabs={
          <>
            <Pill active={tab === 'all'} icon={<FileText />} label="全部" onClick={() => setTab('all')} />
            <Pill active={tab === 'pinned'} icon={<Star />} label="收藏" onClick={() => setTab('pinned')} />
            <Pill active={tab === 'tag'} icon={<Tag />} label="标签" onClick={() => setTab('tag')} />
            <Pill active={tab === 'todo'} icon={<Check />} label="待办" onClick={() => setTab('todo')} />
            <Pill active={tab === 'locked'} icon={<LockKeyhole />} label="已锁" onClick={() => setTab('locked')} />
          </>
        }
      />
      {tab === 'all' && (
        <>
          <Panel>
            <textarea value={quickText} onChange={(event) => setQuickText(event.target.value)} placeholder="快速新增备忘..." className="hand-input min-h-[88px] w-full resize-none" />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button onClick={quickAdd} className="fetch-button">
                <Plus className="h-5 w-5" />
                快速添加
              </button>
              <button onClick={() => setView('tags')} className="fetch-button bg-[#fff0bd]">
                <Tag className="h-5 w-5" />
                管理标签
              </button>
              <button onClick={() => setView('char-settings')} className="fetch-button col-span-2 bg-[#edf7ed]">
                <Bot className="h-5 w-5" />
                char 备忘设置
              </button>
            </div>
          </Panel>
        </>
      )}
      {tab === 'tag' && (
        <Panel>
          <p className="mb-3 text-lg font-black">按标签筛选</p>
          <div className="grid grid-cols-2 gap-2">
            {memoTags.map((tag) => (
              <button key={tag} onClick={() => setSelectedTag(tag)} className={cn('fetch-button py-3 text-sm', selectedTag === tag && 'bg-[#fff0bd]')}>
                <Tag className="h-4 w-4" />
                {tag}
              </button>
            ))}
          </div>
          {memoTags.length === 0 && <Empty text="还没有标签。" />}
        </Panel>
      )}
      <Panel>
        {filteredMemos.length === 0 && <Empty text={emptyMemoText} />}
        {filteredMemos.map((memo) => (
          <button key={memo.id} onClick={() => openDetail(memo)} className={cn('mb-3 block w-full rounded-2xl border-[2px] border-[#111]/15 p-4 text-left last:mb-0', memoColorClasses[memo.color || 'yellow'])}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={cn('text-base font-black leading-tight', memo.completed && 'line-through opacity-55')}>{memo.locked ? '已锁定备忘' : memo.title}</p>
                <p className="mt-1 line-clamp-2 text-sm font-bold opacity-65">{memo.locked ? '内容已隐藏' : getMemoSummary(memo)}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                {memo.pinned && <Star className="h-4 w-4 fill-[#111]" />}
                {memo.locked && <LockKeyhole className="h-4 w-4" />}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-black">{memoTypeLabels[memo.type]}</span>
              {memo.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-black">{tag}</span>)}
              {memo.reminderAt && <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-black">{formatDateLabel(memo.reminderAt)}</span>}
            </div>
          </button>
        ))}
      </Panel>
    </section>
  );
}

function Pill({ icon, label, active, onClick }: { key?: React.Key; icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={cn('pill', active && 'active')}>
      {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'h-4 w-4' })}
      {label}
    </button>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="mb-5 block last:mb-0">
      <span className="mb-2 flex items-center gap-2 text-lg font-black">
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'h-5 w-5' })}
        {label}
      </span>
      {children}
    </label>
  );
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('hand-panel mx-4 mt-4 p-5', className)}>{children}</div>;
}

function Row({ icon, title, desc }: { key?: React.Key; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-3 border-b-[2px] border-[#111]/15 py-3 last:border-b-0">
      <div className="app-chip">
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'h-5 w-5' })}
      </div>
      <div className="min-w-0">
        <p className="text-lg font-black">{title}</p>
        <p className="line-clamp-2 text-sm font-bold opacity-60">{desc}</p>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm font-black opacity-55">{text}</p>;
}

function EmptyScreen({ title }: { title: string }) {
  return (
    <section className="h-full overflow-y-auto pb-8">
      <Header title={title} />
      <Empty text="返回桌面重新选择。" />
    </section>
  );
}

function Avatar({ character, large }: { character?: Character; large?: boolean }) {
  const size = large ? 'h-24 w-24' : 'h-12 w-12';
  return (
    <div className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border-[3px] border-[#111] bg-white', size)}>
      {character?.avatar ? <img src={character.avatar} className="h-full w-full object-cover" /> : <CircleUserRound className="h-1/2 w-1/2 opacity-60" />}
    </div>
  );
}

function CallButton({ icon, label, danger, onClick }: { icon: React.ReactNode; label: string; danger?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={cn('call-button', danger ? 'bg-[#ff7b7b]' : 'bg-white')}>
      {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'h-5 w-5' })}
      {label}
    </button>
  );
}

