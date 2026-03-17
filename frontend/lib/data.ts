import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { SEED_LANDMARKS } from './seedLandmarks';
import type { AssetStatus, CinematicAsset, GalleryItem, Landmark, Unlock, UserProfile } from '../types';

export async function fetchLandmarks(): Promise<Landmark[]> {
  if (!db) return SEED_LANDMARKS;
  const snapshot = await getDocs(collection(db, 'landmarks'));
  if (snapshot.empty) return SEED_LANDMARKS;
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    name: docSnap.data().name,
    lat: docSnap.data().lat,
    lng: docSnap.data().lng,
    description: docSnap.data().description || '',
    type: docSnap.data().type || 'historic'
  }));
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  if (!db) return null;
  const snapshot = await getDoc(doc(db, 'users', uid));
  if (!snapshot.exists()) return null;
  return snapshot.data() as UserProfile;
}

export async function saveUserProfile(uid: string, profile: UserProfile): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'users', uid), profile, { merge: true });
}

export async function fetchUnlocks(uid: string): Promise<Unlock[]> {
  if (!db) return [];
  const snapshot = await getDocs(collection(db, 'users', uid, 'unlocks'));
  return snapshot.docs.map((docSnap) => ({
    landmarkId: docSnap.id,
    unlockedAt: docSnap.data().unlockedAt || Date.now()
  }));
}

export async function unlockLandmark(uid: string, landmarkId: string): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'users', uid, 'unlocks', landmarkId), {
    unlockedAt: Date.now()
  });
}

export async function fetchGallery(uid: string): Promise<GalleryItem[]> {
  if (!db) return [];
  const snapshot = await getDocs(collection(db, 'users', uid, 'gallery'));
  return snapshot.docs.map((docSnap) => ({
    landmarkId: docSnap.id,
    landmarkName: docSnap.data().landmarkName || undefined,
    savedAt: docSnap.data().savedAt || Date.now(),
    videoUrl: docSnap.data().videoUrl || null,
    audioUrl: docSnap.data().audioUrl || null,
    imageUrl: docSnap.data().imageUrl || null,
    script: docSnap.data().script || null
  }));
}

export async function saveGalleryItem(uid: string, item: GalleryItem): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'users', uid, 'gallery', item.landmarkId), {
    savedAt: item.savedAt || Date.now(),
    landmarkName: item.landmarkName || null,
    videoUrl: item.videoUrl || null,
    audioUrl: item.audioUrl || null,
    imageUrl: item.imageUrl || null,
    script: item.script || null
  });
}

export async function fetchCinematicAsset(landmarkId: string, personaId: string): Promise<CinematicAsset | null> {
  if (!db) return null;
  const snapshot = await getDoc(doc(db, 'landmarks', landmarkId, 'assets', personaId));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
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
  if (!db) return {};
  const snapshot = await getDocs(collection(db, 'users', uid, 'assetStatus'));
  const statusMap: Record<string, AssetStatus> = {};
  snapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    statusMap[docSnap.id] = {
      landmarkId: docSnap.id,
      personaId: data.personaId || '',
      status: data.status || 'queued',
      updatedAt: data.updatedAt || undefined
    };
  });
  return statusMap;
}
export async function resetAssets(): Promise<{ success: boolean }> {
  const { getFunctions, httpsCallable } = await import('firebase/functions');
  const functions = getFunctions();
  const resetAssetsFn = httpsCallable<{ success: boolean }>(functions, 'resetAssets');
  const result = await resetAssetsFn();
  return result.data as { success: boolean };
}
