'use client';

import React from 'react';
import type { Landmark } from '../types';

interface ItineraryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  landmarks: Landmark[];
  itineraryIds: string[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

export const ItineraryPanel: React.FC<ItineraryPanelProps> = ({
  isOpen,
  onClose,
  landmarks,
  itineraryIds,
  onRemove,
  onClear
}) => {
  const selectedLandmarks = landmarks.filter(l => itineraryIds.includes(l.id));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-zinc-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-zinc-800 flex flex-col">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 backdrop-blur-md">
        <h2 className="text-lg font-bold text-gold flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
          </svg>
          Your Plan
        </h2>
        <button onClick={onClose} className="text-zinc-400 hover:text-white transition">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-grow overflow-y-auto p-4 space-y-3">
        {selectedLandmarks.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 italic text-sm">
            No landmarks added to your itinerary yet.
          </div>
        ) : (
          selectedLandmarks.map((l, index) => (
            <div key={l.id} className="bg-zinc-800/50 border border-zinc-700 p-3 rounded-xl flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-gold text-black text-[10px] font-bold flex items-center justify-center shrink-0">
                  {index + 1}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{l.name}</div>
                  <div className="text-[10px] text-zinc-400 uppercase tracking-wider">{l.type}</div>
                </div>
              </div>
              <button 
                onClick={() => onRemove(l.id)}
                className="text-zinc-500 hover:text-red-500 transition p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {selectedLandmarks.length > 0 && (
        <div className="p-4 bg-zinc-950/80 border-t border-zinc-800 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-500 uppercase tracking-widest">Route Status</span>
            <span className="text-gold font-bold uppercase tracking-wider">Optimized</span>
          </div>
          <button 
            onClick={onClear}
            className="w-full py-3 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 rounded-xl text-sm font-bold transition"
          >
            Clear All
          </button>
          <button 
            onClick={onClose}
            className="w-full py-3 bg-gold text-black hover:bg-gold/90 rounded-xl text-sm font-bold transition"
          >
            Close Plan
          </button>
        </div>
      )}
    </div>
  );
};
