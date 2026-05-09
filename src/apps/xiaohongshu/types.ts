/**
 * Xiaohongshu app data types.
 * Exports/types: XiaohongshuAuthorType, XiaohongshuProfile, XiaohongshuNote.
 * Dependencies: none.
 * Maintenance note: keep this file store-safe; do not import React or app state here.
 */

export type XiaohongshuAuthorType = 'user' | 'character' | 'world';

export interface XiaohongshuProfile {
  displayName: string;
  avatar?: string;
  bio: string;
  styleTags: string[];
}

export interface XiaohongshuNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  imageUrl?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorType: XiaohongshuAuthorType;
  source: 'manual' | 'generated';
  mood?: string;
  location?: string;
  likes?: number;
  comments?: number;
  favorite?: boolean;
  createdAt: number;
  updatedAt: number;
}
