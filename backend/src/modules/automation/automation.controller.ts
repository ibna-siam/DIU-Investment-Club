import { Request, Response } from 'express';
import { automationRepository } from './automation.repository';
import { automationScheduler } from './automation.scheduler';
import { AutomationRuleStatus } from '../../types';

export class AutomationController {
  async getDashboardMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await automationRepository.getDashboardMetrics();
      res.json({ success: true, data: metrics });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getRules(req: Request, res: Response): Promise<void> {
    try {
      const { status, trigger_type } = req.query;
      const rules = await automationRepository.getRules({
        status: status as string,
        trigger_type: trigger_type as string,
      });
      res.json({ success: true, data: rules });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getRuleById(req: Request, res: Response): Promise<void> {
    try {
      const rule = await automationRepository.getRuleById(req.params.id);
      if (!rule) {
        res.status(404).json({ success: false, message: 'Automation rule not found' });
        return;
      }
      res.json({ success: true, data: rule });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async createRule(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const rule = await automationRepository.createRule(req.body, userId);
      res.status(201).json({ success: true, data: rule });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async updateRule(req: Request, res: Response): Promise<void> {
    try {
      const rule = await automationRepository.updateRule(req.params.id, req.body);
      res.json({ success: true, data: rule });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async toggleStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.body;
      if (!['ACTIVE', 'INACTIVE', 'PAUSED', 'ARCHIVED'].includes(status)) {
        res.status(400).json({ success: false, message: 'Invalid automation status' });
        return;
      }
      const rule = await automationRepository.setRuleStatus(req.params.id, status as AutomationRuleStatus);
      res.json({ success: true, data: rule });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async deleteRule(req: Request, res: Response): Promise<void> {
    try {
      await automationRepository.deleteRule(req.params.id);
      res.json({ success: true, message: 'Rule deleted successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const { rule_id, status, limit, offset } = req.query;
      const result = await automationRepository.getLogs({
        rule_id: rule_id as string,
        status: status as string,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      });
      res.json({ success: true, data: result.logs, total: result.total });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async executeRunner(req: Request, res: Response): Promise<void> {
    try {
      const result = await automationScheduler.runCycle();
      res.json({
        success: true,
        message: 'Automation cycle executed successfully',
        data: result,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

export const automationController = new AutomationController();
