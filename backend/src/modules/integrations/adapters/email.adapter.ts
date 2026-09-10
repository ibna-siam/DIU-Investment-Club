import { supabaseClient, isSupabaseConfigured } from '../../../config/supabase';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

export interface IEmailAdapter {
  name: string;
  send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

export class ConsoleEmailAdapter implements IEmailAdapter {
  name = 'Console/Mock Email Adapter';

  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const startTime = Date.now();
    const messageId = `mock_mail_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    console.log(`[EMAIL DISPATCH] [${this.name}] To: ${options.to} | Subject: "${options.subject}"`);
    console.log(`[EMAIL BODY] ${options.text || options.html || '(empty)'}`);

    const duration = Date.now() - startTime;

    if (isSupabaseConfigured() && supabaseClient) {
      await supabaseClient.from('integration_logs').insert({
        provider_type: 'EMAIL',
        provider_name: this.name,
        direction: 'OUTBOUND',
        endpoint_or_action: 'send_email',
        status_code: 200,
        execution_time_ms: duration,
        payload_summary: `To: ${options.to}, Subject: ${options.subject}`,
      });
    }

    return { success: true, messageId };
  }
}

export class ResendEmailAdapter implements IEmailAdapter {
  name = 'Resend Email Adapter';
  private config: any;

  constructor(config?: any) {
    this.config = config;
  }

  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const startTime = Date.now();
    try {
      const { emailProvider } = await import('../../email/email.provider');
      const result = await emailProvider.send({
        to: options.to,
        subject: options.subject,
        html: options.html || options.text || '',
        text: options.text,
        from: options.from,
      });

      const duration = Date.now() - startTime;
      if (isSupabaseConfigured() && supabaseClient) {
        await supabaseClient.from('integration_logs').insert({
          provider_type: 'EMAIL',
          provider_name: this.name,
          direction: 'OUTBOUND',
          endpoint_or_action: 'send_email',
          status_code: result.statusCode || (result.success ? 200 : 500),
          execution_time_ms: duration,
          payload_summary: `To: ${options.to}, Subject: ${options.subject}`,
          error_details: result.error || null,
        });
      }

      return {
        success: result.success,
        messageId: result.id,
        error: result.error,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Resend transmission failed',
      };
    }
  }
}
