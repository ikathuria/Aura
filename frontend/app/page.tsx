'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { AuthGate } from '../components/AuthGate';
import { Onboarding } from '../components/Onboarding';
import { CinematicModal } from '../components/LandmarkModal';
import { UserProfileModal } from '../components/UserProfileModal';
import { ItineraryPanel } from '../components/ItineraryPanel';

const MapView = dynamic(
  () => import('../components/MapView').then((mod) => mod.MapView),
  { ssr: false }
);
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
import { prefetchPersonaAssets, generateStoryScript } from '../lib/assetService';
import { SEED_LANDMARKS } from '../lib/seedLandmarks';
import { SEED_EVENTS } from '../lib/seedEvents';
import { allowDemoUnlocks, allowResetAssets } from '../lib/env';
import type { AssetStatus, CinematicAsset, GalleryItem, Landmark, UserProfile, AppMode, LocalEvent } from '../types';

const DEFAULT_CENTER = { lat: 41.882, lng: -87.629 };
const LOCAL_PROFILE_KEY = 'aura_profile';
const LOCAL_UNLOCKS_KEY = 'aura_unlocks';
const LOCAL_GALLERY_KEY = 'aura_gallery';

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
  const [mode, setMode] = useState<AppMode>('tourist');
  const [events] = useState<LocalEvent[]>(SEED_EVENTS);
  const [activeEvent, setActiveEvent] = useState<LocalEvent | null>(null);
  const [itineraryIds, setItineraryIds] = useState<string[]>([]);
  const [itineraryRoute, setItineraryRoute] = useState<[number, number][] | null>(null);
  const [showItinerary, setShowItinerary] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [lockedHint, setLockedHint] = useState<string | null>(null);
  const [mapNotice, setMapNotice] = useState<string | null>(null);
  const unlockingRef = useRef<Set<string>>(new Set());
  const testUnlockCount = allowDemoUnlocks
    ? Number(process.env.NEXT_PUBLIC_TEST_UNLOCK_COUNT || 0)
    : 0;
  const [manualCenter, setManualCenter] = useState<{ lat: number; lng: number } | null>(null);
  const seededUnlocksRef = useRef(false);
  const envUnlocksRef = useRef(false);
  const prefetchTriggeredRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    setProfileLoading(true);
    const load = async () => {
      try {
        const [profileData, landmarkData, unlockData, galleryData, statusData] = await Promise.all([
          fetchUserProfile(user.id),
          fetchLandmarks(),
          fetchUnlocks(user.id),
          fetchGallery(user.id),
          fetchAssetStatuses(user.id)
        ]);
        if (profileData) setProfile(profileData);
        setLandmarks(landmarkData);
        setUnlockedIds(unlockData.map((u) => u.landmarkId));
        setGallery(galleryData);
        setAssetStatuses(statusData);
      } catch (error) {
        console.warn('[load] Supabase unavailable, using local fallback.', error);
        setLandmarks(SEED_LANDMARKS);
        setMapError('Supabase unavailable. Showing cached landmarks only.');
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
        const statuses = await fetchAssetStatuses(user.id);
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
      uid: user.id,
      personaId: profile.personaId
    });
    prefetchPersonaAssets({
      uid: user.id,
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
        await unlockLandmark(user.id, landmarkId);
      } catch (error) {
        console.warn('[unlock] Supabase unavailable, stored locally.', error);
      }
    });
  }, [user, landmarks, testUnlockCount]);

  useEffect(() => {
    if (!allowDemoUnlocks || !user || landmarks.length === 0 || envUnlocksRef.current) return;
    envUnlocksRef.current = true;
    const envIds = (process.env.NEXT_PUBLIC_TEST_UNLOCK_IDS || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    if (envIds.length === 0) return;
    const effectiveIds = envIds.filter((id) =>
      landmarks.some((landmark) => landmark.id === id)
    );
    if (effectiveIds.length === 0) return;

    setUnlockedIds((prev) => {
      const merged = new Set([...prev, ...effectiveIds]);
      return merged.size === prev.length ? prev : Array.from(merged);
    });
    effectiveIds.forEach(async (landmarkId) => {
      try {
        await unlockLandmark(user.id, landmarkId);
      } catch (error) {
        console.warn('[unlock] Supabase unavailable, stored locally.', error);
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
      DEFAULT_CENTER.lat,
      DEFAULT_CENTER.lng
    );
    if (distanceFromChicago > 50000) {
      setMapNotice('You are far from Chicago. Map centered on landmarks for preview.');
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
          await unlockLandmark(user.id, landmark.id);
        } catch (error) {
          console.warn('[unlock] Supabase unavailable, stored locally.', error);
        } finally {
          unlockingRef.current.delete(landmark.id);
        }
        setUnlockedIds((prev) => (prev.includes(landmark.id) ? prev : [...prev, landmark.id]));
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
    const fallbackScript = `You reached ${activeLandmark.name}. ${activeLandmark.description || 'A new city memory is still forming.'}`;

    fetchCinematicAsset(activeLandmark.id, profile.personaId)
      .then(async (data) => {
        if (!mounted) return;
        if (data) {
          setAsset(data);
        } else {
          console.info('[cinematic] asset missing, generating story...', activeLandmark.id);
          const script = await generateStoryScript(activeLandmark.id, profile.personaId);
          if (!mounted) return;
          if (script) {
            const newData = await fetchCinematicAsset(activeLandmark.id, profile.personaId);
            if (!mounted) return;
            if (newData) {
              setAsset(newData);
            } else {
              setAsset({
                landmarkId: activeLandmark.id,
                personaId: profile.personaId,
                videoUrl: null,
                audioUrl: null,
                imageUrl: null,
                script
              });
            }
          } else {
            setAsset({
              landmarkId: activeLandmark.id,
              personaId: profile.personaId,
              videoUrl: null,
              audioUrl: null,
              imageUrl: null,
              script: fallbackScript
            });
          }
        }
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
      await saveUserProfile(user.id, newProfile);
      console.info('[onboarding] profile saved', { uid: user.id, personaId: newProfile.personaId });
    } catch (error) {
      console.warn('[onboarding] Supabase unavailable, using local profile.', error);
      setMapError('Supabase unavailable. Using local profile until connection resumes.');
    }
    writeLocal(LOCAL_PROFILE_KEY, newProfile);
    setProfile(newProfile);
    prefetchPersonaAssets({
      uid: user.id,
      personaId: newProfile.personaId,
      personaTitle: newProfile.personaTitle
    });
  };

  const handleProfileUpdate = async (updated: UserProfile) => {
    if (!user) return;
    try {
      await saveUserProfile(user.id, updated);
    } catch (error) {
      console.warn('[profile] failed to persist profile update', error);
      setMapError('Profile update could not be saved to Supabase right now.');
    }
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
      await saveGalleryItem(user.id, item);
    } catch (error) {
      console.warn('[gallery] Supabase unavailable, stored locally.', error);
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

  const handleEventClick = (event: LocalEvent) => {
    setActiveEvent(event);
  };

  const addToItinerary = (id: string) => {
    setItineraryIds(prev => prev.includes(id) ? prev : [...prev, id]);
  };

  const removeFromItinerary = (id: string) => {
    setItineraryIds(prev => prev.filter(item => item !== id));
  };

  const calculateBestRoute = useCallback(() => {
    if (itineraryIds.length === 0 || !userLocation) {
      setItineraryRoute(null);
      return;
    }

    const start = { lat: userLocation.lat, lng: userLocation.lng };
    const selectedLandmarks = landmarks.filter(l => itineraryIds.includes(l.id));
    
    // Simple Nearest Neighbor TSP heuristic
    let current = start;
    let remaining = [...selectedLandmarks];
    const route: [number, number][] = [[start.lat, start.lng]];

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let minDist = Infinity;
      
      for (let i = 0; i < remaining.length; i++) {
        const d = getDistanceMeters(current.lat, current.lng, remaining[i].lat, remaining[i].lng);
        if (d < minDist) {
          minDist = d;
          nearestIdx = i;
        }
      }
      
      const next = remaining.splice(nearestIdx, 1)[0];
      route.push([next.lat, next.lng]);
      current = { lat: next.lat, lng: next.lng };
    }
    
    setItineraryRoute(route);
  }, [itineraryIds, userLocation, landmarks]);

  useEffect(() => {
    calculateBestRoute();
  }, [calculateBestRoute]);

  const distanceFromChicago = userLocation
    ? getDistanceMeters(userLocation.lat, userLocation.lng, DEFAULT_CENTER.lat, DEFAULT_CENTER.lng)
    : null;
  const centerOverride =
    manualCenter || (distanceFromChicago && distanceFromChicago > 20000 ? DEFAULT_CENTER : null);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn('[auth] sign out failed', error);
      return;
    }
    setProfile(null);
    setLandmarks([]);
    setUnlockedIds([]);
    setGallery([]);
  };

  const handleResetAssets = async () => {
    if (!allowResetAssets) return;
    if (!user || !profile) return;
    if (!window.confirm('Reset unlocked stories and cached assets for your account?')) return;
    try {
      await resetAssets();
      setUnlockedIds([]);
      setAssetStatuses({});
      setGallery([]);
      setActiveLandmark(null);
      setAsset(null);
      prefetchTriggeredRef.current = false;
      setMapNotice('Assets reset complete. Fresh generation will run as you explore.');
    } catch (error) {
      console.error('[reset] failed', error);
      setMapError('Reset failed. Please try again in a moment.');
    }
  };

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
    return <Onboarding onComplete={handleOnboardingComplete} uid={user.id} displayName={user.email} />;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-ink text-white overflow-hidden">
      <header className="p-4 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 flex justify-between items-center z-20 shadow-lg shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gold">Aura</h1>
          <p className="text-xs text-zinc-400">{profile.personaTitle || 'Explorer'}</p>
        </div>
        <div className="flex items-center gap-3">
          {allowResetAssets && (
            <button
              onClick={handleResetAssets}
              className="px-3 py-2 rounded-lg bg-red-900/20 border border-red-900/50 text-red-500 text-xs uppercase tracking-wider hover:bg-red-900/30 transition"
            >
              Reset
            </button>
          )}
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

      {/* Mode & Itinerary Controls */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
        <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-full p-1 flex gap-1 shadow-xl">
          <button
            onClick={() => setMode('tourist')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition ${
              mode === 'tourist' ? 'bg-gold text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Tourist
          </button>
          <button
            onClick={() => setMode('local')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition ${
              mode === 'local' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Local
          </button>
        </div>
        
        <button
          onClick={() => setShowItinerary(true)}
          className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-full p-2.5 text-gold hover:text-white transition shadow-xl relative"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
          </svg>
          {itineraryIds.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-zinc-900">
              {itineraryIds.length}
            </span>
          )}
        </button>
      </div>

      <div className="flex-grow relative z-0 w-full h-full map-shell">
        <MapView
          mode={mode}
          landmarks={landmarks}
          events={events}
          unlockedIds={unlockedIds}
          userLocation={userLocation}
          centerOverride={centerOverride}
          assetStatuses={assetStatuses}
          itineraryRoute={itineraryRoute}
          onLandmarkClick={handleLandmarkClick}
          onEventClick={handleEventClick}
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
            onClick={() => setManualCenter(DEFAULT_CENTER)}
            className="px-4 py-2 rounded-full bg-zinc-900/90 border border-zinc-700 text-xs uppercase tracking-wider text-zinc-100 hover:text-white hover:border-gold transition shadow-lg"
          >
            Center on Map
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
          onAddToItinerary={addToItinerary}
          onRemoveFromItinerary={removeFromItinerary}
          isInItinerary={itineraryIds.includes(activeLandmark.id)}
        />
      )}

      {activeEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative">
            <button 
              onClick={() => setActiveEvent(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-purple-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">{activeEvent.type}</div>
            <h2 className="text-2xl font-bold text-white mb-2">{activeEvent.name}</h2>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              {activeEvent.description}
            </p>
            <div className="flex items-center gap-2 mb-6 text-zinc-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs">{new Date(activeEvent.startTime).toLocaleString()}</span>
            </div>
            <button
               onClick={() => {
                 window.open(`https://www.google.com/maps/dir/?api=1&destination=${activeEvent.lat},${activeEvent.lng}`, '_blank');
               }}
               className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition"
            >
              Get Directions
            </button>
          </div>
        </div>
      )}

      {showItinerary && (
        <ItineraryPanel
          isOpen={showItinerary}
          onClose={() => setShowItinerary(false)}
          landmarks={landmarks}
          itineraryIds={itineraryIds}
          onRemove={removeFromItinerary}
          onClear={() => setItineraryIds([])}
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
