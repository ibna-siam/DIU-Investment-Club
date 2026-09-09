import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { expensesRepository } from './expenses.repository';
import { emailEventBus } from '../email/email.events';

const createExpenseSchema = z.object({
  expense_date: z.string().min(1, 'Expense date is required'),
  category_id: z.string().uuid('Invalid category ID'),
  amount: z.number().positive('Amount must be greater than zero'),
  paid_to: z.string().min(2, 'Paid to must be at least 2 characters'),
  financial_account_id: z.string().uuid('Invalid financial account ID'),
  payment_method: z.string().optional(),
  invoice_number: z.string().optional(),
  receipt_url: z.string().optional(),
  description: z.string().optional(),
  event_id: z.string().uuid().optional().nullable(),
  event_budget_item_id: z.string().uuid().optional().nullable(),
});

const updateExpenseSchema = z.object({
  expense_date: z.string().optional(),
  category_id: z.string().uuid().optional(),
  amount: z.number().positive().optional(),
  paid_to: z.string().min(2).optional(),
  financial_account_id: z.string().uuid().optional(),
  payment_method: z.string().optional(),
  invoice_number: z.string().optional(),
  receipt_url: z.string().optional(),
  description: z.string().optional(),
  event_id: z.string().uuid().optional().nullable(),
  event_budget_item_id: z.string().uuid().optional().nullable(),
});

export class ExpensesController {
  async getExpenses(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        search,
        category_id,
        financial_account_id,
        status,
        start_date,
        end_date,
        event_id,
        event_budget_item_id,
        page,
        limit,
      } = req.query;

      const result = await expensesRepository.findAll({
        search: search as string | undefined,
        category_id: category_id as string | undefined,
        financial_account_id: financial_account_id as string | undefined,
        status: status as string | undefined,
        start_date: start_date as string | undefined,
        end_date: end_date as string | undefined,
        event_id: event_id as string | undefined,
        event_budget_item_id: event_budget_item_id as string | undefined,
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

  async getExpenseById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const expense = await expensesRepository.findById(id);

      if (!expense) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Expense record not found' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: expense,
      });
    } catch (err) {
      next(err);
    }
  }

  async createExpense(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = createExpenseSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid expense input',
            details: validation.error.flatten(),
          },
        });
        return;
      }

      const created = await expensesRepository.create({
        ...validation.data,
        created_by: req.user?.id,
      });

      res.status(201).json({
        success: true,
        message: 'Expense record created successfully in DRAFT status',
        data: created,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: err.message || 'Failed to create expense' },
      });
    }
  }

  async updateExpense(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const validation = updateExpenseSchema.safeParse(req.body);
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

      const updated = await expensesRepository.update(id, validation.data, req.user?.id);
      if (!updated) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Expense record not found or cannot be modified' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Expense updated successfully',
        data: updated,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: err.message || 'Failed to update expense' },
      });
    }
  }

  async submitExpense(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id || 'system';

      const submitted = await expensesRepository.submit(id, userId);
      if (!submitted) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Expense not found or already submitted' },
        });
        return;
      }

      // Emit EXPENSE_SUBMITTED domain event after database submission succeeds
      try {
        emailEventBus.emitEvent({
          type: 'EXPENSE_SUBMITTED',
          payload: {
            expenseId: submitted.id,
            expenseNumber: submitted.expense_number,
            title: submitted.description || (submitted as any).vendor_name || 'Expense Claim',
            amount: Number(submitted.amount),
            categoryName: (submitted as any).category?.name || 'General Operations',
            submitterId: userId,
            submitterName: req.user?.full_name || 'Club Submitter',
            submitterEmail: req.user?.email,
          },
        });
      } catch (eventErr) {
        console.warn('⚠️ [ExpensesController] Could not emit EXPENSE_SUBMITTED event:', eventErr);
      }

      res.status(200).json({
        success: true,
        message: 'Expense successfully submitted for multi-tier approval',
        data: submitted,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: err.message || 'Failed to submit expense' },
      });
    }
  }

  async payExpense(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id || 'system';

      const result = await expensesRepository.pay(id, userId);

      res.status(200).json({
        success: true,
        message: 'Expense paid successfully and account balance debited',
        data: result,
      });
    } catch (err: any) {
      const message = err.message || 'Failed to process expense payment';
      const isInsufficient = message.toLowerCase().includes('insufficient');

      res.status(400).json({
        success: false,
        error: {
          code: isInsufficient ? 'INSUFFICIENT_FUNDS' : 'TRANSACTION_FAILED',
          message,
        },
      });
    }
  }

  async cancelExpense(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id || 'system';

      const cancelled = await expensesRepository.cancel(id, userId);
      if (!cancelled) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Expense not found or could not be cancelled' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Expense record cancelled successfully',
        data: cancelled,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: err.message || 'Failed to cancel expense' },
      });
    }
  }
}

export const expensesController = new ExpensesController();
