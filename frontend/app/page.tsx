'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth, firebaseReady } from '../lib/firebase';
import { AuthGate } from '../components/AuthGate';
import { Onboarding } from '../components/Onboarding';
import { MapView } from '../components/MapView';
import { CinematicModal } from '../components/LandmarkModal';
import { UserProfileModal } from '../components/UserProfileModal';
import {
  fetchAssetStatuses,
  fetchCinematicAsset,
  fetchGallery,
  fetchLandmarks,
  fetchUnlocks,
  fetchUserProfile,
  saveGalleryItem,
  saveUserProfile,
  unlockLandmark,
  resetAssets
} from '../lib/data';
import { getDistanceMeters } from '../lib/geo';
import { prefetchPersonaAssets } from '../lib/assetService';
import { SEED_LANDMARKS } from '../lib/seedLandmarks';
import type { AssetStatus, CinematicAsset, GalleryItem, Landmark, UserProfile } from '../types';

const CHICAGO_CENTER = { lat: 41.882, lng: -87.629 };
const LOCAL_PROFILE_KEY = 'wcw_profile';
const LOCAL_UNLOCKS_KEY = 'wcw_unlocks';
const LOCAL_GALLERY_KEY = 'wcw_gallery';

function readLocal<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export default function Page() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [activeLandmark, setActiveLandmark] = useState<Landmark | null>(null);
  const [asset, setAsset] = useState<CinematicAsset | null>(null);
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetStatuses, setAssetStatuses] = useState<Record<string, AssetStatus>>({});
  const [showProfile, setShowProfile] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [lockedHint, setLockedHint] = useState<string | null>(null);
  const [mapNotice, setMapNotice] = useState<string | null>(null);
  const unlockingRef = useRef<Set<string>>(new Set());
  const testUnlockCount = Number(process.env.NEXT_PUBLIC_TEST_UNLOCK_COUNT || 0);
  const [manualCenter, setManualCenter] = useState<{ lat: number; lng: number } | null>(null);
  const seededUnlocksRef = useRef(false);
  const envUnlocksRef = useRef(false);
  const prefetchTriggeredRef = useRef(false);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    setProfileLoading(true);
    const load = async () => {
      try {
        const [profileData, landmarkData, unlockData, galleryData, statusData] = await Promise.all([
          fetchUserProfile(user.uid),
          fetchLandmarks(),
          fetchUnlocks(user.uid),
          fetchGallery(user.uid),
          fetchAssetStatuses(user.uid)
        ]);
        if (profileData) setProfile(profileData);
        setLandmarks(landmarkData);
        setUnlockedIds(unlockData.map((u) => u.landmarkId));
        setGallery(galleryData);
        setAssetStatuses(statusData);
      } catch (error) {
        console.warn('[load] Firestore unavailable, using local fallback.', error);
        setLandmarks(SEED_LANDMARKS);
        setMapError('Firestore unavailable. Showing cached landmarks only.');
        const localProfile = readLocal<UserProfile>(LOCAL_PROFILE_KEY);
        const localUnlocks = readLocal<string[]>(LOCAL_UNLOCKS_KEY);
        const localGallery = readLocal<GalleryItem[]>(LOCAL_GALLERY_KEY);
        if (localProfile) setProfile(localProfile);
        if (localUnlocks) setUnlockedIds(localUnlocks);
        if (localGallery) setGallery(localGallery);
      } finally {
        setProfileLoading(false);
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      try {
        const statuses = await fetchAssetStatuses(user.uid);
        setAssetStatuses(statuses);
      } catch (error) {
        console.warn('[status] failed to refresh asset statuses', error);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!user || !profile) return;
    if (prefetchTriggeredRef.current) return;
    if (Object.keys(assetStatuses).length > 0) return;
    prefetchTriggeredRef.current = true;
    console.info('[prefetch] triggering asset synthesis', {
      uid: user.uid,
      personaId: profile.personaId
    });
    prefetchPersonaAssets({
      uid: user.uid,
      personaId: profile.personaId,
      personaTitle: profile.personaTitle
    });
  }, [user, profile, assetStatuses]);

  useEffect(() => {
    if (!user || landmarks.length === 0 || testUnlockCount <= 0 || seededUnlocksRef.current) return;
    seededUnlocksRef.current = true;
    const seedUnlocks = landmarks.slice(0, testUnlockCount).map((landmark) => landmark.id);
    setUnlockedIds((prev) => {
      const merged = new Set([...prev, ...seedUnlocks]);
      return merged.size === prev.length ? prev : Array.from(merged);
    });
    seedUnlocks.forEach(async (landmarkId) => {
      try {
        await unlockLandmark(user.uid, landmarkId);
      } catch (error) {
        console.warn('[unlock] Firestore unavailable, stored locally.', error);
      }
    });
  }, [user, landmarks, testUnlockCount]);

  useEffect(() => {
    if (!user || landmarks.length === 0 || envUnlocksRef.current) return;
    envUnlocksRef.current = true;
    const envIds = (process.env.NEXT_PUBLIC_TEST_UNLOCK_IDS || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    const baseIds = ['cloud-gate', 'navy-pier'];
    const effectiveIds = (envIds.length ? envIds : baseIds).filter((id) =>
      landmarks.some((landmark) => landmark.id === id)
    );
    if (effectiveIds.length === 0) return;

    setUnlockedIds((prev) => {
      const merged = new Set([...prev, ...effectiveIds]);
      return merged.size === prev.length ? prev : Array.from(merged);
    });
    effectiveIds.forEach(async (landmarkId) => {
      try {
        await unlockLandmark(user.uid, landmarkId);
      } catch (error) {
        console.warn('[unlock] Firestore unavailable, stored locally.', error);
      }
    });
  }, [user, landmarks]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not available in this browser.');
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationError(null);
      },
      () => setLocationError('Location access is required to unlock landmarks.'),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!userLocation || !profile || landmarks.length === 0 || !user) return;
    const distanceFromChicago = getDistanceMeters(
      userLocation.lat,
      userLocation.lng,
      CHICAGO_CENTER.lat,
      CHICAGO_CENTER.lng
    );
    if (distanceFromChicago > 20000) {
      setMapNotice('You are outside Chicago. Map centered on landmarks for preview.');
    } else {
      setMapNotice(null);
    }
    landmarks.forEach(async (landmark) => {
      if (unlockedIds.includes(landmark.id)) return;
      if (unlockingRef.current.has(landmark.id)) return;
      const distance = getDistanceMeters(userLocation.lat, userLocation.lng, landmark.lat, landmark.lng);
      if (distance <= 50) {
        unlockingRef.current.add(landmark.id);
        try {
          await unlockLandmark(user.uid, landmark.id);
        } catch (error) {
          console.warn('[unlock] Firestore unavailable, stored locally.', error);
        }
        setUnlockedIds((prev) => [...prev, landmark.id]);
        setActiveLandmark(landmark);
      }
    });
  }, [userLocation, landmarks, unlockedIds, profile, user]);

  useEffect(() => {
    if (!activeLandmark || !profile) return;
    let mounted = true;
    setAsset(null);
    setAssetLoading(true);
    console.info('[cinematic] fetch asset', { landmarkId: activeLandmark.id, personaId: profile.personaId });
    fetchCinematicAsset(activeLandmark.id, profile.personaId)
      .then((data) => {
        if (mounted) setAsset(data);
      })
      .finally(() => {
        if (mounted) setAssetLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [activeLandmark, profile]);

  const handleOnboardingComplete = async (newProfile: UserProfile) => {
    if (!user) return;
    try {
      await saveUserProfile(user.uid, newProfile);
      console.info('[onboarding] profile saved', { uid: user.uid, personaId: newProfile.personaId });
    } catch (error) {
      console.warn('[onboarding] Firestore unavailable, using local profile.', error);
      setMapError('Firestore unavailable. Using local profile until connection resumes.');
    }
    writeLocal(LOCAL_PROFILE_KEY, newProfile);
    setProfile(newProfile);
    console.info('[onboarding] profile saved', { uid: user.uid, personaId: newProfile.personaId });
    prefetchPersonaAssets({
      uid: user.uid,
      personaId: newProfile.personaId,
      personaTitle: newProfile.personaTitle
    });
  };

  const handleProfileUpdate = async (updated: UserProfile) => {
    if (!user) return;
    await saveUserProfile(user.uid, updated);
    setProfile(updated);
  };

  const handleSaveToGallery = async () => {
    if (!user || !activeLandmark) return;
    const item: GalleryItem = {
      landmarkId: activeLandmark.id,
      landmarkName: activeLandmark.name,
      savedAt: Date.now(),
      videoUrl: asset?.videoUrl || null,
      audioUrl: asset?.audioUrl || null,
      imageUrl: asset?.imageUrl || null,
      script: asset?.script || null
    };
    try {
      await saveGalleryItem(user.uid, item);
    } catch (error) {
      console.warn('[gallery] Firestore unavailable, stored locally.', error);
    }
    setGallery((prev) => {
      const existing = prev.find((entry) => entry.landmarkId === item.landmarkId);
      if (existing) {
        return prev.map((entry) => (entry.landmarkId === item.landmarkId ? item : entry));
      }
      return [item, ...prev];
    });
  };

  useEffect(() => {
    if (profile) writeLocal(LOCAL_PROFILE_KEY, profile);
  }, [profile]);

  useEffect(() => {
    writeLocal(LOCAL_UNLOCKS_KEY, unlockedIds);
  }, [unlockedIds]);

  useEffect(() => {
    writeLocal(LOCAL_GALLERY_KEY, gallery);
  }, [gallery]);

  const isSaved = useMemo(() => {
    if (!activeLandmark) return false;
    return gallery.some((entry) => entry.landmarkId === activeLandmark.id);
  }, [activeLandmark, gallery]);

  const handleLandmarkClick = (landmark: Landmark, isUnlocked: boolean) => {
    if (!isUnlocked) {
      setLockedHint('Get closer to unlock this landmark.');
      setTimeout(() => setLockedHint(null), 2500);
      return;
    }
    setActiveLandmark(landmark);
  };

  const distanceFromChicago = userLocation
    ? getDistanceMeters(userLocation.lat, userLocation.lng, CHICAGO_CENTER.lat, CHICAGO_CENTER.lng)
    : null;
  const centerOverride =
    manualCenter || (distanceFromChicago && distanceFromChicago > 20000 ? CHICAGO_CENTER : null);

  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    setProfile(null);
    setLandmarks([]);
    setUnlockedIds([]);
    setGallery([]);
  };

  const handleResetAssets = async () => {
    if (!user || !profile) return;
    try {
      await resetAssets();
      setUnlockedIds([]);
      setAssetStatuses({});
      setGallery([]);
      setActiveLandmark(null);
      setAsset(null);
      // Re-trigger prefetch for Cloud Gate
      prefetchTriggeredRef.current = false;
      alert('Assets reset! Fresh generation triggered.');
    } catch (error) {
      console.error('[reset] failed', error);
      alert('Reset failed. Check console.');
    }
  };

  if (!firebaseReady) {
    return (
      <div className="min-h-screen bg-ink text-white flex items-center justify-center p-8">
        <div className="max-w-lg space-y-4 text-center">
          <h1 className="text-2xl font-semibold">Firebase config missing</h1>
          <p className="text-zinc-400">
            Set the NEXT_PUBLIC_FIREBASE_* environment variables to enable auth, data, and storage.
          </p>
        </div>
      </div>
    );
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-ink text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <AuthGate />;
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-ink text-white flex items-center justify-center">
        Loading profile...
      </div>
    );
  }

  if (!profile || !profile.hasOnboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} uid={user.uid} displayName={user.displayName} />;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-ink text-white overflow-hidden">
      <header className="p-4 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 flex justify-between items-center z-20 shadow-lg shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gold">Windy City Whispers</h1>
          <p className="text-xs text-zinc-400">{profile.personaTitle || 'Explorer'}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleResetAssets}
            className="px-3 py-2 rounded-lg bg-red-900/20 border border-red-900/50 text-red-500 text-xs uppercase tracking-wider hover:bg-red-900/30 transition"
          >
            Reset
          </button>
          <button
            onClick={() => setShowProfile(true)}
            className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs uppercase tracking-wider"
          >
            Profile
          </button>
          <button
            onClick={handleSignOut}
            className="px-3 py-2 rounded-lg border border-zinc-800 text-xs text-zinc-400 hover:text-white"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="flex-grow relative z-0 w-full h-full map-shell">
        <MapView
          landmarks={landmarks}
          unlockedIds={unlockedIds}
          userLocation={userLocation}
          centerOverride={centerOverride}
          assetStatuses={assetStatuses}
          onLandmarkClick={handleLandmarkClick}
          showMapError={setMapError}
        />

        {locationError && (
          <div className="absolute left-4 right-4 top-4 bg-red-900/80 border border-red-500/40 text-red-100 text-sm px-4 py-3 rounded-xl">
            {locationError}
          </div>
        )}

        {mapError && (
          <div className="absolute left-4 right-4 top-20 bg-zinc-900/80 border border-zinc-700 text-zinc-200 text-sm px-4 py-3 rounded-xl">
            {mapError}
          </div>
        )}

        {mapNotice && (
          <div className="absolute left-4 right-4 top-32 bg-zinc-900/80 border border-zinc-700 text-zinc-200 text-xs px-4 py-3 rounded-xl">
            {mapNotice}
          </div>
        )}

        <div className="absolute right-4 bottom-20 z-10">
          <button
            onClick={() => setManualCenter(CHICAGO_CENTER)}
            className="px-4 py-2 rounded-full bg-zinc-900/90 border border-zinc-700 text-xs uppercase tracking-wider text-zinc-100 hover:text-white hover:border-gold transition shadow-lg"
          >
            Center on Chicago
          </button>
        </div>

        {lockedHint && (
          <div className="absolute left-4 right-4 top-44 bg-zinc-900/90 border border-zinc-700 text-zinc-100 text-sm px-4 py-3 rounded-xl">
            {lockedHint}
          </div>
        )}
      </div>

      <div className="bg-zinc-900 border-t border-zinc-800 p-4 pb-8 z-20 shrink-0">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{unlockedIds.length}</div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider">Unlocked</div>
          </div>
          <div className="h-8 w-px bg-zinc-800"></div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{landmarks.length}</div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider">Total</div>
          </div>
          <div className="h-8 w-px bg-zinc-800"></div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{gallery.length}</div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider">Gallery</div>
          </div>
        </div>
      </div>

      {activeLandmark && (
        <CinematicModal
          landmark={activeLandmark}
          asset={asset}
          loading={assetLoading}
          onClose={() => {
            setActiveLandmark(null);
            setAsset(null);
            setAssetLoading(false);
          }}
          onSaveToGallery={handleSaveToGallery}
          isSaved={isSaved}
        />
      )}

      {showProfile && (
        <UserProfileModal
          profile={profile}
          gallery={gallery}
          onUpdateProfile={handleProfileUpdate}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}
