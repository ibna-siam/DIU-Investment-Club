import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { accountsRepository } from './accounts.repository';

const createAccountSchema = z.object({
  name: z.string().min(2, 'Account name must be at least 2 characters'),
  account_type: z.enum(['CASH', 'BANK', 'BKASH', 'NAGAD', 'ROCKET', 'OTHER']),
  account_number: z.string().optional(),
  provider_name: z.string().optional(),
  opening_balance: z.number().min(0, 'Opening balance cannot be negative').default(0),
  description: z.string().optional(),
});

const updateAccountSchema = z.object({
  name: z.string().min(2).optional(),
  account_number: z.string().nullable().optional(),
  provider_name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'CLOSED']),
});

export class AccountsController {
  async getAccounts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as string | undefined;
      const type = req.query.type as string | undefined;
      const search = req.query.search as string | undefined;

      const accounts = await accountsRepository.findAll({ status, type, search });

      // Calculate summaries
      const totalBalance = accounts
        .filter((a) => a.status === 'ACTIVE')
        .reduce((sum, a) => sum + Number(a.current_balance), 0);
      const cashBalance = accounts
        .filter((a) => a.status === 'ACTIVE' && a.account_type === 'CASH')
        .reduce((sum, a) => sum + Number(a.current_balance), 0);
      const bankBalance = accounts
        .filter((a) => a.status === 'ACTIVE' && a.account_type === 'BANK')
        .reduce((sum, a) => sum + Number(a.current_balance), 0);
      const digitalBalance = accounts
        .filter((a) => a.status === 'ACTIVE' && ['BKASH', 'NAGAD', 'ROCKET'].includes(a.account_type))
        .reduce((sum, a) => sum + Number(a.current_balance), 0);

      res.status(200).json({
        success: true,
        data: accounts,
        summary: {
          totalAccounts: accounts.length,
          totalBalance,
          cashBalance,
          bankBalance,
          digitalBalance,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async getAccountById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const account = await accountsRepository.findById(id);

      if (!account) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Financial account not found' },
        });
        return;
      }

      const summary = await accountsRepository.getAccountSummary(id);
      const recentTransactions = await accountsRepository.getAccountTransactions(id, 10);

      res.status(200).json({
        success: true,
        data: {
          ...account,
          summary,
          recentTransactions,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async createAccount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createAccountSchema.parse(req.body);
      const userId = req.user?.id;

      const account = await accountsRepository.create({
        ...data,
        created_by: userId,
      });

      res.status(201).json({
        success: true,
        message: 'Financial account created successfully',
        data: account,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateAccount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = updateAccountSchema.parse(req.body);
      const userId = req.user?.id;

      const updated = await accountsRepository.update(id, data, userId);

      if (!updated) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Financial account not found' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Financial account updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = updateStatusSchema.parse(req.body);
      const userId = req.user?.id;

      const updated = await accountsRepository.updateStatus(id, status, userId);

      if (!updated) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Financial account not found' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Financial account status updated to ${status}`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async getAccountTransactions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const txns = await accountsRepository.getAccountTransactions(id, limit);

      res.status(200).json({
        success: true,
        data: txns,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const accountsController = new AccountsController();
