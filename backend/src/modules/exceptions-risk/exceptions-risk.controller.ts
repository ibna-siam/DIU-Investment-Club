import { Request, Response } from 'express';
import { exceptionsRiskRepository } from './exceptions-risk.repository';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export class ExceptionsRiskController {
  // Financial Exceptions
  async listExceptions(req: Request, res: Response) {
    try {
      const { status, severity, exception_type, entity_type, page, limit } = req.query;
      const data = await exceptionsRiskRepository.listExceptions({
        status: status as any,
        severity: severity as any,
        exception_type: exception_type as any,
        entity_type: entity_type as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });
      return res.status(200).json({ success: true, ...data });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async resolveException(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { resolution_notes } = req.body;
      if (!resolution_notes) {
        return res.status(400).json({ success: false, error: { message: 'resolution_notes is required' } });
      }

      const ok = await exceptionsRiskRepository.resolveException(id, resolution_notes, req.user?.id || '');
      return res.status(200).json({ success: ok });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async scanExceptions(req: Request, res: Response) {
    try {
      const result = await exceptionsRiskRepository.scanAndDetectExceptions();
      return res.status(200).json({ success: true, ...result });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  // Risk Flags
  async listRiskFlags(req: Request, res: Response) {
    try {
      const { status, severity, flag_type, page, limit } = req.query;
      const data = await exceptionsRiskRepository.listRiskFlags({
        status: status as any,
        severity: severity as any,
        flag_type: flag_type as any,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });
      return res.status(200).json({ success: true, ...data });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async createRiskFlag(req: AuthenticatedRequest, res: Response) {
    try {
      const { flag_type, severity, target_entity, target_id, risk_score, title, description } = req.body;
      if (!flag_type || !target_entity || !title || !description) {
        return res.status(400).json({ success: false, error: { message: 'flag_type, target_entity, title, and description are required' } });
      }

      const flag = await exceptionsRiskRepository.createRiskFlag({
        flag_type,
        severity,
        target_entity,
        target_id,
        risk_score: risk_score ? Number(risk_score) : 50,
        title,
        description,
        flagged_by: req.user?.id,
      });

      return res.status(201).json({ success: true, data: flag });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async updateRiskFlagStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status, resolution_notes } = req.body;
      if (!status || !['OPEN', 'INVESTIGATING', 'DISMISSED', 'RESOLVED'].includes(status)) {
        return res.status(400).json({ success: false, error: { message: 'Valid status is required' } });
      }

      const ok = await exceptionsRiskRepository.updateRiskFlagStatus(
        id,
        status,
        resolution_notes || '',
        req.user?.id || ''
      );
      return res.status(200).json({ success: ok });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async getMetrics(req: Request, res: Response) {
    try {
      const metrics = await exceptionsRiskRepository.getMetrics();
      return res.status(200).json({ success: true, data: metrics });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }
}

export const exceptionsRiskController = new ExceptionsRiskController();
