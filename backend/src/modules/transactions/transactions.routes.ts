import { Router } from 'express';
import { transactionsController } from './transactions.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('financial_accounts.read'), transactionsController.getTransactions);
router.get('/:id', requirePermission('financial_accounts.read'), transactionsController.getTransactionById);

export default router;
