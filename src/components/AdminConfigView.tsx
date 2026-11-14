import React, { useEffect, useState } from 'react';
import { Save, Send, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';
import { AdminIntegrationsConfig } from '../types';
import { PYTHON_FFMPEG_WORKER_SNIPPET } from '../config/integrations';
import { isSupabaseConfigured } from '../lib/supabase';

export const AdminConfigView: React.FC = () => {
  const [config, setConfig] = useState<AdminIntegrationsConfig>({
    workerWebhookUrl: '',
    workerWebhookSecret: '',
    paymentProvider: 'razorpay',
    razorpayKeyId: '',
    razorpayKeySecret: '',
    lemonSqueezyApiKey: '',
    lemonSqueezyStoreId: '',
    lemonSqueezyWebhookSecret: '',
    supabaseUrl: '',
    supabaseAnonKeyConfigured: false,
  });

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  useEffect(() => {
    fetch('/api/admin/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: AdminIntegrationsConfig | null) => {
        if (data) setConfig(data);
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not save config.');
      setStatusMessage(data.message || 'Configuration saved.');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    setTesting(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/admin/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: config.workerWebhookUrl }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Webhook test failed.');
      setStatusMessage(data.message || 'Worker webhook reachable.');
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Webhook test failed.'
      );
    } finally {
      setTesting(false);
    }
  };

  const copyWorkerCode = async () => {
    try {
      await navigator.clipboard.writeText(PYTHON_FFMPEG_WORKER_SNIPPET);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] py-10">
      <div className="mx-auto max-w-[1040px] px-6 space-y-8">
        <div className="border-b border-white/[0.08] pb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Backend Worker & Billing Integrations
          </h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            Configure your external Python FFmpeg rendering webhook (
            <span className="font-mono text-zinc-300">WORKER_WEBHOOK_URL</span>),
            Razorpay / Lemon Squeezy payment keys, and check Supabase wallet
            status. Settings persist in{' '}
            <span className="font-mono text-zinc-300">
              src/config/integrations.ts
            </span>{' '}
            and server config.
          </p>
        </div>

        {statusMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* External Python FFmpeg Worker Webhook */}
          <section className="rounded-2xl border border-white/10 bg-[#111114] p-6 space-y-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-white">
                01. External Python FFmpeg Worker Webhook
              </h2>
              <p className="mt-1 text-xs text-zinc-400">
                When a paid user clicks Download HD Clip, ClipForge dispatches a
                signed JSON render job to this endpoint. When left blank,
                browser Canvas+WebM rendering is used automatically.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  WORKER_WEBHOOK_URL
                </label>
                <input
                  type="url"
                  value={config.workerWebhookUrl}
                  onChange={(e) =>
                    setConfig({ ...config, workerWebhookUrl: e.target.value })
                  }
                  placeholder="https://ffmpeg-worker.yourdomain.com/api/render"
                  className="w-full rounded-lg border border-white/10 bg-[#09090B] px-3.5 py-2.5 font-mono text-xs text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  WORKER_WEBHOOK_SECRET
                </label>
                <input
                  type="password"
                  value={config.workerWebhookSecret}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      workerWebhookSecret: e.target.value,
                    })
                  }
                  placeholder="Shared X-Worker-Secret"
                  className="w-full rounded-lg border border-white/10 bg-[#09090B] px-3.5 py-2.5 font-mono text-xs text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={testing}
                onClick={handleTestWebhook}
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#09090B] px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-900 disabled:opacity-60 cursor-pointer whitespace-nowrap"
              >
                <Send className="h-3.5 w-3.5 text-cyan-400" />
                {testing ? 'Pinging Worker...' : 'Test Webhook Connection'}
              </button>
            </div>
          </section>

          {/* Payment Gateways: Razorpay / Lemon Squeezy */}
          <section className="rounded-2xl border border-white/10 bg-[#111114] p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-white">
                  02. Payment Gateway (Razorpay / Lemon Squeezy)
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  Handles Creator Plan (₹799/mo), Pro Plan (₹1,999/mo), and
                  one-time credit top-ups.
                </p>
              </div>

              <div className="flex items-center gap-1 rounded-lg bg-[#09090B] p-1 border border-white/[0.08] shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setConfig({ ...config, paymentProvider: 'razorpay' })
                  }
                  className={`rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer whitespace-nowrap ${
                    config.paymentProvider === 'razorpay'
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Razorpay (INR)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setConfig({ ...config, paymentProvider: 'lemonsqueezy' })
                  }
                  className={`rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer whitespace-nowrap ${
                    config.paymentProvider === 'lemonsqueezy'
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Lemon Squeezy
                </button>
              </div>
            </div>

            {config.paymentProvider === 'razorpay' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    RAZORPAY_KEY_ID
                  </label>
                  <input
                    type="text"
                    value={config.razorpayKeyId}
                    onChange={(e) =>
                      setConfig({ ...config, razorpayKeyId: e.target.value })
                    }
                    placeholder="rzp_live_..."
                    className="w-full rounded-lg border border-white/10 bg-[#09090B] px-3.5 py-2.5 font-mono text-xs text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    RAZORPAY_KEY_SECRET
                  </label>
                  <input
                    type="password"
                    value={config.razorpayKeySecret}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        razorpayKeySecret: e.target.value,
                      })
                    }
                    placeholder="Razorpay secret key"
                    className="w-full rounded-lg border border-white/10 bg-[#09090B] px-3.5 py-2.5 font-mono text-xs text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    LEMON_SQUEEZY_STORE_ID
                  </label>
                  <input
                    type="text"
                    value={config.lemonSqueezyStoreId}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        lemonSqueezyStoreId: e.target.value,
                      })
                    }
                    placeholder="Store ID"
                    className="w-full rounded-lg border border-white/10 bg-[#09090B] px-3.5 py-2.5 font-mono text-xs text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    LEMON_SQUEEZY_API_KEY
                  </label>
                  <input
                    type="password"
                    value={config.lemonSqueezyApiKey}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        lemonSqueezyApiKey: e.target.value,
                      })
                    }
                    placeholder="API Key"
                    className="w-full rounded-lg border border-white/10 bg-[#09090B] px-3.5 py-2.5 font-mono text-xs text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    LEMON_SQUEEZY_WEBHOOK_SECRET
                  </label>
                  <input
                    type="password"
                    value={config.lemonSqueezyWebhookSecret}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        lemonSqueezyWebhookSecret: e.target.value,
                      })
                    }
                    placeholder="Signing secret"
                    className="w-full rounded-lg border border-white/10 bg-[#09090B] px-3.5 py-2.5 font-mono text-xs text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </section>

          {/* Supabase Auth & Database Status */}
          <section className="rounded-2xl border border-white/10 bg-[#111114] p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-white">
                  03. Supabase Auth & Credit Wallet
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  Set <span className="font-mono text-zinc-300">VITE_SUPABASE_URL</span>{' '}
                  and{' '}
                  <span className="font-mono text-zinc-300">
                    VITE_SUPABASE_ANON_KEY
                  </span>{' '}
                  in environment variables to route signup/login through your
                  Supabase project.
                </p>
              </div>
              <span className="font-mono text-xs text-cyan-400 whitespace-nowrap shrink-0">
                {isSupabaseConfigured
                  ? 'Supabase Active'
                  : 'Local Fallback Active'}
              </span>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-6 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-300 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving Configuration...' : 'Save Integration Settings'}
            </button>
          </div>
        </form>

        {/* Reference Python FFmpeg Worker Endpoint */}
        <section className="rounded-2xl border border-white/10 bg-[#111114] p-6 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-display text-base font-semibold text-white">
              Python FastAPI + FFmpeg Worker Reference
            </h3>
            <button
              type="button"
              onClick={copyWorkerCode}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#09090B] px-3 py-1.5 text-xs text-zinc-300 hover:text-white cursor-pointer whitespace-nowrap"
            >
              {copiedSnippet ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy Python Worker
                </>
              )}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-xl border border-white/[0.06] bg-[#09090B] p-4 font-mono text-xs text-zinc-300 leading-relaxed">
            {PYTHON_FFMPEG_WORKER_SNIPPET}
          </pre>
        </section>
      </div>
    </div>
  );
};
