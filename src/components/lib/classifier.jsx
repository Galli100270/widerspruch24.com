import { InvokeLLM } from "@/integrations/Core";

// Simple KI-Klassifizierung für Texte aus Fällen/Uploads
// Gibt: { type, confidence, suggested_process, suggested_template_key, reason }
export async function classifyContent({ text, language = "de" }) {
  const templateMap = {
    "kündigung": "termination_generic",
    "mahnung": "payment_reminder",
    "widerruf": "withdrawal_purchase",
    "beschwerde": "complaint_generic",
    "widerspruch": "objection_generic"
  };

  const prompt = `Analysiere den folgenden deutschen Text aus einem behördlichen/vertraglichen Kontext und klassifiziere ihn.

Aufgabe:
- Erkenne den wahrscheinlichsten Anwendungsfall (labels: widerspruch, kündigung, mahnung, widerruf, beschwerde, sonstiges)
- Schätze die Sicherheit (0..1)
- Leite einen geeigneten Prozess ab: 'scanner' (für Widerspruch) oder 'schreiben' (alle anderen)
- Schlage, falls möglich, eine grobe Template-Empfehlung vor (z.B. termination_generic, payment_reminder)
- Erkläre kurz in 1-2 Sätzen, warum

Text (Sprache=${language}):\n\n${text.slice(0, 8000)}\n`;

  const schema = {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["widerspruch", "kündigung", "mahnung", "widerruf", "beschwerde", "sonstiges"],
      },
      confidence: { type: "number" },
      suggested_process: { type: "string", enum: ["scanner", "schreiben"] },
      suggested_template_key: { type: ["string", "null"] },
      reason: { type: "string" }
    },
    required: ["type", "confidence", "suggested_process"],
    additionalProperties: true
  };

  const res = await InvokeLLM({
    prompt,
    response_json_schema: schema,
    add_context_from_internet: false
  });

  // Normalisiere Ergebnis + Template-Fallback
  const out = typeof res === 'object' ? res : {};
  const type = (out.type || '').toLowerCase();
  const suggested_process = type === 'widerspruch' ? 'scanner' : 'schreiben';
  const suggested_template_key = out.suggested_template_key || templateMap[type] || null;
  const confidence = Math.max(0, Math.min(1, Number(out.confidence || 0)));

  return {
    type: type || 'sonstiges',
    confidence,
    suggested_process,
    suggested_template_key,
    reason: out.reason || ''
  };
}