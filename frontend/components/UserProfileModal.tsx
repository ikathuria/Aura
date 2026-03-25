'use client';

import React, { useState } from 'react';
import type { GalleryItem, UserProfile } from '../types';
import { INTERESTS } from '../lib/interests';

interface UserProfileModalProps {
  profile: UserProfile;
  gallery: GalleryItem[];
  onUpdateProfile: (profile: UserProfile) => void;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  profile,
  gallery,
  onUpdateProfile,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState('profile' as 'profile' | 'gallery');
  const handleSyncProfile = () => {
    onUpdateProfile({ ...profile });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-zinc-700 flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
          <div>
            <h2 className="text-xl font-bold text-white">Explorer Profile</h2>
            <p className="text-xs text-yellow-500 font-mono uppercase tracking-wider">{profile.personaTitle}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex border-b border-zinc-800">
          <button
            className={`flex-1 py-3 text-sm font-medium transition ${activeTab === 'profile' ? 'text-yellow-500 border-b-2 border-yellow-500 bg-zinc-800/50' : 'text-zinc-400 hover:text-white'}`}
            onClick={() => setActiveTab('profile')}
          >
            Identity
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium transition ${activeTab === 'gallery' ? 'text-yellow-500 border-b-2 border-yellow-500 bg-zinc-800/50' : 'text-zinc-400 hover:text-white'}`}
            onClick={() => setActiveTab('gallery')}
          >
            Gallery ({gallery.length})
          </button>
        </div>

        <div className="p-6 overflow-y-auto scrollbar-hide flex-grow">
          {activeTab === 'profile' ? (
            <div className="space-y-6">
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2">Name</label>
                <div className="w-full bg-zinc-800 border border-zinc-700 rounded p-3 text-white">
                  {profile.name || 'Explorer'}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-3">Your Interests</label>
                <div className="grid grid-cols-2 gap-2">
                  {INTERESTS.map((interest) => (
                    <div
                      key={interest.id}
                      className={`p-2 rounded text-xs font-medium border ${
                        profile.interests.includes(interest.id)
                          ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                      }`}
                    >
                      {interest.label}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSyncProfile}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded transition"
              >
                Refresh Profile
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {gallery.length === 0 ? (
                <div className="text-center py-10 text-zinc-500">
                  <p>No memories collected yet.</p>
                  <p className="text-xs mt-2">Visit landmarks to unlock stories.</p>
                </div>
              ) : (
                gallery.map((entry) => (
                  <div key={entry.landmarkId} className="bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700 hover:border-zinc-500 transition group">
                    {entry.imageUrl || entry.videoUrl ? (
                      <div className="w-full h-32 relative overflow-hidden">
                        {entry.imageUrl ? (
                          <img src={entry.imageUrl} alt="Cinematic" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                        ) : (
                          <video
                            src={entry.videoUrl || undefined}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                            muted
                            playsInline
                            loop
                            autoPlay
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent opacity-80"></div>
                        <div className="absolute bottom-2 left-3">
                          <h3 className="font-bold text-white text-lg drop-shadow-md">{entry.landmarkName || entry.landmarkId}</h3>
                          <span className="text-[10px] text-zinc-300">{new Date(entry.savedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ) : null}
                    <div className="p-3">
                      <p className="text-xs text-zinc-400 line-clamp-2 italic">&ldquo;{entry.script || 'A memory waiting to be written.'}&rdquo;</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
