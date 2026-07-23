import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { safeText } from './_shared/security.js';

const ENTITY_BY_TYPE = Object.freeze({
  session: 'AcademySession',
  download: 'AcademyDownload',
  event: 'AcademyEvent',
  facilitator: 'AcademyFacilitatorProfile',
  course: 'AcademyCourse',
});

const ROLE_PERMISSIONS = Object.freeze({
  session: ['superadmin', 'organization_admin', 'teacher'],
  download: ['superadmin', 'organization_admin', 'teacher'],
  event: ['superadmin', 'organization_admin'],
  facilitator: ['superadmin', 'organization_admin'],
  course: ['superadmin', 'organization_admin', 'teacher'],
});

function response(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status });
}

function cleanText(value: unknown, max = 1000) {
  return safeText(value, max);
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return response({ error: 'method_not_allowed' }, 405);
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id || user.disabled === true) return response({ error: 'unauthorized' }, 401);
    const input = await req.json().catch(() => ({}));
    const type = cleanText(input.type, 20).toLowerCase();
    const action = cleanText(input.action, 20).toLowerCase();
    const organizationId = cleanText(input.organization_id, 100);
    const entityName = ENTITY_BY_TYPE[type as keyof typeof ENTITY_BY_TYPE];
    if (!entityName || !['create', 'update', 'archive'].includes(action) || !organizationId) {
      return response({ error: 'invalid_request' }, 400);
    }

    const memberships = await base44.asServiceRole.entities.AcademyMembership.filter({ user_id: user.id, organization_id: organizationId, status: 'active' });
    const organization = await base44.asServiceRole.entities.AcademyOrganization.get(organizationId).catch(() => null);
    const isPlatformAdmin = user.role === 'admin' && !memberships.length;
    const role = isPlatformAdmin ? 'superadmin' : memberships[0]?.role;
    if (!organization || !ROLE_PERMISSIONS[type as keyof typeof ROLE_PERMISSIONS]?.includes(role)) return response({ error: 'forbidden' }, 403);

    const entity = base44.asServiceRole.entities[entityName];
    if (action === 'archive') {
      if (!input.id) return response({ error: 'id_required' }, 400);
      const existing = await entity.get(cleanText(input.id, 100));
      if (!existing || existing.organization_id !== organizationId) return response({ error: 'not_found' }, 404);
      const archived = await entity.update(existing.id, { status: 'archived' });
      return response({ item: archived });
    }

    const data = { ...input.data, organization_id: organizationId };
    delete data.id;
    delete data.created_by;
    delete data.created_date;
    delete data.updated_date;
    data.title = cleanText(data.title, 180);
    if (!data.title) return response({ error: 'title_required' }, 400);
    if (type === 'session') {
      data.description = cleanText(data.description, 3000);
      data.teacher_name = cleanText(data.teacher_name, 160);
      data.status = ['draft', 'published', 'live', 'finished', 'cancelled'].includes(data.status) ? data.status : 'draft';
    }
    if (type === 'download') {
      data.description = cleanText(data.description, 2000);
      data.category = cleanText(data.category, 80);
      data.status = ['draft', 'published', 'archived'].includes(data.status) ? data.status : 'draft';
    }
    if (type === 'event') {
      data.description = cleanText(data.description, 3000);
      data.status = ['draft', 'published', 'live', 'finished', 'cancelled'].includes(data.status) ? data.status : 'draft';
    }
    if (type === 'facilitator') {
      data.user_id = cleanText(data.user_id, 100) || user.id;
      data.full_name = cleanText(data.full_name, 160);
      data.headline = cleanText(data.headline, 180);
      data.bio = cleanText(data.bio, 3000);
      data.background = cleanText(data.background, 3000);
      data.expertise = Array.isArray(data.expertise) ? data.expertise.map((item: unknown) => cleanText(item, 80)).filter(Boolean).slice(0, 20) : [];
      data.visibility = ['private', 'members', 'public'].includes(data.visibility) ? data.visibility : 'members';
      data.status = ['draft', 'published', 'archived'].includes(data.status) ? data.status : 'draft';
      if (!data.full_name) return response({ error: 'full_name_required' }, 400);
    }
    if (type === 'course') {
      data.description = cleanText(data.description, 4000);
      data.category = cleanText(data.category, 100);
      data.status = ['draft', 'published', 'archived'].includes(data.status) ? data.status : 'draft';
      data.access = ['all_members', 'enrolled', 'invite_only', 'public'].includes(data.access) ? data.access : 'all_members';
      data.level = ['introductory', 'intermediate', 'advanced'].includes(data.level) ? data.level : 'introductory';
      data.facilitator_ids = Array.isArray(data.facilitator_ids) ? data.facilitator_ids.map((item: unknown) => cleanText(item, 100)).filter(Boolean).slice(0, 20) : [];
    }
    const saved = action === 'update'
      ? await entity.update(cleanText(input.id, 100), data)
      : await entity.create(data);
    return response({ item: saved });
  } catch (_error) {
    return response({ error: 'internal_error' }, 500);
  }
});
