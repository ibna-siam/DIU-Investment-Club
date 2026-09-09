import { Router } from 'express';
import { journalController } from './journal.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('journal_entries.read'), journalController.getJournals);
router.get('/:id', requirePermission('journal_entries.read'), journalController.getJournalById);
router.post('/', requirePermission('journal_entries.create'), journalController.createDraft);
router.patch('/:id', requirePermission('journal_entries.update'), journalController.updateDraft);
router.delete('/:id', requirePermission('journal_entries.update'), journalController.deleteDraft);
router.post('/:id/submit', requirePermission('journal_entries.update'), journalController.submitJournal);
router.post('/:id/approve', requirePermission('journal_entries.approve'), journalController.approveJournal);
router.post('/:id/post', requirePermission('journal_entries.post'), journalController.postJournal);
router.post('/:id/reverse', requirePermission('journal_entries.reverse'), journalController.reverseJournal);

export default router;
