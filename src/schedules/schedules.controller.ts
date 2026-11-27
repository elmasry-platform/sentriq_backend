import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, SupabaseAuthGuard } from '../identity/supabase-auth.guard';
import { SchedulesService } from './schedules.service';
import { CancelDto, CreateScheduleDto, ReassignDto } from './dto';

const tok = (r: AuthenticatedRequest) => r.accessToken as string;
@Controller('v1')
@UseGuards(SupabaseAuthGuard)
export class SchedulesController {
  constructor(private readonly s: SchedulesService) {}
  @Get('schedules') list(@Req() r: AuthenticatedRequest, @Query('tenantId', ParseUUIDPipe) t: string) { return this.s.list(tok(r), t); }
  @Post('schedules') create(@Req() r: AuthenticatedRequest, @Body() d: CreateScheduleDto) { return this.s.create(tok(r), d); }
  @Post('schedules/:id/cancel') @HttpCode(204) async cancel(@Req() r: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() d: CancelDto) { await this.s.cancel(tok(r), id, d); }
  @Post('schedules/:id/reassign') @HttpCode(204) async reassign(@Req() r: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() d: ReassignDto) { await this.s.reassign(tok(r), id, d); }
  @Get('occurrences') occ(@Req() r: AuthenticatedRequest, @Query('tenantId', ParseUUIDPipe) t: string, @Query('status') st?: string) { return this.s.occurrences(tok(r), t, st); }
}
