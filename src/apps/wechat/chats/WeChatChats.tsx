import { MoreHorizontal, UserPlus } from 'lucide-react';
import { useRef } from 'react';
import { useAppStore } from '../../../store';
import { describeChatMessage, formatMessageTime, WeChatAvatar, WeChatGroupAvatar, WeChatTopBar } from '../shared/WeChatShared';

export function WeChatChats({ onAddFriend }: { onAddFriend: () => void }) {
  const { characters, chatSessions, groupChats, openChat, updateGroupChat } = useAppStore();
  const renameTimer = useRef<number | null>(null);
  const skipOpenAfterRename = useRef(false);
  const sessions = Object.values(chatSessions).filter((session) => session.channel === 'wechat');

  const clearRenameTimer = () => {
    if (renameTimer.current) {
      window.clearTimeout(renameTimer.current);
      renameTimer.current = null;
    }
  };
  const renameGroup = (group: { id: string; name: string }) => {
    skipOpenAfterRename.current = true;
    const nextName = window.prompt('修改群聊名称', group.name)?.trim();
    if (nextName) updateGroupChat(group.id, { name: nextName });
    window.setTimeout(() => {
      skipOpenAfterRename.current = false;
    }, 0);
  };
  const armRename = (group: { id: string; name: string }) => {
    clearRenameTimer();
    renameTimer.current = window.setTimeout(() => renameGroup(group), 520);
  };

  return (
    <div className="wechat-page">
      <WeChatTopBar title="微信" right={<MoreHorizontal className="h-5 w-5" />} />
      <div className="wechat-list">
        {characters.length === 0 && groupChats.length === 0 && (
          <button type="button" onClick={onAddFriend} className="wechat-empty-card">
            <UserPlus className="h-8 w-8" />
            <span>先导入角色卡，微信会自动出现联系人</span>
          </button>
        )}
        {groupChats.map((group) => {
          const session = sessions.find((item) => item.characterId === group.id);
          const lastMessage = session?.messages.at(-1);
          const preview = lastMessage ? describeChatMessage(lastMessage) : `${group.memberIds.length}个成员`;
          const time = formatMessageTime(session?.lastUpdated || group.createdAt);

          return (
            <button
              key={group.id}
              type="button"
              onClick={() => {
                if (skipOpenAfterRename.current) return;
                openChat(group.id, 'wechat');
              }}
              onContextMenu={(event) => { event.preventDefault(); renameGroup(group); }}
              onPointerDown={() => armRename(group)}
              onPointerUp={clearRenameTimer}
              onPointerCancel={clearRenameTimer}
              onPointerLeave={clearRenameTimer}
              className="wechat-chat-row"
              title="长按或右键修改群名"
            >
              <WeChatGroupAvatar group={group} characters={characters} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-[17px] font-semibold text-[#e7e7e7]">{group.name}</p>
                  <span className="shrink-0 text-xs text-[#777]">{time}</span>
                </div>
                <p className="mt-1 truncate text-[13px] text-[#888]">{preview}</p>
              </div>
              {session?.unread ? <span className="wechat-unread-badge">{session.unread}</span> : null}
            </button>
          );
        })}
        {characters.map((character) => {
          const session = sessions.find((item) => item.characterId === character.id);
          const lastMessage = session?.messages.at(-1);
          const preview = lastMessage ? describeChatMessage(lastMessage) : character.firstMessage || '点开开始聊天';
          const time = session?.lastUpdated ? formatMessageTime(session.lastUpdated) : '';

          return (
            <button key={character.id} type="button" onClick={() => openChat(character.id, 'wechat')} className="wechat-chat-row">
              <WeChatAvatar src={character.avatar} name={character.name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-[17px] font-semibold text-[#e7e7e7]">{character.name}</p>
                  <span className="shrink-0 text-xs text-[#777]">{time}</span>
                </div>
                <p className="mt-1 truncate text-[13px] text-[#888]">{preview}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
