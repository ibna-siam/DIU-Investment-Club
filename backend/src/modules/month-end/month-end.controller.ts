import { Request, Response } from 'express';
import { monthEndRepository } from './month-end.repository';

export class MonthEndController {
  async getChecklists(req: Request, res: Response): Promise<void> {
    try {
      const { month_year } = req.query;
      const checklists = await monthEndRepository.getChecklists({
        month_year: month_year as string,
      });
      res.json({ success: true, data: checklists });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getChecklistById(req: Request, res: Response): Promise<void> {
    try {
      const checklist = await monthEndRepository.getChecklistById(req.params.id);
      if (!checklist) {
        res.status(404).json({ success: false, message: 'Checklist not found' });
        return;
      }
      res.json({ success: true, data: checklist });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getOrCreateCurrentMonth(req: Request, res: Response): Promise<void> {
    try {
      const monthYear = (req.query.month_year as string) || new Date().toISOString().substring(0, 7);
      const userId = (req as any).user?.id;
      const checklist = await monthEndRepository.getOrCreateChecklistForMonth(monthYear, userId);
      res.json({ success: true, data: checklist });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async runVerification(req: Request, res: Response): Promise<void> {
    try {
      const items = await monthEndRepository.runAutoVerification(req.params.id);
      res.json({ success: true, data: items, message: 'Auto-verification checks completed' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async toggleItem(req: Request, res: Response): Promise<void> {
    try {
      const { is_completed, notes } = req.body;
      const userId = (req as any).user?.id;
      const item = await monthEndRepository.toggleChecklistItem(
        req.params.itemId,
        is_completed,
        userId,
        notes
      );
      res.json({ success: true, data: item });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async completeChecklist(req: Request, res: Response): Promise<void> {
    try {
      const { notes } = req.body;
      const userId = (req as any).user?.id;
      const checklist = await monthEndRepository.completeChecklist(req.params.id, userId, notes);
      res.json({ success: true, data: checklist, message: 'Month-end checklist completed successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}

export const monthEndController = new MonthEndController();
