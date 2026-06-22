import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  ZOOM_ACCOUNT_ID: z.string().min(1, 'ZOOM_ACCOUNT_ID is required'),
  ZOOM_CLIENT_ID: z.string().min(1, 'ZOOM_CLIENT_ID is required'),
  ZOOM_CLIENT_SECRET: z.string().min(1, 'ZOOM_CLIENT_SECRET is required'),
  CLIENT_URL: z.string().default('http://localhost:3000'),
  // Demo mode — set to "true" in Doppler demo config to show demo credentials on login
  DEMO_MODE: z.coerce.boolean().optional(),
  // Per-teacher Zoom OAuth — optional; feature hidden if not set
  ZOOM_OAUTH_CLIENT_ID:     z.string().optional(),
  ZOOM_OAUTH_CLIENT_SECRET: z.string().optional(),
  ZOOM_REDIRECT_URI:        z.string().optional(),
  // AI assistant — optional; feature disabled if not set
  DEEPSEEK_API_KEY: z.string().optional(),
  // Stripe payments — optional; feature disabled if not set
  STRIPE_SECRET_KEY:     z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  // Cloudflare R2 — optional; recording upload disabled if not set
  R2_ENDPOINT:          z.string().optional(), // e.g. https://<account-id>.r2.cloudflarestorage.com
  R2_REGION:            z.string().optional().default('auto'),
  R2_ACCESS_KEY_ID:     z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME:       z.string().optional(),
  // Google Calendar / Meet OAuth — optional; feature disabled if not set
  GOOGLE_CLIENT_ID:     z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI:  z.string().optional(),
  // Daily.co — optional; feature disabled if not set
  DAILY_API_KEY: z.string().optional(),
  // Email / SMTP — optional; if not set, emails are logged to console only
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
