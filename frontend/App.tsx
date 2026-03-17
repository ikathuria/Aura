import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { LANDMARKS, BADGES } from './constants';
import { Landmark, UserProfile, JournalEntry } from './types';
import { LandmarkModal } from './components/LandmarkModal';
import { UserProfileModal } from './components/UserProfileModal';
import { Onboarding } from './components/Onboarding';

// Fix for default Leaflet markers
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const GoldIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const GreyIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const UserIcon = L.divIcon({
  className: 'custom-user-icon',
  html: '<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-[0_0_15px_rgba(59,130,246,0.8)] pulse-ring"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

// Helper: Haversine distance
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // meters
  const φ1 = lat1 * Math.PI/180; const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180; const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

export default function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const userMarker = useRef<L.Marker | null>(null);
  const fogCircle = useRef<L.Circle | null>(null);
  const markersRef = useRef<{ [key: number]: L.Marker }>({});
  
  // State
  const [simulatedPos, setSimulatedPos] = useState({ lat: 41.882, lng: -87.629 }); // Start near Bean
  // Unlock all landmarks by default for testing
  const [unlocked, setUnlocked] = useState<number[]>(LANDMARKS.map(l => l.id));
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);
  const [badges, setBadges] = useState<string[]>([]);
  
  // Profile & Journal State
  const [showProfile, setShowProfile] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('userProfile');
    return saved ? JSON.parse(saved) : { name: '', interests: [], persona: '', hasOnboarded: false };
  });
  const [journal, setJournal] = useState<JournalEntry[]>(() => {
    const saved = localStorage.getItem('journal');
    return saved ? JSON.parse(saved) : [];
  });

  // Ref to hold the latest unlocked state for event handlers to avoid stale closures
  const unlockedRef = useRef(unlocked);

  // Update ref whenever state changes
  useEffect(() => {
    unlockedRef.current = unlocked;
  }, [unlocked]);

  // Save Profile
  const handleUpdateProfile = (newProfile: UserProfile) => {
    setUserProfile(newProfile);
    localStorage.setItem('userProfile', JSON.stringify(newProfile));
    setShowProfile(false);
  };

  // Save Journal
  const handleSaveToJournal = (entryData: Omit<JournalEntry, 'id' | 'date'>) => {
    const newEntry: JournalEntry = {
      ...entryData,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      date: new Date().toISOString()
    };
    const updatedJournal = [newEntry, ...journal];
    setJournal(updatedJournal);
    localStorage.setItem('journal', JSON.stringify(updatedJournal));
  };

  // Initialize Map
  useEffect(() => {
    // Only initialize if onboarded and container exists
    if (!userProfile.hasOnboarded || map.current || !mapContainer.current) return;

    map.current = L.map(mapContainer.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([41.882, -87.629], 14);

    // Use CartoDB Dark Matter for a premium, cinematic look
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      subdomains: 'abcd',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map.current);

    // Add User Marker
    userMarker.current = L.marker([simulatedPos.lat, simulatedPos.lng], { icon: UserIcon, zIndexOffset: 2000 }).addTo(map.current);

    // Add Fog of War Circle
    fogCircle.current = L.circle([simulatedPos.lat, simulatedPos.lng], {
      radius: 150, // Visual radius
      color: '#3b82f6',
      weight: 1,
      fillColor: '#3b82f6',
      fillOpacity: 0.15
    }).addTo(map.current);

    // Force resize
    setTimeout(() => {
      map.current?.invalidateSize();
    }, 250);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [userProfile.hasOnboarded]); // Add dependency to re-run when onboarding completes

  // Update User Position on Map
  useEffect(() => {
    if (!map.current || !userMarker.current || !fogCircle.current) return;
    
    const newLatLng = new L.LatLng(simulatedPos.lat, simulatedPos.lng);
    userMarker.current.setLatLng(newLatLng);
    fogCircle.current.setLatLng(newLatLng);
  }, [simulatedPos]);

  // Check Distance & Unlock Logic
  useEffect(() => {
    let newUnlock = false;
    const currentUnlocked = [...unlocked];

    LANDMARKS.forEach(lm => {
      const dist = getDistance(simulatedPos.lat, simulatedPos.lng, lm.lat, lm.lng);
      
      // Unlock if within 150m (relaxed for demo)
      if (dist < 150 && !currentUnlocked.includes(lm.id)) {
        currentUnlocked.push(lm.id);
        newUnlock = true;
      }
    });

    if (newUnlock) {
      setUnlocked(currentUnlocked);
      localStorage.setItem('unlocked', JSON.stringify(currentUnlocked));
    }
  }, [simulatedPos, unlocked]);

  // Update Markers
  useEffect(() => {
    if (!map.current) return;

    LANDMARKS.forEach(lm => {
      const isUnlocked = unlocked.includes(lm.id);
      
      // Hidden Gem Logic: Only show if unlocked OR if user has unlocked at least 5 other landmarks
      const isHiddenGem = lm.isHiddenGem;
      const shouldShow = !isHiddenGem || isUnlocked || unlocked.length >= 5;

      if (!shouldShow) {
        if (markersRef.current[lm.id]) {
          markersRef.current[lm.id].remove();
          delete markersRef.current[lm.id];
        }
        return;
      }

      if (!markersRef.current[lm.id]) {
        // Create Marker
        const marker = L.marker([lm.lat, lm.lng], {
          icon: isUnlocked ? GoldIcon : GreyIcon,
          title: lm.name,
          zIndexOffset: isUnlocked ? 1000 : 0
        }).addTo(map.current!);

        // IMPORTANT: Use unlockedRef.current inside the callback to get the FRESH state
        marker.on('click', () => {
          if (unlockedRef.current.includes(lm.id)) {
            setSelectedLandmark(lm);
          } else {
            marker.bindPopup(`
              <div class="text-center">
                <strong class="block text-sm mb-1">Locked Memory</strong>
                <span class="text-xs text-gray-600">Get closer to unlock.</span>
              </div>
            `).openPopup();
          }
        });

        markersRef.current[lm.id] = marker;
      } else {
        // Update Icon
        markersRef.current[lm.id].setIcon(isUnlocked ? GoldIcon : GreyIcon);
        markersRef.current[lm.id].setZIndexOffset(isUnlocked ? 1000 : 0);
      }
    });
  }, [unlocked, userProfile.hasOnboarded]); // Re-run when onboarding finishes to ensure markers appear

  // Badge Logic
  useEffect(() => {
    const newBadges = [...badges];
    const unlockedLandmarks = LANDMARKS.filter(lm => unlocked.includes(lm.id));
    
    const museumCount = unlockedLandmarks.filter(lm => lm.type === 'museum').length;
    if (museumCount >= 3 && !newBadges.includes('cultural_explorer')) {
      newBadges.push('cultural_explorer');
    }
    
    const hasHiddenGem = unlockedLandmarks.some(lm => lm.isHiddenGem);
    if (hasHiddenGem && !newBadges.includes('hidden_seeker')) {
      newBadges.push('hidden_seeker');
    }

    if (newBadges.length !== badges.length) {
      setBadges(newBadges);
    }
  }, [unlocked, badges]);

  if (!userProfile.hasOnboarded) {
    return <Onboarding onComplete={handleUpdateProfile} />;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-950 text-white overflow-hidden font-sans">
      {/* Header */}
      <header className="p-4 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 flex justify-between items-center z-20 shadow-lg shrink-0">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-500 to-amber-600 bg-clip-text text-transparent">
            Windy City Whispers
          </h1>
          <p className="text-xs text-zinc-400">AI-Powered Urban Discovery</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <label className="text-[10px] uppercase tracking-wider text-zinc-500">Simulate GPS</label>
            <div className="flex gap-2">
              <input 
                type="range" 
                min="0" max="100"
                defaultValue="50"
                className="w-32 accent-yellow-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSimulatedPos({ 
                    lat: 41.86 + (val/100) * 0.06, 
                    lng: -87.64 + (val/100) * 0.06 
                  });
                }}
              />
            </div>
          </div>
          <button 
            onClick={() => setShowProfile(true)}
            className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shadow-inner hover:bg-zinc-700 transition"
            title="User Profile"
          >
            <span className="text-lg">👤</span>
          </button>
        </div>
      </header>

      {/* Map Area */}
      <div className="flex-grow relative z-0 w-full h-full">
        <div ref={mapContainer} className="w-full h-full bg-zinc-900" />
        
        {/* Floating Badge Drawer */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-[400]">
          {badges.map(badgeId => {
            const badge = BADGES.find(b => b.id === badgeId);
            return badge ? (
              <div key={badgeId} className="bg-yellow-500 text-black p-2 rounded-full shadow-lg animate-bounce-in flex items-center justify-center w-10 h-10 border-2 border-white" title={badge.name}>
                {badge.icon}
              </div>
            ) : null;
          })}
        </div>
      </div>

      {/* Bottom Stats Panel */}
      <div className="bg-zinc-900 border-t border-zinc-800 p-4 pb-8 z-20 shrink-0">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{unlocked.length}</div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider">Unlocked</div>
          </div>
          <div className="h-8 w-px bg-zinc-800"></div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{LANDMARKS.length}</div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider">Total</div>
          </div>
          <div className="h-8 w-px bg-zinc-800"></div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{badges.length}</div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider">Badges</div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedLandmark && (
        <LandmarkModal 
          landmark={selectedLandmark} 
          userInterests={userProfile.interests}
          onClose={() => setSelectedLandmark(null)} 
          onSaveToJournal={handleSaveToJournal}
          isSaved={journal.some(entry => entry.landmarkId === selectedLandmark.id)}
        />
      )}

      {showProfile && (
        <UserProfileModal 
          profile={userProfile}
          journal={journal}
          onUpdateProfile={handleUpdateProfile}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}