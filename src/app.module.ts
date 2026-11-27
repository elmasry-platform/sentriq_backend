import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from './config/config.module';
import { IdentityService } from './identity/identity.service';
import { SupabaseAuthGuard } from './identity/supabase-auth.guard';
import { PostgrestService } from './supabase/postgrest.service';
import { HealthController } from './health/health.controller';
import { CapabilitiesService } from './capabilities/capabilities.service';
import { CapabilitiesController } from './capabilities/capabilities.controller';

@Module({
  imports: [ConfigModule, ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }])],
  controllers: [HealthController, CapabilitiesController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    IdentityService, SupabaseAuthGuard, PostgrestService, CapabilitiesService],
})
export class AppModule {}
