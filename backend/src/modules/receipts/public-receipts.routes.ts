/**
 * Public Digital Receipts Routes
 *
 * GET /api/v1/public/receipts/:token
 * Unauthenticated public endpoint with sliding-window rate limiting.
 */

import { Router } from 'express';
import { publicReceiptsController } from './public-receipts.controller';
import { publicReceiptLimiter } from '../../middleware/rate-limit.middleware';

const router = Router();

// Apply dedicated public receipt rate limiter (60 req / 15 min / IP)
router.get('/:token', publicReceiptLimiter, (req, res, next) =>
  publicReceiptsController.getReceiptByToken(req, res, next)
);

export default router;
