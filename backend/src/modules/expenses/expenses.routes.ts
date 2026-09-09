import { Router } from 'express';
import { expensesController } from './expenses.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('expenses.read'), expensesController.getExpenses);
router.post('/', requirePermission('expenses.create'), expensesController.createExpense);
router.get('/:id', requirePermission('expenses.read'), expensesController.getExpenseById);
router.patch('/:id', requirePermission('expenses.update'), expensesController.updateExpense);
router.post('/:id/submit', requirePermission('expenses.update'), expensesController.submitExpense);
router.post('/:id/pay', requirePermission('expenses.approve'), expensesController.payExpense);
router.post('/:id/cancel', requirePermission('expenses.update'), expensesController.cancelExpense);

export default router;
