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

  // CORS — allow requests from Next.js frontend (local dev + Docker)
  const frontendOrigins = [
    'http://localhost:3000',
    'http://padma-frontend:3000',
    ...(process.env.FRONTEND_ORIGIN ? [process.env.FRONTEND_ORIGIN] : []),
  ];
  app.enableCors({
    origin: configService.get<string>('app.nodeEnv') === 'development'
      ? true
      : frontendOrigins,
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

  // Swagger — always enabled (API docs accessible in all environments)
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

  // Root redirect → API docs
  // Must use the underlying HTTP adapter directly because NestJS global prefix
  // means no @Controller can handle '/' without opting out of the prefix.
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/', (_req, res) => {
    res.redirect('/api/docs');
  });

  await app.listen(port);
  console.log(`Padma Care Coordination running on port ${port}`);
}
bootstrap();
