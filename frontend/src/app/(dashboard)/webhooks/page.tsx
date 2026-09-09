'use client';

import React, { useState, useEffect } from 'react';
import {
  Webhook as WebhookIcon,
  Plus,
  RefreshCw,
  Play,
  Copy,
  Check,
  ToggleLeft,
  ToggleRight,
  Clock,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { auditComplianceService } from '../../../services/audit-compliance.service';
import { Webhook, WebhookLog } from '../../../types/audit-compliance';

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedSecretId, setCopiedSecretId] = useState<string | null>(null);

  // New webhook modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['PAYMENT_RECEIVED', 'EXPENSE_APPROVED']);
  const [submitting, setSubmitting] = useState(false);

  // Test event state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const availableEvents = [
    'PAYMENT_RECEIVED',
    'EXPENSE_APPROVED',
    'EVENT_CREATED',
    'TASK_COMPLETED',
    'MEMBER_REGISTERED',
  ];

  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      const [hooks, hookLogs] = await Promise.all([
        auditComplianceService.listWebhooks(),
        auditComplianceService.listWebhookLogs(),
      ]);
      setWebhooks(hooks || []);
      setLogs(hookLogs || []);
    } catch (e) {
      console.error('Failed to load webhooks:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const handleToggle = async (id: string) => {
    try {
      await auditComplianceService.toggleWebhook(id);
      fetchWebhooks();
    } catch (e) {
      console.error('Failed to toggle webhook:', e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook endpoint?')) return;
    try {
      await auditComplianceService.deleteWebhook(id);
      fetchWebhooks();
    } catch (e) {
      alert('Failed to delete webhook');
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url || selectedEvents.length === 0) return;

    setSubmitting(true);
    try {
      await auditComplianceService.createWebhook({
        name,
        url,
        events: selectedEvents,
      });
      setShowModal(false);
      setName('');
      setUrl('');
      fetchWebhooks();
    } catch (e: any) {
      alert(e.response?.data?.error?.message || 'Failed to create webhook');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTriggerTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await auditComplianceService.triggerTestWebhook('PAYMENT_RECEIVED', {
        amount: 2500,
        currency: 'BDT',
        payment_ref: 'DIU-PAY-99',
        customer: 'Student Executive',
      });
      setTestResult(`Event dispatched to ${res.dispatched || 0} active webhook endpoints!`);
      fetchWebhooks();
    } catch (e) {
      setTestResult('Failed to dispatch test event');
    } finally {
      setTesting(false);
    }
  };

  const copySecret = (id: string, secret: string) => {
    navigator.clipboard.writeText(secret);
    setCopiedSecretId(id);
    setTimeout(() => setCopiedSecretId(null), 2000);
  };

  const toggleEventSelection = (evt: string) => {
    if (selectedEvents.includes(evt)) {
      setSelectedEvents(selectedEvents.filter((e) => e !== evt));
    } else {
      setSelectedEvents([...selectedEvents, evt]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              Module 15
            </span>
            <span className="text-xs text-muted-foreground">HMAC Signed Outbound Event Dispatcher</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">Webhooks & External Integrations</h1>
          <p className="text-sm text-muted-foreground">
            Configure secure event subscriptions with SHA-256 HMAC signatures, idempotency guarantees, and delivery monitoring.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerTest}
            disabled={testing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors shadow-xs disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 text-emerald-600 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'Dispatching...' : 'Dispatch Test Event'}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Endpoint
          </button>
        </div>
      </div>

      {testResult && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {testResult}
        </div>
      )}

      {/* Webhooks Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <WebhookIcon className="w-4 h-4 text-primary" />
          Configured Endpoints ({webhooks.length})
        </h2>

        {loading ? (
          <div className="p-8 text-center bg-card rounded-xl border border-border text-muted-foreground text-xs">
            Loading webhook endpoints...
          </div>
        ) : webhooks.length === 0 ? (
          <div className="p-8 text-center bg-card rounded-xl border border-border text-muted-foreground text-xs">
            No webhook endpoints configured. Click "Add Endpoint" to register a listener URL.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {webhooks.map((wh) => (
              <div key={wh.id} className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{wh.name}</h3>
                    <p className="font-mono text-xs text-muted-foreground break-all mt-0.5">{wh.url}</p>
                  </div>
                  <button
                    onClick={() => handleToggle(wh.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {wh.is_active ? (
                      <ToggleRight className="w-6 h-6 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                    )}
                  </button>
                </div>

                {/* Subscribed Events */}
                <div className="flex flex-wrap gap-1.5">
                  {(wh.events || []).map((evt) => (
                    <span
                      key={evt}
                      className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-muted text-foreground border border-border"
                    >
                      {evt}
                    </span>
                  ))}
                </div>

                {/* HMAC Secret */}
                <div className="p-2.5 bg-muted/40 rounded-lg flex items-center justify-between text-xs font-mono">
                  <div className="truncate max-w-[240px]">
                    <span className="text-muted-foreground text-[10px] uppercase block">HMAC Secret:</span>
                    <span className="text-foreground">{wh.secret.substring(0, 16)}••••••••</span>
                  </div>
                  <button
                    onClick={() => copySecret(wh.id, wh.secret)}
                    className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
                    title="Copy Secret"
                  >
                    {copiedSecretId === wh.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      wh.is_active
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        : 'bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    {wh.is_active ? 'ACTIVE & LISTENING' : 'DISABLED'}
                  </span>
                  <button
                    onClick={() => handleDelete(wh.id)}
                    className="text-muted-foreground hover:text-rose-600 p-1 transition-colors"
                    title="Delete Endpoint"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Webhook Delivery Logs */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Recent Webhook Dispatches & Delivery Logs
            </h2>
            <p className="text-xs text-muted-foreground">Verification history of dispatched payloads and receiver status</p>
          </div>
          <button
            onClick={fetchWebhooks}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase font-semibold">
              <tr>
                <th className="px-3 py-2.5">Time</th>
                <th className="px-3 py-2.5">Event Type</th>
                <th className="px-3 py-2.5">Event ID</th>
                <th className="px-3 py-2.5 text-right">HTTP Status</th>
                <th className="px-3 py-2.5">Delivery Status</th>
                <th className="px-3 py-2.5">Response Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                    No webhooks dispatched yet. Click "Dispatch Test Event" to test endpoints.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2.5 font-mono text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at || '').toLocaleTimeString()}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-foreground">{log.event_type}</td>
                    <td className="px-3 py-2.5 font-mono text-muted-foreground text-[11px]">{log.event_id}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-600">
                      {log.response_code || 200}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-muted-foreground max-w-xs truncate text-[11px]">
                      {log.response_body || '{"status": "ok"}'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Webhook */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground">Register Webhook Endpoint</h3>

            <form onSubmit={handleCreateWebhook} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">Friendly Name</label>
                <input
                  type="text"
                  placeholder="e.g. Accounting System Sync"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">Endpoint URL</label>
                <input
                  type="url"
                  placeholder="https://api.external-system.com/webhooks"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">Subscribed Events</label>
                <div className="space-y-1.5 border border-border p-3 rounded-lg bg-background max-h-36 overflow-y-auto">
                  {availableEvents.map((evt) => (
                    <label key={evt} className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(evt)}
                        onChange={() => toggleEventSelection(evt)}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="font-mono text-[11px] text-foreground">{evt}</span>
                    </label>
                  ))}
                </div>
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
                  {submitting ? 'Registering...' : 'Register Endpoint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
