import { validateEnv } from './env';

const valid = {
  SUPABASE_URL: 'https://ekwimtbmfouiobjwpuev.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key',
};

describe('validateEnv', () => {
  it('accepts a valid Supabase configuration', () => {
    const config = validateEnv({ ...valid });
    expect(config.supabaseUrl).toBe(valid.SUPABASE_URL);
    expect(config.supabaseAnonKey).toBe('anon-key');
    expect(config.port).toBe(3000);
  });

  it('strips a trailing slash from SUPABASE_URL', () => {
    expect(validateEnv({ ...valid, SUPABASE_URL: valid.SUPABASE_URL + '/' }).supabaseUrl).toBe(valid.SUPABASE_URL);
  });

  it('rejects a missing SUPABASE_URL', () => {
    expect(() => validateEnv({ SUPABASE_ANON_KEY: 'k' })).toThrow(/SUPABASE_URL/);
  });

  it('rejects a non-Supabase URL', () => {
    expect(() => validateEnv({ ...valid, SUPABASE_URL: 'https://evil.example.com' })).toThrow(/SUPABASE_URL/);
  });

  it('rejects a missing anon key', () => {
    expect(() => validateEnv({ SUPABASE_URL: valid.SUPABASE_URL })).toThrow(/SUPABASE_ANON_KEY/);
  });

  it('rejects an invalid port', () => {
    expect(() => validateEnv({ ...valid, PORT: '99999' })).toThrow(/PORT/);
  });
});
