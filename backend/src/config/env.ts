import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const DEV_DEFAULT_JWT_SECRET = 'diu_investment_club_super_secure_secret_token_2026_key';

const envSchema = z
  .object({
    PORT: z.string().default('5000').transform((v) => parseInt(v, 10)),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    CLIENT_URL: z.string().default('http://localhost:3000'),
    SUPABASE_URL: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    SUPABASE_ANON_KEY: z.string().optional(),
    DATABASE_URL: z.string().optional(),
    JWT_SECRET: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    RESEND_FROM_EMAIL: z.string().default('DIU Investment Club <noreply@invesment.top>'),
    RESEND_TEST_RECIPIENT: z.string().optional().default('siamibna75@gmail.com'),
    ADMIN_EMAIL: z.string().optional().default('admin@diu.edu.bd'),
    EMAIL_PROVIDER: z.string().optional().default('resend').transform((v) => (v || 'resend').trim().toLowerCase()),
    EMAIL_MODE: z.enum(['LIVE', 'TEST']).default('LIVE'),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      const secret = data.JWT_SECRET ? data.JWT_SECRET.trim() : '';
      if (!secret || secret === DEV_DEFAULT_JWT_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_SECRET'],
          message:
            'FATAL: JWT_SECRET must be explicitly set in production environment variables with a strong unique secret. Default development secret is strictly forbidden.',
        });
      } else if (secret.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_SECRET'],
          message: 'FATAL: JWT_SECRET in production must be at least 32 characters long.',
        });
      }
    }
  })
  .transform((data) => ({
    ...data,
    JWT_SECRET:
      data.JWT_SECRET && data.JWT_SECRET.trim() !== ''
        ? data.JWT_SECRET.trim()
        : DEV_DEFAULT_JWT_SECRET,
  }));

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ FATAL: Invalid environment variables:');
  parsed.error.errors.forEach((err) => {
    console.error(`   - [${err.path.join('.') || 'CONFIG'}]: ${err.message}`);
  });
  process.exit(1);
}

export const env = parsed.data;

/**
 * Returns the primary frontend URL, safely extracting the first URL if CLIENT_URL
 * contains a comma-separated list of allowed origins. Strips trailing slashes.
 */
export const getPrimaryClientUrl = (): string => {
  if (!env.CLIENT_URL) return 'http://localhost:3000';
  const first = env.CLIENT_URL.split(',')[0].trim();
  return first.replace(/\/+$/, '') || 'http://localhost:3000';
};
