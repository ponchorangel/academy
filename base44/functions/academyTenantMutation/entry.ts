import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { safeText } from './_shared/security.js';

const MODULES = new Set(['sessions', 'courses', 'downloads', 'events', 'facilitators', 'students']);
const STATUSES = new Set(['active', 'paused', 'archived']);

function response(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status });
}

function normalizeModules(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item)).filter((item) => MODULES.has(item)).slice(0, 10)
    : ['sessions', 'courses', 'downloads', 'events'];
}

function slugIsValid(slug: string) {
  return /^[a-z0-9-]{2,80}$/.test(slug);
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return response({ error: 'method_not_allowed' }, 405);
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id || user.disabled === true) return response({ error: 'unauthorized' }, 401);
    if (user.role !== 'admin') return response({ error: 'forbidden' }, 403);

    const input = await req.json().catch(() => ({}));
    const action = safeText(input.action, 30);
    if (!['create', 'update_status'].includes(action)) return response({ error: 'invalid_action' }, 400);

    if (action === 'create') {
      const slug = safeText(input.slug, 80).toLowerCase();
      const name = safeText(input.name, 160);
      const displayName = safeText(input.display_name || input.name, 160);
      const primaryColor = safeText(input.primary_color || '#6B4EFF', 7);
      if (!slugIsValid(slug) || !name || !displayName || !/^#[0-9a-fA-F]{6}$/.test(primaryColor)) return response({ error: 'invalid_tenant' }, 400);
      const duplicate = await base44.asServiceRole.entities.AcademyOrganization.filter({ slug });
      if (duplicate.length) return response({ error: 'slug_in_use' }, 409);
      const organization = await base44.asServiceRole.entities.AcademyOrganization.create({
        slug,
        name,
        display_name: displayName,
        logo_url: safeText(input.logo_url, 1000),
        primary_color: primaryColor,
        status: 'active',
        enabled_modules: normalizeModules(input.enabled_modules),
        custom_domain: safeText(input.custom_domain, 255),
        welcome_message: safeText(input.welcome_message, 1000),
      });
      return response({ organization });
    }

    const organizationId = safeText(input.organization_id, 100);
    const status = safeText(input.status, 20);
    if (!organizationId || !STATUSES.has(status)) return response({ error: 'invalid_status_update' }, 400);
    const existing = await base44.asServiceRole.entities.AcademyOrganization.get(organizationId).catch(() => null);
    if (!existing) return response({ error: 'not_found' }, 404);
    const organization = await base44.asServiceRole.entities.AcademyOrganization.update(organizationId, { status });
    return response({ organization });
  } catch (_error) {
    return response({ error: 'internal_error' }, 500);
  }
});
