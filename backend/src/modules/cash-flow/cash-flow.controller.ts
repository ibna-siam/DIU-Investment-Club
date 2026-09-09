import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { CashFlowService } from './cash-flow.service';

const cashFlowService = new CashFlowService();

export class CashFlowController {
  async getSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate, accountId, accountType } = req.query;

      const summary = await cashFlowService.getSummary({
        start_date: startDate as string,
        end_date: endDate as string,
        account_id: accountId as string,
        account_type: accountType as string,
      });

      res.json({ success: true, data: summary });
    } catch (e: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: e.message || 'Failed to calculate cash flow summary' },
      });
    }
  }

  async getTimeline(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate, accountId, accountType, page, limit } = req.query;

      const result = await cashFlowService.getTimeline({
        start_date: startDate as string,
        end_date: endDate as string,
        account_id: accountId as string,
        account_type: accountType as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 50,
      });

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      });
    } catch (e: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: e.message || 'Failed to fetch cash flow timeline' },
      });
    }
  }

  async getTrend(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate, accountId, accountType } = req.query;

      const points = await cashFlowService.getTrend({
        start_date: startDate as string,
        end_date: endDate as string,
        account_id: accountId as string,
        account_type: accountType as string,
      });

      res.json({ success: true, data: points });
    } catch (e: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: e.message || 'Failed to calculate cash flow trend' },
      });
    }
  }
}
