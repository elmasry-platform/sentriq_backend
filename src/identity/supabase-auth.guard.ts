import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthUser, IdentityService } from './identity.service';

export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  authUser?: AuthUser;
  accessToken?: string;
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly identity: IdentityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = req.headers['authorization'];
    const value = Array.isArray(header) ? header[0] : header;
    const [scheme, token] = (value ?? '').split(' ');
    if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('bearer_token_required');
    }
    const user = await this.identity.verifyAccessToken(token);
    req.authUser = user;
    req.accessToken = token;
    return true;
  }
}
