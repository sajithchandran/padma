import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import {
  appConfig,
  databaseConfig,
  redisConfig,
  authConfig,
  integrationConfig,
} from './config';
import { DatabaseModule } from './database';
import { PathwaysModule } from './pathways/pathways.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { PathwayEngineModule } from './pathway-engine/pathway-engine.module';
import { TasksModule } from './tasks/tasks.module';
import { JobsModule } from './jobs/jobs.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { CommunicationModule } from './communication/communication.module';
import { PrivacyModule } from './privacy/privacy.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReminderSchedulerModule } from './reminders/reminder-scheduler.module';
import { EscalationModule } from './escalation/escalation.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { RolesModule } from './roles/roles.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { CareTeamModule } from './care-team/care-team.module';
import { PatientsModule } from './patients/patients.module';
import { CareChatModule } from './care-chat/care-chat.module';
import { ObservationsModule } from './observations/observations.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, authConfig, integrationConfig],
    }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60000, limit: 100 },
      { name: 'sensitive', ttl: 60000, limit: 10 },
    ]),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    PathwaysModule,
    EnrollmentModule,
    PathwayEngineModule,
    TasksModule,
    JobsModule,
    IntegrationsModule,
    CommunicationModule,
    PrivacyModule,
    DashboardModule,
    ReminderSchedulerModule,
    EscalationModule,
    UsersModule,
    TenantsModule,
    RolesModule,
    CareTeamModule,
    PatientsModule,
    CareChatModule,
    ObservationsModule,
    HealthModule,
  ],
  providers: [JwtAuthGuard],
})
export class AppModule {}
