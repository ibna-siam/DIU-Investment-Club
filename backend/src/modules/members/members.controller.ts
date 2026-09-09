import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { membersRepository } from './members.repository';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository';
import { emailEventBus } from '../email/email.events';
import { Member, MemberStatus } from '../../types';

const createMemberSchema = z.object({
  student_id: z.string().min(2, 'Student ID is required'),
  full_name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  batch: z.string().optional().nullable(),
  semester: z.string().optional().nullable(),
  membership_type_id: z.union([z.string().uuid(), z.literal(''), z.null()]).optional(),
  joined_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  user_id: z.string().uuid().optional().nullable(),
});

const updateMemberSchema = createMemberSchema.partial();

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'GRADUATED', 'LEFT', 'ARCHIVED']),
  reason: z.string().optional(),
});

export class MembersController {
  async getMembers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, department, batch, membership_status, membership_type_id, page, limit } = req.query;

      const result = await membersRepository.findAll({
        search: search as string | undefined,
        department: department as string | undefined,
        batch: batch as string | undefined,
        membership_status: membership_status as string | undefined,
        membership_type_id: membership_type_id as string | undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 10,
      });

      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async getMemberById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const member = await membersRepository.findById(id);
      if (!member) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } });
        return;
      }
      res.status(200).json({ success: true, data: member });
    } catch (err) {
      next(err);
    }
  }

  async createMember(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const val = createMemberSchema.safeParse(req.body);
      if (!val.success) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: val.error.flatten() } });
        return;
      }

      const created = await membersRepository.create({
        student_id: val.data.student_id.trim(),
        full_name: val.data.full_name.trim(),
        email: val.data.email.trim().toLowerCase(),
        phone: val.data.phone?.trim() || undefined,
        department: val.data.department?.trim() || undefined,
        batch: val.data.batch?.trim() || undefined,
        semester: val.data.semester?.trim() || undefined,
        membership_type_id: val.data.membership_type_id || undefined,
        joined_date: val.data.joined_date || undefined,
        notes: val.data.notes?.trim() || undefined,
        user_id: val.data.user_id || undefined,
        created_by: req.user?.id,
      });

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'MEMBER_CREATED',
        module: 'members',
        record_id: created.id,
        new_data: created,
      });

      // Emit MEMBER_CREATED domain event for automated welcome email to member.email
      try {
        emailEventBus.emitEvent({
          type: 'MEMBER_CREATED',
          payload: {
            memberId: created.id,
            memberCode: created.member_code,
            fullName: created.full_name,
            email: created.email,
            studentId: created.student_id,
            department: created.department || undefined,
            batch: created.batch || undefined,
            createdBy: req.user?.id,
          },
        });
      } catch (eventErr) {
        console.warn('⚠️ [MembersController] Could not emit MEMBER_CREATED event:', eventErr);
      }

      res.status(201).json({ success: true, message: 'Member registered successfully', data: created });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: err.message } });
    }
  }

  async updateMember(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const val = updateMemberSchema.safeParse(req.body);
      if (!val.success) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: val.error.flatten() } });
        return;
      }

      const old = await membersRepository.findById(id);
      const updatePayload: Partial<Member> = {
        ...(val.data.full_name ? { full_name: val.data.full_name.trim() } : {}),
        ...(val.data.student_id ? { student_id: val.data.student_id.trim() } : {}),
        ...(val.data.email ? { email: val.data.email.trim().toLowerCase() } : {}),
        ...(val.data.phone !== undefined ? { phone: val.data.phone } : {}),
        ...(val.data.department !== undefined ? { department: val.data.department } : {}),
        ...(val.data.batch !== undefined ? { batch: val.data.batch } : {}),
        ...(val.data.semester !== undefined ? { semester: val.data.semester } : {}),
        ...(val.data.membership_type_id !== undefined ? { membership_type_id: val.data.membership_type_id || null } : {}),
        ...(val.data.joined_date ? { joined_date: val.data.joined_date } : {}),
        ...(val.data.notes !== undefined ? { notes: val.data.notes } : {}),
        ...(val.data.user_id !== undefined ? { user_id: val.data.user_id } : {}),
      };
      const updated = await membersRepository.update(id, updatePayload);
      if (!updated) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } });
        return;
      }

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'MEMBER_UPDATED',
        module: 'members',
        record_id: id,
        old_data: old,
        new_data: updated,
      });

      res.status(200).json({ success: true, message: 'Member updated successfully', data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: err.message } });
    }
  }

  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const val = updateStatusSchema.safeParse(req.body);
      if (!val.success) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: val.error.flatten() } });
        return;
      }

      const old = await membersRepository.findById(id);
      if (!old) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } });
        return;
      }

      const updated = await membersRepository.updateStatus(id, val.data.status as MemberStatus);

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'MEMBER_STATUS_CHANGED',
        module: 'members',
        record_id: id,
        old_data: { status: old.membership_status },
        new_data: { status: val.data.status, reason: val.data.reason },
      });

      res.status(200).json({ success: true, message: `Member status changed to ${val.data.status}`, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: err.message } });
    }
  }

  async archiveMember(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await membersRepository.archive(id);

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'MEMBER_ARCHIVED',
        module: 'members',
        record_id: id,
        new_data: { status: 'ARCHIVED' },
      });

      res.status(200).json({ success: true, message: 'Member archived successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: err.message } });
    }
  }

  async reactivateMember(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updated = await membersRepository.unarchive(id);

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'MEMBER_REACTIVATED',
        module: 'members',
        record_id: id,
        new_data: { status: 'ACTIVE', archived_at: null },
      });

      res.status(200).json({ success: true, message: 'Member reactivated successfully', data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: err.message } });
    }
  }

  async getImpactSummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const summary = await membersRepository.getImpactSummary(id);
      res.status(200).json({ success: true, data: summary });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: err.message } });
    }
  }

  async removeMember(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { action, reason } = req.body;

      if (!['ARCHIVE', 'DEACTIVATE', 'HARD_DELETE'].includes(action)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Action must be ARCHIVE, DEACTIVATE, or HARD_DELETE' },
        });
        return;
      }

      const result = await membersRepository.removeMember(id, {
        action,
        reason,
        adminId: req.user?.id,
      });

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: action === 'HARD_DELETE' ? 'MEMBER_DELETED' : (action === 'ARCHIVE' ? 'MEMBER_ARCHIVED' : 'MEMBER_DEACTIVATED'),
        module: 'members',
        record_id: id,
        new_data: { action, reason, result },
      });

      res.status(200).json({ success: true, message: result.message, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'OPERATION_BLOCKED', message: err.message } });
    }
  }

  async deleteMember(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await membersRepository.removeMember(id, {
        action: 'ARCHIVE',
        adminId: req.user?.id,
      });

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'MEMBER_ARCHIVED',
        module: 'members',
        record_id: id,
        new_data: { reason: 'Safe deletion redirected to archive' },
      });

      res.status(200).json({ success: true, message: 'Member archived safely. Financial ledger preserved.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: err.message } });
    }
  }
}

export const membersController = new MembersController();

