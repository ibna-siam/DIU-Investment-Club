import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { membershipTypesRepository } from './membership-types.repository';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository';

const createMembershipTypeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').trim(),
  description: z.string().optional().nullable(),
  joining_fee: z.coerce.number().nonnegative('Joining fee cannot be negative'),
  renewal_fee: z.coerce.number().nonnegative('Renewal fee cannot be negative'),
  billing_cycle: z.enum(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  is_active: z.boolean().optional(),
});

const updateMembershipTypeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').trim().optional(),
  description: z.string().optional().nullable(),
  joining_fee: z.coerce.number().nonnegative('Joining fee cannot be negative').optional(),
  renewal_fee: z.coerce.number().nonnegative('Renewal fee cannot be negative').optional(),
  billing_cycle: z.enum(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
  is_active: z.boolean().optional(),
});

export class MembershipTypesController {
  async getTypes(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const types = await membershipTypesRepository.findAll();
      res.status(200).json({ success: true, data: types });
    } catch (err) {
      next(err);
    }
  }

  async getTypeById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const type = await membershipTypesRepository.findById(id);
      if (!type) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Membership type not found' } });
        return;
      }
      res.status(200).json({ success: true, data: type });
    } catch (err) {
      next(err);
    }
  }

  async createType(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const val = createMembershipTypeSchema.safeParse(req.body);
      if (!val.success) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: val.error.flatten() } });
        return;
      }

      const created = await membershipTypesRepository.create(val.data);

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'MEMBERSHIP_TYPE_CREATED',
        module: 'membership_types',
        record_id: created.id,
        new_data: created,
      });

      res.status(201).json({ success: true, message: 'Membership type created successfully', data: created });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: err.message } });
    }
  }

  async updateType(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const val = updateMembershipTypeSchema.safeParse(req.body);
      if (!val.success) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: val.error.flatten() } });
        return;
      }

      const old = await membershipTypesRepository.findById(id);
      const updated = await membershipTypesRepository.update(id, val.data);
      if (!updated) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Membership type not found' } });
        return;
      }

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'MEMBERSHIP_TYPE_UPDATED',
        module: 'membership_types',
        record_id: id,
        old_data: old,
        new_data: updated,
      });

      res.status(200).json({ success: true, message: 'Membership type updated successfully', data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: err.message } });
    }
  }

  async deleteType(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const old = await membershipTypesRepository.findById(id);
      if (!old) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Membership type not found' } });
        return;
      }

      await membershipTypesRepository.delete(id);

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'MEMBERSHIP_TYPE_DELETED',
        module: 'membership_types',
        record_id: id,
        old_data: old,
      });

      res.status(200).json({ success: true, message: 'Membership type deleted successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: err.message } });
    }
  }
}

export const membershipTypesController = new MembershipTypesController();
