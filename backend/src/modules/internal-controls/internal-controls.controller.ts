import { Request, Response } from 'express';
import { internalControlsRepository } from './internal-controls.repository';
import { sodService } from './sod.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export class InternalControlsController {
  async listRules(req: Request, res: Response) {
    try {
      const rules = await internalControlsRepository.listRules();
      return res.status(200).json({ success: true, data: rules });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async createRule(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, code, description, control_type, conditions, required_action, is_active } = req.body;
      if (!name || !code || !control_type) {
        return res.status(400).json({ success: false, error: { message: 'name, code, and control_type are required' } });
      }

      const rule = await internalControlsRepository.createRule({
        name,
        code,
        description,
        control_type,
        conditions: conditions || {},
        required_action: required_action || 'WARNING',
        is_active,
        created_by: req.user?.id,
      });

      if (!rule) {
        return res.status(500).json({ success: false, error: { message: 'Failed to create internal control rule' } });
      }

      return res.status(201).json({ success: true, data: rule });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async updateRule(req: AuthenticatedRequest, res: Response) {
    try {
      const rule = await internalControlsRepository.updateRule(req.params.id, req.body, req.user?.id);
      if (!rule) {
        return res.status(404).json({ success: false, error: { message: 'Rule not found or failed to update' } });
      }
      return res.status(200).json({ success: true, data: rule });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async toggleRule(req: AuthenticatedRequest, res: Response) {
    try {
      const rule = await internalControlsRepository.toggleRule(req.params.id, req.user?.id);
      if (!rule) {
        return res.status(404).json({ success: false, error: { message: 'Rule not found' } });
      }
      return res.status(200).json({ success: true, data: rule });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async deleteRule(req: AuthenticatedRequest, res: Response) {
    try {
      const ok = await internalControlsRepository.deleteRule(req.params.id, req.user?.id);
      return res.status(200).json({ success: ok });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async checkSodConflict(req: AuthenticatedRequest, res: Response) {
    try {
      const { requesterId, actorId, amount, module, recordId } = req.body;
      const result = await sodService.checkApprovalConflict({
        requesterId,
        actorId: actorId || req.user?.id || '',
        amount: amount ? Number(amount) : undefined,
        module,
        recordId,
      });
      return res.status(200).json({ success: true, data: result });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async recordOverride(req: AuthenticatedRequest, res: Response) {
    try {
      const { ruleCode, recordId, reason } = req.body;
      if (!ruleCode || !reason) {
        return res.status(400).json({ success: false, error: { message: 'ruleCode and reason are required' } });
      }

      await sodService.recordOverride({
        ruleCode,
        userId: req.user?.id || '',
        recordId,
        reason,
      });

      return res.status(200).json({ success: true, message: 'Override logged successfully' });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }
}

export const internalControlsController = new InternalControlsController();
