import { BadGatewayException, ConflictException, ForbiddenException, HttpException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { EvidenceService } from './evidence.service';
import { PostgrestError, PostgrestService } from '../supabase/postgrest.service';
import { StorageService } from '../supabase/storage.service';

const U = '11111111-1111-4111-8111-111111111111';
const dto = { tenantId: U, clientEvidenceId: U, inspectionId: U, questionId: 'q1', fileName: 'a.jpg', mimeType: 'image/jpeg', bytes: 1000, sha256: 'a'.repeat(64) };
const mk = (rpc: jest.Mock, sign = jest.fn().mockResolvedValue('https://x/signed')) =>
  new EvidenceService({ rpc } as unknown as PostgrestService, { signedDownloadUrl: sign } as unknown as StorageService);
const err = (m: string, code = '22023', status = 400) => jest.fn().mockRejectedValue(new PostgrestError(status, code, m));

describe('EvidenceService', () => {
  it('rejects video and oversize before touching the DB', async () => {
    const rpc = jest.fn();
    await expect(mk(rpc).createIntent('t', { ...dto, mimeType: 'video/mp4' })).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(mk(rpc).createIntent('t', { ...dto, bytes: 10 * 1024 * 1024 + 1 })).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('forwards token and client id (duplicate prevention is keyed by client id)', async () => {
    const rpc = jest.fn().mockResolvedValue({ id: 'e1' });
    await mk(rpc).createIntent('tokA', dto);
    expect(rpc).toHaveBeenCalledWith('evidence_create_intent', expect.objectContaining({ p_client_id: U, p_sha256: dto.sha256 }), 'tokA');
  });
  it('same client id with different content = 409 payload_mismatch', async () => {
    await expect(mk(err('evidence_payload_mismatch')).createIntent('t', dto)).rejects.toBeInstanceOf(ConflictException);
  });
  it('aggregate limit from DB = 422; RLS denial = 403; unknown = 502', async () => {
    await expect(mk(err('evidence_submission_too_large')).createIntent('t', dto)).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(mk(err('x', '42501', 403)).createIntent('t', dto)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(mk(err('boom', 'XX', 500)).createIntent('t', dto)).rejects.toBeInstanceOf(BadGatewayException);
  });
  it('download signs a 10-minute link only when scan is clean', async () => {
    const sign = jest.fn().mockResolvedValue('https://x/signed');
    const out = await mk(jest.fn().mockResolvedValue({ storagePath: 'p/a.jpg', scanStatus: 'clean' }), sign).download('tokA', U);
    expect(sign).toHaveBeenCalledWith('sentriq-hse-evidence', 'p/a.jpg', 600, 'tokA');
    expect(out.expiresInSeconds).toBe(600);
  });
  it.each(['pending', 'quarantined', 'failed'])('download is 423 and never signs while scan_status=%s', async (s) => {
    const sign = jest.fn();
    const e = await mk(jest.fn().mockResolvedValue({ storagePath: 'p', scanStatus: s }), sign).download('t', U).catch((x) => x);
    expect((e as HttpException).getStatus()).toBe(423);
    expect(sign).not.toHaveBeenCalled();
  });
  it('download of an invisible row (other company/site) is 404 or 403, never a link', async () => {
    const sign = jest.fn();
    await expect(mk(err('evidence_not_found'), sign).download('t', U)).rejects.toBeInstanceOf(NotFoundException);
    await expect(mk(jest.fn().mockResolvedValue(null), sign).download('t', U)).rejects.toBeInstanceOf(NotFoundException);
    expect(sign).not.toHaveBeenCalled();
  });
  it('storage refusing the user token gives 403', async () => {
    const sign = jest.fn().mockRejectedValue(new Error('storage_sign_400'));
    await expect(mk(jest.fn().mockResolvedValue({ storagePath: 'p', scanStatus: 'clean' }), sign).download('t', U)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
