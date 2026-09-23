import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@^15.8.0';

// In-memory cache for price lookups
const priceCache = new Map();

async function getActivePriceId(stripe, productId, recurring = null) {
  const key = `${productId}|${recurring || 'one'}`;
  const hit = priceCache.get(key);
  
  if (hit && hit.until > Date.now()) {
    return hit.id;
  }
  
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  const list = prices.data.filter(p => 
    recurring 
      ? (p.type === 'recurring' && p.recurring?.interval === recurring)
      : p.type === 'one_time'
  );
  
  if (!list.length) {
    throw new Error(`NO_ACTIVE_PRICE:${productId}`);
  }
  
  list.sort((a,b) => (a.unit_amount || 0) - (b.unit_amount || 0));
  const id = list[0].id;
  
  priceCache.set(key, { id, until: Date.now() + 5 * 60 * 1000 }); // 5 minutes cache
  return id;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Guest or logged-in user
    const user = await base44.auth.me().catch(() => null);

    const { caseId } = await req.json();
    if (!caseId) {
      return new Response(JSON.stringify({ error: 'MISSING_CASE_ID' }), { status: 400 });
    }
    
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET'), { apiVersion: '2024-06-20' });
    const price = await getActivePriceId(stripe, Deno.env.get('STRIPE_PRODUCT_PER_CASE'), null);
    const appUrl = Deno.env.get('APP_URL') || 'https://widerspruch24.com';
    
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price, quantity: 1 }],
      automatic_tax: { enabled: Deno.env.get('ENABLE_STRIPE_TAX') === 'true' },
      success_url: `${appUrl}/Preview?case_id=${caseId}&payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/Preview?case_id=${caseId}&payment=cancelled`,
      metadata: { 
        app: 'w24', 
        kind: 'per_case', 
        caseId: caseId, 
        userId: user?.id || 'guest' 
      }
    });
    
    return Response.json({ url: session.url });
    
  } catch (error) {
    console.error('Stripe per-case checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});