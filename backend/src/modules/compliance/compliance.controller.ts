import { Request, Response } from 'express';
import { complianceRepository } from './compliance.repository';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export class ComplianceController {
  async listChecklists(req: Request, res: Response) {
    try {
      const { category, status } = req.query;
      const lists = await complianceRepository.listChecklists({
        category: category as any,
        status: status as any,
      });
      return res.status(200).json({ success: true, data: lists });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async getChecklistById(req: Request, res: Response) {
    try {
      const list = await complianceRepository.getChecklistById(req.params.id);
      if (!list) {
        return res.status(404).json({ success: false, error: { message: 'Checklist not found' } });
      }
      return res.status(200).json({ success: true, data: list });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async createChecklist(req: AuthenticatedRequest, res: Response) {
    try {
      const { title, category, description, frequency, due_date } = req.body;
      if (!title || !category) {
        return res.status(400).json({ success: false, error: { message: 'title and category are required' } });
      }

      const list = await complianceRepository.createChecklist({
        title,
        category,
        description,
        frequency,
        due_date,
        created_by: req.user?.id,
      });

      return res.status(201).json({ success: true, data: list });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async addRequirement(req: AuthenticatedRequest, res: Response) {
    try {
      const { checklist_id, requirement, responsible_person_id, due_date, evidence_notes } = req.body;
      if (!checklist_id || !requirement) {
        return res.status(400).json({ success: false, error: { message: 'checklist_id and requirement are required' } });
      }

      const reqItem = await complianceRepository.addRequirement({
        checklist_id,
        requirement,
        responsible_person_id,
        due_date,
        evidence_notes,
      });

      return res.status(201).json({ success: true, data: reqItem });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async updateRequirement(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status, evidence_notes, evidence_document_id } = req.body;

      const reqItem = await complianceRepository.updateRequirement(id, {
        status,
        evidence_notes,
        evidence_document_id,
        verified_by: req.user?.id,
      });

      if (!reqItem) {
        return res.status(404).json({ success: false, error: { message: 'Requirement not found or failed to update' } });
      }

      return res.status(200).json({ success: true, data: reqItem });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async deleteChecklist(req: AuthenticatedRequest, res: Response) {
    try {
      const ok = await complianceRepository.deleteChecklist(req.params.id, req.user?.id);
      return res.status(200).json({ success: ok });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }
}

export const complianceController = new ComplianceController();
