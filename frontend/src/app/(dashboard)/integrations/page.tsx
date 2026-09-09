'use client';

import React, { useState, useEffect } from 'react';
import {
  Webhook,
  Mail,
  MessageSquare,
  CreditCard,
  Calendar,
  CheckCircle,
  AlertCircle,
  Play,
  RefreshCw,
  Clock,
  ExternalLink,
  Shield,
  Layers,
  Settings,
  Key,
  Save,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { auditComplianceService } from '../../../services/audit-compliance.service';
import { IntegrationConfig, IntegrationLog } from '../../../types/audit-compliance';

export default function ExternalIntegrationsPage() {
  const [configs, setConfigs] = useState<IntegrationConfig[]>([]);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingType, setTestingType] = useState<string | null>(null);
  const [testOutput, setTestOutput] = useState<{ [key: string]: string }>({});

  const [editingConfig, setEditingConfig] = useState<IntegrationConfig | null>(null);
  const [editProviderName, setEditProviderName] = useState('');
  const [editIsEnabled, setEditIsEnabled] = useState(true);
  const [editSettings, setEditSettings] = useState<{ [key: string]: string }>({});
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  const openEditModal = (cfg: IntegrationConfig) => {
    setEditingConfig(cfg);
    setEditProviderName(cfg.provider_name);
    setEditIsEnabled(cfg.is_enabled);
    setEditSettings({ ...(cfg.settings || {}) });
    setNewKey('');
    setNewValue('');
    setSaveSuccess('');
    setSaveError('');
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConfig) return;
    setSavingConfig(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      await auditComplianceService.updateIntegrationConfig(editingConfig.provider_type, {
        provider_name: editProviderName,
        is_enabled: editIsEnabled,
        settings: editSettings,
      });
      setSaveSuccess('Configuration and API credentials updated successfully!');
      setTimeout(() => {
        setEditingConfig(null);
        fetchData();
      }, 1000);
    } catch (err: any) {
      setSaveError(err.response?.data?.message || err.message || 'Failed to update credentials');
    } finally {
      setSavingConfig(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cfgRes, logsRes] = await Promise.all([
        auditComplianceService.getIntegrationConfigs(),
        auditComplianceService.getIntegrationLogs({ limit: 20 }),
      ]);
      setConfigs(cfgRes || []);
      setLogs(logsRes?.data || []);
    } catch (e) {
      console.error('Failed to load integration data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTest = async (type: string) => {
    setTestingType(type);
    try {
      const res = await auditComplianceService.testIntegration(type);
      setTestOutput((prev) => ({
        ...prev,
        [type]: res.message || 'Test execution completed successfully.',
      }));
      fetchData();
    } catch (e: any) {
      setTestOutput((prev) => ({
        ...prev,
        [type]: e.response?.data?.message || 'Integration test failed.',
      }));
    } finally {
      setTestingType(null);
    }
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'EMAIL':
        return <Mail className="w-5 h-5 text-blue-500" />;
      case 'SMS':
        return <MessageSquare className="w-5 h-5 text-emerald-500" />;
      case 'PAYMENT':
        return <CreditCard className="w-5 h-5 text-indigo-500" />;
      case 'CALENDAR':
        return <Calendar className="w-5 h-5 text-amber-500" />;
      default:
        return <Webhook className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
              Module 10, 12, 13, 14 & 16
            </span>
            <span className="text-xs text-muted-foreground">External Gateway Adapter Architecture</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
            External Integrations & Provider Hub
          </h1>
          <p className="text-sm text-muted-foreground">
            Provider-independent adapter architecture for Email, SMS, Payment Gateways (SSLCommerz/bKash), and Google Calendar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/webhooks"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Webhook className="w-4 h-4" />
            Manage Webhooks
          </Link>
        </div>
      </div>

      {/* Provider Architecture Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {configs.map((cfg) => (
          <div key={cfg.id} className="bg-card rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-muted/60 border border-border">
                    {getProviderIcon(cfg.provider_type)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{cfg.provider_name}</h3>
                    <span className="text-xs text-muted-foreground font-mono">Type: {cfg.provider_type}</span>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    cfg.status === 'CONNECTED'
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                  }`}
                >
                  {cfg.status}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">API Credentials & Parameters</span>
                <button
                  onClick={() => openEditModal(cfg)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <Settings className="w-3 h-3" />
                  Configure Keys
                </button>
              </div>

              {/* Provider Settings Preview */}
              <div className="p-3 bg-muted/40 rounded-lg text-xs font-mono space-y-1 text-muted-foreground">
                <p className="font-semibold text-foreground font-sans text-[11px] uppercase tracking-wider">
                  Configured Adapter Parameters:
                </p>
                {Object.entries(cfg.settings || {}).length === 0 ? (
                  <span className="text-muted-foreground italic">No custom credentials configured</span>
                ) : (
                  Object.entries(cfg.settings || {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center">
                      <span className="font-medium text-foreground/80">{k}:</span>
                      <span className="text-foreground truncate max-w-[220px]">
                        {k.toLowerCase().includes('key') || k.toLowerCase().includes('secret') || k.toLowerCase().includes('password')
                          ? String(v).replace(/.(?=.{4})/g, '•')
                          : String(v)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {testOutput[cfg.provider_type] && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  {testOutput[cfg.provider_type]}
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-border flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Adapter: {cfg.is_enabled ? 'Ready / Enabled' : 'Sandbox Mode'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(cfg)}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors"
                >
                  Edit Keys
                </button>
                <button
                  onClick={() => handleTest(cfg.provider_type)}
                  disabled={testingType === cfg.provider_type}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 ${testingType === cfg.provider_type ? 'animate-spin' : ''}`} />
                  {testingType === cfg.provider_type ? 'Testing...' : 'Test Adapter'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Integration Logs Stream */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Third-Party Gateway Diagnostic Logs
            </h2>
            <p className="text-xs text-muted-foreground">Detailed telemetry of outbound API calls and responses</p>
          </div>
          <button
            onClick={fetchData}
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
                <th className="px-3 py-2.5">Provider</th>
                <th className="px-3 py-2.5">Action / Endpoint</th>
                <th className="px-3 py-2.5">Direction</th>
                <th className="px-3 py-2.5 text-right">Status Code</th>
                <th className="px-3 py-2.5 text-right">Latency</th>
                <th className="px-3 py-2.5">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                    No gateway calls recorded yet. Use "Test Adapter" above to trigger a test dispatch.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2.5 font-mono text-muted-foreground whitespace-nowrap">
                      {new Date(l.created_at || '').toLocaleTimeString()}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-foreground">{l.provider_type}</td>
                    <td className="px-3 py-2.5 font-mono text-muted-foreground">{l.endpoint_or_action}</td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-muted text-foreground">
                        {l.direction}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-600">
                      {l.status_code || 200}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">
                      {l.execution_time_ms || 0} ms
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground max-w-xs truncate font-mono text-[11px]">
                      {l.payload_summary || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Credentials / API Keys Modal */}
      {editingConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setEditingConfig(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Configure Gateway API Keys</h2>
                <p className="text-xs text-muted-foreground">
                  Provider: {editingConfig.provider_type} ({editingConfig.provider_name})
                </p>
              </div>
            </div>

            {saveError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
                {saveError}
              </div>
            )}

            {saveSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl">
                {saveSuccess}
              </div>
            )}

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-foreground mb-1">Provider Display Name</label>
                <input
                  type="text"
                  required
                  value={editProviderName}
                  onChange={(e) => setEditProviderName(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                <div>
                  <span className="font-medium text-foreground block">Adapter Status</span>
                  <span className="text-muted-foreground text-[11px]">Toggle between Production Active and Sandbox/Disabled</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditIsEnabled(!editIsEnabled)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    editIsEnabled ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {editIsEnabled ? 'Enabled / Active' : 'Disabled / Sandbox'}
                </button>
              </div>

              <div className="space-y-2">
                <span className="font-semibold text-foreground block">Credential Parameters & API Keys</span>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {Object.entries(editSettings).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-2 bg-muted/40 p-2 rounded-lg border border-border">
                      <span className="w-1/3 font-mono text-[11px] truncate text-foreground/80">{key}</span>
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => setEditSettings({ ...editSettings, [key]: e.target.value })}
                        className="w-2/3 bg-background border border-border rounded px-2 py-1 text-[11px] text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = { ...editSettings };
                          delete next[key];
                          setEditSettings(next);
                        }}
                        className="text-muted-foreground hover:text-rose-500 p-1"
                        title="Remove key"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-border flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="New Parameter (e.g. api_key)"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className="w-1/2 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Value..."
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="w-1/2 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newKey.trim()) return;
                      setEditSettings({ ...editSettings, [newKey.trim()]: newValue.trim() });
                      setNewKey('');
                      setNewValue('');
                    }}
                    className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg border border-border shrink-0 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingConfig(null)}
                  className="px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingConfig ? 'Saving Credentials...' : 'Save & Sync Keys'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
