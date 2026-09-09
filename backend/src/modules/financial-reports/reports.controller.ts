import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { financialReportsRepository } from './reports.repository';

export class FinancialReportsController {
  async getIncomeStatement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { start_date, end_date, comp_start_date, comp_end_date } = req.query as {
        start_date?: string;
        end_date?: string;
        comp_start_date?: string;
        comp_end_date?: string;
      };

      const data = await financialReportsRepository.getIncomeStatement(
        start_date,
        end_date,
        comp_start_date,
        comp_end_date
      );

      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getBalanceSheet(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { as_of_date } = req.query as { as_of_date?: string };
      const data = await financialReportsRepository.getBalanceSheet(as_of_date);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getCashFlowStatement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { start_date, end_date } = req.query as { start_date?: string; end_date?: string };
      const data = await financialReportsRepository.getCashFlowStatement(start_date, end_date);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getBudgetVsActual(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { event_id } = req.query as { event_id?: string };
      const data = await financialReportsRepository.getBudgetVsActual(event_id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getEventReports(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { start_date, end_date } = req.query as { start_date?: string; end_date?: string };
      const data = await financialReportsRepository.getEventFinancialReports(start_date, end_date);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getMemberRevenue(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { start_date, end_date } = req.query as { start_date?: string; end_date?: string };
      const data = await financialReportsRepository.getMemberRevenueReport(start_date, end_date);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getDonationReports(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { start_date, end_date } = req.query as { start_date?: string; end_date?: string };
      const data = await financialReportsRepository.getDonationReport(start_date, end_date);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getSponsorshipReports(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { start_date, end_date } = req.query as { start_date?: string; end_date?: string };
      const data = await financialReportsRepository.getSponsorshipReport(start_date, end_date);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await financialReportsRepository.getFinancialAnalyticsSummary();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createSnapshot(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { report_type, title, parameters, data_summary } = req.body;
      const snapshot = await financialReportsRepository.createSnapshot({
        report_type,
        title,
        parameters: parameters || {},
        data_summary: data_summary || {},
        created_by: req.user?.id,
      });
      res.status(201).json({ success: true, data: snapshot });
    } catch (error) {
      next(error);
    }
  }

  async getSnapshots(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { report_type } = req.query as { report_type?: string };
      const snapshots = await financialReportsRepository.getSnapshots(report_type);
      res.status(200).json({ success: true, data: snapshots });
    } catch (error) {
      next(error);
    }
  }
}

export const financialReportsController = new FinancialReportsController();
