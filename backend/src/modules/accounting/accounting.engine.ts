import { getDbAdmin } from '../../config/supabase';

export type OperationalRefType = 
  | 'MEMBER_PAYMENT' 
  | 'DONATION' 
  | 'SPONSORSHIP_PAYMENT' 
  | 'INCOME' 
  | 'EXPENSE' 
  | 'TRANSFER';

export class AccountingEngine {
  /**
   * Automatically posts a double-entry journal and generates a voucher
   * for an approved/completed operational financial event.
   * Completely idempotent: calling multiple times for the same (refType, refId)
   * will safely return the existing posted journal without duplicates.
   */
  async postOperationalEvent(
    refType: OperationalRefType,
    refId: string,
    userId: string = 'a1111111-1111-1111-1111-111111111111'
  ): Promise<any> {
    try {
      const { data, error } = await getDbAdmin().rpc('post_automated_operational_journal', {
        p_ref_type: refType,
        p_ref_id: refId,
        p_user_id: userId,
      });

      if (error) {
        console.error(`[AccountingEngine] Failed to post ${refType} #${refId}:`, error.message);
        return { success: false, error: error.message };
      }

      console.log(`[AccountingEngine] Successfully posted ${refType} #${refId} -> Journal ${data?.journal_number}`);
      return data;
    } catch (err: any) {
      console.error(`[AccountingEngine] Exception posting ${refType} #${refId}:`, err.message);
      return { success: false, error: err.message };
    }
  }
}

export const accountingEngine = new AccountingEngine();
