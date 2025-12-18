
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronDown, Info, ShieldCheck } from 'lucide-react';
import ObjectionReasonDropdown from "@/components/ObjectionReasonDropdown";

// Entferne die alten SuggestionCard-Kacheln aus der Darstellung und nutze ein kompaktes Dropdown
const T = (t, key, fallback) => {
  try {
    const val = t ? t(key) : null;
    return !val || val === key ? fallback : val;
  } catch {
    return fallback;
  }
};

export default function AISuggestions({ caseData, t, onApply }) {
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState('');
  const [selectedReason, setSelectedReason] = useState(
    Array.isArray(caseData?.objection_categories) && caseData.objection_categories[0]
      ? caseData.objection_categories[0]
      : null
  );

  // 5 logische Gründe (reduziert und verständlich)
  const reasonOptions = [
    { id: 'calculation_error', label: 'Berechnungsfehler', icon: '🧮', desc: 'z. B. falsche Betrags- oder Fristenberechnung' },
    { id: 'legal_basis', label: 'Fehlerhafte Rechtsgrundlage', icon: '⚖️', desc: 'Begründung stützt sich auf unpassende Rechtsgrundlage' },
    { id: 'procedural_error', label: 'Verfahrensfehler', icon: '📋', desc: 'Form-/Verfahrensvorschriften wurden wohl nicht eingehalten' },
    { id: 'factual_error', label: 'Sachverhaltsfehler', icon: '❌', desc: 'Faktenlage unvollständig oder unzutreffend gewürdigt' },
    { id: 'proportionality', label: 'Unverhältnismäßigkeit', icon: '⚖️', desc: 'Maßnahme steht nicht im angemessenen Verhältnis' },
  ];

  const handleReasonChange = (id, opt) => {
    setSelectedReason(id);
    // Optional: sofort einen sanften Textbaustein vorschlagen (ohne Rechtsberatung)
    if (onApply && opt?.label) {
      onApply({
        id: `reason_${id}`,
        type: 'user_reason',
        textSnippet: `Ich sehe einen möglichen Ansatz unter dem Gesichtspunkt „${opt.label}“.`,
      });
    }
  };

  return (
    <div className="glass rounded-3xl overflow-hidden mb-8">
      <div className="bg-black/20 px-6 py-4 border-b border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">🤖</span>
              {T(t, 'suggestionsTitle', 'KI‑Vorprüfung (unverbindlich)')}
            </h3>
            <p className="text-white/70 text-sm mt-1">
              {T(t, 'suggestionsSubtitle', 'Wählen Sie den passendsten Ansatz – die App führt Sie sicher durch die nächsten Schritte.')}
            </p>
          </div>
        </div>
      </div>

      <CardContent className="p-6 space-y-4">
        {error && (
          <Alert className="glass border-red-500/50">
            <AlertDescription className="text-white">{error}</AlertDescription>
          </Alert>
        )}

        {/* Neutrale Sicherheitshinweise */}
        <div className="glass rounded-xl p-3 border border-white/15">
          <div className="flex items-start gap-3 text-white/80 text-sm">
            <ShieldCheck className="w-4 h-4 text-green-300 mt-0.5" />
            <div>
              <div className="font-medium">Hinweis</div>
              <div className="opacity-90">
                Diese Einschätzung ist eine automatisch erstellte Vorprüfung zur Orientierung. Keine Rechtsberatung.
              </div>
            </div>
          </div>
        </div>

        {/* Kompaktes Dropdown mit 5 Einspruchsgründen */}
        <div className="bg-white rounded-xl p-4">
          <ObjectionReasonDropdown
            value={selectedReason}
            options={reasonOptions}
            onChange={handleReasonChange}
            t={t}
          />
        </div>

        {/* Optional: Details nur bei Bedarf – animiertes Dropdown */}
        <div className="pt-2">
          <Button
            variant="ghost"
            className="text-white/80 hover:text-white"
            onClick={() => setShowDetails((v) => !v)}
            aria-expanded={showDetails}
            aria-controls="ai-suggestions-details"
          >
            <Info className="w-4 h-4 mr-2" />
            {showDetails ? 'Details verbergen' : 'Details anzeigen'}
            <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          </Button>

          <div
            id="ai-suggestions-details"
            className={`overflow-hidden transition-all duration-300 ${showDetails ? 'max-h-[700px] opacity-100' : 'max-h-0 opacity-0'}`}
          >
            <div className="mt-3 grid md:grid-cols-2 gap-4">
              {reasonOptions.map((opt) => (
                <Card key={opt.id} className="glass border-white/15">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <span className="text-lg">{opt.icon}</span>
                      {opt.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-white/80 text-sm">
                    {opt.desc}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </div>
  );
}
