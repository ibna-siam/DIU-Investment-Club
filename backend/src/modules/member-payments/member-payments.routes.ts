import { Router } from 'express';
import { memberPaymentsController } from './member-payments.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('member_payments.read'), memberPaymentsController.getPayments);
router.post('/', requirePermission('member_payments.create'), memberPaymentsController.createPayment);
router.get('/receipt/:receiptNumber', requirePermission('receipts.read'), memberPaymentsController.getReceipt);
router.get('/:id', requirePermission('member_payments.read'), memberPaymentsController.getPaymentById);
router.post('/:id/verify', requirePermission('member_payments.verify'), memberPaymentsController.verifyPayment);
router.post('/:id/reject', requirePermission('member_payments.reject'), memberPaymentsController.rejectPayment);

export default router;
