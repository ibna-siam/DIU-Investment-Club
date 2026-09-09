import { Router } from 'express';
import { sponsorshipsController } from './sponsorships.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('sponsorships.read'), sponsorshipsController.getSponsorships);
router.post('/', requirePermission('sponsorships.create'), sponsorshipsController.createSponsorship);
router.get('/:id', requirePermission('sponsorships.read'), sponsorshipsController.getSponsorshipById);
router.post('/:id/payments', requirePermission('member_payments.create'), sponsorshipsController.recordPayment);
router.post('/payments/:paymentId/verify', requirePermission('sponsorship_payments.verify'), sponsorshipsController.verifyPayment);

export default router;
