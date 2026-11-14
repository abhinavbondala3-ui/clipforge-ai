import React, { useRef, useState } from 'react';
import { Upload, Link2, ArrowRight, Check, Play } from 'lucide-react';
import { SAMPLE_VERTICAL_CLIPS } from '../data/sampleClips';
import { CaptionStyle, ClipCountOption, UserProfile } from '../types';
import { VerticalClipPlayer } from './VerticalClipPlayer';
import { ActivePage } from './Navbar';

interface LandingPageProps {
  onLaunchGenerator: (params: {
    youtubeUrl?: string;
    file?: File | null;
    clipCount?: ClipCountOption;
    captionStyle?: CaptionStyle;
  }) => void;
  onNavigate: (page: ActivePage) => void;
  onOpenAuth: () => void;
  onOpenUpgrade: () => void;
  user: UserProfile | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunchGenerator,
  onNavigate,
  onOpenAuth,
  onOpenUpgrade,
  user,
}) => {
  const [heroUrl, setHeroUrl] = useState('');
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLaunchGenerator({
      youtubeUrl: heroUrl.trim() || undefined,
      file: heroFile,
      clipCount: 10,
      captionStyle: 'Hormozi Bold Yellow',
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      setHeroFile(dropped);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA]">
      {/* Hero Section */}
      <section className="border-b border-white/[0.06] py-16 lg:py-24">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 lg:grid-cols-12 gap-12 px-6 items-stretch">
          {/* Left Column: Value Proposition + Ingestion Form */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <p className="text-xs font-medium tracking-wide text-cyan-400">
              Long-Form Video Repurposing Studio · 9:16 Vertical Pipeline
            </p>
            <h1
              className="mt-4 font-display font-bold tracking-tight text-white leading-[1.06]"
              style={{
                fontSize: 'clamp(2.35rem, 4.3vw, 3.85rem)',
                textWrap: 'balance',
              }}
            >
              Turn one long video into 20 viral vertical shorts.
            </h1>
            <p className="mt-5 max-w-2xl text-base sm:text-lg text-zinc-400 leading-relaxed">
              Paste a YouTube link or upload raw podcast, keynote, or interview
              footage. ClipForge AI detects high-retention moments, writes
              5-word scroll-stopping hooks, and formats animated 9:16 captions
              ready for Shorts, Reels, and TikTok.
            </p>

            {/* Primary Input Box + File Dropzone */}
            <form
              onSubmit={handleHeroSubmit}
              className="mt-8 rounded-2xl border border-white/10 bg-[#111114] p-4 sm:p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="url"
                    value={heroUrl}
                    onChange={(e) => setHeroUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    aria-label="YouTube Video URL"
                    className="w-full rounded-lg border border-white/10 bg-[#09090B] py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-400 px-6 py-3 text-sm font-semibold text-zinc-950 hover:bg-cyan-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Generate Viral Clips
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    fileInputRef.current?.click();
                  }
                }}
                className={`flex items-center justify-between gap-4 rounded-xl border border-dashed px-4 py-3.5 text-left transition-colors cursor-pointer ${
                  dragActive
                    ? 'border-cyan-400 bg-cyan-400/10'
                    : 'border-white/15 bg-[#09090B]/60 hover:border-white/30'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Upload className="h-4 w-4 text-zinc-400 shrink-0" />
                  <span className="truncate text-xs sm:text-sm text-zinc-300">
                    {heroFile
                      ? `Selected: ${heroFile.name} (${(
                          heroFile.size /
                          (1024 * 1024)
                        ).toFixed(1)} MB)`
                      : 'Or drop an MP4, MOV, WEBM, or SRT transcript file here'}
                  </span>
                </div>
                <span className="font-mono text-xs text-cyan-400 whitespace-nowrap shrink-0">
                  Browse File
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,.srt,.txt"
                  className="hidden"
                  onChange={(e) => setHeroFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                <span>15 free minutes on signup</span>
                <span aria-hidden="true">·</span>
                <span>10–20 ranked clips per video</span>
                <span aria-hidden="true">·</span>
                <span>9:16 auto-crop & animated captions</span>
              </div>
            </form>
          </div>

          {/* Right Column: Dominant 9:16 Focal Preview */}
          <div className="lg:col-span-5 flex items-center justify-center">
            <div className="w-full max-w-[320px] rounded-2xl border border-white/10 bg-[#111114] p-3">
              <VerticalClipPlayer
                clip={SAMPLE_VERTICAL_CLIPS[0]}
                captionStyle="Hormozi Bold Yellow"
                captionsEnabled={true}
              />
              <div className="mt-3 flex items-center justify-between px-1 text-xs">
                <span className="font-medium text-zinc-200 truncate">
                  {SAMPLE_VERTICAL_CLIPS[0].clip_title}
                </span>
                <span className="font-mono font-semibold text-cyan-400 tabular-nums shrink-0 ml-2">
                  {SAMPLE_VERTICAL_CLIPS[0].virality_score}/100
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works — 3-Step Showcase */}
      <section id="how-it-works" className="border-b border-white/[0.06] py-20">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="max-w-2xl">
            <h2
              className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white"
              style={{ textWrap: 'balance' }}
            >
              From raw 60-minute recording to 20 ready-to-publish shorts.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-zinc-400">
              Built for podcast hosts, founders, and post-production teams who
              need sharp narrative arcs instead of random timeline cuts.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-white/[0.08] bg-[#111114] p-6">
              <p className="font-mono text-xs text-cyan-400">01. Ingest</p>
              <h3 className="mt-3 font-display text-lg font-semibold text-white">
                Paste YouTube URL or drop footage
              </h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Import interviews, webinars, or local MP4/MOV recordings. Choose
                10, 15, or 20 target clips and pick your signature caption style.
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#111114] p-6">
              <p className="font-mono text-xs text-cyan-400">
                02. Score & Hook
              </p>
              <h3 className="mt-3 font-display text-lg font-semibold text-white">
                Gemini ranks retention & writes hooks
              </h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Our Gemini pipeline evaluates curiosity gaps, contrarian
                claims, and emotional pacing—scoring every segment 1–100 with a
                5-word hook.
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#111114] p-6">
              <p className="font-mono text-xs text-cyan-400">
                03. Edit & Export
              </p>
              <h3 className="mt-3 font-display text-lg font-semibold text-white">
                Trim timestamps & export 9:16 HD
              </h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Tweak hook text inline, adjust start/end boundaries, toggle
                Hormozi or Neon captions, and export via browser render or your
                FFmpeg worker.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sample Vertical Video Preview Cards with Virality Scores */}
      <section id="examples" className="border-b border-white/[0.06] py-20">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Sample Vertical Clips & Virality Scores
              </h2>
              <p className="mt-2 text-sm sm:text-base text-zinc-400">
                Click any 9:16 card to preview live word-by-word caption
                animation and hook framing.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 text-cyan-400" />
              Open Clip Generator
            </button>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SAMPLE_VERTICAL_CLIPS.map((clip) => (
              <div
                key={clip.id}
                className="flex flex-col rounded-2xl border border-white/[0.08] bg-[#111114] p-3.5"
              >
                <VerticalClipPlayer
                  clip={clip}
                  captionStyle={clip.caption_style || 'Hormozi Bold Yellow'}
                  captionsEnabled={true}
                  compact={true}
                />
                <div className="mt-3.5 space-y-2 px-0.5">
                  <div className="flex items-center justify-between gap-2 text-xs font-mono tabular-nums">
                    <span className="text-zinc-400">
                      {clip.caption_style}
                    </span>
                    <span className="font-semibold text-cyan-400">
                      Score {clip.virality_score}/100
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white line-clamp-2">
                    {clip.clip_title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Transparent creator & studio pricing
            </h2>
            <p className="mt-2 text-sm sm:text-base text-zinc-400">
              Start with 15 free minutes automatically credited on signup.
              Upgrade anytime via Razorpay or Lemon Squeezy.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Free Trial */}
            <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#111114] p-7">
              <div>
                <h3 className="font-display text-lg font-bold text-white">
                  Free Trial
                </h3>
                <p className="mt-1 text-xs text-zinc-400">
                  For testing your first long-form video
                </p>
                <p className="mt-5 font-display text-4xl font-bold text-white tabular-nums">
                  ₹0
                </p>
                <div className="mt-6 border-t border-white/[0.06] pt-5 space-y-3 text-sm text-zinc-300">
                  <div className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-zinc-400 shrink-0" />
                    <span>1 video up to 15 mins (15 free credits)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-zinc-400 shrink-0" />
                    <span>10–20 AI-scored clips with hook text</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-zinc-400 shrink-0" />
                    <span>Includes ClipForge preview watermark</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => (user ? onNavigate('dashboard') : onOpenAuth())}
                className="mt-8 w-full rounded-lg border border-white/15 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors whitespace-nowrap cursor-pointer"
              >
                {user ? 'Open Dashboard' : 'Start Free · 15m Included'}
              </button>
            </div>

            {/* Creator Plan */}
            <div className="flex flex-col justify-between rounded-2xl border border-cyan-400/50 bg-[#111114] p-7">
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-lg font-bold text-white">
                    Creator Plan
                  </h3>
                  <span className="font-mono text-xs text-cyan-400">
                    Recommended
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  For solo creators, podcasters, and YouTubers
                </p>
                <p className="mt-5 font-display text-4xl font-bold text-white tabular-nums">
                  ₹799
                  <span className="text-sm font-normal text-zinc-400">
                    {' '}
                    / month
                  </span>
                </p>
                <div className="mt-6 border-t border-white/[0.06] pt-5 space-y-3 text-sm text-zinc-300">
                  <div className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span>30 hours of video processing monthly</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span>No watermark on HD 1080p vertical exports</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span>Hormozi Yellow, Minimalist & Neon Pop captions</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenUpgrade}
                className="mt-8 w-full rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-300 transition-colors whitespace-nowrap cursor-pointer"
              >
                Choose Creator · ₹799/mo
              </button>
            </div>

            {/* Pro Plan */}
            <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#111114] p-7">
              <div>
                <h3 className="font-display text-lg font-bold text-white">
                  Pro Plan
                </h3>
                <p className="mt-1 text-xs text-zinc-400">
                  For agencies, clip farms, and media networks
                </p>
                <p className="mt-5 font-display text-4xl font-bold text-white tabular-nums">
                  ₹1,999
                  <span className="text-sm font-normal text-zinc-400">
                    {' '}
                    / month
                  </span>
                </p>
                <div className="mt-6 border-t border-white/[0.06] pt-5 space-y-3 text-sm text-zinc-300">
                  <div className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span>Unlimited video processing & clip extraction</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span>4K exports + zero watermark across all seats</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span>Priority external Python FFmpeg worker routing</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenUpgrade}
                className="mt-8 w-full rounded-lg border border-white/15 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors whitespace-nowrap cursor-pointer"
              >
                Choose Pro · ₹1,999/mo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="border-t border-white/[0.06] py-10">
        <div className="mx-auto flex max-w-[1280px] flex-col sm:flex-row items-center justify-between gap-4 px-6 text-xs text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="font-display font-semibold text-zinc-300">
              ClipForge AI
            </span>
            <span aria-hidden="true">·</span>
            <span>9:16 Vertical Video Studio</span>
          </div>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="hover:text-zinc-300 cursor-pointer"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className="hover:text-zinc-300 cursor-pointer"
            >
              Worker & Billing Config
            </button>
            <span>© 2026 ClipForge AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
