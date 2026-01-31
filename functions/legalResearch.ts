/*
Musterfall (Beispiel-Aufruf):
await base44.functions.invoke('legalResearch', {
  topic: 'Widerspruch / Telekom-Rechnung',
  facts: { reason: 'falsche Abrechnung', referenz: 'KD-12345', amount_total: 89.90 },
  language: 'de'
});
Erwartet: { research: { statutes: [...], case_law: [...], ... } }
*/
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Auth optional: Gastnutzer erlaubt
    await base44.auth.me().catch(() => null);

    const body = await req.json().catch(() => ({}));
    const { topic = 'Widerspruch / Verwaltungs- und Zivilrecht', facts = {}, language = 'de' } = body || {};

    const prompt = `
Du bist ein juristischer Recherche-Assistent für deutsches Recht. Liefere aktuelle, belastbare Fundstellen (Gesetze + Rechtsprechung) mit Quellen-URLs. Sprache: ${language}.

Kontext (Sachverhalt/Parameter, JSON):
${JSON.stringify(facts, null, 2)}

Aufgabe:
- Identifiziere die wichtigsten Normen (BGB, VwVfG, VwGO, UWG, TKG, EnWG etc. – je nach Kontext) inkl. Absatz/Satz/Nummer.
- Füge prägnante Kurzbegründungen und ggf. amtliche Begründungen/Verwaltungsvorschriften hinzu.
- Sammle einschlägige Rechtsprechung (Gericht, Datum, Az., Kernaussage) der letzten Jahre; wenn nötig auch EU-Recht (VO/RL, EuGH).
- Nenne 2–3 typische Gegenargumente und entkräfte sie mit Belegen.
- Gib 8–15 seriöse Quellen-Links an (z. B. gesetze-im-internet.de, dejure.org, EUR-Lex, CURIA, beck/Heinrich-Heine nur wenn frei zugänglich). Keine Paywall-Links.

Antworte als reines JSON nach folgendem Schema.`;

    const schema = {
      type: 'object',
      properties: {
        topic: { type: 'string' },
        statutes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              law: { type: 'string' }, // z.B. BGB, VwGO
              paragraph: { type: 'string' }, // z.B. § 280 Abs. 1 S. 1
              title: { type: 'string' },
              summary: { type: 'string' },
              relevance: { type: 'string' },
              quote: { type: 'string' },
              source_url: { type: 'string' }
            },
            required: ['law', 'paragraph', 'summary', 'source_url']
          }
        },
        case_law: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              court: { type: 'string' }, // BGH, BVerwG, OLG XY
              date: { type: 'string' },
              docket_number: { type: 'string' },
              citation: { type: 'string' },
              holding: { type: 'string' },
              relevance: { type: 'string' },
              source_url: { type: 'string' }
            },
            required: ['court', 'date', 'docket_number', 'holding', 'source_url']
          }
        },
        counterarguments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              argument: { type: 'string' },
              refutation: { type: 'string' },
              supporting_statutes: { type: 'array', items: { type: 'string' } },
              supporting_cases: { type: 'array', items: { type: 'string' } }
            },
            required: ['argument', 'refutation']
          }
        },
        additional_sources: { type: 'array', items: { type: 'string' } }
      },
      required: ['statutes', 'case_law']
    };

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: schema
    });

    return Response.json({ topic, facts, research: res });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});