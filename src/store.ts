/**
 * Global Zustand store for the small phone prototype.
 * Exports/types: Character, ChatMessage, ChatSession, PhoneCallRecord, DiaryEntry, CalendarEvent, GalleryPhoto, XiaohongshuNote, XiaohongshuProfile, CustomWidget, ThemeType, Screen, useAppStore.
 * Store actions: addCharacter, updateCharacter, openChat, add/delete/favorite/recall message with optional speakerId,
 * phone call record add/update/delete/favorite helpers, theme/profile/photo/sticker/group/tag/order/API/chat-preset setters,
 * diary/calendar/gallery/memo/xiaohongshu/B站 helpers, desktop layout/widget helpers, migration for persisted data and default diary cleanup.
 * Dependencies: zustand persist middleware, createId from src/lib/utils.ts, Bilibili types from src/apps/bilibili/bilibiliTypes.ts, defaultTtsConfig from src/tts.ts.
 * Persistence: localStorage key char-phone-framework; update version + migrate whenever old data must be corrected.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BilibiliSearchRecord, BilibiliVideoEntry } from './apps/bilibili/bilibiliTypes';
import { createId } from './lib/utils';
import type { TheaterLengthKey, TheaterStyleKey, TheaterTopicDraft } from './theaterLogic';
import { defaultTtsConfig, type TtsConfig } from './tts';
import { normalizeXiaohongshuNotes, normalizeXiaohongshuProfile } from './apps/xiaohongshu/xiaohongshuLogic';
import type { XiaohongshuNote, XiaohongshuProfile } from './apps/xiaohongshu/types';

export type { XiaohongshuNote, XiaohongshuProfile } from './apps/xiaohongshu/types';
import { starterStickerItems } from './apps/wechat/stickers/stickerPacks';

export interface Character {
  id: string;
  name: string;
  avatar: string;
  description: string;
  personality: string;
  firstMessage: string;
  systemPrompt: string;
  worldBook?: unknown;
  wallpaper?: string;
}

export type MessageKind = 'text' | 'voice' | 'sticker' | 'image' | 'call-note' | 'transfer' | 'red-packet' | 'shopping';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  kind: MessageKind;
  duration?: number;
  transcript?: string;
  stickerLabel?: string;
  speakerId?: string;
  favorite?: boolean;
  replyTo?: string;
  recalled?: boolean;
  amount?: string;
  note?: string;
  itemName?: string;
  status?: 'pending' | 'accepted';
}

export interface ChatSession {
  id: string;
  characterId: string;
  channel: 'wechat' | 'qq';
  messages: ChatMessage[];
  lastUpdated: number;
  unread?: number;
}

export interface LayoutPosition {
  x: number;
  y: number;
}

export interface CustomWidget {
  id: string;
  page: 0 | 1;
  type: 'note' | 'status' | 'photo';
  title: string;
  content: string;
  image?: string;
  x: number;
  y: number;
}

export interface StickerItem {
  id: string;
  url: string;
  label: string;
  favorite?: boolean;
}

export interface GroupChat {
  id: string;
  name: string;
  memberIds: string[];
  createdAt: number;
}

export interface PurchaseRecord {
  id: string;
  characterId: string;
  itemName: string;
  amount: string;
  note: string;
  createdAt: number;
}

export type PhoneCallDirection = 'incoming' | 'outgoing';
export type PhoneCallStatus = 'answered' | 'missed' | 'declined' | 'canceled' | 'no-answer';

export interface PhoneCallTranscriptLine {
  speaker: 'user' | 'char';
  text: string;
  timestamp: number;
}

export interface PhoneCallRecord {
  id: string;
  characterId: string;
  direction: PhoneCallDirection;
  status: PhoneCallStatus;
  startedAt: number;
  answeredAt?: number;
  endedAt: number;
  durationSeconds: number;
  summary: string;
  transcript: PhoneCallTranscriptLine[];
  favorite?: boolean;
  noteMessageId?: string;
}

export interface BrowserSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface BrowserSearchRecord {
  id: string;
  query: string;
  summary: string;
  results: BrowserSearchResult[];
  source?: 'generated' | 'model';
  createdAt: number;
}

export interface BrowserBookmark {
  id: string;
  title: string;
  url: string;
  snippet: string;
  createdAt: number;
}

export interface TheaterScene {
  id: string;
  title: string;
  theme: string;
  characterIds: string[];
  style: TheaterStyleKey;
  length: TheaterLengthKey;
  customLengthText?: string;
  rollResult?: string;
  content: string;
  beats: string[];
  source?: 'manual' | 'ai';
  favorite?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface TheaterWorldBookEntry {
  id: string;
  comment: string;
  content: string;
  enabled: boolean;
  selected: boolean;
  category?: string;
  source?: 'low' | 'imported';
  builtIn?: boolean;
  order?: number;
  position?: string | number;
  probability?: number;
  keys: string[];
  importedAt: number;
  updatedAt: number;
}

export interface TheaterTopicEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  favorite?: boolean;
  createdAt: number;
  updatedAt: number;
}

function defaultTheaterWorldBookEntries(now = Date.now()): TheaterWorldBookEntry[] {
  return [
    {
      id: 'low-theater-core',
      comment: '默认 low：剧情方向',
      content: [
        '地点：{{random:雨夜街角,空教室,医院走廊,出租屋厨房,深夜便利店}}',
        '关系：{{random:旧友重逢,误会中的恋人,临时同居,互相试探的敌人,秘密守护者}}',
        '冲突：{{random:偷看手机后冷战,一句谎言被拆穿,意外听见告白,共同秘密曝光,错过的重要消息}}',
      ].join('\n'),
      enabled: true,
      selected: true,
      category: '默认 low',
      source: 'low',
      builtIn: true,
      order: 0,
      probability: 100,
      keys: ['low', '剧情方向'],
      importedAt: now,
      updatedAt: now,
    },
    {
      id: 'low-theater-style',
      comment: '默认 low：风格气氛',
      content: [
        '气氛：{{random:暧昧拉扯,日常里藏刺,梦境错位,悬疑逼近,吵架后沉默}}',
        '推进方式：{{random:短信引爆,当面对质,共同避雨,半夜来电,记忆闪回}}',
        '收束：{{random:留一个未说出口的问题,让两个人暂时和解,让误会更深,用一句轻声道歉收尾,把选择留到下一幕}}',
      ].join('\n'),
      enabled: true,
      selected: true,
      category: '默认 low',
      source: 'low',
      builtIn: true,
      order: 1,
      probability: 100,
      keys: ['low', '风格'],
      importedAt: now,
      updatedAt: now,
    },
  ];
}

function mergeDefaultTheaterWorldBookEntries(entries: TheaterWorldBookEntry[]) {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  for (const entry of defaultTheaterWorldBookEntries()) {
    if (!byId.has(entry.id)) byId.set(entry.id, entry);
  }
  return Array.from(byId.values()).sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999) || b.updatedAt - a.updatedAt);
}

export interface BrowserHistoryItem {
  id: string;
  title: string;
  url: string;
  query?: string;
  visitedAt: number;
}

export interface DiaryEntry {
  id: string;
  owner: 'user' | 'char';
  characterId?: string;
  title: string;
  content: string;
  mood?: string;
  tags: string[];
  review?: {
    characterId?: string;
    content: string;
    createdAt: number;
  };
  reviews?: Array<{
    characterId?: string;
    content: string;
    createdAt: number;
  }>;
  source?: 'manual' | 'wechat' | 'qq' | 'phone' | 'moment';
  relatedMessageIds?: string[];
  createdAt: number;
  updatedAt: number;
  locked?: boolean;
  favorite?: boolean;
}

export interface CalendarEvent {
  id: string;
  owner: 'user' | 'char' | 'shared';
  characterId?: string;
  title: string;
  note?: string;
  location?: string;
  startAt: number;
  endAt?: number;
  allDay?: boolean;
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  reminderAt?: number;
  tags: string[];
  source?: 'manual' | 'wechat' | 'qq' | 'diary' | 'memo' | 'moment' | 'order';
  relatedDiaryIds?: string[];
  relatedMessageIds?: string[];
  favorite?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface GalleryPhoto {
  id: string;
  url: string;
  title: string;
  description?: string;
  album: '全部' | '生活' | '自拍' | '截图' | '风景' | '隐藏' | '聊天';
  note?: string;
  tags: string[];
  characterId?: string;
  readableByChar?: boolean;
  reviews?: Array<{
    characterId?: string;
    content: string;
    createdAt: number;
  }>;
  source?: 'upload' | 'image-bed' | 'wechat' | 'chat' | 'moment';
  favorite?: boolean;
  hidden?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type MemoEntryType = 'note' | 'todo' | 'idea';
export type MemoEntryColor = 'yellow' | 'green' | 'blue' | 'pink' | 'white';

export interface MemoEntry {
  id: string;
  title: string;
  content: string;
  type: MemoEntryType;
  tags: string[];
  color?: MemoEntryColor;
  characterId?: string;
  readableByChar?: boolean;
  reminderAt?: number;
  pinned?: boolean;
  locked?: boolean;
  completed?: boolean;
  source?: 'manual' | 'char' | 'wechat' | 'qq' | 'diary' | 'gallery' | 'calendar';
  relatedDiaryIds?: string[];
  relatedPhotoIds?: string[];
  relatedMessageIds?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface MemoCharWriterSettings {
  characterId?: string;
  scheduledAt?: number;
  enabled: boolean;
  lastRunAt?: number;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  cover?: string;
  audioUrl?: string;
  lyrics?: string;
  melody?: string;
  arrangement?: string;
  characterId?: string;
  tags: string[];
  liked?: boolean;
  playCount: number;
  lastPlayedAt?: number;
  source?: 'manual' | 'browser' | 'char' | 'import';
  createdAt: number;
  updatedAt: number;
}

export interface MusicPlaylist {
  id: string;
  name: string;
  description?: string;
  cover?: string;
  trackIds: string[];
  characterId?: string;
  favorite?: boolean;
  source?: 'manual' | 'char' | 'browser';
  createdAt: number;
  updatedAt: number;
}

export interface MusicListenRecord {
  id: string;
  trackId: string;
  characterId?: string;
  mood?: string;
  note?: string;
  durationSeconds?: number;
  createdAt: number;
}

export interface MusicPlayerState {
  trackId?: string;
  playing: boolean;
  progress: number;
  duration: number;
  repeat: boolean;
  shuffle: boolean;
}

export interface MusicSourceConfig {
  neteaseBaseUrl: string;
  qqBaseUrl: string;
}

export interface AppLogEntry {
  id: string;
  type: 'info' | 'success' | 'error' | 'ai' | 'tts' | 'music';
  title: string;
  detail?: string;
  createdAt: number;
}

export type ThemeType = 'pastel' | 'gothic';
export type LayoutMode = 'free' | 'snap';
export type Screen =
  | 'desktop'
  | 'wechat'
  | 'qq'
  | 'chat'
  | 'phone'
  | 'video'
  | 'diary'
  | 'peek'
  | 'gallery'
  | 'calendar'
  | 'moments'
  | 'xiaohongshu'
  | 'bilibili'
  | 'theater'
  | 'music'
  | 'memo'
  | 'browser'
  | 'ai-context'
  | 'contacts'
  | 'settings'
  | 'themes'
  | 'presets'
  | 'logs'
  | 'import';

interface AppState {
  characters: Character[];
  chatSessions: Record<string, ChatSession>;
  activeScreen: Screen;
  previousScreen: Screen;
  activeChatId: string | null;
  activeChannel: 'wechat' | 'qq';
  theme: ThemeType;
  wallpaper: string | null;
  imageBed: string | null;
  userName: string;
  userAvatar: string | null;
  wechatId: string;
  wechatStatus: string;
  wechatPhotos: string[];
  wechatMoments: string[];
  stickers: StickerItem[];
  groupChats: GroupChat[];
  contactTags: Record<string, string[]>;
  purchaseRecords: PurchaseRecord[];
  phoneCallRecords: PhoneCallRecord[];
  bilibiliEntries: BilibiliVideoEntry[];
  bilibiliSearches: BilibiliSearchRecord[];
  browserSearches: BrowserSearchRecord[];
  browserBookmarks: BrowserBookmark[];
  browserHistory: BrowserHistoryItem[];
  theaterScenes: TheaterScene[];
  theaterTopicEntries: TheaterTopicEntry[];
  theaterWorldBookEntries: TheaterWorldBookEntry[];
  browserWorldBook: string;
  browserApiBaseUrl: string;
  browserApiKey: string;
  browserSelectedModel: string;
  apiBaseUrl: string;
  apiKey: string;
  availableModels: string[];
  selectedModel: string;
  chatPresetName: string;
  chatPresetPrompt: string;
  browserPresetName: string;
  browserPresetPrompt: string;
  chatContextDepth: number;
  chatTemperature: number;
  chatMaxTokens: number;
  chatReplyStyle: 'auto' | 'single' | 'burst';
  diaries: DiaryEntry[];
  calendarEvents: CalendarEvent[];
  galleryPhotos: GalleryPhoto[];
  galleryTags: string[];
  memos: MemoEntry[];
  memoTags: string[];
  memoCharWriter: MemoCharWriterSettings;
  xiaohongshuProfile: XiaohongshuProfile;
  xiaohongshuNotes: XiaohongshuNote[];
  xiaohongshuFollowingIds: string[];
  musicTracks: MusicTrack[];
  musicPlaylists: MusicPlaylist[];
  musicListenRecords: MusicListenRecord[];
  musicPlayer: MusicPlayerState;
  musicSourceConfig: MusicSourceConfig;
  ttsConfig: TtsConfig;
  appLogs: AppLogEntry[];
  presetName: string;
  ttsEnabled: boolean;
  layoutMode: LayoutMode;
  desktopPage: 0 | 1;
  layoutPositions: Record<string, LayoutPosition>;
  customWidgets: CustomWidget[];

  addCharacter: (character: Character) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  setScreen: (screen: Screen) => void;
  goBack: () => void;
  openChat: (characterId: string, channel: 'wechat' | 'qq') => void;
  addMessage: (characterId: string, channel: 'wechat' | 'qq', message: ChatMessage) => void;
  deleteMessage: (characterId: string, channel: 'wechat' | 'qq', messageId: string) => void;
  toggleMessageFavorite: (characterId: string, channel: 'wechat' | 'qq', messageId: string) => void;
  recallMessage: (characterId: string, channel: 'wechat' | 'qq', messageId: string) => void;
  setTheme: (theme: ThemeType) => void;
  setWallpaper: (url: string | null) => void;
  setImageBed: (url: string | null) => void;
  setUserName: (name: string) => void;
  setUserAvatar: (url: string | null) => void;
  setWechatId: (id: string) => void;
  setWechatStatus: (status: string) => void;
  addWechatPhoto: (url: string) => void;
  removeWechatPhoto: (url: string) => void;
  addWechatMoment: (content: string) => void;
  addSticker: (url: string, label: string) => void;
  updateStickerLabel: (id: string, label: string) => void;
  deleteSticker: (id: string) => void;
  toggleStickerFavorite: (id: string) => void;
  addGroupChat: (name: string, memberIds: string[]) => void;
  updateGroupChat: (id: string, updates: Partial<Pick<GroupChat, 'name' | 'memberIds'>>) => void;
  deleteGroupChat: (id: string) => void;
  setContactTag: (characterId: string, tag: string) => void;
  addPurchaseRecord: (record: Omit<PurchaseRecord, 'id' | 'createdAt'>) => void;
  deletePurchaseRecord: (id: string) => void;
  addPhoneCallRecord: (record: Omit<PhoneCallRecord, 'id'> & Partial<Pick<PhoneCallRecord, 'id'>>) => string;
  updatePhoneCallRecord: (id: string, updates: Partial<Omit<PhoneCallRecord, 'id'>>) => void;
  deletePhoneCallRecord: (id: string) => void;
  togglePhoneCallFavorite: (id: string) => void;
  addBilibiliEntries: (entries: Array<Omit<BilibiliVideoEntry, 'id' | 'createdAt'> & Partial<Pick<BilibiliVideoEntry, 'id' | 'createdAt'>>>) => string[];
  deleteBilibiliEntry: (id: string) => void;
  toggleBilibiliFavorite: (id: string) => void;
  markBilibiliWatched: (id: string, watchedAt?: number) => void;
  addBilibiliSearch: (record: Omit<BilibiliSearchRecord, 'id' | 'createdAt'> & Partial<Pick<BilibiliSearchRecord, 'id' | 'createdAt'>>) => string;
  addBrowserSearch: (record: Omit<BrowserSearchRecord, 'id' | 'createdAt'> & Partial<Pick<BrowserSearchRecord, 'id' | 'createdAt'>>) => string;
  deleteBrowserSearch: (id: string) => void;
  addBrowserBookmark: (bookmark: Omit<BrowserBookmark, 'id' | 'createdAt'> & Partial<Pick<BrowserBookmark, 'id' | 'createdAt'>>) => void;
  deleteBrowserBookmark: (id: string) => void;
  addBrowserHistory: (item: Omit<BrowserHistoryItem, 'id' | 'visitedAt'> & Partial<Pick<BrowserHistoryItem, 'id' | 'visitedAt'>>) => void;
  clearBrowserHistory: () => void;
  addTheaterScene: (scene: Omit<TheaterScene, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<TheaterScene, 'id' | 'createdAt' | 'updatedAt'>>) => string;
  updateTheaterScene: (id: string, updates: Partial<Omit<TheaterScene, 'id' | 'createdAt'>>) => void;
  deleteTheaterScene: (id: string) => void;
  toggleTheaterSceneFavorite: (id: string) => void;
  addTheaterTopicEntry: (topic: TheaterTopicDraft) => string;
  importTheaterTopicEntries: (entries: TheaterTopicDraft[]) => void;
  updateTheaterTopicEntry: (id: string, updates: Partial<Omit<TheaterTopicEntry, 'id' | 'createdAt'>>) => void;
  deleteTheaterTopicEntry: (id: string) => void;
  toggleTheaterTopicFavorite: (id: string) => void;
  importTheaterWorldBookEntries: (entries: Array<Omit<TheaterWorldBookEntry, 'importedAt' | 'updatedAt'> & Partial<Pick<TheaterWorldBookEntry, 'importedAt' | 'updatedAt'>>>) => void;
  updateTheaterWorldBookEntry: (id: string, updates: Partial<Omit<TheaterWorldBookEntry, 'id' | 'importedAt'>>) => void;
  deleteTheaterWorldBookEntry: (id: string) => void;
  setBrowserWorldBook: (content: string) => void;
  setBrowserApiConfig: (updates: Partial<Pick<AppState, 'browserApiBaseUrl' | 'browserApiKey' | 'browserSelectedModel'>>) => void;
  setModelConfig: (updates: Partial<Pick<AppState, 'apiBaseUrl' | 'apiKey' | 'selectedModel' | 'chatPresetName' | 'chatPresetPrompt' | 'browserPresetName' | 'browserPresetPrompt' | 'chatContextDepth' | 'chatTemperature' | 'chatMaxTokens' | 'chatReplyStyle'>>) => void;
  setAvailableModels: (models: string[]) => void;
  addDiary: (entry: Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  updateDiary: (id: string, updates: Partial<Omit<DiaryEntry, 'id' | 'createdAt'>>) => void;
  deleteDiary: (id: string) => void;
  addCalendarEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>>) => string;
  updateCalendarEvent: (id: string, updates: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>) => void;
  deleteCalendarEvent: (id: string) => void;
  toggleCalendarEventFavorite: (id: string) => void;
  addGalleryPhoto: (photo: Omit<GalleryPhoto, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<GalleryPhoto, 'id' | 'createdAt' | 'updatedAt'>>) => string;
  updateGalleryPhoto: (id: string, updates: Partial<Omit<GalleryPhoto, 'id' | 'createdAt'>>) => void;
  addGalleryPhotoReview: (id: string, review: Omit<NonNullable<GalleryPhoto['reviews']>[number], 'createdAt'> & Partial<Pick<NonNullable<GalleryPhoto['reviews']>[number], 'createdAt'>>) => void;
  deleteGalleryPhoto: (id: string) => void;
  toggleGalleryPhotoFavorite: (id: string) => void;
  addGalleryTag: (tag: string) => void;
  deleteGalleryTag: (tag: string) => void;
  addMemo: (memo: string) => void;
  addMemoEntry: (memo: Omit<MemoEntry, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<MemoEntry, 'id' | 'createdAt' | 'updatedAt'>>) => string;
  updateMemoEntry: (id: string, updates: Partial<Omit<MemoEntry, 'id' | 'createdAt'>>) => void;
  deleteMemoEntry: (id: string) => void;
  toggleMemoPinned: (id: string) => void;
  toggleMemoLocked: (id: string) => void;
  toggleMemoCompleted: (id: string) => void;
  addMemoTag: (tag: string) => void;
  deleteMemoTag: (tag: string) => void;
  setMemoCharWriter: (settings: Partial<MemoCharWriterSettings>) => void;
  setXiaohongshuProfile: (updates: Partial<XiaohongshuProfile>) => void;
  addXiaohongshuNote: (note: Omit<XiaohongshuNote, 'id' | 'createdAt' | 'updatedAt' | 'authorId' | 'authorName' | 'authorAvatar' | 'authorType' | 'source'> & Partial<Pick<XiaohongshuNote, 'id' | 'createdAt' | 'updatedAt' | 'authorId' | 'authorName' | 'authorAvatar' | 'authorType' | 'source'>>) => string;
  updateXiaohongshuNote: (id: string, updates: Partial<Omit<XiaohongshuNote, 'id' | 'createdAt'>>) => void;
  deleteXiaohongshuNote: (id: string) => void;
  toggleXiaohongshuFavorite: (id: string) => void;
  toggleXiaohongshuFollow: (authorId: string) => void;
  replaceXiaohongshuGeneratedNotes: (notes: XiaohongshuNote[]) => void;
  addMusicTrack: (track: Omit<MusicTrack, 'id' | 'createdAt' | 'updatedAt' | 'playCount'> & Partial<Pick<MusicTrack, 'id' | 'createdAt' | 'updatedAt' | 'playCount'>>) => string;
  updateMusicTrack: (id: string, updates: Partial<Omit<MusicTrack, 'id' | 'createdAt'>>) => void;
  deleteMusicTrack: (id: string) => void;
  toggleMusicTrackLiked: (id: string) => void;
  addMusicPlaylist: (playlist: Omit<MusicPlaylist, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<MusicPlaylist, 'id' | 'createdAt' | 'updatedAt'>>) => string;
  updateMusicPlaylist: (id: string, updates: Partial<Omit<MusicPlaylist, 'id' | 'createdAt'>>) => void;
  deleteMusicPlaylist: (id: string) => void;
  toggleMusicPlaylistFavorite: (id: string) => void;
  addTrackToMusicPlaylist: (playlistId: string, trackId: string) => void;
  removeTrackFromMusicPlaylist: (playlistId: string, trackId: string) => void;
  setMusicPlayer: (updates: Partial<MusicPlayerState>) => void;
  setMusicSourceConfig: (updates: Partial<MusicSourceConfig>) => void;
  setTtsConfig: (updates: Partial<TtsConfig>) => void;
  playMusicTrack: (trackId: string, record?: Partial<Omit<MusicListenRecord, 'id' | 'trackId' | 'createdAt'>>) => void;
  addMusicListenRecord: (record: Omit<MusicListenRecord, 'id' | 'createdAt'> & Partial<Pick<MusicListenRecord, 'id' | 'createdAt'>>) => string;
  importMusicJson: (payload: { tracks?: Partial<MusicTrack>[]; playlists?: Partial<MusicPlaylist>[] }) => void;
  setPresetName: (name: string) => void;
  setTtsEnabled: (enabled: boolean) => void;
  addAppLog: (log: Omit<AppLogEntry, 'id' | 'createdAt'> & Partial<Pick<AppLogEntry, 'id' | 'createdAt'>>) => string;
  clearAppLogs: () => void;
  setLayoutMode: (mode: LayoutMode) => void;
  setDesktopPage: (page: 0 | 1) => void;
  setLayoutPosition: (id: string, position: LayoutPosition) => void;
  addCustomWidget: (page: 0 | 1, type: CustomWidget['type']) => void;
  updateCustomWidget: (id: string, updates: Partial<CustomWidget>) => void;
  removeCustomWidget: (id: string) => void;
}

const sessionKey = (characterId: string, channel: 'wechat' | 'qq') => `${channel}:${characterId}`;
const legacyWechatStatuses = new Set(['怎么就发生了这种事']);

function normalizeDiaryEntries(diaries: unknown): DiaryEntry[] {
  if (!Array.isArray(diaries)) return [];
  return diaries
    .filter((entry) => {
      if (typeof entry === 'string') return !entry.includes('4月30日 晚上10:13');
      return entry && typeof entry === 'object';
    })
    .map((entry, index) => {
      const fallbackTime = Date.now() - index;
      if (typeof entry === 'string') {
        const lines = entry.split('\n').map((line) => line.trim()).filter(Boolean);
        const content = lines.slice(1).join('\n') || lines[0] || '旧日记';
        return {
          id: createId('diary'),
          owner: 'user',
          title: content.slice(0, 18),
          content,
          tags: [],
          source: 'manual',
          createdAt: fallbackTime,
          updatedAt: fallbackTime,
        };
      }
      const candidate = entry as Partial<DiaryEntry>;
      const createdAt = typeof candidate.createdAt === 'number' ? candidate.createdAt : fallbackTime;
      const review = candidate.review && typeof candidate.review === 'object' && typeof candidate.review.content === 'string'
        ? {
            characterId: candidate.review.characterId,
            content: candidate.review.content,
            createdAt: typeof candidate.review.createdAt === 'number' ? candidate.review.createdAt : createdAt,
          }
        : undefined;
      const reviews = Array.isArray(candidate.reviews)
        ? candidate.reviews
            .filter((item) => item && typeof item.content === 'string')
            .map((item) => ({
              characterId: item.characterId,
              content: item.content,
              createdAt: typeof item.createdAt === 'number' ? item.createdAt : createdAt,
            }))
        : review
          ? [review]
          : undefined;
      return {
        id: candidate.id || createId('diary'),
        owner: candidate.owner === 'char' ? 'char' : 'user',
        characterId: candidate.characterId,
        title: candidate.title || candidate.content?.slice(0, 18) || '未命名日记',
        content: candidate.content || '',
        mood: candidate.mood,
        tags: Array.isArray(candidate.tags) ? candidate.tags.filter(Boolean) : [],
        review,
        reviews,
        source: candidate.source || 'manual',
        relatedMessageIds: Array.isArray(candidate.relatedMessageIds) ? candidate.relatedMessageIds : undefined,
        createdAt,
        updatedAt: typeof candidate.updatedAt === 'number' ? candidate.updatedAt : createdAt,
        locked: Boolean(candidate.locked),
        favorite: Boolean(candidate.favorite),
      };
    });
}

function normalizePhoneCallRecords(records: unknown): PhoneCallRecord[] {
  if (!Array.isArray(records)) return [];
  return records
    .filter((record) => record && typeof record === 'object')
    .map((record, index) => {
      const candidate = record as Partial<PhoneCallRecord>;
      const fallbackTime = Date.now() - index;
      const startedAt = typeof candidate.startedAt === 'number' ? candidate.startedAt : fallbackTime;
      const endedAt = typeof candidate.endedAt === 'number' ? candidate.endedAt : startedAt;
      const direction: PhoneCallDirection = candidate.direction === 'incoming' ? 'incoming' : 'outgoing';
      const status: PhoneCallStatus = ['answered', 'missed', 'declined', 'canceled', 'no-answer'].includes(candidate.status || '')
        ? candidate.status as PhoneCallStatus
        : 'answered';
      const transcript: PhoneCallTranscriptLine[] = Array.isArray(candidate.transcript)
        ? candidate.transcript
            .filter((line) => line && typeof line.text === 'string')
            .map((line) => ({
              speaker: line.speaker === 'user' ? 'user' : 'char',
              text: line.text,
              timestamp: typeof line.timestamp === 'number' ? line.timestamp : endedAt,
            }))
        : [];
      return {
        id: candidate.id || createId('call'),
        characterId: candidate.characterId || '',
        direction,
        status,
        startedAt,
        answeredAt: typeof candidate.answeredAt === 'number' ? candidate.answeredAt : undefined,
        endedAt,
        durationSeconds: typeof candidate.durationSeconds === 'number' ? Math.max(0, Math.round(candidate.durationSeconds)) : 0,
        summary: candidate.summary || '',
        transcript,
        favorite: Boolean(candidate.favorite),
        noteMessageId: candidate.noteMessageId,
      };
    })
    .filter((record) => record.characterId);
}

function normalizeCalendarEvents(events: unknown): CalendarEvent[] {
  if (!Array.isArray(events)) return [];
  return events
    .filter((event) => event && typeof event === 'object')
    .map((event) => {
      const item = event as Partial<CalendarEvent>;
      const now = Date.now();
      return {
        id: item.id || createId('calendar'),
        owner: item.owner || 'user',
        characterId: item.characterId,
        title: (item.title || '未命名日程').trim(),
        note: item.note || '',
        location: item.location || '',
        startAt: typeof item.startAt === 'number' ? item.startAt : now,
        endAt: typeof item.endAt === 'number' ? item.endAt : undefined,
        allDay: Boolean(item.allDay),
        repeat: item.repeat || 'none',
        reminderAt: typeof item.reminderAt === 'number' ? item.reminderAt : undefined,
        tags: Array.isArray(item.tags) ? item.tags.map((tag) => tag.trim()).filter(Boolean) : [],
        source: item.source || 'manual',
        relatedDiaryIds: Array.isArray(item.relatedDiaryIds) ? item.relatedDiaryIds : [],
        relatedMessageIds: Array.isArray(item.relatedMessageIds) ? item.relatedMessageIds : [],
        favorite: Boolean(item.favorite),
        createdAt: typeof item.createdAt === 'number' ? item.createdAt : now,
        updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : now,
      };
    })
    .sort((a, b) => a.startAt - b.startAt);
}

function normalizeTheaterScenes(scenes: unknown): TheaterScene[] {
  if (!Array.isArray(scenes)) return [];
  const styleSet = new Set<TheaterScene['style']>(['daily', 'romance', 'conflict', 'dream', 'suspense', 'random']);
  const lengthSet = new Set<TheaterScene['length']>(['short', 'medium', 'long', 'custom']);
  return scenes
    .filter((scene) => scene && typeof scene === 'object')
    .map((scene) => {
      const item = scene as Partial<TheaterScene>;
      const now = Date.now();
      return {
        id: item.id || createId('theater'),
        title: item.title?.trim() || item.theme?.trim().slice(0, 18) || '未命名小剧场',
        theme: item.theme?.trim() || '无题片段',
        characterIds: Array.isArray(item.characterIds) ? item.characterIds.filter(Boolean) : [],
        style: item.style && styleSet.has(item.style) ? item.style : 'daily',
        length: item.length && lengthSet.has(item.length) ? item.length : 'medium',
        customLengthText: item.customLengthText?.trim() || '',
        rollResult: item.rollResult?.trim() || '',
        content: item.content || '',
        beats: Array.isArray(item.beats) ? item.beats.map((beat) => String(beat).trim()).filter(Boolean) : [],
        source: item.source === 'ai' ? 'ai' as const : 'manual' as const,
        favorite: Boolean(item.favorite),
        createdAt: typeof item.createdAt === 'number' ? item.createdAt : now,
        updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : now,
      };
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function normalizeTheaterWorldBookEntries(entries: unknown): TheaterWorldBookEntry[] {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry, index) => {
      const item = entry as Partial<TheaterWorldBookEntry>;
      const now = Date.now();
      return {
        id: item.id || createId('twb'),
        comment: item.comment?.trim() || `世界书条目 ${index + 1}`,
        content: item.content || '',
        enabled: item.enabled !== false,
        selected: item.selected !== false,
        category: item.category?.trim() || (item.source === 'low' ? '默认 low' : '玩家导入'),
        source: item.source === 'low' ? 'low' as const : 'imported' as const,
        builtIn: Boolean(item.builtIn),
        order: typeof item.order === 'number' ? item.order : undefined,
        position: item.position,
        probability: typeof item.probability === 'number' ? item.probability : undefined,
        keys: Array.isArray(item.keys) ? item.keys.map((key) => String(key).trim()).filter(Boolean) : [],
        importedAt: typeof item.importedAt === 'number' ? item.importedAt : now,
        updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : now,
      };
    })
    .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999) || b.updatedAt - a.updatedAt);
}

function normalizeTheaterTopicEntries(entries: unknown): TheaterTopicEntry[] {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => {
      const item = entry as Partial<TheaterTopicEntry>;
      const now = Date.now();
      const content = item.content?.trim() || '';
      return {
        id: item.id || createId('topic'),
        title: item.title?.trim() || content.replace(/\s+/g, ' ').slice(0, 24) || '未命名主题',
        content,
        category: item.category?.trim() || '默认',
        favorite: Boolean(item.favorite),
        createdAt: typeof item.createdAt === 'number' ? item.createdAt : now,
        updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : now,
      };
    })
    .filter((entry) => entry.content)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function normalizeGalleryPhotos(photos: unknown): GalleryPhoto[] {
  if (!Array.isArray(photos)) return [];
  return photos
    .filter((photo) => photo && typeof photo === 'object')
    .map((photo) => {
      const item = photo as Partial<GalleryPhoto>;
      const now = Date.now();
      return {
        id: item.id || createId('photo'),
        url: item.url || '',
        title: (item.title || '未命名照片').trim(),
        description: item.description || '',
        album: item.album || '生活',
        note: item.note || '',
        tags: Array.isArray(item.tags) ? item.tags.map((tag) => tag.trim()).filter(Boolean) : [],
        characterId: item.characterId,
        readableByChar: item.readableByChar !== false && !item.hidden,
        reviews: Array.isArray(item.reviews)
          ? item.reviews
              .filter((review) => review && typeof review.content === 'string')
              .map((review) => ({
                characterId: review.characterId,
                content: review.content,
                createdAt: typeof review.createdAt === 'number' ? review.createdAt : now,
              }))
          : [],
        source: item.source || 'upload',
        favorite: Boolean(item.favorite),
        hidden: Boolean(item.hidden),
        createdAt: typeof item.createdAt === 'number' ? item.createdAt : now,
        updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : now,
      };
    })
    .filter((photo) => photo.url)
    .sort((a, b) => b.createdAt - a.createdAt);
}

function normalizeMemos(memos: unknown): MemoEntry[] {
  if (!Array.isArray(memos)) return [];
  return memos
    .filter((memo) => typeof memo === 'string' || (memo && typeof memo === 'object'))
    .map((memo, index) => {
      const now = Date.now() - index;
      if (typeof memo === 'string') {
        const content = memo.trim();
        return {
          id: createId('memo'),
          title: content.slice(0, 18) || '旧备忘',
          content,
          type: 'note',
          tags: [],
          color: 'yellow',
          readableByChar: true,
          source: 'manual',
          relatedDiaryIds: [],
          relatedPhotoIds: [],
          relatedMessageIds: [],
          createdAt: now,
          updatedAt: now,
        } satisfies MemoEntry;
      }
      const item = memo as Partial<MemoEntry>;
      const content = (item.content || item.title || '').trim();
      const createdAt = typeof item.createdAt === 'number' ? item.createdAt : now;
      const type: MemoEntryType = item.type === 'todo' || item.type === 'idea' ? item.type : 'note';
      const color: MemoEntryColor = item.color === 'green' || item.color === 'blue' || item.color === 'pink' || item.color === 'white' ? item.color : 'yellow';
      return {
        id: item.id || createId('memo'),
        title: (item.title || content.slice(0, 18) || '未命名备忘').trim(),
        content,
        type,
        tags: Array.isArray(item.tags) ? item.tags.map((tag) => tag.trim()).filter(Boolean) : [],
        color,
        characterId: item.characterId,
        readableByChar: item.readableByChar !== false,
        reminderAt: typeof item.reminderAt === 'number' ? item.reminderAt : undefined,
        pinned: Boolean(item.pinned),
        locked: Boolean(item.locked),
        completed: Boolean(item.completed),
        source: item.source || 'manual',
        relatedDiaryIds: Array.isArray(item.relatedDiaryIds) ? item.relatedDiaryIds : [],
        relatedPhotoIds: Array.isArray(item.relatedPhotoIds) ? item.relatedPhotoIds : [],
        relatedMessageIds: Array.isArray(item.relatedMessageIds) ? item.relatedMessageIds : [],
        createdAt,
        updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : createdAt,
      } satisfies MemoEntry;
    })
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
}

function normalizeMemoTags(tags: unknown, memos: MemoEntry[]): string[] {
  const persistedTags = Array.isArray(tags) ? tags.map((tag) => String(tag).trim()).filter(Boolean) : [];
  const memoTags = memos.flatMap((memo) => memo.tags);
  return Array.from(new Set([...persistedTags, ...memoTags, '生活', '待办', '灵感', '给char看']));
}

function normalizeMusicTracks(tracks: unknown): MusicTrack[] {
  if (!Array.isArray(tracks)) return [];
  return tracks
    .filter((track) => track && typeof track === 'object')
    .map((track, index) => {
      const item = track as Partial<MusicTrack>;
      const now = Date.now() - index;
      const createdAt = typeof item.createdAt === 'number' ? item.createdAt : now;
      return {
        id: item.id || createId('music-track'),
        title: (item.title || '未命名歌曲').trim(),
        artist: (item.artist || '未知歌手').trim(),
        album: item.album?.trim(),
        cover: item.cover?.trim(),
        audioUrl: item.audioUrl?.trim(),
        lyrics: item.lyrics || '',
        melody: item.melody?.trim(),
        arrangement: item.arrangement?.trim(),
        characterId: item.characterId,
        tags: Array.isArray(item.tags) ? item.tags.map((tag) => tag.trim()).filter(Boolean) : [],
        liked: Boolean(item.liked),
        playCount: typeof item.playCount === 'number' ? item.playCount : 0,
        lastPlayedAt: typeof item.lastPlayedAt === 'number' ? item.lastPlayedAt : undefined,
        source: item.source || 'manual',
        createdAt,
        updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : createdAt,
      } satisfies MusicTrack;
    })
    .sort((a, b) => (b.lastPlayedAt || b.updatedAt) - (a.lastPlayedAt || a.updatedAt));
}

function normalizeMusicPlaylists(playlists: unknown, tracks: MusicTrack[]): MusicPlaylist[] {
  if (!Array.isArray(playlists)) return [];
  const trackIds = new Set(tracks.map((track) => track.id));
  return playlists
    .filter((playlist) => playlist && typeof playlist === 'object')
    .map((playlist, index) => {
      const item = playlist as Partial<MusicPlaylist>;
      const now = Date.now() - index;
      const createdAt = typeof item.createdAt === 'number' ? item.createdAt : now;
      return {
        id: item.id || createId('music-playlist'),
        name: (item.name || '未命名歌单').trim(),
        description: item.description?.trim(),
        cover: item.cover?.trim(),
        trackIds: Array.isArray(item.trackIds) ? item.trackIds.filter((id) => trackIds.has(id)) : [],
        characterId: item.characterId,
        favorite: Boolean(item.favorite),
        source: item.source || 'manual',
        createdAt,
        updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : createdAt,
      } satisfies MusicPlaylist;
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function normalizeMusicListenRecords(records: unknown, tracks: MusicTrack[]): MusicListenRecord[] {
  if (!Array.isArray(records)) return [];
  const trackIds = new Set(tracks.map((track) => track.id));
  return records
    .filter((record) => record && typeof record === 'object')
    .map((record, index) => {
      const item = record as Partial<MusicListenRecord>;
      return {
        id: item.id || createId('listen'),
        trackId: item.trackId || '',
        characterId: item.characterId,
        mood: item.mood?.trim(),
        note: item.note?.trim(),
        durationSeconds: typeof item.durationSeconds === 'number' ? item.durationSeconds : undefined,
        createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now() - index,
      } satisfies MusicListenRecord;
    })
    .filter((record) => trackIds.has(record.trackId))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 80);
}

const stickerDataUrl = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const defaultMusicTracks: MusicTrack[] = normalizeMusicTracks([
  {
    id: 'music-track-midnight',
    title: '午夜留声',
    artist: '小手机电台',
    album: '共同听歌记录',
    cover: 'linear-gradient(135deg,#171717,#7e1114)',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    lyrics: '窗外的雨还没停\n耳机里有人轻轻呼吸\n把今天折成一张旧车票\n放进只给你看的抽屉',
    tags: ['夜晚', '陪伴', 'char推荐'],
    liked: true,
    playCount: 0,
    source: 'char',
    createdAt: 1714500000000,
    updatedAt: 1714500000000,
  },
  {
    id: 'music-track-sugar',
    title: '奶油色周末',
    artist: 'Bedroom Pop Demo',
    album: '生活切片',
    cover: 'linear-gradient(135deg,#f4edbd,#e9c4d5)',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    lyrics: '把闹钟按掉以后\n世界慢慢变甜\n你说今天不用赶路\n连风都靠在窗边',
    tags: ['日常', '轻快'],
    liked: false,
    playCount: 0,
    source: 'manual',
    createdAt: 1714586400000,
    updatedAt: 1714586400000,
  },
  {
    id: 'music-track-glass',
    title: '玻璃心跳',
    artist: 'Goth Phone Session',
    album: '暗色主题',
    cover: 'linear-gradient(135deg,#050505,#324c4a)',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    lyrics: '霓虹在屏幕背后闪烁\n一句未读消息像回声\n你把音量调低一点\n心跳反而更清楚',
    tags: ['哥特', '氛围'],
    liked: false,
    playCount: 0,
    source: 'manual',
    createdAt: 1714672800000,
    updatedAt: 1714672800000,
  },
]);

const defaultMusicPlaylists: MusicPlaylist[] = [];
const defaultMusicSourceConfig: MusicSourceConfig = {
  neteaseBaseUrl: '',
  qqBaseUrl: '',
};
const defaultStickers: StickerItem[] = [
  ...starterStickerItems,
  {
    id: 'sticker-vocaloid-wave',
    label: '青绿色双马尾角色挥手，表示开心打招呼',
    url: stickerDataUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="20" fill="#d8fbf4"/><path d="M28 28C14 34 10 52 12 74c12-2 18-15 20-31M68 28c14 6 18 24 16 46-12-2-18-15-20-31" fill="#35d6c8" stroke="#111" stroke-width="4" stroke-linecap="round"/><circle cx="48" cy="43" r="22" fill="#fff7e8" stroke="#111" stroke-width="4"/><circle cx="40" cy="43" r="3" fill="#111"/><circle cx="56" cy="43" r="3" fill="#111"/><path d="M39 55c5 5 13 5 18 0" fill="none" stroke="#111" stroke-width="4" stroke-linecap="round"/><path d="M68 51l12-10" stroke="#111" stroke-width="5" stroke-linecap="round"/></svg>'),
  },
  {
    id: 'sticker-vocaloid-sing',
    label: '青绿色音乐角色唱歌，表示想发语音或唱一句',
    url: stickerDataUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="20" fill="#eef7ff"/><path d="M22 26h52v38c0 10-11 18-26 18S22 74 22 64Z" fill="#fff7e8" stroke="#111" stroke-width="4"/><path d="M22 31c16-16 37-16 52 0" fill="#35d6c8" stroke="#111" stroke-width="4"/><circle cx="39" cy="49" r="3" fill="#111"/><circle cx="57" cy="49" r="3" fill="#111"/><path d="M44 61c3 3 6 3 9 0" fill="none" stroke="#111" stroke-width="4" stroke-linecap="round"/><path d="M73 22v25m0-25 11 4" fill="none" stroke="#22a6d5" stroke-width="5" stroke-linecap="round"/></svg>'),
  },
  {
    id: 'sticker-vocaloid-heart',
    label: '青绿色角色抱爱心，表示喜欢和贴贴',
    url: stickerDataUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="20" fill="#fff1f6"/><circle cx="48" cy="39" r="21" fill="#fff7e8" stroke="#111" stroke-width="4"/><path d="M25 33 14 72m57-39 11 39" stroke="#35d6c8" stroke-width="9" stroke-linecap="round"/><circle cx="40" cy="39" r="3" fill="#111"/><circle cx="56" cy="39" r="3" fill="#111"/><path d="M34 61c7-13 18-7 14 1 6-8 17-2 10 9-5 8-19 12-24-10Z" fill="#ff6b9a" stroke="#111" stroke-width="4" stroke-linejoin="round"/></svg>'),
  },
  {
    id: 'sticker-vocaloid-question',
    label: '青绿色角色歪头疑问，表示疑惑和求解释',
    url: stickerDataUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="20" fill="#f6f1ff"/><path d="M27 28 13 70m56-42 14 42" stroke="#35d6c8" stroke-width="9" stroke-linecap="round"/><circle cx="48" cy="44" r="22" fill="#fff7e8" stroke="#111" stroke-width="4"/><circle cx="40" cy="45" r="3" fill="#111"/><circle cx="56" cy="45" r="3" fill="#111"/><path d="M42 58h12" stroke="#111" stroke-width="4" stroke-linecap="round"/><path d="M68 18c8 1 12 6 12 12 0 9-10 9-10 18m0 10v1" fill="none" stroke="#7a69ff" stroke-width="5" stroke-linecap="round"/></svg>'),
  },
];

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      characters: [],
      chatSessions: {},
      activeScreen: 'desktop',
      previousScreen: 'desktop',
      activeChatId: null,
      activeChannel: 'wechat',
      theme: 'gothic',
      wallpaper: null,
      imageBed: null,
      userName: '我',
      userAvatar: null,
      wechatId: '9142',
      wechatStatus: '',
      wechatPhotos: [],
      wechatMoments: [],
      stickers: defaultStickers,
      groupChats: [],
      contactTags: {},
      purchaseRecords: [],
      phoneCallRecords: [],
      bilibiliEntries: [],
      bilibiliSearches: [],
      browserSearches: [],
      browserBookmarks: [],
      browserHistory: [],
      theaterScenes: [],
      theaterTopicEntries: [],
      theaterWorldBookEntries: defaultTheaterWorldBookEntries(),
      browserWorldBook: '',
      browserApiBaseUrl: '',
      browserApiKey: '',
      browserSelectedModel: '',
      apiBaseUrl: '',
      apiKey: '',
      availableModels: [],
      selectedModel: '',
      chatPresetName: '自然微信',
      chatPresetPrompt: '像真实微信聊天一样回复。先读完用户连续发来的几条消息，再按角色性格自然回应；可以只发一条，也可以把不同语气或补充拆成多条短气泡。不要写旁白、编号或解释。',
      browserPresetName: '活人感搜索',
      browserPresetPrompt: '生成像真实互联网搜索结果的页面。强调活人感、社区感和美化：结果应像知乎、豆瓣、小红书、微博、百科、贴吧、新闻站或本地生活网站里真实存在的内容；标题、域名、摘要都要自然，不要出现代码、CSS、JS、phone://、example.com、开发说明或“生成器”字样。内容要服务玩家沉浸感，像角色世界里真实可搜到的网页。',
      chatContextDepth: 500,
      chatTemperature: 0.8,
      chatMaxTokens: 520,
      chatReplyStyle: 'auto',
      diaries: [],
      calendarEvents: [],
      galleryPhotos: [],
      galleryTags: ['自拍', '截图', '风景', '约会', '日常', '穿搭', '吃饭', '旅行', '给char看'],
      memos: normalizeMemos(['第一版先搭框架：微信、QQ、电话/TTS、视频通话、日记、查手机、主题、预设、角色导入。']),
      memoTags: ['生活', '待办', '灵感', '给char看'],
      memoCharWriter: { enabled: false },
      xiaohongshuProfile: {
        displayName: '我',
        avatar: '',
        bio: '记录一点正在发生的生活。',
        styleTags: ['日常', '穿搭', '探店'],
      },
      xiaohongshuNotes: [],
      xiaohongshuFollowingIds: [],
      musicTracks: defaultMusicTracks,
      musicPlaylists: defaultMusicPlaylists,
      musicListenRecords: [],
      musicPlayer: { trackId: defaultMusicTracks[0]?.id, playing: false, progress: 0, duration: 0, repeat: false, shuffle: false },
      musicSourceConfig: defaultMusicSourceConfig,
      ttsConfig: defaultTtsConfig,
      appLogs: [],
      presetName: '手机沉浸破限预设',
      ttsEnabled: false,
      layoutMode: 'snap',
      desktopPage: 0,
      layoutPositions: {},
      customWidgets: [],

      addCharacter: (character) =>
        set((state) => {
          const normalized = {
            ...character,
            id: character.id || createId('char'),
            name: character.name || '未命名角色',
            avatar: character.avatar || '',
            description: character.description || '',
            personality: character.personality || '',
            firstMessage: character.firstMessage || '',
            systemPrompt: character.systemPrompt || '',
          };
          const exists = state.characters.some((item) => item.id === normalized.id);
          return {
            characters: exists
              ? state.characters.map((item) => (item.id === normalized.id ? { ...item, ...normalized } : item))
              : [...state.characters, normalized],
          };
        }),
      updateCharacter: (id, updates) =>
        set((state) => ({
          characters: state.characters.map((character) =>
            character.id === id ? { ...character, ...updates } : character,
          ),
        })),
      setScreen: (screen) => set((state) => ({ previousScreen: state.activeScreen, activeScreen: screen })),
      goBack: () =>
        set((state) => {
          if (state.activeScreen === 'desktop') {
            return { activeScreen: 'desktop', previousScreen: 'desktop' };
          }

          if (state.activeScreen === 'chat') {
            return {
              activeScreen: state.activeChannel,
              previousScreen: 'desktop',
              activeChatId: null,
            };
          }

          const nextScreen =
            state.previousScreen === 'chat' || state.previousScreen === state.activeScreen
              ? 'desktop'
              : state.previousScreen || 'desktop';

          return {
            activeScreen: nextScreen,
            previousScreen: 'desktop',
          };
        }),
      openChat: (characterId, channel) =>
        set((state) => {
          const key = sessionKey(characterId, channel);
          const session =
            state.chatSessions[key] ||
            ({
              id: createId('session'),
              characterId,
              channel,
              messages: [],
              lastUpdated: Date.now(),
            } satisfies ChatSession);

          return {
            previousScreen: channel,
            activeScreen: 'chat',
            activeChatId: characterId,
            activeChannel: channel,
            chatSessions: { ...state.chatSessions, [key]: session },
          };
        }),
      addMessage: (characterId, channel, message) =>
        set((state) => {
          const key = sessionKey(characterId, channel);
          const session =
            state.chatSessions[key] ||
            ({
              id: createId('session'),
              characterId,
              channel,
              messages: [],
              lastUpdated: Date.now(),
            } satisfies ChatSession);

          return {
            chatSessions: {
              ...state.chatSessions,
              [key]: {
                ...session,
                messages: [...session.messages, message],
                lastUpdated: Date.now(),
              },
            },
          };
        }),
      deleteMessage: (characterId, channel, messageId) =>
        set((state) => {
          const key = sessionKey(characterId, channel);
          const session = state.chatSessions[key];
          if (!session) return {};
          return {
            chatSessions: {
              ...state.chatSessions,
              [key]: {
                ...session,
                messages: session.messages.filter((message) => message.id !== messageId),
                lastUpdated: Date.now(),
              },
            },
          };
        }),
      toggleMessageFavorite: (characterId, channel, messageId) =>
        set((state) => {
          const key = sessionKey(characterId, channel);
          const session = state.chatSessions[key];
          if (!session) return {};
          return {
            chatSessions: {
              ...state.chatSessions,
              [key]: {
                ...session,
                messages: session.messages.map((message) =>
                  message.id === messageId ? { ...message, favorite: !message.favorite } : message,
                ),
                lastUpdated: Date.now(),
              },
            },
          };
        }),
      recallMessage: (characterId, channel, messageId) =>
        set((state) => {
          const key = sessionKey(characterId, channel);
          const session = state.chatSessions[key];
          if (!session) return {};
          return {
            chatSessions: {
              ...state.chatSessions,
              [key]: {
                ...session,
                messages: session.messages.map((message) =>
                  message.id === messageId
                    ? { ...message, recalled: true, content: '', kind: 'text', transcript: undefined, stickerLabel: undefined }
                    : message,
                ),
                lastUpdated: Date.now(),
              },
            },
          };
        }),
      setTheme: (theme) => set({ theme }),
      setWallpaper: (url) => set({ wallpaper: url }),
      setImageBed: (url) => set({ imageBed: url }),
      setUserName: (name) => set({ userName: name }),
      setUserAvatar: (url) => set({ userAvatar: url }),
      setWechatId: (id) => set({ wechatId: id }),
      setWechatStatus: (status) => set({ wechatStatus: status }),
      addWechatPhoto: (url) => set((state) => ({ wechatPhotos: [url, ...state.wechatPhotos].slice(0, 18) })),
      removeWechatPhoto: (url) => set((state) => ({ wechatPhotos: state.wechatPhotos.filter((photo) => photo !== url) })),
      addWechatMoment: (content) =>
        set((state) => ({
          wechatMoments: [content, ...state.wechatMoments].slice(0, 20),
        })),
      addSticker: (url, label) =>
        set((state) => ({
          stickers: [{ id: createId('sticker'), url, label: label.trim() || '自定义表情包' }, ...state.stickers],
        })),
      updateStickerLabel: (id, label) =>
        set((state) => ({
          stickers: state.stickers.map((sticker) => (sticker.id === id ? { ...sticker, label } : sticker)),
        })),
      deleteSticker: (id) =>
        set((state) => ({
          stickers: state.stickers.filter((sticker) => sticker.id !== id),
        })),
      toggleStickerFavorite: (id) =>
        set((state) => ({
          stickers: state.stickers.map((sticker) =>
            sticker.id === id ? { ...sticker, favorite: !sticker.favorite } : sticker,
          ),
        })),
      addGroupChat: (name, memberIds) =>
        set((state) => ({
          groupChats: [
            {
              id: createId('group'),
              name: name.trim() || '新的群聊',
              memberIds,
              createdAt: Date.now(),
            },
            ...state.groupChats,
          ],
        })),
      updateGroupChat: (id, updates) =>
        set((state) => ({
          groupChats: state.groupChats.map((group) =>
            group.id === id
              ? {
                  ...group,
                  name: updates.name?.trim() || group.name,
                  memberIds: updates.memberIds || group.memberIds,
                }
              : group,
          ),
        })),
      deleteGroupChat: (id) =>
        set((state) => ({
          groupChats: state.groupChats.filter((group) => group.id !== id),
          chatSessions: Object.fromEntries(
            Object.entries(state.chatSessions).filter(([key]) => key !== sessionKey(id, 'wechat')),
          ),
        })),
      setContactTag: (characterId, tag) =>
        set((state) => {
          const tags = tag
            .split(/[，,、\s]+/)
            .map((item) => item.trim())
            .filter(Boolean);
          const next = { ...state.contactTags };
          if (tags.length === 0) {
            delete next[characterId];
          } else {
            next[characterId] = Array.from(new Set(tags));
          }
          return { contactTags: next };
        }),
      addPurchaseRecord: (record) =>
        set((state) => ({
          purchaseRecords: [{ ...record, id: createId('order'), createdAt: Date.now() }, ...state.purchaseRecords],
        })),
      deletePurchaseRecord: (id) =>
        set((state) => ({
          purchaseRecords: state.purchaseRecords.filter((record) => record.id !== id),
        })),
      addPhoneCallRecord: (record) => {
        const id = record.id || createId('call');
        set((state) => ({
          phoneCallRecords: [
            {
              ...record,
              id,
              summary: record.summary.trim(),
              transcript: record.transcript.map((line) => ({ ...line, text: line.text.trim() })).filter((line) => line.text),
              durationSeconds: Math.max(0, Math.round(record.durationSeconds)),
            },
            ...state.phoneCallRecords,
          ].slice(0, 200),
        }));
        return id;
      },
      updatePhoneCallRecord: (id, updates) =>
        set((state) => ({
          phoneCallRecords: state.phoneCallRecords.map((record) =>
            record.id === id
              ? {
                  ...record,
                  ...updates,
                  summary: updates.summary?.trim() ?? record.summary,
                  transcript: updates.transcript
                    ? updates.transcript.map((line) => ({ ...line, text: line.text.trim() })).filter((line) => line.text)
                    : record.transcript,
                  durationSeconds: typeof updates.durationSeconds === 'number'
                    ? Math.max(0, Math.round(updates.durationSeconds))
                    : record.durationSeconds,
                }
              : record,
          ),
        })),
      deletePhoneCallRecord: (id) =>
        set((state) => ({
          phoneCallRecords: state.phoneCallRecords.filter((record) => record.id !== id),
        })),
      togglePhoneCallFavorite: (id) =>
        set((state) => ({
          phoneCallRecords: state.phoneCallRecords.map((record) =>
            record.id === id ? { ...record, favorite: !record.favorite } : record,
          ),
        })),
      addBilibiliEntries: (entries) => {
        const nextEntries = entries.map((entry) => ({
          ...entry,
          id: entry.id || createId('bili'),
          title: entry.title.trim() || '未命名 B站视频',
          upName: entry.upName.trim() || '匿名UP',
          cover: entry.cover.trim(),
          url: entry.url.trim(),
          description: entry.description.trim(),
          tags: entry.tags.map((tag) => tag.trim()).filter(Boolean),
          playCount: entry.playCount.trim() || '0',
          danmakuCount: entry.danmakuCount.trim() || '0',
          comments: entry.comments
            .map((comment) => ({
              ...comment,
              id: comment.id || createId('bili-comment'),
              userName: comment.userName.trim() || '路过的观众',
              content: comment.content.trim(),
              likedCount: comment.likedCount.trim() || '0',
            }))
            .filter((comment) => comment.content),
          danmaku: entry.danmaku.map((item) => item.trim()).filter(Boolean),
          createdAt: entry.createdAt || Date.now(),
          source: entry.source || 'generated',
        }));
        const ids = nextEntries.map((entry) => entry.id);
        set((state) => ({
          bilibiliEntries: [
            ...nextEntries,
            ...state.bilibiliEntries.filter((entry) => !ids.includes(entry.id)),
          ].slice(0, 120),
        }));
        return ids;
      },
      deleteBilibiliEntry: (id) =>
        set((state) => ({
          bilibiliEntries: state.bilibiliEntries.filter((entry) => entry.id !== id),
          bilibiliSearches: state.bilibiliSearches.map((search) => ({
            ...search,
            entryIds: search.entryIds.filter((entryId) => entryId !== id),
          })),
        })),
      toggleBilibiliFavorite: (id) =>
        set((state) => ({
          bilibiliEntries: state.bilibiliEntries.map((entry) =>
            entry.id === id ? { ...entry, favorite: !entry.favorite } : entry,
          ),
        })),
      markBilibiliWatched: (id, watchedAt = Date.now()) =>
        set((state) => ({
          bilibiliEntries: state.bilibiliEntries.map((entry) =>
            entry.id === id ? { ...entry, watchedAt } : entry,
          ),
        })),
      addBilibiliSearch: (record) => {
        const id = record.id || createId('bili-search');
        set((state) => ({
          bilibiliSearches: [
            {
              ...record,
              id,
              query: record.query.trim(),
              summary: record.summary.trim(),
              entryIds: record.entryIds.filter(Boolean),
              source: record.source || 'generated',
              createdAt: record.createdAt || Date.now(),
            },
            ...state.bilibiliSearches,
          ].slice(0, 30),
        }));
        return id;
      },
      addBrowserSearch: (record) => {
        const id = record.id || createId('browser');
        set((state) => ({
          browserSearches: [
            {
              ...record,
              id,
              query: record.query.trim(),
              summary: record.summary.trim(),
              results: record.results,
              source: record.source || 'generated',
              createdAt: record.createdAt || Date.now(),
            },
            ...state.browserSearches,
          ].slice(0, 30),
        }));
        return id;
      },
      deleteBrowserSearch: (id) =>
        set((state) => ({
          browserSearches: state.browserSearches.filter((record) => record.id !== id),
        })),
      addBrowserBookmark: (bookmark) =>
        set((state) => {
          const exists = state.browserBookmarks.some((item) => item.url === bookmark.url);
          if (exists) return {};
          return {
            browserBookmarks: [
              {
                ...bookmark,
                id: bookmark.id || createId('bookmark'),
                title: bookmark.title.trim(),
                url: bookmark.url.trim(),
                snippet: bookmark.snippet.trim(),
                createdAt: bookmark.createdAt || Date.now(),
              },
              ...state.browserBookmarks,
            ].slice(0, 50),
          };
        }),
      deleteBrowserBookmark: (id) =>
        set((state) => ({
          browserBookmarks: state.browserBookmarks.filter((bookmark) => bookmark.id !== id),
        })),
      addBrowserHistory: (item) =>
        set((state) => ({
          browserHistory: [
            {
              ...item,
              id: item.id || createId('history'),
              title: item.title.trim(),
              url: item.url.trim(),
              query: item.query?.trim(),
              visitedAt: item.visitedAt || Date.now(),
            },
            ...state.browserHistory.filter((history) => history.url !== item.url),
          ].slice(0, 80),
        })),
      clearBrowserHistory: () => set({ browserHistory: [] }),
      addTheaterScene: (scene) => {
        const id = scene.id || createId('theater');
        set((state) => {
          const now = Date.now();
          const nextScene: TheaterScene = {
            ...scene,
            id,
            title: scene.title.trim() || scene.theme.trim().slice(0, 18) || '未命名小剧场',
            theme: scene.theme.trim(),
            characterIds: scene.characterIds.filter(Boolean),
            content: scene.content.trim(),
            beats: scene.beats.map((beat) => beat.trim()).filter(Boolean),
            source: scene.source || 'manual',
            favorite: Boolean(scene.favorite),
            createdAt: scene.createdAt || now,
            updatedAt: scene.updatedAt || now,
          };
          return { theaterScenes: [nextScene, ...state.theaterScenes].slice(0, 80) };
        });
        return id;
      },
      updateTheaterScene: (id, updates) =>
        set((state) => ({
          theaterScenes: state.theaterScenes.map((scene) =>
            scene.id === id
              ? {
                  ...scene,
                  ...updates,
                  title: updates.title?.trim() || scene.title,
                  theme: updates.theme?.trim() ?? scene.theme,
                  characterIds: updates.characterIds ? updates.characterIds.filter(Boolean) : scene.characterIds,
                  content: updates.content?.trim() ?? scene.content,
                  beats: updates.beats ? updates.beats.map((beat) => beat.trim()).filter(Boolean) : scene.beats,
                  updatedAt: Date.now(),
                }
              : scene,
          ),
        })),
      deleteTheaterScene: (id) => set((state) => ({ theaterScenes: state.theaterScenes.filter((scene) => scene.id !== id) })),
      toggleTheaterSceneFavorite: (id) =>
        set((state) => ({
          theaterScenes: state.theaterScenes.map((scene) =>
            scene.id === id ? { ...scene, favorite: !scene.favorite, updatedAt: Date.now() } : scene,
          ),
        })),
      addTheaterTopicEntry: (topic) => {
        const id = topic.id || createId('topic');
        set((state) => {
          const now = Date.now();
          const nextTopic: TheaterTopicEntry = {
            id,
            title: topic.title.trim() || topic.content.replace(/\s+/g, ' ').slice(0, 24) || '未命名主题',
            content: topic.content.trim(),
            category: topic.category.trim() || '默认',
            favorite: Boolean(topic.favorite),
            createdAt: now,
            updatedAt: now,
          };
          if (!nextTopic.content) return {};
          return { theaterTopicEntries: [nextTopic, ...state.theaterTopicEntries].slice(0, 240) };
        });
        return id;
      },
      importTheaterTopicEntries: (entries) =>
        set((state) => {
          const now = Date.now();
          const imported = entries
            .map((entry): TheaterTopicEntry => ({
              id: entry.id || createId('topic'),
              title: entry.title.trim() || entry.content.replace(/\s+/g, ' ').slice(0, 24) || '未命名主题',
              content: entry.content.trim(),
              category: entry.category.trim() || '默认',
              favorite: Boolean(entry.favorite),
              createdAt: now,
              updatedAt: now,
            }))
            .filter((entry) => entry.content);
          const byId = new Map([...state.theaterTopicEntries, ...imported].map((entry) => [entry.id, entry]));
          return { theaterTopicEntries: Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 240) };
        }),
      updateTheaterTopicEntry: (id, updates) =>
        set((state) => ({
          theaterTopicEntries: state.theaterTopicEntries.map((topic) =>
            topic.id === id
              ? {
                  ...topic,
                  ...updates,
                  title: updates.title?.trim() || topic.title,
                  content: updates.content?.trim() ?? topic.content,
                  category: updates.category?.trim() || topic.category,
                  updatedAt: Date.now(),
                }
              : topic,
          ),
        })),
      deleteTheaterTopicEntry: (id) =>
        set((state) => ({ theaterTopicEntries: state.theaterTopicEntries.filter((topic) => topic.id !== id) })),
      toggleTheaterTopicFavorite: (id) =>
        set((state) => ({
          theaterTopicEntries: state.theaterTopicEntries.map((topic) =>
            topic.id === id ? { ...topic, favorite: !topic.favorite, updatedAt: Date.now() } : topic,
          ),
        })),
      importTheaterWorldBookEntries: (entries) =>
        set((state) => {
          const now = Date.now();
          const imported = entries.map((entry, index): TheaterWorldBookEntry => ({
            ...entry,
            id: entry.id || createId('twb'),
            comment: entry.comment.trim() || `世界书条目 ${index + 1}`,
            content: entry.content,
            enabled: entry.enabled !== false,
            selected: entry.selected !== false,
            category: entry.category?.trim() || '玩家导入',
            source: entry.source === 'low' ? 'low' : 'imported',
            builtIn: Boolean(entry.builtIn),
            keys: entry.keys.map((key) => key.trim()).filter(Boolean),
            importedAt: entry.importedAt || now,
            updatedAt: entry.updatedAt || now,
          }));
          const byId = new Map([...state.theaterWorldBookEntries, ...imported].map((entry) => [entry.id, entry]));
          return {
            theaterWorldBookEntries: Array.from(byId.values())
              .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999) || b.updatedAt - a.updatedAt)
              .slice(0, 120),
          };
        }),
      updateTheaterWorldBookEntry: (id, updates) =>
        set((state) => ({
          theaterWorldBookEntries: state.theaterWorldBookEntries.map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  ...updates,
                  comment: updates.comment?.trim() || entry.comment,
                  content: updates.content ?? entry.content,
                  keys: updates.keys ? updates.keys.map((key) => key.trim()).filter(Boolean) : entry.keys,
                  updatedAt: Date.now(),
                }
              : entry,
          ),
        })),
      deleteTheaterWorldBookEntry: (id) =>
        set((state) => ({
          theaterWorldBookEntries: state.theaterWorldBookEntries.filter((entry) => entry.id !== id),
        })),
      setBrowserWorldBook: (content) => set({ browserWorldBook: content }),
      setBrowserApiConfig: (updates) => set(updates),
      setModelConfig: (updates) => set(updates),
      setAvailableModels: (models) => set({ availableModels: models, selectedModel: models[0] || '' }),
      addDiary: (entry) =>
        set((state) => {
          const now = Date.now();
          const diary: DiaryEntry = {
            ...entry,
            id: entry.id || createId('diary'),
            title: entry.title.trim() || '未命名日记',
            content: entry.content.trim(),
            tags: entry.tags.map((tag) => tag.trim()).filter(Boolean),
            createdAt: entry.createdAt || now,
            updatedAt: entry.updatedAt || now,
          };
          return { diaries: [diary, ...state.diaries] };
        }),
      updateDiary: (id, updates) =>
        set((state) => ({
          diaries: state.diaries.map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  ...updates,
                  title: updates.title?.trim() || entry.title,
                  content: updates.content ?? entry.content,
                  tags: updates.tags ? updates.tags.map((tag) => tag.trim()).filter(Boolean) : entry.tags,
                  updatedAt: Date.now(),
                }
              : entry,
          ),
        })),
      deleteDiary: (id) => set((state) => ({ diaries: state.diaries.filter((entry) => entry.id !== id) })),
      addCalendarEvent: (event) => {
        const id = event.id || createId('calendar');
        set((state) => {
          const now = Date.now();
          const calendarEvent: CalendarEvent = {
            ...event,
            id,
            title: event.title.trim() || '未命名日程',
            note: event.note?.trim(),
            location: event.location?.trim(),
            startAt: event.startAt,
            endAt: event.endAt,
            allDay: Boolean(event.allDay),
            repeat: event.repeat || 'none',
            tags: event.tags.map((tag) => tag.trim()).filter(Boolean),
            relatedDiaryIds: event.relatedDiaryIds || [],
            relatedMessageIds: event.relatedMessageIds || [],
            favorite: Boolean(event.favorite),
            createdAt: event.createdAt || now,
            updatedAt: event.updatedAt || now,
          };
          return { calendarEvents: [...state.calendarEvents, calendarEvent].sort((a, b) => a.startAt - b.startAt) };
        });
        return id;
      },
      updateCalendarEvent: (id, updates) =>
        set((state) => ({
          calendarEvents: state.calendarEvents
            .map((event) =>
              event.id === id
                ? {
                    ...event,
                    ...updates,
                    title: updates.title?.trim() || event.title,
                    note: updates.note?.trim() ?? event.note,
                    location: updates.location?.trim() ?? event.location,
                    tags: updates.tags ? updates.tags.map((tag) => tag.trim()).filter(Boolean) : event.tags,
                    updatedAt: Date.now(),
                  }
                : event,
            )
            .sort((a, b) => a.startAt - b.startAt),
        })),
      deleteCalendarEvent: (id) => set((state) => ({ calendarEvents: state.calendarEvents.filter((event) => event.id !== id) })),
      toggleCalendarEventFavorite: (id) =>
        set((state) => ({
          calendarEvents: state.calendarEvents.map((event) => (event.id === id ? { ...event, favorite: !event.favorite, updatedAt: Date.now() } : event)),
        })),
      addGalleryPhoto: (photo) => {
        const id = photo.id || createId('photo');
        set((state) => {
          const now = Date.now();
          const galleryPhoto: GalleryPhoto = {
            ...photo,
            id,
            title: photo.title.trim() || '未命名照片',
            description: photo.description?.trim(),
            album: photo.album || '生活',
            note: photo.note?.trim(),
            tags: photo.tags.map((tag) => tag.trim()).filter(Boolean),
            characterId: photo.characterId,
            readableByChar: photo.readableByChar !== false && !photo.hidden,
            reviews: photo.reviews || [],
            favorite: Boolean(photo.favorite),
            hidden: Boolean(photo.hidden),
            createdAt: photo.createdAt || now,
            updatedAt: photo.updatedAt || now,
          };
          return { galleryPhotos: [galleryPhoto, ...state.galleryPhotos] };
        });
        return id;
      },
      updateGalleryPhoto: (id, updates) =>
        set((state) => ({
          galleryPhotos: state.galleryPhotos.map((photo) =>
            photo.id === id
              ? {
                  ...photo,
                  ...updates,
                  title: updates.title?.trim() || photo.title,
                  description: updates.description?.trim() ?? photo.description,
                  note: updates.note?.trim() ?? photo.note,
                  tags: updates.tags ? updates.tags.map((tag) => tag.trim()).filter(Boolean) : photo.tags,
                  readableByChar: updates.hidden ? false : updates.readableByChar ?? photo.readableByChar,
                  updatedAt: Date.now(),
                }
              : photo,
          ),
        })),
      addGalleryPhotoReview: (id, review) =>
        set((state) => ({
          galleryPhotos: state.galleryPhotos.map((photo) =>
            photo.id === id
              ? {
                  ...photo,
                  reviews: [
                    {
                      characterId: review.characterId,
                      content: review.content.trim(),
                      createdAt: review.createdAt || Date.now(),
                    },
                    ...(photo.reviews || []),
                  ],
                  updatedAt: Date.now(),
                }
              : photo,
          ),
        })),
      deleteGalleryPhoto: (id) => set((state) => ({ galleryPhotos: state.galleryPhotos.filter((photo) => photo.id !== id) })),
      toggleGalleryPhotoFavorite: (id) =>
        set((state) => ({
          galleryPhotos: state.galleryPhotos.map((photo) => (photo.id === id ? { ...photo, favorite: !photo.favorite, updatedAt: Date.now() } : photo)),
        })),
      addGalleryTag: (tag) =>
        set((state) => {
          const normalized = tag.trim();
          if (!normalized || state.galleryTags.includes(normalized)) return {};
          return { galleryTags: [...state.galleryTags, normalized] };
        }),
      deleteGalleryTag: (tag) =>
        set((state) => ({
          galleryTags: state.galleryTags.filter((item) => item !== tag),
          galleryPhotos: state.galleryPhotos.map((photo) => ({
            ...photo,
            tags: photo.tags.filter((item) => item !== tag),
          })),
        })),
      addMemo: (memo) =>
        set((state) => {
          const content = memo.trim();
          if (!content) return {};
          const now = Date.now();
          const entry: MemoEntry = {
            id: createId('memo'),
            title: content.slice(0, 18),
            content,
            type: 'note',
            tags: [],
            color: 'yellow',
            readableByChar: true,
            source: 'manual',
            relatedDiaryIds: [],
            relatedPhotoIds: [],
            relatedMessageIds: [],
            createdAt: now,
            updatedAt: now,
          };
          return { memos: [entry, ...state.memos] };
        }),
      addMemoEntry: (memo) => {
        const id = memo.id || createId('memo');
        set((state) => {
          const now = Date.now();
          const tags = memo.tags.map((tag) => tag.trim()).filter(Boolean);
          const entry: MemoEntry = {
            ...memo,
            id,
            title: memo.title.trim() || memo.content.trim().slice(0, 18) || '未命名备忘',
            content: memo.content.trim(),
            type: memo.type || 'note',
            tags,
            color: memo.color || 'yellow',
            readableByChar: memo.readableByChar !== false,
            pinned: Boolean(memo.pinned),
            locked: Boolean(memo.locked),
            completed: Boolean(memo.completed),
            source: memo.source || 'manual',
            relatedDiaryIds: memo.relatedDiaryIds || [],
            relatedPhotoIds: memo.relatedPhotoIds || [],
            relatedMessageIds: memo.relatedMessageIds || [],
            createdAt: memo.createdAt || now,
            updatedAt: memo.updatedAt || now,
          };
          return {
            memos: [entry, ...state.memos],
            memoTags: Array.from(new Set([...state.memoTags, ...tags])),
          };
        });
        return id;
      },
      updateMemoEntry: (id, updates) =>
        set((state) => ({
          memos: state.memos.map((memo) =>
            memo.id === id
              ? {
                  ...memo,
                  ...updates,
                  title: updates.title?.trim() || memo.title,
                  content: updates.content?.trim() ?? memo.content,
                  tags: updates.tags ? updates.tags.map((tag) => tag.trim()).filter(Boolean) : memo.tags,
                  readableByChar: updates.readableByChar ?? memo.readableByChar,
                  updatedAt: Date.now(),
                }
              : memo,
          ),
          memoTags: Array.from(new Set([...state.memoTags, ...(updates.tags || []).map((tag) => tag.trim()).filter(Boolean)])),
        })),
      deleteMemoEntry: (id) => set((state) => ({ memos: state.memos.filter((memo) => memo.id !== id) })),
      toggleMemoPinned: (id) =>
        set((state) => ({
          memos: state.memos.map((memo) => (memo.id === id ? { ...memo, pinned: !memo.pinned, updatedAt: Date.now() } : memo)),
        })),
      toggleMemoLocked: (id) =>
        set((state) => ({
          memos: state.memos.map((memo) => (memo.id === id ? { ...memo, locked: !memo.locked, readableByChar: memo.locked ? memo.readableByChar : false, updatedAt: Date.now() } : memo)),
        })),
      toggleMemoCompleted: (id) =>
        set((state) => ({
          memos: state.memos.map((memo) => (memo.id === id ? { ...memo, completed: !memo.completed, updatedAt: Date.now() } : memo)),
        })),
      addMemoTag: (tag) =>
        set((state) => {
          const normalized = tag.trim();
          if (!normalized || state.memoTags.includes(normalized)) return {};
          return { memoTags: [...state.memoTags, normalized] };
        }),
      deleteMemoTag: (tag) =>
        set((state) => ({
          memoTags: state.memoTags.filter((item) => item !== tag),
          memos: state.memos.map((memo) => ({
            ...memo,
            tags: memo.tags.filter((item) => item !== tag),
          })),
        })),
      setMemoCharWriter: (settings) =>
        set((state) => ({
          memoCharWriter: {
            ...state.memoCharWriter,
            ...settings,
          },
        })),
      setXiaohongshuProfile: (updates) =>
        set((state) => ({
          xiaohongshuProfile: normalizeXiaohongshuProfile({
            ...state.xiaohongshuProfile,
            ...updates,
            styleTags: updates.styleTags || state.xiaohongshuProfile.styleTags,
          }),
        })),
      addXiaohongshuNote: (note) => {
        const now = Date.now();
        const id = note.id || createId('xhs');
        set((state) => ({
          xiaohongshuNotes: normalizeXiaohongshuNotes([
            {
              ...note,
              id,
              title: note.title.trim() || '无标题笔记',
              content: note.content.trim(),
              tags: note.tags,
              imageUrl: note.imageUrl?.trim(),
              authorId: note.authorId || 'user',
              authorName: note.authorName?.trim() || state.xiaohongshuProfile.displayName || state.userName || '我',
              authorAvatar: note.authorAvatar?.trim() || state.xiaohongshuProfile.avatar || state.userAvatar || '',
              authorType: note.authorType || 'user',
              source: note.source || 'manual',
              mood: note.mood?.trim(),
              location: note.location?.trim(),
              createdAt: note.createdAt || now,
              updatedAt: note.updatedAt || now,
            },
            ...state.xiaohongshuNotes,
          ]),
        }));
        return id;
      },
      updateXiaohongshuNote: (id, updates) =>
        set((state) => ({
          xiaohongshuNotes: normalizeXiaohongshuNotes(
            state.xiaohongshuNotes.map((note) =>
              note.id === id
                ? {
                    ...note,
                    ...updates,
                    title: updates.title?.trim() || note.title,
                    content: updates.content?.trim() ?? note.content,
                    tags: updates.tags || note.tags,
                    imageUrl: updates.imageUrl?.trim() ?? note.imageUrl,
                    mood: updates.mood?.trim() ?? note.mood,
                    location: updates.location?.trim() ?? note.location,
                    updatedAt: Date.now(),
                  }
                : note,
            ),
          ),
        })),
      deleteXiaohongshuNote: (id) =>
        set((state) => ({
          xiaohongshuNotes: state.xiaohongshuNotes.filter((note) => note.id !== id),
        })),
      toggleXiaohongshuFavorite: (id) =>
        set((state) => ({
          xiaohongshuNotes: state.xiaohongshuNotes.map((note) =>
            note.id === id ? { ...note, favorite: !note.favorite, updatedAt: Date.now() } : note,
          ),
        })),
      toggleXiaohongshuFollow: (authorId) =>
        set((state) => {
          const normalized = authorId.trim();
          if (!normalized || normalized === 'user') return {};
          const current = state.xiaohongshuFollowingIds || [];
          return {
            xiaohongshuFollowingIds: current.includes(normalized)
              ? current.filter((id) => id !== normalized)
              : [...current, normalized],
          };
        }),
      replaceXiaohongshuGeneratedNotes: (notes) =>
        set((state) => ({
          xiaohongshuNotes: normalizeXiaohongshuNotes([
            ...notes,
            ...state.xiaohongshuNotes.filter((note) => note.source !== 'generated'),
          ]),
        })),
      addMusicTrack: (track) => {
        const id = track.id || createId('music-track');
        set((state) => {
          const now = Date.now();
          const nextTrack: MusicTrack = {
            ...track,
            id,
            title: track.title.trim() || '未命名歌曲',
            artist: track.artist.trim() || '未知歌手',
            album: track.album?.trim(),
            cover: track.cover?.trim(),
            audioUrl: track.audioUrl?.trim(),
            lyrics: track.lyrics || '',
            melody: track.melody?.trim(),
            arrangement: track.arrangement?.trim(),
            characterId: track.characterId,
            tags: track.tags.map((tag) => tag.trim()).filter(Boolean),
            liked: Boolean(track.liked),
            playCount: track.playCount || 0,
            source: track.source || 'manual',
            createdAt: track.createdAt || now,
            updatedAt: track.updatedAt || now,
          };
          return {
            musicTracks: [nextTrack, ...state.musicTracks],
            musicPlayer: state.musicPlayer.trackId ? state.musicPlayer : { ...state.musicPlayer, trackId: id },
          };
        });
        return id;
      },
      updateMusicTrack: (id, updates) =>
        set((state) => ({
          musicTracks: state.musicTracks.map((track) =>
            track.id === id
              ? {
                  ...track,
                  ...updates,
                  title: updates.title?.trim() || track.title,
                  artist: updates.artist?.trim() || track.artist,
                  album: updates.album?.trim() ?? track.album,
                  cover: updates.cover?.trim() ?? track.cover,
                  audioUrl: updates.audioUrl?.trim() ?? track.audioUrl,
                  lyrics: updates.lyrics ?? track.lyrics,
                  melody: updates.melody?.trim() ?? track.melody,
                  arrangement: updates.arrangement?.trim() ?? track.arrangement,
                  characterId: updates.characterId ?? track.characterId,
                  tags: updates.tags ? updates.tags.map((tag) => tag.trim()).filter(Boolean) : track.tags,
                  updatedAt: Date.now(),
                }
              : track,
          ),
        })),
      deleteMusicTrack: (id) =>
        set((state) => {
          const nextTracks = state.musicTracks.filter((track) => track.id !== id);
          return {
            musicTracks: nextTracks,
            musicPlaylists: state.musicPlaylists.map((playlist) => ({
              ...playlist,
              trackIds: playlist.trackIds.filter((trackId) => trackId !== id),
              updatedAt: playlist.trackIds.includes(id) ? Date.now() : playlist.updatedAt,
            })),
            musicListenRecords: state.musicListenRecords.filter((record) => record.trackId !== id),
            musicPlayer: {
              ...state.musicPlayer,
              trackId: state.musicPlayer.trackId === id ? nextTracks[0]?.id : state.musicPlayer.trackId,
              playing: state.musicPlayer.trackId === id ? false : state.musicPlayer.playing,
              progress: state.musicPlayer.trackId === id ? 0 : state.musicPlayer.progress,
            },
          };
        }),
      toggleMusicTrackLiked: (id) =>
        set((state) => ({
          musicTracks: state.musicTracks.map((track) =>
            track.id === id ? { ...track, liked: !track.liked, updatedAt: Date.now() } : track,
          ),
        })),
      addMusicPlaylist: (playlist) => {
        const id = playlist.id || createId('music-playlist');
        set((state) => {
          const now = Date.now();
          const validTrackIds = new Set(state.musicTracks.map((track) => track.id));
          return {
            musicPlaylists: [
              {
                ...playlist,
                id,
                name: playlist.name.trim() || '未命名歌单',
                description: playlist.description?.trim(),
                cover: playlist.cover?.trim(),
                trackIds: playlist.trackIds.filter((trackId) => validTrackIds.has(trackId)),
                favorite: Boolean(playlist.favorite),
                source: playlist.source || 'manual',
                createdAt: playlist.createdAt || now,
                updatedAt: playlist.updatedAt || now,
              },
              ...state.musicPlaylists,
            ],
          };
        });
        return id;
      },
      updateMusicPlaylist: (id, updates) =>
        set((state) => ({
          musicPlaylists: state.musicPlaylists.map((playlist) =>
            playlist.id === id
              ? {
                  ...playlist,
                  ...updates,
                  name: updates.name?.trim() || playlist.name,
                  description: updates.description?.trim() ?? playlist.description,
                  cover: updates.cover?.trim() ?? playlist.cover,
                  trackIds: updates.trackIds || playlist.trackIds,
                  updatedAt: Date.now(),
                }
              : playlist,
          ),
        })),
      deleteMusicPlaylist: (id) => set((state) => ({ musicPlaylists: state.musicPlaylists.filter((playlist) => playlist.id !== id) })),
      toggleMusicPlaylistFavorite: (id) =>
        set((state) => ({
          musicPlaylists: state.musicPlaylists.map((playlist) =>
            playlist.id === id ? { ...playlist, favorite: !playlist.favorite, updatedAt: Date.now() } : playlist,
          ),
        })),
      addTrackToMusicPlaylist: (playlistId, trackId) =>
        set((state) => ({
          musicPlaylists: state.musicPlaylists.map((playlist) =>
            playlist.id === playlistId && !playlist.trackIds.includes(trackId)
              ? { ...playlist, trackIds: [...playlist.trackIds, trackId], updatedAt: Date.now() }
              : playlist,
          ),
        })),
      removeTrackFromMusicPlaylist: (playlistId, trackId) =>
        set((state) => ({
          musicPlaylists: state.musicPlaylists.map((playlist) =>
            playlist.id === playlistId
              ? { ...playlist, trackIds: playlist.trackIds.filter((id) => id !== trackId), updatedAt: Date.now() }
              : playlist,
          ),
        })),
      setMusicPlayer: (updates) => set((state) => ({ musicPlayer: { ...state.musicPlayer, ...updates } })),
      setMusicSourceConfig: (updates) =>
        set((state) => ({
          musicSourceConfig: {
            ...defaultMusicSourceConfig,
            ...state.musicSourceConfig,
            ...updates,
          },
        })),
      setTtsConfig: (updates) =>
        set((state) => ({
          ttsConfig: {
            ...defaultTtsConfig,
            ...state.ttsConfig,
            ...updates,
          },
        })),
      playMusicTrack: (trackId, record) =>
        set((state) => {
          const now = Date.now();
          const trackExists = state.musicTracks.some((track) => track.id === trackId);
          if (!trackExists) return {};
          return {
            musicPlayer: { ...state.musicPlayer, trackId, playing: true, progress: 0 },
            musicTracks: state.musicTracks.map((track) =>
              track.id === trackId
                ? { ...track, playCount: track.playCount + 1, lastPlayedAt: now, updatedAt: now }
                : track,
            ),
            musicListenRecords: [
              {
                id: createId('listen'),
                trackId,
                characterId: record?.characterId,
                mood: record?.mood?.trim(),
                note: record?.note?.trim(),
                durationSeconds: record?.durationSeconds,
                createdAt: now,
              },
              ...state.musicListenRecords,
            ].slice(0, 80),
          };
        }),
      addMusicListenRecord: (record) => {
        const id = record.id || createId('listen');
        set((state) => ({
          musicListenRecords: [
            {
              ...record,
              id,
              mood: record.mood?.trim(),
              note: record.note?.trim(),
              durationSeconds: record.durationSeconds,
              createdAt: record.createdAt || Date.now(),
            },
            ...state.musicListenRecords,
          ].slice(0, 80),
        }));
        return id;
      },
      importMusicJson: (payload) =>
        set((state) => {
          const importedTracks = normalizeMusicTracks(payload.tracks);
          const tracksById = new Map([...state.musicTracks, ...importedTracks].map((track) => [track.id, track]));
          const nextTracks = Array.from(tracksById.values());
          const importedPlaylists = normalizeMusicPlaylists(payload.playlists, nextTracks);
          const playlistsById = new Map([...state.musicPlaylists, ...importedPlaylists].map((playlist) => [playlist.id, playlist]));
          return {
            musicTracks: nextTracks,
            musicPlaylists: Array.from(playlistsById.values()),
            musicPlayer: state.musicPlayer.trackId || nextTracks.length === 0 ? state.musicPlayer : { ...state.musicPlayer, trackId: nextTracks[0].id },
          };
        }),
      setPresetName: (name) => set({ presetName: name }),
      setTtsEnabled: (enabled) => set({ ttsEnabled: enabled }),
      addAppLog: (log) => {
        const id = log.id || createId('app-log');
        set((state) => ({
          appLogs: [
            {
              ...log,
              id,
              createdAt: log.createdAt || Date.now(),
            },
            ...state.appLogs,
          ].slice(0, 120),
        }));
        return id;
      },
      clearAppLogs: () => set({ appLogs: [] }),
      setLayoutMode: (mode) => set({ layoutMode: mode }),
      setDesktopPage: (page) => set({ desktopPage: page }),
      setLayoutPosition: (id, position) =>
        set((state) => ({
          layoutPositions: {
            ...state.layoutPositions,
            [id]: position,
          },
        })),
      addCustomWidget: (page, type) =>
        set((state) => ({
          customWidgets: [
            ...state.customWidgets,
            {
              id: createId('widget'),
              page,
              type,
              title: type === 'photo' ? '照片组件' : type === 'status' ? '状态组件' : '便签组件',
              content: type === 'photo' ? '' : type === 'status' ? '今天也在运行中' : '点我编辑内容',
              image: undefined,
              x: 24,
              y: 462,
            },
          ],
        })),
      updateCustomWidget: (id, updates) =>
        set((state) => ({
          customWidgets: state.customWidgets.map((widget) =>
            widget.id === id ? { ...widget, ...updates } : widget,
          ),
        })),
      removeCustomWidget: (id) =>
        set((state) => ({
          customWidgets: state.customWidgets.filter((widget) => widget.id !== id),
        })),
    }),
    {
      name: 'char-phone-framework',
        version: 42,
      migrate: (persistedState) => {
        const state = persistedState as Partial<AppState>;
        const persistedStickers = Array.isArray(state.stickers) ? state.stickers : [];
        const stickers = persistedStickers.length > 0
          ? persistedStickers.map((sticker, index) => {
              if (typeof sticker === 'string') {
                return { id: `legacy-sticker-${index}`, url: sticker, label: '旧版内置表情包', favorite: false };
              }
              return { ...sticker, favorite: Boolean(sticker.favorite) };
            })
          : defaultStickers;
        const stickersWithStarters = Array.from(
          new Map([...starterStickerItems, ...stickers].map((sticker) => [sticker.id, sticker])).values(),
        );
        const memos = normalizeMemos(state.memos);
        const phoneCallRecords = normalizePhoneCallRecords(state.phoneCallRecords);
        const theaterScenes = normalizeTheaterScenes(state.theaterScenes);
        const theaterTopicEntries = normalizeTheaterTopicEntries(state.theaterTopicEntries);
        const theaterWorldBookEntries = mergeDefaultTheaterWorldBookEntries(normalizeTheaterWorldBookEntries(state.theaterWorldBookEntries));
        const musicTracks = normalizeMusicTracks(state.musicTracks);
        const defaultTrackAudioUrls = new Map(defaultMusicTracks.map((track) => [track.id, track.audioUrl]));
        const nextMusicTracks = (musicTracks.length > 0 ? musicTracks : defaultMusicTracks).map((track) => ({
          ...track,
          audioUrl: track.audioUrl || defaultTrackAudioUrls.get(track.id),
        }));
        const musicPlaylists = normalizeMusicPlaylists(state.musicPlaylists, nextMusicTracks)
          .filter((playlist) => playlist.id !== 'music-playlist-shared' && playlist.id !== 'music-playlist-daily');
        const nextMusicPlaylists = musicPlaylists.length > 0 ? musicPlaylists : defaultMusicPlaylists;
        const musicListenRecords = normalizeMusicListenRecords(state.musicListenRecords, nextMusicTracks);
        const playerCandidate = state.musicPlayer && typeof state.musicPlayer === 'object' ? state.musicPlayer : undefined;
        const playerTrackId = playerCandidate?.trackId && nextMusicTracks.some((track) => track.id === playerCandidate.trackId)
          ? playerCandidate.trackId
          : nextMusicTracks[0]?.id;
        return {
          ...state,
          activeScreen: 'desktop',
          previousScreen: 'desktop',
          activeChatId: null,
          theme: state.theme || 'gothic',
          layoutPositions: {},
          desktopPage: 0,
          wechatId: !state.wechatId || state.wechatId === 'Muon0417' ? '9142' : state.wechatId,
          wechatStatus: state.wechatStatus && !legacyWechatStatuses.has(state.wechatStatus) ? state.wechatStatus : '',
          wechatPhotos: state.wechatPhotos || [],
          wechatMoments: state.wechatMoments || [],
          stickers: stickersWithStarters,
          groupChats: state.groupChats || [],
          contactTags: state.contactTags || {},
          purchaseRecords: state.purchaseRecords || [],
          phoneCallRecords,
          bilibiliEntries: Array.isArray(state.bilibiliEntries) ? state.bilibiliEntries : [],
          bilibiliSearches: Array.isArray(state.bilibiliSearches) ? state.bilibiliSearches : [],
          browserSearches: Array.isArray(state.browserSearches) ? state.browserSearches : [],
          browserBookmarks: Array.isArray(state.browserBookmarks) ? state.browserBookmarks : [],
          browserHistory: Array.isArray(state.browserHistory) ? state.browserHistory : [],
          theaterScenes,
          theaterTopicEntries,
          theaterWorldBookEntries,
          browserWorldBook: state.browserWorldBook || '',
          browserApiBaseUrl: state.browserApiBaseUrl || '',
          browserApiKey: state.browserApiKey || '',
          browserSelectedModel: state.browserSelectedModel || '',
          apiBaseUrl: state.apiBaseUrl || '',
          apiKey: state.apiKey || '',
          availableModels: state.availableModels || [],
          selectedModel: state.selectedModel || '',
          chatPresetName: state.chatPresetName || '自然微信',
          chatPresetPrompt: state.chatPresetPrompt || '像真实微信聊天一样回复。先读完用户连续发来的几条消息，再按角色性格自然回应；可以只发一条，也可以把不同语气或补充拆成多条短气泡。不要写旁白、编号或解释。',
          browserPresetName: state.browserPresetName || '活人感搜索',
          browserPresetPrompt: state.browserPresetPrompt || '生成像真实互联网搜索结果的页面。强调活人感、社区感和美化：结果应像知乎、豆瓣、小红书、微博、百科、贴吧、新闻站或本地生活网站里真实存在的内容；标题、域名、摘要都要自然，不要出现代码、CSS、JS、phone://、example.com、开发说明或“生成器”字样。内容要服务玩家沉浸感，像角色世界里真实可搜到的网页。',
          chatContextDepth: state.chatContextDepth && state.chatContextDepth > 60 ? state.chatContextDepth : 500,
          chatTemperature: typeof state.chatTemperature === 'number' ? state.chatTemperature : 0.8,
          chatMaxTokens: state.chatMaxTokens || 520,
          chatReplyStyle: state.chatReplyStyle || 'auto',
          diaries: normalizeDiaryEntries(state.diaries),
          calendarEvents: normalizeCalendarEvents(state.calendarEvents),
          galleryPhotos: normalizeGalleryPhotos(state.galleryPhotos),
          galleryTags: Array.isArray(state.galleryTags) && state.galleryTags.length > 0 ? state.galleryTags : ['自拍', '截图', '风景', '约会', '日常', '穿搭', '吃饭', '旅行', '给char看'],
          memos,
          memoTags: normalizeMemoTags(state.memoTags, memos),
          memoCharWriter: state.memoCharWriter || { enabled: false },
          xiaohongshuProfile: normalizeXiaohongshuProfile(state.xiaohongshuProfile),
          xiaohongshuNotes: normalizeXiaohongshuNotes(state.xiaohongshuNotes),
          xiaohongshuFollowingIds: Array.isArray(state.xiaohongshuFollowingIds)
            ? state.xiaohongshuFollowingIds.map((id) => String(id).trim()).filter(Boolean)
            : [],
          musicTracks: nextMusicTracks,
          musicPlaylists: nextMusicPlaylists,
          musicListenRecords,
          musicPlayer: {
            trackId: playerTrackId,
            playing: false,
            progress: typeof playerCandidate?.progress === 'number' ? Math.max(0, Math.min(100, playerCandidate.progress)) : 0,
            duration: typeof playerCandidate?.duration === 'number' ? playerCandidate.duration : 0,
            repeat: Boolean(playerCandidate?.repeat),
            shuffle: Boolean(playerCandidate?.shuffle),
          },
          musicSourceConfig: {
            ...defaultMusicSourceConfig,
            ...(state.musicSourceConfig && typeof state.musicSourceConfig === 'object' ? state.musicSourceConfig : {}),
          },
          ttsConfig: {
            ...defaultTtsConfig,
            ...(state.ttsConfig && typeof state.ttsConfig === 'object' ? state.ttsConfig : {}),
            provider: (state.ttsConfig as Partial<TtsConfig> | undefined)?.provider || 'browser',
            apiKey: (state.ttsConfig as Partial<TtsConfig> | undefined)?.apiKey || '',
            model: (state.ttsConfig as Partial<TtsConfig> | undefined)?.model || defaultTtsConfig.model,
            voiceId: (state.ttsConfig as Partial<TtsConfig> | undefined)?.voiceId || defaultTtsConfig.voiceId,
          },
          appLogs: Array.isArray(state.appLogs) ? state.appLogs.slice(0, 120) : [],
        } as AppState;
      },
    },
  ),
);
