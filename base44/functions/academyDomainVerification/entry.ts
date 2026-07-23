import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { safeText } from './_shared/security.js';

function response(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status });
}

function validDomain(value: string) {
  return value.length <= 253 && /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(value);
}

async function resolve(domain: string, type: string) {
  const result = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`, { headers: { accept: 'application/dns-json' } });
  if (!result.ok) throw new Error('dns_provider_unavailable');
  const payload = await result.json();
  return Array.isArray(payload.Answer) ? payload.Answer : [];
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
    const role = user.role === 'admin' && !memberships.length ? 'superadmin' : memberships[0]?.role;
    if (!['superadmin', 'organization_admin'].includes(role)) return response({ error: 'forbidden' }, 403);
    const organization = await base44.asServiceRole.entities.AcademyOrganization.get(organizationId).catch(() => null);
    const domain = safeText(organization?.custom_domain, 253).toLowerCase();
    if (!organization) return response({ error: 'not_found' }, 404);
    if (!validDomain(domain)) return response({ error: 'invalid_domain' }, 400);

    const checkedAt = new Date().toISOString();
    try {
      const answers = [...await resolve(domain, 'CNAME'), ...await resolve(domain, 'A'), ...await resolve(domain, 'AAAA')];
      const status = answers.length ? 'dns_found' : 'pending_dns';
      const updated = await base44.asServiceRole.entities.AcademyOrganization.update(organizationId, { custom_domain_status: status, domain_checked_at: checkedAt });
      return response({ organization: updated, status, records_found: answers.length });
    } catch (_error) {
      return response({ error: 'dns_check_unavailable', status: organization.custom_domain_status || 'pending_dns' }, 503);
    }
  } catch (_error) {
    return response({ error: 'internal_error' }, 500);
  }
});
