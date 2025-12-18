Deno.serve(async (_req) => {
  try {
    // Ensure async handler has an await to satisfy lint/validation
    await Promise.resolve();

    const env = (name) => {
      try { return Boolean(Deno.env.get(name)); } catch { return false; }
    };

    const flags = {
      STRIPE_SECRET: env("STRIPE_SECRET"),
      STRIPE_WEBHOOK_SECRET: env("STRIPE_WEBHOOK_SECRET"),
      STRIPE_PRICE_SINGLE: env("STRIPE_PRICE_SINGLE"),
      STRIPE_PRICE_BUNDLE5: env("STRIPE_PRICE_BUNDLE5"),
      STRIPE_PRICE_SUB_PRO: env("STRIPE_PRICE_SUB_PRO"),
      STRIPE_PRICE_SUB_BUSINESS: env("STRIPE_PRICE_SUB_BUSINESS"),
      APP_URL: env("APP_URL"),
    };

    const paymentsEnabled =
      flags.STRIPE_SECRET &&
      flags.STRIPE_WEBHOOK_SECRET &&
      flags.STRIPE_PRICE_SINGLE &&
      flags.STRIPE_PRICE_BUNDLE5 &&
      flags.STRIPE_PRICE_SUB_PRO &&
      flags.STRIPE_PRICE_SUB_BUSINESS;

    const body = {
      ok: true,
      paymentsEnabled,
      flags,
      ts: new Date().toISOString(),
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});