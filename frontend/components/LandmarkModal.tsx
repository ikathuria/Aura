'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { CinematicAsset, Landmark } from '../types';

interface LandmarkModalProps {
  landmark: Landmark;
  asset: CinematicAsset | null;
  loading: boolean;
  onClose: () => void;
  onSaveToGallery: () => void;
  isSaved: boolean;
  onAddToItinerary: (id: string) => void;
  onRemoveFromItinerary: (id: string) => void;
  isInItinerary: boolean;
}

export const CinematicModal: React.FC<LandmarkModalProps> = ({
  landmark,
  asset,
  loading,
  onClose,
  onSaveToGallery,
  isSaved,
  onAddToItinerary,
  onRemoveFromItinerary,
  isInItinerary
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    const handleEnded = () => setIsPlaying(false);
    audioRef.current.addEventListener('ended', handleEnded);
    return () => audioRef.current?.removeEventListener('ended', handleEnded);
  }, []);

  const handlePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => null);
      setIsPlaying(true);
    }
  };

  const handleNavigate = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${landmark.lat},${landmark.lng}`, '_blank');
  };

  const handleSave = () => {
    if (isSaved) return;
    onSaveToGallery();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 flex flex-col max-h-[90vh]">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 backdrop-blur-md transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Visual Content Area */}
        <div className="relative aspect-[9/16] w-full bg-zinc-950 flex items-center justify-center overflow-hidden group">
          {loading ? (
            <div className="text-center p-6">
              <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-yellow-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                Synthesizing Memory...
              </p>
            </div>
          ) : asset?.videoUrl ? (
            <video
              src={asset.videoUrl}
              className="w-full h-full object-cover animate-in fade-in duration-1000"
              autoPlay 
              loop 
              muted 
              playsInline 
              controls
            />
          ) : asset?.imageUrl ? (
            <>
              <img src={asset.imageUrl} alt={landmark.name} className="w-full h-full object-cover animate-in fade-in duration-1000" />
            </>
          ) : (
            <div className="text-zinc-500 italic">Visual synthesis unavailable</div>
          )}
          
          {/* Overlay Gradient (only if not playing video controls, but simple overlay is fine) */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-black/60 pointer-events-none"></div>
          
          {/* Title Overlay */}
          <div className="absolute top-8 left-6 right-12 pointer-events-none">
            <h2 className="text-3xl font-bold text-white drop-shadow-lg leading-tight">{landmark.name}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/50 text-yellow-500 text-[10px] font-bold uppercase tracking-wider rounded">
                {landmark.type}
              </span>
            </div>
          </div>
        </div>

        {/* Controls & Script */}
        <div className="flex-grow flex flex-col bg-zinc-900 relative -mt-6 rounded-t-3xl z-10">
          
          {/* Action Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <button 
              onClick={handlePlayAudio}
              disabled={loading || !asset?.audioUrl}
              className="flex items-center gap-2 text-white hover:text-yellow-500 transition disabled:opacity-50"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPlaying ? 'bg-yellow-500 text-black' : 'bg-zinc-800'}`}>
                {isPlaying ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">{isPlaying ? 'Listening...' : 'Listen'}</span>
            </button>

            <button 
              onClick={handleNavigate}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs font-bold uppercase tracking-wider">Directions</span>
            </button>

            <button 
              onClick={() => isInItinerary ? onRemoveFromItinerary(landmark.id) : onAddToItinerary(landmark.id)}
              className={`flex items-center gap-2 transition ${isInItinerary ? 'text-gold' : 'text-zinc-400 hover:text-white'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-bold uppercase tracking-wider">{isInItinerary ? 'Scheduled' : 'Plan Trip'}</span>
            </button>
          </div>

          {/* Script Text */}
          <div className="p-6 overflow-y-auto scrollbar-hide flex-grow">
            {loading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-2 bg-zinc-800 rounded w-3/4"></div>
                <div className="h-2 bg-zinc-800 rounded w-full"></div>
                <div className="h-2 bg-zinc-800 rounded w-5/6"></div>
              </div>
            ) : (
              <p className="text-zinc-300 leading-relaxed font-light text-sm italic border-l-2 border-yellow-500 pl-4">
                "{asset?.script || 'The city holds many stories, but this one is still forming.'}"
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-zinc-950 flex justify-between items-center">
            <button 
              onClick={handleSave}
              disabled={isSaved || loading}
              className={`w-full py-3 font-bold text-sm rounded-xl transition shadow-lg ${
                isSaved 
                  ? 'bg-zinc-800 text-zinc-500 cursor-default' 
                  : 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-yellow-900/20'
              }`}
            >
              {isSaved ? 'Saved to Gallery' : 'Save to Gallery'}
            </button>
          </div>
        </div>
      </div>
      {asset?.audioUrl && <audio ref={audioRef} src={asset.audioUrl} preload="auto" />}
    </div>
  );
};
