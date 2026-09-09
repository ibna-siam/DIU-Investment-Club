import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sponsorshipsRepository } from './sponsorships.repository';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository';
import { PaymentMethodType } from '../../types';

const createSponsorshipSchema = z.object({
  sponsor_id: z.string().uuid('Invalid sponsor ID'),
  event_id: z.string().uuid().optional().nullable(),
  title: z.string().min(2, 'Title is required'),
  description: z.string().optional(),
  agreed_amount: z.number().positive('Agreed amount must be positive'),
  agreement_date: z.string().optional(),
  due_date: z.string().optional(),
});

const createSponsorshipPaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  payment_method: z.enum(['CASH', 'BKASH', 'NAGAD', 'BANK_TRANSFER', 'CARD', 'OTHER']),
  financial_account_id: z.string().uuid('Invalid financial account ID'),
  payment_date: z.string().optional(),
  reference_number: z.string().optional(),
});

export class SponsorshipsController {
  async getSponsorships(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sponsor_id, event_id, status, search, page, limit } = req.query;

      const result = await sponsorshipsRepository.findAll({
        sponsor_id: sponsor_id as string | undefined,
        event_id: event_id as string | undefined,
        status: status as string | undefined,
        search: search as string | undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 10,
      });

      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async getSponsorshipById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const sponsorship = await sponsorshipsRepository.findById(id);
      if (!sponsorship) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Sponsorship not found' } });
        return;
      }

      const payments = await sponsorshipsRepository.findPayments(id);

      res.status(200).json({
        success: true,
        data: {
          ...sponsorship,
          payments,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async createSponsorship(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const val = createSponsorshipSchema.safeParse(req.body);
      if (!val.success) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: val.error.flatten() } });
        return;
      }

      const created = await sponsorshipsRepository.create({
        ...val.data,
        event_id: val.data.event_id || undefined,
        created_by: req.user?.id,
      });

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'SPONSORSHIP_CREATED',
        module: 'sponsorships',
        record_id: created.id,
        new_data: created,
      });

      res.status(201).json({ success: true, message: 'Sponsorship agreement created successfully', data: created });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: err.message } });
    }
  }

  async recordPayment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const val = createSponsorshipPaymentSchema.safeParse(req.body);
      if (!val.success) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: val.error.flatten() } });
        return;
      }

      const payment = await sponsorshipsRepository.createPayment({
        sponsorship_id: id,
        amount: val.data.amount,
        payment_method: val.data.payment_method as PaymentMethodType,
        financial_account_id: val.data.financial_account_id,
        payment_date: val.data.payment_date,
        reference_number: val.data.reference_number,
        created_by: req.user?.id,
      });

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'SPONSORSHIP_PAYMENT_RECORDED',
        module: 'sponsorship_payments',
        record_id: payment.id,
        new_data: payment,
      });

      res.status(201).json({ success: true, message: 'Installment recorded in PENDING verification status', data: payment });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: err.message } });
    }
  }

  async verifyPayment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { paymentId } = req.params;
      const result = await sponsorshipsRepository.verifyPayment(paymentId, req.user?.id || 'system');

      res.status(200).json({
        success: true,
        message: 'Sponsorship payment verified, account credited, and agreement balance updated',
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'VERIFICATION_FAILED', message: err.message } });
    }
  }
}

export const sponsorshipsController = new SponsorshipsController();
