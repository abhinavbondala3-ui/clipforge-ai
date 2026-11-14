import { CaptionStyle, GeneratedClip } from '../types';

export function parseTimestampToSeconds(ts: string): number {
  const parts = ts.trim().split(':').map((n) => Number(n));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return Number(ts) || 0;
}

export function formatSecondsToTimestamp(totalSeconds: number): string {
  const clamped = Math.max(0, Math.round(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function adjustTimestamp(ts: string, deltaSeconds: number): string {
  return formatSecondsToTimestamp(parseTimestampToSeconds(ts) + deltaSeconds);
}

export function getClipDurationSeconds(start: string, end: string): number {
  return Math.max(1, parseTimestampToSeconds(end) - parseTimestampToSeconds(start));
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function renderBrowserVerticalClip(options: {
  clip: GeneratedClip;
  captionStyle: CaptionStyle;
  captionsEnabled: boolean;
  watermark: boolean;
  uploadedVideoUrl?: string | null;
  onProgress?: (pct: number) => void;
}): Promise<Blob> {
  const { clip, captionStyle, captionsEnabled, watermark, onProgress } = options;
  const width = 540;
  const height = 960;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');

  const img = new Image();
  img.crossOrigin = 'anonymous';
  const imageSrc =
    clip.preview_image ||
    '/src/assets/images/clip_podcast_studio_1794677649926.jpg';

  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = imageSrc;
  });

  const stream = canvas.captureStream(30);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 2_400_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const words = clip.transcript_snippet.split(/\s+/).filter(Boolean);
  const renderDurationMs = 4200; // Fast 4.2s 9:16 animated render preview
  const startTime = performance.now();

  recorder.start(100);

  await new Promise<void>((resolve) => {
    const drawFrame = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / renderDurationMs);
      onProgress?.(Math.round(progress * 100));

      // Background subtle zoom frame
      ctx.fillStyle = '#09090B';
      ctx.fillRect(0, 0, width, height);

      if (img.complete && img.naturalWidth > 0) {
        const scale = 1.0 + progress * 0.06;
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const canvasAspect = width / height;
        let drawW = width * scale;
        let drawH = height * scale;
        if (imgAspect > canvasAspect) {
          drawW = drawH * imgAspect;
        } else {
          drawH = drawW / imgAspect;
        }
        const dx = (width - drawW) / 2;
        const dy = (height - drawH) / 2;
        ctx.drawImage(img, dx, dy, drawW, drawH);
      }

      // Scrim overlays
      const topGrad = ctx.createLinearGradient(0, 0, 0, 260);
      topGrad.addColorStop(0, 'rgba(0,0,0,0.85)');
      topGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, width, 260);

      const botGrad = ctx.createLinearGradient(0, height - 340, 0, height);
      botGrad.addColorStop(0, 'rgba(0,0,0,0)');
      botGrad.addColorStop(1, 'rgba(0,0,0,0.88)');
      ctx.fillStyle = botGrad;
      ctx.fillRect(0, height - 340, width, 340);

      // Hook header box
      ctx.font = '700 28px Outfit, sans-serif';
      ctx.textAlign = 'center';
      const hookLines = wrapLines(ctx, clip.hook_text.toUpperCase(), width - 72);
      const hookStartY = 92;
      hookLines.forEach((line, idx) => {
        const y = hookStartY + idx * 38;
        ctx.fillStyle = 'rgba(34, 211, 238, 0.95)';
        const metrics = ctx.measureText(line);
        const padX = 16;
        ctx.fillRect(
          width / 2 - metrics.width / 2 - padX,
          y - 26,
          metrics.width + padX * 2,
          34
        );
        ctx.fillStyle = '#09090B';
        ctx.fillText(line, width / 2, y);
      });

      // Animated captions
      if (captionsEnabled && words.length > 0) {
        const activeWordIdx = Math.floor(progress * words.length);
        const windowStart = Math.max(0, activeWordIdx - (activeWordIdx % 4));
        const chunkWords = words.slice(windowStart, windowStart + 4);
        const captionY = height - 180;

        ctx.font =
          captionStyle === 'Minimalist White'
            ? '600 24px "Plus Jakarta Sans", sans-serif'
            : '800 30px Outfit, sans-serif';

        const joined = chunkWords.join(' ');
        const totalW = ctx.measureText(joined).width;
        let cursorX = width / 2 - totalW / 2;

        ctx.textAlign = 'left';
        chunkWords.forEach((word, idx) => {
          const isCurrent = windowStart + idx === activeWordIdx;
          const displayWord =
            captionStyle === 'Minimalist White' ? word : word.toUpperCase();
          const wWidth = ctx.measureText(displayWord + ' ').width;

          ctx.lineWidth = 6;
          ctx.strokeStyle = 'rgba(0,0,0,0.9)';
          ctx.strokeText(displayWord, cursorX, captionY);

          if (captionStyle === 'Hormozi Bold Yellow') {
            ctx.fillStyle = isCurrent ? '#FACC15' : '#FFFFFF';
          } else if (captionStyle === 'Neon Pop') {
            ctx.fillStyle = isCurrent ? '#22D3EE' : '#F8FAFC';
          } else {
            ctx.fillStyle = isCurrent ? '#FFFFFF' : '#CBD5E1';
          }

          ctx.fillText(displayWord, cursorX, captionY);
          cursorX += wWidth;
        });
      }

      // Watermark on Free Trial
      if (watermark) {
        ctx.textAlign = 'right';
        ctx.font = '600 14px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.fillText('CLIPFORGE AI · FREE PREVIEW', width - 24, height - 28);
      }

      if (progress < 1) {
        requestAnimationFrame(drawFrame);
      } else {
        recorder.stop();
        resolve();
      }
    };

    requestAnimationFrame(drawFrame);
  });

  await new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  return new Blob(chunks, { type: mimeType });
}
