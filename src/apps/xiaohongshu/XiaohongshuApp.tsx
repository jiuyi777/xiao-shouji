/**
 * Standalone Xiaohongshu app UI.
 * Main component: XiaohongshuApp.
 * Dependencies: useAppStore, Xiaohongshu note/profile helpers, lucide-react icons.
 * Maintenance note: visual polish is local CSS/JS; AI-facing context remains text-only.
 */
import {
  ArrowLeft,
  Camera,
  Check,
  Heart,
  Home,
  ImagePlus,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  UserPlus,
  UserRound,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../store';
import { cn } from '../../lib/utils';
import type { XiaohongshuNote } from './types';
import {
  buildGeneratedXiaohongshuNotes,
  filterXiaohongshuNotes,
  getProfileNotes,
  getXiaohongshuFeedNotes,
  type XiaohongshuHomeTab,
} from './xiaohongshuLogic';

type ViewMode = 'feed' | 'compose' | 'detail' | 'profile' | 'editProfile';

const defaultDraft = {
  title: '',
  content: '',
  tags: '',
  imageUrl: '',
  mood: '',
  location: '',
};

const tabLabels: Record<XiaohongshuHomeTab, string> = {
  recommend: '推荐',
  following: '关注',
  nearby: '附近',
};

const avatarPalettes = [
  ['#ff2442', '#ffe9ee'],
  ['#6b5cff', '#f0eeff'],
  ['#0f9f7a', '#e5fff7'],
  ['#d47a13', '#fff2df'],
  ['#d83f8d', '#ffeaf5'],
  ['#168fb8', '#e8f9ff'],
  ['#2d7a49', '#e9f8ed'],
  ['#9d5630', '#fff0e7'],
  ['#d73a3a', '#fff0f0'],
  ['#3158c5', '#edf2ff'],
  ['#b93e71', '#ffe9f1'],
  ['#168996', '#e4fbff'],
];

function splitTags(value: string) {
  return value
    .split(/[,，、\s#]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formatNoteTime(time: number) {
  const date = new Date(time);
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function fallbackAvatar(name: string) {
  return name.trim().slice(0, 1) || '我';
}

function parseAvatarToken(value?: string) {
  if (!value?.startsWith('xhs-avatar:')) return null;
  const [, rawIndex, rawLabel] = value.match(/^xhs-avatar:(\d+):(.+)$/) || [];
  if (!rawLabel) return null;
  return {
    index: Number(rawIndex) || 0,
    label: decodeURIComponent(rawLabel),
  };
}

function VisualAvatar({ src, name, className = '' }: { src?: string; name: string; className?: string }) {
  const token = parseAvatarToken(src);
  const canUseImage = src && !token && !src.startsWith('avatar://') && !src.startsWith('xhs-cover:');
  if (canUseImage) return <img src={src} alt="" className={cn('h-full w-full object-cover', className)} />;
  const [main, bg] = avatarPalettes[(token?.index || name.length) % avatarPalettes.length];
  return (
    <div
      className={cn('grid h-full w-full place-items-center rounded-full text-sm font-black', className)}
      style={{
        color: main,
        background: `radial-gradient(circle at 70% 18%, ${main}30 0 18%, transparent 19%), linear-gradient(145deg, ${bg}, #fff)`,
      }}
    >
      {token?.label || fallbackAvatar(name)}
    </div>
  );
}

function authorBadge(note: XiaohongshuNote) {
  if (note.authorType === 'character') return '角色';
  if (note.authorType === 'world') return '世界';
  return '我';
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="xhs-empty grid min-h-[260px] place-items-center px-8 text-center">
      <div>
        <div className="xhs-soft mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f5f5f5] text-[#9b9b9b]">
          <Search className="h-6 w-6" />
        </div>
        <p className="xhs-title mt-4 text-base font-black text-[#222]">{title}</p>
        <p className="xhs-muted mt-2 text-sm leading-6 text-[#8a8a8a]">{detail}</p>
      </div>
    </div>
  );
}

function NoteCard({ note, onOpen }: { note: XiaohongshuNote; onOpen: (note: XiaohongshuNote) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(note)}
      className="xhs-note-card overflow-hidden rounded-[10px] bg-white text-left shadow-[0_1px_8px_rgba(0,0,0,.06)]"
    >
      {note.imageUrl ? <img src={note.imageUrl} alt="" className="aspect-[3/4] w-full bg-[#f7f7f7] object-cover" /> : null}
      <div className={cn('space-y-2 p-2.5', !note.imageUrl && 'min-h-[142px]')}>
        <p className="xhs-title line-clamp-2 text-[13px] font-bold leading-5 text-[#222]">{note.title}</p>
        {!note.imageUrl && <p className="xhs-muted line-clamp-3 text-xs leading-5 text-[#656565]">{note.content}</p>}
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 shrink-0 overflow-hidden rounded-full">
            <VisualAvatar src={note.authorAvatar} name={note.authorName} />
          </div>
          <span className="xhs-muted min-w-0 flex-1 truncate text-[11px] text-[#666]">{note.authorName}</span>
          <span className="xhs-muted inline-flex items-center gap-0.5 text-[11px] text-[#777]">
            <Heart className={cn('h-3.5 w-3.5', note.favorite && 'fill-[#ff2442] text-[#ff2442]')} />
            {note.likes || 0}
          </span>
        </div>
      </div>
    </button>
  );
}

export function XiaohongshuApp() {
  const {
    characters,
    browserWorldBook,
    galleryPhotos,
    userName,
    userAvatar,
    xiaohongshuProfile,
    xiaohongshuNotes,
    xiaohongshuFollowingIds,
    setXiaohongshuProfile,
    addXiaohongshuNote,
    deleteXiaohongshuNote,
    toggleXiaohongshuFavorite,
    toggleXiaohongshuFollow,
    replaceXiaohongshuGeneratedNotes,
    addGalleryPhoto,
  } = useAppStore();
  const [view, setView] = useState<ViewMode>('feed');
  const [homeTab, setHomeTab] = useState<XiaohongshuHomeTab>('recommend');
  const [activeTag, setActiveTag] = useState('全部');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState(defaultDraft);
  const [profileDraft, setProfileDraft] = useState({
    displayName: xiaohongshuProfile.displayName || userName || '我',
    avatar: xiaohongshuProfile.avatar || userAvatar || '',
    bio: xiaohongshuProfile.bio,
    styleTags: xiaohongshuProfile.styleTags.join(' '),
  });
  const [refreshHint, setRefreshHint] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const noteImageInputRef = useRef<HTMLInputElement>(null);

  const tabNotes = useMemo(
    () => getXiaohongshuFeedNotes(xiaohongshuNotes, homeTab, xiaohongshuFollowingIds || []),
    [homeTab, xiaohongshuFollowingIds, xiaohongshuNotes],
  );
  const tags = useMemo(
    () => ['全部', ...Array.from(new Set(tabNotes.flatMap((note) => note.tags)))],
    [tabNotes],
  );
  const notes = useMemo(() => filterXiaohongshuNotes(tabNotes, activeTag), [activeTag, tabNotes]);
  const activeNote = activeId ? xiaohongshuNotes.find((note) => note.id === activeId) || null : null;
  const userNotes = useMemo(() => getProfileNotes(xiaohongshuNotes), [xiaohongshuNotes]);
  const generatedCount = xiaohongshuNotes.filter((note) => note.source === 'generated').length;
  const selectedImage = draft.imageUrl.trim();

  const switchTab = (tab: XiaohongshuHomeTab) => {
    setHomeTab(tab);
    setActiveTag('全部');
    setView('feed');
  };

  const refreshGeneratedFeed = () => {
    const generated = buildGeneratedXiaohongshuNotes({
      characters,
      userProfile: {
        displayName: profileDraft.displayName.trim() || xiaohongshuProfile.displayName,
        avatar: profileDraft.avatar.trim() || xiaohongshuProfile.avatar,
        bio: profileDraft.bio.trim() || xiaohongshuProfile.bio,
        styleTags: splitTags(profileDraft.styleTags),
      },
      browserWorldBook,
      galleryPhotos,
    });
    replaceXiaohongshuGeneratedNotes(generated);
    setRefreshHint(`已刷新 ${generated.length} 条角色和世界笔记`);
    setView('feed');
  };

  const submitNote = () => {
    const title = draft.title.trim();
    const content = draft.content.trim();
    if (!title && !content) return;
    const id = addXiaohongshuNote({
      title: title || '无标题笔记',
      content,
      tags: splitTags(draft.tags),
      imageUrl: selectedImage || undefined,
      authorId: 'user',
      authorName: xiaohongshuProfile.displayName || userName || '我',
      authorAvatar: xiaohongshuProfile.avatar || userAvatar || '',
      authorType: 'user',
      source: 'manual',
      mood: draft.mood.trim(),
      location: draft.location.trim(),
      likes: 0,
      comments: 0,
    });
    setDraft(defaultDraft);
    setActiveId(id);
    setView('detail');
  };

  const saveProfile = () => {
    setXiaohongshuProfile({
      displayName: profileDraft.displayName,
      avatar: profileDraft.avatar,
      bio: profileDraft.bio,
      styleTags: splitTags(profileDraft.styleTags),
    });
    setView('profile');
  };

  const replaceProfileAvatar = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const nextAvatar = typeof reader.result === 'string' ? reader.result : '';
      setProfileDraft((current) => ({ ...current, avatar: nextAvatar }));
      setXiaohongshuProfile({ avatar: nextAvatar });
    };
    reader.readAsDataURL(file);
  };

  const attachNoteImage = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!imageUrl) return;
      addGalleryPhoto({
        url: imageUrl,
        title: draft.title.trim() || '小红书配图',
        description: draft.content.trim(),
        album: '生活',
        tags: splitTags(draft.tags),
        source: 'upload',
      });
      setDraft((current) => ({ ...current, imageUrl }));
    };
    reader.readAsDataURL(file);
  };

  const openDetail = (note: XiaohongshuNote) => {
    setActiveId(note.id);
    setView('detail');
  };

  const removeNote = (id: string) => {
    deleteXiaohongshuNote(id);
    setActiveId(null);
    setView('feed');
  };

  const emptyCopy = homeTab === 'following'
    ? ['还没有关注内容', '点进角色或世界笔记，关注之后这里才会出现内容。']
    : homeTab === 'nearby'
      ? ['附近还没有内容', '只有带“附近”地点或标签的笔记会出现在这里。']
      : ['首页还没有内容', '点刷新生成角色和世界笔记，或者先发布一条自己的笔记。'];

  return (
    <section className="xhs-app flex h-full flex-col overflow-hidden bg-[#f7f7f7] text-[#222]">
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => replaceProfileAvatar(event.target.files?.[0])}
      />
      <input
        ref={noteImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => attachNoteImage(event.target.files?.[0])}
      />

      <div className="xhs-topbar shrink-0 border-b border-[#ededed] bg-white px-3 pb-2 pt-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => (view === 'feed' ? setView('profile') : setView('feed'))}
            className="xhs-icon-button grid h-9 w-9 place-items-center rounded-full bg-[#f6f6f6] text-[#333]"
            aria-label={view === 'feed' ? '我的主页' : '返回'}
          >
            {view === 'feed' ? <UserRound className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="mx-auto flex w-fit items-center gap-6 text-[15px] font-black">
              {(['recommend', 'following', 'nearby'] as XiaohongshuHomeTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => switchTab(tab)}
                  className={cn('xhs-tab relative pb-1.5', homeTab === tab ? 'active text-[#111]' : 'text-[#777]')}
                >
                  {tabLabels[tab]}
                  {homeTab === tab && <span className="xhs-tab-line absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-[#ff2442]" />}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setView('compose')}
            className="xhs-primary-button grid h-9 w-9 place-items-center rounded-full bg-[#ff2442] text-white shadow-[0_7px_15px_rgba(255,36,66,.26)]"
            aria-label="发布笔记"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        {view === 'feed' && (
          <div className="px-2.5 py-3">
            <div className="mb-3 flex items-center gap-2">
              <button
                type="button"
                onClick={refreshGeneratedFeed}
                className="xhs-refresh-button inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-black text-[#ff2442] shadow-sm"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                刷新世界
              </button>
              <span className="xhs-muted min-w-0 flex-1 truncate text-xs text-[#888]">
                {refreshHint || (generatedCount > 0 ? `${generatedCount} 条生成笔记` : '只会把文字内容送进 AI 上下文')}
              </span>
            </div>

            {tags.length > 1 && (
              <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setActiveTag(tag)}
                    className={cn(
                      'shrink-0 rounded-full px-3 py-1.5 text-xs font-bold',
                      activeTag === tag ? 'xhs-tag-active bg-[#ff2442] text-white' : 'xhs-tag bg-white text-[#666]',
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

            {notes.length === 0 ? (
              <EmptyState title={emptyCopy[0]} detail={emptyCopy[1]} />
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {notes.map((note) => (
                  <div key={note.id}>
                    <NoteCard note={note} onOpen={openDetail} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'profile' && (
          <div className="px-3 py-4">
            <div className="mb-5 flex items-center gap-4">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                    className="xhs-avatar-button relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-white"
                aria-label="点击替换头像"
              >
                <VisualAvatar src={xiaohongshuProfile.avatar} name={xiaohongshuProfile.displayName} />
                <span className="absolute inset-x-0 bottom-0 bg-black/45 py-0.5 text-[10px] font-bold text-white">替换</span>
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-xl font-black">{xiaohongshuProfile.displayName || '我'}</h2>
                  <button
                    type="button"
                    onClick={() => setView('editProfile')}
                    className="xhs-icon-button grid h-8 w-8 place-items-center rounded-full bg-white text-[#666] shadow-sm"
                    aria-label="编辑形象"
                  >
                    <Settings2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="xhs-muted mt-1 line-clamp-2 text-sm leading-5 text-[#777]">{xiaohongshuProfile.bio || '记录一点正在发生的生活。'}</p>
                <div className="xhs-muted mt-3 flex gap-4 text-xs text-[#666]">
                  <span><b className="text-[#222]">{userNotes.length}</b> 笔记</span>
                  <span><b className="text-[#222]">{xiaohongshuFollowingIds?.length || 0}</b> 关注</span>
                </div>
              </div>
            </div>

            {userNotes.length === 0 ? (
              <EmptyState title="还没有发布" detail="发布后的笔记会出现在这里，不再显示那块设置表单。" />
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {userNotes.map((note) => (
                  <div key={note.id}>
                    <NoteCard note={note} onOpen={openDetail} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'editProfile' && (
          <div className="space-y-3 px-4 py-4">
            <div className="xhs-surface flex items-center gap-3 rounded-[12px] bg-white p-3">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full"
                aria-label="点击替换头像"
              >
                <VisualAvatar src={profileDraft.avatar} name={profileDraft.displayName} />
                <span className="absolute inset-x-0 bottom-0 bg-black/45 py-0.5 text-[10px] font-bold text-white">替换</span>
              </button>
              <div className="xhs-muted min-w-0 flex-1 text-sm font-bold text-[#555]">编辑形象只影响小红书展示和刷新生成的文字风格。</div>
            </div>
            <input
              value={profileDraft.displayName}
              onChange={(event) => setProfileDraft((current) => ({ ...current, displayName: event.target.value }))}
              placeholder="昵称"
              className="xhs-input w-full rounded-[12px] border-0 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#ff2442]/25"
            />
            <textarea
              value={profileDraft.bio}
              onChange={(event) => setProfileDraft((current) => ({ ...current, bio: event.target.value }))}
              placeholder="个人简介"
              className="xhs-input min-h-24 w-full resize-none rounded-[12px] border-0 bg-white px-3 py-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-[#ff2442]/25"
            />
            <input
              value={profileDraft.styleTags}
              onChange={(event) => setProfileDraft((current) => ({ ...current, styleTags: event.target.value }))}
              placeholder="形象标签，比如：甜妹 雨天 探店"
              className="xhs-input w-full rounded-[12px] border-0 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#ff2442]/25"
            />
            <button
              type="button"
              onClick={saveProfile}
              className="xhs-primary-button w-full rounded-full bg-[#ff2442] px-4 py-3 text-sm font-black text-white"
            >
              保存形象
            </button>
          </div>
        )}

        {view === 'compose' && (
          <div className="space-y-3 px-4 py-4">
            <input
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="标题"
              className="xhs-input w-full rounded-[12px] border-0 bg-white px-3 py-3 text-base font-bold outline-none focus:ring-2 focus:ring-[#ff2442]/25"
            />
            <textarea
              value={draft.content}
              onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
              placeholder="分享今天的穿搭、探店、心情..."
              className="xhs-input min-h-36 w-full resize-none rounded-[12px] border-0 bg-white px-3 py-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-[#ff2442]/25"
            />

            <div className="xhs-surface rounded-[12px] bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-black">图片</p>
                <button
                  type="button"
                  onClick={() => noteImageInputRef.current?.click()}
                  className="xhs-icon-button inline-flex items-center gap-1 rounded-full bg-[#f6f6f6] px-2.5 py-1.5 text-xs font-bold text-[#555]"
                >
                  <Camera className="h-3.5 w-3.5" />
                  从相册/本机选
                </button>
              </div>
              {selectedImage ? (
                <button
                  type="button"
                  onClick={() => setDraft((current) => ({ ...current, imageUrl: '' }))}
                  className="relative block overflow-hidden rounded-[10px]"
                  aria-label="移除已选图片"
                >
                  <img src={selectedImage} alt="" className="aspect-video w-full object-cover" />
                  <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-xs font-bold text-white">移除</span>
                </button>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => noteImageInputRef.current?.click()}
                    className="xhs-soft grid aspect-square place-items-center rounded-[10px] bg-[#f4f4f4] text-[#777]"
                  >
                    <ImagePlus className="h-5 w-5" />
                  </button>
                  {galleryPhotos.slice(0, 5).map((photo) => (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => setDraft((current) => ({ ...current, imageUrl: photo.url }))}
                      className="xhs-soft overflow-hidden rounded-[10px] bg-[#f4f4f4]"
                    >
                      <img src={photo.url} alt="" className="aspect-square w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <input
              value={draft.tags}
              onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))}
              placeholder="标签，用空格或逗号分隔"
              className="xhs-input w-full rounded-[12px] border-0 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#ff2442]/25"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                value={draft.mood}
                onChange={(event) => setDraft((current) => ({ ...current, mood: event.target.value }))}
                placeholder="心情"
                className="xhs-input min-w-0 rounded-[12px] border-0 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#ff2442]/25"
              />
              <input
                value={draft.location}
                onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))}
                placeholder="地点，比如：附近"
                className="xhs-input min-w-0 rounded-[12px] border-0 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#ff2442]/25"
              />
            </div>
            <button
              type="button"
              onClick={submitNote}
              className="xhs-primary-button w-full rounded-full bg-[#ff2442] px-4 py-3 text-sm font-black text-white"
            >
              发布笔记
            </button>
          </div>
        )}

        {view === 'detail' && activeNote && (
          <article className="xhs-detail bg-white">
            {activeNote.imageUrl ? <img src={activeNote.imageUrl} alt="" className="max-h-[430px] w-full object-cover" /> : null}
            <div className="space-y-4 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                  <VisualAvatar src={activeNote.authorAvatar} name={activeNote.authorName} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black">{activeNote.authorName}</p>
                  <p className="xhs-muted text-xs text-[#888]">{authorBadge(activeNote)} · {formatNoteTime(activeNote.createdAt)}</p>
                </div>
                {activeNote.authorType !== 'user' && (
                  <button
                    type="button"
                    onClick={() => toggleXiaohongshuFollow(activeNote.authorId)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black',
                      xiaohongshuFollowingIds?.includes(activeNote.authorId)
                        ? 'xhs-following bg-[#f3f3f3] text-[#555]'
                        : 'xhs-primary-button bg-[#ff2442] text-white',
                    )}
                  >
                    {xiaohongshuFollowingIds?.includes(activeNote.authorId) ? <Check className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                    {xiaohongshuFollowingIds?.includes(activeNote.authorId) ? '已关注' : '关注'}
                  </button>
                )}
              </div>
              <div>
                <h1 className="text-xl font-black leading-tight">{activeNote.title}</h1>
                <p className="xhs-muted mt-3 whitespace-pre-wrap text-sm leading-7 text-[#333]">{activeNote.content || '没有正文。'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeNote.tags.map((tag) => (
                  <span key={tag} className="xhs-tag rounded-full bg-[#f5f5f5] px-2.5 py-1 text-xs font-bold text-[#555]">#{tag}</span>
                ))}
              </div>
              <div className="xhs-muted flex flex-wrap gap-3 text-xs text-[#888]">
                {activeNote.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{activeNote.location}</span>}
                {activeNote.mood && <span>{activeNote.mood}</span>}
                <span>{activeNote.likes || 0} 喜欢</span>
                <span>{activeNote.comments || 0} 评论</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => toggleXiaohongshuFavorite(activeNote.id)}
                  className="xhs-icon-button inline-flex items-center justify-center gap-2 rounded-full bg-[#f7f7f7] px-3 py-3 text-sm font-black text-[#ff2442]"
                >
                  <Heart className={cn('h-4 w-4', activeNote.favorite && 'fill-[#ff2442]')} />
                  {activeNote.favorite ? '已收藏' : '收藏'}
                </button>
                <button
                  type="button"
                  onClick={() => removeNote(activeNote.id)}
                  className="xhs-icon-button inline-flex items-center justify-center gap-2 rounded-full bg-[#f7f7f7] px-3 py-3 text-sm font-black text-[#666]"
                >
                  <Trash2 className="h-4 w-4" />
                  删除
                </button>
              </div>
            </div>
          </article>
        )}
      </div>

      <div className="xhs-bottom grid w-full shrink-0 grid-cols-3 border-t border-[#ededed] bg-white px-8 py-2 text-xs font-black text-[#777]">
        <button type="button" onClick={() => setView('feed')} className={cn('flex flex-col items-center gap-1', view === 'feed' && 'text-[#ff2442]')}>
          <Home className="h-5 w-5" />
          首页
        </button>
        <button type="button" onClick={() => setView('compose')} className={cn('flex flex-col items-center gap-1', view === 'compose' && 'text-[#ff2442]')}>
          <Plus className="h-5 w-5" />
          发布
        </button>
        <button type="button" onClick={() => setView('profile')} className={cn('flex flex-col items-center gap-1', (view === 'profile' || view === 'editProfile') && 'text-[#ff2442]')}>
          <UserRound className="h-5 w-5" />
          我的
        </button>
      </div>
    </section>
  );
}
