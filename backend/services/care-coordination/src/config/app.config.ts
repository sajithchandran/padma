import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3020', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  devTenantId: process.env.PADMA_DEV_TENANT_ID || '',
}));

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  
}));

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
}));

export const authConfig = registerAs('auth', () => ({
  jwtPublicKey: process.env.JWT_PUBLIC_KEY || '',
  jwtPrivateKey: process.env.JWT_PRIVATE_KEY || '',
  jwtIssuer:   process.env.JWT_ISSUER || 'https://auth.padma.local',
}));

export const integrationConfig = registerAs('integration', () => ({
  athma: {
    baseUrl: process.env.ATHMA_BASE_URL || '',
    webhookSecret: process.env.ATHMA_WEBHOOK_SECRET || '',
  },
  medha: {
    baseUrl: process.env.MEDHA_BASE_URL || '',
  },
  genesys: {
    baseUrl: process.env.GENESYS_BASE_URL || '',
  },
  salesforce: {
    baseUrl: process.env.SALESFORCE_BASE_URL || '',
  },
  zeal: {
    baseUrl: process.env.ZEAL_BASE_URL || '',
  },
}));
