import { Router } from 'express';
import { departmentsController } from './departments.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

// Allow authenticated users to fetch active departments for dropdowns
router.get('/', authenticate, (req, res, next) => departmentsController.getDepartments(req, res, next));

// Super Admin endpoints for managing directory
router.get('/all', authenticate, requireRole('SUPER_ADMIN'), (req, res, next) =>
  departmentsController.getAllDepartments(req, res, next)
);

router.get('/:id', authenticate, requireRole('SUPER_ADMIN'), (req, res, next) =>
  departmentsController.getDepartmentById(req, res, next)
);

router.post('/', authenticate, requireRole('SUPER_ADMIN'), (req, res, next) =>
  departmentsController.createDepartment(req, res, next)
);

router.put('/:id', authenticate, requireRole('SUPER_ADMIN'), (req, res, next) =>
  departmentsController.updateDepartment(req, res, next)
);

router.patch('/:id', authenticate, requireRole('SUPER_ADMIN'), (req, res, next) =>
  departmentsController.updateDepartment(req, res, next)
);

router.delete('/:id', authenticate, requireRole('SUPER_ADMIN'), (req, res, next) =>
  departmentsController.deleteDepartment(req, res, next)
);

export default router;
