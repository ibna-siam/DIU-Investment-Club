import { Router } from 'express';
import { incomeController } from './income.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('income.read'), incomeController.getIncomes);
router.post('/', requirePermission('income.create'), incomeController.createIncome);
router.get('/:id', requirePermission('income.read'), incomeController.getIncomeById);
router.patch('/:id', requirePermission('income.update'), incomeController.updateIncome);
router.post('/:id/complete', requirePermission('income.update'), incomeController.completeIncome);
router.post('/:id/cancel', requirePermission('income.update'), incomeController.cancelIncome);

export default router;
