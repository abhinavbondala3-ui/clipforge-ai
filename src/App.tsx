import { useEffect, useState } from 'react';
import { ActivePage, Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { DashboardView } from './components/DashboardView';
import { AdminConfigView } from './components/AdminConfigView';
import { AuthModal } from './components/AuthModal';
import { UpgradeModal } from './components/UpgradeModal';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { CaptionStyle, ClipCountOption, UserProfile } from './types';

const USER_STORAGE_KEY = 'clipforge_user_session';

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>('landing');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [dashboardPrefill, setDashboardPrefill] = useState<{
    youtubeUrl?: string;
    file?: File | null;
    clipCount?: ClipCountOption;
    captionStyle?: CaptionStyle;
  } | null>(null);

  // Restore saved session or Supabase auth listener
  useEffect(() => {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as UserProfile;
        setUser(parsed);
        // Refresh latest credit balance from backend
        fetch(`/api/users/${encodeURIComponent(parsed.id)}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data: { user?: UserProfile } | null) => {
            if (data?.user) {
              setUser(data.user);
              localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
            }
          })
          .catch(() => {});
      } catch {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }

    if (isSupabaseConfigured && supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user?.email) {
          try {
            const res = await fetch('/api/auth/sync-supabase', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: session.user.id,
                email: session.user.email,
                full_name: session.user.user_metadata?.full_name,
              }),
            });
            if (res.ok) {
              const data = (await res.json()) as { user?: UserProfile };
              if (data.user) {
                setUser(data.user);
                localStorage.setItem(
                  USER_STORAGE_KEY,
                  JSON.stringify(data.user)
                );
              }
            }
          } catch {
            // Keep existing local state on network hiccup
          }
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const handleUserUpdated = (updated: UserProfile) => {
    setUser(updated);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  const handleNavigate = (page: ActivePage, anchor?: string) => {
    setActivePage(page);
    if (anchor) {
      setTimeout(() => {
        const el = document.getElementById(anchor);
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 40);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLaunchGenerator = (params: {
    youtubeUrl?: string;
    file?: File | null;
    clipCount?: ClipCountOption;
    captionStyle?: CaptionStyle;
  }) => {
    setDashboardPrefill(params);
    setActivePage('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA]">
      <Navbar
        activePage={activePage}
        onNavigate={handleNavigate}
        user={user}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenUpgrade={() => setUpgradeModalOpen(true)}
        onLogout={handleLogout}
      />

      <main>
        {activePage === 'landing' && (
          <LandingPage
            onLaunchGenerator={handleLaunchGenerator}
            onNavigate={handleNavigate}
            onOpenAuth={() => setAuthModalOpen(true)}
            onOpenUpgrade={() => setUpgradeModalOpen(true)}
            user={user}
          />
        )}

        {activePage === 'dashboard' && (
          <DashboardView
            user={user}
            initialPrefill={dashboardPrefill}
            onUserUpdated={handleUserUpdated}
            onOpenAuth={() => setAuthModalOpen(true)}
            onOpenUpgrade={() => setUpgradeModalOpen(true)}
          />
        )}

        {activePage === 'admin' && <AdminConfigView />}
      </main>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleUserUpdated}
      />

      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        user={user}
        onRequireAuth={() => setAuthModalOpen(true)}
        onUserUpdated={handleUserUpdated}
      />
    </div>
  );
}
