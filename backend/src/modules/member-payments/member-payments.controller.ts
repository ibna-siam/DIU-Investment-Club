import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { memberPaymentsRepository } from './member-payments.repository';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository';
import { PaymentMethodType } from '../../types';
import { emailEventBus } from '../email/email.events';
import { isValidEmail } from '../email/email.security';

const createPaymentSchema = z.object({
  member_id: z.string().uuid('Invalid member ID'),
  due_id: z.string().uuid().optional().nullable(),
  amount: z.number().positive('Amount must be positive'),
  payment_method: z.enum(['CASH', 'BKASH', 'NAGAD', 'BANK_TRANSFER', 'CARD', 'OTHER']),
  financial_account_id: z.string().uuid('Invalid financial account ID'),
  payment_date: z.string().optional(),
  reference_number: z.string().optional(),
  transaction_reference: z.string().optional(),
});

const verifyPaymentSchema = z.object({
  notes: z.string().optional(),
});

const rejectPaymentSchema = z.object({
  reason: z.string().min(2, 'Rejection reason is required'),
});

export class MemberPaymentsController {
  async getPayments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { member_id, due_id, status, financial_account_id, search, page, limit } = req.query;

      const result = await memberPaymentsRepository.findAll({
        member_id: member_id as string | undefined,
        due_id: due_id as string | undefined,
        status: status as string | undefined,
        financial_account_id: financial_account_id as string | undefined,
        search: search as string | undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 10,
      });

      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async getPaymentById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const payment = await memberPaymentsRepository.findById(id);
      if (!payment) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payment not found' } });
        return;
      }
      res.status(200).json({ success: true, data: payment });
    } catch (err) {
      next(err);
    }
  }

  async getReceipt(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { receiptNumber } = req.params;
      const payment = await memberPaymentsRepository.findByReceiptNumber(receiptNumber);
      if (!payment) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Receipt not found' } });
        return;
      }
      res.status(200).json({ success: true, data: payment });
    } catch (err) {
      next(err);
    }
  }

  async createPayment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const val = createPaymentSchema.safeParse(req.body);
      if (!val.success) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: val.error.flatten() } });
        return;
      }

      const created = await memberPaymentsRepository.create({
        ...val.data,
        due_id: val.data.due_id || undefined,
        payment_method: val.data.payment_method as PaymentMethodType,
        created_by: req.user?.id,
      });

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'PAYMENT_CREATED',
        module: 'member_payments',
        record_id: created.id,
        new_data: created,
      });

      res.status(201).json({ success: true, message: 'Payment recorded in PENDING verification status', data: created });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: err.message } });
    }
  }

  async verifyPayment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const val = verifyPaymentSchema.safeParse(req.body);
      if (!val.success) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: val.error.flatten() } });
        return;
      }

      const result = await memberPaymentsRepository.verify(id, req.user?.id || 'system', val.data.notes);

      // Emit PAYMENT_CONFIRMED domain event after database verification succeeds
      try {
        const payment = await memberPaymentsRepository.findById(id);
        if (payment) {
          const memberEmail = (payment as any).member?.email || (payment as any).member?.user?.email;
          if (!memberEmail || !isValidEmail(memberEmail)) {
            console.warn(`⚠️ [PaymentController] Member on payment ${payment.id} does not have a valid email. Skipping payment confirmation email.`);
          } else {
            emailEventBus.emitEvent({
              type: 'PAYMENT_CONFIRMED',
              payload: {
                paymentId: payment.id,
                paymentNumber: payment.payment_number,
                memberId: payment.member_id,
                memberName: (payment as any).member?.full_name || 'Valued Member',
                memberEmail,
                amount: Number(payment.amount),
                paymentMethod: payment.payment_method,
                paymentDate: payment.payment_date || new Date().toISOString().split('T')[0],
                referenceNumber: payment.reference_number || payment.payment_number,
                verifiedBy: req.user?.id,
              },
            });
          }
        }
      } catch (eventErr) {
        console.warn('⚠️ [PaymentController] Could not emit PAYMENT_CONFIRMED event:', eventErr);
      }

      res.status(200).json({
        success: true,
        message: 'Member payment successfully verified and financial ledger credited',
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'VERIFICATION_FAILED', message: err.message } });
    }
  }

  async rejectPayment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const val = rejectPaymentSchema.safeParse(req.body);
      if (!val.success) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: val.error.flatten() } });
        return;
      }

      const result = await memberPaymentsRepository.reject(id, req.user?.id || 'system', val.data.reason);

      res.status(200).json({
        success: true,
        message: 'Payment rejected',
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: err.message } });
    }
  }
}

export const memberPaymentsController = new MemberPaymentsController();
