import { Router } from 'express';
import { tasksController } from './tasks.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('tasks.read'), tasksController.getTasks);
router.post('/', requirePermission('tasks.create'), tasksController.createTask);
router.get('/:id', requirePermission('tasks.read'), tasksController.getTaskById);
router.put('/:id', requirePermission('tasks.update'), tasksController.updateTask);
router.patch('/:id', requirePermission('tasks.update'), tasksController.updateTask);
router.patch('/:id/status', requirePermission('tasks.update'), tasksController.updateTask);
router.post('/:id/comments', requirePermission('tasks.update'), tasksController.addComment);
router.delete('/:id', requirePermission('tasks.delete'), tasksController.deleteTask);

export default router;

