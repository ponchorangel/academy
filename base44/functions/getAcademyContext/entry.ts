import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { safeText } from './_shared/security.js';

const CONTENT_TYPES = Object.freeze({
  sessions: 'AcademySession',
  downloads: 'AcademyDownload',
  events: 'AcademyEvent',
});

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
    let [memberships, allOrganizations] = await Promise.all([
      base44.asServiceRole.entities.AcademyMembership.filter({ user_id: user.id, status: 'active' }),
      user.role === 'admin' ? base44.asServiceRole.entities.AcademyOrganization.filter({ status: 'active' }) : Promise.resolve([]),
    ]);

    const pendingInvitations = user.email
      ? await base44.asServiceRole.entities.AcademyInvitation.filter({ email: user.email.toLowerCase(), status: 'pending' })
      : [];
    for (const invitation of pendingInvitations) {
      const alreadyMember = memberships.some((item) => item.organization_id === invitation.organization_id);
      if (alreadyMember) continue;
      const createdMembership = await base44.asServiceRole.entities.AcademyMembership.create({ organization_id: invitation.organization_id, user_id: user.id, email: user.email.toLowerCase(), display_name: invitation.display_name || user.full_name || '', role: invitation.role, status: 'active', joined_at: new Date().toISOString() });
      await base44.asServiceRole.entities.AcademyInvitation.update(invitation.id, { status: 'accepted', accepted_user_id: user.id, accepted_at: new Date().toISOString() });
      memberships = [...memberships, createdMembership];
    }

    const organizationIds = new Set((memberships || []).map((membership) => membership.organization_id));
    const availableOrganizations = user.role === 'admin'
      ? (allOrganizations || [])
      : (await Promise.all([...organizationIds].map((id) => base44.asServiceRole.entities.AcademyOrganization.get(id).catch(() => null)))).filter(Boolean);
    const selectedOrganization = availableOrganizations.find((organization) => organization.id === requestedOrganizationId)
      || availableOrganizations[0];
    if (!selectedOrganization) return response({ error: 'organization_access_required' }, 403);

    const membership = memberships.find((item) => item.organization_id === selectedOrganization.id);
    const academyRole = user.role === 'admin' && !membership ? 'superadmin' : membership?.role;
    const canManage = ['superadmin', 'organization_admin', 'teacher'].includes(academyRole);
    const query = { organization_id: selectedOrganization.id };
    const [sessionRows, downloadRows, eventRows, facilitatorRows, memberRows, invitationRows] = await Promise.all([
      base44.asServiceRole.entities.AcademySession.filter(query),
      base44.asServiceRole.entities.AcademyDownload.filter(query),
      base44.asServiceRole.entities.AcademyEvent.filter(query),
      base44.asServiceRole.entities.AcademyFacilitatorProfile.filter(query),
      canManage ? base44.asServiceRole.entities.AcademyMembership.filter(query) : Promise.resolve([]),
      canManage ? base44.asServiceRole.entities.AcademyInvitation.filter({ organization_id: selectedOrganization.id, status: 'pending' }) : Promise.resolve([]),
    ]);

    const isManager = canManage;
    return response({
      user: { id: user.id, email: user.email, full_name: user.full_name || '', role: academyRole || 'guest' },
      organization: selectedOrganization,
      organizations: availableOrganizations,
      membership: membership || null,
      permissions: {
        can_manage: isManager,
        can_manage_organization: ['superadmin', 'organization_admin'].includes(academyRole),
        can_manage_sessions: isManager,
        can_manage_events: ['superadmin', 'organization_admin'].includes(academyRole),
        can_manage_downloads: isManager,
      },
      content: {
        sessions: sessionRows.filter((item) => isManager || item.status === 'published'),
        downloads: downloadRows.filter((item) => isManager || item.status === 'published'),
        events: eventRows.filter((item) => isManager || item.status === 'published'),
        facilitators: facilitatorRows.filter((item) => isManager || item.status === 'published'),
        members: isManager ? memberRows : [],
        invitations: isManager ? invitationRows : [],
      },
      content_types: CONTENT_TYPES,
    });
  } catch (_error) {
    return response({ error: 'internal_error' }, 500);
  }
});
