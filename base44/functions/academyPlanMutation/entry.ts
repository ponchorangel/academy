import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { safeText } from './_shared/security.js';

const PLAN_TEMPLATES = Object.freeze({
  sessions: { key: 'sessions', name: 'Sesiones', description: 'Sesiones en vivo y biblioteca de descargables.', modules: ['sessions', 'downloads'] },
  learning: { key: 'learning', name: 'Aprendizaje', description: 'Cursos estructurados, sesiones y materiales.', modules: ['sessions', 'courses', 'downloads'] },
  community: { key: 'community', name: 'Comunidad', description: 'Cursos, eventos, facilitadores y comunidad.', modules: ['sessions', 'courses', 'events', 'downloads', 'facilitators', 'students'] },
  academy: { key: 'academy', name: 'Academy completa', description: 'Todos los módulos actuales de Academy.', modules: ['sessions', 'courses', 'events', 'downloads', 'facilitators', 'students'] },
});

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
    const action = safeText(input.action, 20);
    if (action === 'templates') return response({ plans: Object.values(PLAN_TEMPLATES) });
    if (action !== 'assign' || user.role !== 'admin') return response({ error: 'forbidden' }, 403);
    const organizationId = safeText(input.organization_id, 100);
    const planKey = safeText(input.plan_key, 30);
    const plan = PLAN_TEMPLATES[planKey as keyof typeof PLAN_TEMPLATES];
    if (!organizationId || !plan) return response({ error: 'invalid_plan' }, 400);
    const organization = await base44.asServiceRole.entities.AcademyOrganization.get(organizationId).catch(() => null);
    if (!organization) return response({ error: 'not_found' }, 404);
    const updated = await base44.asServiceRole.entities.AcademyOrganization.update(organizationId, { plan_key: plan.key, plan_status: 'active', plan_started_at: organization.plan_started_at || new Date().toISOString(), enabled_modules: plan.modules });
    return response({ organization: updated, plan });
  } catch (_error) {
    return response({ error: 'internal_error' }, 500);
  }
});
