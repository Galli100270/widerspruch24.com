import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@^15.8.0';

const priceCache = new Map();

async function getActivePriceId(stripe, productId, recurring = null) {
  const key = `${productId}|${recurring || 'one'}`;
  const hit = priceCache.get(key);
  if (hit && hit.until > Date.now()) return hit.id;
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  const list = prices.data.filter(p => recurring ? (p.type === 'recurring' && p.recurring?.interval === recurring) : p.type === 'one_time');
  if (!list.length) throw new Error(`NO_ACTIVE_PRICE:${productId}`);
  list.sort((a, b) => (a.unit_amount || 0) - (b.unit_amount || 0));
  const id = list[0].id;
  priceCache.set(key, { id, until: Date.now() + 5 * 60 * 1000 });
  return id;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { userId, pack = '20' } = await req.json();
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET'), { apiVersion: '2024-06-20' });
    const price = await getActivePriceId(stripe, Deno.env.get('STRIPE_PRODUCT_CREDITS_20'), null);
    const appUrl = Deno.env.get('APP_URL') || 'https://widerspruch24.com';
    
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price, quantity: 1 }],
      automatic_tax: { enabled: Deno.env.get('ENABLE_STRIPE_TAX') === 'true' },
      success_url: `${appUrl}/Dashboard?payment=success&type=credits&pack=${pack}`,
      cancel_url: `${appUrl}/ChoosePlan?payment=cancelled`,
      metadata: { 
        app: 'w24', 
        kind: 'credits', 
        pack: pack, 
        userId: userId || user.id 
      }
    });
    
    return Response.json({ url: session.url });
    
  } catch (error) {
    console.error('Stripe credits checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});