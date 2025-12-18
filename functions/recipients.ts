import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// Inline dataset to avoid import path issues during deployment
const RECIPIENTS = [
  {
    id: "behoerde_jobcenter_berlin_mitte",
    name: "Jobcenter Berlin Mitte",
    category: "behörde",
    address_lines: ["Jobcenter Berlin Mitte", "Müllerstraße 146", "13353 Berlin"],
    email: "jobcenter-berlin-mitte@jobcenter-ge.de",
    fax: "+49 30 12345678",
    website: "https://www.berlin.de/jobcenter-mitte/"
  },
  {
    id: "firma_deutsche_bahn_kundenservice",
    name: "Deutsche Bahn – Kundendienst",
    category: "firma",
    address_lines: ["DB Vertrieb GmbH", "Kundendialog", "Postfach 10 06 13", "96058 Bamberg"],
    email: "kundendialog@bahn.de",
    fax: "",
    website: "https://www.bahn.de"
  },
  {
    id: "firma_vodafone_kundenservice",
    name: "Vodafone – Kundenservice",
    category: "firma",
    address_lines: ["Vodafone GmbH", "Kundenbetreuung", "40875 Ratingen"],
    email: "impressum@vodafone.com",
    fax: "",
    website: "https://www.vodafone.de"
  },
  {
    id: "ombudsstelle_schlichtungsstelle_telekom",
    name: "Schlichtungsstelle Telekommunikation",
    category: "ombudsstelle",
    address_lines: ["Bundesnetzagentur", "Schlichtungsstelle Telekommunikation", "Tulpenfeld 4", "53113 Bonn"],
    email: "schlichtungsstelle-tk@bnetza.de",
    fax: "+49 228 14-82272",
    website: "https://www.bundesnetzagentur.de"
  },
  {
    id: "firma_schufa_holding_ag",
    name: "SCHUFA Holding AG",
    category: "firma",
    address_lines: ["SCHUFA Holding AG", "Kormoranweg 5", "65201 Wiesbaden"],
    email: "verbraucherservice@schufa.de",
    fax: "",
    website: "https://www.schufa.de"
  }
];

function normalize(s) {
  return (s || '').toString().toLowerCase();
}

function includesAll(hay, needles) {
  const h = normalize(hay);
  return needles.every((n) => h.includes(normalize(n)));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Allow guests; no hard auth required
    await base44.auth.me().catch(() => null);

    const payload = (await req.json().catch(() => ({}))) || {};
    const q = (payload.q || '').toString().trim();
    const limit = Math.max(1, Math.min(50, Number(payload.limit) || 10));

    let results = RECIPIENTS.slice();

    if (q) {
      const parts = q.split(/\s+/).filter(Boolean);
      results = results.filter((r) => {
        const bag = [
          r.name,
          r.category,
          ...(r.address_lines || []),
          r.email || '',
          r.website || ''
        ].join(' | ');
        return includesAll(bag, parts);
      });

      const qn = normalize(q);
      results = results
        .map((r) => {
          let score = 0;
          const rn = normalize(r.name);
          if (rn.startsWith(qn)) score += 3;
          if (rn.includes(qn)) score += 1;
          if (r.category === 'behörde') score += 1;
          return { r, score };
        })
        .sort((a, b) => b.score - a.score)
        .map((x) => x.r);
    }

    return Response.json({
      ok: true,
      count: Math.min(results.length, limit),
      items: results.slice(0, limit),
    });
  } catch (error) {
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
});