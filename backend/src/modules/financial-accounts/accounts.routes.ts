import { Router } from 'express';
import { accountsController } from './accounts.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('financial_accounts.read'), accountsController.getAccounts);
router.post('/', requirePermission('financial_accounts.create'), accountsController.createAccount);
router.get('/:id', requirePermission('financial_accounts.read'), accountsController.getAccountById);
router.patch('/:id', requirePermission('financial_accounts.update'), accountsController.updateAccount);
router.patch('/:id/status', requirePermission('financial_accounts.update'), accountsController.updateStatus);
router.get('/:id/transactions', requirePermission('financial_accounts.read'), accountsController.getAccountTransactions);

export default router;
