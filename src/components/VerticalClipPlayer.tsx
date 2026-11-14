import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Film } from 'lucide-react';
import { CaptionStyle, GeneratedClip } from '../types';
import { parseTimestampToSeconds } from '../utils/clipExport';

interface VerticalClipPlayerProps {
  clip: GeneratedClip;
  captionStyle: CaptionStyle;
  captionsEnabled: boolean;
  uploadedVideoUrl?: string | null;
  showWatermark?: boolean;
  editableHook?: boolean;
  onHookChange?: (newHook: string) => void;
  compact?: boolean;
}

export const VerticalClipPlayer: React.FC<VerticalClipPlayerProps> = ({
  clip,
  captionStyle,
  captionsEnabled,
  uploadedVideoUrl,
  showWatermark = false,
  editableHook = false,
  onHookChange,
  compact = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const words = useMemo(
    () => clip.transcript_snippet.split(/\s+/).filter(Boolean),
    [clip.transcript_snippet]
  );

  const startSec = useMemo(
    () => parseTimestampToSeconds(clip.start_time),
    [clip.start_time]
  );
  const endSec = useMemo(
    () => Math.max(startSec + 5, parseTimestampToSeconds(clip.end_time)),
    [clip.end_time, startSec]
  );
  const durationSec = Math.max(5, endSec - startSec);

  // Sync HTML5 video if uploaded, otherwise animate simulated playback progress
  useEffect(() => {
    if (!isPlaying) return;

    if (uploadedVideoUrl && videoRef.current) {
      const vid = videoRef.current;
      if (vid.currentTime < startSec || vid.currentTime >= endSec) {
        vid.currentTime = startSec;
      }
      vid.play().catch(() => {});
      const interval = window.setInterval(() => {
        if (!videoRef.current) return;
        const cur = videoRef.current.currentTime;
        if (cur >= endSec) {
          videoRef.current.currentTime = startSec;
        }
        const pct = Math.min(
          1,
          Math.max(0, (videoRef.current.currentTime - startSec) / durationSec)
        );
        setProgress(pct);
      }, 120);
      return () => {
        clearInterval(interval);
        vid.pause();
      };
    }

    const stepMs = 120;
    const interval = window.setInterval(() => {
      setProgress((prev) => {
        const next = prev + stepMs / (Math.min(durationSec, 14) * 1000);
        return next >= 1 ? 0 : next;
      });
    }, stepMs);

    return () => clearInterval(interval);
  }, [isPlaying, uploadedVideoUrl, startSec, endSec, durationSec]);

  const activeWordIndex = Math.min(
    words.length - 1,
    Math.floor(progress * Math.max(1, words.length))
  );
  const windowStart = Math.max(0, activeWordIndex - (activeWordIndex % 4));
  const visibleWords = words.slice(windowStart, windowStart + 4);

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const fallbackImage =
    clip.preview_image ||
    '/src/assets/images/clip_podcast_studio_1794677649926.jpg';

  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl border border-white/10 bg-[#111114] select-none group">
      {/* Media Layer */}
      {uploadedVideoUrl ? (
        <video
          ref={videoRef}
          src={uploadedVideoUrl}
          muted={isMuted}
          playsInline
          className="h-full w-full object-cover"
        />
      ) : !imgFailed ? (
        <img
          src={fallbackImage}
          alt={clip.clip_title}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          style={{
            transform: isPlaying
              ? `scale(${1.02 + progress * 0.06})`
              : 'scale(1.0)',
          }}
          className="h-full w-full object-cover transition-transform duration-300 ease-out"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-cyan-950/30 p-6 text-center">
          <Film className="mb-3 h-8 w-8 text-cyan-400/70" />
          <p className="text-xs font-medium text-zinc-400">{clip.clip_title}</p>
        </div>
      )}

      {/* Measured contrast scrims */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/75 via-transparent to-black/85" />

      {/* Top Editable Hook Overlay */}
      <div className="absolute inset-x-3 top-3 z-20">
        {editableHook && onHookChange ? (
          <input
            type="text"
            value={clip.hook_text}
            onChange={(e) => onHookChange(e.target.value)}
            aria-label="Edit 5-word hook header"
            maxLength={54}
            className="w-full rounded-md bg-cyan-400 px-2.5 py-1.5 text-center font-display text-xs font-extrabold uppercase tracking-tight text-zinc-950 shadow-sm focus:outline-none focus:ring-2 focus:ring-white"
          />
        ) : (
          <div className="mx-auto max-w-[92%] rounded-md bg-cyan-400 px-2.5 py-1 text-center font-display text-[11px] font-extrabold uppercase tracking-tight text-zinc-950 shadow-sm">
            {clip.hook_text}
          </div>
        )}
      </div>

      {/* Center Play / Pause Hit Target */}
      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause clip preview' : 'Play clip preview'}
        className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer focus-visible:outline-none"
      >
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-full bg-zinc-950/75 border border-white/20 text-white backdrop-blur-sm transition-opacity duration-150 ${
            isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
          }`}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5 fill-current" />
          ) : (
            <Play className="h-5 w-5 translate-x-0.5 fill-current" />
          )}
        </span>
      </button>

      {/* Animated Captions Overlay */}
      {captionsEnabled && visibleWords.length > 0 && (
        <div
          className={`pointer-events-none absolute inset-x-3 ${
            compact ? 'bottom-10' : 'bottom-12'
          } z-20 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center`}
        >
          {visibleWords.map((word, idx) => {
            const isActive = windowStart + idx === activeWordIndex;
            if (captionStyle === 'Hormozi Bold Yellow') {
              return (
                <span
                  key={`${word}-${idx}`}
                  className={`font-display text-sm sm:text-base font-extrabold uppercase tracking-tight transition-transform duration-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] ${
                    isActive
                      ? 'scale-110 text-yellow-400'
                      : 'text-white'
                  }`}
                >
                  {word}
                </span>
              );
            }
            if (captionStyle === 'Neon Pop') {
              return (
                <span
                  key={`${word}-${idx}`}
                  className={`font-display text-sm sm:text-base font-extrabold uppercase tracking-tight transition-transform duration-100 px-1 rounded ${
                    isActive
                      ? 'scale-110 bg-cyan-400 text-zinc-950'
                      : 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]'
                  }`}
                >
                  {word}
                </span>
              );
            }
            return (
              <span
                key={`${word}-${idx}`}
                className={`text-xs sm:text-sm font-semibold px-1.5 py-0.5 rounded bg-black/65 transition-colors ${
                  isActive ? 'text-white' : 'text-zinc-300'
                }`}
              >
                {word}
              </span>
            );
          })}
        </div>
      )}

      {/* Bottom Controls & Scrubber */}
      <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-2.5 pt-2">
        {showWatermark && (
          <div className="mb-1.5 text-right font-mono text-[10px] tracking-wide text-white/60">
            CLIPFORGE WATERMARK
          </div>
        )}
        <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-zinc-300 tabular-nums">
          <span>
            {clip.start_time} – {clip.end_time}
          </span>
          {uploadedVideoUrl && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMuted((m) => !m);
              }}
              aria-label={isMuted ? 'Unmute preview' : 'Mute preview'}
              className="rounded p-1 hover:bg-white/10 text-zinc-200 cursor-pointer"
            >
              {isMuted ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full bg-cyan-400 transition-all duration-100"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
