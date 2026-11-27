import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, SupabaseAuthGuard } from '../identity/supabase-auth.guard';
import { InspectionSyncService } from './sync.service';
import { SyncBatchDto } from './dto';

@Controller('v1/inspections')
@UseGuards(SupabaseAuthGuard)
export class InspectionsController {
  constructor(private readonly sync: InspectionSyncService) {}

  @Post('sync') @HttpCode(200)
  syncBatch(@Req() r: AuthenticatedRequest, @Body() d: SyncBatchDto) { return this.sync.sync(r.accessToken as string, d); }
}
