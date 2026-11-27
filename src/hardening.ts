import type { INestApplication } from '@nestjs/common';
import type { Express } from 'express';
import helmet from 'helmet';

// Response hardening shared by the long-running server and the Vercel entry.
export function applyHardening(app: INestApplication): void {
  const express = app.getHttpAdapter().getInstance() as Express;
  express.disable('x-powered-by');
  // One proxy hop (Vercel) sits in front: use the client address for rate limits.
  express.set('trust proxy', 1);
  app.use(helmet());
}
