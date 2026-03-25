import { supabase } from './supabase';
import { SEED_LANDMARKS } from './seedLandmarks';
import { allowResetAssets } from './env';
import type { AssetStatus, CinematicAsset, GalleryItem, Landmark, Unlock, UserProfile } from '../types';

export async function fetchLandmarks(): Promise<Landmark[]> {
  const { data, error } = await supabase.from('landmarks').select('*');
  if (error || !data || data.length === 0) return SEED_LANDMARKS;
  return data.map((item: any) => ({
    id: item.id,
    name: item.name,
    lat: item.lat,
    lng: item.lng,
    description: item.description || '',
    type: item.type || 'historic'
  }));
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', uid)
    .single();
  
  if (error || !data) return null;
  // Supabase returns the columns as keys. Since we used camelCase in DB, these match UserProfile.
  return data as UserProfile;
}

export async function saveUserProfile(uid: string, profile: UserProfile): Promise<void> {
  const { uid: profileUid, ...rest } = profile;
  void profileUid;
  const { error } = await supabase
    .from('users')
    .upsert({ id: uid, ...rest });
  
  if (error) {
    console.error('Error saving profile to Supabase:', error);
    throw error;
  }
}

export async function fetchUnlocks(uid: string): Promise<Unlock[]> {
  const { data, error } = await supabase
    .from('unlocks')
    .select('*')
    .eq('user_id', uid);
  
  if (error || !data) return [];
  return data.map((item: any) => ({
    landmarkId: item.landmarkId,
    unlockedAt: item.unlockedAt ? new Date(item.unlockedAt).getTime() : Date.now()
  }));
}

export async function unlockLandmark(uid: string, landmarkId: string): Promise<void> {
  const { error } = await supabase
    .from('unlocks')
    .upsert({
      user_id: uid,
      landmarkId: landmarkId,
      unlockedAt: new Date().toISOString()
    }, {
      onConflict: 'user_id,landmarkId',
      ignoreDuplicates: true
    });
  
  if (error) {
    console.warn('Error unlocking landmark in Supabase:', error);
    throw error;
  }
}

export async function fetchGallery(uid: string): Promise<GalleryItem[]> {
  const { data, error } = await supabase
    .from('gallery')
    .select('*')
    .eq('user_id', uid);
  
  if (error || !data) return [];
  return data.map((item: any) => ({
    landmarkId: item.landmarkId,
    landmarkName: item.landmarkName || undefined,
    savedAt: item.savedAt ? new Date(item.savedAt).getTime() : Date.now(),
    videoUrl: item.videoUrl || null,
    audioUrl: item.audioUrl || null,
    imageUrl: item.imageUrl || null,
    script: item.script || null
  }));
}

export async function saveGalleryItem(uid: string, item: GalleryItem): Promise<void> {
  const { error } = await supabase
    .from('gallery')
    .upsert({
      user_id: uid,
      landmarkId: item.landmarkId,
      landmarkName: item.landmarkName || null,
      savedAt: item.savedAt ? new Date(item.savedAt).toISOString() : new Date().toISOString(),
      videoUrl: item.videoUrl || null,
      audioUrl: item.audioUrl || null,
      imageUrl: item.imageUrl || null,
      script: item.script || null
    });
  
  if (error) {
    console.error('Error saving gallery item to Supabase:', error);
    throw error;
  }
}

export async function fetchCinematicAsset(landmarkId: string, personaId: string): Promise<CinematicAsset | null> {
  const { data, error } = await supabase
    .from('landmark_assets')
    .select('*')
    .eq('landmarkId', landmarkId)
    .eq('personaId', personaId)
    .single();
  
  if (error || !data) return null;
  return {
    landmarkId,
    personaId,
    videoUrl: data.videoUrl || null,
    audioUrl: data.audioUrl || null,
    imageUrl: data.imageUrl || null,
    script: data.script || null,
    status: data.status || undefined
  };
}

export async function fetchAssetStatuses(uid: string): Promise<Record<string, AssetStatus>> {
  const { data, error } = await supabase
    .from('asset_status')
    .select('*')
    .eq('user_id', uid);
  
  if (error || !data) return {};
  const statusMap: Record<string, AssetStatus> = {};
  data.forEach((item: any) => {
    statusMap[item.landmarkId] = {
      landmarkId: item.landmarkId,
      personaId: item.personaId || '',
      status: item.status || 'queued',
      updatedAt: item.updatedAt ? Number(item.updatedAt) : undefined
    };
  });
  return statusMap;
}

export async function resetAssets(): Promise<{ success: boolean }> {
  if (!allowResetAssets) {
    throw new Error('Asset reset is disabled in production.');
  }
  const { data, error } = await supabase.functions.invoke('reset-assets');
  if (error) {
    console.error('Error invoking reset-assets:', error);
    throw error;
  }
  const result = data as { success?: boolean } | null;
  if (!result?.success) {
    throw new Error('reset-assets returned an unsuccessful response.');
  }
  return { success: true };
}
