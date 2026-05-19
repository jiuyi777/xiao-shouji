import type { ChatMessage } from '../../../store';

export type PendingChatDraftKind =
  | 'text'
  | 'voice'
  | 'image'
  | 'sticker'
  | 'call-note'
  | 'transfer'
  | 'red-packet'
  | 'shopping';

export type PendingChatDraftLike = {
  kind: PendingChatDraftKind;
};

export function shouldAutoReplyAfterUserAction(kind: PendingChatDraftKind) {
  return kind === 'image'
    || kind === 'sticker'
    || kind === 'transfer'
    || kind === 'red-packet'
    || kind === 'shopping';
}

export function getPendingResponseMode(drafts: PendingChatDraftLike[]): 'text' | 'voice' {
  return drafts.some((draft) => draft.kind === 'voice') ? 'voice' : 'text';
}

export function canAcceptLifeCard(message: Pick<ChatMessage, 'role' | 'kind' | 'status'>) {
  return message.role === 'model'
    && (message.kind === 'transfer' || message.kind === 'red-packet')
    && message.status !== 'accepted';
}
