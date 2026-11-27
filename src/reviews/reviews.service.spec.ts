import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { PostgrestError, PostgrestService } from '../supabase/postgrest.service';

const U = '11111111-1111-4111-8111-111111111111';
const mk = (rpc: jest.Mock) => new ReviewsService({ rpc } as unknown as PostgrestService);
const err = (m: string, code = '22023', status = 400) => jest.fn().mockRejectedValue(new PostgrestError(status, code, m));
describe('ReviewsService', () => {
  it('forwards token, revision and decision', async () => {
    const rpc = jest.fn().mockResolvedValue({});
    await mk(rpc).decide('tokA', U, { expectedRevision: 2, decision: 'return', reason: 'fix photos', flaggedQuestionIds: ['q1', 'q1'] });
    expect(rpc).toHaveBeenCalledWith('inspection_review_decide', { p_id: U, p_expected_revision: 2, p_decision: 'return', p_reason: 'fix photos', p_flagged_question_ids: ['q1'] }, 'tokA');
  });
  it('approve without a reason sends null reason and no flags', async () => {
    const rpc = jest.fn().mockResolvedValue({});
    await mk(rpc).decide('t', U, { expectedRevision: 1, decision: 'approve' });
    expect(rpc).toHaveBeenCalledWith('inspection_review_decide', { p_id: U, p_expected_revision: 1, p_decision: 'approve', p_reason: null, p_flagged_question_ids: null }, 't');
  });
  it('flags are refused on approve (422) and empty flag list on return is allowed', async () => {
    await expect(mk(jest.fn()).decide('t', U, { expectedRevision: 1, decision: 'approve', flaggedQuestionIds: ['q1'] })).rejects.toBeInstanceOf(UnprocessableEntityException);
    const rpc = jest.fn().mockResolvedValue({});
    await mk(rpc).decide('t', U, { expectedRevision: 1, decision: 'return', reason: 'please redo', flaggedQuestionIds: [] });
    expect(rpc.mock.calls[0][1].p_flagged_question_ids).toEqual([]);
  });
  it('self review is 403, stale revision 409, hidden inspection 404', async () => {
    const d = { expectedRevision: 1, decision: 'approve' as const, reason: 'all good' };
    await expect(mk(err('reviewer_must_differ_from_submitter', '42501')).decide('t', U, d)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(mk(err('x', '40001')).decide('t', U, d)).rejects.toBeInstanceOf(ConflictException);
    await expect(mk(err('inspection_not_found')).decide('t', U, d)).rejects.toBeInstanceOf(NotFoundException);
  });
  it('stages cannot be skipped or approved early (409/403)', async () => {
    const d = { expectedRevision: 1, decision: 'approve' as const, reason: 'all good' };
    await expect(mk(err('review_stage_out_of_order')).decide('t', U, d)).rejects.toBeInstanceOf(ConflictException);
    await expect(mk(err('review_stage_not_allowed', '42501')).decide('t', U, d)).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('unchanged resubmission without a reply is 422', async () => {
    await expect(mk(err('reply_required_when_unchanged')).resubmit('t', U, { expectedRevision: 1, reply: '' })).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
  it('reopen needs its own permission and only from approved', async () => {
    const d = { expectedRevision: 1, reason: 'new evidence found' };
    await expect(mk(err('reopen_not_permitted', '42501')).reopen('t', U, d)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(mk(err('inspection_not_approved')).reopen('t', U, d)).rejects.toBeInstanceOf(ConflictException);
    const rpc = jest.fn().mockResolvedValue({ revision: 3 });
    await mk(rpc).reopen('tokA', U, d);
    expect(rpc).toHaveBeenCalledWith('inspection_reopen', { p_id: U, p_expected_revision: 1, p_reason: 'new evidence found' }, 'tokA');
  });
});
