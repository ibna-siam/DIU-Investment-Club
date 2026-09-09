import { supabaseClient, isSupabaseConfigured } from '../../config/supabase';
import { FinancialAccount, FinancialTransaction, Income, Expense, FinancialDashboardMetrics } from '../../types';

export class FinancialEngineService {
  /**
   * Generates next sequential transaction number (TXN-YYYY-XXXXX)
   */
  async generateTxnNumber(): Promise<string> {
    const year = new Date().getFullYear();
    if (isSupabaseConfigured() && supabaseClient) {
      try {
        const { count, error } = await supabaseClient
          .from('financial_transactions')
          .select('*', { count: 'exact', head: true })
          .ilike('transaction_number', `TXN-${year}-%`);
        if (!error && count !== null) {
          const nextSeq = (count + 1).toString().padStart(5, '0');
          return `TXN-${year}-${nextSeq}`;
        }
      } catch (e) {}
    }
    const randomSeq = Math.floor(10000 + Math.random() * 90000);
    return `TXN-${year}-${randomSeq}`;
  }

  /**
   * Generates next sequential income number (INC-YYYY-XXXXX)
   */
  async generateIncomeNumber(): Promise<string> {
    const year = new Date().getFullYear();
    if (isSupabaseConfigured() && supabaseClient) {
      try {
        const { count, error } = await supabaseClient
          .from('incomes')
          .select('*', { count: 'exact', head: true })
          .ilike('income_number', `INC-${year}-%`);
        if (!error && count !== null) {
          const nextSeq = (count + 1).toString().padStart(5, '0');
          return `INC-${year}-${nextSeq}`;
        }
      } catch (e) {}
    }
    const randomSeq = Math.floor(10000 + Math.random() * 90000);
    return `INC-${year}-${randomSeq}`;
  }

  /**
   * Generates next sequential expense number (EXP-YYYY-XXXXX)
   */
  async generateExpenseNumber(): Promise<string> {
    const year = new Date().getFullYear();
    if (isSupabaseConfigured() && supabaseClient) {
      try {
        const { count, error } = await supabaseClient
          .from('expenses')
          .select('*', { count: 'exact', head: true })
          .ilike('expense_number', `EXP-${year}-%`);
        if (!error && count !== null) {
          const nextSeq = (count + 1).toString().padStart(5, '0');
          return `EXP-${year}-${nextSeq}`;
        }
      } catch (e) {}
    }
    const randomSeq = Math.floor(10000 + Math.random() * 90000);
    return `EXP-${year}-${randomSeq}`;
  }

  /**
   * Atomic Financial Account Creation with Opening Balance
   */
  async createAccount(data: {
    name: string;
    account_type: string;
    account_number?: string;
    provider_name?: string;
    opening_balance: number;
    description?: string;
    created_by?: string;
  }): Promise<FinancialAccount> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data: account, error } = await supabaseClient.rpc('create_financial_account', {
        p_name: data.name,
        p_account_type: data.account_type,
        p_account_number: data.account_number || null,
        p_provider_name: data.provider_name || null,
        p_opening_balance: data.opening_balance,
        p_description: data.description || null,
        p_created_by: data.created_by || null,
      });

      if (error) {
        throw new Error(error.message);
      }
      return account as FinancialAccount;
    }

    throw new Error('Database connection required for financial transaction creation');
  }

  /**
   * Atomic Income Completion: locks account, creates credit transaction, increases balance
   */
  async completeIncome(incomeId: string, userId: string): Promise<any> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data, error } = await supabaseClient.rpc('complete_income_transaction', {
        p_income_id: incomeId,
        p_user_id: userId,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Automatically post double-entry journal and voucher
      try {
        const { accountingEngine } = await import('../accounting/accounting.engine');
        await accountingEngine.postOperationalEvent('INCOME', incomeId, userId);
      } catch (postErr) {
        console.warn('Accounting auto-posting deferred:', postErr);
      }

      return data;
    }
    throw new Error('Database connection required for completing income');
  }

  /**
   * Atomic Expense Payment: checks balance, locks account, creates debit transaction, decreases balance
   */
  async payExpense(expenseId: string, userId: string): Promise<any> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data, error } = await supabaseClient.rpc('pay_expense_transaction', {
        p_expense_id: expenseId,
        p_user_id: userId,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Automatically post double-entry journal and voucher
      try {
        const { accountingEngine } = await import('../accounting/accounting.engine');
        await accountingEngine.postOperationalEvent('EXPENSE', expenseId, userId);
      } catch (postErr) {
        console.warn('Accounting auto-posting deferred:', postErr);
      }

      return data;
    }
    throw new Error('Database connection required for paying expense');
  }

  /**
   * Fetches Real-Time Financial Dashboard Metrics
   */
  async getDashboardMetrics(): Promise<FinancialDashboardMetrics> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data, error } = await supabaseClient.rpc('get_financial_dashboard_metrics');
      if (!error && data) {
        return {
          total_available_balance: Number(data.total_available_balance || 0),
          cash_balance: Number(data.cash_balance || 0),
          bank_balance: Number(data.bank_balance || 0),
          mobile_balance: Number(data.mobile_balance || 0),
          total_income: Number(data.total_income || 0),
          total_expenses: Number(data.total_expenses || 0),
          current_month_income: Number(data.current_month_income || 0),
          current_month_expenses: Number(data.current_month_expenses || 0),
          recent_transactions: data.recent_transactions || [],
        };
      }
    }

    return {
      total_available_balance: 0,
      cash_balance: 0,
      bank_balance: 0,
      mobile_balance: 0,
      total_income: 0,
      total_expenses: 0,
      current_month_income: 0,
      current_month_expenses: 0,
      recent_transactions: [],
    };
  }
}

export const financialEngineService = new FinancialEngineService();
