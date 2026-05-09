import { ChevronRight, CircleUserRound, Grid2X2, Settings, ShoppingBag, Sparkles, Star } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { useAppStore } from '../../../store';
import { clampNumber, describeChatMessage, parseSillyTavernPreset, WeChatAvatar, wechatChatPresets, WeChatTopBar } from '../shared/WeChatShared';

export function WeChatMe() {
  const {
    userName,
    userAvatar,
    setUserName,
    setUserAvatar,
    wechatId,
    setWechatId,
    wechatStatus,
    setWechatStatus,
    characters,
    chatSessions,
    stickers,
    purchaseRecords,
    addPurchaseRecord,
    deletePurchaseRecord,
    chatPresetName,
    chatPresetPrompt,
    chatContextDepth,
    chatTemperature,
    chatMaxTokens,
    chatReplyStyle,
    setModelConfig,
  } = useAppStore();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const presetInputRef = useRef<HTMLInputElement>(null);
  const [meView, setMeView] = useState<'home' | 'favorites' | 'orders' | 'settings'>('home');
  const [orderDraft, setOrderDraft] = useState({ characterId: characters[0]?.id || '', itemName: '', amount: '', note: '' });
  const [presetImportText, setPresetImportText] = useState('');
  const favoriteMessages = Object.values(chatSessions).flatMap((session) =>
    session.messages
      .filter((message) => message.favorite && !message.recalled)
      .map((message) => ({ ...message, session })),
  );
  const favoriteStickers = stickers.filter((sticker) => sticker.favorite);

  const uploadAvatar = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setUserAvatar(reader.result as string);
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  if (meView === 'favorites') {
    return (
      <div className="wechat-page">
        <WeChatTopBar title="收藏" onBack={() => setMeView('home')} right={<button type="button" onClick={() => setMeView('home')} className="wechat-mini-button">返回</button>} />
        <div className="wechat-list">
          <div className="wechat-section-title">收藏的消息</div>
          {favoriteMessages.length === 0 && <div className="wechat-empty-card">还没有收藏消息。</div>}
          {favoriteMessages.map((message) => {
            const character = characters.find((item) => item.id === message.session.characterId);
            return (
              <article key={`${message.session.id}-${message.id}`} className="wechat-favorite-card">
                <p className="font-semibold">{character?.name || '聊天'}</p>
                <p>{describeChatMessage(message)}</p>
              </article>
            );
          })}
          <div className="wechat-section-title">收藏的表情</div>
          {favoriteStickers.length === 0 && <div className="wechat-empty-card">还没有收藏表情。</div>}
          <div className="wechat-sticker-library">
            {favoriteStickers.map((sticker) => (
              <div key={sticker.id} className="wechat-sticker-card">
                <img src={sticker.url} alt={sticker.label} />
                <p className="mt-2 text-xs font-bold">{sticker.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (meView === 'orders') {
    const saveOrder = () => {
      if (!orderDraft.itemName.trim()) return;
      addPurchaseRecord({
        characterId: orderDraft.characterId || characters[0]?.id || '',
        itemName: orderDraft.itemName,
        amount: orderDraft.amount,
        note: orderDraft.note,
      });
      setOrderDraft((draft) => ({ ...draft, itemName: '', amount: '', note: '' }));
    };
    return (
      <div className="wechat-page">
        <WeChatTopBar title="订单与卡包" onBack={() => setMeView('home')} right={<button type="button" onClick={() => setMeView('home')} className="wechat-mini-button">返回</button>} />
        <div className="wechat-list">
          <section className="wechat-photo-wall">
            <h2>char 给我买的东西</h2>
            <p>记录谁买的、买了什么、金额和备注。</p>
            <select value={orderDraft.characterId} onChange={(event) => setOrderDraft((draft) => ({ ...draft, characterId: event.target.value }))} className="wechat-inline-input mt-3">
              {characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
            </select>
            <input value={orderDraft.itemName} onChange={(event) => setOrderDraft((draft) => ({ ...draft, itemName: event.target.value }))} placeholder="买了什么" className="wechat-inline-input mt-2" />
            <input value={orderDraft.amount} onChange={(event) => setOrderDraft((draft) => ({ ...draft, amount: event.target.value }))} placeholder="金额 / 价格" className="wechat-inline-input mt-2" />
            <input value={orderDraft.note} onChange={(event) => setOrderDraft((draft) => ({ ...draft, note: event.target.value }))} placeholder="备注，例如：他说下次还会买" className="wechat-inline-input mt-2" />
            <button type="button" onClick={saveOrder} className="wechat-mini-button mt-3">保存记录</button>
          </section>
          {purchaseRecords.map((record) => {
            const character = characters.find((item) => item.id === record.characterId);
            return (
              <article key={record.id} className="wechat-favorite-card">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{record.itemName}</p>
                  <button type="button" onClick={() => deletePurchaseRecord(record.id)} className="wechat-mini-button">删除</button>
                </div>
                <p>{character?.name || 'char'} · {record.amount || '未填金额'}</p>
                {record.note && <p>{record.note}</p>}
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  if (meView === 'settings') {
    const applyPresetObject = (data: Record<string, unknown>) => {
      const preset = parseSillyTavernPreset(data);
      setModelConfig({
        chatPresetName: preset.name,
        chatPresetPrompt: preset.prompt || chatPresetPrompt,
        chatContextDepth: preset.contextDepth,
        chatTemperature: preset.temperature,
        chatMaxTokens: preset.maxTokens,
        ...(preset.model ? { selectedModel: preset.model } : {}),
        chatReplyStyle: (data.reply_style === 'single' || data.reply_style === 'burst' || data.reply_style === 'auto'
          ? data.reply_style
          : chatReplyStyle) as 'auto' | 'single' | 'burst',
      });
    };

    const importPresetFile = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          applyPresetObject(JSON.parse(String(reader.result)));
        } catch {
          setPresetImportText(String(reader.result || ''));
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    };

    const importPresetText = () => {
      if (!presetImportText.trim()) return;
      try {
        applyPresetObject(JSON.parse(presetImportText));
        setPresetImportText('');
      } catch {
        setModelConfig({ chatPresetName: '导入文本预设', chatPresetPrompt: presetImportText });
        setPresetImportText('');
      }
    };

    const applyPreset = (name: string) => {
      const preset = wechatChatPresets.find((item) => item.name === name) || wechatChatPresets[0];
      setModelConfig({
        chatPresetName: preset.name,
        chatPresetPrompt: preset.prompt,
        chatContextDepth: preset.contextDepth,
        chatTemperature: preset.temperature,
        chatMaxTokens: preset.maxTokens,
        chatReplyStyle: preset.replyStyle,
      });
    };

    return (
      <div className="wechat-page">
        <WeChatTopBar title="微信设置" onBack={() => setMeView('home')} right={<button type="button" onClick={() => setMeView('home')} className="wechat-mini-button">返回</button>} />
        <div className="wechat-list">
          <section className="wechat-photo-wall">
            <h2>聊天预设</h2>
            <p>这些参数会随每次微信聊天请求一起发送。</p>
            <select value={chatPresetName} onChange={(event) => applyPreset(event.target.value)} className="wechat-inline-input mt-3">
              {!wechatChatPresets.some((preset) => preset.name === chatPresetName) && <option value={chatPresetName}>{chatPresetName}</option>}
              {wechatChatPresets.map((preset) => <option key={preset.name} value={preset.name}>{preset.name}</option>)}
            </select>
            <textarea
              value={chatPresetPrompt}
              onChange={(event) => setModelConfig({ chatPresetName: '自定义', chatPresetPrompt: event.target.value })}
              className="wechat-inline-input mt-2 min-h-28"
            />
            <input ref={presetInputRef} type="file" accept=".json,.txt" onChange={importPresetFile} className="hidden" />
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => presetInputRef.current?.click()} className="wechat-mini-button">导入预设文件</button>
              <button type="button" onClick={importPresetText} className="wechat-mini-button">应用文本</button>
            </div>
            <textarea
              value={presetImportText}
              onChange={(event) => setPresetImportText(event.target.value)}
              placeholder="粘贴酒馆/聊天预设 JSON 或纯文本提示词"
              className="wechat-inline-input mt-2 min-h-24"
            />
          </section>
          <section className="wechat-photo-wall">
            <h2>生成参数</h2>
            <label className="wechat-setting-row">
              <span>上下文消息数</span>
              <div className="wechat-setting-control">
                <input type="range" min={20} max={1000} value={chatContextDepth} onChange={(event) => setModelConfig({ chatContextDepth: Number(event.target.value) })} />
                <input type="number" min={20} max={1000} value={chatContextDepth} onChange={(event) => setModelConfig({ chatContextDepth: clampNumber(Number(event.target.value), 20, 1000) })} />
              </div>
            </label>
            <label className="wechat-setting-row">
              <span>温度 {chatTemperature.toFixed(2)}</span>
              <div className="wechat-setting-control">
                <input type="range" min={0.1} max={1.6} step={0.05} value={chatTemperature} onChange={(event) => setModelConfig({ chatTemperature: Number(event.target.value) })} />
              </div>
            </label>
            <label className="wechat-setting-row">
              <span>最大长度</span>
              <input type="number" min={120} max={4000} step={20} value={chatMaxTokens} onChange={(event) => setModelConfig({ chatMaxTokens: clampNumber(Number(event.target.value), 120, 4000) })} />
            </label>
            <label className="wechat-setting-row">
              <span>气泡方式</span>
              <select value={chatReplyStyle} onChange={(event) => setModelConfig({ chatReplyStyle: event.target.value as 'auto' | 'single' | 'burst' })}>
                <option value="auto">看性格自动</option>
                <option value="single">尽量一条</option>
                <option value="burst">允许连发</option>
              </select>
            </label>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="wechat-page">
      <WeChatTopBar title="我" right={<Grid2X2 className="h-5 w-5" />} />
      <div className="wechat-me-hero">
        <button type="button" onClick={() => avatarInputRef.current?.click()} className="shrink-0">
          <WeChatAvatar src={userAvatar} name={userName} large />
        </button>
        <input ref={avatarInputRef} type="file" accept="image/*" onChange={uploadAvatar} className="hidden" />
        <div className="min-w-0 flex-1">
          <input value={userName} onChange={(event) => setUserName(event.target.value)} className="wechat-profile-name" />
          <div className="wechat-profile-id">
            <span>微信号</span>
            <input value={wechatId} onChange={(event) => setWechatId(event.target.value)} aria-label="微信号" />
          </div>
          <div className="wechat-profile-chips">
            <span>{wechatStatus || '设个状态'}</span>
            <span>{characters.length || 0}个朋友</span>
            <span className="dot" />
          </div>
        </div>
      </div>
      <div className="wechat-list">
        <label className="wechat-menu-row">
          <span className="wechat-color-icon green"><CircleUserRound className="h-5 w-5" /></span>
          <span>状态</span>
          <input value={wechatStatus} onChange={(event) => setWechatStatus(event.target.value)} placeholder="设个状态" className="wechat-row-input" />
        </label>
        <button type="button" onClick={() => setMeView('favorites')} className="wechat-menu-row">
          <span className="wechat-color-icon yellow"><Star className="h-5 w-5" /></span>
          <span>收藏</span>
          <span className="wechat-row-meta">{favoriteMessages.length + favoriteStickers.length}项</span>
          <ChevronRight className="h-5 w-5 text-[#555]" />
        </button>
        <button type="button" className="wechat-menu-row">
          <span className="wechat-color-icon green"><Sparkles className="h-5 w-5" /></span>
          <span>服务</span>
          <ChevronRight className="ml-auto h-5 w-5 text-[#555]" />
        </button>
        <button type="button" onClick={() => setMeView('orders')} className="wechat-menu-row">
          <span className="wechat-color-icon red"><ShoppingBag className="h-5 w-5" /></span>
          <span>订单与卡包</span>
          <span className="wechat-row-meta">{purchaseRecords.length}条</span>
          <ChevronRight className="ml-auto h-5 w-5 text-[#555]" />
        </button>
        <button type="button" onClick={() => setMeView('settings')} className="wechat-menu-row">
          <span className="wechat-color-icon blue"><Settings className="h-5 w-5" /></span>
          <span>设置</span>
          <ChevronRight className="ml-auto h-5 w-5 text-[#555]" />
        </button>
      </div>
    </div>
  );
}
