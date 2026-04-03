import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Needed for webhook signature verification
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 3020;

  // Security middleware
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: configService.get<string>('app.nodeEnv') === 'development'
      ? true
      : [],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-tenant-id',
      'x-user-id',
      'x-facility-id',
      'x-user-roles',
      'Idempotency-Key',
    ],
    maxAge: 3600,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter — never leaks internal details
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Audit logging
  app.useGlobalInterceptors(new AuditLogInterceptor());

  // Swagger (dev only)
  if (configService.get<string>('app.nodeEnv') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Padma Care Coordination API')
      .setDescription('Clinical Pathway & Care Coordination Platform')
      .setVersion('1.0')
      .addBearerAuth()
      .addApiKey(
        { type: 'apiKey', name: 'x-tenant-id', in: 'header' },
        'tenant-id',
      )
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port);
  console.log(`Padma Care Coordination running on port ${port}`);
}
bootstrap();
