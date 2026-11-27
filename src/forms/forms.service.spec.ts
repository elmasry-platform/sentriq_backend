import { ConflictException, ForbiddenException, HttpException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { FormsService } from './forms.service';
import { PostgrestError, PostgrestService } from '../supabase/postgrest.service';

const mk = (rpc: jest.Mock, select = jest.fn()) => new FormsService({ rpc, select } as unknown as PostgrestService);
const fail = (msg: string, code = '23514', status = 400) => jest.fn().mockRejectedValue(new PostgrestError(status, code, msg));

describe('FormsService', () => {
  it('forwards the caller token and expected revision on save', async () => {
    const rpc = jest.fn().mockResolvedValue(2);
    await mk(rpc).save('tokA', 'id1', { expectedRevision: 1, title: { en: 'x' }, category: 'c', definition: {} });
    expect(rpc).toHaveBeenCalledWith('form_save_draft', expect.objectContaining({ p_id: 'id1', p_expected_revision: 1, p_languages: ['en', 'ar'] }), 'tokA');
  });
  it('maps revision conflict to 409', async () => {
    await expect(mk(fail('form_revision_conflict', '40001')).approve('t', 'i', { expectedRevision: 1 })).rejects.toBeInstanceOf(ConflictException);
  });
  it('maps locked in approval to 423', async () => {
    const e = await mk(fail('form_locked_in_approval')).save('t', 'i', { expectedRevision: 1, title: {}, category: 'c', definition: {} }).catch((x) => x);
    expect((e as HttpException).getStatus()).toBe(423);
  });
  it('maps self approval to 403', async () => {
    await expect(mk(fail('form_approver_must_differ_from_author', '42501')).approve('t', 'i', { expectedRevision: 1 })).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('maps validation failure to 422', async () => {
    await expect(mk(fail('form_validation_failed', '22023')).submit('t', 'i', { expectedRevision: 1, changeNote: 'n' })).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
  it('maps RLS denial to 403 and unknown form to 404', async () => {
    await expect(mk(fail('permission denied', '42501', 403)).clone('t', 'i', {})).rejects.toBeInstanceOf(ForbiddenException);
    await expect(mk(fail('form_not_found', '22023')).returnToDraft('t', 'i', { expectedRevision: 1, reason: 'r' })).rejects.toBeInstanceOf(NotFoundException);
  });
  it('get returns 404 when RLS hides the row (cross-company)', async () => {
    await expect(mk(jest.fn(), jest.fn().mockResolvedValue([])).get('tokB', 'idOfCompanyA')).rejects.toBeInstanceOf(NotFoundException);
  });
  it('maps by message, not by code: 22023 not_found vs validation', async () => {
    await expect(mk(fail('form_not_found', '22023')).approve('t', 'i', { expectedRevision: 1 })).rejects.toBeInstanceOf(NotFoundException);
    await expect(mk(fail('form_validation_failed', '22023')).approve('t', 'i', { expectedRevision: 1 })).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
  it('maps new publish and size errors to 422 and form_not_permitted to 403', async () => {
    for (const m of ['question_type_not_supported', 'definition_too_large', 'too_many_questions']) {
      await expect(mk(fail(m, '22023')).approve('t', 'i', { expectedRevision: 1 })).rejects.toBeInstanceOf(UnprocessableEntityException);
    }
    await expect(mk(fail('form_not_permitted', '42501')).approve('t', 'i', { expectedRevision: 1 })).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('reads versions from v_form_versions with the caller token', async () => {
    const select = jest.fn().mockResolvedValue([]);
    await mk(jest.fn(), select).versions('tokA', 'id1');
    expect(select).toHaveBeenCalledWith('v_form_versions', expect.objectContaining({ templateId: 'eq.id1' }), 'tokA');
  });
  it('hides database internals on unknown errors', async () => {
    const e = await mk(fail('boom secret detail', 'XX000', 500)).clone('t', 'i', {}).catch((x) => x);
    expect(JSON.stringify(e.getResponse())).not.toContain('secret');
  });
});
