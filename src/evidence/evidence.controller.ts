import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, SupabaseAuthGuard } from '../identity/supabase-auth.guard';
import { EvidenceService } from './evidence.service';
import { EvidenceConfirmDto, EvidenceIntentDto } from './dto';

@Controller('v1/evidence')
@UseGuards(SupabaseAuthGuard)
export class EvidenceController {
  constructor(private readonly ev: EvidenceService) {}
  @Post('intents') @HttpCode(200) intent(@Req() r: AuthenticatedRequest, @Body() d: EvidenceIntentDto) { return this.ev.createIntent(r.accessToken as string, d); }
  @Post(':id/confirm') @HttpCode(200) confirm(@Req() r: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() d: EvidenceConfirmDto) { return this.ev.confirm(r.accessToken as string, id, d); }
  @Get(':id/download') download(@Req() r: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) { return this.ev.download(r.accessToken as string, id); }
}
