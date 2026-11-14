export type PlanTier = 'free' | 'creator' | 'pro';

export type CaptionStyle =
  | 'Hormozi Bold Yellow'
  | 'Minimalist White'
  | 'Neon Pop';

export type ClipCountOption = 10 | 15 | 20;

export interface GeneratedClip {
  id: string;
  clip_title: string;
  hook_text: string;
  start_time: string;
  end_time: string;
  virality_score: number;
  transcript_snippet: string;
  preview_image?: string;
  caption_style?: CaptionStyle;
  captions_enabled?: boolean;
}

export interface VideoAnalysisJob {
  id: string;
  source_type: 'youtube' | 'upload';
  source_label: string;
  youtube_url?: string;
  duration_minutes: number;
  clip_count: ClipCountOption;
  caption_style: CaptionStyle;
  created_at: string;
  clips: GeneratedClip[];
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  plan: PlanTier;
  credits_minutes: number;
  auth_provider: 'supabase' | 'local';
  created_at: string;
}

export interface AdminIntegrationsConfig {
  workerWebhookUrl: string;
  workerWebhookSecret: string;
  paymentProvider: 'razorpay' | 'lemonsqueezy';
  razorpayKeyId: string;
  razorpayKeySecret: string;
  lemonSqueezyApiKey: string;
  lemonSqueezyStoreId: string;
  lemonSqueezyWebhookSecret: string;
  supabaseUrl: string;
  supabaseAnonKeyConfigured: boolean;
}
