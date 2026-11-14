import 'dotenv/config';
import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenAI, Type } from '@google/genai';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

interface StoredUser {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  plan: 'free' | 'creator' | 'pro';
  credits_minutes: number;
  auth_provider: 'supabase' | 'local';
  created_at: string;
}

interface StoredClip {
  id: string;
  clip_title: string;
  hook_text: string;
  start_time: string;
  end_time: string;
  virality_score: number;
  transcript_snippet: string;
}

interface StoredJob {
  id: string;
  user_id: string;
  source_type: 'youtube' | 'upload';
  source_label: string;
  youtube_url?: string;
  duration_minutes: number;
  clip_count: 10 | 15 | 20;
  caption_style: string;
  created_at: string;
  clips: StoredClip[];
}

interface StoredAdminConfig {
  workerWebhookUrl: string;
  workerWebhookSecret: string;
  paymentProvider: 'razorpay' | 'lemonsqueezy';
  razorpayKeyId: string;
  razorpayKeySecret: string;
  lemonSqueezyApiKey: string;
  lemonSqueezyStoreId: string;
  lemonSqueezyWebhookSecret: string;
}

interface StoreData {
  users: StoredUser[];
  jobs: StoredJob[];
  adminConfig: StoredAdminConfig;
}

function ensureStore(): StoreData {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    const initial: StoreData = {
      users: [],
      jobs: [],
      adminConfig: {
        workerWebhookUrl: process.env.WORKER_WEBHOOK_URL || '',
        workerWebhookSecret: process.env.WORKER_WEBHOOK_SECRET || '',
        paymentProvider: 'razorpay',
        razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
        razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
        lemonSqueezyApiKey: process.env.LEMON_SQUEEZY_API_KEY || '',
        lemonSqueezyStoreId: process.env.LEMON_SQUEEZY_STORE_ID || '',
        lemonSqueezyWebhookSecret: process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || '',
      },
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(raw) as StoreData;
  } catch {
    const fallback: StoreData = {
      users: [],
      jobs: [],
      adminConfig: {
        workerWebhookUrl: process.env.WORKER_WEBHOOK_URL || '',
        workerWebhookSecret: process.env.WORKER_WEBHOOK_SECRET || '',
        paymentProvider: 'razorpay',
        razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
        razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
        lemonSqueezyApiKey: process.env.LEMON_SQUEEZY_API_KEY || '',
        lemonSqueezyStoreId: process.env.LEMON_SQUEEZY_STORE_ID || '',
        lemonSqueezyWebhookSecret: process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || '',
      },
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
}

function saveStore(data: StoreData) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function sanitizeUser(user: StoredUser) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    plan: user.plan,
    credits_minutes: user.credits_minutes,
    auth_provider: user.auth_provider,
    created_at: user.created_at,
  };
}

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function fetchYouTubeMetadata(youtubeUrl: string): Promise<{ title?: string; author?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!res.ok) return {};
    const data = (await res.json()) as { title?: string; author_name?: string };
    return { title: data.title, author: data.author_name };
  } catch {
    return {};
  }
}

function maskSecret(val: string): string {
  if (!val) return '';
  if (val.length <= 6) return '••••••';
  return `${val.slice(0, 4)}••••${val.slice(-2)}`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Health endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'clipforge-ai' });
  });

  // Auth: Signup (automatically grants 15 free minutes of video credits)
  app.post('/api/auth/signup', (req: Request, res: Response) => {
    const { email, password, full_name } = req.body as {
      email?: string;
      password?: string;
      full_name?: string;
    };
    if (!email || !email.includes('@') || !password || password.length < 4) {
      res.status(400).json({ error: 'Valid email and password (min 4 characters) are required.' });
      return;
    }

    const store = ensureStore();
    const normalizedEmail = email.trim().toLowerCase();
    const existing = store.users.find((u) => u.email === normalizedEmail);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
      return;
    }

    const newUser: StoredUser = {
      id: `usr_${crypto.randomBytes(8).toString('hex')}`,
      email: normalizedEmail,
      full_name: (full_name || normalizedEmail.split('@')[0]).trim(),
      password_hash: hashPassword(password),
      plan: 'free',
      credits_minutes: 15,
      auth_provider: 'local',
      created_at: new Date().toISOString(),
    };

    store.users.push(newUser);
    saveStore(store);

    res.status(201).json({ user: sanitizeUser(newUser) });
  });

  // Auth: Login
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const store = ensureStore();
    const normalizedEmail = email.trim().toLowerCase();
    const user = store.users.find((u) => u.email === normalizedEmail);

    if (!user || user.password_hash !== hashPassword(password)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    res.json({ user: sanitizeUser(user) });
  });

  // Auth: Sync Supabase Session User (auto-provisions 15 free mins on first sign-in)
  app.post('/api/auth/sync-supabase', (req: Request, res: Response) => {
    const { id, email, full_name } = req.body as {
      id?: string;
      email?: string;
      full_name?: string;
    };
    if (!id || !email) {
      res.status(400).json({ error: 'Missing Supabase user id or email.' });
      return;
    }

    const store = ensureStore();
    const normalizedEmail = email.trim().toLowerCase();
    let user = store.users.find((u) => u.id === id || u.email === normalizedEmail);

    if (!user) {
      user = {
        id,
        email: normalizedEmail,
        full_name: full_name || normalizedEmail.split('@')[0],
        password_hash: '',
        plan: 'free',
        credits_minutes: 15,
        auth_provider: 'supabase',
        created_at: new Date().toISOString(),
      };
      store.users.push(user);
      saveStore(store);
    }

    res.json({ user: sanitizeUser(user) });
  });

  // Fetch user wallet + past jobs
  app.get('/api/users/:userId', (req: Request, res: Response) => {
    const store = ensureStore();
    const user = store.users.find((u) => u.id === req.params.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    const jobs = store.jobs
      .filter((j) => j.user_id === user.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    res.json({ user: sanitizeUser(user), jobs });
  });

  // Analyze video via Gemini API (/api/analyze-video)
  app.post('/api/analyze-video', async (req: Request, res: Response) => {
    try {
      const {
        youtubeUrl,
        fileName,
        durationMinutes = 12,
        transcript,
        clipCount = 10,
        captionStyle = 'Hormozi Bold Yellow',
        userId,
      } = req.body as {
        youtubeUrl?: string;
        fileName?: string;
        durationMinutes?: number;
        transcript?: string;
        clipCount?: 10 | 15 | 20;
        captionStyle?: string;
        userId?: string;
      };

      const requestedCount = [10, 15, 20].includes(Number(clipCount))
        ? (Number(clipCount) as 10 | 15 | 20)
        : 10;

      if (!youtubeUrl && !fileName && !transcript) {
        res.status(400).json({ error: 'Provide a YouTube URL, video file, or transcript.' });
        return;
      }

      const store = ensureStore();
      let activeUser: StoredUser | undefined;
      if (userId) {
        activeUser = store.users.find((u) => u.id === userId);
      }

      const billableMinutes = Math.max(1, Math.min(Number(durationMinutes) || 10, 180));

      if (activeUser && activeUser.plan !== 'pro') {
        if (activeUser.credits_minutes <= 0) {
          res.status(402).json({
            error: 'Insufficient video credits. Upgrade your plan or purchase a credit pack to continue.',
            code: 'INSUFFICIENT_CREDITS',
          });
          return;
        }
        if (activeUser.plan === 'free' && billableMinutes > 15 && activeUser.credits_minutes < billableMinutes) {
          res.status(402).json({
            error: `Free Trial supports up to 15 minutes (${activeUser.credits_minutes.toFixed(1)} min remaining). Upgrade to Creator or Pro for longer videos.`,
            code: 'INSUFFICIENT_CREDITS',
          });
          return;
        }
      }

      const ai = getAiClient();
      if (!ai) {
        res.status(500).json({
          error: 'Server Gemini configuration missing. Please verify GEMINI_API_KEY in Settings > Secrets.',
        });
        return;
      }

      let ytMeta: { title?: string; author?: string } = {};
      if (youtubeUrl) {
        ytMeta = await fetchYouTubeMetadata(youtubeUrl);
      }

      const sourceLabel = ytMeta.title
        ? `${ytMeta.title}${ytMeta.author ? ` (${ytMeta.author})` : ''}`
        : fileName || youtubeUrl || 'Uploaded Video Session';

      const promptParts = [
        `Analyze this long-form video source and extract exactly ${requestedCount} high-retention vertical short-form clips (9:16).`,
        `Source Title / Label: ${sourceLabel}`,
        youtubeUrl ? `YouTube URL: ${youtubeUrl}` : '',
        `Estimated Video Duration: ${billableMinutes} minutes (timestamps must fall within 00:00 and ${String(billableMinutes).padStart(2, '0')}:00).`,
        `Target Caption Style: ${captionStyle}`,
        transcript
          ? `Transcript / Notes:\n${transcript.slice(0, 18000)}`
          : `No raw transcript was attached. Based on the video title, creator context, and duration, reconstruct realistic, cohesive, high-impact spoken segments and timestamps across the timeline of the video.`,
        `Requirements for every clip:`,
        `1. clip_title: Sharp descriptive title of the moment (6-10 words).`,
        `2. hook_text: Strictly a punchy 5-word attention-grabbing header that stops scrolling.`,
        `3. start_time and end_time: Realistic MM:SS format where each clip is 28 to 58 seconds long.`,
        `4. virality_score: Integer 1-100 ranking retention potential, curiosity gap, and emotional punch.`,
        `5. transcript_snippet: 2-3 vivid spoken sentences (25-45 words) formatted cleanly for animated word-by-word captions.`,
        `Return the JSON array sorted from highest virality_score to lowest.`,
      ]
        .filter(Boolean)
        .join('\n\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: promptParts,
        config: {
          systemInstruction:
            'You are an elite viral short-form video producer and retention editor for YouTube Shorts, Reels, and TikTok. Output strictly valid JSON matching the schema. Keep hook_text strictly around 5 impactful words.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                clip_title: {
                  type: Type.STRING,
                  description: 'Concise descriptive title of the extracted clip.',
                },
                hook_text: {
                  type: Type.STRING,
                  description: 'A punchy 5-word attention-grabbing hook overlay.',
                },
                start_time: {
                  type: Type.STRING,
                  description: 'Start timestamp in MM:SS format.',
                },
                end_time: {
                  type: Type.STRING,
                  description: 'End timestamp in MM:SS format.',
                },
                virality_score: {
                  type: Type.INTEGER,
                  description: 'Virality score between 1 and 100.',
                },
                transcript_snippet: {
                  type: Type.STRING,
                  description: 'Spoken transcript excerpt for animated captions.',
                },
              },
              required: [
                'clip_title',
                'hook_text',
                'start_time',
                'end_time',
                'virality_score',
                'transcript_snippet',
              ],
            },
          },
        },
      });

      const rawText = (response.text ?? '[]').trim();
      let parsedClips: Omit<StoredClip, 'id'>[] = [];
      try {
        parsedClips = JSON.parse(rawText) as Omit<StoredClip, 'id'>[];
      } catch {
        const match = rawText.match(/\[[\s\S]*\]/);
        if (match) {
          parsedClips = JSON.parse(match[0]) as Omit<StoredClip, 'id'>[];
        }
      }

      if (!Array.isArray(parsedClips) || parsedClips.length === 0) {
        res.status(502).json({ error: 'Gemini returned an unexpected clip format. Please retry.' });
        return;
      }

      const normalizedClips: StoredClip[] = parsedClips
        .slice(0, requestedCount)
        .map((c, idx) => ({
          id: `clip_${Date.now()}_${idx}_${crypto.randomBytes(3).toString('hex')}`,
          clip_title: String(c.clip_title || `Clip ${idx + 1}`),
          hook_text: String(c.hook_text || 'Watch this before scrolling past'),
          start_time: String(c.start_time || '00:30'),
          end_time: String(c.end_time || '01:15'),
          virality_score: Math.max(1, Math.min(100, Math.round(Number(c.virality_score) || 80))),
          transcript_snippet: String(c.transcript_snippet || ''),
        }))
        .sort((a, b) => b.virality_score - a.virality_score);

      const job: StoredJob = {
        id: `job_${crypto.randomBytes(6).toString('hex')}`,
        user_id: activeUser?.id || 'guest',
        source_type: youtubeUrl ? 'youtube' : 'upload',
        source_label: sourceLabel,
        youtube_url: youtubeUrl || undefined,
        duration_minutes: billableMinutes,
        clip_count: requestedCount,
        caption_style: captionStyle,
        created_at: new Date().toISOString(),
        clips: normalizedClips,
      };

      if (activeUser) {
        if (activeUser.plan !== 'pro') {
          const deduction = Math.min(activeUser.credits_minutes, Math.max(1, Math.min(billableMinutes, 15)));
          activeUser.credits_minutes = Math.max(0, Number((activeUser.credits_minutes - deduction).toFixed(1)));
        }
        store.jobs.unshift(job);
        store.jobs = store.jobs.slice(0, 50);
        saveStore(store);
      }

      res.json({
        clips: normalizedClips,
        job,
        user: activeUser ? sanitizeUser(activeUser) : null,
      });
    } catch (err: unknown) {
      console.error('Analyze video error:', err);
      const message = err instanceof Error ? err.message : 'Failed to analyze video.';
      res.status(500).json({ error: message });
    }
  });

  // Render / Dispatch HD Clip via external Python FFmpeg Worker Webhook
  app.post('/api/render-clip', async (req: Request, res: Response) => {
    const {
      clipId,
      clipTitle,
      sourceUrl,
      startTime,
      endTime,
      hookText,
      captionStyle,
      userId,
      allowWatermarkedPreview,
    } = req.body as {
      clipId?: string;
      clipTitle?: string;
      sourceUrl?: string;
      startTime?: string;
      endTime?: string;
      hookText?: string;
      captionStyle?: string;
      userId?: string;
      allowWatermarkedPreview?: boolean;
    };

    const store = ensureStore();
    const user = userId ? store.users.find((u) => u.id === userId) : undefined;
    const isFreeTier = !user || user.plan === 'free';

    if (isFreeTier && !allowWatermarkedPreview) {
      res.status(402).json({
        requiresUpgrade: true,
        watermark: true,
        error: 'HD watermark-free export requires Creator (₹799/mo) or Pro (₹1,999/mo).',
      });
      return;
    }

    const workerUrl = store.adminConfig.workerWebhookUrl || process.env.WORKER_WEBHOOK_URL || '';
    if (workerUrl) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const workerRes = await fetch(workerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Worker-Secret': store.adminConfig.workerWebhookSecret || process.env.WORKER_WEBHOOK_SECRET || '',
          },
          body: JSON.stringify({
            clip_id: clipId,
            clip_title: clipTitle,
            source_url: sourceUrl || '',
            start_time: startTime,
            end_time: endTime,
            hook_text: hookText,
            caption_style: captionStyle,
            watermark: isFreeTier,
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (workerRes.ok) {
          const workerData = (await workerRes.json()) as { download_url?: string; job_id?: string };
          res.json({
            mode: 'external_ffmpeg_worker',
            watermark: isFreeTier,
            downloadUrl: workerData.download_url,
            workerJobId: workerData.job_id,
          });
          return;
        }
      } catch (workerErr) {
        console.warn('External FFmpeg worker unreachable, falling back to browser canvas render:', workerErr);
      }
    }

    res.json({
      mode: 'browser_canvas_render',
      watermark: isFreeTier,
      clipId,
    });
  });

  // Billing: Create checkout / apply plan or credit top-up
  app.post('/api/billing/checkout', (req: Request, res: Response) => {
    const { userId, targetPlan, topupMinutes } = req.body as {
      userId?: string;
      targetPlan?: 'creator' | 'pro';
      topupMinutes?: number;
    };

    if (!userId) {
      res.status(401).json({ error: 'Please sign in before upgrading or purchasing credits.' });
      return;
    }

    const store = ensureStore();
    const user = store.users.find((u) => u.id === userId);
    if (!user) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }

    if (targetPlan === 'creator') {
      user.plan = 'creator';
      user.credits_minutes = Math.max(user.credits_minutes, 0) + 1800; // +30 hours
    } else if (targetPlan === 'pro') {
      user.plan = 'pro';
      user.credits_minutes = 999999;
    } else if (topupMinutes && topupMinutes > 0) {
      user.credits_minutes = Number((user.credits_minutes + topupMinutes).toFixed(1));
    } else {
      res.status(400).json({ error: 'Invalid plan or credit top-up package.' });
      return;
    }

    saveStore(store);

    res.json({
      status: 'paid',
      provider: store.adminConfig.paymentProvider,
      transactionId: `txn_${crypto.randomBytes(6).toString('hex')}`,
      user: sanitizeUser(user),
    });
  });

  // Admin & Backend Webhook Config
  app.get('/api/admin/config', (_req: Request, res: Response) => {
    const store = ensureStore();
    const c = store.adminConfig;
    res.json({
      workerWebhookUrl: c.workerWebhookUrl,
      workerWebhookSecret: maskSecret(c.workerWebhookSecret),
      paymentProvider: c.paymentProvider,
      razorpayKeyId: c.razorpayKeyId,
      razorpayKeySecret: maskSecret(c.razorpayKeySecret),
      lemonSqueezyApiKey: maskSecret(c.lemonSqueezyApiKey),
      lemonSqueezyStoreId: c.lemonSqueezyStoreId,
      lemonSqueezyWebhookSecret: maskSecret(c.lemonSqueezyWebhookSecret),
      supabaseUrl: process.env.VITE_SUPABASE_URL || '',
      supabaseAnonKeyConfigured: Boolean(process.env.VITE_SUPABASE_ANON_KEY),
    });
  });

  app.post('/api/admin/config', (req: Request, res: Response) => {
    const body = req.body as Partial<StoredAdminConfig>;
    const store = ensureStore();
    const prev = store.adminConfig;

    store.adminConfig = {
      workerWebhookUrl: body.workerWebhookUrl ?? prev.workerWebhookUrl,
      workerWebhookSecret:
        body.workerWebhookSecret && !body.workerWebhookSecret.includes('••••')
          ? body.workerWebhookSecret
          : prev.workerWebhookSecret,
      paymentProvider: body.paymentProvider === 'lemonsqueezy' ? 'lemonsqueezy' : 'razorpay',
      razorpayKeyId: body.razorpayKeyId ?? prev.razorpayKeyId,
      razorpayKeySecret:
        body.razorpayKeySecret && !body.razorpayKeySecret.includes('••••')
          ? body.razorpayKeySecret
          : prev.razorpayKeySecret,
      lemonSqueezyApiKey:
        body.lemonSqueezyApiKey && !body.lemonSqueezyApiKey.includes('••••')
          ? body.lemonSqueezyApiKey
          : prev.lemonSqueezyApiKey,
      lemonSqueezyStoreId: body.lemonSqueezyStoreId ?? prev.lemonSqueezyStoreId,
      lemonSqueezyWebhookSecret:
        body.lemonSqueezyWebhookSecret && !body.lemonSqueezyWebhookSecret.includes('••••')
          ? body.lemonSqueezyWebhookSecret
          : prev.lemonSqueezyWebhookSecret,
    };

    saveStore(store);
    res.json({ ok: true, message: 'Integration configuration saved.' });
  });

  app.post('/api/admin/test-webhook', async (req: Request, res: Response) => {
    const { url } = req.body as { url?: string };
    const store = ensureStore();
    const targetUrl = (url || store.adminConfig.workerWebhookUrl || '').trim();

    if (!targetUrl) {
      res.status(400).json({ ok: false, error: 'Enter a WORKER_WEBHOOK_URL to test.' });
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const ping = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Worker-Secret': store.adminConfig.workerWebhookSecret || '',
        },
        body: JSON.stringify({ event: 'ping', source: 'clipforge-ai' }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      res.json({
        ok: ping.ok,
        status: ping.status,
        message: ping.ok
          ? `Worker responded with HTTP ${ping.status}.`
          : `Worker reachable, returned HTTP ${ping.status}.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      res.status(502).json({ ok: false, error: `Unable to reach webhook: ${msg}` });
    }
  });

  // Vite dev middleware vs static production build
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClipForge AI running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
