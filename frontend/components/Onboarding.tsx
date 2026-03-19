'use client';

import React, { useState } from 'react';
import { INTERESTS, type InterestId } from '../lib/interests';
import type { UserProfile } from '../types';
import { assignPersona } from '../lib/personaService';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
  uid: string;
  displayName?: string | null;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, uid, displayName }) => {
  const [selectedInterests, setSelectedInterests] = useState<InterestId[]>([]);
  const [step, setStep] = useState<'interests' | 'processing'>('interests');

  const toggleInterest = (id: InterestId) => {
    setSelectedInterests(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    setStep('processing');
    const persona = await assignPersona(selectedInterests);
    
    onComplete({
      uid,
      name: displayName || 'Explorer',
      interests: selectedInterests,
      personaId: persona.personaId,
      personaTitle: persona.personaTitle,
      hasOnboarded: true,
      createdAt: Date.now()
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center p-6 text-white">
      <div className="w-full max-w-md space-y-8">
        
        {/* Logo / Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-500 to-amber-600 bg-clip-text text-transparent">
            Aura
          </h1>
          <p className="text-zinc-400">Personalized city exploration powered by AI.</p>
        </div>

        {step === 'interests' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-white">Welcome to Aura</h1>
            <p className="text-lg text-zinc-400">
              Your personalized journey through the world's most iconic cities begins here.
            </p>
          </div>
            
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">What interests you?</h2>
              <p className="text-sm text-zinc-400">We'll customize your journey based on this.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {INTERESTS.map((interest) => (
                <button
                  key={interest.id}
                  onClick={() => toggleInterest(interest.id)}
                  className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                    selectedInterests.includes(interest.id)
                      ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="font-bold mb-1">{interest.label}</div>
                  <div className="text-xs opacity-80">{interest.description}</div>
                </button>
              ))}
            </div>

            <button 
              onClick={handleFinish}
              disabled={selectedInterests.length === 0}
              className="w-full py-4 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-yellow-900/20"
            >
              Start Exploring
            </button>
          </div>
        )}

        {step === 'processing' && (
          <div className="text-center space-y-4 animate-in fade-in duration-500">
            <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-zinc-400 animate-pulse">Crafting your explorer persona...</p>
          </div>
        )}

      </div>
    </div>
  );
};
