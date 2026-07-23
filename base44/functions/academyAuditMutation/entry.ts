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
    const memberships = await base44.asServiceRole.entities.AcademyMembership.filter({ user_id: user.id, organization_id: organizationId, status: 'active' });
    const role = user.role === 'admin' ? 'superadmin' : memberships[0]?.role;
    if (!['superadmin', 'organization_admin', 'teacher'].includes(role)) return response({ error: 'forbidden' }, 403);
    const organization = await base44.asServiceRole.entities.AcademyOrganization.get(organizationId).catch(() => null);
    if (!organization) return response({ error: 'not_found' }, 404);

    const action = safeText(input.action, 20);
    if (action === 'record') {
      const audit = await base44.asServiceRole.entities.AcademyAuditEvent.create({
        organization_id: organizationId,
        actor_user_id: user.id,
        actor_email: safeText(user.email, 254),
        actor_role: safeText(role, 40),
        action: safeText(input.event_action, 80),
        entity_type: safeText(input.entity_type, 80),
        entity_id: safeText(input.entity_id, 100),
        metadata: JSON.stringify(input.metadata || {}).slice(0, 1000),
        created_at: new Date().toISOString(),
      });
      return response({ audit });
    }
    if (action === 'list') {
      if (!['superadmin', 'organization_admin'].includes(role)) return response({ error: 'forbidden' }, 403);
      const events = await base44.asServiceRole.entities.AcademyAuditEvent.filter({ organization_id: organizationId });
      return response({ events: events.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))).slice(0, 50) });
    }
    return response({ error: 'invalid_action' }, 400);
  } catch (_error) {
    return response({ error: 'internal_error' }, 500);
  }
});
