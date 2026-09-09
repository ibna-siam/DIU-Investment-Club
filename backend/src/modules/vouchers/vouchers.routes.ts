import { Router } from 'express';
import { vouchersController } from './vouchers.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('vouchers.read'), vouchersController.getVouchers);
router.get('/:id', requirePermission('vouchers.read'), vouchersController.getVoucherById);
router.post('/', requirePermission('vouchers.create'), vouchersController.createVoucher);
router.post('/:id/approve', requirePermission('vouchers.approve'), vouchersController.approveVoucher);
router.post('/:id/cancel', requirePermission('vouchers.approve'), vouchersController.cancelVoucher);

export default router;
