import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@^15.8.0';

async function handler(req) {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET'), { apiVersion: '2024-06-20' });
  const base44 = createClientFromRequest(req).asServiceRole;

  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  let event;
  try {
    event = await stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')
    );
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const metadata = session.metadata;

    if (metadata.app !== 'w24') {
      return Response.json({ received: true, ignored: 'not_w24_app' });
    }

    try {
      const userEmail = session.customer_details?.email;
      if (!userEmail) {
        console.warn('Webhook: No user email found in session', session.id);
        return new Response('User email missing', { status: 400 });
      }

      let productName = 'Unbekanntes Produkt';
      if (metadata.kind === 'per_case') {
        productName = 'Einzelfall Widerspruch';
        const caseId = metadata.caseId;
        if (caseId) {
          await base44.entities.Case.update(caseId, {
            status: 'paid',
            payment_intent_id: session.payment_intent
          });
        }
      } else if (metadata.kind === 'credits') {
        productName = `Credits-Paket (${metadata.pack})`;
        const userId = metadata.userId;
        const creditsToAdd = Number(metadata.pack || 20);
        if (userId && !isNaN(creditsToAdd)) {
          const user = await base44.entities.User.get(userId);
          const currentCredits = user.credits || 0;
          await base44.entities.User.update(userId, {
            credits: currentCredits + creditsToAdd
          });
        }
      } else if (metadata.kind === 'subscription') {
        productName = 'Abo Pro (Monatlich)';
        const userId = metadata.userId;
        if (userId) {
          await base44.entities.User.update(userId, {
            plan: 'subscription',
            stripe_subscription_id: session.subscription,
            subscription_status: 'active'
          });
        }
      }

      // Create a transaction record for invoicing
      await base44.entities.Transaction.create({
        userEmail: userEmail,
        stripeSessionId: session.id,
        productName: productName,
        amount: session.amount_total,
        currency: session.currency,
        status: 'completed',
      });

    } catch (dbError) {
      console.error('Webhook DB update error:', dbError);
      return new Response(`Database update failed: ${dbError.message}`, { status: 500 });
    }
  }

  return Response.json({ received: true });
}

Deno.serve(handler);