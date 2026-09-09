import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { vouchersRepository } from './vouchers.repository';

const createVoucherSchema = z.object({
  voucher_type: z.enum(['PAYMENT_VOUCHER', 'RECEIPT_VOUCHER', 'JOURNAL_VOUCHER', 'CONTRA_VOUCHER']),
  journal_entry_id: z.string().uuid(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD required'),
  description: z.string().optional().nullable(),
});

export class VouchersController {
  async getVouchers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const voucherType = req.query.voucher_type as string | undefined;
      const status = req.query.status as string | undefined;
      const startDate = req.query.start_date as string | undefined;
      const endDate = req.query.end_date as string | undefined;
      const search = req.query.search as string | undefined;

      const vouchers = await vouchersRepository.findAll({
        voucher_type: voucherType,
        status,
        start_date: startDate,
        end_date: endDate,
        search,
      });

      res.status(200).json({ success: true, data: vouchers });
    } catch (err) {
      next(err);
    }
  }

  async getVoucherById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const voucher = await vouchersRepository.findById(req.params.id);
      if (!voucher) {
        res.status(404).json({ success: false, error: { message: 'Voucher not found' } });
        return;
      }
      res.status(200).json({ success: true, data: voucher });
    } catch (err) {
      next(err);
    }
  }

  async createVoucher(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createVoucherSchema.parse(req.body);
      const userId = req.user?.id || 'system';

      const voucher = await vouchersRepository.create(validated, userId);
      res.status(201).json({ success: true, message: 'Voucher generated', data: voucher });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ success: false, error: { message: 'Validation failed', details: err.errors } });
        return;
      }
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }

  async approveVoucher(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id || 'system';
      const voucher = await vouchersRepository.approve(req.params.id, userId);
      res.status(200).json({ success: true, message: 'Voucher approved', data: voucher });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }

  async cancelVoucher(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id || 'system';
      const voucher = await vouchersRepository.cancel(req.params.id, userId);
      res.status(200).json({ success: true, message: 'Voucher cancelled', data: voucher });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }
}

export const vouchersController = new VouchersController();
