import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { AuthUser } from '../identity/identity.service';
import { PostgrestError, PostgrestService } from '../supabase/postgrest.service';

export interface MembershipRow {
  id: string;
  membershipId: string;
  workspaceId: string;
  displayName: string | null;
  email: string | null;
  role: string;
  status: string;
  siteIds: string[];
  membershipLevel: string;
  functionalRoles: string[];
}

export interface EntitlementRow {
  entitlement_kind: string;
  entitlement_key: string;
  entitled: boolean;
}

export interface CapabilitiesProfile {
  user: { id: string; email?: string };
  tenantId: string;
  membership: {
    id: string;
    level: string;
    status: string;
    displayName: string | null;
    siteIds: string[];
    functionalRoles: string[];
  } | null;
  entitlements: EntitlementRow[] | null;
}

/**
 * Builds the caller's capabilities profile for one tenant. Every database
 * read goes through PostgREST with the caller's own token, so RLS decides
 * what is visible; this service only shapes the response for the UI.
 */
@Injectable()
export class CapabilitiesService {
  private readonly logger = new Logger(CapabilitiesService.name);
  constructor(private readonly postgrest: PostgrestService) {}

  async getCapabilities(user: AuthUser, accessToken: string, tenantId: string): Promise<CapabilitiesProfile> {
    let rows: MembershipRow[];
    try {
      rows = await this.postgrest.select<MembershipRow[]>(
        'v_memberships',
        { id: `eq.${user.id}`, workspaceId: `eq.${tenantId}`, select: '*', limit: '1' },
        accessToken,
      );
    } catch (error) {
      throw this.rethrow(error);
    }
    const row = rows[0] ?? null;

    // `api.list_my_entitlements` is Company-Superadmin-only by contract; for
    // other levels (or a rejected call) entitlements stay null instead of
    // failing the whole profile.
    let entitlements: EntitlementRow[] | null = null;
    if (row && row.status === 'active' && row.membershipLevel === 'company_superadmin') {
      try {
        entitlements = await this.postgrest.rpc<EntitlementRow[]>(
          'list_my_entitlements',
          { p_tenant_id: tenantId },
          accessToken,
        );
      } catch (error) {
        if (error instanceof PostgrestError && error.code === '42501') {
          entitlements = null;
        } else {
          throw this.rethrow(error);
        }
      }
    }

    return {
      user: { id: user.id, email: user.email },
      tenantId,
      membership: row
        ? {
            id: row.membershipId,
            level: row.membershipLevel,
            status: row.status,
            displayName: row.displayName,
            siteIds: row.siteIds ?? [],
            functionalRoles: row.functionalRoles ?? [],
          }
        : null,
      entitlements,
    };
  }

  async authorize(
    accessToken: string,
    args: {
      tenantId: string;
      permissionKey: string;
      action: string;
      siteId?: string;
      orgUnitId?: string;
      taskKind?: string;
      taskId?: string;
    },
  ): Promise<{ allowed: boolean }> {
    try {
      const allowed = await this.postgrest.rpc<boolean>(
        'authorize',
        {
          p_tenant_id: args.tenantId,
          p_permission_key: args.permissionKey,
          p_action: args.action,
          p_site_id: args.siteId ?? null,
          p_org_unit_id: args.orgUnitId ?? null,
          p_task_kind: args.taskKind ?? null,
          p_task_id: args.taskId ?? null,
        },
        accessToken,
      );
      return { allowed: allowed === true };
    } catch (error) {
      throw this.rethrow(error);
    }
  }

  private rethrow(error: unknown): Error {
    if (error instanceof PostgrestError) {
      // The database (RLS, RPC guards) is the authorization boundary; surface
      // its decision without leaking internals.
      this.logger.warn(`database_error code=${error.code ?? error.status}`);
      return new BadGatewayException('database_error');
    }
    return error instanceof Error ? error : new Error('unknown_error');
  }
}
