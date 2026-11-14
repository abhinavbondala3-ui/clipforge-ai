import React, { useState } from 'react';
import { X, Check, Loader2, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onRequireAuth: () => void;
  onUserUpdated: (user: UserProfile) => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  user,
  onRequireAuth,
  onUserUpdated,
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCheckout = async (payload: {
    id: string;
    targetPlan?: 'creator' | 'pro';
    topupMinutes?: number;
  }) => {
    if (!user) {
      onClose();
      onRequireAuth();
      return;
    }

    setProcessingId(payload.id);
    setError(null);
    setFeedback(null);

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          targetPlan: payload.targetPlan,
          topupMinutes: payload.topupMinutes,
        }),
      });
      const data = (await res.json()) as {
        user?: UserProfile;
        transactionId?: string;
        error?: string;
      };
      if (!res.ok || !data.user) {
        throw new Error(data.error || 'Checkout could not be completed.');
      }
      onUserUpdated(data.user);
      setFeedback(`Payment verified (${data.transactionId}). Credits updated.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Checkout failed.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
    >
      <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#111114] p-6 sm:p-8 shadow-2xl my-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="upgrade-modal-title"
              className="font-display text-2xl font-bold text-white"
            >
              Upgrade Plan or Top Up Video Credits
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Unlock watermark-free 1080p/4K exports and higher monthly processing limits.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close upgrade modal"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {feedback && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-emerald-300">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Creator Plan */}
          <div className="flex flex-col justify-between rounded-xl border border-cyan-400/40 bg-[#09090B] p-6">
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-lg font-bold text-white">
                  Creator Plan
                </h3>
                <span className="font-mono text-xs text-cyan-400">
                  Most Popular
                </span>
              </div>
              <p className="mt-3 font-display text-3xl font-bold text-white tabular-nums">
                ₹799
                <span className="text-sm font-normal text-zinc-400"> / mo</span>
              </p>
              <ul className="mt-5 space-y-2.5 text-sm text-zinc-300">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span>30 hours (1,800 mins) monthly processing</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span>Zero ClipForge watermark on all exports</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span>1080p HD 9:16 exports + all 3 caption presets</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              disabled={processingId !== null}
              onClick={() =>
                handleCheckout({ id: 'creator', targetPlan: 'creator' })
              }
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-300 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
            >
              {processingId === 'creator' && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {user?.plan === 'creator'
                ? 'Renew Creator · +30 Hours'
                : 'Activate Creator · ₹799'}
            </button>
          </div>

          {/* Pro Plan */}
          <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#09090B] p-6">
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-lg font-bold text-white">
                  Pro Plan
                </h3>
                <span className="font-mono text-xs text-zinc-400">
                  Agencies & Studios
                </span>
              </div>
              <p className="mt-3 font-display text-3xl font-bold text-white tabular-nums">
                ₹1,999
                <span className="text-sm font-normal text-zinc-400"> / mo</span>
              </p>
              <ul className="mt-5 space-y-2.5 text-sm text-zinc-300">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span>Unlimited video minutes & batch jobs</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span>4K priority FFmpeg worker queue</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span>Custom webhook routing & team exports</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              disabled={processingId !== null}
              onClick={() => handleCheckout({ id: 'pro', targetPlan: 'pro' })}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
            >
              {processingId === 'pro' && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {user?.plan === 'pro'
                ? 'Active Unlimited Plan'
                : 'Activate Pro · ₹1,999'}
            </button>
          </div>
        </div>

        {/* Credit Top-Up Row */}
        <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#09090B] px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-white">
              One-Time Credit Top-Up · +60 Video Minutes
            </p>
            <p className="text-xs text-zinc-400">
              Pay-as-you-go pack via Razorpay or Lemon Squeezy. Never expires.
            </p>
          </div>
          <button
            type="button"
            disabled={processingId !== null}
            onClick={() =>
              handleCheckout({ id: 'topup60', topupMinutes: 60 })
            }
            className="flex items-center gap-2 rounded-lg border border-cyan-400/40 px-4 py-2 text-xs font-semibold text-cyan-400 hover:bg-cyan-400/10 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {processingId === 'topup60' && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
            Buy +60 Mins · ₹299
          </button>
        </div>
      </div>
    </div>
  );
};
