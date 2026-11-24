export interface AppConfig {
  port: number;
  nodeEnv: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export const APP_CONFIG = 'APP_CONFIG';

const SUPABASE_HOST = /^https:\/\/[a-z0-9][a-z0-9-]*\.supabase\.co$/;
const LOCAL_HOST = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function validateEnv(env: NodeJS.ProcessEnv): AppConfig {
  const supabaseUrl = (env.SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
  const supabaseAnonKey = (env.SUPABASE_ANON_KEY ?? '').trim();
  if (!SUPABASE_HOST.test(supabaseUrl) && !LOCAL_HOST.test(supabaseUrl)) {
    throw new Error(
      'SUPABASE_URL must look like https://<ref>.supabase.co (or http://localhost for local development)',
    );
  }
  if (supabaseAnonKey.length === 0) {
    throw new Error('SUPABASE_ANON_KEY is required (public anon/publishable key, never the service-role key)');
  }
  const port = Number.parseInt(env.PORT ?? '3000', 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  return {
    port,
    nodeEnv: env.NODE_ENV ?? 'development',
    supabaseUrl,
    supabaseAnonKey,
  };
}
