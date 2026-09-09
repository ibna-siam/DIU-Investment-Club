import { Resend } from 'resend';
import { env } from '../../config/env';

/**
 * Resend Email Service Configuration
 *
 * NOTE FOR DEVELOPMENT / DOMAIN-LESS USAGE:
 * When sending without a custom domain, Resend requires:
 * 1. The sender address MUST use the sandbox domain: 'onboarding@resend.dev'
 *    (e.g., 'DIU Investment Club <onboarding@resend.dev>')
 * 2. In testing mode, emails can only be delivered to the account owner's registered email
 *    or 'delivered@resend.dev'.
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

export const DEFAULT_FROM_EMAIL = env.RESEND_FROM_EMAIL || 'DIU Investment Club <onboarding@resend.dev>';
export const DEFAULT_ADMIN_EMAIL = env.ADMIN_EMAIL || 'admin@diu.edu.bd';
export const DEFAULT_TEST_RECIPIENT = env.RESEND_TEST_RECIPIENT || '';

