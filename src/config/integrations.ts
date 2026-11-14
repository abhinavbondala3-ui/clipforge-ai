/**
 * ClipForge AI — Backend Worker & Payment Gateway Configuration
 *
 * Plug in your external Python FFmpeg worker webhook URL and Razorpay / Lemon Squeezy
 * credentials here or via environment variables (.env) and the Admin Settings panel.
 */

export interface ClipForgeIntegrationsConfig {
  ffmpegWorker: {
    webhookUrl: string;
    webhookSecret: string;
    outputResolution: '1080x1920' | '2160x3840';
    defaultPreset: 'fast' | 'medium' | 'slow';
  };
  payments: {
    activeProvider: 'razorpay' | 'lemonsqueezy';
    currency: 'INR' | 'USD';
    razorpay: {
      keyId: string;
      creatorPlanId: string;
      proPlanId: string;
    };
    lemonSqueezy: {
      storeId: string;
      creatorVariantId: string;
      proVariantId: string;
    };
  };
  plans: {
    free: {
      name: string;
      priceInr: number;
      monthlyMinutes: number;
      maxVideoMinutes: number;
      watermark: boolean;
      resolution: string;
    };
    creator: {
      name: string;
      priceInr: number;
      monthlyMinutes: number;
      maxVideoMinutes: number;
      watermark: boolean;
      resolution: string;
    };
    pro: {
      name: string;
      priceInr: number;
      monthlyMinutes: number;
      maxVideoMinutes: number;
      watermark: boolean;
      resolution: string;
    };
  };
}

export const DEFAULT_INTEGRATIONS_CONFIG: ClipForgeIntegrationsConfig = {
  ffmpegWorker: {
    webhookUrl: '', // e.g. https://ffmpeg-worker.yourdomain.com/api/render
    webhookSecret: '',
    outputResolution: '1080x1920',
    defaultPreset: 'fast',
  },
  payments: {
    activeProvider: 'razorpay',
    currency: 'INR',
    razorpay: {
      keyId: '', // e.g. rzp_live_xxxxxxxxxxxxxx
      creatorPlanId: 'plan_creator_799',
      proPlanId: 'plan_pro_1999',
    },
    lemonSqueezy: {
      storeId: '',
      creatorVariantId: '',
      proVariantId: '',
    },
  },
  plans: {
    free: {
      name: 'Free Trial',
      priceInr: 0,
      monthlyMinutes: 15,
      maxVideoMinutes: 15,
      watermark: true,
      resolution: '720p Watermarked',
    },
    creator: {
      name: 'Creator Plan',
      priceInr: 799,
      monthlyMinutes: 1800, // 30 hours
      maxVideoMinutes: 180,
      watermark: false,
      resolution: '1080p HD Clean',
    },
    pro: {
      name: 'Pro Plan',
      priceInr: 1999,
      monthlyMinutes: 999999, // Unlimited
      maxVideoMinutes: 360,
      watermark: false,
      resolution: '4K Priority Render',
    },
  },
};

export const PYTHON_FFMPEG_WORKER_SNIPPET = `# Example Python FastAPI + FFmpeg Worker Receiver (deploy on Railway, Fly.io, or GPU VM)
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
import subprocess, uuid

app = FastAPI()

class RenderJob(BaseModel):
    clip_id: str
    source_url: str
    start_time: str
    end_time: str
    hook_text: str
    caption_style: str
    watermark: bool

@app.post("/api/render")
async def render_vertical_clip(job: RenderJob, x_worker_secret: str = Header(default="")):
    output_file = f"/tmp/{job.clip_id}_{uuid.uuid4().hex[:6]}.mp4"
    # Crop 16:9 -> 9:16 (1080x1920), burn hook text & animated ASS subtitles
    vf_filter = "crop=ih*9/16:ih,scale=1080:1920"
    cmd = [
        "ffmpeg", "-y", "-ss", job.start_time, "-to", job.end_time,
        "-i", job.source_url, "-vf", vf_filter, "-c:v", "libx264",
        "-preset", "fast", "-c:a", "aac", output_file
    ]
    subprocess.run(cmd, check=True)
    return {"status": "completed", "download_url": f"https://cdn.yourdomain.com/{output_file}"}
`;
