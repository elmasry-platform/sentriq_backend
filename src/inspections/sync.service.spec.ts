import { BadGatewayException, ForbiddenException } from '@nestjs/common';
import { InspectionSyncService } from './sync.service';
import { PostgrestError, PostgrestService } from '../supabase/postgrest.service';

const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222', T = '33333333-3333-4333-8333-333333333333';
const op = (id: string) => ({ clientOpId: id, type: 'submit' as const, inspectionId: T, payload: {} });
const svc = (rpc: jest.Mock) => new InspectionSyncService({ rpc } as unknown as PostgrestService);

describe('InspectionSyncService', () => {
  it('forwards the caller token and the whole batch to the DB RPC', async () => {
    const rpc = jest.fn().mockResolvedValue([{ clientOpId: A, status: 'applied' }]);
    await svc(rpc).sync('tokA', { tenantId: T, ops: [op(A)] });
    expect(rpc).toHaveBeenCalledWith('inspection_sync', { p_tenant_id: T, p_ops: [op(A)] }, 'tokA');
  });
  it('returns one result per op in request order; retry returns duplicate', async () => {
    const rpc = jest.fn().mockResolvedValue([{ clientOpId: B, status: 'duplicate' }, { clientOpId: A, status: 'applied' }]);
    const out = await svc(rpc).sync('t', { tenantId: T, ops: [op(A), op(B)] });
    expect(out.results.map((r) => [r.clientOpId, r.status])).toEqual([[A, 'applied'], [B, 'duplicate']]);
  });
  it('never reports a missing op as applied', async () => {
    const out = await svc(jest.fn().mockResolvedValue([])).sync('t', { tenantId: T, ops: [op(A)] });
    expect(out.results[0]).toMatchObject({ status: 'rejected', reason: 'server_no_result' });
  });
  it('keeps known rejection reasons and normalises unknown ones', async () => {
    const rpc = jest.fn().mockResolvedValue([
      { clientOpId: A, status: 'rejected', reason: 'payload_mismatch' },
      { clientOpId: B, status: 'rejected', reason: 'internal secret text' },
    ]);
    const out = await svc(rpc).sync('t', { tenantId: T, ops: [op(A), op(B)] });
    expect(out.results[0].reason).toBe('payload_mismatch');
    expect(out.results[1].reason).toBe('server_conflict');
  });
  it('maps RLS denial to 403 and other failures to generic 502', async () => {
    await expect(svc(jest.fn().mockRejectedValue(new PostgrestError(403, '42501', 'x'))).sync('t', { tenantId: T, ops: [op(A)] })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc(jest.fn().mockRejectedValue(new PostgrestError(500, 'XX', 'x'))).sync('t', { tenantId: T, ops: [op(A)] })).rejects.toBeInstanceOf(BadGatewayException);
  });
});
