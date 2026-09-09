import { Router } from 'express';
import { expenseCategoriesController } from './expense-categories.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('expenses.read'), expenseCategoriesController.getCategories);
router.post('/', requirePermission('expenses.create'), expenseCategoriesController.createCategory);
router.patch('/:id', requirePermission('expenses.update'), expenseCategoriesController.updateCategory);
router.patch('/:id/status', requirePermission('expenses.update'), expenseCategoriesController.updateStatus);
router.delete('/:id', requirePermission('expenses.delete'), expenseCategoriesController.deleteCategory);

export default router;
