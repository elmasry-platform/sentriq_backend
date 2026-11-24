import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { IdentityService } from './identity.service';

function context(headers: Record<string, string>): ExecutionContext {
  const req = { headers } as Record<string, unknown>;
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('SupabaseAuthGuard', () => {
  const identity = { verifyAccessToken: jest.fn() } as unknown as IdentityService;

  beforeEach(() => jest.resetAllMocks());

  it('rejects a missing Authorization header', async () => {
    const guard = new SupabaseAuthGuard(identity);
    await expect(guard.canActivate(context({}))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a non-Bearer scheme', async () => {
    const guard = new SupabaseAuthGuard(identity);
    await expect(guard.canActivate(context({ authorization: 'Basic abc' }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches the verified user and token to the request', async () => {
    (identity.verifyAccessToken as jest.Mock).mockResolvedValue({ id: 'u-1' });
    const guard = new SupabaseAuthGuard(identity);
    const ctx = context({ authorization: 'Bearer tok' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    const req = ctx.switchToHttp().getRequest() as Record<string, unknown>;
    expect(req.authUser).toEqual({ id: 'u-1' });
    expect(req.accessToken).toBe('tok');
    expect(identity.verifyAccessToken).toHaveBeenCalledWith('tok');
  });
});
