import { api } from '../lib/api';
import {
  AuditLogItem,
  CashReconciliation,
  BankReconciliation,
  InternalControlRule,
  SodCheckResult,
  ComplianceChecklist,
  ComplianceRequirement,
  FinancialException,
  RiskFlag,
  CommunicationTemplate,
  IntegrationConfig,
  IntegrationLog,
  Webhook,
  WebhookLog,
} from '../types/audit-compliance';

function toQuery(params?: Record<string, any>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value));
    }
  }
  const str = search.toString();
  return str ? `?${str}` : '';
}

export const auditComplianceService = {
  // ================= AUDIT LOGS & REPORTS =================
  async getAuditLogs(params?: {
    module?: string;
    action?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const res = await api.get<any>(`/audit-logs${toQuery(params)}`);
    return res;
  },

  async getAuditStats() {
    const res = await api.get<any>('/audit-logs/stats');
    return res?.data || { total_logs: 0, financial_logs: 0, approval_logs: 0, user_logs: 0, suspicious_activities: 0 };
  },

  async getAuditReports(type: string, params?: { startDate?: string; endDate?: string; userId?: string; limit?: number }) {
    const res = await api.get<any>(`/audit-logs/reports${toQuery({ type, ...params })}`);
    return res?.data || [];
  },

  // ================= FINANCIAL RECONCILIATIONS =================
  async getCashAccounts() {
    const res = await api.get<any>('/reconciliation/cash/accounts');
    return res?.data || [];
  },

  async listCashReconciliations(params?: { account_id?: string; page?: number; limit?: number }) {
    const res = await api.get<any>(`/reconciliation/cash${toQuery(params)}`);
    return res;
  },

  async createCashReconciliation(data: {
    account_id: string;
    reconciliation_date?: string;
    physical_cash: number;
    notes?: string;
  }) {
    const res = await api.post<any>('/reconciliation/cash', data);
    return res?.data;
  },

  async getBankAccounts() {
    const res = await api.get<any>('/reconciliation/bank/accounts');
    return res?.data || [];
  },

  async listBankReconciliations(params?: { account_id?: string; status?: string; page?: number; limit?: number }) {
    const res = await api.get<any>(`/reconciliation/bank${toQuery(params)}`);
    return res;
  },

  async getBankReconciliation(id: string) {
    const res = await api.get<any>(`/reconciliation/bank/${id}`);
    return res?.data as BankReconciliation;
  },

  async createBankReconciliation(data: {
    account_id: string;
    period_start: string;
    period_end: string;
    statement_ending_balance: number;
    notes?: string;
    items?: Array<{
      statement_date: string;
      statement_description: string;
      statement_reference?: string;
      statement_amount: number;
    }>;
  }) {
    const res = await api.post<any>('/reconciliation/bank', data);
    return res?.data as BankReconciliation;
  },

  async matchBankItem(itemId: string, transactionId: string) {
    const res = await api.post<any>(`/reconciliation/bank/items/${itemId}/match`, { transaction_id: transactionId });
    return res?.success;
  },

  async unmatchBankItem(itemId: string) {
    const res = await api.post<any>(`/reconciliation/bank/items/${itemId}/unmatch`, {});
    return res?.success;
  },

  async updateBankReconciliationStatus(id: string, status: 'COMPLETED' | 'APPROVED') {
    const res = await api.patch<any>(`/reconciliation/bank/${id}/status`, { status });
    return res?.success;
  },

  // ================= INTERNAL CONTROLS & SOD =================
  async listInternalControlRules() {
    const res = await api.get<any>('/internal-controls/rules');
    return (res?.data as InternalControlRule[]) || [];
  },

  async createInternalControlRule(data: Partial<InternalControlRule>) {
    const res = await api.post<any>('/internal-controls/rules', data);
    return res?.data as InternalControlRule;
  },

  async updateInternalControlRule(id: string, data: Partial<InternalControlRule>) {
    const res = await api.put<any>(`/internal-controls/rules/${id}`, data);
    return res?.data as InternalControlRule;
  },

  async toggleInternalControlRule(id: string) {
    const res = await api.patch<any>(`/internal-controls/rules/${id}/toggle`, {});
    return res?.data as InternalControlRule;
  },

  async deleteInternalControlRule(id: string) {
    const res = await api.delete<any>(`/internal-controls/rules/${id}`);
    return res?.success;
  },

  async checkSodConflict(data: { requesterId: string; actorId?: string; amount?: number; module?: string; recordId?: string }) {
    const res = await api.post<any>('/internal-controls/check-sod', data);
    return res?.data as SodCheckResult;
  },

  async recordControlOverride(data: { ruleCode: string; recordId?: string; reason: string }) {
    const res = await api.post<any>('/internal-controls/record-override', data);
    return res?.success;
  },

  // ================= COMPLIANCE MANAGEMENT =================
  async listComplianceChecklists(params?: { category?: string; status?: string }) {
    const res = await api.get<any>(`/compliance/checklists${toQuery(params)}`);
    return (res?.data as ComplianceChecklist[]) || [];
  },

  async getComplianceChecklist(id: string) {
    const res = await api.get<any>(`/compliance/checklists/${id}`);
    return res?.data as ComplianceChecklist;
  },

  async createComplianceChecklist(data: {
    title: string;
    category: string;
    description?: string;
    frequency?: string;
    due_date?: string;
  }) {
    const res = await api.post<any>('/compliance/checklists', data);
    return res?.data as ComplianceChecklist;
  },

  async deleteComplianceChecklist(id: string) {
    const res = await api.delete<any>(`/compliance/checklists/${id}`);
    return res?.success;
  },

  async addComplianceRequirement(data: {
    checklist_id: string;
    requirement: string;
    responsible_person_id?: string;
    due_date?: string;
    evidence_notes?: string;
  }) {
    const res = await api.post<any>('/compliance/requirements', data);
    return res?.data as ComplianceRequirement;
  },

  async updateComplianceRequirement(id: string, data: {
    status?: string;
    evidence_notes?: string;
    evidence_document_id?: string;
  }) {
    const res = await api.patch<any>(`/compliance/requirements/${id}`, data);
    return res?.data as ComplianceRequirement;
  },

  // ================= EXCEPTIONS & RISK FLAGS =================
  async listExceptions(params?: { status?: string; severity?: string; exception_type?: string; page?: number; limit?: number }) {
    const res = await api.get<any>(`/exceptions-risk/exceptions${toQuery(params)}`);
    return res;
  },

  async resolveException(id: string, resolution_notes: string) {
    const res = await api.patch<any>(`/exceptions-risk/exceptions/${id}/resolve`, { resolution_notes });
    return res?.success;
  },

  async scanExceptions() {
    const res = await api.post<any>('/exceptions-risk/exceptions/scan', {});
    return res;
  },

  async listRiskFlags(params?: { status?: string; severity?: string; flag_type?: string; page?: number; limit?: number }) {
    const res = await api.get<any>(`/exceptions-risk/risk-flags${toQuery(params)}`);
    return res;
  },

  async createRiskFlag(data: {
    flag_type: string;
    severity?: string;
    target_entity: string;
    target_id?: string;
    risk_score?: number;
    title: string;
    description: string;
  }) {
    const res = await api.post<any>('/exceptions-risk/risk-flags', data);
    return res?.data as RiskFlag;
  },

  async updateRiskFlagStatus(id: string, status: string, resolution_notes?: string) {
    const res = await api.patch<any>(`/exceptions-risk/risk-flags/${id}/status`, { status, resolution_notes });
    return res?.success;
  },

  async getExceptionsRiskMetrics() {
    const res = await api.get<any>('/exceptions-risk/metrics');
    return res?.data || { openExceptions: 0, openRiskFlags: 0, criticalFlags: 0, resolvedThisMonth: 0 };
  },

  // ================= INTEGRATIONS & COMMUNICATION TEMPLATES =================
  async getIntegrationConfigs() {
    const res = await api.get<any>('/integrations/configs');
    return (res?.data as IntegrationConfig[]) || [];
  },

  async updateIntegrationConfig(providerType: string, data: { provider_name?: string; is_enabled?: boolean; settings?: any }) {
    const res = await api.patch<any>(`/integrations/configs/${providerType}`, data);
    return res?.data as IntegrationConfig;
  },

  async testIntegration(providerType: string) {
    const res = await api.post<any>(`/integrations/configs/${providerType}/test`, {});
    return res;
  },

  async getIntegrationLogs(params?: { providerType?: string; page?: number; limit?: number }) {
    const res = await api.get<any>(`/integrations/logs${toQuery(params)}`);
    return res;
  },

  async listTemplates() {
    const res = await api.get<any>('/integrations/templates');
    return (res?.data as CommunicationTemplate[]) || [];
  },

  async createTemplate(data: {
    code: string;
    name: string;
    channel: 'EMAIL' | 'SMS' | 'NOTIFICATION';
    subject?: string;
    body_template: string;
    variables?: string[];
  }) {
    const res = await api.post<any>('/integrations/templates', data);
    return res?.data as CommunicationTemplate;
  },

  async updateTemplate(id: string, data: Partial<CommunicationTemplate>) {
    const res = await api.put<any>(`/integrations/templates/${id}`, data);
    return res?.data as CommunicationTemplate;
  },

  async previewTemplate(template: string, variables: Record<string, any>) {
    const res = await api.post<any>('/integrations/templates/preview', { template, variables });
    return res?.data?.rendered || '';
  },

  // ================= WEBHOOKS =================
  async listWebhooks() {
    const res = await api.get<any>('/webhooks');
    return (res?.data as Webhook[]) || [];
  },

  async createWebhook(data: {
    name: string;
    url: string;
    events: string[];
    secret?: string;
    headers?: Record<string, any>;
  }) {
    const res = await api.post<any>('/webhooks', data);
    return res?.data as Webhook;
  },

  async toggleWebhook(id: string) {
    const res = await api.patch<any>(`/webhooks/${id}/toggle`, {});
    return res?.data as Webhook;
  },

  async deleteWebhook(id: string) {
    const res = await api.delete<any>(`/webhooks/${id}`);
    return res?.success;
  },

  async listWebhookLogs(webhookId?: string) {
    const res = await api.get<any>(`/webhooks/logs${toQuery({ webhookId })}`);
    return (res?.data as WebhookLog[]) || [];
  },

  async triggerTestWebhook(event_type: string, payload?: any) {
    const res = await api.post<any>('/webhooks/test-dispatch', { event_type, payload });
    return res;
  },
};
