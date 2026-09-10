import { Resend } from 'resend';
import { env } from '../../config/env';

/**
 * Resend Email Service Configuration
 *
 * Production Verified Domain: invesment.top
 * Sender Identity: DIU Investment Club <noreply@invesment.top>
 */

export const isResendConfigured = (): boolean => {
  return Boolean(env.RESEND_API_KEY && env.RESEND_API_KEY.trim().length > 0);
};

let resendInstance: Resend | null = null;

export const getResendClient = (): Resend => {
  if (!isResendConfigured()) {
    throw new Error('Resend is not configured: RESEND_API_KEY is missing from environment variables.');
  }

  if (!resendInstance) {
    resendInstance = new Resend(env.RESEND_API_KEY);
  }

  return resendInstance;
};

export const DEFAULT_FROM_EMAIL = env.RESEND_FROM_EMAIL || 'DIU Investment Club <noreply@invesment.top>';
export const DEFAULT_ADMIN_EMAIL = env.ADMIN_EMAIL || 'admin@diu.edu.bd';
export const DEFAULT_TEST_RECIPIENT = env.RESEND_TEST_RECIPIENT || 'siamibna75@gmail.com';

