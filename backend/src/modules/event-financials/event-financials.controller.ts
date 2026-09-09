import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { eventFinancialsService } from './event-financials.service';

export class EventFinancialsController {
  async getSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const summary = await eventFinancialsService.getFinancialSummary(eventId);
      res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { message: error.message || 'Failed to get event financial summary' },
      });
    }
  }

  async getBudgetVsActual(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const comparison = await eventFinancialsService.getBudgetVsActual(eventId);
      res.json({
        success: true,
        data: comparison,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { message: error.message || 'Failed to get budget vs actual report' },
      });
    }
  }

  async getLedger(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const ledger = await eventFinancialsService.getEventLedger(eventId);
      res.json({
        success: true,
        data: ledger,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { message: error.message || 'Failed to get event ledger' },
      });
    }
  }
}

export const eventFinancialsController = new EventFinancialsController();
