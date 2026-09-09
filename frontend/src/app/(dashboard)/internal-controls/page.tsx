'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Sliders,
  CheckCircle,
  AlertTriangle,
  Plus,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Scale,
  Zap,
} from 'lucide-react';
import { auditComplianceService } from '../../../services/audit-compliance.service';
import { InternalControlRule, SodCheckResult } from '../../../types/audit-compliance';

export default function InternalControlsPage() {
  const [rules, setRules] = useState<InternalControlRule[]>([]);
  const [loading, setLoading] = useState(true);

  // SOD Simulator state
  const [simRequester, setSimRequester] = useState('');
  const [simActor, setSimActor] = useState('');
  const [simAmount, setSimAmount] = useState('');
  const [simResult, setSimResult] = useState<SodCheckResult | null>(null);
  const [simulating, setSimulating] = useState(false);

  // New rule modal state
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [controlType, setControlType] = useState('SEGREGATION_OF_DUTIES');
  const [requiredAction, setRequiredAction] = useState<'WARNING' | 'BLOCK' | 'REQUIRE_OVERRIDE'>('BLOCK');
  const [submitting, setSubmitting] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const data = await auditComplianceService.listInternalControlRules();
      setRules(data);
    } catch (e) {
      console.error('Failed to load internal control rules:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggle = async (id: string) => {
    try {
      await auditComplianceService.toggleInternalControlRule(id);
      fetchRules();
    } catch (e) {
      console.error('Failed to toggle rule:', e);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !controlType) return;

    setSubmitting(true);
    try {
      await auditComplianceService.createInternalControlRule({
        name,
        code,
        description,
        control_type: controlType as any,
        required_action: requiredAction,
        conditions: { threshold_amount: 30000 },
        is_active: true,
      });
      setShowModal(false);
      setName('');
      setCode('');
      setDescription('');
      fetchRules();
    } catch (e: any) {
      alert(e.response?.data?.error?.message || 'Failed to create rule');
    } finally {
      setSubmitting(false);
    }
  };

  const runSodSimulator = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    try {
      const res = await auditComplianceService.checkSodConflict({
        requesterId: simRequester,
        actorId: simActor,
        amount: simAmount ? Number(simAmount) : undefined,
        module: 'expenses',
      });
      setSimResult(res);
    } catch (e) {
      console.error('SOD simulation failed:', e);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
              Module 4 & 5
            </span>
            <span className="text-xs text-muted-foreground">Governance Guardrails</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
            Internal Controls & Segregation of Duties (SOD)
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure automated policy constraints, dual approval thresholds, and prevent conflicting authorizations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Control Rule
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Control Rules Catalog */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" />
              Active Control Policies ({rules.length})
            </h2>
            <button
              onClick={fetchRules}
              className="p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`p-4 rounded-xl border bg-card shadow-xs transition-all ${
                  rule.is_active ? 'border-border' : 'border-border/50 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-xs text-foreground">{rule.name}</h3>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-muted text-muted-foreground">
                        {rule.code}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{rule.description || 'No description provided.'}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px]">
                      <span className="font-medium text-foreground">Type: {rule.control_type}</span>
                      <span
                        className={`font-semibold ${
                          rule.required_action === 'BLOCK'
                            ? 'text-rose-600'
                            : rule.required_action === 'REQUIRE_OVERRIDE'
                            ? 'text-amber-600'
                            : 'text-blue-600'
                        }`}
                      >
                        Action: {rule.required_action}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggle(rule.id)}
                    className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                    title={rule.is_active ? 'Pause Rule' : 'Activate Rule'}
                  >
                    {rule.is_active ? (
                      <ToggleRight className="w-6 h-6 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Live SOD Conflict Simulator */}
        <div className="lg:col-span-1 bg-card rounded-xl border border-border p-5 shadow-xs space-y-4">
          <div className="border-b border-border pb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              SOD Conflict Simulator
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Test policy enforcement against transaction scenarios</p>
          </div>

          <form onSubmit={runSodSimulator} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-muted-foreground uppercase mb-1">Requester / Creator ID</label>
              <input
                type="text"
                placeholder="e.g. user_alice_123"
                value={simRequester}
                onChange={(e) => setSimRequester(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-muted-foreground uppercase mb-1">Approver / Actor ID</label>
              <input
                type="text"
                placeholder="e.g. user_bob_456 (or same ID)"
                value={simActor}
                onChange={(e) => setSimActor(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-muted-foreground uppercase mb-1">Expense Amount (BDT)</label>
              <input
                type="number"
                placeholder="e.g. 35000"
                value={simAmount}
                onChange={(e) => setSimAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={simulating}
              className="w-full py-2 px-4 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-xs transition-colors"
            >
              {simulating ? 'Evaluating Policy...' : 'Evaluate Control Policy'}
            </button>
          </form>

          {/* Simulation Result Box */}
          {simResult && (
            <div
              className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                simResult.hasConflict
                  ? simResult.requiredAction === 'BLOCK'
                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-600'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-600'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                {simResult.hasConflict ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                <span>
                  {simResult.hasConflict ? `POLICY RESTRICTION: ${simResult.requiredAction}` : 'VALIDATION PASSED'}
                </span>
              </div>
              <p className="text-foreground leading-relaxed">{simResult.message}</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Rule Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground">Create Internal Control Rule</h3>

            <form onSubmit={handleCreateRule} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">Rule Name</label>
                <input
                  type="text"
                  placeholder="e.g. Travel Advance Dual Sign-Off"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">Unique Code</label>
                <input
                  type="text"
                  placeholder="e.g. ADV_DUAL_SIGNOFF"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-muted-foreground uppercase mb-1">Control Type</label>
                  <select
                    value={controlType}
                    onChange={(e) => setControlType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
                  >
                    <option value="SEGREGATION_OF_DUTIES">Segregation of Duties</option>
                    <option value="APPROVAL_THRESHOLD">Approval Threshold</option>
                    <option value="DUAL_APPROVAL">Dual Approval</option>
                    <option value="LARGE_TRANSACTION">Large Transaction</option>
                    <option value="PERIOD_CLOSING">Period Closing</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground uppercase mb-1">Required Action</label>
                  <select
                    value={requiredAction}
                    onChange={(e) => setRequiredAction(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
                  >
                    <option value="BLOCK">BLOCK</option>
                    <option value="REQUIRE_OVERRIDE">REQUIRE OVERRIDE</option>
                    <option value="WARNING">WARNING</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Policy explanation and compliance rationale..."
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
                  {submitting ? 'Creating...' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
