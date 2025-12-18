import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@^15.8.0';

function env(name) {
  return Deno.env.get(name) || null;
}

async function sha256Hex(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getYyyyMmFromUnix(unixSeconds) {
  try {
    const d = new Date((unixSeconds || Math.floor(Date.now()/1000)) * 1000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${y}${m}`;
  } catch {
    const d = new Date();
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${y}${m}`;
  }
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString();
}

async function markEvent(base44, event, status, extra = {}) {
  try {
    const [existing] = await base44.asServiceRole.entities.StripeEvent.filter({ event_id: event.id });
    if (existing) {
      return await base44.asServiceRole.entities.StripeEvent.update(existing.id, {
        status,
        processed_at: status === 'done' ? new Date().toISOString() : undefined,
        ...extra
      });
    }
    return await base44.asServiceRole.entities.StripeEvent.create({
      event_id: event.id,
      event_type: event.type,
      status,
      received_at: new Date().toISOString(),
      ...extra
    });
  } catch (_e) {
    // fail-open for idempotency persistence
    return null;
  }
}

async function eventAlreadyDone(base44, eventId) {
  try {
    const recs = await base44.asServiceRole.entities.StripeEvent.filter({ event_id: eventId });
    return recs.length > 0 && recs[0].status === 'done';
  } catch {
    return false;
  }
}

async function findUserByHints(base44, { userId, email, stripeCustomerId }) {
  // 1) by internal user id
  if (userId) {
    const byId = await base44.asServiceRole.entities.User.filter({ id: userId });
    if (byId.length) return byId[0];
  }
  // 2) by stripe customer id
  if (stripeCustomerId) {
    const byCust = await base44.asServiceRole.entities.User.filter({ stripe_customer_id: stripeCustomerId });
    if (byCust.length) return byCust[0];
  }
  // 3) by email
  if (email) {
    const byEmail = await base44.asServiceRole.entities.User.filter({ email });
    if (byEmail.length) return byEmail[0];
  }
  return null;
}

Deno.serve(async (req) => {
  const stripeSecret = env('STRIPE_SECRET');
  const webhookSecret = env('STRIPE_WEBHOOK_SECRET');

  if (!stripeSecret || !webhookSecret) {
    return Response.json({ error: 'CONFIG_MISSING' }, { status: 503 });
  }

  const base44 = createClientFromRequest(req);
  const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });

  // Read raw body for signature verification
  const raw = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return Response.json({ error: 'MISSING_SIGNATURE' }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
  } catch (err) {
    return Response.json({ error: 'INVALID_SIGNATURE' }, { status: 400 });
  }

  // Idempotency check
  if (await eventAlreadyDone(base44, event.id)) {
    return Response.json({ received: true, dedup: true }, { status: 200 });
  }
  await markEvent(base44, event, 'processing');

  try {
    if (event.type === 'checkout.session.completed') {
      // PHASE 1 handler remains here
      const session = event.data.object;
      // Fetch expanded session to ensure price/subscription availability
      const expanded = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items.data.price', 'subscription', 'customer'],
      });
      const mode = expanded.mode; // 'payment' | 'subscription'
      const line = expanded?.line_items?.data?.[0];
      const price = line?.price;
      const priceId = price?.id || null;

      const USER_ID = expanded?.metadata?.userId || expanded?.metadata?.user_id || expanded?.metadata?.user || null;
      const CUSTOMER_EMAIL = expanded?.customer_details?.email || expanded?.customer_email || null;
      const CUSTOMER_ID = typeof expanded.customer === 'string' ? expanded.customer : expanded.customer?.id || null;

      const user = await findUserByHints(base44, { userId: USER_ID, email: CUSTOMER_EMAIL, stripeCustomerId: CUSTOMER_ID });

      const PRICE_SINGLE = env('STRIPE_PRICE_SINGLE');
      const PRICE_BUNDLE5 = env('STRIPE_PRICE_BUNDLE5');
      const PRICE_SUB_PRO = env('STRIPE_PRICE_SUB_PRO');
      const PRICE_SUB_BUSINESS = env('STRIPE_PRICE_SUB_BUSINESS');

      let effect = 'unknown';

      if (user && mode === 'payment' && priceId === PRICE_SINGLE) {
        const one_time_exports = (user.one_time_exports || 0) + 1;
        await base44.asServiceRole.entities.User.update(user.id, {
          one_time_exports,
          stripe_customer_id: user.stripe_customer_id || CUSTOMER_ID || null,
          needs_payment: false
        });
        effect = 'single';
      } else if (user && mode === 'payment' && priceId === PRICE_BUNDLE5) {
        const credits = (user.credits || 0) + 5;
        const newExpiry = addMonths(new Date().toISOString(), 24);
        const credits_expire_at = user.credits_expire_at && new Date(user.credits_expire_at) > new Date(newExpiry)
          ? user.credits_expire_at
          : newExpiry;
        await base44.asServiceRole.entities.User.update(user.id, {
          credits,
          credits_expire_at,
          stripe_customer_id: user.stripe_customer_id || CUSTOMER_ID || null,
          needs_payment: false
        });
        effect = 'bundle5';
      } else if (user && mode === 'subscription' && (priceId === PRICE_SUB_PRO || priceId === PRICE_SUB_BUSINESS)) {
        const tier = priceId === PRICE_SUB_PRO ? 'pro' : 'business';
        const quota = priceId === PRICE_SUB_PRO ? 10 : 40;
        await base44.asServiceRole.entities.User.update(user.id, {
          subscription_type: tier,
          subscription_status: 'active',
          monthly_quota: quota,
          monthly_quota_used: 0,
          monthly_quota_reset_at: addMonths(new Date().toISOString(), 1),
          stripe_customer_id: user.stripe_customer_id || CUSTOMER_ID || null,
          stripe_subscription_id: expanded?.subscription?.id || expanded?.subscription || user.stripe_subscription_id || null,
          needs_payment: false,
          export_blocked_reason: null
        });
        effect = tier;
      } else {
        // No user found or unsupported combination; still 200 to avoid retries
        effect = 'unknown';
      }

      await markEvent(base44, event, 'done', {
        session_id: expanded.id,
        customer_id: CUSTOMER_ID || undefined,
        customer_email: CUSTOMER_EMAIL || undefined,
        amount_total: expanded?.amount_total || null,
        plan_type: effect
      });

      return Response.json({ received: true }, { status: 200 });
    }

    if (event.type === 'invoice.paid') {
      const invoice = event.data.object;
      if (!invoice.subscription) {
        await markEvent(base44, event, 'done', { plan_type: 'unknown' });
        return Response.json({ received: true }, { status: 200 });
      }

      // Retrieve expanded invoice for price and customer details
      const inv = await stripe.invoices.retrieve(invoice.id, {
        expand: ['lines.data.price', 'customer', 'subscription']
      });

      const line = inv?.lines?.data?.[0];
      const priceId = line?.price?.id || null;
      const PRICE_SUB_PRO = env('STRIPE_PRICE_SUB_PRO');
      const PRICE_SUB_BUSINESS = env('STRIPE_PRICE_SUB_BUSINESS');

      const CUSTOMER_ID = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id || null;
      const CUSTOMER_EMAIL = inv?.customer_email || (typeof inv.customer !== 'string' ? inv.customer?.email : null);

      const user = await findUserByHints(base44, { userId: null, email: CUSTOMER_EMAIL, stripeCustomerId: CUSTOMER_ID });

      // Determine tier/quota
      let tier = null;
      let quota = 0;
      if (priceId === PRICE_SUB_PRO) { tier = 'pro'; quota = 10; }
      if (priceId === PRICE_SUB_BUSINESS) { tier = 'business'; quota = 40; }

      if (!user || !tier) {
        // not attributable; still finish to avoid retries
        await markEvent(base44, event, 'done', { plan_type: tier || 'unknown', customer_id: CUSTOMER_ID || undefined });
        return Response.json({ received: true }, { status: 200 });
      }

      // Monthly guard key (per plan) for idempotency
      const yyyymm = getYyyyMmFromUnix(inv?.lines?.data?.[0]?.period?.end || inv?.period_end);
      const guardKey = `quota_${yyyymm}_${tier}`;
      const guards = user.quota_guards || {};
      const alreadyGranted = guards[guardKey] === true;

      if (!alreadyGranted) {
        guards[guardKey] = true;
        await base44.asServiceRole.entities.User.update(user.id, {
          subscription_type: tier,
          subscription_status: 'active',
          monthly_quota: quota,
          monthly_quota_used: 0,
          monthly_quota_reset_at: addMonths(new Date().toISOString(), 1),
          stripe_customer_id: user.stripe_customer_id || CUSTOMER_ID || null,
          stripe_subscription_id: inv.subscription?.id || inv.subscription || user.stripe_subscription_id || null,
          needs_payment: false,
          export_blocked_reason: null,
          quota_guards: guards
        });
      }

      await markEvent(base44, event, 'done', {
        plan_type: tier,
        customer_id: CUSTOMER_ID || undefined,
        amount_total: inv.total || null
      });

      return Response.json({ received: true, idempotent: alreadyGranted }, { status: 200 });
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;

      // Retrieve customer if needed
      const inv = await stripe.invoices.retrieve(invoice.id, { expand: ['customer', 'subscription'] });
      const CUSTOMER_ID = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id || null;
      const CUSTOMER_EMAIL = inv?.customer_email || (typeof inv.customer !== 'string' ? inv.customer?.email : null);

      const user = await findUserByHints(base44, { userId: null, email: CUSTOMER_EMAIL, stripeCustomerId: CUSTOMER_ID });

      if (user) {
        await base44.asServiceRole.entities.User.update(user.id, {
          subscription_status: 'past_due',
          needs_payment: true,
          export_blocked_reason: 'subscription_past_due'
        });
      }

      await markEvent(base44, event, 'done', {
        plan_type: 'unknown',
        customer_id: CUSTOMER_ID || undefined
      });

      return Response.json({ received: true }, { status: 200 });
    }

    // Unhandled events in this phase
    await markEvent(base44, event, 'done', { plan_type: 'unknown' });
    return Response.json({ received: true, ignored: true }, { status: 200 });
  } catch (err) {
    await markEvent(base44, event, 'failed', { error_message: err?.message?.slice(0, 500) || 'error' });
    return Response.json({ error: 'PROCESSING_ERROR' }, { status: 500 });
  }
});