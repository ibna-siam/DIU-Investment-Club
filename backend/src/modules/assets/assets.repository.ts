import { getDbAdmin } from '../../config/supabase';
import { ClubAsset, AssetAssignmentItem, AssetMaintenanceItem } from '../../types';

export class AssetsRepository {
  async getAssets(params?: {
    category?: string;
    status?: string;
    condition?: string;
    search?: string;
  }): Promise<ClubAsset[]> {
    let query = getDbAdmin()
      .from('club_assets')
      .select(`
        *,
        assignee:profiles!assigned_to(id, full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (params?.category) query = query.eq('category', params.category);
    if (params?.status) query = query.eq('status', params.status);
    if (params?.condition) query = query.eq('current_condition', params.condition);
    if (params?.search) {
      query = query.or(`asset_name.ilike.%${params.search}%,asset_code.ilike.%${params.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as ClubAsset[];
  }

  async getAssetById(id: string): Promise<ClubAsset | null> {
    const { data, error } = await getDbAdmin()
      .from('club_assets')
      .select(`
        *,
        assignee:profiles!assigned_to(id, full_name, email),
        assignments:asset_assignments(
          id, asset_id, assigned_to, assignment_date, expected_return_date, actual_return_date,
          condition_on_assignment, condition_on_return, notes, created_at,
          assignee:profiles!assigned_to(full_name, email)
        ),
        maintenance_logs:asset_maintenance(
          id, asset_id, maintenance_date, description, cost, vendor, status, next_maintenance_date, created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) return null;
    return data as ClubAsset;
  }

  async createAsset(payload: {
    asset_name: string;
    asset_code: string;
    category: string;
    description?: string;
    purchase_date?: string;
    purchase_cost?: number;
    current_condition?: string;
    location?: string;
    status?: string;
  }): Promise<ClubAsset> {
    const { data, error } = await getDbAdmin()
      .from('club_assets')
      .insert({
        asset_name: payload.asset_name,
        asset_code: payload.asset_code,
        category: payload.category || 'EQUIPMENT',
        description: payload.description,
        purchase_date: payload.purchase_date || null,
        purchase_cost: payload.purchase_cost || 0,
        current_condition: payload.current_condition || 'GOOD',
        location: payload.location || 'Club Office, Room 402',
        status: payload.status || 'AVAILABLE',
      })
      .select()
      .single();

    if (error) throw error;
    return data as ClubAsset;
  }

  async updateAsset(id: string, payload: Partial<ClubAsset>): Promise<ClubAsset> {
    const { data, error } = await getDbAdmin()
      .from('club_assets')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ClubAsset;
  }

  async assignAsset(
    assetId: string,
    payload: {
      assigned_to: string;
      assignment_date?: string;
      expected_return_date?: string;
      condition_on_assignment?: string;
      notes?: string;
      assigned_by?: string;
    }
  ): Promise<AssetAssignmentItem> {
    const { data, error } = await getDbAdmin()
      .from('asset_assignments')
      .insert({
        asset_id: assetId,
        assigned_to: payload.assigned_to,
        assignment_date: payload.assignment_date || new Date().toISOString().split('T')[0],
        expected_return_date: payload.expected_return_date || null,
        condition_on_assignment: payload.condition_on_assignment || 'GOOD',
        notes: payload.notes || null,
        assigned_by: payload.assigned_by || null,
      })
      .select(`
        *,
        assignee:profiles!assigned_to(full_name, email)
      `)
      .single();

    if (error) throw error;

    // Update asset status to ASSIGNED
    await getDbAdmin()
      .from('club_assets')
      .update({
        status: 'ASSIGNED',
        assigned_to: payload.assigned_to,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assetId);

    return data as AssetAssignmentItem;
  }

  async returnAsset(
    assignmentId: string,
    payload: {
      condition_on_return: string;
      notes?: string;
    }
  ): Promise<void> {
    const { data: assignment, error: getErr } = await getDbAdmin()
      .from('asset_assignments')
      .select('asset_id')
      .eq('id', assignmentId)
      .single();

    if (getErr || !assignment) throw new Error('Assignment record not found');

    const returnDate = new Date().toISOString().split('T')[0];

    // Close assignment
    await getDbAdmin()
      .from('asset_assignments')
      .update({
        actual_return_date: returnDate,
        condition_on_return: payload.condition_on_return,
        notes: payload.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignmentId);

    // Update asset status back to AVAILABLE
    const isDamaged = payload.condition_on_return === 'DAMAGED' || payload.condition_on_return === 'POOR';
    await getDbAdmin()
      .from('club_assets')
      .update({
        status: isDamaged ? 'UNDER_MAINTENANCE' : 'AVAILABLE',
        current_condition: payload.condition_on_return,
        assigned_to: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignment.asset_id);
  }

  async addMaintenanceLog(
    assetId: string,
    payload: {
      maintenance_date?: string;
      description: string;
      cost?: number;
      vendor?: string;
      status?: string;
      next_maintenance_date?: string;
      recorded_by?: string;
    }
  ): Promise<AssetMaintenanceItem> {
    const { data, error } = await getDbAdmin()
      .from('asset_maintenance')
      .insert({
        asset_id: assetId,
        maintenance_date: payload.maintenance_date || new Date().toISOString().split('T')[0],
        description: payload.description,
        cost: payload.cost || 0,
        vendor: payload.vendor || null,
        status: payload.status || 'COMPLETED',
        next_maintenance_date: payload.next_maintenance_date || null,
        recorded_by: payload.recorded_by || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as AssetMaintenanceItem;
  }
}

export const assetsRepository = new AssetsRepository();
