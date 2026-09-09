import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { coaRepository } from './coa.repository';

const createCoaSchema = z.object({
  account_code: z.string().min(3).max(20),
  account_name: z.string().min(2).max(100),
  account_type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  account_subtype: z.enum([
    'CASH', 'BANK', 'MFS', 'RECEIVABLE', 'PAYABLE', 'ACCRUED',
    'DEFERRED', 'RESERVE', 'OPENING', 'MEMBERSHIP', 'DONATION',
    'SPONSORSHIP', 'EVENT', 'ADMIN', 'MARKETING', 'LOGISTICS',
    'FINANCIAL', 'OTHER'
  ]).optional().nullable(),
  parent_account_id: z.string().uuid().optional().nullable(),
  normal_balance: z.enum(['DEBIT', 'CREDIT']).optional(),
  description: z.string().optional().nullable(),
});

const updateCoaSchema = z.object({
  account_name: z.string().min(2).max(100).optional(),
  account_subtype: z.string().optional().nullable(),
  parent_account_id: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

export class ChartOfAccountsController {
  async getAccounts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const type = req.query.type as string | undefined;
      const isActive = req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined;
      const search = req.query.search as string | undefined;

      const accounts = await coaRepository.findAll({ type, is_active: isActive, search });
      res.status(200).json({ success: true, data: accounts });
    } catch (err) {
      next(err);
    }
  }

  async getHierarchy(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const hierarchy = await coaRepository.getHierarchy();
      res.status(200).json({ success: true, data: hierarchy });
    } catch (err) {
      next(err);
    }
  }

  async getAccountById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const account = await coaRepository.findById(req.params.id);
      if (!account) {
        res.status(404).json({ success: false, error: { message: 'Account not found' } });
        return;
      }
      res.status(200).json({ success: true, data: account });
    } catch (err) {
      next(err);
    }
  }

  async createAccount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createCoaSchema.parse(req.body);

      // Check unique code
      const existing = await coaRepository.findByCode(validated.account_code);
      if (existing) {
        res.status(409).json({ success: false, error: { message: `Account code ${validated.account_code} is already in use` } });
        return;
      }

      const defaultNormalBalance = ['ASSET', 'EXPENSE'].includes(validated.account_type) ? 'DEBIT' : 'CREDIT';
      const normalBalance = validated.normal_balance || defaultNormalBalance;

      const created = await coaRepository.create({
        ...validated,
        normal_balance: normalBalance,
      });

      res.status(201).json({ success: true, message: 'Chart of account created successfully', data: created });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ success: false, error: { message: 'Validation failed', details: err.errors } });
        return;
      }
      next(err);
    }
  }

  async updateAccount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateCoaSchema.parse(req.body);
      const existing = await coaRepository.findById(req.params.id);
      if (!existing) {
        res.status(404).json({ success: false, error: { message: 'Account not found' } });
        return;
      }

      const updated = await coaRepository.update(req.params.id, validated as any);
      res.status(200).json({ success: true, message: 'Chart of account updated', data: updated });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ success: false, error: { message: 'Validation failed', details: err.errors } });
        return;
      }
      next(err);
    }
  }

  async deleteAccount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await coaRepository.delete(req.params.id);
      res.status(200).json({ success: true, message: 'Account deactivated or deleted successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }
}

export const coaController = new ChartOfAccountsController();
