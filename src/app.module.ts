import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { IdentityService } from './identity/identity.service';
import { SupabaseAuthGuard } from './identity/supabase-auth.guard';
import { PostgrestService } from './supabase/postgrest.service';
import { HealthController } from './health/health.controller';
import { CapabilitiesService } from './capabilities/capabilities.service';
import { CapabilitiesController } from './capabilities/capabilities.controller';

@Module({
  imports: [ConfigModule],
  controllers: [HealthController, CapabilitiesController],
  providers: [IdentityService, SupabaseAuthGuard, PostgrestService, CapabilitiesService],
})
export class AppModule {}
