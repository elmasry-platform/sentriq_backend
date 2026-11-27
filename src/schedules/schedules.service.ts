import { BadGatewayException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PostgrestError, PostgrestService } from '../supabase/postgrest.service';
import { CancelDto, CreateScheduleDto, ReassignDto } from './dto';

/** DB (DE, M07/064) owns generation (key schedule_id + occurrence_date), overdue, pinning. Expected: v_schedules, v_occurrences, schedule_create, schedule_cancel, schedule_reassign. */
@Injectable()
export class SchedulesService {
  constructor(private readonly pg: PostgrestService) {}

  private fail(e: unknown): Error {
    if (e instanceof PostgrestError) {
      if (e.message === 'schedule_not_found') return new NotFoundException({ code: 'schedule_not_found' });
      if (e.message === 'template_not_published' || e.message === 'template_retired') return new UnprocessableEntityException({ code: e.message });
      if (e.message === 'schedule_already_cancelled') return new ConflictException({ code: e.message });
      if (e.code === '42501' || e.status === 401 || e.status === 403) return new ForbiddenException({ code: 'forbidden' });
    }
    return new BadGatewayException('database_error');
  }
  private async run<T>(p: Promise<T>): Promise<T> { try { return await p; } catch (e) { throw this.fail(e); } }

  list(token: string, tenantId: string) { return this.run(this.pg.select('v_schedules', { select: '*', workspaceId: `eq.${tenantId}`, order: 'createdAt.desc', limit: '200' }, token)); }
  occurrences(token: string, tenantId: string, status?: string) {
    const q: Record<string, string> = { select: '*', workspaceId: `eq.${tenantId}`, order: 'dueDate.asc', limit: '500' };
    if (status) q.status = `eq.${status}`;
    return this.run(this.pg.select('v_occurrences', q, token));
  }
  create(token: string, d: CreateScheduleDto) {
    return this.run(this.pg.rpc('schedule_create', {
      p_tenant_id: d.tenantId, p_template_id: d.templateId, p_site_id: d.siteId, p_assignee: d.assigneeMembershipId,
      p_frequency: d.frequency, p_interval: d.interval ?? 1, p_start_date: d.startDate, p_end_date: d.endDate ?? null,
      p_timezone: d.timezone, p_due_after_days: d.dueAfterDays,
    }, token));
  }
  cancel(token: string, id: string, d: CancelDto) { return this.run(this.pg.rpc('schedule_cancel', { p_id: id, p_reason: d.reason }, token)); }
  reassign(token: string, id: string, d: ReassignDto) { return this.run(this.pg.rpc('schedule_reassign', { p_id: id, p_assignee: d.assigneeMembershipId, p_reason: d.reason }, token)); }
}
