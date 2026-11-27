import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { applyHardening } from '../src/hardening';

const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'u@example.com' };
const TENANT = '22222222-2222-4222-8222-222222222222';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('App (e2e, mocked Supabase)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.SUPABASE_URL = 'https://ref.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    applyHardening(app);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => jest.restoreAllMocks());

  it('GET /health is public', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /v1/me/capabilities requires a bearer token', async () => {
    const res = await request(app.getHttpServer()).get(`/v1/me/capabilities?tenantId=${TENANT}`);
    expect(res.status).toBe(401);
  });

  it('GET /v1/me/capabilities rejects a bad tenant id', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, USER));
    const res = await request(app.getHttpServer())
      .get('/v1/me/capabilities?tenantId=not-a-uuid')
      .set('Authorization', 'Bearer tok');
    expect(res.status).toBe(400);
  });

  it('GET /v1/me/capabilities returns the shaped profile', async () => {
    const membershipRow = {
      id: USER.id,
      membershipId: 'm-1',
      workspaceId: TENANT,
      displayName: 'User',
      email: USER.email,
      role: 'employee',
      status: 'active',
      siteIds: [],
      membershipLevel: 'employee',
      functionalRoles: [],
    };
    jest.spyOn(globalThis, 'fetch').mockImplementation((url: string) => {
        if (url.includes('/auth/v1/user')) return Promise.resolve(jsonResponse(200, USER));
        if (url.includes('/rest/v1/v_memberships')) return Promise.resolve(jsonResponse(200, [membershipRow]));
        return Promise.resolve(jsonResponse(404, { message: 'unexpected call' }));
      });
    const res = await request(app.getHttpServer())
      .get(`/v1/me/capabilities?tenantId=${TENANT}`)
      .set('Authorization', 'Bearer tok');
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(USER.id);
    expect(res.body.membership.level).toBe('employee');
    expect(res.body.entitlements).toBeNull();
  });

  it('GET /v1/me/capabilities maps an unexposed api schema to 502', async () => {
    jest.spyOn(globalThis, 'fetch').mockImplementation((url: string) => {
        if (url.includes('/auth/v1/user')) return Promise.resolve(jsonResponse(200, USER));
        return Promise.resolve(jsonResponse(400, { code: 'PGRST106', message: 'Invalid schema: api' }));
      });
    const res = await request(app.getHttpServer())
      .get(`/v1/me/capabilities?tenantId=${TENANT}`)
      .set('Authorization', 'Bearer tok');
    expect(res.status).toBe(502);
    expect(res.body.message).toBe('database_error');
    expect(JSON.stringify(res.body)).not.toContain('PGRST');
  });

  it('POST /v1/authorize validates the body', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, USER));
    const res = await request(app.getHttpServer())
      .post('/v1/authorize')
      .set('Authorization', 'Bearer tok')
      .send({ tenantId: TENANT, permissionKey: 'x' });
    expect(res.status).toBe(400);
  });

  it('POST /v1/authorize returns the database decision', async () => {
    jest.spyOn(globalThis, 'fetch').mockImplementation((url: string) => {
        if (url.includes('/auth/v1/user')) return Promise.resolve(jsonResponse(200, USER));
        if (url.includes('/rest/v1/rpc/authorize')) return Promise.resolve(jsonResponse(200, true));
        return Promise.resolve(jsonResponse(404, { message: 'unexpected call' }));
      });
    const res = await request(app.getHttpServer())
      .post('/v1/authorize')
      .set('Authorization', 'Bearer tok')
      .send({ tenantId: TENANT, permissionKey: 'hse.inspections', action: 'read' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ allowed: true });
  });

  it('does not send x-powered-by and sends helmet headers', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toBeDefined();
  });
});

describe('App rate limit (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    process.env.SUPABASE_URL = 'https://ref.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    applyHardening(app);
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  it('answers 429 on the 101st request in a minute from one address', async () => {
    const server = app.getHttpServer();
    for (let i = 0; i < 100; i++) {
      const ok = await request(server).get('/health');
      expect(ok.status).toBe(200);
    }
    const limited = await request(server).get('/health');
    expect(limited.status).toBe(429);
  });
});
