import { Request, Response } from 'express';
import { webhooksService } from './webhooks.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export class WebhooksController {
  async listWebhooks(req: Request, res: Response) {
    try {
      const hooks = await webhooksService.listWebhooks();
      return res.status(200).json({ success: true, data: hooks });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async createWebhook(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, url, events, secret, headers } = req.body;
      if (!name || !url || !events || !events.length) {
        return res.status(400).json({ success: false, error: { message: 'name, url, and events are required' } });
      }

      const hook = await webhooksService.createWebhook({
        name,
        url,
        events,
        secret,
        headers,
        created_by: req.user?.id,
      });

      return res.status(201).json({ success: true, data: hook });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async toggleWebhook(req: Request, res: Response) {
    try {
      const hook = await webhooksService.toggleWebhook(req.params.id);
      if (!hook) {
        return res.status(404).json({ success: false, error: { message: 'Webhook not found' } });
      }
      return res.status(200).json({ success: true, data: hook });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async deleteWebhook(req: Request, res: Response) {
    try {
      const ok = await webhooksService.deleteWebhook(req.params.id);
      return res.status(200).json({ success: ok });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async listLogs(req: Request, res: Response) {
    try {
      const { webhookId } = req.query;
      const logs = await webhooksService.listLogs(webhookId as string);
      return res.status(200).json({ success: true, data: logs });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async triggerTestEvent(req: Request, res: Response) {
    try {
      const { event_type, payload } = req.body;
      const result = await webhooksService.dispatchEvent(event_type || 'PAYMENT_RECEIVED', payload || {
        amount: 1500,
        currency: 'BDT',
        member_id: 'mem_test',
        payment_id: 'pay_test_001',
      });
      return res.status(200).json({ success: true, ...result });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }
}

export const webhooksController = new WebhooksController();
