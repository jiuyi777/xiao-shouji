/**
 * Real phone module UI extracted from App.tsx.
 * Main component/functions: PhoneScreen, requestPhoneLine, filterPhoneRecordsForView, getPhoneListConfig, buildCallSummary.
 * State dependencies: useAppStore phoneCallRecords/actions, characters, model API config, chat addMessage for optional call-note export.
 * Maintenance note: keep phone-specific flow here; App.tsx should only import and route this screen.
 */
import {
  Bot,
  ChevronLeft,
  CircleUserRound,
  Clock,
  MessageCircle,
  Mic,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  Star,
  Trash2,
  Volume2,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Character, PhoneCallRecord, PhoneCallStatus, PhoneCallTranscriptLine, useAppStore } from '../../store';
import { cn, createId } from '../../lib/utils';
import { speakWithConfiguredTts } from '../../tts';

type PhoneListView = 'recent' | 'missed' | 'outgoing' | 'incoming';
type PhoneView = 'home' | PhoneListView | 'dial' | 'ringing' | 'active' | 'detail';

interface LiveCall {
  characterId: string;
  direction: 'incoming' | 'outgoing';
  startedAt: number;
  answeredAt?: number;
}

export function getPhoneListConfig(view: PhoneListView) {
  const configs: Record<PhoneListView, { title: string; subtitle: string; emptyText: string }> = {
    recent: { title: '最近通话', subtitle: '全部通话记录', emptyText: '还没有最近通话。' },
    missed: { title: '未接来电', subtitle: '未接和无人接听', emptyText: '还没有未接记录。' },
    outgoing: { title: '拨出电话', subtitle: '你主动拨出的电话', emptyText: '还没有拨出记录。' },
    incoming: { title: '来电记录', subtitle: '对方打来的电话', emptyText: '还没有来电记录。' },
  };
  return configs[view];
}

export function filterPhoneRecordsForView(records: PhoneCallRecord[], view: PhoneListView) {
  return records.filter((record) => {
    if (view === 'missed') return record.status === 'missed' || record.status === 'no-answer';
    if (view === 'incoming') return record.direction === 'incoming';
    if (view === 'outgoing') return record.direction === 'outgoing';
    return true;
  });
}

function normalizeApiBaseUrl(url: string) {
  const trimmed = url.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
}

function getCharacterPhonePrompt(character: Character) {
  return [
    `角色名：${character.name}`,
    character.description && `简介：${character.description}`,
    character.personality && `性格：${character.personality}`,
    character.systemPrompt && `角色系统提示：${character.systemPrompt}`,
  ].filter(Boolean).join('\n');
}

async function requestPhoneLine({
  baseUrl,
  apiKey,
  model,
  character,
  transcript,
  userDraft,
}: {
  baseUrl: string;
  apiKey: string;
  model: string;
  character: Character;
  transcript: PhoneCallTranscriptLine[];
  userDraft: string;
}) {
  const endpoint = `${normalizeApiBaseUrl(baseUrl)}/chat/completions`;
  const history = transcript
    .slice(-10)
    .map((line) => `${line.speaker === 'user' ? '用户' : character.name}：${line.text}`)
    .join('\n');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      temperature: 0.72,
      max_tokens: 90,
      messages: [
        {
          role: 'system',
          content: [
            getCharacterPhonePrompt(character) || `你是${character.name}。`,
            '现在是手机电话，不是聊天软件。只输出一句听筒里的口语回复，短、自然、有停顿感。',
            '不要写旁白、动作描写、括号、编号、长篇解释。',
          ].join('\n'),
        },
        {
          role: 'user',
          content: `最近通话字幕：\n${history || '刚接通。'}\n\n用户刚说：${userDraft || '对方沉默了一下。'}\n\n请回一句。`,
        },
      ],
    }),
  });
  if (!response.ok) throw new Error(`电话 AI 失败：${response.status}`);
  const data = await response.json();
  return String(data?.choices?.[0]?.message?.content || '').trim();
}

function fallbackPhoneLine(character: Character, transcript: PhoneCallTranscriptLine[]) {
  const lines = [
    '喂，我在听。',
    '嗯，你说，我这边听得到。',
    '刚刚有点杂音，你再说一遍？',
    '我没走神，真的在听。',
    '好，那你慢慢说。',
    `${character.name ? '嗯' : '嗯'}，我知道了。`,
  ];
  return lines[transcript.length % lines.length];
}

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function formatCallTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statusLabel(status: PhoneCallStatus) {
  const labels: Record<PhoneCallStatus, string> = {
    answered: '已接通',
    missed: '未接',
    declined: '已拒接',
    canceled: '已取消',
    'no-answer': '无人接听',
  };
  return labels[status];
}

function buildCallSummary(record: Pick<PhoneCallRecord, 'status' | 'durationSeconds' | 'transcript'>, characterName: string) {
  if (record.status !== 'answered') return `${characterName}：${statusLabel(record.status)}。`;
  const lastLine = record.transcript.slice().reverse().find((line) => line.speaker === 'char')?.text;
  return `和 ${characterName} 通话 ${formatDuration(record.durationSeconds)}。${lastLine ? `最后说：“${lastLine.slice(0, 42)}”` : '没有留下太多内容。'}`;
}

export function PhoneScreen() {
  const {
    characters,
    phoneCallRecords,
    apiBaseUrl,
    apiKey,
    selectedModel,
    ttsEnabled,
    ttsConfig,
    addPhoneCallRecord,
    updatePhoneCallRecord,
    deletePhoneCallRecord,
    togglePhoneCallFavorite,
    addMessage,
    addAppLog,
    goBack,
  } = useAppStore();
  const [view, setView] = useState<PhoneView>('home');
  const [detailBackView, setDetailBackView] = useState<PhoneListView>('recent');
  const [selectedId, setSelectedId] = useState<string | null>(characters[0]?.id || null);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [liveCall, setLiveCall] = useState<LiveCall | null>(null);
  const [transcript, setTranscript] = useState<PhoneCallTranscriptLine[]>([]);
  const [userDraft, setUserDraft] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [status, setStatus] = useState('');
  const [generating, setGenerating] = useState(false);

  const selectedCharacter = characters.find((item) => item.id === selectedId) || characters[0] || null;
  const activeRecord = phoneCallRecords.find((record) => record.id === activeRecordId) || null;
  const liveCharacter = liveCall ? characters.find((item) => item.id === liveCall.characterId) || null : null;
  const currentListView = (['recent', 'missed', 'outgoing', 'incoming'] as PhoneListView[]).includes(view as PhoneListView)
    ? view as PhoneListView
    : 'recent';
  const filteredRecords = useMemo(() => filterPhoneRecordsForView(phoneCallRecords, currentListView), [currentListView, phoneCallRecords]);
  const recentCount = phoneCallRecords.length;
  const missedCount = filterPhoneRecordsForView(phoneCallRecords, 'missed').length;
  const outgoingCount = filterPhoneRecordsForView(phoneCallRecords, 'outgoing').length;
  const incomingCount = filterPhoneRecordsForView(phoneCallRecords, 'incoming').length;

  useEffect(() => {
    if (!liveCall?.answeredAt) return;
    const updateElapsed = () => setElapsed(Math.floor((Date.now() - liveCall.answeredAt!) / 1000));
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [liveCall?.answeredAt]);

  const startOutgoing = (characterId: string) => {
    setLiveCall({ characterId, direction: 'outgoing', startedAt: Date.now() });
    setTranscript([]);
    setElapsed(0);
    setStatus('正在呼叫...');
    setSelectedId(characterId);
    setView('ringing');
  };

  const startIncoming = (characterId: string) => {
    setLiveCall({ characterId, direction: 'incoming', startedAt: Date.now() });
    setTranscript([]);
    setElapsed(0);
    setStatus('来电中');
    setSelectedId(characterId);
    setView('ringing');
  };

  const connectCall = () => {
    if (!liveCall) return;
    const now = Date.now();
    const character = characters.find((item) => item.id === liveCall.characterId);
    setLiveCall({ ...liveCall, answeredAt: now });
    setTranscript([
      {
        speaker: 'char',
        text: liveCall.direction === 'incoming' ? '喂，是我。' : `喂，${character?.name || '我'}这边听得到。`,
        timestamp: now,
      },
    ]);
    setStatus('已接通');
    setView('active');
  };

  const saveEndedCall = (statusValue: PhoneCallStatus) => {
    if (!liveCall) return null;
    const now = Date.now();
    const character = characters.find((item) => item.id === liveCall.characterId);
    const durationSeconds = liveCall.answeredAt ? Math.max(0, Math.floor((now - liveCall.answeredAt) / 1000)) : 0;
    const draftRecord = {
      characterId: liveCall.characterId,
      direction: liveCall.direction,
      status: statusValue,
      startedAt: liveCall.startedAt,
      answeredAt: liveCall.answeredAt,
      endedAt: now,
      durationSeconds,
      summary: '',
      transcript,
    };
    const summary = buildCallSummary(draftRecord, character?.name || '联系人');
    const id = addPhoneCallRecord({ ...draftRecord, summary });
    setActiveRecordId(id);
    setDetailBackView('recent');
    setLiveCall(null);
    setStatus('');
    setView('detail');
    return id;
  };

  const appendUserLine = () => {
    const clean = userDraft.trim();
    if (!clean) return;
    setTranscript((lines) => [...lines, { speaker: 'user', text: clean, timestamp: Date.now() }]);
    setUserDraft('');
  };

  const generateCharLine = async () => {
    if (!liveCharacter || generating) return;
    const draft = userDraft.trim();
    const baseTranscript = draft
      ? [...transcript, { speaker: 'user' as const, text: draft, timestamp: Date.now() }]
      : transcript;
    setGenerating(true);
    setStatus('听筒里安静了一下...');
    try {
      let text = '';
      if (apiBaseUrl && selectedModel) {
        text = await requestPhoneLine({
          baseUrl: apiBaseUrl,
          apiKey,
          model: selectedModel,
          character: liveCharacter,
          transcript: baseTranscript,
          userDraft: draft,
        });
      }
      const finalText = text || fallbackPhoneLine(liveCharacter, baseTranscript);
      setTranscript([...baseTranscript, { speaker: 'char', text: finalText.slice(0, 80), timestamp: Date.now() }]);
      if (ttsEnabled) {
        void speakWithConfiguredTts(finalText, ttsConfig).catch((error) => {
          addAppLog({
            type: 'tts',
            title: '电话 TTS 播放失败',
            detail: error instanceof Error ? error.message : '未知错误',
          });
        });
      }
      setUserDraft('');
      setStatus(apiBaseUrl && selectedModel ? '已听到回复' : '本地短句回复');
    } catch (error) {
      const finalText = fallbackPhoneLine(liveCharacter, baseTranscript);
      setTranscript([...baseTranscript, { speaker: 'char', text: finalText, timestamp: Date.now() }]);
      setUserDraft('');
      setStatus('电话 AI 暂时失败，已用本地短句。');
      addAppLog({
        type: 'error',
        title: '电话 AI 失败',
        detail: error instanceof Error ? error.message : '未知错误',
      });
    } finally {
      setGenerating(false);
    }
  };

  const saveRecordToChat = (record: PhoneCallRecord) => {
    const character = characters.find((item) => item.id === record.characterId);
    const content = `【电话】${record.direction === 'incoming' ? '来电' : '拨出'} · ${statusLabel(record.status)} · ${formatDuration(record.durationSeconds)}\n${record.summary}`;
    const messageId = createId('msg');
    addMessage(record.characterId, 'wechat', {
      id: messageId,
      role: 'user',
      content,
      timestamp: Date.now(),
      kind: 'call-note',
    });
    updatePhoneCallRecord(record.id, { noteMessageId: messageId });
    setStatus(`已写入和 ${character?.name || '联系人'} 的微信记录。`);
  };

  const confirmDeleteRecord = (record: PhoneCallRecord) => {
    if (!window.confirm('确定删除这条通话记录吗？\n删除后不可恢复。')) return;
    deletePhoneCallRecord(record.id);
    setActiveRecordId(null);
    setView(detailBackView);
  };

  const openRecordDetail = (record: PhoneCallRecord, backView: PhoneListView) => {
    setActiveRecordId(record.id);
    setDetailBackView(backView);
    setView('detail');
  };

  const renderHome = () => (
    <section className="h-full overflow-y-auto pb-8">
      <Header title="电话" subtitle="电话主页" onBack={goBack} />
      <Panel>
        <div className="grid grid-cols-2 gap-3">
          <HomeTile icon={<Clock />} title="最近通话" count={recentCount} onClick={() => setView('recent')} />
          <HomeTile icon={<PhoneMissed />} title="未接来电" count={missedCount} tone="red" onClick={() => setView('missed')} />
          <HomeTile icon={<PhoneCall />} title="拨出电话" count={outgoingCount} tone="green" onClick={() => setView('outgoing')} />
          <HomeTile icon={<PhoneIncoming />} title="来电记录" count={incomingCount} tone="yellow" onClick={() => setView('incoming')} />
        </div>
      </Panel>
      <Panel>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setView('dial')} className="fetch-button bg-[#edf7ed]">
            <PhoneCall className="h-5 w-5" />
            拨号主页
          </button>
          <button
            onClick={() => selectedCharacter && startIncoming(selectedCharacter.id)}
            disabled={!selectedCharacter}
            className="fetch-button bg-[#fff0bd] disabled:opacity-50"
          >
            <PhoneIncoming className="h-5 w-5" />
            模拟来电
          </button>
        </div>
      </Panel>
    </section>
  );

  const renderCallList = (listView: PhoneListView) => {
    const config = getPhoneListConfig(listView);
    return (
      <section className="h-full overflow-y-auto pb-8">
        <Header title={config.title} subtitle={`${config.subtitle} · ${filteredRecords.length} 条`} onBack={() => setView('home')} />
        <Panel>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setView('dial')} className="fetch-button bg-[#edf7ed]">
              <PhoneCall className="h-5 w-5" />
              去拨号
            </button>
            <button onClick={() => setView('home')} className="fetch-button">
              <Phone className="h-5 w-5" />
              电话主页
            </button>
          </div>
        </Panel>
        <Panel>
          {filteredRecords.length === 0 && <Empty text={config.emptyText} />}
          <div className="grid gap-3">
            {filteredRecords.map((record) => {
              const character = characters.find((item) => item.id === record.characterId);
              return (
                <button
                  key={record.id}
                  onClick={() => openRecordDetail(record, listView)}
                  className="rounded-2xl border-[2px] border-[#111]/15 bg-white/60 p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <Avatar character={character} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {record.direction === 'incoming' ? <PhoneIncoming className="h-4 w-4" /> : <PhoneCall className="h-4 w-4" />}
                        <p className="truncate text-base font-black">{character?.name || '未知联系人'}</p>
                        {record.favorite && <Star className="h-4 w-4 fill-[#111]" />}
                      </div>
                      <p className="mt-1 text-xs font-black opacity-55">{statusLabel(record.status)} · {formatCallTime(record.startedAt)} · {formatDuration(record.durationSeconds)}</p>
                      <p className="mt-2 line-clamp-2 text-sm font-bold opacity-70">{record.summary}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>
      </section>
    );
  };

  const renderDial = () => (
    <section className="h-full overflow-y-auto pb-8">
      <Header title="拨号主页" subtitle="选择联系人发起电话" onBack={() => setView('home')} />
      <Panel className="text-center">
        <Avatar character={selectedCharacter || undefined} large />
        <h3 className="mt-3 text-xl font-black">{selectedCharacter?.name || '未选择联系人'}</h3>
        <p className="text-xs font-black opacity-55">{ttsEnabled ? 'TTS 已开启' : 'TTS 未开启'} · 电话会保存独立记录</p>
        <button
          onClick={() => selectedCharacter && startOutgoing(selectedCharacter.id)}
          disabled={!selectedCharacter}
          className="mx-auto mt-5 flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-[#111] bg-[#b9efb2] shadow-[3px_3px_0_#111] disabled:opacity-50"
          aria-label="拨打电话"
        >
          <Phone className="h-8 w-8" />
        </button>
      </Panel>
      <Panel>
        <p className="mb-3 text-lg font-black">联系人拨号</p>
        {characters.length === 0 && <Empty text="还没有角色。先去通讯录导入角色卡。" />}
        <div className="grid gap-3">
          {characters.map((character) => (
            <button key={character.id} onClick={() => setSelectedId(character.id)} className={cn('theme-card', selectedId === character.id && 'active')}>
              <div className="flex items-center gap-3">
                <Avatar character={character} />
                <div className="min-w-0 text-left">
                  <p className="truncate text-base font-black">{character.name}</p>
                  <p className="truncate text-xs font-bold opacity-55">{character.description || '手机联系人'}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </Panel>
    </section>
  );

  const renderRinging = () => {
    const character = liveCharacter || selectedCharacter;
    const incoming = liveCall?.direction === 'incoming';
    return (
      <section className="flex h-full flex-col justify-between bg-[#111] px-5 py-8 text-white">
        <button onClick={() => saveEndedCall(incoming ? 'missed' : 'canceled')} className="flex h-11 w-11 items-center justify-center rounded-full border-[2px] border-white/25 bg-white/10">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="text-center">
          <Avatar character={character || undefined} large dark />
          <h2 className="mt-5 text-3xl font-black">{character?.name || '未知联系人'}</h2>
          <p className="mt-2 text-sm font-black text-white/65">{incoming ? '来电中' : status || '正在呼叫...'}</p>
          <div className="mx-auto mt-6 flex w-28 justify-center gap-1">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white/70" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-white/70 [animation-delay:120ms]" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-white/70 [animation-delay:240ms]" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {incoming ? (
            <>
              <CallCircle icon={<PhoneOff />} label="拒绝" danger onClick={() => saveEndedCall('declined')} />
              <CallCircle icon={<PhoneMissed />} label="未接" onClick={() => saveEndedCall('missed')} />
              <CallCircle icon={<Phone />} label="接听" accept onClick={connectCall} />
            </>
          ) : (
            <>
              <CallCircle icon={<PhoneOff />} label="取消" danger onClick={() => saveEndedCall('canceled')} />
              <CallCircle icon={<PhoneMissed />} label="无人接听" onClick={() => saveEndedCall('no-answer')} />
              <CallCircle icon={<Phone />} label="接通" accept onClick={connectCall} />
            </>
          )}
        </div>
      </section>
    );
  };

  const renderActive = () => {
    const character = liveCharacter || selectedCharacter;
    return (
      <section className="flex h-full flex-col bg-[#151515] text-white">
        <div className="px-5 pb-4 pt-8 text-center">
          <Avatar character={character || undefined} large dark />
          <h2 className="mt-4 text-2xl font-black">{character?.name || '通话中'}</h2>
          <p className="mt-1 text-sm font-black text-white/65">{formatDuration(elapsed)} · {speaker ? '免提' : '听筒'} · {muted ? '已静音' : '麦克风开启'}</p>
        </div>
        <div className="no-scrollbar mx-4 flex-1 overflow-y-auto rounded-2xl bg-white/8 p-4">
          {transcript.map((line) => (
            <div key={`${line.timestamp}-${line.text}`} className={cn('mb-3 flex', line.speaker === 'user' ? 'justify-end' : 'justify-start')}>
              <p className={cn('max-w-[78%] rounded-2xl px-4 py-3 text-sm font-bold leading-6', line.speaker === 'user' ? 'bg-[#d7efc7] text-[#111]' : 'bg-white text-[#111]')}>
                {line.text}
              </p>
            </div>
          ))}
          {generating && <p className="py-4 text-center text-xs font-black text-white/50">听筒里有一点电流声...</p>}
        </div>
        <div className="p-4">
          <textarea
            value={userDraft}
            onChange={(event) => setUserDraft(event.target.value)}
            className="hand-input min-h-20 w-full bg-white text-[#111]"
            placeholder="你对电话里说..."
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={appendUserLine} className="fetch-button bg-white text-[#111]">只记字幕</button>
            <button onClick={() => void generateCharLine()} disabled={generating} className="fetch-button bg-[#fff0bd] text-[#111]">
              <Bot className="h-5 w-5" />
              {generating ? '听着...' : '听回复'}
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <CallCircle icon={<Mic />} label="静音" active={muted} onClick={() => setMuted((value) => !value)} />
            <CallCircle icon={<Volume2 />} label="免提" active={speaker} onClick={() => setSpeaker((value) => !value)} />
            <CallCircle icon={<PhoneOff />} label="挂断" danger onClick={() => saveEndedCall('answered')} />
          </div>
        </div>
      </section>
    );
  };

  const renderDetail = () => {
    if (!activeRecord) return renderHome();
    const character = characters.find((item) => item.id === activeRecord.characterId);
    return (
      <section className="h-full overflow-y-auto pb-8">
        <Header title="通话详情" subtitle={formatCallTime(activeRecord.startedAt)} onBack={() => setView(detailBackView)} />
        <Panel className="text-center">
          <Avatar character={character} large />
          <h2 className="mt-3 text-2xl font-black">{character?.name || '未知联系人'}</h2>
          <p className="mt-1 text-xs font-black opacity-55">
            {activeRecord.direction === 'incoming' ? '来电' : '拨出'} · {statusLabel(activeRecord.status)} · {formatDuration(activeRecord.durationSeconds)}
          </p>
          <p className="mt-4 rounded-2xl bg-white/55 p-4 text-left text-sm font-bold leading-7">{activeRecord.summary}</p>
          {status && <p className="mt-3 text-xs font-black opacity-60">{status}</p>}
        </Panel>
        <Panel>
          <p className="mb-3 text-lg font-black">字幕</p>
          {activeRecord.transcript.length === 0 && <Empty text="这通电话没有字幕。" />}
          <div className="grid gap-2">
            {activeRecord.transcript.map((line) => (
              <div key={`${line.timestamp}-${line.text}`} className="rounded-2xl bg-white/55 p-3 text-sm font-bold leading-6">
                <span className="mr-2 opacity-55">{line.speaker === 'user' ? '你' : character?.name || '联系人'}</span>
                {line.text}
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => togglePhoneCallFavorite(activeRecord.id)} className="fetch-button bg-[#fff0bd]">
              <Star className={cn('h-5 w-5', activeRecord.favorite && 'fill-[#111]')} />
              {activeRecord.favorite ? '取消收藏' : '收藏'}
            </button>
            <button onClick={() => startOutgoing(activeRecord.characterId)} className="fetch-button bg-[#edf7ed]">
              <PhoneCall className="h-5 w-5" />
              再次拨打
            </button>
            <button onClick={() => saveRecordToChat(activeRecord)} className="fetch-button">
              <MessageCircle className="h-5 w-5" />
              写入聊天
            </button>
            <button onClick={() => confirmDeleteRecord(activeRecord)} className="fetch-button bg-[#ffd6d6]">
              <Trash2 className="h-5 w-5" />
              删除
            </button>
          </div>
        </Panel>
      </section>
    );
  };

  if (view === 'dial') return renderDial();
  if (view === 'ringing') return renderRinging();
  if (view === 'active') return renderActive();
  if (view === 'detail') return renderDetail();
  if (view === 'recent' || view === 'missed' || view === 'outgoing' || view === 'incoming') return renderCallList(view);
  return renderHome();
}

function Header({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack: () => void }) {
  return (
    <header className="sticky top-0 z-30 bg-[var(--phone-bg)] px-4 pb-4 pt-6">
      <div className="grid grid-cols-[48px_1fr_48px] items-center">
        <button onClick={onBack} className="circle-button">
          <ChevronLeft className="h-7 w-7" />
        </button>
        <div className="min-w-0 text-center">
          <h1 className="truncate text-2xl font-black">{title}</h1>
          {subtitle && <p className="truncate text-xs font-bold opacity-60">{subtitle}</p>}
        </div>
        <span />
      </div>
    </header>
  );
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('hand-panel mx-4 mt-4 p-5', className)}>{children}</div>;
}

function HomeTile({
  icon,
  title,
  count,
  tone = 'white',
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  tone?: 'white' | 'red' | 'green' | 'yellow';
  onClick: () => void;
}) {
  const toneClass = {
    white: 'bg-white/65',
    red: 'bg-[#ffd6d6]',
    green: 'bg-[#edf7ed]',
    yellow: 'bg-[#fff0bd]',
  }[tone];
  return (
    <button onClick={onClick} style={{ color: '#111' }} className={cn('rounded-2xl border-[3px] border-[#111] p-4 text-left shadow-[3px_3px_0_#111]', toneClass)}>
      {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'mb-3 h-6 w-6' })}
      <p className="text-lg font-black">{title}</p>
      <p className="text-xs font-black opacity-55">{count} 条</p>
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm font-black opacity-55">{text}</p>;
}

function Avatar({ character, large, dark }: { character?: Character | null; large?: boolean; dark?: boolean }) {
  const size = large ? 'h-24 w-24' : 'h-12 w-12';
  return (
    <div className={cn('mx-auto flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border-[3px] border-[#111]', dark ? 'bg-white/15' : 'bg-white', size)}>
      {character?.avatar ? <img src={character.avatar} className="h-full w-full object-cover" /> : <CircleUserRound className={cn('h-1/2 w-1/2', dark ? 'text-white/70' : 'opacity-60')} />}
    </div>
  );
}

function CallCircle({
  icon,
  label,
  danger,
  accept,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  accept?: boolean;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 text-xs font-black text-white">
      <span
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-full border-[2px] border-white/20 shadow-[2px_2px_0_rgba(255,255,255,0.18)]',
          danger ? 'bg-[#ff5c5c]' : accept ? 'bg-[#67d96f]' : active ? 'bg-white text-[#111]' : 'bg-white/12',
        )}
      >
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'h-6 w-6' })}
      </span>
      {label}
    </button>
  );
}
