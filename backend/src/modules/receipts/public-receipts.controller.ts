/**
 * Public Digital Receipts Controller
 *
 * Provides unauthenticated, cryptographically-secure, rate-limited
 * digital receipt validation and data retrieval for members and public verification.
 */

import { Request, Response, NextFunction } from 'express';
import { memberPaymentsRepository } from '../member-payments/member-payments.repository';

export class PublicReceiptsController {
  async getReceiptByToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;

      // Validate cryptographic token shape (64-char hex string)
      if (!token || typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token.trim())) {
        res.status(404).json({
          success: false,
          error: {
            code: 'RECEIPT_NOT_FOUND',
            message: 'The requested digital receipt token is invalid or does not exist.',
          },
        });
        return;
      }

      const payment = await memberPaymentsRepository.findByReceiptToken(token.trim());

      // Only confirmed/verified receipts are public
      if (!payment || payment.status !== 'VERIFIED') {
        res.status(404).json({
          success: false,
          error: {
            code: 'RECEIPT_NOT_FOUND',
            message: 'The requested digital receipt does not exist or has not been confirmed.',
          },
        });
        return;
      }

      const member = (payment as any).member || {};
      const due = (payment as any).due || null;

      // Return strictly safe, public-facing receipt attributes
      res.status(200).json({
        success: true,
        data: {
          receiptNumber: payment.receipt_number || payment.payment_number,
          paymentNumber: payment.payment_number,
          status: 'CONFIRMED',
          paymentDate: payment.payment_date,
          amount: Number(payment.amount),
          currency: 'BDT',
          currencySymbol: '৳',
          paymentMethod: payment.payment_method,
          referenceNumber: payment.reference_number || null,
          transactionReference: payment.transaction_reference || null,
          member: {
            fullName: member.full_name || 'DIU Club Member',
            memberCode: member.member_code || 'MEMBER',
            studentId: member.student_id || null,
            department: member.department || null,
            batch: member.batch || null,
          },
          purpose: due?.title || 'Club Membership / Financial Contribution',
          verifiedAt: payment.verified_at || payment.created_at,
          club: {
            name: 'DIU Investment Club',
            institution: 'Daffodil International University',
            officialDomain: 'https://invesmentclub.top',
            supportEmail: 'contact@invesmentclub.top',
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const publicReceiptsController = new PublicReceiptsController();
