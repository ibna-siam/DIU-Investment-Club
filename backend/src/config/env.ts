import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000').transform((v) => parseInt(v, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:3000'),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().default('diu_investment_club_super_secure_secret_token_2026_key'),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default('DIU Investment Club <noreply@investmentclub.top>'),
  RESEND_TEST_RECIPIENT: z.string().optional().default('siamibna75@gmail.com'),
  ADMIN_EMAIL: z.string().optional().default('admin@diu.edu.bd'),
  EMAIL_PROVIDER: z.string().optional().default('resend').transform((v) => (v || 'resend').trim().toLowerCase()),
  EMAIL_MODE: z.enum(['LIVE', 'TEST']).default('LIVE'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
