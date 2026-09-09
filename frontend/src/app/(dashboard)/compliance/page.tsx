'use client';

import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  RefreshCw,
  FolderOpen,
  User,
  Calendar,
  Check,
  X,
  FileText,
} from 'lucide-react';
import { auditComplianceService } from '../../../services/audit-compliance.service';
import { ComplianceChecklist, ComplianceRequirement } from '../../../types/audit-compliance';

export default function ComplianceCenterPage() {
  const [checklists, setChecklists] = useState<ComplianceChecklist[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  // New checklist modal
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('FINANCIAL');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState('ANNUAL');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Update item modal
  const [activeItem, setActiveItem] = useState<ComplianceRequirement | null>(null);
  const [itemStatus, setItemStatus] = useState<string>('COMPLIANT');
  const [evidenceNotes, setEvidenceNotes] = useState('');

  const fetchChecklists = async () => {
    setLoading(true);
    try {
      const data = await auditComplianceService.listComplianceChecklists({
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
      });
      setChecklists(data);
    } catch (e) {
      console.error('Failed to load compliance checklists:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklists();
  }, [selectedCategory]);

  const handleCreateChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setSubmitting(true);
    try {
      await auditComplianceService.createComplianceChecklist({
        title,
        category,
        description,
        frequency,
        due_date: dueDate || undefined,
      });
      setShowModal(false);
      setTitle('');
      setDescription('');
      fetchChecklists();
    } catch (e: any) {
      alert(e.response?.data?.error?.message || 'Failed to create checklist');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;

    try {
      await auditComplianceService.updateComplianceRequirement(activeItem.id, {
        status: itemStatus,
        evidence_notes: evidenceNotes,
      });
      setActiveItem(null);
      fetchChecklists();
    } catch (e: any) {
      alert('Failed to update requirement status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              Module 6
            </span>
            <span className="text-xs text-muted-foreground">Statutory & Internal Audit Assurance</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">Compliance Management Center</h1>
          <p className="text-sm text-muted-foreground">
            Track multi-domain compliance checklists, assign responsibilities, record verification evidence, and audit statutory requirements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Checklist
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {['ALL', 'FINANCIAL', 'GOVERNANCE', 'EVENT', 'DOCUMENTATION', 'INTERNAL_POLICY'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              selectedCategory === cat
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-card text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Checklists Stream */}
      <div className="space-y-6">
        {loading ? (
          <div className="p-12 text-center bg-card rounded-xl border border-border text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
            Loading compliance checklists...
          </div>
        ) : checklists.length === 0 ? (
          <div className="p-12 text-center bg-card rounded-xl border border-border text-muted-foreground">
            No compliance checklists found in this category.
          </div>
        ) : (
          checklists.map((chk) => {
            const reqs = chk.requirements || [];
            const compliantCount = reqs.filter((r) => r.status === 'COMPLIANT' || r.status === 'NOT_APPLICABLE').length;
            const progress = reqs.length > 0 ? Math.round((compliantCount / reqs.length) * 100) : 0;

            return (
              <div key={chk.id} className="bg-card rounded-xl border border-border overflow-hidden shadow-xs">
                {/* Checklist Header */}
                <div className="p-5 border-b border-border bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                        {chk.category}
                      </span>
                      <h3 className="font-bold text-sm text-foreground">{chk.title}</h3>
                      <span className="text-xs text-muted-foreground">({chk.frequency})</span>
                    </div>
                    {chk.description && <p className="text-xs text-muted-foreground mt-1">{chk.description}</p>}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs font-semibold text-foreground">
                        {compliantCount} / {reqs.length} Compliant ({progress}%)
                      </span>
                      <div className="w-36 h-2 bg-muted rounded-full overflow-hidden mt-1 border border-border">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                        chk.status === 'COMPLIANT'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : chk.status === 'IN_PROGRESS'
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {chk.status}
                    </span>
                  </div>
                </div>

                {/* Requirements Table */}
                <div className="p-5">
                  <table className="w-full text-left text-xs">
                    <thead className="text-muted-foreground uppercase font-semibold border-b border-border">
                      <tr>
                        <th className="pb-2">Requirement</th>
                        <th className="pb-2">Responsible</th>
                        <th className="pb-2">Due Date</th>
                        <th className="pb-2">Evidence / Notes</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {reqs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-muted-foreground">
                            No specific requirements registered under this checklist.
                          </td>
                        </tr>
                      ) : (
                        reqs.map((req) => (
                          <tr key={req.id} className="hover:bg-muted/20">
                            <td className="py-2.5 font-medium text-foreground pr-3">{req.requirement}</td>
                            <td className="py-2.5 text-muted-foreground whitespace-nowrap">
                              {req.responsible_person_name || 'Executive Committee'}
                            </td>
                            <td className="py-2.5 font-mono text-muted-foreground whitespace-nowrap">
                              {req.due_date || '—'}
                            </td>
                            <td className="py-2.5 text-muted-foreground pr-3">
                              {req.evidence_notes || req.evidence_document_title || '—'}
                            </td>
                            <td className="py-2.5 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  req.status === 'COMPLIANT'
                                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                    : req.status === 'IN_PROGRESS'
                                    ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                    : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                }`}
                              >
                                {req.status}
                              </span>
                            </td>
                            <td className="py-2.5 text-right whitespace-nowrap">
                              <button
                                onClick={() => {
                                  setActiveItem(req);
                                  setItemStatus(req.status);
                                  setEvidenceNotes(req.evidence_notes || '');
                                }}
                                className="px-2 py-1 text-xs rounded-md border border-border hover:bg-muted font-medium text-foreground"
                              >
                                Update Status
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: New Checklist */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground">Create Compliance Checklist</h3>

            <form onSubmit={handleCreateChecklist} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">Checklist Title</label>
                <input
                  type="text"
                  placeholder="e.g. Annual Statutory Audit 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-muted-foreground uppercase mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
                  >
                    <option value="FINANCIAL">FINANCIAL</option>
                    <option value="GOVERNANCE">GOVERNANCE</option>
                    <option value="EVENT">EVENT</option>
                    <option value="DOCUMENTATION">DOCUMENTATION</option>
                    <option value="INTERNAL_POLICY">INTERNAL POLICY</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-muted-foreground uppercase mb-1">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
                  >
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="QUARTERLY">QUARTERLY</option>
                    <option value="ANNUAL">ANNUAL</option>
                    <option value="EVENT_BASED">EVENT BASED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Objectives and scope of compliance checklist..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-2 rounded-lg border border-border hover:bg-muted text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                >
                  {submitting ? 'Creating...' : 'Create Checklist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Requirement Item */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground">Update Requirement Compliance</h3>
            <p className="text-xs text-muted-foreground">{activeItem.requirement}</p>

            <form onSubmit={handleUpdateItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">Compliance Status</label>
                <select
                  value={itemStatus}
                  onChange={(e) => setItemStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
                >
                  <option value="COMPLIANT">COMPLIANT</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="NON_COMPLIANT">NON COMPLIANT</option>
                  <option value="NOT_APPLICABLE">NOT APPLICABLE</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">Evidence & Verification Notes</label>
                <textarea
                  rows={3}
                  placeholder="Record file reference, verification details, or voucher number..."
                  value={evidenceNotes}
                  onChange={(e) => setEvidenceNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setActiveItem(null)}
                  className="px-3 py-2 rounded-lg border border-border hover:bg-muted text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
