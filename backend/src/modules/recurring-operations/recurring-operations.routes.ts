import { Router } from 'express';
import { recurringOperationsController } from './recurring-operations.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Transactions
router.get(
  '/transactions',
  requirePermission('recurring_operations.read'),
  recurringOperationsController.getTransactions
);
router.get(
  '/transactions/:id',
  requirePermission('recurring_operations.read'),
  recurringOperationsController.getTransactionById
);
router.post(
  '/transactions',
  requirePermission('recurring_operations.manage'),
  recurringOperationsController.createTransaction
);
router.put(
  '/transactions/:id',
  requirePermission('recurring_operations.manage'),
  recurringOperationsController.updateTransaction
);
router.patch(
  '/transactions/:id/status',
  requirePermission('recurring_operations.manage'),
  recurringOperationsController.setTransactionStatus
);
router.post(
  '/transactions/process-due',
  requirePermission('recurring_operations.manage'),
  recurringOperationsController.processDueTransactions
);

// Tasks
router.get(
  '/tasks',
  requirePermission('recurring_operations.read'),
  recurringOperationsController.getTasks
);
router.get(
  '/tasks/:id',
  requirePermission('recurring_operations.read'),
  recurringOperationsController.getTaskById
);
router.post(
  '/tasks',
  requirePermission('recurring_operations.manage'),
  recurringOperationsController.createTask
);
router.put(
  '/tasks/:id',
  requirePermission('recurring_operations.manage'),
  recurringOperationsController.updateTask
);
router.patch(
  '/tasks/:id/status',
  requirePermission('recurring_operations.manage'),
  recurringOperationsController.setTaskStatus
);
router.post(
  '/tasks/process-due',
  requirePermission('recurring_operations.manage'),
  recurringOperationsController.processDueTasks
);

export default router;
