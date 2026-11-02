import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { config } from './config';
import { PrismaService, ensureAuditImmutability } from './infra/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['log', 'warn', 'error'] });
  const origins = config.corsOrigin.trim();
  const originValue = origins === '*' ? true : origins.split(',').map(o => o.trim());
  app.enableCors({ origin: originValue, credentials: false });
  new Logger('Bootstrap').log(`CORS origins: ${JSON.stringify(originValue)}`);
  app.setGlobalPrefix('api');
  app.use((_req: any, res: any, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });
  // Health check — registered after prefix so it lives at /api/health
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/api/health', (_req: any, res: any) => res.json({ status: 'ok' }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: false } }));
  try {
    await ensureAuditImmutability(app.get(PrismaService));
  } catch (e) {
    new Logger('Bootstrap').warn(`Could not install the audit immutability trigger (has the schema been pushed?): ${(e as Error).message}`);
  }
  await app.listen(config.port, '0.0.0.0');
  new Logger('Bootstrap').log(`JaanchSetu API on http://localhost:${config.port}/api  (prototype, not an official AICTE system)`);
}
bootstrap();
