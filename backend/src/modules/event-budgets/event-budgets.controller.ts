import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { eventBudgetsService } from './event-budgets.service';

export class EventBudgetsController {
  async getByEventId(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const budget = await eventBudgetsService.getBudgetByEventId(eventId);
      res.json({
        success: true,
        data: budget,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { message: error.message || 'Failed to get event budget' },
      });
    }
  }

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { eventId } = req.params;

      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      const budget = await eventBudgetsService.createBudget(
        { ...req.body, event_id: eventId },
        userId
      );
      res.status(201).json({
        success: true,
        data: budget,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { message: error.message || 'Failed to create event budget' },
      });
    }
  }

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      const budget = await eventBudgetsService.updateBudget(id, req.body, userId);
      res.json({
        success: true,
        data: budget,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { message: error.message || 'Failed to update event budget' },
      });
    }
  }

  async submit(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      const result = await eventBudgetsService.submitBudget(id, userId);
      if (!result.success) {
        res.status(400).json({
          success: false,
          error: { message: result.error || 'Failed to submit budget for approval' },
        });
        return;
      }

      res.json({
        success: true,
        data: result.data,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { message: error.message || 'Failed to submit budget for approval' },
      });
    }
  }
}

export const eventBudgetsController = new EventBudgetsController();
