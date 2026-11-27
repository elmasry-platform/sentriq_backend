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
import { FormsService } from './forms/forms.service';
import { FormsController } from './forms/forms.controller';
import { InspectionSyncService } from './inspections/sync.service';
import { InspectionsController } from './inspections/inspections.controller';
import { StorageService } from './supabase/storage.service';
import { EvidenceService } from './evidence/evidence.service';
import { EvidenceController } from './evidence/evidence.controller';
import { SchedulesService } from './schedules/schedules.service';
import { SchedulesController } from './schedules/schedules.controller';
import { ReviewsService } from './reviews/reviews.service';
import { ReviewsController } from './reviews/reviews.controller';

@Module({
  imports: [ConfigModule, ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }])],
  controllers: [HealthController, CapabilitiesController, FormsController, InspectionsController, EvidenceController, SchedulesController, ReviewsController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    IdentityService, SupabaseAuthGuard, PostgrestService, CapabilitiesService, FormsService, InspectionSyncService, StorageService, EvidenceService, SchedulesService, ReviewsService],
})
export class AppModule {}
