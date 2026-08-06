import { supabase } from '@database/supabase';
import { Organization, OrganizationLocation, OrganizationBranding, OrganizationStaff, OrganizationAuditLog } from './organization.types';

export class OrganizationRepository {
  async findById(orgId: string): Promise<Organization | null> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (error || !data) return null;
    return data as Organization;
  }

  async getLocations(orgId: string): Promise<OrganizationLocation[]> {
    const { data, error } = await supabase
      .from('organization_locations')
      .select('*')
      .eq('organization_id', orgId);

    if (error || !data) return [];
    return data as OrganizationLocation[];
  }

  async getBranding(orgId: string): Promise<OrganizationBranding | null> {
    const { data, error } = await supabase
      .from('organization_branding')
      .select('*')
      .eq('organization_id', orgId)
      .single();

    if (error || !data) return null;
    return data as OrganizationBranding;
  }

  async getStaff(orgId: string): Promise<OrganizationStaff[]> {
    const { data, error } = await supabase
      .from('organization_staff')
      .select('*')
      .eq('organization_id', orgId);

    if (error || !data) return [];
    return data as OrganizationStaff[];
  }

  async logAudit(log: Partial<OrganizationAuditLog>): Promise<void> {
    await supabase.from('organization_audit_logs').insert([log]);
  }
}
