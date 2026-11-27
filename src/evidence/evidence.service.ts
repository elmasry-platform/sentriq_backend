import { BadGatewayException, ConflictException, ForbiddenException, HttpException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PostgrestError, PostgrestService } from '../supabase/postgrest.service';
import { StorageService } from '../supabase/storage.service';
import { EVIDENCE_POLICY as P } from '../policy/policy';
import { canDownload, checkEvidenceUpload } from '../policy/evidence-check';
import { EvidenceConfirmDto, EvidenceIntentDto } from './dto';

export const EVIDENCE_BUCKET = 'sentriq-hse-evidence';

/** DB (DE, M05/062) owns rows, scan_status, aggregate limit and authz. Expected RPCs: evidence_create_intent, evidence_confirm, evidence_get_download. */
@Injectable()
export class EvidenceService {
  constructor(private readonly pg: PostgrestService, private readonly storage: StorageService) {}

  private fail(e: unknown): Error {
    if (e instanceof PostgrestError) {
      if (e.message === 'evidence_not_found') return new NotFoundException({ code: 'evidence_not_found' });
      if (e.message === 'evidence_payload_mismatch') return new ConflictException({ code: 'payload_mismatch' });
      if (e.message === 'evidence_submission_too_large') return new UnprocessableEntityException({ code: 'submission_too_large' });
      if (e.code === '42501' || e.status === 401 || e.status === 403) return new ForbiddenException({ code: 'forbidden' });
    }
    return new BadGatewayException('database_error');
  }

  async createIntent(token: string, d: EvidenceIntentDto) {
    const reject = checkEvidenceUpload({ mimeType: d.mimeType, bytes: d.bytes }, []);
    if (reject) throw new UnprocessableEntityException({ code: reject });
    try {
      return await this.pg.rpc('evidence_create_intent', {
        p_tenant_id: d.tenantId, p_client_id: d.clientEvidenceId, p_inspection_id: d.inspectionId, p_question_id: d.questionId,
        p_file_name: d.fileName, p_mime_type: d.mimeType, p_bytes: d.bytes, p_sha256: d.sha256,
        p_original_sha256: d.originalSha256 ?? null, p_original_bytes: d.originalBytes ?? null,
      }, token);
    } catch (e) { throw this.fail(e); }
  }

  async confirm(token: string, id: string, d: EvidenceConfirmDto) {
    try { return await this.pg.rpc('evidence_confirm', { p_id: id, p_sha256: d.sha256 }, token); } catch (e) { throw this.fail(e); }
  }

  async download(token: string, id: string) {
    let row: { storagePath?: string; scanStatus?: string };
    try { row = await this.pg.rpc('evidence_get_download', { p_id: id }, token); } catch (e) { throw this.fail(e); }
    if (!row?.storagePath) throw new NotFoundException({ code: 'evidence_not_found' });
    if (!canDownload(row.scanStatus ?? '')) throw new HttpException({ code: 'evidence_not_available', scanStatus: row.scanStatus ?? 'unknown' }, 423);
    try {
      const url = await this.storage.signedDownloadUrl(EVIDENCE_BUCKET, row.storagePath, P.signedLinkTtlSeconds, token);
      return { url, expiresInSeconds: P.signedLinkTtlSeconds };
    } catch {
      throw new ForbiddenException({ code: 'forbidden' });
    }
  }
}
