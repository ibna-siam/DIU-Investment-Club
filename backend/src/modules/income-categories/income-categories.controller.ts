import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { incomeCategoriesRepository } from './income-categories.repository';

const categorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters'),
  description: z.string().optional(),
});

const statusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export class IncomeCategoriesController {
  async getCategories(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await incomeCategoriesRepository.findAll();
      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (err) {
      next(err);
    }
  }

  async createCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = categorySchema.parse(req.body);
      const userId = req.user?.id;
      const category = await incomeCategoriesRepository.create({ ...data, created_by: userId });
      res.status(201).json({
        success: true,
        message: 'Income category created successfully',
        data: category,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = categorySchema.partial().parse(req.body);
      const updated = await incomeCategoriesRepository.update(id, data);
      if (!updated) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } });
        return;
      }
      res.status(200).json({ success: true, message: 'Category updated successfully', data: updated });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = statusSchema.parse(req.body);
      const updated = await incomeCategoriesRepository.updateStatus(id, status);
      if (!updated) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } });
        return;
      }
      res.status(200).json({ success: true, message: `Status updated to ${status}`, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async deleteCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const category = await incomeCategoriesRepository.findById(id);
      if (!category) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } });
        return;
      }
      await incomeCategoriesRepository.delete(id);

      const { auditLogsRepository } = require('../audit-logs/audit-logs.repository');
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'INCOME_CATEGORY_DELETED',
        module: 'income',
        record_id: id,
        old_data: category,
      });

      res.status(200).json({ success: true, message: 'Category deleted successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: err.message } });
    }
  }
}

export const incomeCategoriesController = new IncomeCategoriesController();
