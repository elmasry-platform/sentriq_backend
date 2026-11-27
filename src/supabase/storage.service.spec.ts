import { StorageService } from './storage.service';
describe('StorageService', () => {
  it('encodes each path segment and uses the caller token', async () => {
    const f = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ signedURL: '/object/sign/b/x?token=1' }) });
    (global as unknown as { fetch: unknown }).fetch = f;
    const s = new StorageService({ supabaseUrl: 'https://r.supabase.co', supabaseAnonKey: 'anon' } as never);
    await s.signedDownloadUrl('sentriq-hse-evidence', 'tenant/a b/../c#d?.jpg', 600, 'tokA');
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('https://r.supabase.co/storage/v1/object/sign/sentriq-hse-evidence/tenant/a%20b/..%2F'.replace('..%2F', '..') + '/c%23d%3F.jpg');
    expect(init.headers.authorization).toBe('Bearer tokA');
  });
});
