import { getDbAdmin } from '../../config/supabase';
import { JournalEntry, JournalEntryLine, JournalStatus } from '../../types';

export class JournalEntriesRepository {
  async findAll(filter?: {
    status?: string;
    start_date?: string;
    end_date?: string;
    reference_type?: string;
    search?: string;
  }): Promise<JournalEntry[]> {
    let query = getDbAdmin()
      .from('journal_entries')
      .select(`
        *,
        creator:created_by(id, full_name),
        poster:posted_by(id, full_name),
        lines:journal_entry_lines(
          id,
          account_id,
          description,
          debit_amount,
          credit_amount,
          subledger_type,
          subledger_id,
          account:chart_of_accounts(id, account_code, account_name, account_type)
        ),
        voucher:vouchers(id, voucher_number, voucher_type, status)
      `)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filter?.status) {
      query = query.eq('status', filter.status.toUpperCase());
    }
    if (filter?.reference_type) {
      query = query.eq('reference_type', filter.reference_type);
    }
    if (filter?.start_date) {
      query = query.gte('entry_date', filter.start_date);
    }
    if (filter?.end_date) {
      query = query.lte('entry_date', filter.end_date);
    }
    if (filter?.search) {
      query = query.or(`journal_number.ilike.%${filter.search}%,description.ilike.%${filter.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((j: any) => ({
      ...j,
      creator_name: j.creator?.full_name,
      poster_name: j.poster?.full_name,
      voucher: Array.isArray(j.voucher) ? j.voucher[0] : j.voucher,
    })) as JournalEntry[];
  }

  async findById(id: string): Promise<JournalEntry | null> {
    const { data, error } = await getDbAdmin()
      .from('journal_entries')
      .select(`
        *,
        creator:created_by(id, full_name),
        poster:posted_by(id, full_name),
        lines:journal_entry_lines(
          id,
          account_id,
          description,
          debit_amount,
          credit_amount,
          subledger_type,
          subledger_id,
          account:chart_of_accounts(id, account_code, account_name, account_type, normal_balance)
        ),
        voucher:vouchers(id, voucher_number, voucher_type, status)
      `)
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;

    return {
      ...data,
      creator_name: data.creator?.full_name,
      poster_name: data.poster?.full_name,
      voucher: Array.isArray(data.voucher) ? data.voucher[0] : data.voucher,
    } as JournalEntry;
  }

  async createDraft(
    data: {
      entry_date: string;
      description: string;
      reference_type?: string | null;
      reference_id?: string | null;
      lines: {
        account_id: string;
        description?: string | null;
        debit_amount: number;
        credit_amount: number;
        subledger_type?: 'MEMBER' | 'SPONSOR' | 'EVENT' | 'OTHER' | null;
        subledger_id?: string | null;
      }[];
    },
    userId: string
  ): Promise<JournalEntry> {
    if (!data.lines || data.lines.length < 2) {
      throw new Error('A journal entry must contain at least two double-entry lines');
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of data.lines) {
      const debit = Number(line.debit_amount) || 0;
      const credit = Number(line.credit_amount) || 0;

      if ((debit > 0 && credit > 0) || (debit === 0 && credit === 0)) {
        throw new Error('Each line must have either a positive Debit or Credit amount, not both or neither.');
      }
      totalDebit += debit;
      totalCredit += credit;
    }

    // Call generate_journal_number() via RPC
    const { data: jNumber, error: seqErr } = await getDbAdmin().rpc('generate_journal_number');
    if (seqErr) throw seqErr;

    // Insert header
    const { data: header, error: headErr } = await getDbAdmin()
      .from('journal_entries')
      .insert({
        journal_number: jNumber,
        entry_date: data.entry_date,
        description: data.description,
        reference_type: data.reference_type || 'MANUAL',
        reference_id: data.reference_id || null,
        status: 'DRAFT',
        total_debit: totalDebit,
        total_credit: totalCredit,
        created_by: userId,
      })
      .select()
      .single();

    if (headErr) throw headErr;

    // Insert lines
    const linesToInsert = data.lines.map((l) => ({
      journal_entry_id: header.id,
      account_id: l.account_id,
      description: l.description || data.description,
      debit_amount: Number(l.debit_amount) || 0,
      credit_amount: Number(l.credit_amount) || 0,
      subledger_type: l.subledger_type || null,
      subledger_id: l.subledger_id || null,
    }));

    const { error: lineErr } = await getDbAdmin().from('journal_entry_lines').insert(linesToInsert);
    if (lineErr) throw lineErr;

    return this.findById(header.id) as Promise<JournalEntry>;
  }

  async updateDraft(
    id: string,
    data: {
      entry_date?: string;
      description?: string;
      lines?: {
        account_id: string;
        description?: string | null;
        debit_amount: number;
        credit_amount: number;
        subledger_type?: 'MEMBER' | 'SPONSOR' | 'EVENT' | 'OTHER' | null;
        subledger_id?: string | null;
      }[];
    }
  ): Promise<JournalEntry> {
    const existing = await this.findById(id);
    if (!existing) throw new Error('Journal entry not found');
    if (existing.status !== 'DRAFT' && existing.status !== 'SUBMITTED') {
      throw new Error(`Cannot modify journal entry with status ${existing.status}`);
    }

    let totalDebit = existing.total_debit;
    let totalCredit = existing.total_credit;

    if (data.lines) {
      if (data.lines.length < 2) {
        throw new Error('A journal entry must contain at least two double-entry lines');
      }

      totalDebit = 0;
      totalCredit = 0;

      for (const line of data.lines) {
        const debit = Number(line.debit_amount) || 0;
        const credit = Number(line.credit_amount) || 0;
        if ((debit > 0 && credit > 0) || (debit === 0 && credit === 0)) {
          throw new Error('Each line must have either a positive Debit or Credit amount');
        }
        totalDebit += debit;
        totalCredit += credit;
      }

      // Replace lines
      await getDbAdmin().from('journal_entry_lines').delete().eq('journal_entry_id', id);

      const linesToInsert = data.lines.map((l) => ({
        journal_entry_id: id,
        account_id: l.account_id,
        description: l.description || data.description || existing.description,
        debit_amount: Number(l.debit_amount) || 0,
        credit_amount: Number(l.credit_amount) || 0,
        subledger_type: l.subledger_type || null,
        subledger_id: l.subledger_id || null,
      }));

      await getDbAdmin().from('journal_entry_lines').insert(linesToInsert);
    }

    const { error: upErr } = await getDbAdmin()
      .from('journal_entries')
      .update({
        entry_date: data.entry_date || existing.entry_date,
        description: data.description || existing.description,
        total_debit: totalDebit,
        total_credit: totalCredit,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (upErr) throw upErr;

    return this.findById(id) as Promise<JournalEntry>;
  }

  async deleteDraft(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) throw new Error('Journal entry not found');
    if (existing.status !== 'DRAFT') {
      throw new Error(`Only DRAFT journal entries can be deleted. Current status: ${existing.status}`);
    }

    await getDbAdmin().from('journal_entry_lines').delete().eq('journal_entry_id', id);
    const { error } = await getDbAdmin().from('journal_entries').delete().eq('id', id);
    if (error) throw error;
  }

  async submit(id: string): Promise<JournalEntry> {
    const existing = await this.findById(id);
    if (!existing) throw new Error('Journal entry not found');
    if (existing.status !== 'DRAFT') {
      throw new Error(`Only DRAFT journals can be submitted. Current status: ${existing.status}`);
    }

    if (existing.total_debit !== existing.total_credit) {
      throw new Error(`Cannot submit unbalanced journal: Debit ${existing.total_debit} != Credit ${existing.total_credit}`);
    }

    const { error } = await getDbAdmin()
      .from('journal_entries')
      .update({ status: 'PENDING_APPROVAL', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return this.findById(id) as Promise<JournalEntry>;
  }

  async approve(id: string): Promise<JournalEntry> {
    const existing = await this.findById(id);
    if (!existing) throw new Error('Journal entry not found');
    if (existing.status !== 'PENDING_APPROVAL' && existing.status !== 'DRAFT') {
      throw new Error(`Cannot approve journal in status ${existing.status}`);
    }

    const { error } = await getDbAdmin()
      .from('journal_entries')
      .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return this.findById(id) as Promise<JournalEntry>;
  }

  async post(id: string, userId: string): Promise<any> {
    const { data, error } = await getDbAdmin().rpc('post_journal_entry', {
      p_journal_id: id,
      p_user_id: userId,
    });

    if (error) throw error;
    return data;
  }

  async reverse(id: string, userId: string, reason: string): Promise<any> {
    const { data, error } = await getDbAdmin().rpc('reverse_journal_entry', {
      p_journal_id: id,
      p_user_id: userId,
      p_reason: reason,
    });

    if (error) throw error;
    return data;
  }
}

export const journalRepository = new JournalEntriesRepository();
