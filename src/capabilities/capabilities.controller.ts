import { Body, Controller, Get, HttpCode, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, SupabaseAuthGuard } from '../identity/supabase-auth.guard';
import { AuthUser } from '../identity/identity.service';
import { CapabilitiesService } from './capabilities.service';
import { AuthorizeDto } from './dto';

@Controller('v1')
@UseGuards(SupabaseAuthGuard)
export class CapabilitiesController {
  constructor(private readonly capabilities: CapabilitiesService) {}

  @Get('me/capabilities')
  getCapabilities(@Req() req: AuthenticatedRequest, @Query('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.capabilities.getCapabilities(
      req.authUser as AuthUser,
      req.accessToken as string,
      tenantId,
    );
  }

  @Post('authorize')
  @HttpCode(200)
  authorize(@Req() req: AuthenticatedRequest, @Body() dto: AuthorizeDto) {
    return this.capabilities.authorize(req.accessToken as string, dto);
  }
}
