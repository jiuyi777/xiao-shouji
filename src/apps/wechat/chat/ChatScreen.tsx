import {
  Bot,
  ChevronLeft,
  Copy,
  Gift,
  Image as ImageIcon,
  ImagePlus,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Phone,
  Plus,
  Quote,
  RefreshCw,
  Search,
  Send,
  ShoppingBag,
  SmilePlus,
  Sparkles,
  Star,
  Trash2,
  Undo2,
  Users,
  Video,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { cn, createId } from '../../../lib/utils';
import { buildNovelAiPrompt, requestNaiImage } from '../../../lib/naiImage';
import { speakWithConfiguredTts } from '../../../tts';
import type { Character, ChatMessage, StickerItem } from '../../../store';
import { useAppStore } from '../../../store';
import { EmptyScreen } from '../../shared/AppPrimitives';
import { delay, describeChatMessage, getCharacterPrompt, requestChatCompletion } from '../../shared/aiText';
import { buildWeChatSystemPrompt, fallbackWeChatReply, parseWeChatReplyParts } from '../ai/wechatAi';
import type { WeChatAiParsedPart } from '../ai/wechatAiMessages';
import { formatMessageTime, WeChatAvatar } from '../shared/WeChatShared';
import {
  canAcceptLifeCard,
  getPendingResponseMode,
  shouldAutoReplyAfterUserAction,
  type PendingChatDraftKind,
} from './wechatInteraction';
import { isUnreadVoiceMessage } from './voiceUnread';
import { VoiceMessageBubble } from './VoiceMessageBubble';

function speak(text: string) {
  const { ttsConfig } = useAppStore.getState();
  speakWithConfiguredTts(text, ttsConfig);
}

type PendingChatDraft = {
  content: string;
  replyTo?: string;
  kind: PendingChatDraftKind;
  sourceMessageId?: string;
};

export function ChatScreen() {
  const {
    activeChatId,
    activeChannel,
    characters,
    groupChats,
    chatSessions,
    addMessage,
    updateMessage,
    deleteMessage,
    toggleMessageFavorite,
    recallMessage,
    markVoiceMessagePlayed,
    addPurchaseRecord,
    addGalleryPhoto,
    goBack,
    stickers,
    ttsEnabled,
    imageGenerationConfig,
    addAppLog,
    apiBaseUrl,
    apiKey,
    selectedModel,
    chatPresetPrompt,
    appPresets,
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
  const [imageDraft, setImageDraft] = useState('');
  const [showImageComposer, setShowImageComposer] = useState(false);
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [pendingUserDrafts, setPendingUserDrafts] = useState<PendingChatDraft[]>([]);
  const [failedDraft, setFailedDraft] = useState<{ drafts: PendingChatDraft[]; mode: 'text' | 'voice'; error?: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [activeToolMessageId, setActiveToolMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScreenRef = useRef<HTMLElement>(null);
  const inputBarRef = useRef<HTMLDivElement>(null);
  const keyboardLiftRef = useRef(0);
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
  const channelPresetPrompt = activeChannel === 'qq'
    ? appPresets.qq.prompt
    : appPresets.wechat.prompt || chatPresetPrompt;
  const chatSubtitle = activeGroup ? `${groupMembers.length}个成员` : activeChannel === 'qq' ? 'QQ聊天' : '';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, activeChatId]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;
    const scrollToLatest = () => window.setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 80);
    viewport.addEventListener('resize', scrollToLatest);
    viewport.addEventListener('scroll', scrollToLatest);
    return () => {
      viewport.removeEventListener('resize', scrollToLatest);
      viewport.removeEventListener('scroll', scrollToLatest);
    };
  }, [activeChatId]);

  const updateKeyboardLift = () => {
    const screen = chatScreenRef.current;
    const inputBar = inputBarRef.current;
    if (!screen || !inputBar) return;
    const activeElement = document.activeElement;
    const isEditingInChat = !!activeElement
      && screen.contains(activeElement)
      && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT');
    if (!isEditingInChat) {
      keyboardLiftRef.current = 0;
      screen.style.setProperty('--wechat-keyboard-lift', '0px');
      return;
    }
    const viewport = window.visualViewport;
    const visibleBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
    const rect = inputBar.getBoundingClientRect();
    const nextLift = Math.max(0, Math.ceil(keyboardLiftRef.current + rect.bottom - visibleBottom + 8));
    keyboardLiftRef.current = nextLift;
    screen.style.setProperty('--wechat-keyboard-lift', `${nextLift}px`);
  };

  useEffect(() => {
    const scheduleUpdate = () => window.setTimeout(updateKeyboardLift, 40);
    const clearLift = () => {
      keyboardLiftRef.current = 0;
      chatScreenRef.current?.style.setProperty('--wechat-keyboard-lift', '0px');
    };
    window.addEventListener('resize', scheduleUpdate);
    window.visualViewport?.addEventListener('resize', scheduleUpdate);
    window.visualViewport?.addEventListener('scroll', scheduleUpdate);
    return () => {
      window.removeEventListener('resize', scheduleUpdate);
      window.visualViewport?.removeEventListener('resize', scheduleUpdate);
      window.visualViewport?.removeEventListener('scroll', scheduleUpdate);
      clearLift();
    };
  }, [activeChatId]);

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
    if (part.kind === 'image') {
      return {
        ...base,
        content: `想发一张图：${part.prompt}`,
        kind: 'text',
      };
    }
    return {
      ...base,
      content: part.content,
      kind: 'text',
    };
  };

  const createGeneratedImageMessage = async ({
    prompt,
    role,
    speaker,
    replyTo,
  }: {
    prompt: string;
    role: 'user' | 'model';
    speaker?: Character;
    replyTo?: string;
  }): Promise<ChatMessage> => {
    const imageUrl = await requestNaiImage({
      config: imageGenerationConfig,
      prompt: buildNovelAiPrompt(`${speaker?.name ? `${speaker.name}想发给我的图，` : ''}${prompt}`, 'wechat'),
    });
    const label = prompt.trim().slice(0, 38) || 'AI 生图';
    const message: ChatMessage = {
      id: createId('msg'),
      role,
      content: imageUrl,
      timestamp: Date.now(),
      kind: 'image',
      stickerLabel: label,
      speakerId: activeGroup && speaker ? speaker.id : undefined,
      replyTo,
    };
    addGalleryPhoto({
      url: imageUrl,
      title: role === 'user' ? '微信生图' : `${speaker?.name || character.name}发来的图`,
      description: prompt,
      album: '聊天',
      tags: ['微信', 'AI生图'],
      source: 'chat',
      characterId: role === 'model' ? speaker?.id || character.id : undefined,
      readableByChar: true,
    });
    return message;
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
                chatPresetPrompt: channelPresetPrompt,
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
        if (part.kind === 'image') {
          try {
            const imageMessage = await createGeneratedImageMessage({ prompt: part.prompt, role: 'model', speaker });
            imageMessage.timestamp = Date.now() + index + speakerIndex;
            addMessage(activeChatId, activeChannel, imageMessage);
          } catch (error) {
            const message = buildLifeMessage(part, speaker);
            message.content = `想发你一张图，但生图失败了：${error instanceof Error ? error.message : '未知错误'}`;
            message.timestamp = Date.now() + index + speakerIndex;
            addMessage(activeChatId, activeChannel, message);
            addAppLog({ type: 'error', title: '微信 char 生图失败', detail: message.content });
          }
          continue;
        }
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

  const requestReplyForDrafts = async (drafts: PendingChatDraft[], responseMode = getPendingResponseMode(drafts)) => {
    if (sending || drafts.length === 0) return;
    setSending(true);
    try {
      await addAssistantReply(drafts, responseMode);
      setPendingUserDrafts([]);
      setFailedDraft(null);
    } catch (error) {
      setFailedDraft({ drafts, mode: responseMode, error: error instanceof Error ? error.message : undefined });
    } finally {
      setIsTyping(false);
      setSending(false);
    }
  };

  const queueUserDraft = (draft: PendingChatDraft) => {
    const nextDrafts = [...pendingUserDrafts, draft];
    setPendingUserDrafts(nextDrafts);
    if (shouldAutoReplyAfterUserAction(draft.kind)) {
      void requestReplyForDrafts(nextDrafts);
    }
  };

  const send = async () => {
    const content = input.trim();
    if (sending) return;
    if (!content) {
      if (pendingUserDrafts.length === 0) return;
      await requestReplyForDrafts(pendingUserDrafts);
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
    queueUserDraft({ content, replyTo, kind });
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
    queueUserDraft({ content: `表情包：${sticker.label}`, replyTo, kind: 'sticker' });
    setReplyDraft(null);
    setFailedDraft(null);
    setShowPlusPanel(false);
  };

  const addCallNote = (type: 'voice' | 'video') => {
    const id = createId('msg');
    const label = type === 'voice' ? '发起语音通话' : '发起视频通话';
    addMessage(activeChatId, activeChannel, {
      id,
      role: 'user',
      content: label,
      timestamp: Date.now(),
      kind: 'call-note',
    });
    setPendingUserDrafts((drafts) => [...drafts, { content: label, kind: 'text', sourceMessageId: id }]);
    setShowPlusPanel(false);
    setShowChatInfo(false);
  };

  const cancelCallNote = (messageId: string) => {
    deleteMessage(activeChatId, activeChannel, messageId);
    setPendingUserDrafts((drafts) => drafts.filter((draft) => draft.sourceMessageId !== messageId));
    setFailedDraft(null);
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
      queueUserDraft({ content: `图片：${safeFileName}`, replyTo, kind: 'image' });
      setReplyDraft(null);
      setFailedDraft(null);
      event.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const sendGeneratedImage = async () => {
    const prompt = imageDraft.trim();
    if (!prompt || generatingImage || sending) return;
    setGeneratingImage(true);
    try {
      const replyTo = replyDraft || undefined;
      const message = await createGeneratedImageMessage({ prompt, role: 'user', replyTo });
      addMessage(activeChatId, activeChannel, message);
      queueUserDraft({ content: `图片：${prompt}`, replyTo, kind: 'image' });
      setImageDraft('');
      setShowImageComposer(false);
      setReplyDraft(null);
      setFailedDraft(null);
      setShowPlusPanel(false);
      addAppLog({ type: 'image', title: '微信 NAI 生图成功', detail: prompt });
    } catch (error) {
      const message = error instanceof Error ? error.message : '生图失败';
      if (pendingUserDrafts.length > 0) setFailedDraft({ drafts: pendingUserDrafts, mode: 'text', error: message });
      setShowImageComposer(true);
      addAppLog({ type: 'error', title: '微信 NAI 生图失败', detail: message });
    } finally {
      setGeneratingImage(false);
    }
  };

  const resetLifeDraft = () => {
    setLifeDraft({ amount: '', note: '', itemName: '' });
    setLifeComposer(null);
  };

  const acceptLifeCard = (message: ChatMessage) => {
    if (!canAcceptLifeCard(message) || sending) return;
    updateMessage(activeChatId, activeChannel, message.id, { status: 'accepted' });
    const label = message.kind === 'red-packet' ? '我收了红包' : '我收了转账';
    const content = `${label}${message.amount ? `：${message.amount}` : ''}${message.note ? `，${message.note}` : ''}`;
    addMessage(activeChatId, activeChannel, {
      id: createId('msg'),
      role: 'user',
      content,
      timestamp: Date.now(),
      kind: 'text',
      replyTo: describeChatMessage(message).slice(0, 60),
    });
    setReplyDraft(null);
    setFailedDraft(null);
    queueUserDraft({
      content,
      replyTo: describeChatMessage(message, true, characters).slice(0, 80),
      kind: message.kind,
    });
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
    queueUserDraft({
      content: describeChatMessage(message, true, characters),
      replyTo,
      kind: lifeComposer,
    });
    setReplyDraft(null);
    setFailedDraft(null);
    resetLifeDraft();
    setShowPlusPanel(false);
  };

  return (
    <section ref={chatScreenRef} className={cn('relative flex h-full flex-col', isWechat && 'wechat-chat-screen')}>
      <div className={cn('px-4 pb-4 pt-6', isWechat && 'wechat-chat-header')}>
        <div className="grid grid-cols-[46px_1fr_46px] items-center">
          <button type="button" onClick={goBack} className="wechat-icon-button" aria-label="返回">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="min-w-0 text-center">
            <h2 className="truncate text-xl font-black">{character.name}</h2>
            {chatSubtitle && <p className="text-xs font-bold opacity-60">{chatSubtitle}</p>}
          </div>
          <button
            type="button"
            onClick={() => {
              setShowChatInfo((visible) => !visible);
              setShowPlusPanel(false);
            }}
            className="wechat-icon-button"
            aria-label="聊天信息"
            aria-expanded={showChatInfo}
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
      </div>

      {showChatInfo && (
        <div className="absolute left-3 right-3 top-20 z-30 rounded-2xl border border-black/10 bg-white/95 p-4 text-[#1f2933] shadow-2xl backdrop-blur">
          <div className="flex items-center gap-3">
            <WeChatAvatar src={character.avatar} name={character.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black">{character.name}</p>
              <p className="text-xs font-semibold text-[#6b7280]">
                {activeGroup ? `${groupMembers.length} 个成员` : activeChannel === 'qq' ? 'QQ 聊天' : '微信聊天'}
              </p>
            </div>
            <button type="button" onClick={() => setShowChatInfo(false)} className="wechat-mini-button">关闭</button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-[#4b5563]">
            <div className="rounded-xl bg-[#f3f4f6] p-3">
              <span className="block text-[#9ca3af]">聊天记录</span>
              <strong className="text-sm text-[#111827]">{messages.length} 条</strong>
            </div>
            <div className="rounded-xl bg-[#f3f4f6] p-3">
              <span className="block text-[#9ca3af]">等待发送</span>
              <strong className="text-sm text-[#111827]">{pendingUserDrafts.length} 条</strong>
            </div>
          </div>
          <p className="mt-3 text-xs font-semibold text-[#6b7280]">
            {apiBaseUrl && selectedModel ? `已连接：${selectedModel}` : '未配置聊天连接，将使用本地模拟回复。'}
          </p>
        </div>
      )}

      <div className={cn('flex-1 overflow-y-auto px-4 py-4', isWechat && 'wechat-message-list')}>
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
              voicePlayedAt={message.voicePlayedAt}
              timestamp={message.timestamp}
              showTools={activeToolMessageId === message.id}
              channel={activeChannel}
              character={speaker || character}
              onToggleTools={() => setActiveToolMessageId((id) => (id === message.id ? null : message.id))}
              onDelete={message.role === 'model' ? () => deleteMessage(activeChatId, activeChannel, message.id) : undefined}
              onToggleFavorite={() => toggleMessageFavorite(activeChatId, activeChannel, message.id)}
              onCopy={() => navigator.clipboard?.writeText(describeChatMessage(message))}
              onReply={() => setReplyDraft(describeChatMessage(message).slice(0, 60))}
              onRecall={message.role === 'user'
                ? message.kind === 'call-note'
                  ? pendingUserDrafts.some((draft) => draft.sourceMessageId === message.id)
                    ? () => cancelCallNote(message.id)
                    : undefined
                  : () => recallMessage(activeChatId, activeChannel, message.id)
                : undefined}
              onVoicePlayed={() => markVoiceMessagePlayed(activeChatId, activeChannel, message.id)}
              onAcceptLifeCard={canAcceptLifeCard(message) ? () => acceptLifeCard(message) : undefined}
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

      <div ref={inputBarRef} className={cn('p-3', isWechat && 'wechat-input-bar')}>
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
            <button type="button" onClick={() => { setShowImageComposer(true); setImageDraft((current) => current || input.trim()); }} className="wechat-plus-action">
              <Sparkles className="h-5 w-5" />
              <span>AI 生图</span>
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
            {showImageComposer && (
              <div className="wechat-life-composer">
                <textarea
                  value={imageDraft}
                  onChange={(event) => setImageDraft(event.target.value)}
                  onFocus={() => {
                    window.setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 80);
                    window.setTimeout(updateKeyboardLift, 80);
                  }}
                  className="min-h-20 w-full resize-none"
                  placeholder="描述想生成的图片"
                />
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={sendGeneratedImage} disabled={generatingImage}>
                    {generatingImage ? '生成中' : '生成并发送'}
                  </button>
                  <button type="button" onClick={() => { setImageDraft(''); setShowImageComposer(false); }}>取消</button>
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
            onFocus={() => {
              window.setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 80);
              window.setTimeout(updateKeyboardLift, 80);
            }}
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
          <button onClick={() => setShowPlusPanel((visible) => !visible)} className={cn('circle-button small', showPlusPanel && 'wechat-compose-button-active')}>
            <Plus className="h-5 w-5" />
          </button>
          <button onClick={send} className="circle-button small wechat-compose-send">
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
  voicePlayedAt,
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
  onVoicePlayed,
  onAcceptLifeCard,
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
  voicePlayedAt?: number;
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
  onVoicePlayed?: () => void;
  onAcceptLifeCard?: () => void;
}) {
  const isUser = role === 'user';
  const isWechat = channel === 'wechat';
  const { userAvatar, userName } = useAppStore();
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
  const canReceiveLifeCard = canAcceptLifeCard({ role, kind: kind as ChatMessage['kind'], status });
  const lifeCardEvents = canReceiveLifeCard && onAcceptLifeCard ? {
    ...messageEvents,
    onClick: (event: React.MouseEvent) => {
      event.stopPropagation();
      clearLongPress();
      onAcceptLifeCard();
    },
  } : messageEvents;

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
        {isUser && onRecall && (
          <button type="button" onClick={(event) => runTool(event, onRecall)} className="wechat-mini-button">
            取消
          </button>
        )}
      </div>
    );
  }

  if (kind === 'transfer' || kind === 'red-packet' || kind === 'shopping') {
    const isRedPacket = kind === 'red-packet';
    const isShopping = kind === 'shopping';
    const title = isShopping ? itemName || content || '购物记录' : isRedPacket ? note || content || '恭喜发财，大吉大利' : note || content || '转账';
    const amountText = amount ? `￥${amount}` : isRedPacket ? '红包' : '未填金额';
    return (
      <div className={cn('wechat-message mb-3 flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
        {isWechat && !isUser && <WeChatAvatar src={character?.avatar} name={character?.name || 'char'} />}
        <div className={cn('flex max-w-[78%] flex-col', isUser ? 'items-end' : 'items-start')}>
          {replyLine}
          <button type="button" className={cn('wechat-life-card', kind, canReceiveLifeCard && 'receivable')} {...lifeCardEvents}>
            <span className="wechat-life-icon">
              {isShopping ? <ShoppingBag className="h-5 w-5" /> : isRedPacket ? <Gift className="h-5 w-5" /> : <RefreshCw className="h-5 w-5" />}
            </span>
            <span className="min-w-0 flex-1">
              <strong>{title}</strong>
              <small>{isShopping ? (note || '生活购物') : status === 'accepted' ? '已收' : canReceiveLifeCard ? '点击收款' : '待收'}</small>
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
      return (
        <div className={cn('wechat-message mb-3 flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
          {!isUser && <WeChatAvatar src={character?.avatar} name={character?.name || 'char'} />}
          <div className={cn('flex max-w-[78%] flex-col', isUser ? 'items-end' : 'items-start')}>
            {replyLine}
            <VoiceMessageBubble
              content={content}
              duration={duration}
              transcript={transcript}
              isUser={isUser}
              isUnread={isUnreadVoiceMessage({ role, kind, voicePlayedAt })}
              onPlay={() => {
                speak(content);
                onVoicePlayed?.();
              }}
              onToggleTools={onToggleTools}
            />
            {meta}
            {messageTools}
          </div>
          {isUser && <WeChatAvatar src={userAvatar} name={userName} />}
        </div>
      );
    }

    return (
      <div className={cn('mb-3 flex', isUser ? 'justify-end' : 'justify-start')}>
        <button
          onClick={() => {
            speak(content);
            onVoicePlayed?.();
          }}
          className={cn('hand-bubble flex min-w-32 items-center gap-2', isUser ? 'bg-[#d7efc7]' : 'bg-white')}
        >
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
        <div
          className={cn(
            isWechat && 'wechat-text-wrap',
            'hand-bubble whitespace-pre-wrap leading-relaxed',
            isWechat ? (isUser ? 'wechat-text-user' : 'wechat-text-model') : (isUser ? 'bg-[#d7efc7]' : 'bg-white'),
          )}
          {...messageEvents}
        >
          {content}
        </div>
        {meta}
        {isWechat && messageTools}
      </div>
      {isWechat && isUser && <WeChatAvatar src={userAvatar} name={userName} />}
    </div>
  );
}
