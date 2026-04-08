import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
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
import { TenantMiddleware } from './common/middleware/tenant.middleware';
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
    AuthModule,        // ← Auth module (login/logout) — excluded from TenantMiddleware below
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
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        'health',           // GET /api/v1/health
        'webhooks/(.*)',    // POST /api/v1/webhooks/*
        'auth/(.*)',        // POST /api/v1/auth/login, /logout, GET /auth/me
      )
      .forRoutes('*');
  }
}
