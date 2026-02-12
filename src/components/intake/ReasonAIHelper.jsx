import React from "react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Sparkles, Wand2, RefreshCw } from "lucide-react";

export default function ReasonAIHelper({ analysis, value, onChange, t }) {
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState({ suggestions: [], starters: [], quick_fill: {} });
  const [rephraseLoading, setRephraseLoading] = React.useState(false);
  const [variants, setVariants] = React.useState([]);
  const fetchedRef = React.useRef(false);

  React.useEffect(() => {
    const fetchAI = async () => {
      if (fetchedRef.current) return;
      setLoading(true);
      try {
        const prompt = `Du bist ein deutscher Rechtsassistent. Analysiere die folgenden extrahierten Felder eines behördlichen/vertraglichen Dokuments und liefere kurze, verständliche Vorschläge für Widerspruchsbegründungen. Antworte NUR als JSON gemäß Schema.\n\nAnalyse (JSON):\n${JSON.stringify(analysis || {}, null, 2)}\n\nRichtlinien:\n- Formuliere knapp (max. 18 Wörter pro Vorschlag).\n- Schreibe neutral-sachlich.\n- Starte keine Sätze mit Höflichkeitsfloskeln.\n- quick_fill sind Standardtexte, die sofort eingefügt werden können.`;
        const schema = {
          type: 'object',
          properties: {
            suggestions: { type: 'array', items: { type: 'string' } },
            starters: { type: 'array', items: { type: 'string' } },
            quick_fill: {
              type: 'object',
              properties: {
                incorrect_calculation: { type: 'string' },
                decision_unjustified: { type: 'string' },
                formal_error: { type: 'string' },
                deadline_missed: { type: 'string' },
                other: { type: 'string' }
              },
              additionalProperties: true
            }
          },
          required: ['suggestions','starters','quick_fill']
        };
        const res = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: schema,
          add_context_from_internet: false
        });
        setData({
          suggestions: Array.isArray(res?.suggestions) ? res.suggestions.slice(0,6) : [],
          starters: Array.isArray(res?.starters) ? res.starters.slice(0,6) : [
            'Ich widerspreche, weil …',
            'Der Bescheid berücksichtigt nicht, dass …',
            'Die Berechnung enthält folgenden Fehler: …'
          ],
          quick_fill: res?.quick_fill || {}
        });
        fetchedRef.current = true;
      } catch (_) {
        setData({
          suggestions: [
            'Betrag/Frist wurde fehlerhaft berechnet.',
            'Tatsächliche Umstände wurden unvollständig gewürdigt.',
            'Formvorgaben wurden nicht eingehalten.'
          ],
          starters: [
            'Ich widerspreche, weil …',
            'Meines Erachtens wurde … nicht beachtet.',
            'Nachweislich liegt folgender Fehler vor: …'
          ],
          quick_fill: {
            incorrect_calculation: 'Die zugrunde liegende Berechnung ist fehlerhaft (Positionen/Fristen wurden falsch ermittelt). Ich bitte um Neuberechnung und schriftliche Korrektur.',
            decision_unjustified: 'Die Entscheidung ist nicht hinreichend begründet. Relevante Tatsachen/Belege wurden nicht vollständig berücksichtigt. Bitte überprüfen und begründen Sie den Bescheid erneut.',
            formal_error: 'Es liegen Formfehler vor (z. B. fehlende Rechtsbehelfsbelehrung/Unterschrift/Datum). Ich bitte um formgerechte Neubescheidung.',
            deadline_missed: 'Die angesetzte Frist ist unzutreffend bzw. zu kurz bemessen. Ich beantrage die angemessene Fristkorrektur und Aussetzung der Vollziehung.',
            other: 'Ich bitte um erneute Prüfung, da wesentliche Aspekte unberücksichtigt blieben.'
          }
        });
      } finally {
        setLoading(false);
      }
    };
    fetchAI();
  }, [analysis]);

  const applyText = (text, mode = 'replace') => {
    if (!onChange) return;
    if (mode === 'append' && value) onChange((value + (value.endsWith(' ') ? '' : ' ') + text).trim());
    else onChange(text);
  };

  const rephrase = async () => {
    if (!value || value.trim().length < 5) return;
    setRephraseLoading(true);
    try {
      const prompt = `Formuliere den folgenden deutschen Text sachlich, klar und präzise um. Liefere 2 Varianten: eine knappe, eine etwas ausführlichere. Antworte NUR als JSON.\n\nText:\n${value}`;
      const schema = { type:'object', properties: { variants: { type:'array', items:{ type:'string' } } }, required:['variants'] };
      const res = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema, add_context_from_internet: false });
      setVariants(Array.isArray(res?.variants) ? res.variants.slice(0,2) : []);
    } catch (_) {
      setVariants([]);
    } finally { setRephraseLoading(false); }
  };

  const q = data.quick_fill || {};

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-white/80 text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> KI‑Hilfe
          {loading && <span className="text-white/60">lädt…</span>}
        </div>
        <Button size="sm" variant="outline" className="glass border-white/30 text-white" onClick={rephrase} disabled={!value || rephraseLoading}>
          {rephraseLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Besser formulieren
        </Button>
      </div>

      {data.suggestions?.length > 0 && (
        <div>
          <div className="text-white/70 text-xs mb-1">Vorschläge aus dem Dokument</div>
          <div className="flex flex-wrap gap-2">
            {data.suggestions.map((s, i) => (
              <Button key={i} size="sm" variant="outline" className="glass border-white/30 text-white" onClick={() => applyText(s)}>
                {s}
              </Button>
            ))}
          </div>
        </div>
      )}

      {data.starters?.length > 0 && (
        <div>
          <div className="text-white/70 text-xs mb-1">Satzstarter</div>
          <div className="flex flex-wrap gap-2">
            {data.starters.map((s, i) => (
              <Button key={i} size="sm" variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10" onClick={() => applyText(s, 'append')}>
                {s}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-white/70 text-xs mb-1">Schnell ausfüllen</div>
        <div className="flex flex-wrap gap-2">
          {q.incorrect_calculation && (
            <Button size="sm" className="glass border-white/30 text-white" variant="outline" onClick={() => applyText(q.incorrect_calculation)}>
              Falsche Berechnung
            </Button>
          )}
          {q.decision_unjustified && (
            <Button size="sm" className="glass border-white/30 text-white" variant="outline" onClick={() => applyText(q.decision_unjustified)}>
              Unbegründete Entscheidung
            </Button>
          )}
          {q.formal_error && (
            <Button size="sm" className="glass border-white/30 text-white" variant="outline" onClick={() => applyText(q.formal_error)}>
              Formfehler
            </Button>
          )}
          {q.deadline_missed && (
            <Button size="sm" className="glass border-white/30 text-white" variant="outline" onClick={() => applyText(q.deadline_missed)}>
              Frist falsch/zu kurz
            </Button>
          )}
          {q.other && (
            <Button size="sm" className="glass border-white/30 text-white" variant="outline" onClick={() => applyText(q.other)}>
              Allgemein
            </Button>
          )}
        </div>
      </div>

      {variants?.length > 0 && (
        <div className="mt-2 grid sm:grid-cols-2 gap-3">
          {variants.map((v, i) => (
            <div key={i} className="glass rounded-xl p-3 text-white/90">
              <div className="text-sm whitespace-pre-wrap">{v}</div>
              <div className="text-right mt-2">
                <Button size="sm" variant="outline" className="glass border-white/30 text-white" onClick={() => applyText(v)}>
                  Übernehmen
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}