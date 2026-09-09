import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { journalRepository } from './journal.repository';

const lineSchema = z.object({
  account_id: z.string().uuid(),
  description: z.string().optional().nullable(),
  debit_amount: z.number().min(0).default(0),
  credit_amount: z.number().min(0).default(0),
  subledger_type: z.enum(['MEMBER', 'SPONSOR', 'EVENT', 'OTHER']).optional().nullable(),
  subledger_id: z.string().optional().nullable(),
});

const createJournalSchema = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD required'),
  description: z.string().min(3),
  reference_type: z.string().optional().nullable(),
  reference_id: z.string().uuid().optional().nullable(),
  lines: z.array(lineSchema).min(2, 'Journal entry requires at least 2 lines'),
});

const updateJournalSchema = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description: z.string().min(3).optional(),
  lines: z.array(lineSchema).min(2).optional(),
});

const reverseJournalSchema = z.object({
  reason: z.string().min(5, 'A clear reason is required for journal reversal'),
});

export class JournalEntriesController {
  async getJournals(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as string | undefined;
      const startDate = req.query.start_date as string | undefined;
      const endDate = req.query.end_date as string | undefined;
      const referenceType = req.query.reference_type as string | undefined;
      const search = req.query.search as string | undefined;

      const journals = await journalRepository.findAll({
        status,
        start_date: startDate,
        end_date: endDate,
        reference_type: referenceType,
        search,
      });

      res.status(200).json({ success: true, data: journals });
    } catch (err) {
      next(err);
    }
  }

  async getJournalById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const journal = await journalRepository.findById(req.params.id);
      if (!journal) {
        res.status(404).json({ success: false, error: { message: 'Journal entry not found' } });
        return;
      }
      res.status(200).json({ success: true, data: journal });
    } catch (err) {
      next(err);
    }
  }

  async createDraft(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createJournalSchema.parse(req.body);
      const userId = req.user?.id || 'system';

      const journal = await journalRepository.createDraft(validated, userId);
      res.status(201).json({ success: true, message: 'Draft journal entry created', data: journal });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ success: false, error: { message: 'Validation failed', details: err.errors } });
        return;
      }
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }

  async updateDraft(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateJournalSchema.parse(req.body);
      const journal = await journalRepository.updateDraft(req.params.id, validated);
      res.status(200).json({ success: true, message: 'Journal entry updated', data: journal });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ success: false, error: { message: 'Validation failed', details: err.errors } });
        return;
      }
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }

  async deleteDraft(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await journalRepository.deleteDraft(req.params.id);
      res.status(200).json({ success: true, message: 'Draft journal entry deleted' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }

  async submitJournal(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const journal = await journalRepository.submit(req.params.id);
      res.status(200).json({ success: true, message: 'Journal entry submitted for approval', data: journal });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }

  async approveJournal(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const journal = await journalRepository.approve(req.params.id);
      res.status(200).json({ success: true, message: 'Journal entry approved', data: journal });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }

  async postJournal(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id || 'system';
      const result = await journalRepository.post(req.params.id, userId);
      res.status(200).json({ success: true, message: 'Journal entry posted to general ledger', data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }

  async reverseJournal(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reason } = reverseJournalSchema.parse(req.body);
      const userId = req.user?.id || 'system';

      const result = await journalRepository.reverse(req.params.id, userId, reason);
      res.status(200).json({
        success: true,
        message: 'Journal entry reversed with mirror inversion entry',
        data: result,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ success: false, error: { message: 'Validation failed', details: err.errors } });
        return;
      }
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }
}

export const journalController = new JournalEntriesController();
