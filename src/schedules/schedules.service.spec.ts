import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { PostgrestError, PostgrestService } from '../supabase/postgrest.service';

const U = '11111111-1111-4111-8111-111111111111';
const mk = (rpc: jest.Mock, select = jest.fn()) => new SchedulesService({ rpc, select } as unknown as PostgrestService);
const err = (m: string, code = '22023', status = 400) => jest.fn().mockRejectedValue(new PostgrestError(status, code, m));
const create = { tenantId: U, templateId: U, siteId: U, assigneeMembershipId: U, frequency: 'weekly' as const, startDate: '2026-12-01', timezone: 'Africa/Cairo', dueAfterDays: 2 };

describe('SchedulesService', () => {
  it('forwards token, timezone and due offset to the DB', async () => {
    const rpc = jest.fn().mockResolvedValue({ id: 's1' });
    await mk(rpc).create('tokA', create);
    expect(rpc).toHaveBeenCalledWith('schedule_create', expect.objectContaining({ p_timezone: 'Africa/Cairo', p_due_after_days: 2, p_interval: 1 }), 'tokA');
  });
  it('maps unpublished/retired template to 422 and double cancel to 409', async () => {
    await expect(mk(err('template_not_published')).create('t', create)).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(mk(err('template_retired')).create('t', create)).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(mk(err('schedule_already_cancelled')).cancel('t', U, { reason: 'r' })).rejects.toBeInstanceOf(ConflictException);
  });
  it('cross-company schedule is 404 / 403 for the caller, never data', async () => {
    await expect(mk(err('schedule_not_found')).reassign('tokB', U, { assigneeMembershipId: U, reason: 'r' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(mk(err('x', '42501', 403)).cancel('tokB', U, { reason: 'r' })).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('lists occurrences by status through the caller view', async () => {
    const select = jest.fn().mockResolvedValue([]);
    await mk(jest.fn(), select).occurrences('tokA', U, 'overdue');
    expect(select).toHaveBeenCalledWith('v_occurrences', expect.objectContaining({ status: 'eq.overdue' }), 'tokA');
  });
});
