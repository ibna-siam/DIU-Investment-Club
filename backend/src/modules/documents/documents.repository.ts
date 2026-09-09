import { getDbAdmin } from '../../config/supabase';
import { GovernanceDocument, DocumentVersionItem } from '../../types';

export class DocumentsRepository {
  /**
   * Upload a file buffer to Supabase Storage 'documents' bucket
   */
  async uploadFileToStorage(fileBuffer: Buffer, storagePath: string, mimeType: string): Promise<string> {
    const db = getDbAdmin();
    const { data, error } = await db.storage.from('documents').upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });
    if (error) {
      throw new Error(`Failed to upload file to storage: ${error.message}`);
    }
    return data.path;
  }

  /**
   * Delete a file from Supabase Storage 'documents' bucket
   */
  async deleteFileFromStorage(storagePath: string): Promise<void> {
    try {
      const db = getDbAdmin();
      const { error } = await db.storage.from('documents').remove([storagePath]);
      if (error) {
        console.warn(`[DocumentsRepository] Failed to delete file from storage (${storagePath}):`, error.message);
      }
    } catch (err: any) {
      console.warn(`[DocumentsRepository] Error removing storage object (${storagePath}):`, err?.message);
    }
  }

  /**
   * List documents with flexible status filtering and RBAC visibility checks
   */
  async getDocuments(params?: {
    category?: string;
    visibility?: string;
    status?: string;
    search?: string;
    userRole?: string;
    userId?: string;
    include_deleted?: boolean;
    only_deleted?: boolean;
  }): Promise<GovernanceDocument[]> {
    let query = getDbAdmin()
      .from('documents')
      .select('*, uploader:profiles(id, full_name, email)')
      .order('created_at', { ascending: false });

    if (params?.only_deleted) {
      query = query.eq('status', 'DELETED');
    } else if (params?.status) {
      query = query.eq('status', params.status);
    } else if (!params?.include_deleted) {
      query = query.eq('status', 'ACTIVE');
    }

    if (params?.category) {
      query = query.eq('category', params.category);
    }

    if (params?.visibility) {
      query = query.eq('visibility', params.visibility);
    }

    if (params?.search) {
      query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Filter visibility according to user role permissions
    // Super admin, President & General Secretary see everything
    const role = params?.userRole;
    if (role === 'SUPER_ADMIN' || role === 'PRESIDENT' || role === 'GENERAL_SECRETARY') {
      return data as GovernanceDocument[];
    }

    const filtered = (data || []).filter((doc: any) => {
      if (doc.visibility === 'PUBLIC_TO_MEMBERS') return true;
      if (doc.visibility === 'EXECUTIVE_ONLY' && (role === 'EXECUTIVE_MEMBER' || role === 'TREASURER' || role === 'EVENT_MANAGER')) return true;
      if (doc.visibility === 'TREASURER_ONLY' && role === 'TREASURER') return true;
      if (doc.visibility === 'ADMIN_ONLY' && (role === 'SUPER_ADMIN' || role === 'GENERAL_SECRETARY')) return true;
      if (doc.visibility === 'PRIVATE' && params?.userId && doc.uploaded_by === params.userId) return true;
      return false;
    });

    return filtered as GovernanceDocument[];
  }

  /**
   * Get single document by ID including full version history and uploader profiles
   */
  async getDocumentById(id: string): Promise<GovernanceDocument | null> {
    const { data, error } = await getDbAdmin()
      .from('documents')
      .select(`
        *,
        uploader:profiles(id, full_name, email),
        versions:document_versions(
          id, document_id, version_number, file_name, file_path, file_type, file_size, original_size, optimized_size, changelog, created_at,
          uploader:profiles(full_name, email)
        )
      `)
      .eq('id', id)
      .single();

    if (error) return null;
    return data as GovernanceDocument;
  }

  /**
   * Create document record and its initial version 1 entry
   */
  async createDocument(payload: {
    title: string;
    description?: string;
    category: string;
    file_name: string;
    file_path: string;
    file_type: string;
    file_size: number;
    original_size?: number;
    optimized_size?: number;
    original_file_name?: string;
    uploaded_by?: string;
    visibility?: string;
  }): Promise<GovernanceDocument> {
    const { data, error } = await getDbAdmin()
      .from('documents')
      .insert({
        title: payload.title,
        description: payload.description,
        category: payload.category,
        file_name: payload.file_name,
        file_path: payload.file_path,
        file_type: payload.file_type,
        file_size: payload.file_size,
        original_size: payload.original_size ?? payload.file_size,
        optimized_size: payload.optimized_size ?? payload.file_size,
        original_file_name: payload.original_file_name ?? payload.file_name,
        uploaded_by: payload.uploaded_by || null,
        visibility: payload.visibility || 'PUBLIC_TO_MEMBERS',
        status: 'ACTIVE',
        version_number: 1,
      })
      .select()
      .single();

    if (error) throw error;

    // Create initial version v1 in document_versions
    await getDbAdmin().from('document_versions').insert({
      document_id: data.id,
      version_number: 1,
      file_name: payload.file_name,
      file_path: payload.file_path,
      file_type: payload.file_type,
      file_size: payload.file_size,
      original_size: payload.original_size ?? payload.file_size,
      optimized_size: payload.optimized_size ?? payload.file_size,
      uploaded_by: payload.uploaded_by || null,
      changelog: 'Initial version uploaded',
    });

    return data as GovernanceDocument;
  }

  /**
   * Add a new version to an existing document
   */
  async addVersion(
    documentId: string,
    payload: {
      file_name: string;
      file_path: string;
      file_type: string;
      file_size: number;
      original_size?: number;
      optimized_size?: number;
      uploaded_by?: string;
      changelog?: string;
    }
  ): Promise<DocumentVersionItem> {
    const doc = await this.getDocumentById(documentId);
    if (!doc) throw new Error('Document not found');

    const nextVer = (doc.version_number || 1) + 1;

    // Insert new version
    const { data: verData, error: verErr } = await getDbAdmin()
      .from('document_versions')
      .insert({
        document_id: documentId,
        version_number: nextVer,
        file_name: payload.file_name,
        file_path: payload.file_path,
        file_type: payload.file_type,
        file_size: payload.file_size,
        original_size: payload.original_size ?? payload.file_size,
        optimized_size: payload.optimized_size ?? payload.file_size,
        uploaded_by: payload.uploaded_by || null,
        changelog: payload.changelog || `Updated to version ${nextVer}`,
      })
      .select()
      .single();

    if (verErr) throw verErr;

    // Update document record to latest version
    await getDbAdmin()
      .from('documents')
      .update({
        version_number: nextVer,
        file_name: payload.file_name,
        file_path: payload.file_path,
        file_type: payload.file_type,
        file_size: payload.file_size,
        original_size: payload.original_size ?? payload.file_size,
        optimized_size: payload.optimized_size ?? payload.file_size,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    return verData as DocumentVersionItem;
  }

  /**
   * Update document metadata
   */
  async updateDocument(id: string, payload: Partial<GovernanceDocument>): Promise<GovernanceDocument> {
    const { data, error } = await getDbAdmin()
      .from('documents')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as GovernanceDocument;
  }

  /**
   * Archive or unarchive document
   */
  async setArchiveStatus(id: string, status: 'ACTIVE' | 'ARCHIVED', userId?: string): Promise<void> {
    const updatePayload: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'ARCHIVED') {
      updatePayload.archived_at = new Date().toISOString();
      updatePayload.archived_by = userId || null;
    } else {
      updatePayload.archived_at = null;
      updatePayload.archived_by = null;
    }

    const { error } = await getDbAdmin()
      .from('documents')
      .update(updatePayload)
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Delete document - soft delete by default, permanent delete if specified
   */
  async deleteDocument(id: string, userId?: string, permanent: boolean = false): Promise<void> {
    const doc = await this.getDocumentById(id);
    if (!doc) throw new Error('Document not found');

    if (!permanent) {
      // Soft delete
      const { error } = await getDbAdmin()
        .from('documents')
        .update({
          status: 'DELETED',
          deleted_at: new Date().toISOString(),
          deleted_by: userId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    } else {
      // Permanent delete: Clean up all storage files first
      if (doc.file_path) {
        await this.deleteFileFromStorage(doc.file_path);
      }
      if (doc.versions && doc.versions.length > 0) {
        for (const ver of doc.versions) {
          if (ver.file_path && ver.file_path !== doc.file_path) {
            await this.deleteFileFromStorage(ver.file_path);
          }
        }
      }

      // Delete child versions first
      await getDbAdmin().from('document_versions').delete().eq('document_id', id);

      // Delete document
      const { error } = await getDbAdmin().from('documents').delete().eq('id', id);
      if (error) throw error;
    }
  }

  /**
   * Restore a soft-deleted document back to ACTIVE
   */
  async restoreDocument(id: string): Promise<void> {
    const { error } = await getDbAdmin()
      .from('documents')
      .update({
        status: 'ACTIVE',
        deleted_at: null,
        deleted_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Generate signed download URL for document, enforcing role visibility checks
   */
  async getDownloadSignedUrl(
    id: string,
    userRole?: string,
    userId?: string
  ): Promise<{ downloadUrl: string; fileName: string; fileType: string; document: GovernanceDocument }> {
    const doc = await this.getDocumentById(id);
    if (!doc) throw new Error('Document not found');

    // Visibility checks
    const role = userRole;
    const isSuper = role === 'SUPER_ADMIN' || role === 'PRESIDENT' || role === 'GENERAL_SECRETARY';
    if (!isSuper) {
      if (doc.visibility === 'EXECUTIVE_ONLY' && !(role === 'EXECUTIVE_MEMBER' || role === 'TREASURER' || role === 'EVENT_MANAGER')) {
        throw new Error('Access denied: You do not have permission to view this executive document');
      }
      if (doc.visibility === 'TREASURER_ONLY' && role !== 'TREASURER') {
        throw new Error('Access denied: You do not have permission to view this treasurer-restricted document');
      }
      if (doc.visibility === 'ADMIN_ONLY') {
        throw new Error('Access denied: You do not have permission to view this administrator document');
      }
      if (doc.visibility === 'PRIVATE' && (!userId || doc.uploaded_by !== userId)) {
        throw new Error('Access denied: This document is marked private and only accessible by its creator');
      }
    }

    const db = getDbAdmin();
    // Generate signed URL valid for 3600 seconds (1 hour)
    const { data, error } = await db.storage
      .from('documents')
      .createSignedUrl(doc.file_path, 3600, {
        download: doc.file_name,
      });

    if (error || !data?.signedUrl) {
      throw new Error(`Failed to generate signed download URL: ${error?.message || 'Storage error'}`);
    }

    return {
      downloadUrl: data.signedUrl,
      fileName: doc.file_name,
      fileType: doc.file_type,
      document: doc,
    };
  }
}

export const documentsRepository = new DocumentsRepository();
