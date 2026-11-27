import { BadGatewayException, ForbiddenException, Injectable } from '@nestjs/common';
import { PostgrestError, PostgrestService } from '../supabase/postgrest.service';
import { SyncBatchDto } from './dto';

export type SyncStatus = 'applied' | 'duplicate' | 'rejected';
export interface SyncResult { clientOpId: string; status: SyncStatus; reason?: string; details?: unknown }

const REASONS = new Set([
  'payload_mismatch', 'assignment_revoked', 'inspection_already_submitted', 'template_version_retired_or_missing',
  'site_access_lost', 'validation_failed', 'evidence_missing', 'server_conflict',
]);

/** Forwards the batch to api.inspection_sync (DB-owned, idempotent). The backend never decides outcomes itself. */
@Injectable()
export class InspectionSyncService {
  constructor(private readonly pg: PostgrestService) {}

  async sync(token: string, dto: SyncBatchDto): Promise<{ results: SyncResult[] }> {
    const ids = new Set(dto.ops.map((o) => o.clientOpId));
    let raw: unknown;
    try {
      raw = await this.pg.rpc('inspection_sync', { p_tenant_id: dto.tenantId, p_ops: dto.ops }, token);
    } catch (e) {
      if (e instanceof PostgrestError && (e.code === '42501' || e.status === 401 || e.status === 403)) {
        throw new ForbiddenException({ code: 'forbidden' });
      }
      throw new BadGatewayException('database_error');
    }
    const rows = Array.isArray(raw) ? (raw as SyncResult[]) : [];
    // Every submitted op must get exactly one answer, in request order; anything missing is reported rejected, never assumed applied.
    const byId = new Map(rows.filter((r) => ids.has(r.clientOpId)).map((r) => [r.clientOpId, r]));
    return {
      results: dto.ops.map((o) => {
        const r = byId.get(o.clientOpId);
        if (!r) return { clientOpId: o.clientOpId, status: 'rejected' as const, reason: 'server_no_result' };
        if (r.status === 'rejected' && r.reason && !REASONS.has(r.reason)) return { ...r, reason: 'server_conflict' };
        return r;
      }),
    };
  }
}
