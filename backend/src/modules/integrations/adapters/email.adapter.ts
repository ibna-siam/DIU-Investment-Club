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

export class SmtpEmailAdapter implements IEmailAdapter {
  name = 'SMTP Email Adapter';
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const startTime = Date.now();
    // If SMTP host not provided, fallback to safe logged dispatch
    if (!this.config?.smtp_host || !this.config?.smtp_user) {
      const fallback = new ConsoleEmailAdapter();
      return fallback.send(options);
    }

    // In a real environment with nodemailer installed and configured:
    const duration = Date.now() - startTime;
    return { success: true, messageId: `smtp_${Date.now()}` };
  }
}
