'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  MessageSquare,
  Bell,
  Plus,
  RefreshCw,
  Eye,
  Sliders,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import { auditComplianceService } from '../../../services/audit-compliance.service';
import { CommunicationTemplate } from '../../../types/audit-compliance';

export default function CommunicationTemplatesPage() {
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');

  // Preview & Test state
  const [activeTemplate, setActiveTemplate] = useState<CommunicationTemplate | null>(null);
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({
    member_name: 'Tanvir Ahmed',
    amount: '1,500.00',
    receipt_number: 'REC-2026-0042',
    payment_date: '2026-09-07',
    purpose: 'Executive Club Membership Dues',
    meeting_title: 'Q3 Financial Review & Audit Preparation',
    meeting_date: 'Sept 15, 2026',
    meeting_time: '4:00 PM',
    venue: 'Daffodil Smart City, Club Lounge',
    due_date: 'Sept 30, 2026',
    task_title: 'Prepare Bank Statement Reconciliation',
    assigned_by: 'Treasurer',
    priority: 'HIGH',
    request_title: 'Annual Tech Summit AV Equipment',
    requester_name: 'Event Convener',
    approver_name: 'President',
  });
  const [renderedPreview, setRenderedPreview] = useState<string>('');

  // New template modal
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<'EMAIL' | 'SMS' | 'NOTIFICATION'>('EMAIL');
  const [subject, setSubject] = useState('');
  const [bodyTemplate, setBodyTemplate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await auditComplianceService.listTemplates();
      setTemplates(data);
      if (data.length > 0 && !activeTemplate) {
        setActiveTemplate(data[0]);
      }
    } catch (e) {
      console.error('Failed to load communication templates:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (activeTemplate) {
      const preview = auditComplianceService.previewTemplate(activeTemplate.body_template, previewVars);
      preview.then((res) => setRenderedPreview(res));
    }
  }, [activeTemplate, previewVars]);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || !bodyTemplate) return;

    setSubmitting(true);
    try {
      await auditComplianceService.createTemplate({
        code,
        name,
        channel,
        subject: channel === 'EMAIL' ? subject : undefined,
        body_template: bodyTemplate,
      });
      setShowModal(false);
      setCode('');
      setName('');
      setSubject('');
      setBodyTemplate('');
      fetchTemplates();
    } catch (e: any) {
      alert(e.response?.data?.error?.message || 'Failed to create template');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTemplates = templates.filter((t) =>
    selectedChannel === 'ALL' ? true : t.channel === selectedChannel
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
              Module 11
            </span>
            <span className="text-xs text-muted-foreground">Notification & Communication Engine</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">Communication Templates</h1>
          <p className="text-sm text-muted-foreground">
            Manage standardized multi-channel messaging templates with dynamic token replacement for Email, SMS, and In-App alerts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </button>
        </div>
      </div>

      {/* Channel Tabs */}
      <div className="flex gap-2">
        {['ALL', 'EMAIL', 'SMS', 'NOTIFICATION'].map((ch) => (
          <button
            key={ch}
            onClick={() => setSelectedChannel(ch)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              selectedChannel === ch
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-card text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            {ch}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Templates List */}
        <div className="lg:col-span-5 space-y-3">
          {loading ? (
            <div className="p-8 text-center bg-card rounded-xl border border-border text-muted-foreground text-xs">
              Loading templates...
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="p-8 text-center bg-card rounded-xl border border-border text-muted-foreground text-xs">
              No templates found for this channel.
            </div>
          ) : (
            filteredTemplates.map((tpl) => (
              <div
                key={tpl.id}
                onClick={() => setActiveTemplate(tpl)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  activeTemplate?.id === tpl.id
                    ? 'border-primary bg-primary/5 shadow-xs'
                    : 'border-border bg-card hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {tpl.channel === 'EMAIL' && <Mail className="w-4 h-4 text-blue-500" />}
                    {tpl.channel === 'SMS' && <MessageSquare className="w-4 h-4 text-emerald-500" />}
                    {tpl.channel === 'NOTIFICATION' && <Bell className="w-4 h-4 text-amber-500" />}
                    <h3 className="font-semibold text-xs text-foreground">{tpl.name}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground">
                    {tpl.code}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{tpl.body_template}</p>

                <div className="flex flex-wrap gap-1 mt-2">
                  {(tpl.variables || []).slice(0, 3).map((v) => (
                    <span key={v} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted/60 text-muted-foreground">
                      {`{{${v}}}`}
                    </span>
                  ))}
                  {(tpl.variables || []).length > 3 && (
                    <span className="text-[10px] text-muted-foreground self-center">
                      +{(tpl.variables || []).length - 3} more
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right: Live Preview & Token Inspector */}
        <div className="lg:col-span-7 bg-card rounded-xl border border-border p-5 shadow-xs space-y-4">
          {activeTemplate ? (
            <>
              <div className="border-b border-border pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Live Template Token Preview
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Channel: <span className="font-semibold">{activeTemplate.channel}</span> | Code: {activeTemplate.code}
                  </p>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  Active
                </span>
              </div>

              {activeTemplate.subject && (
                <div className="p-3 bg-muted/30 rounded-lg text-xs space-y-1">
                  <span className="font-semibold text-muted-foreground uppercase text-[10px]">Email Subject:</span>
                  <p className="font-bold text-foreground">{activeTemplate.subject}</p>
                </div>
              )}

              {/* Rendered Preview Box */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Rendered Output:</span>
                <div className="p-4 rounded-xl border border-border bg-background text-xs whitespace-pre-wrap font-sans leading-relaxed text-foreground shadow-inner">
                  {renderedPreview}
                </div>
              </div>

              {/* Raw Template Source */}
              <div className="space-y-1.5 pt-2 border-t border-border">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Raw Template Markup:</span>
                <pre className="p-3 rounded-lg bg-muted/60 text-[11px] font-mono text-muted-foreground whitespace-pre-wrap overflow-x-auto">
                  {activeTemplate.body_template}
                </pre>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-muted-foreground text-xs">
              Select a template on the left to preview dynamic variable output.
            </div>
          )}
        </div>
      </div>

      {/* Create Template Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground">Create Communication Template</h3>

            <form onSubmit={handleCreateTemplate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-muted-foreground uppercase mb-1">Channel</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
                  >
                    <option value="EMAIL">EMAIL</option>
                    <option value="SMS">SMS</option>
                    <option value="NOTIFICATION">NOTIFICATION</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-muted-foreground uppercase mb-1">Template Code</label>
                  <input
                    type="text"
                    placeholder="e.g. EVENT_INVITE"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">Friendly Name</label>
                <input
                  type="text"
                  placeholder="e.g. Annual Summit Invitation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
              </div>

              {channel === 'EMAIL' && (
                <div>
                  <label className="block font-semibold text-muted-foreground uppercase mb-1">Subject Line</label>
                  <input
                    type="text"
                    placeholder="e.g. Invitation: {{event_name}} on {{event_date}}"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">
                  Body Template (Use &#123;&#123;variable&#125;&#125; for dynamic tokens)
                </label>
                <textarea
                  rows={5}
                  placeholder="Dear {{member_name}}, your payment of BDT {{amount}} is due on {{due_date}}..."
                  value={bodyTemplate}
                  onChange={(e) => setBodyTemplate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden font-mono"
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
                  {submitting ? 'Creating...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
