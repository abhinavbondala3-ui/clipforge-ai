import React, { useEffect, useRef, useState } from 'react';
import {
  Link2,
  Upload,
  Loader2,
  Download,
  Lock,
  Copy,
  Check,
  Scissors,
  Captions,
  ChevronDown,
  ChevronUp,
  History,
  Minus,
  Plus,
} from 'lucide-react';
import {
  CaptionStyle,
  ClipCountOption,
  GeneratedClip,
  UserProfile,
  VideoAnalysisJob,
} from '../types';
import { STUDIO_PREVIEW_FRAMES } from '../data/sampleClips';
import { VerticalClipPlayer } from './VerticalClipPlayer';
import {
  adjustTimestamp,
  getClipDurationSeconds,
  renderBrowserVerticalClip,
} from '../utils/clipExport';

interface DashboardViewProps {
  user: UserProfile | null;
  initialPrefill?: {
    youtubeUrl?: string;
    file?: File | null;
    clipCount?: ClipCountOption;
    captionStyle?: CaptionStyle;
  } | null;
  onUserUpdated: (user: UserProfile) => void;
  onOpenAuth: () => void;
  onOpenUpgrade: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  initialPrefill,
  onUserUpdated,
  onOpenAuth,
  onOpenUpgrade,
}) => {
  const [youtubeUrl, setYoutubeUrl] = useState(
    initialPrefill?.youtubeUrl || ''
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(
    initialPrefill?.file || null
  );
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number>(12);
  const [transcriptText, setTranscriptText] = useState('');
  const [showTranscriptInput, setShowTranscriptInput] = useState(false);

  const [clipCount, setClipCount] = useState<ClipCountOption>(
    initialPrefill?.clipCount || 10
  );
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>(
    initialPrefill?.captionStyle || 'Hormozi Bold Yellow'
  );

  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clips, setClips] = useState<GeneratedClip[]>([]);
  const [activeJobLabel, setActiveJobLabel] = useState<string | null>(null);
  const [pastJobs, setPastJobs] = useState<VideoAnalysisJob[]>([]);

  const [viralityFilter, setViralityFilter] = useState<'all' | 'high'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [renderingClipId, setRenderingClipId] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync file preview URL and duration when file changes
  useEffect(() => {
    if (!selectedFile) {
      setUploadedVideoUrl(null);
      return;
    }

    if (selectedFile.type.startsWith('video/')) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setUploadedVideoUrl(objectUrl);

      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.onloadedmetadata = () => {
        if (tempVideo.duration && Number.isFinite(tempVideo.duration)) {
          setDurationMinutes(Math.max(1, Math.round(tempVideo.duration / 60)));
        }
      };
      tempVideo.src = objectUrl;

      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    } else if (
      selectedFile.name.endsWith('.srt') ||
      selectedFile.name.endsWith('.txt')
    ) {
      selectedFile.text().then((txt) => {
        setTranscriptText(txt.slice(0, 18000));
        setShowTranscriptInput(true);
      });
    }
  }, [selectedFile]);

  // Apply prefill if navigated from Landing Hero
  useEffect(() => {
    if (initialPrefill?.youtubeUrl) setYoutubeUrl(initialPrefill.youtubeUrl);
    if (initialPrefill?.file) setSelectedFile(initialPrefill.file);
    if (initialPrefill?.clipCount) setClipCount(initialPrefill.clipCount);
    if (initialPrefill?.captionStyle)
      setCaptionStyle(initialPrefill.captionStyle);
  }, [initialPrefill]);

  // Load past jobs if signed in
  useEffect(() => {
    if (!user?.id) {
      setPastJobs([]);
      return;
    }
    fetch(`/api/users/${encodeURIComponent(user.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { jobs?: VideoAnalysisJob[] } | null) => {
        if (data?.jobs) setPastJobs(data.jobs);
      })
      .catch(() => {});
  }, [user?.id]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExportNotice(null);

    if (!youtubeUrl.trim() && !selectedFile && !transcriptText.trim()) {
      setError('Paste a YouTube URL, upload a video file, or enter a transcript.');
      return;
    }

    setAnalyzing(true);
    try {
      const res = await fetch('/api/analyze-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtubeUrl: youtubeUrl.trim() || undefined,
          fileName: selectedFile?.name || undefined,
          durationMinutes,
          transcript: transcriptText.trim() || undefined,
          clipCount,
          captionStyle,
          userId: user?.id,
        }),
      });

      const data = (await res.json()) as {
        clips?: GeneratedClip[];
        job?: VideoAnalysisJob;
        user?: UserProfile | null;
        error?: string;
        code?: string;
      };

      if (!res.ok) {
        if (data.code === 'INSUFFICIENT_CREDITS') {
          onOpenUpgrade();
        }
        throw new Error(data.error || 'Video analysis failed.');
      }

      const enriched = (data.clips || [])
        .map((c, idx) => ({
          ...c,
          preview_image:
            STUDIO_PREVIEW_FRAMES[idx % STUDIO_PREVIEW_FRAMES.length],
          caption_style: captionStyle,
          captions_enabled: true,
        }))
        .sort((a, b) => b.virality_score - a.virality_score);

      setClips(enriched);
      setActiveJobLabel(
        data.job?.source_label || youtubeUrl.trim() || selectedFile?.name || 'Session'
      );

      if (data.job) {
        setPastJobs((prev) => [data.job!, ...prev].slice(0, 15));
      }
      if (data.user) {
        onUserUpdated(data.user);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to analyze video.');
    } finally {
      setAnalyzing(false);
    }
  };

  const updateClipField = (
    clipId: string,
    patch: Partial<GeneratedClip>
  ) => {
    setClips((prev) =>
      prev.map((c) => (c.id === clipId ? { ...c, ...patch } : c))
    );
  };

  const handleCopySnippet = async (clip: GeneratedClip) => {
    try {
      await navigator.clipboard.writeText(
        `${clip.hook_text}\n\n${clip.transcript_snippet}`
      );
      setCopiedId(clip.id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleDownloadClip = async (
    clip: GeneratedClip,
    allowWatermarkedPreview = false
  ) => {
    const isFreeTier = !user || user.plan === 'free';

    if (isFreeTier && !allowWatermarkedPreview) {
      onOpenUpgrade();
      return;
    }

    setRenderingClipId(clip.id);
    setRenderProgress(0);
    setExportNotice(null);

    try {
      const res = await fetch('/api/render-clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clipId: clip.id,
          clipTitle: clip.clip_title,
          sourceUrl: youtubeUrl.trim(),
          startTime: clip.start_time,
          endTime: clip.end_time,
          hookText: clip.hook_text,
          captionStyle: clip.caption_style || captionStyle,
          userId: user?.id,
          allowWatermarkedPreview,
        }),
      });

      const data = (await res.json()) as {
        requiresUpgrade?: boolean;
        mode?: string;
        downloadUrl?: string;
        watermark?: boolean;
        error?: string;
      };

      if (res.status === 402 || data.requiresUpgrade) {
        onOpenUpgrade();
        return;
      }

      if (data.mode === 'external_ffmpeg_worker' && data.downloadUrl) {
        const a = document.createElement('a');
        a.href = data.downloadUrl;
        a.download = `${clip.clip_title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.mp4`;
        a.click();
        setExportNotice(`Exported "${clip.clip_title}" via Python FFmpeg worker.`);
        return;
      }

      // Render real downloadable 9:16 WebM clip in browser
      const blob = await renderBrowserVerticalClip({
        clip,
        captionStyle: clip.caption_style || captionStyle,
        captionsEnabled: clip.captions_enabled ?? true,
        watermark: Boolean(data.watermark),
        uploadedVideoUrl,
        onProgress: (pct) => setRenderProgress(pct),
      });

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${clip.clip_title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.webm`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2500);

      setExportNotice(
        data.watermark
          ? `Downloaded watermarked preview for "${clip.clip_title}". Upgrade for clean 1080p HD.`
          : `Downloaded HD 9:16 clip "${clip.clip_title}".`
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setRenderingClipId(null);
      setRenderProgress(0);
    }
  };

  const loadJobIntoEditor = (job: VideoAnalysisJob) => {
    const loaded = job.clips.map((c, idx) => ({
      ...c,
      preview_image: STUDIO_PREVIEW_FRAMES[idx % STUDIO_PREVIEW_FRAMES.length],
      caption_style: (job.caption_style as CaptionStyle) || captionStyle,
      captions_enabled: true,
    }));
    setClips(loaded);
    setActiveJobLabel(job.source_label);
  };

  const isFreeTier = !user || user.plan === 'free';
  const filteredClips =
    viralityFilter === 'high'
      ? clips.filter((c) => c.virality_score >= 85)
      : clips;

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] py-10">
      <div className="mx-auto max-w-[1280px] px-6 space-y-10">
        {/* Top Workspace Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Clip Generator & Studio Editor
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Analyze a YouTube URL or video file with Gemini to extract
              virality-ranked 9:16 clips.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!user ? (
              <button
                type="button"
                onClick={onOpenAuth}
                className="rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/20 transition-colors cursor-pointer whitespace-nowrap"
              >
                Sign Up to Save Jobs · 15m Free
              </button>
            ) : (
              <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono tabular-nums">
                <span>Plan: {user.plan.toUpperCase()}</span>
                <span aria-hidden="true">·</span>
                <span className="text-cyan-400 font-semibold">
                  {user.plan === 'pro'
                    ? 'Unlimited credits'
                    : `${user.credits_minutes.toFixed(1)} min remaining`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Main Generator Form */}
        <form
          onSubmit={handleAnalyze}
          className="rounded-2xl border border-white/10 bg-[#111114] p-6 space-y-5"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* YouTube URL */}
            <div className="lg:col-span-6">
              <label className="block text-xs font-medium text-zinc-300 mb-2">
                YouTube Video URL
              </label>
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                  className="w-full rounded-lg border border-white/10 bg-[#09090B] py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Clip Count Dropdown */}
            <div className="lg:col-span-3">
              <label
                htmlFor="clip-count-select"
                className="block text-xs font-medium text-zinc-300 mb-2"
              >
                Clip Count
              </label>
              <select
                id="clip-count-select"
                value={clipCount}
                onChange={(e) =>
                  setClipCount(Number(e.target.value) as ClipCountOption)
                }
                className="w-full rounded-lg border border-white/10 bg-[#09090B] px-3.5 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
              >
                <option value={10}>10 Viral Clips</option>
                <option value={15}>15 Viral Clips</option>
                <option value={20}>20 Viral Clips</option>
              </select>
            </div>

            {/* Caption Style Dropdown */}
            <div className="lg:col-span-3">
              <label
                htmlFor="caption-style-select"
                className="block text-xs font-medium text-zinc-300 mb-2"
              >
                Caption Style
              </label>
              <select
                id="caption-style-select"
                value={captionStyle}
                onChange={(e) =>
                  setCaptionStyle(e.target.value as CaptionStyle)
                }
                className="w-full rounded-lg border border-white/10 bg-[#09090B] px-3.5 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
              >
                <option value="Hormozi Bold Yellow">Hormozi Bold Yellow</option>
                <option value="Minimalist White">Minimalist White</option>
                <option value="Neon Pop">Neon Pop</option>
              </select>
            </div>
          </div>

          {/* File Upload + Estimated Duration */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            <div className="lg:col-span-8">
              <div
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    fileInputRef.current?.click();
                  }
                }}
                className="flex items-center justify-between gap-4 rounded-xl border border-dashed border-white/15 bg-[#09090B]/70 px-4 py-3 hover:border-white/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Upload className="h-4 w-4 text-zinc-400 shrink-0" />
                  <span className="truncate text-xs sm:text-sm text-zinc-300">
                    {selectedFile
                      ? `${selectedFile.name} (${(
                          selectedFile.size /
                          (1024 * 1024)
                        ).toFixed(1)} MB)`
                      : 'Upload local MP4 / MOV / WEBM video or .SRT transcript (optional)'}
                  </span>
                </div>
                <span className="font-mono text-xs text-cyan-400 whitespace-nowrap shrink-0">
                  {selectedFile ? 'Replace File' : 'Select File'}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,.srt,.txt"
                  className="hidden"
                  onChange={(e) =>
                    setSelectedFile(e.target.files?.[0] || null)
                  }
                />
              </div>
            </div>

            <div className="lg:col-span-4 flex items-center gap-3">
              <label
                htmlFor="duration-mins"
                className="text-xs font-medium text-zinc-400 whitespace-nowrap"
              >
                Video Length (min)
              </label>
              <input
                id="duration-mins"
                type="number"
                min={1}
                max={180}
                value={durationMinutes}
                onChange={(e) =>
                  setDurationMinutes(Math.max(1, Number(e.target.value) || 1))
                }
                className="w-24 rounded-lg border border-white/10 bg-[#09090B] px-3 py-2 text-sm font-mono text-white tabular-nums focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Optional Transcript Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowTranscriptInput((s) => !s)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white cursor-pointer"
            >
              {showTranscriptInput ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              {showTranscriptInput
                ? 'Hide raw transcript input'
                : 'Paste transcript or notes for exact quote matching (optional)'}
            </button>

            {showTranscriptInput && (
              <textarea
                rows={4}
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
                placeholder="Paste timestamped transcript or raw video script here..."
                className="mt-3 w-full rounded-xl border border-white/10 bg-[#09090B] p-3.5 text-sm text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none"
              />
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-white/[0.06] pt-4">
            <p className="text-xs text-zinc-500">
              Calls <span className="font-mono text-zinc-300">/api/analyze-video</span>{' '}
              via Gemini and ranks {clipCount} clips by Virality Score.
            </p>
            <button
              type="submit"
              disabled={analyzing}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-400 px-6 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-300 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {analyzing && <Loader2 className="h-4 w-4 animate-spin" />}
              {analyzing
                ? `Analyzing & Scoring ${clipCount} Clips...`
                : `Generate ${clipCount} Clips`}
            </button>
          </div>
        </form>

        {/* Past Jobs Selector */}
        {pastJobs.length > 0 && (
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 whitespace-nowrap shrink-0">
              <History className="h-3.5 w-3.5" />
              Recent Sessions:
            </span>
            {pastJobs.slice(0, 5).map((job) => (
              <button
                key={job.id}
                type="button"
                onClick={() => loadJobIntoEditor(job)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeJobLabel === job.source_label
                    ? 'border-cyan-400/60 bg-cyan-400/10 text-cyan-300'
                    : 'border-white/10 bg-[#111114] text-zinc-300 hover:border-white/25'
                }`}
              >
                {job.source_label.slice(0, 34)} ({job.clips.length})
              </button>
            ))}
          </div>
        )}

        {/* Export Feedback Banner */}
        {exportNotice && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
            {exportNotice}
          </div>
        )}

        {/* Loading Skeleton Grid */}
        {analyzing && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-white/[0.08] bg-[#111114] p-4 animate-pulse space-y-4"
              >
                <div className="aspect-[9/16] w-full rounded-xl bg-zinc-900" />
                <div className="h-4 w-3/4 rounded bg-zinc-800" />
                <div className="h-10 w-full rounded bg-zinc-900" />
              </div>
            ))}
          </div>
        )}

        {/* Results & Clip Editor View */}
        {!analyzing && clips.length > 0 && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
              <div>
                <h2 className="font-display text-xl font-bold text-white">
                  Generated Clips ({filteredClips.length})
                </h2>
                {activeJobLabel && (
                  <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-xl">
                    Source: {activeJobLabel} · Sorted by Virality Score
                  </p>
                )}
              </div>

              {/* Filter & Global Caption Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 rounded-lg bg-[#111114] p-1 border border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setViralityFilter('all')}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      viralityFilter === 'all'
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    All Clips ({clips.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setViralityFilter('high')}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      viralityFilter === 'high'
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    85+ Virality
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClips.map((clip) => {
                const clipCapStyle = clip.caption_style || captionStyle;
                const captionsOn = clip.captions_enabled ?? true;
                const clipDuration = getClipDurationSeconds(
                  clip.start_time,
                  clip.end_time
                );
                const isRenderingThis = renderingClipId === clip.id;

                return (
                  <article
                    key={clip.id}
                    className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#111114] p-4 space-y-4"
                  >
                    {/* 9:16 Vertical Preview with inline editable Hook */}
                    <VerticalClipPlayer
                      clip={clip}
                      captionStyle={clipCapStyle}
                      captionsEnabled={captionsOn}
                      uploadedVideoUrl={uploadedVideoUrl}
                      showWatermark={isFreeTier}
                      editableHook={true}
                      onHookChange={(val) =>
                        updateClipField(clip.id, { hook_text: val })
                      }
                    />

                    {/* Metadata Header */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 text-xs font-mono tabular-nums">
                        <span className="text-zinc-400">
                          Duration {clipDuration}s
                        </span>
                        <span className="font-semibold text-cyan-400">
                          Virality {clip.virality_score}/100
                        </span>
                      </div>

                      <h3 className="font-display text-base font-semibold text-white leading-snug">
                        {clip.clip_title}
                      </h3>

                      {/* Caption Toggle & Style Selector */}
                      <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                        <button
                          type="button"
                          onClick={() =>
                            updateClipField(clip.id, {
                              captions_enabled: !captionsOn,
                            })
                          }
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                            captionsOn
                              ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300'
                              : 'border-white/10 bg-[#09090B] text-zinc-400'
                          }`}
                        >
                          <Captions className="h-3.5 w-3.5" />
                          {captionsOn ? 'Captions On' : 'Captions Off'}
                        </button>

                        <select
                          value={clipCapStyle}
                          aria-label={`Caption style for ${clip.clip_title}`}
                          onChange={(e) =>
                            updateClipField(clip.id, {
                              caption_style: e.target.value as CaptionStyle,
                            })
                          }
                          className="rounded-lg border border-white/10 bg-[#09090B] px-2.5 py-1.5 text-xs text-zinc-200 focus:border-cyan-400 focus:outline-none"
                        >
                          <option value="Hormozi Bold Yellow">
                            Hormozi Yellow
                          </option>
                          <option value="Minimalist White">
                            Minimalist White
                          </option>
                          <option value="Neon Pop">Neon Pop</option>
                        </select>
                      </div>

                      {/* Trim Timestamps Adjuster */}
                      <div className="rounded-xl border border-white/[0.06] bg-[#09090B] p-3 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400">
                          <span className="inline-flex items-center gap-1.5">
                            <Scissors className="h-3.5 w-3.5 text-zinc-400" />
                            Trim Timestamps
                          </span>
                          <span className="font-mono tabular-nums text-zinc-500">
                            MM:SS
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              aria-label="Decrease start time by 5 seconds"
                              onClick={() =>
                                updateClipField(clip.id, {
                                  start_time: adjustTimestamp(
                                    clip.start_time,
                                    -5
                                  ),
                                })
                              }
                              className="rounded border border-white/10 p-1.5 text-zinc-400 hover:text-white cursor-pointer"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <input
                              type="text"
                              value={clip.start_time}
                              aria-label="Start timestamp"
                              onChange={(e) =>
                                updateClipField(clip.id, {
                                  start_time: e.target.value,
                                })
                              }
                              className="w-full rounded border border-white/10 bg-[#111114] px-2 py-1 text-center font-mono text-xs text-white tabular-nums focus:border-cyan-400 focus:outline-none"
                            />
                            <button
                              type="button"
                              aria-label="Increase start time by 5 seconds"
                              onClick={() =>
                                updateClipField(clip.id, {
                                  start_time: adjustTimestamp(
                                    clip.start_time,
                                    5
                                  ),
                                })
                              }
                              className="rounded border border-white/10 p-1.5 text-zinc-400 hover:text-white cursor-pointer"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              aria-label="Decrease end time by 5 seconds"
                              onClick={() =>
                                updateClipField(clip.id, {
                                  end_time: adjustTimestamp(clip.end_time, -5),
                                })
                              }
                              className="rounded border border-white/10 p-1.5 text-zinc-400 hover:text-white cursor-pointer"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <input
                              type="text"
                              value={clip.end_time}
                              aria-label="End timestamp"
                              onChange={(e) =>
                                updateClipField(clip.id, {
                                  end_time: e.target.value,
                                })
                              }
                              className="w-full rounded border border-white/10 bg-[#111114] px-2 py-1 text-center font-mono text-xs text-white tabular-nums focus:border-cyan-400 focus:outline-none"
                            />
                            <button
                              type="button"
                              aria-label="Increase end time by 5 seconds"
                              onClick={() =>
                                updateClipField(clip.id, {
                                  end_time: adjustTimestamp(clip.end_time, 5),
                                })
                              }
                              className="rounded border border-white/10 p-1.5 text-zinc-400 hover:text-white cursor-pointer"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Transcript Snippet */}
                      <div className="rounded-xl border border-white/[0.06] bg-[#09090B]/60 p-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[11px] font-medium text-zinc-500">
                            Transcript Snippet
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopySnippet(clip)}
                            className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white cursor-pointer"
                          >
                            {copiedId === clip.id ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-400" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed line-clamp-3">
                          “{clip.transcript_snippet}”
                        </p>
                      </div>
                    </div>

                    {/* Download Actions */}
                    <div className="space-y-2 pt-1">
                      <button
                        type="button"
                        disabled={renderingClipId !== null}
                        onClick={() => handleDownloadClip(clip, false)}
                        className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                          isFreeTier
                            ? 'border border-cyan-400/40 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20'
                            : 'bg-cyan-400 text-zinc-950 hover:bg-cyan-300'
                        }`}
                      >
                        {isRenderingThis ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Rendering 9:16 Clip ({renderProgress}%)
                          </>
                        ) : isFreeTier ? (
                          <>
                            <Lock className="h-3.5 w-3.5" />
                            Download HD Clip (Upgrade to Remove Watermark)
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            Download HD Clip
                          </>
                        )}
                      </button>

                      {isFreeTier && (
                        <button
                          type="button"
                          disabled={renderingClipId !== null}
                          onClick={() => handleDownloadClip(clip, true)}
                          className="w-full rounded-lg border border-white/10 bg-[#09090B] px-3 py-1.5 text-[11px] font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Export Free Watermarked Preview
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Empty State before first run */}
        {!analyzing && clips.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#111114]/50 p-12 text-center">
            <h2 className="font-display text-lg font-semibold text-white">
              Ready to slice your first long-form video
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-zinc-400">
              Paste a YouTube link or drop an MP4/MOV recording above, pick 10,
              15, or 20 clips, and Gemini will return ranked clips with editable
              5-word hooks and animated captions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
