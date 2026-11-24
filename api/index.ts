// Vercel serverless entry. This is the ONLY platform-specific file: it adapts
// the Nest application (src/) to Vercel's Node runtime.
import 'reflect-metadata';
import express, { Request, Response } from 'express';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { enablePortalCors } from '../src/cors';

const server = express();
let ready: Promise<unknown> | null = null;

function bootstrap(): Promise<unknown> {
  if (!ready) {
    ready = (async () => {
      const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
        logger: ['error', 'warn', 'log'],
      });
      app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
      );
      enablePortalCors(app);
      await app.init();
    })();
  }
  return ready;
}

export default async function handler(req: Request, res: Response) {
  await bootstrap();
  server(req, res);
}
