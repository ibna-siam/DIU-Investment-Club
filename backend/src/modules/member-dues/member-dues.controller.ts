import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { memberDuesRepository } from './member-dues.repository';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository';
import { DueType } from '../../types';

const createDueSchema = z.object({
  member_id: z.string().uuid('Invalid member ID'),
  due_type: z.enum(['MEMBERSHIP_FEE', 'RENEWAL_FEE', 'MONTHLY_DUE', 'SPECIAL_DUE', 'EVENT_FEE', 'OTHER']),
  title: z.string().min(2, 'Title is required'),
  description: z.string().optional(),
  amount: z.number().positive('Amount must be greater than zero'),
  due_date: z.string().min(1, 'Due date is required'),
  membership_id: z.string().uuid().optional(),
});

const waiveDueSchema = z.object({
  reason: z.string().min(2, 'Waiver reason is required'),
});

export class MemberDuesController {
  async getDues(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { member_id, status, due_type, search, page, limit } = req.query;

      const result = await memberDuesRepository.findAll({
        member_id: member_id as string | undefined,
        status: status as string | undefined,
        due_type: due_type as string | undefined,
        search: search as string | undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 10,
      });

      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async getDueById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const due = await memberDuesRepository.findById(id);
      if (!due) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Due record not found' } });
        return;
      }
      res.status(200).json({ success: true, data: due });
    } catch (err) {
      next(err);
    }
  }

  async createDue(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const val = createDueSchema.safeParse(req.body);
      if (!val.success) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: val.error.flatten() } });
        return;
      }

      const created = await memberDuesRepository.create({
        ...val.data,
        due_type: val.data.due_type as DueType,
        created_by: req.user?.id,
      });

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'DUE_CREATED',
        module: 'member_dues',
        record_id: created.id,
        new_data: created,
      });

      res.status(201).json({ success: true, message: 'Member due created successfully', data: created });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: err.message } });
    }
  }

  async waiveDue(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const val = waiveDueSchema.safeParse(req.body);
      if (!val.success) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: val.error.flatten() } });
        return;
      }

      const old = await memberDuesRepository.findById(id);
      const updated = await memberDuesRepository.waive(id, req.user?.id || 'system', val.data.reason);

      if (!updated) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Due not found or could not be waived' } });
        return;
      }

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'DUE_WAIVED',
        module: 'member_dues',
        record_id: id,
        old_data: old,
        new_data: updated,
      });

      res.status(200).json({ success: true, message: 'Due obligation waived successfully', data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: err.message } });
    }
  }

  async cancelDue(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const old = await memberDuesRepository.findById(id);
      const updated = await memberDuesRepository.cancel(id, req.user?.id || 'system', req.body?.reason);

      if (!updated) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Due not found or could not be cancelled' } });
        return;
      }

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'MEMBER_DUE_CANCELLED',
        module: 'member_dues',
        record_id: id,
        old_data: old,
        new_data: updated,
      });

      res.status(200).json({ success: true, message: 'Due obligation cancelled successfully', data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: err.message } });
    }
  }
}

export const memberDuesController = new MemberDuesController();
