import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { safeText } from './_shared/security.js';

function response(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id || user.disabled === true) return response({ error: 'unauthorized' }, 401);
    const payload = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const requestedOrganizationId = safeText(payload.organization_id, 100);
    const memberships = await base44.asServiceRole.entities.AcademyMembership.filter({ user_id: user.id, status: 'active' });
    const availableIds = new Set(memberships.map((item) => item.organization_id));
    const isPlatformAdmin = user.role === 'admin';
    if (!isPlatformAdmin && requestedOrganizationId && !availableIds.has(requestedOrganizationId)) return response({ error: 'forbidden' }, 403);
    const organizationId = requestedOrganizationId || memberships[0]?.organization_id;
    if (!organizationId && !isPlatformAdmin) return response({ error: 'organization_access_required' }, 403);
    const organizations = isPlatformAdmin
      ? await base44.asServiceRole.entities.AcademyOrganization.filter({ status: 'active' })
      : [await base44.asServiceRole.entities.AcademyOrganization.get(organizationId).catch(() => null)].filter(Boolean);
    const organization = organizations.find((item) => item.id === organizationId) || organizations[0];
    if (!organization) return response({ error: 'not_found' }, 404);
    const query = { organization_id: organization.id };
    const [sessions, courses, events, downloads, facilitators, members, invitations, auditEvents] = await Promise.all([
      base44.asServiceRole.entities.AcademySession.filter(query),
      base44.asServiceRole.entities.AcademyCourse.filter(query),
      base44.asServiceRole.entities.AcademyEvent.filter(query),
      base44.asServiceRole.entities.AcademyDownload.filter(query),
      base44.asServiceRole.entities.AcademyFacilitatorProfile.filter(query),
      base44.asServiceRole.entities.AcademyMembership.filter(query),
      base44.asServiceRole.entities.AcademyInvitation.filter({ ...query, status: 'pending' }),
      base44.asServiceRole.entities.AcademyAuditEvent.filter(query),
    ]);
    const published = (items) => items.filter((item) => item.status === 'published').length;
    const activeMembers = members.filter((item) => item.status === 'active').length;
    const moduleUsage = [
      { key: 'sessions', label: 'Sesiones', total: sessions.length, published: published(sessions) },
      { key: 'courses', label: 'Cursos', total: courses.length, published: published(courses) },
      { key: 'events', label: 'Eventos', total: events.length, published: published(events) },
      { key: 'downloads', label: 'Descargables', total: downloads.length, published: published(downloads) },
      { key: 'facilitators', label: 'Facilitadores', total: facilitators.length, published: published(facilitators) },
    ];
    return response({
      organization,
      summary: { active_members: activeMembers, pending_invitations: invitations.length, facilitators: facilitators.length, published_resources: moduleUsage.reduce((sum, item) => sum + item.published, 0) },
      module_usage: moduleUsage,
      recent_activity: auditEvents.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))).slice(0, 20),
    });
  } catch (_error) {
    return response({ error: 'internal_error' }, 500);
  }
});
