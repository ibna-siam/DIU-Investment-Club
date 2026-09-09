import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sponsorsRepository } from './sponsors.repository';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository';

const createSponsorSchema = z.object({
  name: z.string().min(2, 'Sponsor brand name is required'),
  organization_name: z.string().min(2, 'Organization legal name is required'),
  contact_person: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
});

const updateSponsorSchema = createSponsorSchema.partial();

export class SponsorsController {
  async getSponsors(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, search, page, limit } = req.query;

      const result = await sponsorsRepository.findAll({
        status: status as string | undefined,
        search: search as string | undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 10,
      });

      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async getSponsorById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const sponsor = await sponsorsRepository.findById(id);
      if (!sponsor) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Sponsor not found' } });
        return;
      }
      res.status(200).json({ success: true, data: sponsor });
    } catch (err) {
      next(err);
    }
  }

  async createSponsor(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const val = createSponsorSchema.safeParse(req.body);
      if (!val.success) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: val.error.flatten() } });
        return;
      }

      const created = await sponsorsRepository.create({
        ...val.data,
        email: val.data.email || undefined,
        created_by: req.user?.id,
      });

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'SPONSOR_CREATED',
        module: 'sponsors',
        record_id: created.id,
        new_data: created,
      });

      res.status(201).json({ success: true, message: 'Sponsor registered successfully', data: created });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: err.message } });
    }
  }

  async updateSponsor(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const val = updateSponsorSchema.safeParse(req.body);
      if (!val.success) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: val.error.flatten() } });
        return;
      }

      const old = await sponsorsRepository.findById(id);
      const updated = await sponsorsRepository.update(id, val.data);
      if (!updated) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Sponsor not found' } });
        return;
      }

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'SPONSOR_UPDATED',
        module: 'sponsors',
        record_id: id,
        old_data: old,
        new_data: updated,
      });

      res.status(200).json({ success: true, message: 'Sponsor updated successfully', data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: err.message } });
    }
  }
}

export const sponsorsController = new SponsorsController();
