import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { reportsRepository } from './reports.repository';

export class AccountingReportsController {
  async getTrialBalance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const startDate = req.query.start_date as string | undefined;
      const endDate = req.query.end_date as string | undefined;

      const report = await reportsRepository.getTrialBalance(startDate, endDate);
      res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  async getDashboardSummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await reportsRepository.getDashboardSummary();
      res.status(200).json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }

  async getGeneralLedger(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const accountId = req.query.account_id as string;
      const startDate = req.query.start_date as string | undefined;
      const endDate = req.query.end_date as string | undefined;

      if (!accountId) {
        res.status(400).json({ success: false, error: { message: 'account_id query parameter is required' } });
        return;
      }

      const statement = await reportsRepository.getGeneralLedger({
        account_id: accountId,
        start_date: startDate,
        end_date: endDate,
      });

      res.status(200).json({ success: true, data: statement });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }

  async getSubsidiaryLedger(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const type = (req.query.type as string)?.toUpperCase() || 'MEMBER';
      if (!['MEMBER', 'SPONSOR', 'EVENT'].includes(type)) {
        res.status(400).json({ success: false, error: { message: 'Type must be MEMBER, SPONSOR, or EVENT' } });
        return;
      }

      const ledger = await reportsRepository.getSubsidiaryLedger(type as any);
      res.status(200).json({ success: true, data: ledger });
    } catch (err) {
      next(err);
    }
  }

  async getMappings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const mappings = await reportsRepository.getAccountingMappings();
      res.status(200).json({ success: true, data: mappings });
    } catch (err) {
      next(err);
    }
  }

  async syncHistorical(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id || 'system';
      const result = await reportsRepository.syncHistorical(userId);
      res.status(200).json({ success: true, message: 'Historical sync complete', data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }
}

export const reportsController = new AccountingReportsController();
