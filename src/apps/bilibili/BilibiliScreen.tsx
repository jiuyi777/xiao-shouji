/**
 * Standalone Bilibili app screen.
 * Exports: BilibiliScreen.
 * Dependencies: useAppStore from src/store.ts, bilibiliLogic helpers, lucide-react icons.
 * Maintenance note: keep B站 UI and entry parsing in this folder; App.tsx should only route to this component.
 */
import { ChevronLeft, Heart, MessageCircle, Play, RefreshCw, Star } from 'lucide-react';
import { useState } from 'react';
import { buildBilibiliRefreshQuery, buildFallbackBilibiliPayload, parseBilibiliPayload, withBilibiliRoleComments } from './bilibiliLogic';
import type { BilibiliVideoEntry } from './bilibiliTypes';
import { useAppStore } from '../../store';

type BilibiliView = 'feed' | 'search' | 'detail';

function formatBilibiliDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function normalizeApiBaseUrl(url: string) {
  return url.trim().replace(/\/+$/, '').replace(/\/chat\/completions$/, '').replace(/\/v1$/, '/v1');
}

async function requestBilibiliPayload({
  baseUrl,
  apiKey,
  model,
  query,
  temperature,
  preset,
}: {
  baseUrl: string;
  apiKey: string;
  model: string;
  query: string;
  temperature: number;
  preset: string;
}) {
  const response = await fetch(`${normalizeApiBaseUrl(baseUrl)}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: 900,
      messages: [
        {
          role: 'system',
          content: [
            '你是虚拟手机里的 B站 app。输出严格 JSON，不要 Markdown。',
            '结构：{"summary":"...","entries":[{"title":"...","upName":"...","url":"https://www.bilibili.com/video/BV...","description":"...","tags":["..."],"playCount":"...","danmakuCount":"...","danmaku":["..."],"comments":[{"userName":"...","content":"...","likedCount":"..."}]}]}。',
            '只能生成 B站视频条目。不要出现知乎、豆瓣、小红书、微博、贴吧、百科、新闻站等其他平台。',
            '不要声称真实抓取网页或真实播放视频。标题、弹幕、评论要像中文视频社区。',
            preset,
          ].filter(Boolean).join('\n'),
        },
        {
          role: 'user',
          content: `搜索词：${query}`,
        },
      ],
    }),
  });
  if (!response.ok) throw new Error(`B站搜索生成失败：${response.status}`);
  const data = await response.json();
  return data?.choices?.[0]?.message?.content || '';
}

function BilibiliCover({ entry }: { entry: BilibiliVideoEntry }) {
  if (entry.cover) {
    return <img src={entry.cover} alt={entry.title} className="h-full w-full object-cover" />;
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#cfe5ef]">
      <Play className="h-9 w-9 fill-[#111]" />
    </div>
  );
}

function BilibiliCard({
  entry,
  onOpen,
}: {
  entry: BilibiliVideoEntry;
  onOpen: (entry: BilibiliVideoEntry) => void;
}) {
  return (
    <button onClick={() => onOpen(entry)} className="block w-full rounded-[8px] bg-white/45 px-2 py-3 text-left">
      <div className="flex gap-3">
        <div className="h-20 w-32 shrink-0 overflow-hidden rounded-[8px] border-[2px] border-[#111] bg-white">
          <BilibiliCover entry={entry} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-black leading-snug">{entry.title}</h3>
          <p className="mt-1 text-xs font-black text-[#111]/50">{entry.upName}</p>
          <p className="mt-2 line-clamp-1 text-xs font-bold text-[#111]/55">
            {entry.playCount}播放 · {entry.danmakuCount}弹幕 · {formatBilibiliDate(entry.createdAt)}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {entry.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-[6px] bg-[#f4edbd] px-2 py-0.5 text-[10px] font-black">{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}

export function BilibiliScreen() {
  const {
    characters,
    bilibiliEntries,
    bilibiliSearches,
    addBilibiliEntries,
    addBilibiliSearch,
    toggleBilibiliFavorite,
    markBilibiliWatched,
    apiBaseUrl,
    apiKey,
    selectedModel,
    chatTemperature,
    browserPresetPrompt,
  } = useAppStore();
  const entries = bilibiliEntries;
  const [view, setView] = useState<BilibiliView>('feed');
  const [returnView, setReturnView] = useState<Exclude<BilibiliView, 'detail'>>('feed');
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState('');
  const [status, setStatus] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const activeEntry = entries.find((entry) => entry.id === activeId) || entries[0];
  const historyEntries = bilibiliSearches
    .flatMap((search) => search.entryIds)
    .map((id) => bilibiliEntries.find((entry) => entry.id === id))
    .filter((entry): entry is BilibiliVideoEntry => Boolean(entry));

  const openEntry = (entry: BilibiliVideoEntry) => {
    setReturnView(view === 'search' ? 'search' : 'feed');
    setActiveId(entry.id);
    markBilibiliWatched(entry.id);
    setView('detail');
  };

  const runSearch = async () => {
    const seed = buildBilibiliRefreshQuery(characters);
    const clean = query.trim() || seed;
    const commentNames = characters.map((character) => character.name).filter(Boolean);
    const upName = characters[0]?.name ? `${characters[0].name}的小号` : undefined;
    setIsSearching(true);
    setStatus('正在刷新 B站条目...');
    try {
      let payload = buildFallbackBilibiliPayload(clean, Date.now(), { commentNames, upName });
      if (apiBaseUrl && selectedModel) {
        const raw = await requestBilibiliPayload({
          baseUrl: apiBaseUrl,
          apiKey,
          model: selectedModel,
          query: clean,
          temperature: chatTemperature,
          preset: browserPresetPrompt,
        });
        payload = parseBilibiliPayload(raw, clean);
      }
      const entriesWithRoleComments = withBilibiliRoleComments(payload.entries, commentNames);
      const ids = addBilibiliEntries(entriesWithRoleComments);
      addBilibiliSearch({ query: clean, summary: payload.summary, entryIds: ids, source: apiBaseUrl && selectedModel ? 'model' : 'generated' });
      setActiveId(ids[0] || '');
      setQuery('');
      setStatus(payload.summary);
      setView('search');
    } catch {
      const payload = buildFallbackBilibiliPayload(clean, Date.now(), { commentNames, upName });
      const entriesWithRoleComments = withBilibiliRoleComments(payload.entries, commentNames);
      const ids = addBilibiliEntries(entriesWithRoleComments);
      addBilibiliSearch({ query: clean, summary: payload.summary, entryIds: ids, source: 'generated' });
      setActiveId(ids[0] || '');
      setQuery('');
      setStatus(payload.summary);
      setView('search');
    } finally {
      setIsSearching(false);
    }
  };

  if (view === 'detail' && activeEntry) {
    return (
      <section className="no-scrollbar h-full overflow-y-auto pb-8">
        <div className="sticky top-0 z-10 border-b-[3px] border-[#111] bg-[#cfe5ef] px-4 py-4">
          <button onClick={() => setView(returnView)} className="app-chip mb-3 !h-auto w-fit gap-1 px-3 py-2 text-sm font-black">
            <ChevronLeft className="h-4 w-4" /> 返回
          </button>
          <h1 className="text-xl font-black leading-tight">{activeEntry.title}</h1>
          <p className="mt-1 text-xs font-black text-[#111]/60">{activeEntry.upName}</p>
        </div>
        <div className="mx-4 mt-4 overflow-hidden rounded-[8px] border-[3px] border-[#111]">
          <div className="aspect-video">
            <BilibiliCover entry={activeEntry} />
          </div>
        </div>
        <div className="hand-panel mx-4 mt-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black text-[#111]/55">{activeEntry.playCount}播放 · {activeEntry.danmakuCount}弹幕</p>
            <button onClick={() => toggleBilibiliFavorite(activeEntry.id)} className="app-chip">
              <Heart className={activeEntry.favorite ? 'h-5 w-5 fill-[#111]' : 'h-5 w-5'} />
            </button>
          </div>
          <p className="mt-3 text-sm font-bold leading-6 text-[#111]/75">{activeEntry.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {activeEntry.tags.map((tag) => (
              <span key={tag} className="rounded-[6px] bg-[#f4edbd] px-2 py-1 text-xs font-black">#{tag}</span>
            ))}
          </div>
        </div>
        <div className="hand-panel mx-4 mt-4 p-5">
          <h2 className="flex items-center gap-2 text-base font-black"><MessageCircle className="h-4 w-4" /> 弹幕</h2>
          <div className="mt-3 space-y-2">
            {activeEntry.danmaku.map((item) => (
              <p key={item} className="rounded-[8px] bg-white/65 px-3 py-2 text-xs font-black">{item}</p>
            ))}
          </div>
        </div>
        <div className="hand-panel mx-4 mt-4 p-5">
          <h2 className="text-base font-black">评论区</h2>
          <div className="mt-2">
            {activeEntry.comments.map((comment) => (
              <div key={comment.id} className="border-b-[2px] border-[#111]/10 py-3 last:border-b-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black">{comment.userName}</p>
                  <p className="text-xs font-black text-[#111]/45">{comment.likedCount}赞</p>
                </div>
                <p className="mt-1 text-sm font-bold leading-6 text-[#111]/70">{comment.content}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const list: BilibiliVideoEntry[] = view === 'search' && historyEntries.length > 0 ? historyEntries : entries;

  return (
    <section className="no-scrollbar h-full overflow-y-auto pb-8">
      <div className="sticky top-0 z-10 border-b-[3px] border-[#111] bg-[#cfe5ef] px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black">B站</h1>
            <p className="text-xs font-black text-[#111]/55">按角色卡和现实生活刷新视频</p>
          </div>
          <button onClick={() => void runSearch()} disabled={isSearching} className="app-chip">
            <RefreshCw className={isSearching ? 'h-5 w-5 animate-spin' : 'h-5 w-5'} />
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void runSearch();
            }}
            placeholder="可空着，直接按角色卡刷新"
            className="min-w-0 flex-1 rounded-[8px] border-[2px] border-[#111] bg-white px-3 py-2 text-sm font-bold outline-none"
          />
          <button onClick={() => void runSearch()} disabled={isSearching} className="fetch-button bg-[#f4edbd] px-4">
            {isSearching ? '刷新中' : '刷新'}
          </button>
        </div>
        {status && <p className="mt-2 text-xs font-black text-[#111]/55">{status}</p>}
      </div>
      <div className="hand-panel mx-4 mt-4 p-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-black">{view === 'search' ? '刚刷到' : '刷到的视频'}</h2>
          <p className="flex items-center gap-1 text-xs font-black text-[#111]/45">
            <Star className="h-3 w-3" /> {bilibiliEntries.filter((entry) => entry.favorite).length}
          </p>
        </div>
        <div className="space-y-2">
          {list.length === 0 ? (
            <div className="rounded-[8px] bg-white/45 px-3 py-8 text-center">
              <Play className="mx-auto h-8 w-8 fill-[#111]" />
              <p className="mt-3 text-sm font-black">还没有刷到视频</p>
              <p className="mt-1 text-xs font-bold text-[#111]/55">导入角色卡后点刷新，会按角色或现实生活生成 B站条目。</p>
            </div>
          ) : list.map((entry) => (
            <div key={entry.id}>
              <BilibiliCard entry={entry} onOpen={openEntry} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
