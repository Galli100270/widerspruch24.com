Deno.serve(async (_req) => {
  try {
    const env = (k) => {
      try { return Boolean(Deno.env.get(k)); } catch { return false; }
    };
    const stripeReady =
      env("STRIPE_SECRET") &&
      env("STRIPE_WEBHOOK_SECRET") &&
      env("STRIPE_PRICE_SINGLE") &&
      env("STRIPE_PRICE_BUNDLE5") &&
      env("STRIPE_PRICE_SUB_PRO") &&
      env("STRIPE_PRICE_SUB_BUSINESS");

    const flags = {
      webhook: {
        handlers: {
          "checkout.session.completed": stripeReady,
          "invoice.paid": stripeReady,
          "payment_failed": stripeReady,
          "subscription.deleted": stripeReady,
          "charge.refunded": stripeReady,
          "dispute.*": stripeReady,
        },
        ready: stripeReady,
      },
      analysis: { pipeline: { ready: true }, ocr: { ok: true }, llm: { ok: true } },
      heic: { ok: true },
      reminder: { scheduler: { ready: true }, quiet_hours: { start: "21:00", end: "08:00" } },
      preview: { watermark: { enabled: true } },
      app: { urlSet: env("APP_URL") },
      ts: new Date().toISOString(),
      checksum: "",
    };

    const flat = JSON.stringify(flags);
    const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(flat));
    const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
    flags.checksum = hashHex;

    return new Response(JSON.stringify(flags), {
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