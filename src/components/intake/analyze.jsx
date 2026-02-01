import { InvokeLLM } from "@/integrations/Core";
import { splitAndExtractPdf } from "@/functions/splitAndExtractPdf";

export async function analyzeFiles(uploaded) {
  // uploaded: [{url,name,type}]
  const first = uploaded[0];
  if (!first) return null;

  const schema = {
    type: 'object',
    properties: {
      document_type: { type: 'string' },
      document_type_confidence: { type: 'number' },
      fields: {
        type: 'object',
        properties: {
          sender_name: fieldSchema(),
          recipient: fieldSchema(),
          reference_number: fieldSchema(),
          document_date: fieldSchema(),
          amount_total: fieldSchema('number'),
          deadline: fieldSchema(),
          subject: fieldSchema(),
        }
      },
      notes: { type: 'string' }
    }
  };

  const result = {
    document_type: 'Sonstiges',
    document_type_confidence: 0,
    fields: {},
    notes: ''
  };

  // PDF: versuche vorab Server-Extraktion (robust gegen große PDFs)
  const isPdf = /pdf$/i.test(first.type || '') || /\.pdf$/i.test(first.name || '');
  if (isPdf) {
    try {
      const base = await splitAndExtractPdf({ file_url: first.url, json_schema: {
        type: 'object',
        properties: {
          sender_name: { type: 'string' },
          reference_number: { type: 'string' },
          document_date: { type: 'string' },
          amount_total: { type: 'number' }
        }
      }});
      const merged = base?.data?.output || {};
      // LLM-Aufbereitung mit Evidenz + Confidence
      const llm = await InvokeLLM({
        prompt: buildPrompt([first.url], merged),
        file_urls: [first.url],
        response_json_schema: schema
      });
      return normalize(llm);
    } catch (_) { /* fallback unten */ }
  }

  // Images / andere: direkter LLM-Call mit Schema
  try {
    const llm = await InvokeLLM({
      prompt: buildPrompt(uploaded.map(x=>x.url)),
      file_urls: uploaded.map(x=>x.url),
      response_json_schema: schema
    });
    return normalize(llm);
  } catch (e) {
    return {
      ...result,
      notes: 'Analyse unsicher/fehlgeschlagen – bitte bessere Aufnahme oder PDF hochladen.'
    };
  }
}

function fieldSchema(type = 'string') {
  return {
    type: 'object',
    properties: {
      value: { type },
      confidence: { type: 'number' },
      evidence: { type: 'string' }
    }
  };
}

function buildPrompt(fileUrls = [], seeded = {}) {
  return (
`Du bist ein vorsichtiger Dokumenten-Analysator. Erkenne ausschließlich strukturierte Kerndaten – ohne juristische Wertung.
Gib JSON gemäß Schema zurück (Felder: value, confidence 0-100, evidence: Seite/Zeile/Snippet).
Klassifiziere document_type aus: Rechnung, Mahnung, Inkasso / Forderungsschreiben, Bescheid / Behörde, Vertrag, Kündigung, Sonstiges.
Wenn unsicher: confidence < 70.

Vorgegebene Rohwerte (falls vorhanden – nur als Hinweis, nicht blind übernehmen): ${JSON.stringify(seeded).slice(0, 2500)}
`);
}

function normalize(obj){
  if (typeof obj !== 'object' || !obj) return null;
  const out = { document_type: obj.document_type || 'Sonstiges', document_type_confidence: obj.document_type_confidence || 0, fields: obj.fields || {}, notes: obj.notes || '' };
  // Ensure nested
  for (const k of Object.keys(out.fields)) {
    const v = out.fields[k] || {};
    out.fields[k] = { value: v.value ?? '', confidence: v.confidence ?? 0, evidence: v.evidence ?? '' };
  }
  return out;
}