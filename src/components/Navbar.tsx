import React from 'react';
import { UserProfile } from '../types';

export type ActivePage = 'landing' | 'dashboard' | 'admin';

interface NavbarProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage, anchor?: string) => void;
  user: UserProfile | null;
  onOpenAuth: () => void;
  onOpenUpgrade: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  onNavigate,
  user,
  onOpenAuth,
  onOpenUpgrade,
  onLogout,
}) => {
  const creditLabel = user
    ? user.plan === 'pro'
      ? 'Unlimited'
      : `${user.credits_minutes.toFixed(1)} min left`
    : '15.0 min free';

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#09090B]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-8 px-6 py-4">
        {/* Zone 1: Single-element brand wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('landing')}
          className="font-display text-lg font-bold tracking-tight text-white hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          ClipForge AI
        </button>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-400">
          <button
            type="button"
            onClick={() => onNavigate('landing', 'how-it-works')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activePage === 'landing' ? 'text-zinc-200' : ''
            }`}
          >
            How It Works
          </button>
          <button
            type="button"
            onClick={() => onNavigate('landing', 'examples')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Examples
          </button>
          <button
            type="button"
            onClick={() => onNavigate('landing', 'pricing')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Pricing
          </button>
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activePage === 'dashboard' ? 'text-cyan-400' : ''
            }`}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => onNavigate('admin')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activePage === 'admin' ? 'text-cyan-400' : ''
            }`}
          >
            Integrations
          </button>
        </nav>

        {/* Zone 3: Credits & Primary CTA */}
        <div className="flex items-center gap-4 shrink-0">
          <span className="hidden sm:inline font-mono text-xs text-zinc-400 tabular-nums whitespace-nowrap shrink-0">
            {creditLabel}
          </span>

          {user ? (
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onLogout}
                title={`Signed in as ${user.email}`}
                className="hidden lg:inline text-xs font-medium text-zinc-400 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sign Out
              </button>
              <button
                type="button"
                onClick={onOpenUpgrade}
                className="rounded-lg bg-cyan-400 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-cyan-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Upgrade / Buy Credits
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="rounded-lg bg-cyan-400 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-cyan-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign In · 15m Free
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
