/**
 * DIU Investment Club - Universal Email Provider Interface
 *
 * Provides a decoupled abstraction supporting dual provider delivery:
 * - RESEND (for testing/diagnostics and future custom domains)
 * - SMTP (for direct live delivery via university / corporate / Google SMTP)
 */

export interface SendMailOptions {
  from?: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export type EmailProviderName = 'RESEND' | 'SMTP';

export type ErrorCategory =
  | 'PERMANENT'
  | 'TEMPORARY'
  | 'AUTH_ERROR'
  | 'RATE_LIMIT'
  | 'INVALID_RECIPIENT'
  | 'UNCONFIGURED';

export interface ProviderSendResult {
  success: boolean;
  provider: EmailProviderName;
  id?: string;
  error?: string;
  statusCode?: number;
  errorCategory?: ErrorCategory;
  isRetryable?: boolean;
  raw?: any;
}

export interface IEmailProvider {
  readonly name: EmailProviderName;
  isConfigured(): boolean;
  send(options: SendMailOptions): Promise<ProviderSendResult>;
}
