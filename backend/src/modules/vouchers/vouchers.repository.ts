import { getDbAdmin } from '../../config/supabase';
import { Voucher, VoucherType, VoucherStatus } from '../../types';

export class VouchersRepository {
  async findAll(filter?: {
    voucher_type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
  }): Promise<Voucher[]> {
    let query = getDbAdmin()
      .from('vouchers')
      .select(`
        *,
        preparer:prepared_by(id, full_name),
        approver:approved_by(id, full_name),
        journal_entry:journal_entry_id(
          id,
          journal_number,
          entry_date,
          status,
          total_debit,
          total_credit,
          description,
          lines:journal_entry_lines(
            id,
            debit_amount,
            credit_amount,
            description,
            account:chart_of_accounts(id, account_code, account_name)
          )
        )
      `)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filter?.voucher_type) {
      query = query.eq('voucher_type', filter.voucher_type.toUpperCase());
    }
    if (filter?.status) {
      query = query.eq('status', filter.status.toUpperCase());
    }
    if (filter?.start_date) {
      query = query.gte('transaction_date', filter.start_date);
    }
    if (filter?.end_date) {
      query = query.lte('transaction_date', filter.end_date);
    }
    if (filter?.search) {
      query = query.or(`voucher_number.ilike.%${filter.search}%,description.ilike.%${filter.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((v: any) => ({
      ...v,
      preparer_name: v.preparer?.full_name,
      approver_name: v.approver?.full_name,
    })) as Voucher[];
  }

  async findById(id: string): Promise<Voucher | null> {
    const { data, error } = await getDbAdmin()
      .from('vouchers')
      .select(`
        *,
        preparer:prepared_by(id, full_name),
        approver:approved_by(id, full_name),
        journal_entry:journal_entry_id(
          id,
          journal_number,
          entry_date,
          status,
          total_debit,
          total_credit,
          description,
          lines:journal_entry_lines(
            id,
            debit_amount,
            credit_amount,
            description,
            account:chart_of_accounts(id, account_code, account_name, account_type)
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;

    return {
      ...data,
      preparer_name: data.preparer?.full_name,
      approver_name: data.approver?.full_name,
    } as Voucher;
  }

  async create(
    data: {
      voucher_type: VoucherType;
      journal_entry_id: string;
      transaction_date: string;
      description?: string | null;
    },
    userId: string
  ): Promise<Voucher> {
    // Generate voucher number via stored procedure
    const { data: vNumber, error: seqErr } = await getDbAdmin().rpc('generate_voucher_number', {
      p_type: data.voucher_type,
    });
    if (seqErr) throw seqErr;

    const { data: created, error } = await getDbAdmin()
      .from('vouchers')
      .insert({
        voucher_number: vNumber,
        voucher_type: data.voucher_type,
        journal_entry_id: data.journal_entry_id,
        transaction_date: data.transaction_date,
        description: data.description || null,
        status: 'POSTED',
        prepared_by: userId,
        approved_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return this.findById(created.id) as Promise<Voucher>;
  }

  async approve(id: string, userId: string): Promise<Voucher> {
    const { data: updated, error } = await getDbAdmin()
      .from('vouchers')
      .update({
        approved_by: userId,
        status: 'POSTED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.findById(id) as Promise<Voucher>;
  }

  async cancel(id: string, userId: string): Promise<Voucher> {
    const { data: updated, error } = await getDbAdmin()
      .from('vouchers')
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.findById(id) as Promise<Voucher>;
  }
}

export const vouchersRepository = new VouchersRepository();
