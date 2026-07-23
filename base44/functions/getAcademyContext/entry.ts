import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { safeText } from './_shared/security.js';

const CONTENT_TYPES = Object.freeze({
  sessions: 'AcademySession',
  downloads: 'AcademyDownload',
  events: 'AcademyEvent',
  courses: 'AcademyCourse',
  course_modules: 'AcademyCourseModule',
  course_lessons: 'AcademyCourseLesson',
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
    const [sessionRows, downloadRows, eventRows, facilitatorRows, courseRows, moduleRows, lessonRows, enrollmentRows, progressRows, certificateRows, registrationRows, memberRows, invitationRows] = await Promise.all([
      base44.asServiceRole.entities.AcademySession.filter(query),
      base44.asServiceRole.entities.AcademyDownload.filter(query),
      base44.asServiceRole.entities.AcademyEvent.filter(query),
      base44.asServiceRole.entities.AcademyFacilitatorProfile.filter(query),
      base44.asServiceRole.entities.AcademyCourse.filter(query),
      base44.asServiceRole.entities.AcademyCourseModule.filter(query),
      base44.asServiceRole.entities.AcademyCourseLesson.filter(query),
      base44.asServiceRole.entities.AcademyCourseEnrollment.filter({ organization_id: selectedOrganization.id, user_id: user.id }),
      base44.asServiceRole.entities.AcademyLessonProgress.filter({ organization_id: selectedOrganization.id, user_id: user.id }),
      base44.asServiceRole.entities.AcademyCertificate.filter({ organization_id: selectedOrganization.id, user_id: user.id }),
      base44.asServiceRole.entities.AcademyRegistration.filter(canManage ? query : { organization_id: selectedOrganization.id, user_id: user.id }),
      canManage ? base44.asServiceRole.entities.AcademyMembership.filter(query) : Promise.resolve([]),
      canManage ? base44.asServiceRole.entities.AcademyInvitation.filter({ organization_id: selectedOrganization.id, status: 'pending' }) : Promise.resolve([]),
    ]);

    const isManager = canManage;
    const enabledModules = new Set(Array.isArray(selectedOrganization.enabled_modules) ? selectedOrganization.enabled_modules : []);
    const onboardingItems = {
      branding: Boolean(selectedOrganization.logo_url && /^https:\/\//i.test(selectedOrganization.logo_url)),
      welcome: Boolean(selectedOrganization.welcome_message),
      modules: Array.isArray(selectedOrganization.enabled_modules) && selectedOrganization.enabled_modules.length > 0,
      responsible: memberRows.some((item) => item.role === 'organization_admin' && item.status === 'active') || invitationRows.some((item) => item.role === 'organization_admin' && item.status === 'pending'),
      facilitator: facilitatorRows.some((item) => item.status === 'published'),
      first_resource: sessionRows.some((item) => item.status === 'published') || courseRows.some((item) => item.status === 'published') || eventRows.some((item) => item.status === 'published') || downloadRows.some((item) => item.status === 'published'),
      first_student: memberRows.some((item) => item.role === 'student' && item.status === 'active'),
      custom_domain: Boolean(selectedOrganization.custom_domain && selectedOrganization.custom_domain_status === 'dns_found'),
    };
    const onboardingTotal = Object.keys(onboardingItems).length;
    const onboardingCompleted = Object.values(onboardingItems).filter(Boolean).length;
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
      onboarding: { items: onboardingItems, completed: onboardingCompleted, total: onboardingTotal, percentage: Math.round((onboardingCompleted / onboardingTotal) * 100) },
      content: {
        sessions: enabledModules.has('sessions') ? sessionRows.filter((item) => isManager || item.status === 'published') : [],
        downloads: enabledModules.has('downloads') ? downloadRows.filter((item) => isManager || item.status === 'published') : [],
        events: enabledModules.has('events') ? eventRows.filter((item) => isManager || item.status === 'published') : [],
        facilitators: enabledModules.has('facilitators') ? facilitatorRows.filter((item) => isManager || item.status === 'published') : [],
        courses: enabledModules.has('courses') ? courseRows.filter((item) => isManager || item.status === 'published') : [],
        course_modules: enabledModules.has('courses') ? moduleRows.filter((item) => isManager || item.status === 'published') : [],
        course_lessons: enabledModules.has('courses') ? lessonRows.filter((item) => isManager || item.status === 'published') : [],
        enrollments: enrollmentRows,
        lesson_progress: progressRows,
        certificates: certificateRows.filter((item) => item.status === 'issued'),
        registrations: registrationRows,
        members: isManager ? memberRows : [],
        invitations: isManager ? invitationRows : [],
      },
      content_types: CONTENT_TYPES,
    });
  } catch (_error) {
    return response({ error: 'internal_error' }, 500);
  }
});
