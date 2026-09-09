import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { decisionsRepository } from './decisions.repository';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository';

export class DecisionsController {
  async getDecisions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, decision_type, meeting_id } = req.query as Record<string, string>;
      const data = await decisionsRepository.getDecisions({
        status,
        decision_type,
        meeting_id,
      });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getDecisionById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await decisionsRepository.getDecisionById(id);
      if (!data) {
        res.status(404).json({ success: false, error: { message: 'Decision not found' } });
        return;
      }
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createDecision(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const decision = await decisionsRepository.createDecision({
        ...req.body,
        created_by: req.user?.id,
      });
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'DECISION_CREATED',
        module: 'decisions',
        record_id: decision.id,
        new_data: { title: decision.title, status: decision.status },
      });
      res.status(201).json({ success: true, data: decision });
    } catch (error) {
      next(error);
    }
  }

  async updateDecision(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const decision = await decisionsRepository.updateDecision(id, req.body);
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'DECISION_UPDATED',
        module: 'decisions',
        record_id: id,
        new_data: decision,
      });
      res.status(200).json({ success: true, data: decision });
    } catch (error) {
      next(error);
    }
  }

  async createActionItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const task = await decisionsRepository.createActionItemTask(id, {
        ...req.body,
        created_by: req.user?.id,
      });
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'ACTION_ITEM_CREATED',
        module: 'decisions',
        record_id: id,
        new_data: { task_id: task.id, title: task.title },
      });
      res.status(201).json({ success: true, data: task });
    } catch (error) {
      next(error);
    }
  }
}

export const decisionsController = new DecisionsController();
