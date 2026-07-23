# Stripe Billing en Academy

## Decisión

Academy cobrará suscripciones recurrentes por organización cliente. Stripe Billing administra el ciclo de vida y Stripe Checkout hospeda el pago inicial. Customer Portal queda preparado para cambios de método de pago, cancelaciones y autogestión. No se usa Stripe Connect porque Academy no procesa pagos para terceros ni distribuye payouts: Scalaria cobra directamente a cada organización cliente.

## Estado actual

El código ya incluye:

- Campos Stripe en `AcademyOrganization` para customer, subscription, price, estado, periodo e invoice.
- `academyBillingMutation` con catálogo y estado de facturación.
- `academyStripeWebhook` con verificación HMAC de `Stripe-Signature`, tolerancia temporal e idempotencia mediante `AcademyBillingEvent`.
- Panel de administración que muestra configuración y estado sin exponer secretos.
- Interruptor `BILLING_ACTIVATED = false` compilado en backend. Mientras permanezca así no se generan sesiones de checkout ni portales de pago.

## Configuración pendiente

No se deben inventar valores ni guardarlos en Git. En el entorno seguro de Base44 habrá que configurar:

```text
STRIPE_SECRET_KEY       # preferentemente una restricted key rk_ con permisos mínimos
STRIPE_WEBHOOK_SECRET   # secreto whsec_ del endpoint
ACADEMY_PUBLIC_URL      # URL pública final de Academy
STRIPE_PRICE_SESSIONS
STRIPE_PRICE_LEARNING
STRIPE_PRICE_COMMUNITY
STRIPE_PRICE_ACADEMY
```

Los productos y precios aún no están definidos comercialmente. Se deben crear en Stripe Dashboard, en modo test primero, con moneda, periodicidad, impuestos y límites aprobados por el negocio.

## Eventos indispensables

El webhook procesa:

- `checkout.session.completed` para enlazar customer y subscription con la organización.
- `customer.subscription.created`, `customer.subscription.updated` y `customer.subscription.deleted` para mantener plan, módulos y estado.
- `invoice.paid` y `invoice.payment_failed` para registrar renovación y fallos de pago.

La firma siempre se valida contra el cuerpo crudo. Los eventos repetidos se ignoran por `event_id`.

## Activación posterior

1. Definir precios mensuales/anuales y política de prueba, cancelación y límites.
2. Crear productos y prices en Stripe test.
3. Configurar secretos en Base44 y registrar el endpoint público `academyStripeWebhook`.
4. Probar alta, renovación, fallo de pago, cancelación y portal con Stripe test mode.
5. Hacer una PR que cambie el interruptor a `true` después de la validación.
6. Repetir configuración con claves live separadas y ejecutar checklist de salida.

No activar `automatic_tax` hasta confirmar registros fiscales activos y la configuración de Stripe Tax correspondiente para México.
