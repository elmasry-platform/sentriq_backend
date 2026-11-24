import type { INestApplication } from '@nestjs/common';

// Browser portals are served from Cloudflare Pages (*.sentriq-landing.pages.dev)
// and call this API cross-origin with bearer tokens. No cookies are used.
const pagesOrigin = /^https:\/\/([a-z0-9-]+\.)*sentriq-landing\.pages\.dev$/;

export function enablePortalCors(app: INestApplication): void {
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
}
