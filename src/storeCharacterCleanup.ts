type ChatSessionLike = {
  characterId: string;
  channel: 'wechat' | 'qq';
  messages: Array<{ speakerId?: string }>;
};

type CleanupState = {
  characters: Array<{ id: string; name?: string }>;
  chatSessions: Record<string, ChatSessionLike>;
  activeChatId: string | null;
  activeScreen: string;
  previousScreen: string;
  groupChats: Array<{ id: string; memberIds: string[] }>;
  contactTags: Record<string, string[]>;
  purchaseRecords: Array<{ characterId?: string }>;
  lifeEvents: Array<{ characterId?: string }>;
  phoneCallRecords: Array<{ characterId?: string }>;
  diaries: Array<{ characterId?: string; review?: { characterId?: string }; reviews?: Array<{ characterId?: string }> }>;
  calendarEvents: Array<{ characterId?: string }>;
  galleryPhotos: Array<{ characterId?: string; reviews?: Array<{ characterId?: string }> }>;
  memos: Array<{ characterId?: string }>;
  memoCharWriter: { characterId?: string; enabled: boolean };
  theaterScenes: Array<{ characterIds: string[] }>;
  xiaohongshuNotes: Array<{ authorId: string; authorType: string }>;
  xiaohongshuFollowingIds: string[];
  musicTracks: Array<{ id: string; characterId?: string; source?: string; artist?: string }>;
  musicPlaylists: Array<{ trackIds: string[] }>;
  musicListenRecords: Array<{ characterId?: string; trackId?: string }>;
  musicPlayer: { trackId?: string; playing: boolean; progress: number; duration: number; repeat: boolean; shuffle: boolean };
};

function removeContactTag(tags: Record<string, string[]>, characterId: string) {
  return Object.fromEntries(Object.entries(tags).filter(([id]) => id !== characterId));
}

function stripCharacterReviews<T extends { review?: { characterId?: string }; reviews?: Array<{ characterId?: string }> }>(item: T, characterId: string): T {
  const next = { ...item };
  if (next.review?.characterId === characterId) delete next.review;
  if (Array.isArray(next.reviews)) next.reviews = next.reviews.filter((review) => review.characterId !== characterId);
  return next;
}

function cleanupChatSessions(sessions: Record<string, ChatSessionLike>, characterId: string) {
  return Object.fromEntries(
    Object.entries(sessions)
      .filter(([, session]) => session.characterId !== characterId)
      .map(([key, session]) => [
        key,
        {
          ...session,
          messages: session.messages.filter((message) => message.speakerId !== characterId),
        },
      ]),
  );
}

function isCharacterMusicTrack(track: { characterId?: string; source?: string; artist?: string }, characterId: string, characterName: string) {
  return track.characterId === characterId || (track.source === 'char' && !!characterName && track.artist?.trim() === characterName.trim());
}

export function cleanupCharacterReferences<T extends CleanupState>({
  characterId,
  characterName,
  state,
}: {
  characterId: string;
  characterName: string;
  state: T;
}): T {
  const groupChats = state.groupChats
    .map((group) => ({ ...group, memberIds: group.memberIds.filter((id) => id !== characterId) }))
    .filter((group) => group.memberIds.length > 0);
  const remainingGroupIds = new Set(groupChats.map((group) => group.id));
  const removedTrackIds = new Set(
    state.musicTracks
      .filter((track) => isCharacterMusicTrack(track, characterId, characterName))
      .map((track) => track.id),
  );
  const musicTracks = state.musicTracks.filter((track) => !removedTrackIds.has(track.id));
  const musicPlayer = state.musicPlayer.trackId && removedTrackIds.has(state.musicPlayer.trackId)
    ? { playing: false, progress: 0, duration: 0, repeat: false, shuffle: false }
    : state.musicPlayer;
  const activeChatRemoved = state.activeChatId === characterId || (state.activeChatId ? !remainingGroupIds.has(state.activeChatId) && state.groupChats.some((group) => group.id === state.activeChatId) : false);

  return {
    ...state,
    characters: state.characters.filter((character) => character.id !== characterId),
    chatSessions: Object.fromEntries(
      Object.entries(cleanupChatSessions(state.chatSessions, characterId))
        .filter(([, session]) => session.channel !== 'wechat' || !state.groupChats.some((group) => group.id === session.characterId) || remainingGroupIds.has(session.characterId)),
    ),
    activeChatId: activeChatRemoved ? null : state.activeChatId,
    activeScreen: activeChatRemoved && state.activeScreen === 'chat' ? state.previousScreen || 'wechat' : state.activeScreen,
    groupChats,
    contactTags: removeContactTag(state.contactTags, characterId),
    purchaseRecords: state.purchaseRecords.filter((record) => record.characterId !== characterId),
    lifeEvents: state.lifeEvents.filter((event) => event.characterId !== characterId),
    phoneCallRecords: state.phoneCallRecords.filter((record) => record.characterId !== characterId),
    diaries: state.diaries
      .filter((entry) => entry.characterId !== characterId)
      .map((entry) => stripCharacterReviews(entry, characterId))
      .filter((entry) => entry.review?.characterId !== characterId),
    calendarEvents: state.calendarEvents.filter((event) => event.characterId !== characterId),
    galleryPhotos: state.galleryPhotos
      .filter((photo) => photo.characterId !== characterId)
      .map((photo) => stripCharacterReviews(photo, characterId)),
    memos: state.memos.filter((memo) => memo.characterId !== characterId),
    memoCharWriter: state.memoCharWriter.characterId === characterId ? { enabled: false } : state.memoCharWriter,
    theaterScenes: state.theaterScenes
      .map((scene) => ({ ...scene, characterIds: scene.characterIds.filter((id) => id !== characterId) }))
      .filter((scene) => scene.characterIds.length > 0),
    xiaohongshuNotes: state.xiaohongshuNotes.filter((note) => !(note.authorType === 'character' && note.authorId === characterId)),
    xiaohongshuFollowingIds: state.xiaohongshuFollowingIds.filter((id) => id !== characterId),
    musicTracks,
    musicPlaylists: state.musicPlaylists.map((playlist) => ({
      ...playlist,
      trackIds: playlist.trackIds.filter((trackId) => !removedTrackIds.has(trackId)),
    })),
    musicListenRecords: state.musicListenRecords.filter((record) => record.characterId !== characterId && (!record.trackId || !removedTrackIds.has(record.trackId))),
    musicPlayer,
  };
}
