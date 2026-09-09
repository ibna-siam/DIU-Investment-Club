import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { donationsRepository } from './donations.repository';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository';
import { DonorType, PaymentMethodType } from '../../types';

const createDonationSchema = z.object({
  donor_name: z.string().min(2, 'Donor name is required'),
  donor_type: z.enum(['INDIVIDUAL', 'ORGANIZATION', 'ANONYMOUS']),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  organization_name: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  financial_account_id: z.string().uuid('Invalid financial account ID'),
  payment_method: z.enum(['CASH', 'BKASH', 'NAGAD', 'BANK_TRANSFER', 'CARD', 'OTHER']),
  reference_number: z.string().optional(),
  donation_date: z.string().optional(),
  purpose: z.string().optional(),
  event_id: z.string().uuid().optional().nullable(),
});

const rejectDonationSchema = z.object({
  reason: z.string().min(2, 'Rejection reason is required'),
});

export class DonationsController {
  async getDonations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { donor_type, status, event_id, search, page, limit } = req.query;

      const result = await donationsRepository.findAll({
        donor_type: donor_type as string | undefined,
        status: status as string | undefined,
        event_id: event_id as string | undefined,
        search: search as string | undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 10,
      });

      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async getDonationById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const donation = await donationsRepository.findById(id);
      if (!donation) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Donation not found' } });
        return;
      }
      res.status(200).json({ success: true, data: donation });
    } catch (err) {
      next(err);
    }
  }

  async createDonation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const val = createDonationSchema.safeParse(req.body);
      if (!val.success) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: val.error.flatten() } });
        return;
      }

      const created = await donationsRepository.create({
        ...val.data,
        donor_type: val.data.donor_type as DonorType,
        payment_method: val.data.payment_method as PaymentMethodType,
        email: val.data.email || undefined,
        created_by: req.user?.id,
      });

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'DONATION_CREATED',
        module: 'donations',
        record_id: created.id,
        new_data: created,
      });

      res.status(201).json({ success: true, message: 'Donation recorded in PENDING verification status', data: created });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: err.message } });
    }
  }

  async verifyDonation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await donationsRepository.verify(id, req.user?.id || 'system');

      res.status(200).json({
        success: true,
        message: 'Donation successfully verified and financial ledger credited',
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'VERIFICATION_FAILED', message: err.message } });
    }
  }

  async rejectDonation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const val = rejectDonationSchema.safeParse(req.body);
      if (!val.success) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: val.error.flatten() } });
        return;
      }

      const result = await donationsRepository.reject(id, req.user?.id || 'system', val.data.reason);

      res.status(200).json({ success: true, message: 'Donation rejected', data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: err.message } });
    }
  }
}

export const donationsController = new DonationsController();
