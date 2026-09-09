import { Router } from 'express';
import { coaController } from './coa.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('chart_of_accounts.read'), coaController.getAccounts);
router.get('/hierarchy', requirePermission('chart_of_accounts.read'), coaController.getHierarchy);
router.get('/:id', requirePermission('chart_of_accounts.read'), coaController.getAccountById);
router.post('/', requirePermission('chart_of_accounts.create'), coaController.createAccount);
router.patch('/:id', requirePermission('chart_of_accounts.update'), coaController.updateAccount);
router.delete('/:id', requirePermission('chart_of_accounts.delete'), coaController.deleteAccount);

export default router;
