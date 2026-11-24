import { BadGatewayException } from '@nestjs/common';
import { CapabilitiesService } from './capabilities.service';
import { PostgrestError, PostgrestService } from '../supabase/postgrest.service';

const user = { id: 'user-1', email: 'u@example.com' };
const membershipRow = {
  id: 'user-1',
  membershipId: 'm-1',
  workspaceId: 't-1',
  displayName: 'User One',
  email: 'u@example.com',
  role: 'company_admin',
  status: 'active',
  siteIds: ['s-1'],
  membershipLevel: 'company_admin',
  functionalRoles: ['hse_inspector'],
};

function service(selectImpl: jest.Mock, rpcImpl: jest.Mock) {
  const postgrest = { select: selectImpl, rpc: rpcImpl } as unknown as PostgrestService;
  return new CapabilitiesService(postgrest);
}

describe('CapabilitiesService', () => {
  it('returns the membership profile for a member', async () => {
    const select = jest.fn().mockResolvedValue([membershipRow]);
    const rpc = jest.fn();
    const profile = await service(select, rpc).getCapabilities(user, 'tok', 't-1');
    expect(profile.membership).toEqual({
      id: 'm-1',
      level: 'company_admin',
      status: 'active',
      displayName: 'User One',
      siteIds: ['s-1'],
      functionalRoles: ['hse_inspector'],
    });
    expect(profile.entitlements).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
    expect(select).toHaveBeenCalledWith(
      'v_memberships',
      expect.objectContaining({ id: 'eq.user-1', workspaceId: 'eq.t-1' }),
      'tok',
    );
  });

  it('returns a null membership for a non-member', async () => {
    const profile = await service(jest.fn().mockResolvedValue([]), jest.fn()).getCapabilities(user, 'tok', 't-1');
    expect(profile.membership).toBeNull();
    expect(profile.user.id).toBe('user-1');
  });

  it('loads entitlements only for an active superadmin', async () => {
    const select = jest
      .fn()
      .mockResolvedValue([{ ...membershipRow, membershipLevel: 'company_superadmin' }]);
    const rpc = jest.fn().mockResolvedValue([{ entitlement_kind: 'module', entitlement_key: 'hse', entitled: true }]);
    const profile = await service(select, rpc).getCapabilities(user, 'tok', 't-1');
    expect(rpc).toHaveBeenCalledWith('list_my_entitlements', { p_tenant_id: 't-1' }, 'tok');
    expect(profile.entitlements).toHaveLength(1);
  });

  it('tolerates a 42501 entitlement rejection', async () => {
    const select = jest
      .fn()
      .mockResolvedValue([{ ...membershipRow, membershipLevel: 'company_superadmin' }]);
    const rpc = jest.fn().mockRejectedValue(new PostgrestError(400, '42501', 'active_company_superadmin_required'));
    const profile = await service(select, rpc).getCapabilities(user, 'tok', 't-1');
    expect(profile.entitlements).toBeNull();
  });

  it('maps PostgREST failures to 502 without internals', async () => {
    const select = jest.fn().mockRejectedValue(new PostgrestError(400, 'PGRST106', 'Invalid schema: api'));
    await expect(service(select, jest.fn()).getCapabilities(user, 'tok', 't-1')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    await expect(service(select, jest.fn()).getCapabilities(user, 'tok', 't-1')).rejects.toThrow(
      'database_error:PGRST106',
    );
  });

  it('passes authorize arguments through and normalizes the boolean', async () => {
    const rpc = jest.fn().mockResolvedValue(true);
    const result = await service(jest.fn(), rpc).authorize('tok', {
      tenantId: 't-1',
      permissionKey: 'hse.inspections',
      action: 'read',
    });
    expect(rpc).toHaveBeenCalledWith(
      'authorize',
      {
        p_tenant_id: 't-1',
        p_permission_key: 'hse.inspections',
        p_action: 'read',
        p_site_id: null,
        p_org_unit_id: null,
        p_task_kind: null,
        p_task_id: null,
      },
      'tok',
    );
    expect(result).toEqual({ allowed: true });
  });

  it('treats a non-true authorize result as denied', async () => {
    const rpc = jest.fn().mockResolvedValue(false);
    const result = await service(jest.fn(), rpc).authorize('tok', {
      tenantId: 't-1',
      permissionKey: 'hse.inspections',
      action: 'write',
    });
    expect(result).toEqual({ allowed: false });
  });
});
