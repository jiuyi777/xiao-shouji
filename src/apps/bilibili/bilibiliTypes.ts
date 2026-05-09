/**
 * Types for the standalone Bilibili module.
 * Exports: BilibiliVideoEntry, BilibiliComment, BilibiliSearchRecord.
 * Maintenance note: keep these platform-specific; do not reuse generic browser result types.
 */
export interface BilibiliComment {
  id: string;
  userName: string;
  content: string;
  likedCount: string;
  createdAt: number;
}

export interface BilibiliVideoEntry {
  id: string;
  title: string;
  upName: string;
  cover: string;
  url: string;
  description: string;
  tags: string[];
  playCount: string;
  danmakuCount: string;
  comments: BilibiliComment[];
  danmaku: string[];
  createdAt: number;
  watchedAt?: number;
  favorite?: boolean;
  source?: 'sample' | 'generated' | 'manual' | 'model';
}

export interface BilibiliSearchRecord {
  id: string;
  query: string;
  summary: string;
  entryIds: string[];
  source?: 'generated' | 'model';
  createdAt: number;
}
