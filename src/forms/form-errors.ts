import {
  BadGatewayException, ConflictException, ForbiddenException, HttpException, NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PostgrestError } from '../supabase/postgrest.service';

/** Maps database form_* error names to stable API errors. The DB decides; we only translate. */
export function mapFormError(error: unknown): Error {
  if (!(error instanceof PostgrestError)) return error as Error;
  const m = error.message;
  const body = (code: string, extra: Record<string, unknown> = {}) => ({ code, ...extra });
  if (m === 'form_revision_conflict') return new ConflictException(body('form_revision_conflict'));
  if (m === 'form_locked_in_approval') return new HttpException(body('form_locked_in_approval'), 423);
  if (['form_status_transition_not_allowed', 'form_content_change_requires_draft', 'form_insert_must_be_draft', 'form_not_in_approval'].includes(m)) {
    return new ConflictException(body(m));
  }
  if (m === 'form_approver_must_differ_from_author' || m === 'form_publish_requires_approval') {
    return new ForbiddenException(body(m));
  }
  if (m === 'form_validation_failed') return new UnprocessableEntityException(body(m));
  if (m === 'form_change_note_required' || m === 'form_return_reason_required') {
    return new UnprocessableEntityException(body(m));
  }
  if (m === 'form_not_found' || m === 'form_version_not_found') return new NotFoundException(body(m));
  if (error.code === '42501' || error.status === 401 || error.status === 403) return new ForbiddenException(body('forbidden'));
  return new BadGatewayException('database_error');
}
