import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { incomeRepository } from './income.repository';

const createIncomeSchema = z.object({
  transaction_date: z.string().min(1, 'Transaction date is required'),
  category_id: z.string().uuid('Invalid category ID'),
  amount: z.number().positive('Amount must be greater than zero'),
  received_from: z.string().min(2, 'Received from must be at least 2 characters'),
  financial_account_id: z.string().uuid('Invalid financial account ID'),
  payment_method: z.string().optional(),
  reference_number: z.string().optional(),
  description: z.string().optional(),
  event_id: z.string().uuid().optional().nullable(),
});

const updateIncomeSchema = z.object({
  transaction_date: z.string().optional(),
  category_id: z.string().uuid().optional(),
  amount: z.number().positive().optional(),
  received_from: z.string().min(2).optional(),
  financial_account_id: z.string().uuid().optional(),
  payment_method: z.string().optional(),
  reference_number: z.string().optional(),
  description: z.string().optional(),
  event_id: z.string().uuid().optional().nullable(),
});

export class IncomeController {
  async getIncomes(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        search,
        category_id,
        financial_account_id,
        status,
        start_date,
        end_date,
        event_id,
        page,
        limit,
      } = req.query;

      const result = await incomeRepository.findAll({
        search: search as string | undefined,
        category_id: category_id as string | undefined,
        financial_account_id: financial_account_id as string | undefined,
        status: status as string | undefined,
        start_date: start_date as string | undefined,
        end_date: end_date as string | undefined,
        event_id: event_id as string | undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 10,
      });

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getIncomeById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const income = await incomeRepository.findById(id);

      if (!income) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Income record not found' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: income,
      });
    } catch (err) {
      next(err);
    }
  }

  async createIncome(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = createIncomeSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid income input',
            details: validation.error.flatten(),
          },
        });
        return;
      }

      const created = await incomeRepository.create({
        ...validation.data,
        created_by: req.user?.id,
      });

      res.status(201).json({
        success: true,
        message: 'Income record created successfully in DRAFT status',
        data: created,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: err.message || 'Failed to create income' },
      });
    }
  }

  async updateIncome(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const validation = updateIncomeSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: validation.error.flatten(),
          },
        });
        return;
      }

      const updated = await incomeRepository.update(id, validation.data, req.user?.id);
      if (!updated) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Income record not found or could not be updated' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Income updated successfully',
        data: updated,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: err.message || 'Failed to update income' },
      });
    }
  }

  async completeIncome(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id || 'system';

      const result = await incomeRepository.complete(id, userId);

      res.status(200).json({
        success: true,
        message: 'Income transaction successfully completed and account balance credited',
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'TRANSACTION_FAILED', message: err.message || 'Failed to complete income transaction' },
      });
    }
  }

  async cancelIncome(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id || 'system';

      const cancelled = await incomeRepository.cancel(id, userId);
      if (!cancelled) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Income not found or could not be cancelled' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Income record cancelled successfully',
        data: cancelled,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: err.message || 'Failed to cancel income' },
      });
    }
  }
}

export const incomeController = new IncomeController();
