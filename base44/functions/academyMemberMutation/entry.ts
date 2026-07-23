import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { safeText } from './_shared/security.js';

function response(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status });
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return response({ error: 'method_not_allowed' }, 405);
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id || user.disabled === true) return response({ error: 'unauthorized' }, 401);
    const input = await req.json().catch(() => ({}));
    const organizationId = safeText(input.organization_id, 100);
    const membershipId = safeText(input.membership_id, 100);
    const status = safeText(input.status, 20);
    if (!organizationId || !membershipId || !['active', 'suspended'].includes(status)) return response({ error: 'invalid_request' }, 400);
    const actingMemberships = await base44.asServiceRole.entities.AcademyMembership.filter({ user_id: user.id, organization_id: organizationId, status: 'active' });
    const actingRole = user.role === 'admin' && !actingMemberships.length ? 'superadmin' : actingMemberships[0]?.role;
    if (!['superadmin', 'organization_admin'].includes(actingRole)) return response({ error: 'forbidden' }, 403);
    const membership = await base44.asServiceRole.entities.AcademyMembership.get(membershipId).catch(() => null);
    if (!membership || membership.organization_id !== organizationId) return response({ error: 'not_found' }, 404);
    const updated = await base44.asServiceRole.entities.AcademyMembership.update(membershipId, { status });
    return response({ membership: updated });
  } catch (_error) {
    return response({ error: 'internal_error' }, 500);
  }
});
