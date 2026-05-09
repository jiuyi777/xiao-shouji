import { Camera, Image as ImageIcon, ImagePlus, Plus, SmilePlus, Star, Trash2 } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { cn } from '../../../lib/utils';
import { useAppStore } from '../../../store';
import { WeChatTopBar } from '../shared/WeChatShared';

export function WeChatDiscover() {
  const { wechatPhotos, addWechatPhoto, removeWechatPhoto, wechatMoments, addWechatMoment, stickers, addSticker, updateStickerLabel, deleteSticker, toggleStickerFavorite } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const stickerInputRef = useRef<HTMLInputElement>(null);
  const [discoverView, setDiscoverView] = useState<'home' | 'moments' | 'photos' | 'stickers'>('home');
  const [momentDraft, setMomentDraft] = useState('');
  const [stickerLabel, setStickerLabel] = useState('');

  const uploadPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => addWechatPhoto(reader.result as string);
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const uploadSticker = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!stickerLabel.trim()) {
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      addSticker(reader.result as string, stickerLabel);
      setStickerLabel('');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const publishMoment = () => {
    const content = momentDraft.trim();
    if (!content) return;
    addWechatMoment(content);
    setMomentDraft('');
  };

  return (
    <div className="wechat-page">
      <WeChatTopBar
        title={discoverView === 'home' ? '发现' : discoverView === 'moments' ? '朋友圈' : discoverView === 'photos' ? '照片墙' : '表情包'}
        onBack={discoverView === 'home' ? undefined : () => setDiscoverView('home')}
        right={discoverView === 'home' ? <Camera className="h-5 w-5" /> : <button type="button" onClick={() => setDiscoverView('home')} className="wechat-mini-button">返回</button>}
      />
      <div className="wechat-list">
        {discoverView === 'home' && (
          <>
            <button type="button" onClick={() => setDiscoverView('moments')} className="wechat-menu-row">
              <span className="wechat-square-icon orange"><Camera className="h-5 w-5" /></span>
              <span>朋友圈</span>
              <span className="wechat-row-meta">{wechatMoments.length}条</span>
            </button>
            <button type="button" onClick={() => setDiscoverView('photos')} className="wechat-menu-row">
              <span className="wechat-square-icon green"><ImageIcon className="h-5 w-5" /></span>
              <span>照片墙</span>
              <span className="wechat-row-meta">{wechatPhotos.length}张</span>
            </button>
            <button type="button" onClick={() => setDiscoverView('stickers')} className="wechat-menu-row">
              <span className="wechat-square-icon blue"><SmilePlus className="h-5 w-5" /></span>
              <span>表情包</span>
              <span className="wechat-row-meta">{stickers.length}个</span>
            </button>
          </>
        )}
        {discoverView === 'moments' && (
          <section className="wechat-photo-wall">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2>朋友圈</h2>
                <p>先保留本机动态，后面可接角色评论。</p>
              </div>
              <button type="button" onClick={publishMoment} className="wechat-mini-button">发表</button>
            </div>
            <textarea value={momentDraft} onChange={(event) => setMomentDraft(event.target.value)} placeholder="写一条朋友圈..." className="wechat-moment-input" />
            <div className="mt-3 grid gap-2">
              {wechatMoments.length === 0 && <p className="wechat-muted-text">还没有朋友圈。</p>}
              {wechatMoments.map((moment, index) => (
                <article key={`${moment}-${index}`} className="wechat-moment-card">
                  <p>{moment}</p>
                </article>
              ))}
            </div>
          </section>
        )}
        {discoverView === 'photos' && (
          <section className="wechat-photo-wall">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2>照片墙</h2>
                <p>自己挂照片，后面可以接聊天和个人资料。</p>
              </div>
              <button type="button" onClick={() => inputRef.current?.click()} className="wechat-mini-button">
                <ImagePlus className="h-4 w-4" />
                添加
              </button>
              <input ref={inputRef} type="file" accept="image/*" onChange={uploadPhoto} className="hidden" />
            </div>
            <div className="wechat-photo-grid">
              <button type="button" onClick={() => inputRef.current?.click()} className="wechat-photo-add">
                <Plus className="h-7 w-7" />
              </button>
              {wechatPhotos.map((photo) => (
                <button key={photo} type="button" onClick={() => removeWechatPhoto(photo)} className="wechat-photo-item" title="点击移除照片">
                  <img src={photo} alt="照片墙" />
                </button>
              ))}
            </div>
          </section>
        )}
        {discoverView === 'stickers' && (
          <section className="wechat-photo-wall">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2>表情包</h2>
                <p>先写描述，再上传图片；描述会随表情发给 AI。</p>
              </div>
              <button type="button" onClick={() => stickerLabel.trim() && stickerInputRef.current?.click()} className="wechat-mini-button">
                <ImagePlus className="h-4 w-4" />
                上传
              </button>
            </div>
            <input value={stickerLabel} onChange={(event) => setStickerLabel(event.target.value)} placeholder="先写描述，例如：青绿色角色开心挥手" className="wechat-inline-input mb-3" />
            <input ref={stickerInputRef} type="file" accept="image/*" onChange={uploadSticker} className="hidden" />
            <div className="wechat-sticker-library">
              {stickers.map((sticker) => (
                <div key={sticker.id} className="wechat-sticker-card">
                  <div className="wechat-sticker-card-actions">
                    <button type="button" onClick={() => toggleStickerFavorite(sticker.id)} className={cn(sticker.favorite && 'active')} title={sticker.favorite ? '取消收藏' : '收藏'}>
                      <Star className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => deleteSticker(sticker.id)} title="删除表情">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <img src={sticker.url} alt={sticker.label} />
                  <input value={sticker.label} onChange={(event) => updateStickerLabel(sticker.id, event.target.value)} aria-label="表情描述" />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
