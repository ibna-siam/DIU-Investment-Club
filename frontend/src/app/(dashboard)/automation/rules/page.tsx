'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { automationService } from '../../../../services/automation.service';
import {
  AutomationRule,
  AutomationRuleStatus,
  AutomationTriggerType,
  AutomationCondition,
  AutomationAction,
} from '../../../../types/automation';
import {
  Zap,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Pause,
  Play,
  Trash2,
  Edit,
  ArrowLeft,
  Sliders,
  ShieldAlert,
} from 'lucide-react';

const TRIGGER_OPTIONS: { label: string; value: AutomationTriggerType; defaultField: string }[] = [
  { label: 'Task Due Soon', value: 'TASK_DUE_SOON', defaultField: 'days_before_due' },
  { label: 'Task Overdue', value: 'TASK_OVERDUE', defaultField: 'days_after_due' },
  { label: 'Payment Overdue (Member Dues)', value: 'PAYMENT_OVERDUE', defaultField: 'days_after_due' },
  { label: 'Event Budget Limit Warning', value: 'EVENT_BUDGET_LIMIT', defaultField: 'budget_utilization_pct' },
  { label: 'Approval Request Pending Escalation', value: 'APPROVAL_PENDING', defaultField: 'days_pending' },
  { label: 'Meeting 24h Reminder', value: 'MEETING_REMINDER', defaultField: 'hours_before_meeting' },
  { label: 'Expense Submitted', value: 'EXPENSE_SUBMITTED', defaultField: 'amount' },
  { label: 'Accounting Period Ending', value: 'ACCOUNTING_PERIOD_ENDING', defaultField: 'days_remaining' },
  { label: 'Financial Year Ending', value: 'FINANCIAL_YEAR_ENDING', defaultField: 'days_remaining' },
];

export default function AutomationRulesPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_type: 'TASK_DUE_SOON' as AutomationTriggerType,
    conditionField: 'days_before_due',
    conditionOperator: 'LESS_THAN_OR_EQUAL',
    conditionValue: '2',
    actionType: 'CREATE_NOTIFICATION',
    actionTarget: 'ASSIGNEE',
    actionMessage: '',
  });

  const loadRules = async () => {
    setLoading(true);
    try {
      const data = await automationService.getRules();
      setRules(data);
    } catch (err) {
      console.error('Failed to load rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleToggleStatus = async (rule: AutomationRule) => {
    const nextStatus: AutomationRuleStatus = rule.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await automationService.toggleRuleStatus(rule.id, nextStatus);
      await loadRules();
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this automation rule?')) return;
    try {
      await automationService.deleteRule(id);
      await loadRules();
    } catch (err: any) {
      alert(`Failed to delete rule: ${err.message}`);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert('Rule name is required');

    const conditions: AutomationCondition[] = [
      {
        field: formData.conditionField,
        operator: formData.conditionOperator as any,
        value: Number(formData.conditionValue) || formData.conditionValue,
      },
    ];

    const actions: AutomationAction[] = [
      {
        type: formData.actionType as any,
        target: formData.actionTarget,
        message: formData.actionMessage || `Automated notice triggered by ${formData.name}`,
      },
    ];

    try {
      await automationService.createRule({
        name: formData.name,
        description: formData.description,
        trigger_type: formData.trigger_type,
        conditions,
        actions,
        status: 'ACTIVE',
      });
      setIsModalOpen(false);
      setFormData({
        name: '',
        description: '',
        trigger_type: 'TASK_DUE_SOON',
        conditionField: 'days_before_due',
        conditionOperator: 'LESS_THAN_OR_EQUAL',
        conditionValue: '2',
        actionType: 'CREATE_NOTIFICATION',
        actionTarget: 'ASSIGNEE',
        actionMessage: '',
      });
      await loadRules();
    } catch (err: any) {
      alert(`Failed to create rule: ${err.message}`);
    }
  };

  const filteredRules = rules.filter((r) => {
    const matchQuery =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.trigger_type.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchQuery && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/automation"
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Zap className="w-6 h-6 text-purple-400" />
              Automation Rules Builder
            </h1>
          </div>
          <p className="text-slate-400 text-sm mt-1 ml-8">
            Manage trigger-condition-action logic for club operations and notifications.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-purple-900/30 transition"
        >
          <Plus className="w-4 h-4" />
          Create Automation Rule
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900/80 border border-slate-800 rounded-xl p-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search rules by name or trigger..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-purple-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        {filteredRules.map((rule) => (
          <div
            key={rule.id}
            className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-bold text-white">{rule.name}</h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      rule.status === 'ACTIVE'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                        : rule.status === 'PAUSED'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800/50'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {rule.status}
                  </span>
                </div>
                {rule.description && (
                  <p className="text-xs text-slate-400">{rule.description}</p>
                )}

                {/* Trigger, Condition, Action Tags */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="px-2 py-1 bg-purple-950/60 text-purple-300 border border-purple-800/40 rounded-md text-xs font-mono">
                    TRIGGER: {rule.trigger_type}
                  </span>
                  <span className="px-2 py-1 bg-slate-800 text-slate-300 rounded-md text-xs font-mono">
                    IF: {rule.conditions.map((c) => `${c.field} ${c.operator} ${c.value}`).join(' AND ') || 'Always'}
                  </span>
                  <span className="px-2 py-1 bg-indigo-950/60 text-indigo-300 border border-indigo-800/40 rounded-md text-xs font-mono">
                    THEN: {rule.actions.map((a) => `${a.type} -> ${a.target || 'Auto'}`).join(', ')}
                  </span>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2 self-end lg:self-center">
                <button
                  onClick={() => handleToggleStatus(rule)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    rule.status === 'ACTIVE'
                      ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                  }`}
                >
                  {rule.status === 'ACTIVE' ? (
                    <>
                      <Pause className="w-3.5 h-3.5" /> Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" /> Activate
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="p-1.5 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredRules.length === 0 && !loading && (
          <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-xl">
            <Sliders className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-400">No automation rules match your criteria</div>
            <p className="text-xs text-slate-500 mt-1">Create a new rule or clear active filters.</p>
          </div>
        )}
      </div>

      {/* Rule Builder Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-400" />
                Create Automation Rule
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Rule Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 80% Budget Warning to Treasurer"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Explain what this automation does"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Trigger Selection */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Trigger Event *</label>
                <select
                  value={formData.trigger_type}
                  onChange={(e) => {
                    const opt = TRIGGER_OPTIONS.find((t) => t.value === e.target.value);
                    setFormData({
                      ...formData,
                      trigger_type: e.target.value as AutomationTriggerType,
                      conditionField: opt?.defaultField || 'days_before_due',
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  {TRIGGER_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label} ({t.value})
                    </option>
                  ))}
                </select>
              </div>

              {/* Condition Builder */}
              <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
                <div className="text-purple-300 font-semibold">Condition Rule (IF)</div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={formData.conditionField}
                    onChange={(e) => setFormData({ ...formData, conditionField: e.target.value })}
                    placeholder="Field name"
                    className="px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200"
                  />
                  <select
                    value={formData.conditionOperator}
                    onChange={(e) => setFormData({ ...formData, conditionOperator: e.target.value })}
                    className="px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200"
                  >
                    <option value="LESS_THAN_OR_EQUAL">&lt;= Less or Equal</option>
                    <option value="GREATER_THAN_OR_EQUAL">&gt;= Greater or Equal</option>
                    <option value="EQUALS">== Equals</option>
                    <option value="NOT_EQUALS">!= Not Equals</option>
                    <option value="CONTAINS">Contains</option>
                  </select>
                  <input
                    type="text"
                    value={formData.conditionValue}
                    onChange={(e) => setFormData({ ...formData, conditionValue: e.target.value })}
                    placeholder="Value (e.g. 2)"
                    className="px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200"
                  />
                </div>
              </div>

              {/* Action Selection */}
              <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
                <div className="text-indigo-300 font-semibold">Action (THEN)</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-0.5">Action Type</label>
                    <select
                      value={formData.actionType}
                      onChange={(e) => setFormData({ ...formData, actionType: e.target.value })}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200"
                    >
                      <option value="CREATE_NOTIFICATION">Send In-App Notification</option>
                      <option value="CREATE_REMINDER">Schedule Smart Reminder</option>
                      <option value="CREATE_TASK">Generate Task</option>
                      <option value="CREATE_APPROVAL_REQUEST">Request Human Approval</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-0.5">Target Recipient</label>
                    <select
                      value={formData.actionTarget}
                      onChange={(e) => setFormData({ ...formData, actionTarget: e.target.value })}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200"
                    >
                      <option value="ASSIGNEE">Assignee / Owner</option>
                      <option value="ROLE:Treasurer">Role: Treasurer</option>
                      <option value="ROLE:President">Role: President</option>
                      <option value="ROLE:General Secretary">Role: General Secretary</option>
                      <option value="ATTENDEES">Meeting Attendees</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 block mb-0.5">Notification Message</label>
                  <input
                    type="text"
                    placeholder="Custom alert message"
                    value={formData.actionMessage}
                    onChange={(e) => setFormData({ ...formData, actionMessage: e.target.value })}
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200"
                  />
                </div>
              </div>

              {/* Safety notice */}
              <div className="flex items-center gap-2 text-slate-400 text-[11px] bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Financial accounting postings, fund transfers, and expense approvals require human authorization and cannot be automated.</span>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-purple-900/30"
                >
                  Save & Activate Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
