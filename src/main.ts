import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { APP_CONFIG, AppConfig } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Browser portals are served from Cloudflare Pages (*.sentriq-landing.pages.dev)
  // and call this API cross-origin. Bearer tokens only; no cookies.
  const pagesOrigin = /^https:\/\/([a-z0-9-]+\.)*sentriq-landing\.pages\.dev$/;
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || pagesOrigin.test(origin) || origin === 'http://localhost:3000') {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    allowedHeaders: ['authorization', 'content-type'],
    methods: ['GET', 'POST', 'OPTIONS'],
    maxAge: 600,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();
  const config = app.get<AppConfig>(APP_CONFIG);
  await app.listen(config.port);
}

void bootstrap();
