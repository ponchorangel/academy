export const ROLE_GROUPS = Object.freeze({
  administrators: Object.freeze(['admin', 'superadmin', 'organization_admin']),
  contentManagers: Object.freeze(['admin', 'superadmin', 'organization_admin', 'teacher']),
  learners: Object.freeze(['admin', 'superadmin', 'organization_admin', 'teacher', 'student']),
});

export function normalizeRole(role) {
  if (role === 'user') return 'usuario';
  return String(role || '').trim().toLowerCase();
}

export function actorIsActive(user) {
  return Boolean(user?.id) && user.disabled !== true;
}

export function actorHasRole(user, allowedRoles) {
  return actorIsActive(user) && allowedRoles.includes(normalizeRole(user.role));
}

export function actorIsService(user) {
  return actorIsActive(user) && user.is_service === true;
}

export async function getActor(base44) {
  return base44.auth.me().catch(() => null);
}

export async function requireActor(base44, allowedRoles, options = {}) {
  const actor = await getActor(base44);
  if (!actorIsActive(actor)) {
    return { ok: false, actor, status: actor?.disabled === true ? 403 : 401, error: actor?.disabled === true ? 'account_disabled' : 'unauthorized' };
  }
  if (options.allowService && actorIsService(actor)) return { ok: true, actor };
  if (!actorHasRole(actor, allowedRoles)) return { ok: false, actor, status: 403, error: 'forbidden' };
  return { ok: true, actor };
}

export async function requireServiceActor(base44) {
  const actor = await getActor(base44);
  if (!actorIsService(actor)) {
    return { ok: false, actor, status: actor?.disabled === true ? 403 : 401, error: actor?.disabled === true ? 'account_disabled' : 'service_auth_required' };
  }
  return { ok: true, actor };
}

export function safeErrorCode(error, fallback = 'internal_error') {
  const raw = error?.response?.data?.error || error?.code || fallback;
  return String(raw).replace(/[^a-zA-Z0-9_.:-]/g, '_').slice(0, 100) || fallback;
}

export function safeText(value, maxLength = 500) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLength);
}

export function emailIsValid(value) {
  const email = String(value || '').trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !/[\r\n]/.test(email);
}

export function timingSafeEqualText(a, b) {
  const left = new TextEncoder().encode(String(a || ''));
  const right = new TextEncoder().encode(String(b || ''));
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

export async function sha256(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value ?? '')));
  return Array.from(new Uint8Array(bytes)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export function retentionDate(envName, fallbackDays) {
  const configured = typeof Deno !== 'undefined' ? Number(Deno.env.get(envName) || fallbackDays) : fallbackDays;
  const days = Number.isFinite(configured) ? Math.min(730, Math.max(30, Math.trunc(configured))) : fallbackDays;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

// Requiere una entidad `EventoSeguridad` (o el nombre que uses) con campos
// equivalentes a los de abajo. Ajusta el nombre de entidad al esquema real.
export async function auditSecurityEvent(base44, event) {
  const expiresAt = retentionDate('SECURITY_AUDIT_RETENTION_DAYS', 180);
  const record = {
    actor_id: safeText(event.actor?.id || 'anonymous', 100),
    actor_role: safeText(normalizeRole(event.actor?.role) || 'anonymous', 50),
    accion: safeText(event.action, 100),
    entidad: safeText(event.entity, 100),
    entidad_id_hash: event.entityId ? await sha256(event.entityId) : '',
    resultado: ['permitido', 'rechazado', 'error'].includes(event.result) ? event.result : 'error',
    motivo: safeText(event.reason, 200),
    idempotency_key: safeText(event.idempotencyKey, 200),
    metadata_minima: JSON.stringify(event.metadata || {}).slice(0, 1000),
    fecha_evento: new Date().toISOString(),
    expira_en: expiresAt,
  };
  return base44.asServiceRole.entities.EventoSeguridad.create(record).catch(() => null);
}
