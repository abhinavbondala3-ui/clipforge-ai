import React, { useState } from 'react';
import { X, Loader2, Lock } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSupabaseConfigured && supabase) {
        if (mode === 'signup') {
          const { data, error: sbErr } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
          });
          if (sbErr) throw new Error(sbErr.message);
          if (data.user) {
            const syncRes = await fetch('/api/auth/sync-supabase', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: data.user.id,
                email: data.user.email,
                full_name: fullName,
              }),
            });
            const syncData = (await syncRes.json()) as {
              user?: UserProfile;
              error?: string;
            };
            if (!syncRes.ok || !syncData.user) {
              throw new Error(syncData.error || 'Could not initialize credit wallet.');
            }
            onSuccess(syncData.user);
            onClose();
            return;
          }
        } else {
          const { data, error: sbErr } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (sbErr) throw new Error(sbErr.message);
          if (data.user) {
            const syncRes = await fetch('/api/auth/sync-supabase', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: data.user.id,
                email: data.user.email,
              }),
            });
            const syncData = (await syncRes.json()) as {
              user?: UserProfile;
              error?: string;
            };
            if (!syncRes.ok || !syncData.user) {
              throw new Error(syncData.error || 'Could not sync user wallet.');
            }
            onSuccess(syncData.user);
            onClose();
            return;
          }
        }
      }

      // Standard server-backed session auth (auto-grants 15 free minutes)
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
        }),
      });
      const data = (await res.json()) as { user?: UserProfile; error?: string };
      if (!res.ok || !data.user) {
        throw new Error(data.error || 'Authentication failed.');
      }

      onSuccess(data.user);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to authenticate.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111114] p-6 sm:p-8 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="auth-modal-title"
              className="font-display text-xl font-bold text-white"
            >
              {mode === 'signup'
                ? 'Create your ClipForge AI account'
                : 'Sign in to ClipForge AI'}
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              {mode === 'signup'
                ? 'Every new account includes 15 free minutes of video credits.'
                : 'Access your saved clips, credits, and export queue.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg bg-[#09090B] p-1 border border-white/[0.06]">
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`rounded-md py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'signup'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`rounded-md py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'login'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Log In
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Aarav Mehta"
                className="w-full rounded-lg border border-white/10 bg-[#09090B] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Work or Creator Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@studio.com"
              className="w-full rounded-lg border border-white/10 bg-[#09090B] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              minLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 4 characters"
              className="w-full rounded-lg border border-white/10 bg-[#09090B] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-300 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'signup'
              ? 'Create Account · Get 15 Free Mins'
              : 'Sign In to Workspace'}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-zinc-500">
          <Lock className="h-3.5 w-3.5" />
          <span>
            {isSupabaseConfigured
              ? 'Connected to Supabase Auth & Credit Wallet'
              : 'Local Studio Session · Supabase ready via env'}
          </span>
        </div>
      </div>
    </div>
  );
};
