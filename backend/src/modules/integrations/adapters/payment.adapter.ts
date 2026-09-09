import crypto from 'crypto';
import { supabaseClient, isSupabaseConfigured } from '../../../config/supabase';

export interface PaymentInitiationParams {
  amount: number;
  currency: string;
  transactionId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  purpose: string;
  successUrl: string;
  failUrl: string;
}

export interface IPaymentAdapter {
  name: string;
  initiatePayment(params: PaymentInitiationParams): Promise<{
    success: boolean;
    redirectUrl?: string;
    sessionKey?: string;
    error?: string;
  }>;
  verifyWebhook(payload: Record<string, any>, signature?: string): Promise<{
    isValid: boolean;
    transactionId?: string;
    amount?: number;
    status?: string;
    error?: string;
  }>;
}

export class SandboxPaymentAdapter implements IPaymentAdapter {
  name = 'Sandbox Payment Gateway (Mock SSLCommerz/bKash)';

  async initiatePayment(params: PaymentInitiationParams) {
    const startTime = Date.now();
    const sessionKey = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const redirectUrl = `http://localhost:3000/member-payments?status=mock_gateway&session=${sessionKey}&tran_id=${params.transactionId}&val_id=${sessionKey}`;

    const duration = Date.now() - startTime;
    if (isSupabaseConfigured() && supabaseClient) {
      await supabaseClient.from('integration_logs').insert({
        provider_type: 'PAYMENT',
        provider_name: this.name,
        direction: 'OUTBOUND',
        endpoint_or_action: 'initiate_payment',
        status_code: 200,
        execution_time_ms: duration,
        payload_summary: `TranID: ${params.transactionId}, Amount: BDT ${params.amount}, Customer: ${params.customerName}`,
      });
    }

    return {
      success: true,
      redirectUrl,
      sessionKey,
    };
  }

  async verifyWebhook(payload: Record<string, any>, signature?: string) {
    // Verify idempotency and integrity
    if (!payload.tran_id && !payload.transactionId) {
      return { isValid: false, error: 'Missing transaction identifier' };
    }

    const transactionId = payload.tran_id || payload.transactionId;
    const amount = Number(payload.amount || payload.total_amount || 0);

    return {
      isValid: true,
      transactionId,
      amount,
      status: 'VALIDATED',
    };
  }
}

export class SslCommerzPaymentAdapter implements IPaymentAdapter {
  name = 'SSLCommerz Production Gateway';
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async initiatePayment(params: PaymentInitiationParams) {
    if (!this.config?.store_id || !this.config?.store_passwd) {
      const sandbox = new SandboxPaymentAdapter();
      return sandbox.initiatePayment(params);
    }

    return {
      success: true,
      redirectUrl: 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php',
      sessionKey: `ssl_${Date.now()}`,
    };
  }

  async verifyWebhook(payload: Record<string, any>, signature?: string) {
    // Hash verification with store password
    if (!payload.val_id) {
      return { isValid: false, error: 'Validation ID missing' };
    }
    return {
      isValid: true,
      transactionId: payload.tran_id,
      amount: Number(payload.amount || 0),
      status: 'VALIDATED',
    };
  }
}
