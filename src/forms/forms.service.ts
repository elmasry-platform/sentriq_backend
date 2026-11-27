import { Injectable } from '@nestjs/common';
import { PostgrestService } from '../supabase/postgrest.service';
import { mapFormError } from './form-errors';
import { ApproveFormDto, CloneFormDto, CreateFormDto, ReturnFormDto, SaveFormDto, StatusFormDto, SubmitFormDto, ValidateFormDto } from './dto';

const DEFAULT_LANGS = ['en', 'ar'];

/** Thin pass-through: user JWT forwarded, RLS and api.form_* guards decide. */
@Injectable()
export class FormsService {
  constructor(private readonly pg: PostgrestService) {}

  private async run<T>(p: Promise<T>): Promise<T> {
    try { return await p; } catch (e) { throw mapFormError(e); }
  }

  list(token: string, tenantId: string) {
    return this.run(this.pg.select('v_forms', { select: '*', workspaceId: `eq.${tenantId}`, order: 'updatedAt.desc', limit: '200' }, token));
  }
  async get(token: string, id: string) {
    const rows = await this.run(this.pg.select<unknown[]>('v_forms', { select: '*', id: `eq.${id}`, limit: '1' }, token));
    if (!rows.length) throw mapFormError(new (await import('../supabase/postgrest.service')).PostgrestError(404, undefined, 'form_not_found'));
    return rows[0];
  }
  validate(token: string, d: ValidateFormDto) {
    return this.run(this.pg.rpc('form_validate', { p_title: d.title, p_languages: d.languages ?? DEFAULT_LANGS, p_definition: d.definition }, token));
  }
  create(token: string, d: CreateFormDto) {
    return this.run(this.pg.rpc<string>('form_create_draft', { p_tenant_id: d.tenantId, p_title: d.title, p_category: d.category, p_definition: d.definition, p_languages: d.languages ?? DEFAULT_LANGS }, token));
  }
  save(token: string, id: string, d: SaveFormDto) {
    return this.run(this.pg.rpc('form_save_draft', { p_id: id, p_expected_revision: d.expectedRevision, p_title: d.title, p_category: d.category, p_definition: d.definition, p_languages: d.languages ?? DEFAULT_LANGS }, token));
  }
  submit(token: string, id: string, d: SubmitFormDto) {
    return this.run(this.pg.rpc('form_submit_for_approval', { p_id: id, p_expected_revision: d.expectedRevision, p_change_note: d.changeNote }, token));
  }
  returnToDraft(token: string, id: string, d: ReturnFormDto) {
    return this.run(this.pg.rpc('form_return_to_draft', { p_id: id, p_reason: d.reason }, token));
  }
  approve(token: string, id: string, d: ApproveFormDto) {
    return this.run(this.pg.rpc<number>('form_approve_publish', { p_id: id, p_expected_revision: d.expectedRevision }, token));
  }
  setStatus(token: string, id: string, d: StatusFormDto) {
    return this.run(this.pg.rpc('form_set_status', { p_id: id, p_status: d.status }, token));
  }
  clone(token: string, id: string, d: CloneFormDto) {
    return this.run(this.pg.rpc<string>('form_clone', { p_id: id, p_title: d.title ?? null }, token));
  }
  compare(token: string, id: string, from: number, to: number) {
    return this.run(this.pg.rpc('form_compare_versions', { p_id: id, p_from: from, p_to: to }, token));
  }
}
