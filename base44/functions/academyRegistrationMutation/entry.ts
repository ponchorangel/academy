import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { safeText } from './_shared/security.js';

function response(body: Record<string, unknown>, status = 200) { return Response.json(body, { status }); }

function escapeHtml(value: unknown) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] || character));
}

async function sendResendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const apiKey = Deno.env.get('Resend') || Deno.env.get('RESEND_API_KEY');
  if (!apiKey || !to) return { sent: false, reason: 'resend_not_configured' };
  const result = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: 'Academy by Scalaria <academy@scalaria.com.mx>', to: [to], subject, html }) });
  if (!result.ok) return { sent: false, reason: 'resend_send_failed' };
  return { sent: true };
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return response({ error: 'method_not_allowed' }, 405);
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id || user.disabled === true) return response({ error: 'unauthorized' }, 401);
    const input = await req.json().catch(() => ({}));
    const action = safeText(input.action, 30).toLowerCase();
    const organizationId = safeText(input.organization_id, 100);
    const resourceType = safeText(input.resource_type, 20).toLowerCase();
    const resourceId = safeText(input.resource_id, 100);
    if (!organizationId || !resourceId || !['session', 'event'].includes(resourceType) || !['register', 'cancel', 'attendance', 'send_reminders'].includes(action)) return response({ error: 'invalid_request' }, 400);
    const memberships = await base44.asServiceRole.entities.AcademyMembership.filter({ user_id: user.id, organization_id: organizationId, status: 'active' });
    const role = user.role === 'admin' && !memberships.length ? 'superadmin' : memberships[0]?.role;
    if (!role) return response({ error: 'forbidden' }, 403);
    const entityName = resourceType === 'event' ? 'AcademyEvent' : 'AcademySession';
    const resource = await base44.asServiceRole.entities[entityName].get(resourceId).catch(() => null);
    if (!resource || resource.organization_id !== organizationId || !['published', 'live'].includes(resource.status)) return response({ error: 'resource_not_found' }, 404);
    if (action === 'send_reminders') {
      if (!['superadmin', 'organization_admin', 'teacher'].includes(role)) return response({ error: 'forbidden' }, 403);
      const registrations = await base44.asServiceRole.entities.AcademyRegistration.filter({ organization_id: organizationId, resource_type: resourceType, resource_id: resourceId, status: 'registered' });
      let sent = 0;
      for (const registration of registrations) {
        const emailStatus = await sendResendEmail({ to: registration.email, subject: `Recordatorio: ${resource.title || 'evento de Academy'}`, html: `<p>Te recordamos tu registro para <strong>${escapeHtml(resource.title)}</strong>.</p><p>Fecha: ${escapeHtml(resource.start_at || 'Por confirmar')}</p><p>Academy by Scalaria</p>` });
        if (emailStatus.sent) sent += 1;
      }
      return response({ sent, total: registrations.length });
    }
    const existing = (await base44.asServiceRole.entities.AcademyRegistration.filter({ organization_id: organizationId, resource_type: resourceType, resource_id: resourceId, user_id: user.id }))[0];
    if (action === 'register') {
      if (existing?.status === 'registered' || existing?.status === 'attended') return response({ registration: existing });
      const registration = existing
        ? await base44.asServiceRole.entities.AcademyRegistration.update(existing.id, { status: 'registered', registered_at: existing.registered_at || new Date().toISOString() })
        : await base44.asServiceRole.entities.AcademyRegistration.create({ organization_id: organizationId, user_id: user.id, email: user.email || '', resource_type: resourceType, resource_id: resourceId, status: 'registered', registered_at: new Date().toISOString() });
      const emailStatus = await sendResendEmail({ to: user.email || '', subject: `Registro confirmado: ${resource.title || 'evento de Academy'}`, html: `<p>Hola ${escapeHtml(user.full_name || '')},</p><p>Tu registro para <strong>${escapeHtml(resource.title)}</strong> quedó confirmado.</p><p>Fecha: ${escapeHtml(resource.start_at || 'Por confirmar')}</p><p>Academy by Scalaria</p>` });
      return response({ registration, email: emailStatus });
    }
    if (action === 'cancel') {
      if (!existing) return response({ error: 'registration_not_found' }, 404);
      return response({ registration: await base44.asServiceRole.entities.AcademyRegistration.update(existing.id, { status: 'cancelled' }) });
    }
    if (!['superadmin', 'organization_admin', 'teacher'].includes(role)) return response({ error: 'forbidden' }, 403);
    const registrationId = safeText(input.registration_id, 100);
    const registration = await base44.asServiceRole.entities.AcademyRegistration.get(registrationId).catch(() => null);
    if (!registration || registration.organization_id !== organizationId || registration.resource_id !== resourceId) return response({ error: 'registration_not_found' }, 404);
    const nextStatus = ['registered', 'attended', 'cancelled'].includes(input.status) ? input.status : 'attended';
    return response({ registration: await base44.asServiceRole.entities.AcademyRegistration.update(registration.id, { status: nextStatus }) });
  } catch (_error) { return response({ error: 'internal_error' }, 500); }
});
