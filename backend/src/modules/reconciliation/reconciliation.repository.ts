import { supabaseClient, isSupabaseConfigured } from '../../config/supabase';
import {
  CashReconciliation,
  BankReconciliation,
  BankReconciliationItem,
  PaginatedResponse,
} from '../../types';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository';

export class ReconciliationRepository {
  // ================= CASH RECONCILIATION =================
  async getCashAccounts(): Promise<any[]> {
    if (!isSupabaseConfigured() || !supabaseClient) return [];
    const { data } = await supabaseClient
      .from('financial_accounts')
      .select('*')
      .in('account_type', ['CASH', 'BKASH', 'NAGAD', 'ROCKET', 'BANK'])
      .eq('status', 'ACTIVE')
      .order('name');
    return data || [];
  }

  async getAccountSystemBalance(accountId: string): Promise<number> {
    if (!isSupabaseConfigured() || !supabaseClient) return 0;
    const { data } = await supabaseClient
      .from('financial_accounts')
      .select('current_balance')
      .eq('id', accountId)
      .single();
    return data ? Number(data.current_balance) : 0;
  }

  async createCashReconciliation(data: {
    account_id: string;
    reconciliation_date?: string;
    physical_cash: number;
    notes?: string;
    verified_by?: string;
    created_by?: string;
  }): Promise<CashReconciliation | null> {
    if (!isSupabaseConfigured() || !supabaseClient) return null;

    const systemCash = await this.getAccountSystemBalance(data.account_id);
    const physicalCash = Number(data.physical_cash);
    const diff = physicalCash - systemCash;
    const status = Math.abs(diff) > 0.01 ? 'DISCREPANCY_FLAGGED' : 'COMPLETED';

    const { data: rec, error } = await supabaseClient
      .from('cash_reconciliations')
      .insert({
        account_id: data.account_id,
        reconciliation_date: data.reconciliation_date || new Date().toISOString().split('T')[0],
        system_cash: systemCash,
        physical_cash: physicalCash,
        notes: data.notes || null,
        verified_by: data.verified_by || data.created_by || null,
        status,
        created_by: data.created_by || null,
      })
      .select('*, account:financial_accounts(name), verifier:profiles!cash_reconciliations_verified_by_fkey(full_name)')
      .single();

    if (error || !rec) {
      console.error('Error creating cash reconciliation:', error);
      return null;
    }

    // If variance exists, log audit and flag exception without silent modification
    if (Math.abs(diff) > 0.01) {
      await supabaseClient.from('financial_exceptions').insert({
        entity_type: 'RECONCILIATION',
        entity_id: rec.id,
        exception_type: 'ACCOUNTING_IMBALANCE',
        severity: Math.abs(diff) > 5000 ? 'HIGH' : 'MEDIUM',
        description: `Cash discrepancy of BDT ${diff.toFixed(2)} detected in ${rec.account?.name || 'Cash A/C'}. Physical: ${physicalCash}, System: ${systemCash}.`,
        details: { account_id: data.account_id, system_cash: systemCash, physical_cash: physicalCash, difference: diff },
        status: 'FLAGGED',
      });
    }

    await auditLogsRepository.log({
      user_id: data.created_by,
      action: 'CASH_RECONCILIATION_PERFORMED',
      module: 'reconciliation',
      record_id: rec.id,
      new_data: { account_id: data.account_id, system_cash: systemCash, physical_cash: physicalCash, difference: diff, status },
    });

    return {
      id: rec.id,
      account_id: rec.account_id,
      account_name: rec.account?.name,
      reconciliation_date: rec.reconciliation_date,
      system_cash: Number(rec.system_cash),
      physical_cash: Number(rec.physical_cash),
      difference: Number(rec.difference),
      notes: rec.notes,
      verified_by: rec.verified_by,
      verified_by_name: rec.verifier?.full_name,
      status: rec.status,
      created_by: rec.created_by,
      created_at: rec.created_at,
    };
  }

  async listCashReconciliations(params: {
    accountId?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<CashReconciliation>> {
    const page = params.page && params.page > 0 ? Number(params.page) : 1;
    const limit = params.limit && params.limit > 0 ? Number(params.limit) : 20;
    const offset = (page - 1) * limit;

    if (!isSupabaseConfigured() || !supabaseClient) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    let query = supabaseClient
      .from('cash_reconciliations')
      .select('*, account:financial_accounts(name), verifier:profiles!cash_reconciliations_verified_by_fkey(full_name)', { count: 'exact' });

    if (params.accountId) {
      query = query.eq('account_id', params.accountId);
    }

    const { data, count, error } = await query
      .order('reconciliation_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error || !data) return { data: [], total: 0, page, limit, totalPages: 0 };

    const total = count || data.length;
    const formatted: CashReconciliation[] = data.map((r: any) => ({
      id: r.id,
      account_id: r.account_id,
      account_name: r.account?.name,
      reconciliation_date: r.reconciliation_date,
      system_cash: Number(r.system_cash),
      physical_cash: Number(r.physical_cash),
      difference: Number(r.difference),
      notes: r.notes,
      verified_by: r.verified_by,
      verified_by_name: r.verifier?.full_name,
      status: r.status,
      created_by: r.created_by,
      created_at: r.created_at,
    }));

    return { data: formatted, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  // ================= BANK RECONCILIATION =================
  async getBankAccounts(): Promise<any[]> {
    if (!isSupabaseConfigured() || !supabaseClient) return [];
    const { data } = await supabaseClient
      .from('financial_accounts')
      .select('*')
      .eq('account_type', 'BANK')
      .order('name');
    return data || [];
  }

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
    created_by?: string;
  }): Promise<BankReconciliation | null> {
    if (!isSupabaseConfigured() || !supabaseClient) return null;

    const systemEndingBalance = await this.getAccountSystemBalance(data.account_id);
    const statementEndingBalance = Number(data.statement_ending_balance);
    const initialDifference = statementEndingBalance - systemEndingBalance;

    const { data: rec, error } = await supabaseClient
      .from('bank_reconciliations')
      .insert({
        account_id: data.account_id,
        period_start: data.period_start,
        period_end: data.period_end,
        statement_ending_balance: statementEndingBalance,
        system_ending_balance: systemEndingBalance,
        reconciled_balance: 0.00,
        difference: initialDifference,
        status: 'DRAFT',
        notes: data.notes || null,
        created_by: data.created_by || null,
      })
      .select('*, account:financial_accounts(name, account_number)')
      .single();

    if (error || !rec) {
      console.error('Error creating bank reconciliation:', error);
      return null;
    }

    // Insert statement line items if provided
    if (data.items && data.items.length > 0) {
      const itemsPayload = data.items.map(it => ({
        bank_reconciliation_id: rec.id,
        statement_date: it.statement_date,
        statement_description: it.statement_description,
        statement_reference: it.statement_reference || null,
        statement_amount: Number(it.statement_amount),
        match_status: 'UNMATCHED',
      }));
      await supabaseClient.from('bank_reconciliation_items').insert(itemsPayload);
    }

    // Automatically generate match suggestions for items
    await this.generateMatchSuggestions(rec.id, data.account_id);

    await auditLogsRepository.log({
      user_id: data.created_by,
      action: 'BANK_RECONCILIATION_STARTED',
      module: 'reconciliation',
      record_id: rec.id,
      new_data: { account_id: data.account_id, period_start: data.period_start, period_end: data.period_end, statement_ending_balance: statementEndingBalance },
    });

    return this.getBankReconciliationById(rec.id);
  }

  async getBankReconciliationById(id: string): Promise<BankReconciliation | null> {
    if (!isSupabaseConfigured() || !supabaseClient) return null;

    const { data, error } = await supabaseClient
      .from('bank_reconciliations')
      .select(`
        *,
        account:financial_accounts(name, account_number),
        verifier:profiles!bank_reconciliations_verified_by_fkey(full_name),
        approver:profiles!bank_reconciliations_approved_by_fkey(full_name),
        items:bank_reconciliation_items(
          *,
          financial_transaction:financial_transactions(transaction_number, amount, description)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      account_id: data.account_id,
      account_name: data.account?.name,
      account_number: data.account?.account_number,
      period_start: data.period_start,
      period_end: data.period_end,
      statement_ending_balance: Number(data.statement_ending_balance),
      system_ending_balance: Number(data.system_ending_balance),
      reconciled_balance: Number(data.reconciled_balance),
      difference: Number(data.difference),
      status: data.status,
      notes: data.notes,
      verified_by: data.verified_by,
      verified_by_name: data.verifier?.full_name,
      approved_by: data.approved_by,
      approved_by_name: data.approver?.full_name,
      approved_at: data.approved_at,
      created_by: data.created_by,
      created_at: data.created_at,
      items: (data.items || []).map((it: any) => ({
        id: it.id,
        bank_reconciliation_id: it.bank_reconciliation_id,
        financial_transaction_id: it.financial_transaction_id,
        transaction_number: it.financial_transaction?.transaction_number,
        statement_date: it.statement_date,
        statement_description: it.statement_description,
        statement_reference: it.statement_reference,
        statement_amount: Number(it.statement_amount),
        match_status: it.match_status,
        match_type: it.match_type,
        confidence_score: Number(it.confidence_score || 0),
        notes: it.notes,
        confirmed_by: it.confirmed_by,
        created_at: it.created_at,
      })),
    };
  }

  async listBankReconciliations(params: {
    accountId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<BankReconciliation>> {
    const page = params.page && params.page > 0 ? Number(params.page) : 1;
    const limit = params.limit && params.limit > 0 ? Number(params.limit) : 20;
    const offset = (page - 1) * limit;

    if (!isSupabaseConfigured() || !supabaseClient) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    let query = supabaseClient
      .from('bank_reconciliations')
      .select('*, account:financial_accounts(name, account_number), verifier:profiles!bank_reconciliations_verified_by_fkey(full_name), approver:profiles!bank_reconciliations_approved_by_fkey(full_name)', { count: 'exact' });

    if (params.accountId) query = query.eq('account_id', params.accountId);
    if (params.status) query = query.eq('status', params.status);

    const { data, count, error } = await query
      .order('period_end', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error || !data) return { data: [], total: 0, page, limit, totalPages: 0 };

    const total = count || data.length;
    const formatted: BankReconciliation[] = data.map((r: any) => ({
      id: r.id,
      account_id: r.account_id,
      account_name: r.account?.name,
      account_number: r.account?.account_number,
      period_start: r.period_start,
      period_end: r.period_end,
      statement_ending_balance: Number(r.statement_ending_balance),
      system_ending_balance: Number(r.system_ending_balance),
      reconciled_balance: Number(r.reconciled_balance),
      difference: Number(r.difference),
      status: r.status,
      notes: r.notes,
      verified_by: r.verified_by,
      verified_by_name: r.verifier?.full_name,
      approved_by: r.approved_by,
      approved_by_name: r.approver?.full_name,
      approved_at: r.approved_at,
      created_by: r.created_by,
      created_at: r.created_at,
    }));

    return { data: formatted, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async generateMatchSuggestions(reconciliationId: string, accountId: string): Promise<number> {
    if (!isSupabaseConfigured() || !supabaseClient) return 0;

    // Get unmatched items for this reconciliation
    const { data: items } = await supabaseClient
      .from('bank_reconciliation_items')
      .select('*')
      .eq('bank_reconciliation_id', reconciliationId)
      .eq('match_status', 'UNMATCHED');

    if (!items || items.length === 0) return 0;

    // Get system transactions for this bank account
    const { data: transactions } = await supabaseClient
      .from('financial_transactions')
      .select('*')
      .eq('financial_account_id', accountId)
      .order('transaction_date', { ascending: false })
      .limit(100);

    if (!transactions || transactions.length === 0) return 0;

    let suggestionsCount = 0;

    for (const item of items) {
      const itemAmt = Number(item.statement_amount);
      // Find candidate transaction with matching amount
      const candidate = transactions.find(t => Math.abs(Number(t.amount) - Math.abs(itemAmt)) < 0.01);
      if (candidate) {
        let confidence = 75;
        if (candidate.reference_number && item.statement_reference && candidate.reference_number.toLowerCase() === item.statement_reference.toLowerCase()) {
          confidence = 98;
        } else if (candidate.transaction_date === item.statement_date) {
          confidence = 90;
        }

        await supabaseClient
          .from('bank_reconciliation_items')
          .update({
            financial_transaction_id: candidate.id,
            match_type: confidence > 90 ? 'EXACT' : 'AUTO_SUGGESTED',
            confidence_score: confidence,
            notes: `Auto-suggested match with system transaction #${candidate.transaction_number}`,
          })
          .eq('id', item.id);

        suggestionsCount++;
      }
    }

    return suggestionsCount;
  }

  async confirmMatch(itemId: string, transactionId: string, userId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabaseClient) return false;

    const { data: item } = await supabaseClient
      .from('bank_reconciliation_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (!item) return false;

    await supabaseClient
      .from('bank_reconciliation_items')
      .update({
        financial_transaction_id: transactionId,
        match_status: 'MATCHED',
        match_type: 'MANUAL',
        confidence_score: 100,
        confirmed_by: userId,
      })
      .eq('id', itemId);

    // Recompute reconciled balance
    await this.recalculateReconciledBalance(item.bank_reconciliation_id);
    return true;
  }

  async unmatchItem(itemId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabaseClient) return false;

    const { data: item } = await supabaseClient
      .from('bank_reconciliation_items')
      .select('bank_reconciliation_id')
      .eq('id', itemId)
      .single();

    if (!item) return false;

    await supabaseClient
      .from('bank_reconciliation_items')
      .update({
        financial_transaction_id: null,
        match_status: 'UNMATCHED',
        match_type: null,
        confidence_score: 0,
        confirmed_by: null,
      })
      .eq('id', itemId);

    await this.recalculateReconciledBalance(item.bank_reconciliation_id);
    return true;
  }

  async recalculateReconciledBalance(reconciliationId: string): Promise<void> {
    if (!isSupabaseConfigured() || !supabaseClient) return;

    const { data: matchedItems } = await supabaseClient
      .from('bank_reconciliation_items')
      .select('statement_amount')
      .eq('bank_reconciliation_id', reconciliationId)
      .eq('match_status', 'MATCHED');

    const totalMatched = (matchedItems || []).reduce((acc, curr) => acc + Number(curr.statement_amount), 0);

    const { data: rec } = await supabaseClient
      .from('bank_reconciliations')
      .select('statement_ending_balance, system_ending_balance')
      .eq('id', reconciliationId)
      .single();

    if (rec) {
      const statementEnding = Number(rec.statement_ending_balance);
      const diff = statementEnding - totalMatched;
      await supabaseClient
        .from('bank_reconciliations')
        .update({
          reconciled_balance: totalMatched,
          difference: diff,
          status: Math.abs(diff) < 0.01 ? 'REVIEW_REQUIRED' : 'IN_PROGRESS',
        })
        .eq('id', reconciliationId);
    }
  }

  async updateReconciliationStatus(id: string, status: 'COMPLETED' | 'APPROVED', userId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabaseClient) return false;

    const updatePayload: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'COMPLETED') {
      updatePayload.verified_by = userId;
    } else if (status === 'APPROVED') {
      updatePayload.approved_by = userId;
      updatePayload.approved_at = new Date().toISOString();
    }

    const { error } = await supabaseClient
      .from('bank_reconciliations')
      .update(updatePayload)
      .eq('id', id);

    if (!error) {
      await auditLogsRepository.log({
        user_id: userId,
        action: `BANK_RECONCILIATION_${status}`,
        module: 'reconciliation',
        record_id: id,
        new_data: updatePayload,
      });
      return true;
    }
    return false;
  }
}

export const reconciliationRepository = new ReconciliationRepository();
