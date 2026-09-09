import { Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { documentsRepository } from './documents.repository';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository';

export const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.docx',
  '.doc',
  '.xlsx',
  '.xls',
  '.csv',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
]);

export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const EXTENSION_MIME_MAP: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.doc': ['application/msword'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.xls': ['application/vnd.ms-excel'],
  '.csv': ['text/csv', 'text/plain', 'application/vnd.ms-excel'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.webp': ['image/webp'],
};

/**
 * Validates file signature (magic bytes) to prevent extension spoofing / polyglot attacks
 */
export function validateFileMagicBytes(buffer: Buffer, extension: string): boolean {
  if (!buffer || buffer.length < 4) return false;

  switch (extension) {
    case '.pdf':
      // %PDF- (0x25 0x50 0x44 0x46)
      return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;

    case '.png':
      // \x89PNG\r\n\x1a\n (0x89 0x50 0x4E 0x47)
      return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;

    case '.jpg':
    case '.jpeg':
      // \xFF\xD8\xFF
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

    case '.webp':
      // RIFF....WEBP
      if (buffer.length < 12) return false;
      return (
        buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
      );

    case '.docx':
    case '.xlsx':
      // Zip archive: PK\x03\x04
      return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;

    case '.doc':
    case '.xls':
      // OLE Compound File or Zip: 0xD0 0xCF 0x11 0xE0 or PK\x03\x04
      return (
        (buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0) ||
        (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04)
      );

    case '.csv':
      // Plain text: no null bytes in sample header
      const checkLength = Math.min(buffer.length, 1024);
      for (let i = 0; i < checkLength; i++) {
        if (buffer[i] === 0) return false;
      }
      return true;

    default:
      return false;
  }
}

/**
 * Validates uploaded file against path traversal, extension whitelists, MIME types, and magic bytes
 */
export function validateUploadedFile(file: Express.Multer.File): { valid: boolean; error?: string } {
  if (!file || !file.originalname) {
    return { valid: false, error: 'No file provided or missing original name' };
  }

  const baseName = path.basename(file.originalname);
  if (baseName !== file.originalname || file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
    return { valid: false, error: 'Invalid file name containing path traversal characters' };
  }

  const ext = path.extname(baseName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `Disallowed file extension '${ext}'. Allowed: .pdf, .docx, .doc, .xlsx, .xls, .csv, .jpg, .jpeg, .png, .webp` };
  }

  // Prevent dangerous double extensions (e.g. malicious.php.pdf)
  const segments = baseName.split('.');
  if (segments.length > 2) {
    const dangerousExtensions = ['exe', 'bat', 'cmd', 'sh', 'php', 'phtml', 'py', 'js', 'ts', 'vbs', 'scr', 'dll', 'com', 'jar', 'jsp', 'asp', 'aspx', 'cgi'];
    for (let i = 1; i < segments.length - 1; i++) {
      if (dangerousExtensions.includes(segments[i].toLowerCase())) {
        return { valid: false, error: `Dangerous nested extension detected: .${segments[i]}` };
      }
    }
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return { valid: false, error: `MIME type '${file.mimetype}' is not permitted.` };
  }

  const expectedMimes = EXTENSION_MIME_MAP[ext];
  if (expectedMimes && !expectedMimes.includes(file.mimetype) && file.mimetype !== 'application/octet-stream') {
    return { valid: false, error: `MIME type mismatch: extension '${ext}' does not match content type '${file.mimetype}'` };
  }

  if (!validateFileMagicBytes(file.buffer, ext)) {
    return { valid: false, error: `File content signature (magic bytes) does not match expected format for extension '${ext}'` };
  }

  return { valid: true };
}

// Configure multer for in-memory handling with 25MB max size
export const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error(`Unsupported file type or extension. Allowed types: PDF, DOC/DOCX, XLS/XLSX, CSV, JPG, PNG, WebP.`));
      return;
    }
    cb(null, true);
  },
});

function sanitizeFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_');
}

export class DocumentsController {
  async getDocuments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category, visibility, status, search, include_deleted, only_deleted } = req.query as Record<string, string>;
      const userRole = req.user?.roles?.[0]?.slug;
      const userId = req.user?.id;
      const data = await documentsRepository.getDocuments({
        category,
        visibility,
        status,
        search,
        userRole,
        userId,
        include_deleted: include_deleted === 'true',
        only_deleted: only_deleted === 'true',
      });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getDocumentById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await documentsRepository.getDocumentById(id);
      if (!data) {
        res.status(404).json({ success: false, error: { message: 'Document not found' } });
        return;
      }
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload a new document file to Supabase Storage and register database record
   */
  async uploadDocument(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ success: false, error: { message: 'No document file provided in form-data' } });
        return;
      }

      const validation = validateUploadedFile(file);
      if (!validation.valid) {
        res.status(400).json({ success: false, error: { message: validation.error } });
        return;
      }

      const { title, description, category, visibility, original_size, optimized_size } = req.body;
      if (!title || !category) {
        res.status(400).json({ success: false, error: { message: 'Title and Category are required' } });
        return;
      }

      const safeOriginalName = file.originalname || 'uploaded_document';
      const cleanName = sanitizeFileName(safeOriginalName);
      const storageKey = `governance/${Date.now()}_${cleanName}`;

      // Upload file buffer to Supabase Storage
      const storagePath = await documentsRepository.uploadFileToStorage(
        file.buffer,
        storageKey,
        file.mimetype
      );

      // Create document in database
      const parsedOriginalSize = original_size ? parseInt(original_size, 10) : file.size;
      const parsedOptimizedSize = optimized_size ? parseInt(optimized_size, 10) : file.size;

      const doc = await documentsRepository.createDocument({
        title,
        description,
        category,
        file_name: cleanName,
        file_path: storagePath,
        file_type: file.mimetype,
        file_size: file.size,
        original_size: parsedOriginalSize,
        optimized_size: parsedOptimizedSize,
        original_file_name: safeOriginalName,
        uploaded_by: req.user?.id,
        visibility: visibility || 'PUBLIC_TO_MEMBERS',
      });

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'DOCUMENT_UPLOADED',
        module: 'documents',
        record_id: doc.id,
        new_data: {
          title: doc.title,
          category: doc.category,
          file_name: doc.file_name,
          original_size: parsedOriginalSize,
          optimized_size: parsedOptimizedSize,
          storage_path: storagePath,
        },
      });

      res.status(201).json({ success: true, data: doc });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Replace or upload new version of document file
   */
  async replaceDocument(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const file = req.file;
      if (!file) {
        res.status(400).json({ success: false, error: { message: 'No replacement file provided' } });
        return;
      }

      const validation = validateUploadedFile(file);
      if (!validation.valid) {
        res.status(400).json({ success: false, error: { message: validation.error } });
        return;
      }

      const doc = await documentsRepository.getDocumentById(id);
      if (!doc) {
        res.status(404).json({ success: false, error: { message: 'Document not found' } });
        return;
      }

      const { changelog, original_size, optimized_size } = req.body;
      const safeOriginalName = file.originalname || 'document_update';
      const cleanName = sanitizeFileName(safeOriginalName);
      const storageKey = `governance/${Date.now()}_v${(doc.version_number || 1) + 1}_${cleanName}`;

      const storagePath = await documentsRepository.uploadFileToStorage(
        file.buffer,
        storageKey,
        file.mimetype
      );

      const parsedOriginalSize = original_size ? parseInt(original_size, 10) : file.size;
      const parsedOptimizedSize = optimized_size ? parseInt(optimized_size, 10) : file.size;

      const newVersion = await documentsRepository.addVersion(id, {
        file_name: cleanName,
        file_path: storagePath,
        file_type: file.mimetype,
        file_size: file.size,
        original_size: parsedOriginalSize,
        optimized_size: parsedOptimizedSize,
        uploaded_by: req.user?.id,
        changelog: changelog || `Uploaded updated version`,
      });

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'DOCUMENT_VERSION_CREATED',
        module: 'documents',
        record_id: id,
        new_data: {
          version_number: newVersion.version_number,
          file_name: newVersion.file_name,
          original_size: parsedOriginalSize,
          optimized_size: parsedOptimizedSize,
          storage_path: storagePath,
        },
      });

      res.status(201).json({ success: true, data: newVersion });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get secure signed download URL for document file
   */
  async getDownloadUrl(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userRole = req.user?.roles?.[0]?.slug;
      const userId = req.user?.id;

      const result = await documentsRepository.getDownloadSignedUrl(id, userRole, userId);

      res.status(200).json({
        success: true,
        data: {
          download_url: result.downloadUrl,
          file_name: result.fileName,
          file_type: result.fileType,
          title: result.document.title,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateDocument(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const doc = await documentsRepository.updateDocument(id, req.body);
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'DOCUMENT_UPDATED',
        module: 'documents',
        record_id: id,
        new_data: doc,
      });
      res.status(200).json({ success: true, data: doc });
    } catch (error) {
      next(error);
    }
  }

  async archiveDocument(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await documentsRepository.setArchiveStatus(id, 'ARCHIVED', req.user?.id);
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'DOCUMENT_ARCHIVED',
        module: 'documents',
        record_id: id,
      });
      res.status(200).json({ success: true, message: 'Document archived successfully' });
    } catch (error) {
      next(error);
    }
  }

  async restoreDocument(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await documentsRepository.restoreDocument(id);
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'DOCUMENT_RESTORED',
        module: 'documents',
        record_id: id,
      });
      res.status(200).json({ success: true, message: 'Document restored to active status' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete document - soft delete by default, permanent if permanent=true
   */
  async deleteDocument(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const isPermanent = req.query.permanent === 'true';

      const existing = await documentsRepository.getDocumentById(id);
      if (!existing) {
        res.status(404).json({ success: false, error: { message: 'Document not found' } });
        return;
      }

      await documentsRepository.deleteDocument(id, req.user?.id, isPermanent);

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: isPermanent ? 'DOCUMENT_PERMANENTLY_DELETED' : 'DOCUMENT_SOFT_DELETED',
        module: 'documents',
        record_id: id,
        old_data: {
          title: existing.title,
          file_name: existing.file_name,
          category: existing.category,
          storage_path: existing.file_path,
        },
      });

      res.status(200).json({
        success: true,
        message: isPermanent ? 'Document permanently deleted and purged from storage' : 'Document moved to trash (soft deleted)',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const documentsController = new DocumentsController();
