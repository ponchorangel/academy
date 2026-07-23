import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { emailIsValid, safeErrorCode, safeText } from './_shared/security.js';

const API_VERSION = '2026-06-24.dahlia';
// Kill switch de código: checkout y portal no se activan hasta completar pruebas y una PR explícita.
const BILLING_ACTIVATED = false;
const PLAN_KEYS = new Set(['sessions', 'learning', 'community', 'academy']);
const PRICE_ENV_BY_PLAN = {
  sessions: 'STRIPE_PRICE_SESSIONS',
  learning: 'STRIPE_PRICE_LEARNING',
  community: 'STRIPE_PRICE_COMMUNITY',
  academy: 'STRIPE_PRICE_ACADEMY',
};

function response(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status });
}

function configuration() {
  const secretKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
  const publicUrl = (Deno.env.get('ACADEMY_PUBLIC_URL') || '').replace(/\/$/, '');
  const priceIds = Object.fromEntries(Object.entries(PRICE_ENV_BY_PLAN).map(([key, envName]) => [key, Deno.env.get(envName) || '']));
  return { configured: Boolean(secretKey && publicUrl), secretKey, publicUrl, priceIds };
}

async function stripeRequest(path: string, method: string, secretKey: string, params: URLSearchParams) {
  const result = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: { Authorization: `Bearer ${secretKey}`, 'Stripe-Version': API_VERSION, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  const payload = await result.json().catch(() => ({}));
  if (!result.ok) throw new Error(`stripe_${result.status}_${safeErrorCode(payload?.error, 'request_failed')}`);
  return payload;
}

async function getAuthorizedOrganization(base44: any, user: any, organizationId: string) {
  if (!organizationId) return { organization: null, role: '', status: 400 };
  const organization = await base44.asServiceRole.entities.AcademyOrganization.get(organizationId).catch(() => null);
  if (!organization) return { organization: null, role: '', status: 404 };
  if (user.role === 'admin') return { organization, role: 'superadmin', status: 200 };
  const memberships = await base44.asServiceRole.entities.AcademyMembership.filter({ user_id: user.id, organization_id: organizationId, status: 'active' });
  const role = memberships[0]?.role || '';
  if (!['organization_admin'].includes(role)) return { organization, role, status: 403 };
  return { organization, role, status: 200 };
}

function priceForPlan(planKey: string, config: ReturnType<typeof configuration>) {
  return config.priceIds[planKey as keyof typeof config.priceIds] || '';
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return response({ error: 'method_not_allowed' }, 405);
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user?.id || user.disabled === true) return response({ error: 'unauthorized' }, 401);
    const input = await req.json().catch(() => ({}));
    const action = safeText(input.action, 20);
    const config = configuration();

    if (action === 'catalog') {
      return response({
        configured: config.configured,
        plans: Object.entries(PRICE_ENV_BY_PLAN).map(([key, envName]) => ({ key, price_configured: Boolean(config.priceIds[key]), configuration_key: envName })),
        checkout_enabled: false,
        message: 'Los precios y cobros se habilitarán después de configurar Stripe en el entorno seguro.',
      });
    }

    const authorized = await getAuthorizedOrganization(base44, user, safeText(input.organization_id, 100));
    if (authorized.status !== 200) return response({ error: authorized.status === 404 ? 'not_found' : authorized.status === 400 ? 'invalid_organization' : 'forbidden' }, authorized.status);
    const organization = authorized.organization;
    if (action === 'status') {
      return response({ billing: { configured: config.configured, customer_id: organization.stripe_customer_id || '', subscription_id: organization.stripe_subscription_id || '', subscription_status: organization.stripe_subscription_status || '', price_id: organization.stripe_price_id || '', current_period_end: organization.stripe_current_period_end || '', cancel_at_period_end: Boolean(organization.stripe_cancel_at_period_end), plan_key: organization.plan_key || 'sessions', plan_status: organization.plan_status || 'trial' } });
    }
    if (!['checkout', 'portal'].includes(action)) return response({ error: 'invalid_action' }, 400);
    if (!BILLING_ACTIVATED) return response({ error: 'billing_activation_pending' }, 409);
    if (!config.configured) return response({ error: 'billing_not_configured' }, 409);

    if (action === 'portal') {
      if (!organization.stripe_customer_id) return response({ error: 'stripe_customer_not_found' }, 409);
      const portal = await stripeRequest('billing_portal/sessions', 'POST', config.secretKey, new URLSearchParams({ customer: organization.stripe_customer_id, return_url: `${config.publicUrl}/` }));
      return response({ url: portal.url });
    }

    const planKey = safeText(input.plan_key || organization.plan_key, 30);
    if (!PLAN_KEYS.has(planKey)) return response({ error: 'invalid_plan' }, 400);
    const priceId = priceForPlan(planKey, config);
    if (!priceId) return response({ error: 'stripe_price_not_configured', plan_key: planKey }, 409);
    if (['active', 'trialing', 'past_due'].includes(organization.stripe_subscription_status || '')) return response({ error: 'subscription_already_exists' }, 409);
    const billingEmail = safeText(input.billing_email || organization.billing_email || user.email, 254).toLowerCase();
    if (!emailIsValid(billingEmail)) return response({ error: 'invalid_billing_email' }, 400);
    let customerId = organization.stripe_customer_id || '';
    if (!customerId) {
      const customer = await stripeRequest('customers', 'POST', config.secretKey, new URLSearchParams({ email: billingEmail, name: safeText(organization.display_name || organization.name, 160), 'metadata[organization_id]': organization.id, 'metadata[plan_key]': planKey }));
      customerId = customer.id;
      await base44.asServiceRole.entities.AcademyOrganization.update(organization.id, { billing_email: billingEmail, stripe_customer_id: customerId });
    }
    const suffix = Array.from(crypto.getRandomValues(new Uint8Array(8))).map((byte) => String.fromCharCode(97 + (byte % 26))).join('');
    const checkout = await stripeRequest('checkout/sessions', 'POST', config.secretKey, new URLSearchParams({ mode: 'subscription', customer: customerId, 'line_items[0][price]': priceId, 'line_items[0][quantity]': '1', client_reference_id: organization.id, 'metadata[organization_id]': organization.id, 'metadata[plan_key]': planKey, 'subscription_data[metadata][organization_id]': organization.id, 'subscription_data[metadata][plan_key]': planKey, success_url: `${config.publicUrl}/?billing=success&session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${config.publicUrl}/?billing=cancelled`, integration_identifier: `academy_${suffix}` }));
    return response({ url: checkout.url, session_id: checkout.id });
  } catch (error) {
    return response({ error: 'internal_error', code: safeErrorCode(error) }, 500);
  }
});
