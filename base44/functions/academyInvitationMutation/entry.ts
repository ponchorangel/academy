import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { emailIsValid, safeText } from './_shared/security.js';

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
    const email = safeText(input.email, 254).toLowerCase();
    const role = safeText(input.role, 20);
    const displayName = safeText(input.display_name, 160);
    if (!organizationId || !emailIsValid(email) || !['student', 'teacher', 'organization_admin'].includes(role)) return response({ error: 'invalid_request' }, 400);
    const memberships = await base44.asServiceRole.entities.AcademyMembership.filter({ user_id: user.id, organization_id: organizationId, status: 'active' });
    const isPlatformAdmin = user.role === 'admin' && !memberships.length;
    const membershipRole = isPlatformAdmin ? 'superadmin' : memberships[0]?.role;
    if (!['superadmin', 'organization_admin'].includes(membershipRole)) return response({ error: 'forbidden' }, 403);
    if (role === 'organization_admin' && membershipRole !== 'superadmin') return response({ error: 'forbidden' }, 403);
    const organization = await base44.asServiceRole.entities.AcademyOrganization.get(organizationId).catch(() => null);
    if (!organization) return response({ error: 'not_found' }, 404);
    const existing = await base44.asServiceRole.entities.AcademyInvitation.filter({ organization_id: organizationId, email, status: 'pending' });
    if (existing.length) return response({ error: 'invitation_already_pending' }, 409);
    await base44.asServiceRole.users.inviteUser(email, 'user');
    const invitation = await base44.asServiceRole.entities.AcademyInvitation.create({ organization_id: organizationId, email, display_name: displayName, role, status: 'pending', invited_by_user_id: user.id, invited_at: new Date().toISOString() });
    return response({ invitation });
  } catch (_error) {
    return response({ error: 'internal_error' }, 500);
  }
});
