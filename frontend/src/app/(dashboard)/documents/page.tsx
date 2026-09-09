'use client';

import React, { useEffect, useState, useRef } from 'react';
import { governanceService } from '../../../services/governance.service';
import { GovernanceDocument, DocumentCategory, DocumentVisibility } from '../../../types/governance';
import { useAuth } from '../../../hooks/useAuth';
import { DeleteConfirmModal } from '../../../components/common/DeleteConfirmModal';
import {
  optimizeFileBeforeUpload,
  validateDocumentFile,
  formatBytes,
  OptimizedFileResult,
} from '../../../utils/fileOptimizer';
import {
  FolderLock,
  FileText,
  Upload,
  Search,
  History,
  Download,
  Trash2,
  Archive,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  FileCheck,
  ArrowDownCircle,
  ExternalLink,
} from 'lucide-react';

export default function DocumentsPage() {
  const { user, hasPermission, hasRole } = useAuth();

  const [documents, setDocuments] = useState<GovernanceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'ARCHIVED' | 'TRASH'>('ACTIVE');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [selectedDocForVersion, setSelectedDocForVersion] = useState<GovernanceDocument | null>(null);

  // Deletion Modal
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    doc: GovernanceDocument | null;
    isPermanent: boolean;
  }>({
    isOpen: false,
    doc: null,
    isPermanent: false,
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // File Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<OptimizedFileResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Version State
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionOptimization, setVersionOptimization] = useState<OptimizedFileResult | null>(null);
  const [isVersionOptimizing, setIsVersionOptimizing] = useState(false);
  const [versionChangelog, setVersionChangelog] = useState('');
  const versionInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [newDoc, setNewDoc] = useState({
    title: '',
    description: '',
    category: 'POLICY_DOCUMENT' as DocumentCategory,
    visibility: 'PUBLIC_TO_MEMBERS' as DocumentVisibility,
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Permission Checks
  const canCreate = hasPermission('documents.create') || hasRole('SUPER_ADMIN') || hasRole('PRESIDENT');
  const canUpdate = hasPermission('documents.update') || hasRole('SUPER_ADMIN') || hasRole('PRESIDENT');
  const canDelete = hasPermission('documents.delete') || hasRole('SUPER_ADMIN') || hasRole('PRESIDENT');
  const canArchive = hasPermission('documents.archive') || hasRole('SUPER_ADMIN') || hasRole('PRESIDENT');

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await governanceService.getDocuments({
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
        status: activeTab === 'TRASH' ? undefined : activeTab,
        only_deleted: activeTab === 'TRASH',
        search: searchQuery || undefined,
      });
      setDocuments(data);
    } catch (err: any) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [activeTab, selectedCategory, searchQuery]);

  // Handle File Selection with Pre-Upload Optimization
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      setUploadFile(null);
      setOptimizationResult(null);
      return;
    }

    setUploadFile(file);
    setIsOptimizing(true);
    try {
      const optimized = await optimizeFileBeforeUpload(file);
      setOptimizationResult(optimized);
    } catch (err) {
      console.warn('Optimization error, continuing with original file:', err);
      setOptimizationResult({
        file,
        originalSize: file.size,
        optimizedSize: file.size,
        savingsBytes: 0,
        savingsPercent: 0,
        isOptimized: false,
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  // Handle Version File Select
  const handleVersionFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      setMessage({ type: 'error', text: validation.error || 'Invalid file' });
      return;
    }

    setVersionFile(file);
    setIsVersionOptimizing(true);
    try {
      const optimized = await optimizeFileBeforeUpload(file);
      setVersionOptimization(optimized);
    } catch (err) {
      setVersionOptimization({
        file,
        originalSize: file.size,
        optimizedSize: file.size,
        savingsBytes: 0,
        savingsPercent: 0,
        isOptimized: false,
      });
    } finally {
      setIsVersionOptimizing(false);
    }
  };

  // Upload Document to Supabase Storage
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile && !optimizationResult?.file) {
      setUploadError('Please select a valid document file to upload.');
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const targetFile = optimizationResult?.file || uploadFile!;
      const formData = new FormData();
      formData.append('file', targetFile);
      formData.append('title', newDoc.title);
      formData.append('category', newDoc.category);
      formData.append('visibility', newDoc.visibility);
      if (newDoc.description) {
        formData.append('description', newDoc.description);
      }
      if (optimizationResult) {
        formData.append('original_size', String(optimizationResult.originalSize));
        formData.append('optimized_size', String(optimizationResult.optimizedSize));
      }

      await governanceService.uploadDocument(formData);

      setMessage({
        type: 'success',
        text: `Document "${newDoc.title}" successfully uploaded and verified in storage!`,
      });
      setShowUploadModal(false);
      resetUploadForm();
      loadDocuments();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to upload document to storage' });
    } finally {
      setSaving(false);
    }
  };

  const resetUploadForm = () => {
    setNewDoc({
      title: '',
      description: '',
      category: 'POLICY_DOCUMENT',
      visibility: 'PUBLIC_TO_MEMBERS',
    });
    setUploadFile(null);
    setOptimizationResult(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Replace / Upload New Version
  const handleAddVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocForVersion) return;
    if (!versionFile && !versionOptimization?.file) {
      setMessage({ type: 'error', text: 'Please select a replacement file.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const targetFile = versionOptimization?.file || versionFile!;
      const formData = new FormData();
      formData.append('file', targetFile);
      formData.append('changelog', versionChangelog || `Version update`);
      if (versionOptimization) {
        formData.append('original_size', String(versionOptimization.originalSize));
        formData.append('optimized_size', String(versionOptimization.optimizedSize));
      }

      await governanceService.replaceDocument(selectedDocForVersion.id, formData);

      setMessage({
        type: 'success',
        text: `New version published for "${selectedDocForVersion.title}"!`,
      });

      // Refresh detail
      const detail = await governanceService.getDocumentById(selectedDocForVersion.id);
      setSelectedDocForVersion(detail);
      setVersionFile(null);
      setVersionOptimization(null);
      setVersionChangelog('');
      if (versionInputRef.current) versionInputRef.current.value = '';
      loadDocuments();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to upload replacement version' });
    } finally {
      setSaving(false);
    }
  };

  // Secure Signed Download URL
  const handleDownload = async (doc: GovernanceDocument) => {
    try {
      const res = await governanceService.getDownloadUrl(doc.id);
      if (res?.download_url) {
        window.open(res.download_url, '_blank');
      } else {
        throw new Error('Download URL not available');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to generate download URL' });
    }
  };

  // Archive / Restore
  const handleToggleArchive = async (doc: GovernanceDocument) => {
    try {
      if (doc.status === 'ARCHIVED') {
        await governanceService.restoreDocument(doc.id);
        setMessage({ type: 'success', text: `Document "${doc.title}" restored to Active.` });
      } else {
        await governanceService.archiveDocument(doc.id);
        setMessage({ type: 'success', text: `Document "${doc.title}" archived.` });
      }
      loadDocuments();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update document archive status' });
    }
  };

  // Restore Soft-Deleted Document
  const handleRestoreFromTrash = async (doc: GovernanceDocument) => {
    try {
      await governanceService.restoreDocument(doc.id);
      setMessage({ type: 'success', text: `Document "${doc.title}" restored from trash.` });
      loadDocuments();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to restore document' });
    }
  };

  // Confirm Delete Handler
  const handleConfirmDelete = async () => {
    if (!deleteModalState.doc) return;
    setDeleteLoading(true);
    try {
      await governanceService.deleteDocument(
        deleteModalState.doc.id,
        deleteModalState.isPermanent
      );
      setMessage({
        type: 'success',
        text: deleteModalState.isPermanent
          ? `Document "${deleteModalState.doc.title}" permanently purged from storage.`
          : `Document "${deleteModalState.doc.title}" moved to trash.`,
      });
      setDeleteModalState({ isOpen: false, doc: null, isPermanent: false });
      loadDocuments();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete document' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const getVisibilityBadge = (vis: string) => {
    switch (vis) {
      case 'PUBLIC_TO_MEMBERS':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">All Members</span>;
      case 'EXECUTIVE_ONLY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">Executive Board</span>;
      case 'TREASURER_ONLY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Treasurer Only</span>;
      case 'ADMIN_ONLY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">Super Admin</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300">Confidential</span>;
    }
  };

  const categories = [
    { label: 'All Documents', value: 'ALL' },
    { label: 'Constitution & Bylaws', value: 'CONSTITUTION' },
    { label: 'Policy & Regulatory', value: 'POLICY_DOCUMENT' },
    { label: 'Financial Audits', value: 'FINANCIAL_DOCUMENT' },
    { label: 'Meeting Minutes', value: 'MEETING_DOCUMENT' },
    { label: 'Events & Programs', value: 'EVENT_DOCUMENT' },
    { label: 'Sponsorship Agreements', value: 'SPONSORSHIP_DOCUMENT' },
    { label: 'Official Reports', value: 'REPORT' },
    { label: 'Certificates', value: 'CERTIFICATE' },
    { label: 'Other', value: 'OTHER' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold tracking-wider uppercase mb-1">
            <FolderLock className="w-4 h-4" />
            Institutional Knowledge Vault
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            Document Repository & Storage Optimization
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Role-gated repository with client-side image compression, multi-version ledger, signed downloads, and safe controlled deletion.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadDocuments}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-sm font-medium transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {canCreate && (
            <button
              onClick={() => {
                resetUploadForm();
                setShowUploadModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 transition"
            >
              <Upload className="w-4 h-4" />
              Upload Document
            </button>
          )}
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-xs hover:underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs (Active, Archived, Trash) */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
            activeTab === 'ACTIVE'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5" />
          Active Documents
        </button>
        <button
          onClick={() => setActiveTab('ARCHIVED')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
            activeTab === 'ARCHIVED'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          Archived Documents
        </button>
        {canDelete && (
          <button
            onClick={() => setActiveTab('TRASH')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
              activeTab === 'TRASH'
                ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Recycle Bin / Trash
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
          {categories.map((c) => (
            <button
              key={c.value}
              onClick={() => setSelectedCategory(c.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === c.value
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search document title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Documents Grid / Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base">
              {activeTab === 'ACTIVE'
                ? 'Active Repository Files'
                : activeTab === 'ARCHIVED'
                ? 'Archived Club Records'
                : 'Deleted Documents (Trash)'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Showing {documents.length} verified files</p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            Loading repository files...
          </div>
        ) : !documents.length ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30 text-indigo-400" />
            No documents found in {activeTab.toLowerCase()} status.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                  <th className="py-3.5 px-4 font-semibold">Document Title</th>
                  <th className="py-3.5 px-4 font-semibold">Category</th>
                  <th className="py-3.5 px-4 font-semibold">Access Tier</th>
                  <th className="py-3.5 px-4 font-semibold">Version & Size</th>
                  <th className="py-3.5 px-4 font-semibold">Uploaded By</th>
                  <th className="py-3.5 px-4 font-semibold">Date</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {documents.map((doc) => {
                  const hasSavings =
                    doc.original_size &&
                    doc.optimized_size &&
                    doc.original_size > doc.optimized_size;
                  const savingsPct = hasSavings
                    ? Math.round(
                        ((doc.original_size! - doc.optimized_size!) / doc.original_size!) * 100
                      )
                    : 0;

                  return (
                    <tr key={doc.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white flex items-center gap-2">
                          <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span>{doc.title}</span>
                        </div>
                        {doc.description && (
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-md">
                            {doc.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-mono text-slate-500">
                            {doc.file_name}
                          </span>
                          {hasSavings && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              ⚡ Optimized -{savingsPct}%
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {doc.category.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">{getVisibilityBadge(doc.visibility)}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-indigo-400 font-semibold">
                            v{doc.version_number}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {formatBytes(doc.optimized_size || doc.file_size)}
                          </span>
                        </div>
                        {hasSavings && (
                          <div className="text-[10px] text-slate-500 font-mono line-through">
                            was {formatBytes(doc.original_size!)}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {doc.uploader?.full_name || 'System / Admin'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Secure Download */}
                          <button
                            onClick={() => handleDownload(doc)}
                            className="p-1.5 bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition"
                            title="Download File via Signed URL"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Version History / Replace */}
                          {activeTab !== 'TRASH' && (
                            <button
                              onClick={() => {
                                setSelectedDocForVersion(doc);
                                setShowVersionModal(true);
                              }}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition"
                              title="Version History & Replacement"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Archive / Unarchive */}
                          {canArchive && activeTab !== 'TRASH' && (
                            <button
                              onClick={() => handleToggleArchive(doc)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition"
                              title={doc.status === 'ARCHIVED' ? 'Unarchive Document' : 'Archive Document'}
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Trash Tab: Restore */}
                          {activeTab === 'TRASH' && canDelete && (
                            <button
                              onClick={() => handleRestoreFromTrash(doc)}
                              className="p-1.5 bg-emerald-950/60 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg text-xs font-medium border border-emerald-800/40 transition"
                              title="Restore Document"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Button */}
                          {canDelete && (
                            <button
                              onClick={() =>
                                setDeleteModalState({
                                  isOpen: true,
                                  doc,
                                  isPermanent: activeTab === 'TRASH',
                                })
                              }
                              className="p-1.5 bg-rose-950/40 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg text-xs font-medium border border-rose-800/40 transition"
                              title={activeTab === 'TRASH' ? 'Permanently Delete' : 'Move to Trash'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Upload Document with Pre-Upload Optimization */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-400" />
              Upload Document to Storage
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Files are validated, automatically optimized on-the-fly, and saved securely to Supabase Storage with audit logging.
            </p>

            <form onSubmit={handleUploadDocument} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Investment Portfolio Risk Governance Policy 2026"
                  value={newDoc.title}
                  onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category *</label>
                  <select
                    value={newDoc.category}
                    onChange={(e) => setNewDoc({ ...newDoc, category: e.target.value as DocumentCategory })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="CONSTITUTION">Constitution & Bylaws</option>
                    <option value="POLICY_DOCUMENT">Policy & Rules</option>
                    <option value="FINANCIAL_DOCUMENT">Financial Audit</option>
                    <option value="MEETING_DOCUMENT">Meeting Minutes</option>
                    <option value="EVENT_DOCUMENT">Event Document</option>
                    <option value="SPONSORSHIP_DOCUMENT">Sponsorship Contract</option>
                    <option value="REPORT">Official Report</option>
                    <option value="CERTIFICATE">Certificate</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Access Tier *</label>
                  <select
                    value={newDoc.visibility}
                    onChange={(e) => setNewDoc({ ...newDoc, visibility: e.target.value as DocumentVisibility })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="PUBLIC_TO_MEMBERS">Public to All Members</option>
                    <option value="EXECUTIVE_ONLY">Executive Board Only</option>
                    <option value="TREASURER_ONLY">Treasurer Only</option>
                    <option value="ADMIN_ONLY">Super Admin Only</option>
                    <option value="PRIVATE">Confidential / Private</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description / Purpose</label>
                <textarea
                  rows={2}
                  placeholder="Summary of document purpose, legal authority, and revision notes..."
                  value={newDoc.description}
                  onChange={(e) => setNewDoc({ ...newDoc, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* File Dropzone & Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Document File (PDF, Word, Excel, CSV, Images) *
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                    uploadFile
                      ? 'border-indigo-500/50 bg-indigo-950/20'
                      : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileSelect}
                  />
                  <Upload className="w-6 h-6 mx-auto text-indigo-400 mb-2" />
                  <p className="text-xs font-medium text-white">
                    {uploadFile ? uploadFile.name : 'Click or drag file to upload'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Supported: PDF, DOCX, XLSX, CSV, JPG, PNG, WebP (Max 25 MB)
                  </p>
                </div>
              </div>

              {/* Live Optimization Banner */}
              {isOptimizing && (
                <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 flex items-center gap-2 text-xs text-indigo-300">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Optimizing and analyzing image dimensions...
                </div>
              )}

              {optimizationResult && !isOptimizing && (
                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Storage Optimization Analysis:
                    </span>
                    {optimizationResult.isOptimized ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Saved {optimizationResult.savingsPercent}% Space
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-700 text-slate-300">
                        Verified
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span>Original: {formatBytes(optimizationResult.originalSize)}</span>
                    <span>→</span>
                    <span className="text-white font-medium">
                      Optimized: {formatBytes(optimizationResult.optimizedSize)}
                    </span>
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !uploadFile}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Uploading to Storage...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload Document
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Version History & File Replacement */}
      {showVersionModal && selectedDocForVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-400" />
                  {selectedDocForVersion.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Version History & Modification Ledger • Current: v{selectedDocForVersion.version_number}
                </p>
              </div>
              <button
                onClick={() => setShowVersionModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Version List */}
            <div className="my-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Published Versions
              </h4>
              {selectedDocForVersion.versions?.map((ver) => (
                <div
                  key={ver.id}
                  className="bg-slate-800/40 border border-slate-800 rounded-xl p-3.5 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        v{ver.version_number}
                      </span>
                      <span className="text-xs font-medium text-white">{ver.file_name}</span>
                    </div>
                    <p className="text-xs text-slate-400">{ver.changelog || 'No changelog notes provided.'}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2">
                      <span>Published: {new Date(ver.created_at).toLocaleString()}</span>
                      {ver.uploader && <span>by {ver.uploader.full_name}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0 font-mono">
                    {formatBytes(ver.file_size)}
                  </span>
                </div>
              ))}
            </div>

            {/* Upload Replacement Revision Form */}
            {canUpdate && (
              <div className="pt-4 border-t border-slate-800">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Upload Replacement Revision (v{selectedDocForVersion.version_number + 1})
                </h4>
                <form onSubmit={handleAddVersion} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Revision Changelog Notes *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Updated Section 4.2 to reflect executive quorum amendments"
                      value={versionChangelog}
                      onChange={(e) => setVersionChangelog(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Replacement File *
                    </label>
                    <div
                      onClick={() => versionInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-700 hover:border-slate-600 rounded-xl p-3 text-center cursor-pointer bg-slate-800/40"
                    >
                      <input
                        ref={versionInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.jpg,.jpeg,.png,.webp"
                        onChange={handleVersionFileSelect}
                      />
                      <p className="text-xs text-white font-medium">
                        {versionFile ? versionFile.name : 'Select updated file to upload'}
                      </p>
                    </div>
                  </div>

                  {versionOptimization && (
                    <div className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700 text-xs text-slate-400 flex items-center justify-between">
                      <span>Size: {formatBytes(versionOptimization.optimizedSize)}</span>
                      {versionOptimization.isOptimized && (
                        <span className="text-emerald-400 font-semibold">
                          Optimized (-{versionOptimization.savingsPercent}%)
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowVersionModal(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={saving || !versionFile}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center gap-2"
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          Publish Revision
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reusable Safe Deletion Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, doc: null, isPermanent: false })}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
        title={deleteModalState.isPermanent ? 'Purge Document from Storage' : 'Move Document to Trash'}
        itemType="Document"
        recordName={deleteModalState.doc?.title || 'Selected Document'}
        isHighRisk={deleteModalState.isPermanent}
        impactWarning={
          deleteModalState.isPermanent
            ? 'This action will permanently delete this document and all its historical revisions from Supabase Storage and database tables. This cannot be undone.'
            : 'Moving this document to trash will hide it from normal club views. It can be restored from the Recycle Bin anytime.'
        }
        relatedRecordsWarning={
          deleteModalState.doc?.versions && deleteModalState.doc.versions.length > 1
            ? `Notice: This document contains ${deleteModalState.doc.versions.length} version revisions which will also be permanently deleted from storage.`
            : undefined
        }
        confirmButtonText={deleteModalState.isPermanent ? 'Permanently Delete' : 'Move to Trash'}
      />
    </div>
  );
}
