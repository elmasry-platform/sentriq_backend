import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, ParseUUIDPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, SupabaseAuthGuard } from '../identity/supabase-auth.guard';
import { FormsService } from './forms.service';
import { ApproveFormDto, CloneFormDto, CreateFormDto, ReturnFormDto, SaveFormDto, StatusFormDto, SubmitFormDto, ValidateFormDto } from './dto';

const tok = (r: AuthenticatedRequest) => r.accessToken as string;

@Controller('v1/forms')
@UseGuards(SupabaseAuthGuard)
export class FormsController {
  constructor(private readonly forms: FormsService) {}

  @Get() list(@Req() r: AuthenticatedRequest, @Query('tenantId', ParseUUIDPipe) t: string) { return this.forms.list(tok(r), t); }
  @Post('validate') @HttpCode(200) validate(@Req() r: AuthenticatedRequest, @Body() d: ValidateFormDto) { return this.forms.validate(tok(r), d); }
  @Post() async create(@Req() r: AuthenticatedRequest, @Body() d: CreateFormDto) { return { id: await this.forms.create(tok(r), d) }; }
  @Get(':id') get(@Req() r: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) { return this.forms.get(tok(r), id); }
  @Put(':id') save(@Req() r: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() d: SaveFormDto) { return this.forms.save(tok(r), id, d); }
  @Post(':id/submit') @HttpCode(204) async submit(@Req() r: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() d: SubmitFormDto) { await this.forms.submit(tok(r), id, d); }
  @Post(':id/return') @HttpCode(204) async ret(@Req() r: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() d: ReturnFormDto) { await this.forms.returnToDraft(tok(r), id, d); }
  @Post(':id/approve') @HttpCode(200) async approve(@Req() r: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() d: ApproveFormDto) { return { version: await this.forms.approve(tok(r), id, d) }; }
  @Post(':id/status') @HttpCode(204) async status(@Req() r: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() d: StatusFormDto) { await this.forms.setStatus(tok(r), id, d); }
  @Post(':id/clone') async clone(@Req() r: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() d: CloneFormDto) { return { id: await this.forms.clone(tok(r), id, d) }; }
  @Get(':id/versions') versions(@Req() r: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) { return this.forms.versions(tok(r), id); }
  @Get(':id/versions/:version') version(@Req() r: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Param('version', ParseIntPipe) v: number) { return this.forms.version(tok(r), id, v); }
  @Get(':id/compare') compare(@Req() r: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Query('from', ParseIntPipe) from: number, @Query('to', ParseIntPipe) to: number) { return this.forms.compare(tok(r), id, from, to); }
}
