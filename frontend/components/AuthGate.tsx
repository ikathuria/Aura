'use client';

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export const AuthGate: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err) {
      setError('Google sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleEmail = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Email sign-in/up failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-6 text-white">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black tracking-tighter text-white">
            AURA
          </h1>
          <p className="text-zinc-500 font-medium">Global City Exploration</p>
        </div>

        <button
          onClick={handleGoogle}
          disabled={busy}
          className="w-full py-3 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 transition disabled:opacity-60"
        >
          Continue with Google
        </button>

        <div className="border-t border-zinc-800 pt-4">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 rounded-lg text-sm ${mode === 'signin' ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-lg text-sm ${mode === 'signup' ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
            >
              Create Account
            </button>
          </div>
          <div className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 focus:border-gold outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 focus:border-gold outline-none"
            />
            <button
              onClick={handleEmail}
              disabled={busy || !email || !password}
              className="w-full py-3 rounded-lg bg-gold text-black font-semibold hover:bg-ember transition disabled:opacity-60"
            >
              {mode === 'signin' ? 'Sign In with Email' : 'Create Account'}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
};
