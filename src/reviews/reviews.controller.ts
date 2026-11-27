import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, SupabaseAuthGuard } from '../identity/supabase-auth.guard';
import { ReviewsService } from './reviews.service';
import { ReopenDto, ResubmitDto, ReviewDecisionDto } from './dto';

const tok = (r: AuthenticatedRequest) => r.accessToken as string;
@Controller('v1/inspections')
@UseGuards(SupabaseAuthGuard)
export class ReviewsController {
  constructor(private readonly s: ReviewsService) {}
  @Post(':id/review') @HttpCode(200) decide(@Req() r: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() d: ReviewDecisionDto) { return this.s.decide(tok(r), id, d); }
  @Post(':id/resubmit') @HttpCode(200) resubmit(@Req() r: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() d: ResubmitDto) { return this.s.resubmit(tok(r), id, d); }
  @Post(':id/reopen') @HttpCode(200) reopen(@Req() r: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() d: ReopenDto) { return this.s.reopen(tok(r), id, d); }
}
