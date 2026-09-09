import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { expenseCategoriesRepository } from './expense-categories.repository';

const categorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters'),
  description: z.string().optional(),
});

const statusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export class ExpenseCategoriesController {
  async getCategories(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await expenseCategoriesRepository.findAll();
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
      const category = await expenseCategoriesRepository.create({ ...data, created_by: userId });
      res.status(201).json({
        success: true,
        message: 'Expense category created successfully',
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
      const updated = await expenseCategoriesRepository.update(id, data);
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
      const updated = await expenseCategoriesRepository.updateStatus(id, status);
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
      const category = await expenseCategoriesRepository.findById(id);
      if (!category) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } });
        return;
      }
      await expenseCategoriesRepository.delete(id);

      const { auditLogsRepository } = require('../audit-logs/audit-logs.repository');
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'EXPENSE_CATEGORY_DELETED',
        module: 'expenses',
        record_id: id,
        old_data: category,
      });

      res.status(200).json({ success: true, message: 'Category deleted successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: err.message } });
    }
  }
}

export const expenseCategoriesController = new ExpenseCategoriesController();
