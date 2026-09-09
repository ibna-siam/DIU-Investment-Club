import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { periodsRepository } from './periods.repository';

const createYearSchema = z.object({
  name: z.string().min(3),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD required'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD required'),
});

const updatePeriodStatusSchema = z.object({
  status: z.enum(['OPEN', 'CLOSED', 'LOCKED']),
});

export class AccountingPeriodsController {
  async getFinancialYears(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const years = await periodsRepository.findAllYears();
      res.status(200).json({ success: true, data: years });
    } catch (err) {
      next(err);
    }
  }

  async createFinancialYear(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createYearSchema.parse(req.body);
      const year = await periodsRepository.createYear(validated);
      res.status(201).json({ success: true, message: 'Financial year created with 12 monthly periods', data: year });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ success: false, error: { message: 'Validation failed', details: err.errors } });
        return;
      }
      next(err);
    }
  }

  async getAccountingPeriods(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const yearId = req.query.financial_year_id as string | undefined;
      const status = req.query.status as string | undefined;

      const periods = await periodsRepository.findAllPeriods({ financial_year_id: yearId, status });
      res.status(200).json({ success: true, data: periods });
    } catch (err) {
      next(err);
    }
  }

  async getPeriodById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const period = await periodsRepository.findPeriodById(req.params.id);
      if (!period) {
        res.status(404).json({ success: false, error: { message: 'Accounting period not found' } });
        return;
      }
      res.status(200).json({ success: true, data: period });
    } catch (err) {
      next(err);
    }
  }

  async updatePeriodStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = updatePeriodStatusSchema.parse(req.body);
      const userId = req.user?.id || 'system';

      const updated = await periodsRepository.updatePeriodStatus(req.params.id, status, userId);
      res.status(200).json({ success: true, message: `Accounting period set to ${status}`, data: updated });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ success: false, error: { message: 'Validation failed', details: err.errors } });
        return;
      }
      next(err);
    }
  }

  async getCurrentPeriod(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const period = await periodsRepository.getCurrentPeriod();
      res.status(200).json({ success: true, data: period });
    } catch (err) {
      next(err);
    }
  }
}

export const periodsController = new AccountingPeriodsController();
