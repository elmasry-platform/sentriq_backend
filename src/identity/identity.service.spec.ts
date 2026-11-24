import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { AppConfig } from '../config/env';

const config: AppConfig = {
  port: 3000,
  nodeEnv: 'test',
  supabaseUrl: 'https://ref.supabase.co',
  supabaseAnonKey: 'anon',
};

function mockFetch(status: number, body: unknown) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response);
}

describe('IdentityService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns the user for a valid token', async () => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(mockFetch(200, { id: 'u-1', email: 'a@b.c' }));
    const service = new IdentityService(config);
    await expect(service.verifyAccessToken('tok')).resolves.toEqual({ id: 'u-1', email: 'a@b.c' });
    const [, init] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(init.headers.authorization).toBe('Bearer tok');
    expect(init.headers.apikey).toBe('anon');
  });

  it('rejects an expired or invalid token with 401', async () => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(mockFetch(403, { message: 'bad jwt' }));
    const service = new IdentityService(config);
    await expect(service.verifyAccessToken('tok')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('maps an unreachable provider to 503', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
    const service = new IdentityService(config);
    await expect(service.verifyAccessToken('tok')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects a 200 payload without a user id', async () => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(mockFetch(200, {}));
    const service = new IdentityService(config);
    await expect(service.verifyAccessToken('tok')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
