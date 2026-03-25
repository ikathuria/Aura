import type { InterestId } from './lib/interests';

export type LandmarkType =
  | 'museum'
  | 'park'
  | 'architecture'
  | 'entertainment'
  | 'historic'
  | 'food'
  | 'sports';

export type AppMode = 'tourist' | 'local';

export interface LocalEvent {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description: string;
  type: 'festival' | 'market' | 'concert' | 'sports' | 'other';
  startTime: string;
  isPublished?: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Itinerary {
  id: string;
  landmarkIds: string[];
  optimizedOrder: string[];
  createdAt: number;
}

export interface Landmark {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description: string;
  type: LandmarkType;
  isPublished?: boolean;
  isDeleted?: boolean;
  updatedAt?: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  interests: InterestId[];
  personaId: string;
  personaTitle: string;
  hasOnboarded: boolean;
  createdAt: number;
  isAdmin?: boolean;
}

export interface Unlock {
  landmarkId: string;
  unlockedAt: number;
}

export interface CinematicAsset {
  landmarkId: string;
  personaId: string;
  videoUrl: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  script: string | null;
  status?: 'queued' | 'generating' | 'ready' | 'failed';
}

export interface GalleryItem {
  landmarkId: string;
  landmarkName?: string;
  savedAt: number;
  videoUrl: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  script: string | null;
}

export interface AssetStatus {
  landmarkId: string;
  personaId: string;
  status: 'queued' | 'generating' | 'ready' | 'failed';
  updatedAt?: number;
}

export interface AdminActionLog {
  id: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}
