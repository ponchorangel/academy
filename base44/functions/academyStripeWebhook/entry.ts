import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { safeErrorCode, sha256, timingSafeEqualText } from './_shared/security.js';

const TOLERANCE_SECONDS = 300;

function response(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status });
}

async function signatureFor(payload: string, timestamp: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function parseSignature(header: string) {
  const values = new Map(header.split(',').map((part) => part.split('=').map((value) => value.trim())).filter(([key, value]) => key && value));
  return { timestamp: values.get('t') || '', signatures: header.split(',').filter((part) => part.trim().startsWith('v1=')).map((part) => part.trim().slice(3)) };
}

function timestampFromUnix(value: unknown) {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : undefined;
}

function planStatusFromStripe(status: string) {
  return ['active', 'trialing'].includes(status) ? 'active' : 'paused';
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return response({ error: 'method_not_allowed' }, 405);
    const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
    if (!secret) return response({ error: 'webhook_not_configured' }, 503);
    const payload = await req.text();
    const header = req.headers.get('stripe-signature') || '';
    const parsed = parseSignature(header);
    const timestamp = Number(parsed.timestamp);
    if (!parsed.timestamp || !Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > TOLERANCE_SECONDS) return response({ error: 'invalid_signature' }, 400);
    const expected = await signatureFor(payload, parsed.timestamp, secret);
    if (!parsed.signatures.some((signature) => timingSafeEqualText(signature, expected))) return response({ error: 'invalid_signature' }, 400);
    const event = JSON.parse(payload);
    const eventId = String(event.id || '');
    const eventType = String(event.type || '');
    if (!eventId || !eventType) return response({ error: 'invalid_event' }, 400);
    const base44 = createClientFromRequest(req);
    const existing = await base44.asServiceRole.entities.AcademyBillingEvent.filter({ event_id: eventId });
    if (existing.length) return response({ received: true, duplicate: true });
    const object = event.data?.object || {};
    const metadata = object.metadata || {};
    let organizationId = String(metadata.organization_id || '');
    const customerId = String(object.customer || object.customer_id || '');
    if (!organizationId && customerId) {
      const organizations = await base44.asServiceRole.entities.AcademyOrganization.filter({ stripe_customer_id: customerId });
      organizationId = String(organizations[0]?.id || '');
    }
    const organization = organizationId ? await base44.asServiceRole.entities.AcademyOrganization.get(organizationId).catch(() => null) : null;
    let update: Record<string, unknown> = { stripe_last_event_id: eventId };
    if (eventType === 'checkout.session.completed') {
      update = { ...update, stripe_customer_id: customerId || undefined, stripe_subscription_id: String(object.subscription || ''), stripe_subscription_status: 'checkout_completed', billing_email: String(object.customer_details?.email || object.customer_email || '').slice(0, 254) || undefined };
    } else if (eventType.startsWith('customer.subscription.')) {
      const status = String(object.status || 'incomplete');
      update = { ...update, stripe_customer_id: customerId || undefined, stripe_subscription_id: String(object.id || ''), stripe_subscription_status: status, stripe_price_id: String(object.items?.data?.[0]?.price?.id || ''), stripe_current_period_end: timestampFromUnix(object.current_period_end), stripe_cancel_at_period_end: Boolean(object.cancel_at_period_end), plan_status: planStatusFromStripe(status) };
      const planKey = String(metadata.plan_key || '');
      if (['sessions', 'learning', 'community', 'academy'].includes(planKey)) update.plan_key = planKey;
    } else if (eventType === 'invoice.paid') {
      update = { ...update, stripe_last_invoice_id: String(object.id || '') };
    } else if (eventType === 'invoice.payment_failed') {
      update = { ...update, stripe_last_invoice_id: String(object.id || ''), stripe_subscription_status: 'past_due', plan_status: 'paused' };
    } else {
      await base44.asServiceRole.entities.AcademyBillingEvent.create({ event_id: eventId, event_type: eventType, organization_id: organizationId, status: 'ignored', payload_hash: await sha256(payload), processed_at: new Date().toISOString() });
      return response({ received: true, ignored: true });
    }
    if (organization) await base44.asServiceRole.entities.AcademyOrganization.update(organization.id, Object.fromEntries(Object.entries(update).filter(([, value]) => value !== undefined)));
    await base44.asServiceRole.entities.AcademyBillingEvent.create({ event_id: eventId, event_type: eventType, organization_id: organizationId, status: organization ? 'processed' : 'ignored', payload_hash: await sha256(payload), processed_at: new Date().toISOString() });
    return response({ received: true });
  } catch (error) {
    return response({ error: 'internal_error', code: safeErrorCode(error) }, 500);
  }
});
