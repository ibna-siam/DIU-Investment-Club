import { Router } from 'express';
import { incomeCategoriesController } from './income-categories.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('income.read'), incomeCategoriesController.getCategories);
router.post('/', requirePermission('income.create'), incomeCategoriesController.createCategory);
router.patch('/:id', requirePermission('income.update'), incomeCategoriesController.updateCategory);
router.patch('/:id/status', requirePermission('income.update'), incomeCategoriesController.updateStatus);
router.delete('/:id', requirePermission('income.delete'), incomeCategoriesController.deleteCategory);

export default router;
