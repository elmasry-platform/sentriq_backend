import { Inject, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { APP_CONFIG, AppConfig } from '../config/env';

export interface AuthUser {
  id: string;
  email?: string;
}

/**
 * Verifies Supabase access tokens by asking Supabase Auth (`GET /auth/v1/user`).
 * Works for both legacy (HS256) and signing-key (JWKS) projects and keeps
 * token verification at the identity provider boundary. The service-role key
 * is never used; only the public anon key identifies the project.
 */
@Injectable()
export class IdentityService {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async verifyAccessToken(token: string): Promise<AuthUser> {
    let res: Response;
    try {
      res = await fetch(`${this.config.supabaseUrl}/auth/v1/user`, {
        headers: {
          apikey: this.config.supabaseAnonKey,
          authorization: `Bearer ${token}`,
        },
      });
    } catch {
      throw new ServiceUnavailableException('identity_provider_unreachable');
    }
    if (res.status === 401 || res.status === 403) {
      throw new UnauthorizedException('invalid_or_expired_token');
    }
    if (!res.ok) {
      throw new ServiceUnavailableException('identity_provider_error');
    }
    const body = (await res.json()) as { id?: string; email?: string };
    if (!body || typeof body.id !== 'string' || body.id.length === 0) {
      throw new UnauthorizedException('invalid_token_payload');
    }
    return { id: body.id, email: typeof body.email === 'string' ? body.email : undefined };
  }
}
