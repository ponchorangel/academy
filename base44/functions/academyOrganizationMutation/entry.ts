import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { safeText } from './_shared/security.js';

const MODULES = new Set(['sessions', 'courses', 'downloads', 'events', 'facilitators', 'students']);
const PLAN_MODULES = Object.freeze({ sessions: new Set(['sessions', 'downloads']), learning: new Set(['sessions', 'courses', 'downloads']), community: new Set(['sessions', 'courses', 'events', 'downloads', 'facilitators', 'students']), academy: new Set(['sessions', 'courses', 'events', 'downloads', 'facilitators', 'students']) });

function validDomain(value: string) {
  return !value || (value.length <= 253 && /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(value));
}

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
    if (!organizationId) return response({ error: 'organization_required' }, 400);
    const memberships = await base44.asServiceRole.entities.AcademyMembership.filter({ user_id: user.id, organization_id: organizationId, status: 'active' });
    const role = user.role === 'admin' && !memberships.length ? 'superadmin' : memberships[0]?.role;
    if (!['superadmin', 'organization_admin'].includes(role)) return response({ error: 'forbidden' }, 403);
    const existing = await base44.asServiceRole.entities.AcademyOrganization.get(organizationId).catch(() => null);
    if (!existing) return response({ error: 'not_found' }, 404);
    const data = {
      display_name: safeText(input.display_name, 160),
      logo_url: safeText(input.logo_url, 1000),
      primary_color: safeText(input.primary_color, 7),
      welcome_message: safeText(input.welcome_message, 1000),
      custom_domain: safeText(input.custom_domain, 255),
      enabled_modules: Array.isArray(input.enabled_modules) ? input.enabled_modules.filter((item: unknown) => MODULES.has(String(item))).slice(0, 10) : existing.enabled_modules,
    };
    if (!data.display_name || !/^#[0-9a-fA-F]{6}$/.test(data.primary_color) || (data.logo_url && !/^https:\/\//i.test(data.logo_url)) || !validDomain(data.custom_domain)) return response({ error: 'invalid_brand_config' }, 400);
    if (role === 'organization_admin' && existing.plan_key && PLAN_MODULES[existing.plan_key as keyof typeof PLAN_MODULES] && data.enabled_modules.some((module: string) => !PLAN_MODULES[existing.plan_key as keyof typeof PLAN_MODULES].has(module))) return response({ error: 'plan_module_restriction' }, 403);
    if (!data.custom_domain && existing.custom_domain) data.custom_domain_status = 'not_configured';
    const organization = await base44.asServiceRole.entities.AcademyOrganization.update(organizationId, data);
    return response({ organization });
  } catch (_error) {
    return response({ error: 'internal_error' }, 500);
  }
});
