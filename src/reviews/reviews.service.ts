import { BadGatewayException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PostgrestError, PostgrestService } from '../supabase/postgrest.service';
import { ReopenDto, ResubmitDto, ReviewDecisionDto } from './dto';

/**
 * Review chain, resubmission and reopen are enforced in the DB (DE, M04): stage order, submitter cannot review own inspection,
 * hybrid return routing computed from STORED answers, history rows. Expected RPCs: inspection_review_decide, inspection_resubmit, inspection_reopen.
 */
@Injectable()
export class ReviewsService {
  constructor(private readonly pg: PostgrestService) {}

  private fail(e: unknown): Error {
    if (e instanceof PostgrestError) {
      const m = e.message;
      if (m === 'inspection_not_found') return new NotFoundException({ code: m });
      if (m === 'inspection_revision_conflict' || e.code === '40001') return new ConflictException({ code: 'inspection_revision_conflict' });
      if (['reviewer_must_differ_from_submitter', 'review_stage_not_allowed', 'reopen_not_permitted'].includes(m)) return new ForbiddenException({ code: m });
      if (['inspection_not_in_review', 'inspection_not_approved', 'review_stage_out_of_order'].includes(m)) return new ConflictException({ code: m });
      if (['return_reason_required', 'reply_required_when_unchanged', 'reason_too_short', 'reopen_reason_required', 'flagged_questions_only'].includes(m)) return new UnprocessableEntityException({ code: m });
      if (e.code === '42501' || e.status === 401 || e.status === 403) return new ForbiddenException({ code: 'forbidden' });
    }
    return new BadGatewayException('database_error');
  }
  private async run<T>(p: Promise<T>): Promise<T> { try { return await p; } catch (e) { throw this.fail(e); } }

  decide(token: string, id: string, d: ReviewDecisionDto) {
    if (d.decision !== 'return' && d.flaggedQuestionIds?.length) {
      throw new UnprocessableEntityException({ code: 'flags_only_valid_on_return' });
    }
    return this.run(this.pg.rpc('inspection_review_decide', {
      p_id: id, p_expected_revision: d.expectedRevision, p_decision: d.decision, p_reason: d.reason ?? null,
      p_flagged_question_ids: d.decision === 'return' ? [...new Set(d.flaggedQuestionIds ?? [])] : null,
    }, token));
  }
  resubmit(token: string, id: string, d: ResubmitDto) {
    return this.run(this.pg.rpc('inspection_resubmit', { p_id: id, p_expected_revision: d.expectedRevision, p_reply: d.reply }, token));
  }
  reopen(token: string, id: string, d: ReopenDto) {
    return this.run(this.pg.rpc('inspection_reopen', { p_id: id, p_expected_revision: d.expectedRevision, p_reason: d.reason }, token));
  }
}
