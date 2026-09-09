import { Router } from 'express';
import { documentsController, documentUpload } from './documents.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Document Listing & Retrieval
router.get('/', requirePermission('documents.read'), (req, res, next) => documentsController.getDocuments(req, res, next));
router.get('/:id', requirePermission('documents.read'), (req, res, next) => documentsController.getDocumentById(req, res, next));
router.get('/:id/download', requirePermission('documents.read'), (req, res, next) => documentsController.getDownloadUrl(req, res, next));

// File Upload & Replace
router.post('/upload', requirePermission('documents.create'), documentUpload.single('file'), (req, res, next) => documentsController.uploadDocument(req, res, next));
router.post('/:id/replace', requirePermission('documents.update'), documentUpload.single('file'), (req, res, next) => documentsController.replaceDocument(req, res, next));

// Document Metadata Updates & Archiving
router.put('/:id', requirePermission('documents.update'), (req, res, next) => documentsController.updateDocument(req, res, next));
router.post('/:id/archive', requirePermission('documents.archive'), (req, res, next) => documentsController.archiveDocument(req, res, next));
router.post('/:id/restore', requirePermission('documents.archive'), (req, res, next) => documentsController.restoreDocument(req, res, next));

// Safe Controlled Deletion (Soft Delete or Permanent Trash Purge)
router.delete('/:id', requirePermission('documents.delete'), (req, res, next) => documentsController.deleteDocument(req, res, next));

export default router;
