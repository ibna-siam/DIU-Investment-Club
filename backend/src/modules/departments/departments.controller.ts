import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { departmentsRepository } from './departments.repository';

const createDepartmentSchema = z.object({
  official_name: z.string().min(2, 'Official department name is required'),
  faculty: z.string().min(2, 'Faculty is required'),
  code: z.string().optional().nullable(),
  active: z.boolean().optional().default(true),
  sort_order: z.number().int().optional().default(0),
});

const updateDepartmentSchema = createDepartmentSchema.partial();

export class DepartmentsController {
  /**
   * Get list of active departments (cached, public / authenticated)
   */
  async getDepartments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { faculty, search } = req.query;
      const departments = await departmentsRepository.findAll({
        activeOnly: true,
        faculty: faculty as string | undefined,
        search: search as string | undefined,
      });

      // Browser/client cache header for 60 seconds
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      res.status(200).json({
        success: true,
        data: departments,
        total: departments.length,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin view: Get all departments including inactive
   */
  async getAllDepartments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { faculty, search } = req.query;
      const departments = await departmentsRepository.findAll({
        activeOnly: false,
        faculty: faculty as string | undefined,
        search: search as string | undefined,
      });

      res.status(200).json({
        success: true,
        data: departments,
        total: departments.length,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Get single department
   */
  async getDepartmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const dept = await departmentsRepository.findById(id);
      if (!dept) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Department not found' },
        });
        return;
      }
      res.status(200).json({ success: true, data: dept });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Super Admin: Create official department
   */
  async createDepartment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const val = createDepartmentSchema.safeParse(req.body);
      if (!val.success) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', details: val.error.flatten() },
        });
        return;
      }

      // Check for duplicate name
      const existing = await departmentsRepository.findByOfficialName(val.data.official_name);
      if (existing) {
        res.status(409).json({
          success: false,
          error: {
            code: 'CONFLICT',
            message: `Department "${val.data.official_name}" already exists.`,
          },
        });
        return;
      }

      const created = await departmentsRepository.create({
        official_name: val.data.official_name,
        faculty: val.data.faculty,
        code: val.data.code || undefined,
        active: val.data.active,
        sort_order: val.data.sort_order,
      });

      res.status(201).json({
        success: true,
        message: 'Department created successfully',
        data: created,
      });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Super Admin: Update department
   */
  async updateDepartment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const val = updateDepartmentSchema.safeParse(req.body);
      if (!val.success) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', details: val.error.flatten() },
        });
        return;
      }

      const existing = await departmentsRepository.findById(id);
      if (!existing) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Department not found' },
        });
        return;
      }

      if (val.data.official_name && val.data.official_name !== existing.official_name) {
        const nameConflict = await departmentsRepository.findByOfficialName(val.data.official_name);
        if (nameConflict && nameConflict.id !== id) {
          res.status(409).json({
            success: false,
            error: {
              code: 'CONFLICT',
              message: `Department name "${val.data.official_name}" already in use.`,
            },
          });
          return;
        }
      }

      const updated = await departmentsRepository.update(id, {
        official_name: val.data.official_name,
        faculty: val.data.faculty,
        code: val.data.code,
        active: val.data.active,
        sort_order: val.data.sort_order,
      });

      res.status(200).json({
        success: true,
        message: 'Department updated successfully',
        data: updated,
      });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Super Admin: Delete department (or deactivate)
   */
  async deleteDepartment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const existing = await departmentsRepository.findById(id);
      if (!existing) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Department not found' },
        });
        return;
      }

      await departmentsRepository.delete(id);
      res.status(200).json({
        success: true,
        message: 'Department deleted successfully',
      });
    } catch (err: any) {
      next(err);
    }
  }
}

export const departmentsController = new DepartmentsController();
