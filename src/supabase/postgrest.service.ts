import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, AppConfig } from '../config/env';

export class PostgrestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = 'PostgrestError';
  }
}

/**
 * Thin client over Supabase PostgREST. Every call forwards the END USER'S
 * access token, so PostgreSQL row-level security and `auth.uid()` resolve to
 * that user. The backend never elevates: no service-role key, no RLS bypass.
 * The `api` schema is selected per request via the PostgREST profile headers.
 */
@Injectable()
export class PostgrestService {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  private headers(accessToken: string): Record<string, string> {
    return {
      apikey: this.config.supabaseAnonKey,
      authorization: `Bearer ${accessToken}`,
      'Accept-Profile': 'api',
      'Content-Profile': 'api',
    };
  }

  async select<T>(resource: string, query: Record<string, string>, accessToken: string): Promise<T> {
    const params = new URLSearchParams(query);
    const res = await fetch(`${this.config.supabaseUrl}/rest/v1/${resource}?${params.toString()}`, {
      headers: this.headers(accessToken),
    });
    if (!res.ok) {
      throw await this.toError(res);
    }
    return (await res.json()) as T;
  }

  async rpc<T>(fn: string, args: Record<string, unknown>, accessToken: string): Promise<T> {
    const res = await fetch(`${this.config.supabaseUrl}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { ...this.headers(accessToken), 'content-type': 'application/json' },
      body: JSON.stringify(args),
    });
    if (!res.ok) {
      throw await this.toError(res);
    }
    return (await res.json()) as T;
  }

  private async toError(res: Response): Promise<PostgrestError> {
    let code: string | undefined;
    let message = `postgrest_http_${res.status}`;
    try {
      const body = (await res.json()) as { code?: string; message?: string };
      code = body.code;
      if (typeof body.message === 'string') {
        message = body.message;
      }
    } catch {
      // keep defaults
    }
    return new PostgrestError(res.status, code, message);
  }
}
