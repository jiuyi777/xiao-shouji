import { Camera, MessageCircle, MoreHorizontal, Plus, Phone, Search, Tag, UserPlus, Users } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { parseCharacterCard } from '../../../lib/charaParser';
import { cn } from '../../../lib/utils';
import type { Character } from '../../../store';
import { useAppStore } from '../../../store';
import { WeChatAvatar, WeChatGroupAvatar, WeChatTopBar } from '../shared/WeChatShared';

export function WeChatContacts() {
  const { characters, openChat, addCharacter, groupChats, addGroupChat, updateGroupChat, deleteGroupChat, contactTags, setContactTag } = useAppStore();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [status, setStatus] = useState('');
  const [showGroupComposer, setShowGroupComposer] = useState(false);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Record<string, boolean>>({});
  const [profileId, setProfileId] = useState<string | null>(null);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const renameTimer = useRef<number | null>(null);
  const skipOpenAfterRename = useRef(false);
  const profileCharacter = characters.find((character) => character.id === profileId) || null;
  const allTags = Array.from(new Set(Object.values(contactTags).flat())).filter(Boolean);
  const displayedCharacters = activeTagFilter
    ? characters.filter((character) => contactTags[character.id]?.includes(activeTagFilter))
    : characters;

  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = (await parseCharacterCard(file)) as Character;
      addCharacter(imported);
      setStatus(`已导入：${imported.name || '未命名角色'}，已同步到微信`);
      setShowAddMenu(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '导入失败');
    } finally {
      event.target.value = '';
    }
  };

  const createGroup = () => {
    const memberIds = Object.entries(selectedMembers)
      .filter(([, selected]) => selected)
      .map(([id]) => id);
    if (memberIds.length === 0) {
      setStatus('至少选择一个联系人再拉群聊');
      return;
    }
    addGroupChat(groupName, memberIds);
    setGroupName('');
    setSelectedMembers({});
    setShowGroupComposer(false);
    setStatus('群聊已创建');
  };

  const clearRenameTimer = () => {
    if (renameTimer.current) {
      window.clearTimeout(renameTimer.current);
      renameTimer.current = null;
    }
  };
  const renameGroup = (group: { id: string; name: string }) => {
    skipOpenAfterRename.current = true;
    const nextName = window.prompt('修改群聊名称', group.name)?.trim();
    if (nextName) {
      updateGroupChat(group.id, { name: nextName });
      setStatus('群聊名称已更新');
    }
    window.setTimeout(() => {
      skipOpenAfterRename.current = false;
    }, 0);
  };
  const armRename = (group: { id: string; name: string }) => {
    clearRenameTimer();
    renameTimer.current = window.setTimeout(() => renameGroup(group), 520);
  };

  if (profileCharacter) {
    const tag = contactTags[profileCharacter.id]?.[0] || '';
    return (
      <div className="wechat-page">
        <WeChatTopBar title="朋友资料" onBack={() => setProfileId(null)} right={<MoreHorizontal className="h-5 w-5" />} />
        <div className="wechat-profile-page">
          <div className="wechat-profile-card">
            <WeChatAvatar src={profileCharacter.avatar} name={profileCharacter.name} large />
            <div className="min-w-0 flex-1">
              <h2>{profileCharacter.name}</h2>
              {tag && <p>标签：{tag}</p>}
              <p>{profileCharacter.description || profileCharacter.personality || '角色卡联系人'}</p>
            </div>
          </div>
          <button type="button" onClick={() => openChat(profileCharacter.id, 'wechat')} className="wechat-profile-action primary">
            <MessageCircle className="h-5 w-5" />
            发消息
          </button>
          <button type="button" className="wechat-profile-action">
            <Camera className="h-5 w-5" />
            朋友圈
          </button>
          <button type="button" className="wechat-profile-action">
            <Phone className="h-5 w-5" />
            音视频通话
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wechat-page">
      <WeChatTopBar
        title="通讯录"
        right={
          <div className="relative">
            <button type="button" onClick={() => setShowAddMenu((visible) => !visible)} className="wechat-icon-button">
              <Plus className="h-6 w-6" />
            </button>
            {showAddMenu && (
              <div className="wechat-add-menu">
                <button type="button" onClick={() => { setShowGroupComposer(true); setShowAddMenu(false); }}><MessageCircle className="h-5 w-5" />发起群聊</button>
                <button type="button" onClick={() => inputRef.current?.click()}><UserPlus className="h-5 w-5" />添加朋友</button>
              </div>
            )}
          </div>
        }
      />
      <input ref={inputRef} type="file" accept=".png,.json" onChange={importFile} className="hidden" />
      <div className="wechat-list">
        <div className="wechat-search-row">
          <Search className="h-4 w-4" />
          <span>搜索</span>
        </div>
        <button type="button" onClick={() => inputRef.current?.click()} className="wechat-menu-row">
          <span className="wechat-square-icon orange"><UserPlus className="h-5 w-5" /></span>
          <span>新的朋友</span>
        </button>
        <button type="button" onClick={() => setShowGroupComposer((visible) => !visible)} className="wechat-menu-row">
          <span className="wechat-square-icon green"><Users className="h-5 w-5" /></span>
          <span>群聊</span>
          <span className="wechat-row-meta">{groupChats.length}个</span>
        </button>
        {showGroupComposer && (
          <div className="wechat-inline-panel">
            <input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="群聊名称" className="wechat-inline-input" />
            <div className="wechat-check-list">
              {characters.map((character) => (
                <label key={character.id}>
                  <input
                    type="checkbox"
                    checked={Boolean(selectedMembers[character.id])}
                    onChange={(event) => setSelectedMembers((state) => ({ ...state, [character.id]: event.target.checked }))}
                  />
                  <span>{character.name}</span>
                </label>
              ))}
            </div>
            <button type="button" onClick={createGroup} className="wechat-mini-button">创建群聊</button>
          </div>
        )}
        {groupChats.map((group) => (
          <div
            key={group.id}
            className="wechat-contact-row"
            onContextMenu={(event) => { event.preventDefault(); renameGroup(group); }}
            onPointerDown={() => armRename(group)}
            onPointerUp={clearRenameTimer}
            onPointerCancel={clearRenameTimer}
            onPointerLeave={clearRenameTimer}
            title="长按或右键修改群名"
          >
            <WeChatGroupAvatar group={group} characters={characters} />
            <button
              type="button"
              onClick={() => {
                if (skipOpenAfterRename.current) return;
                openChat(group.id, 'wechat');
              }}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate text-[16px] font-semibold text-[#e7e7e7]">{group.name}</p>
              <p className="truncate text-xs text-[#777]">{group.memberIds.length}个成员 · 点开聊天</p>
            </button>
            <button
              type="button"
              onClick={() => window.confirm(`确定解散「${group.name}」吗？`) && deleteGroupChat(group.id)}
              onPointerDown={(event) => event.stopPropagation()}
              className="wechat-mini-button danger"
            >
              解散
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setShowTagEditor((visible) => !visible)} className="wechat-menu-row">
          <span className="wechat-square-icon blue"><Tag className="h-5 w-5" /></span>
          <span>标签</span>
          <span className="wechat-row-meta">给联系人设置</span>
        </button>
        {allTags.length > 0 && (
          <div className="wechat-tag-filter">
            <button type="button" onClick={() => setActiveTagFilter(null)} className={cn(!activeTagFilter && 'active')}>全部</button>
            {allTags.map((tag) => (
              <button key={tag} type="button" onClick={() => setActiveTagFilter(tag)} className={cn(activeTagFilter === tag && 'active')}>{tag}</button>
            ))}
          </div>
        )}
        {status && <div className="wechat-status-line">{status}</div>}
        <div className="wechat-section-title">{activeTagFilter ? `标签：${activeTagFilter}` : '已导入联系人'}</div>
        {characters.length === 0 && <div className="wechat-empty-card">外面通讯录导入后，这里会默认同步显示。</div>}
        {displayedCharacters.map((character) => (
          <div key={character.id} className="wechat-contact-row">
            <WeChatAvatar src={character.avatar} name={character.name} />
            <button type="button" onClick={() => !showTagEditor && setProfileId(character.id)} className="min-w-0 flex-1 text-left">
              <p className="truncate text-[16px] font-semibold text-[#e7e7e7]">{character.name}</p>
              {contactTags[character.id]?.length > 0 && <p className="line-clamp-1 text-xs text-[#777]">标签：{contactTags[character.id].join('、')}</p>}
              {showTagEditor && (
                <input
                  value={contactTags[character.id]?.join('、') || ''}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => setContactTag(character.id, event.target.value)}
                  placeholder="输入标签，可用逗号分隔"
                  className="wechat-tag-input"
                />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
