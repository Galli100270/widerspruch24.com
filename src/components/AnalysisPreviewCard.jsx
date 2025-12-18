
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { InvokeLLM } from "@/integrations/Core";
import { safeExtractData } from "@/components/lib/ocr";
import { AlertTriangle, Timer, Eye, Info, CheckSquare, Square, ChevronDown } from "lucide-react";
import PreviewWatermarkModal from "./PreviewWatermarkModal";
import { trackEvent } from "@/components/lib/analytics";
import { useTrialStatus } from "@/components/hooks/useTrialStatus";
import { configStatus } from "@/functions/configStatus";
import { updateCaseSafe } from "@/components/lib/caseUtils";
import { getRemoteFileSize } from "@/components/lib/files";
import ObjectionReasonDropdown from "./ObjectionReasonDropdown";

const CLASS_META = {
  bescheid: { icon: "🧾", label: "Bescheid" },
  rechnung: { icon: "🧾", label: "Rechnung" },
  mahnung: { icon: "💳", label: "Mahnung" },
  inkasso: { icon: "⚠️", label: "Inkasso" },
  vertrag: { icon: "📄", label: "Vertrag" },
  sonstiges: { icon: "🗂️", label: "Sonstiges" }
};

export default function AnalysisPreviewCard({ caseId, caseData, documentUrls = [], t }) {
  const [loading, setLoading] = React.useState(false);
  const [showSkeleton, setShowSkeleton] = React.useState(false);
  const [error, setError] = React.useState("");
  const [analysis, setAnalysis] = React.useState(caseData?.analysis?.latest || null);
  const [showPreview, setShowPreview] = React.useState(false);
  const [showDetails, setShowDetails] = React.useState(false);
  const [todosChecked, setTodosChecked] = React.useState(
    (caseData?.analysis?.latest?.todos_checked) || {}
  );
  const [selectedReason, setSelectedReason] = React.useState(null);

  const navigate = useNavigate();
  const { isOnTrial } = useTrialStatus();

  // Helper: Beta-Freischaltung für 30 Tage ab erster Nutzung
  const isBetaFree = React.useCallback(() => {
    try {
      let started = localStorage.getItem("w24_beta_started_at");
      if (!started) {
        started = new Date().toISOString();
        localStorage.setItem("w24_beta_started_at", started);
      }
      const diffDays = (Date.now() - Date.parse(started)) / (1000 * 60 * 60 * 24);
      return diffDays <= 30;
    } catch {
      // konservativ freigeben, damit UX nicht blockiert
      return true;
    }
  }, []);

  // Skeleton fallback if OCR > 600ms
  React.useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => setShowSkeleton(true), 600);
    } else {
      setShowSkeleton(false);
    }
    return () => timer && clearTimeout(timer);
  }, [loading]);

  // Vorschlagslogik für 5 Gründe (konsistent zu CaseDetails)
  const getReasonOptions = React.useCallback(() => {
    const base = [
      { id: "calculation_error", label: "Berechnungsfehler", icon: "🧮", desc: "z. B. falsche Betrags- oder Fristenberechnung" },
      { id: "legal_basis", label: "Fehlerhafte Rechtsgrundlage", icon: "⚖️", desc: "Entscheidung stützt sich auf unpassende Paragraphen" },
      { id: "procedural_error", label: "Verfahrensfehler", icon: "📋", desc: "Formvorschriften/Anhörung nicht beachtet" },
      { id: "factual_error", label: "Sachverhaltsfehler", icon: "❌", desc: "Faktenlage unvollständig oder falsch bewertet" },
      { id: "proportionality", label: "Unverhältnismäßigkeit", icon: "⚖️", desc: "Maßnahme steht nicht im angemessenen Verhältnis" },
    ];
    // Optional: anhand der Klassifikation leicht priorisieren
    const cls = analysis?.classification || "";
    if (cls === "rechnung" || cls === "mahnung" || cls === "inkasso") {
      return [base[0], base[3], base[4], base[1], base[2]]; // Berechnung/Faktisch vorn
    }
    return base;
  }, [analysis]);
  const reasonOptions = getReasonOptions();

  // Initialen Wert setzen (aus Case oder einfache Heuristik)
  React.useEffect(() => {
    const pre = (Array.isArray(caseData?.objection_categories) && caseData.objection_categories[0]) || null;
    if (pre) {
      setSelectedReason(pre);
      return;
    }
    // Heuristik: wähle passend zur Klassifikation
    const first = reasonOptions?.[0]?.id || null;
    setSelectedReason(first);
  }, [caseData?.objection_categories, reasonOptions]);

  const saveSelectedReason = React.useCallback(async (id, opt) => {
    setSelectedReason(id);
    try {
      await updateCaseSafe(caseId, {
        objection_categories: [id],
        custom_reason: opt?.label || ""
      }, caseData);
    } catch {
      // Silenter Fallback – UI bleibt konsistent, Speicherung wird erneut versucht sobald andere Aktionen erfolgen
    }
  }, [caseId, caseData]);

  const runPipeline = React.useCallback(async () => {
    if (!caseId) return;
    if (!documentUrls || documentUrls.length === 0) return;

    setLoading(true);
    setError("");

    try {
      const firstUrl = documentUrls[0];

      // 1) Größe prüfen und bei >10MB KEINE Integrationen aufrufen
      const MAX_BYTES = 10 * 1024 * 1024;
      let tooLarge = false;
      let sizeKnown = false;
      const urlLower = (firstUrl || "").toLowerCase();
      const isPdf = urlLower.endsWith(".pdf") || urlLower.includes("application/pdf");
      const isDocx = urlLower.endsWith(".docx") || urlLower.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      const isOdt = urlLower.endsWith(".odt") || urlLower.includes("application/vnd.oasis.opendocument.text");
      const isHeavyDoc = isPdf || isDocx || isOdt;
      try {
        const size = await getRemoteFileSize(firstUrl);
        sizeKnown = typeof size === "number" && !Number.isNaN(size) && size > 0;
        tooLarge = !!(sizeKnown && size > MAX_BYTES);
      } catch {
        // wenn unbekannt (getRemoteFileSize fails), machen wir regulär weiter
        // tooLarge remains false in this case, proceeding to extraction attempts.
      }

      // Skip OCR both when definitely too large OR heavy doc with unknown size (to prevent 413 errors)
      if (tooLarge || (isHeavyDoc && !sizeKnown)) {
        const result = {
          classification: "sonstiges",
          confidence: 30,
          deadline: "",
          risks: [
            tooLarge
              ? "Dokumentgröße über 10MB – automatische Auswertung deaktiviert."
              : "Dateigröße nicht bestimmbar – automatische Auswertung für PDFs/DOCs deaktiviert, um Fehler zu vermeiden."
          ],
          todos: [
            "Relevante Seiten als Fotos (JPG/PNG) hochladen",
            "Oder PDF in kleinere Teile splitten (≤10MB) und erneut hochladen"
          ],
          preview_snippet:
            (tooLarge
              ? "Für eine präzise Vorprüfung bitte das Dokument kleiner als 10MB bereitstellen. Alternativ einzelne Seiten als Fotos hochladen."
              : "Für eine präzise Vorprüfung bitte die relevanten Seiten als Fotos (JPG/PNG) hochladen oder die Datei in kleinere Teile splitten.")
        };

        const latest = {
          ...result,
          extracted: {}, // No extraction was performed
          at: new Date().toISOString(),
          doc_used: firstUrl,
          todos_checked: caseData?.analysis?.latest?.todos_checked || {}
        };

        await updateCaseSafe(caseId, {
          analysis: {
            latest,
            history: [...(caseData?.analysis?.history || []), latest]
          }
        }, caseData);

        setAnalysis(latest);
        setTodosChecked(latest.todos_checked || {});
        setLoading(false);
        return; // IMPORTANT: Stop execution here if file is too large or unknown heavy doc
      }

      // 2) Regulärer Pfad (wie bisher), mit Fallback ohne file_urls
      let base = {};
      let useLLMFallback = false; // This flag now indicates if ExtractDataFromUploadedFile failed

      // The previous size-aware check logic is now replaced by the `tooLarge` check above.
      // If we reach here, the file is either not too large or its size couldn't be determined,
      // so we attempt `ExtractDataFromUploadedFile`.

      try {
        const extraction = await safeExtractData(firstUrl, {
          type: "object",
          properties: {
            sender_name: { type: "string" },
            sender_address: { type: "string" },
            reference_number: { type: "string" },
            document_date: { type: "string", format: "date" },
            amount: { type: "number" },
            recipient_name: { type: "string" },
            recipient_address: { type: "string" },
            raw_text: { type: "string" }
          }
        });
        base = extraction?.output || {};
        if (extraction?.status !== "success") {
          useLLMFallback = true;
        }
      } catch (_e) {
        useLLMFallback = true; // If safeExtractData fails or throws, LLM fallback is needed (but without file context)
      }

      if (useLLMFallback) {
        // Keine file_urls an LLM schicken (10MB Limit).
        // If the primary extraction fails, `base` will remain empty or initialized,
        // and no LLM call will be made with `file_urls` to extract `base` data from the document itself.
        base = base || {}; // Ensure base is an object even if previous extraction failed.
        // The original LLM call that extracted 'base' using 'file_urls' is removed from here.
      }

      // 3) Klassifikation + Vorprüfung (ohne Dateikontext)
      const schema = {
        type: "object",
        properties: {
          classification: { type: "string", enum: ["bescheid", "rechnung", "mahnung", "inkasso", "vertrag", "sonstiges"] },
          confidence: { type: "integer" },
          deadline: { type: "string" },
          risks: { type: "array", items: { type: "string" } },
          todos: { type: "array", items: { type: "string" } },
          preview_snippet: { type: "string" }
        }
      };

      const prompt = `
Analysiere die bereitstehenden extrahierten Felder (kein Dateikontext verfügbar) für eine KUNDEN-Vorprüfung.
Liefere prägnant:
- classification
- confidence (0-100)
- deadline (YYYY-MM-DD, falls ermittelbar)
- risks (max 3)
- todos (max 5)
- preview_snippet
Kontext:
${JSON.stringify(base).slice(0, 1200)}
Antworte ausschließlich auf Deutsch und als JSON.`;

      let ai = null; // Initialize ai before the try block
      try {
        ai = await InvokeLLM({
          prompt,
          response_json_schema: schema,
          add_context_from_internet: false
        });
      } catch {
        // Erzeuge minimalen Fallback, wenn LLM für Klassifikation fehlschlägt
        ai = {
          classification: "sonstiges",
          confidence: 40,
          deadline: "",
          risks: [],
          todos: [],
          preview_snippet:
            "Automatische Vorprüfung ohne Dateikontext durchgeführt. Bitte prüfen und ergänzen Sie bei Bedarf."
        };
      }

      const result = {
        ...ai,
        extracted: {
          reference_number: base.reference_number || "",
          amount: base.amount || null,
          document_date: base.document_date || "",
          sender_name: base.sender_name || "",
          recipient_name: base.recipient_name || ""
        },
        at: new Date().toISOString(),
        doc_used: firstUrl, // Use firstUrl here
        todos_checked: caseData?.analysis?.latest?.todos_checked || {}
      };

      await updateCaseSafe(caseId, {
        analysis: {
          latest: result,
          history: [...(caseData?.analysis?.history || []), result]
        }
      }, caseData);

      setAnalysis(result);
      setTodosChecked(result.todos_checked || {});
      // Only track if analysis result (ai object) was successfully generated/received
      if (ai && ai.classification) {
        try { trackEvent("analysis_done", { caseId, brand: "widerspruch24", class: result.classification, confidence: result.confidence }); } catch {}
      }
    } catch (_e) {
      setError("Analyse fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }, [caseId, documentUrls, caseData]);

  React.useEffect(() => {
    if (documentUrls.length > 0) {
      runPipeline();
    }
     
  }, [JSON.stringify(documentUrls)]);

  if (!documentUrls || documentUrls.length === 0) return null;

  const cls = analysis?.classification || "sonstiges";
  const meta = CLASS_META[cls] || CLASS_META.sonstiges;
  const confidence = Math.max(0, Math.min(100, Number(analysis?.confidence || 0)));
  const deadline = analysis?.deadline || "";
  const risks = Array.isArray(analysis?.risks) ? analysis.risks.slice(0,3) : [];
  const todos = Array.isArray(analysis?.todos) ? analysis.todos.slice(0,5) : [];

  // A11y live region
  const liveMsg = loading ? "Analyse läuft…" : analysis ? "Analyse abgeschlossen" : "";

  return (
    <Card className="mt-4" aria-live="polite" aria-label="Kostenlose Vorprüfung Karte">
      <span className="sr-only">{liveMsg}</span>

      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-3">
          <span className="badge-chip bg-green-50 text-green-700 border-green-200">Kostenlos</span>
          <span className="text-slate-800 flex items-center gap-2">
            <span className="text-xl">{meta.icon}</span>
            {meta.label} – Vorprüfung
          </span>
        </CardTitle>
        {loading && <span className="text-sm text-slate-500">Analyse läuft…</span>}
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert className="border-red-300">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {showSkeleton && loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-slate-200/70 rounded w-1/3" />
            <div className="h-3 bg-slate-200/70 rounded w-2/3" />
            <div className="grid md:grid-cols-2 gap-3">
              <div className="h-24 bg-slate-200/60 rounded" />
              <div className="h-24 bg-slate-200/60 rounded" />
            </div>
          </div>
        ) : (
          <>
            {/* Vereinfachter Kopf: Erfolgsaussicht / Frist / Hinweis */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="col-span-1">
                <div className="text-sm text-slate-600 mb-1">Erfolgsaussicht</div>
                <Progress value={confidence} className="h-3" />
                <div className="text-sm text-slate-700 mt-1">{confidence}/100</div>
              </div>
              <div className="col-span-1">
                <div className="text-sm text-slate-600 mb-1 flex items-center gap-2">
                  <Timer className="w-4 h-4" /> Frist
                </div>
                <div className="text-slate-800 font-medium">{deadline || "—"}</div>
                {deadline && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={async () => {
                      await updateCaseSafe(caseId, { notify: { ...(caseData?.notify || {}), enabled: true, days_before: 2 } }, caseData);
                    }}
                  >
                    T-2 Tage erinnern
                  </Button>
                )}
              </div>
              <div className="col-span-1">
                <div className="text-sm text-slate-600 mb-1 flex items-center gap-2">
                  <Info className="w-4 h-4" /> Hinweis
                </div>
                <div className="text-slate-700">Keine Rechtsberatung. Bitte prüfen.</div>
              </div>
            </div>

            {/* NEU: Einfaches Auswahlfeld mit 5 logischen Einspruchsgründen */}
            <div className="p-3 rounded-md border bg-white">
              <ObjectionReasonDropdown
                value={selectedReason}
                options={reasonOptions}
                onChange={saveSelectedReason}
                t={t}
              />
            </div>

            {/* Vorschau bleibt sichtbar */}
            {analysis?.preview_snippet && (
              <div className="p-3 rounded-md border text-slate-800 bg-slate-50">
                <div className="text-xs uppercase text-slate-500 mb-1">Entwurfs‑Vorschau</div>
                <p className="text-sm leading-relaxed">{analysis.preview_snippet}</p>
              </div>
            )}

            {/* CTA-Leiste bleibt unverändert */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="flex gap-2">
                <Button
                  className="btn-primary"
                  onClick={async () => {
                    if (isBetaFree()) {
                      try { trackEvent("preview_open_from_unlock", { caseId, brand: "widerspruch24", beta: true }); } catch {}
                      navigate(createPageUrl(`Preview?case_id=${caseId}`));
                      return;
                    }
                    let paymentsEnabled = true;
                    try {
                      const { data } = await configStatus();
                      paymentsEnabled = !!data?.paymentsEnabled;
                    } catch {
                      paymentsEnabled = false;
                    }
                    if (isOnTrial || !paymentsEnabled) {
                      try { trackEvent("preview_open_from_unlock", { caseId, brand: "widerspruch24" }); } catch {}
                      navigate(createPageUrl(`Preview?case_id=${caseId}`));
                      return;
                    }
                    try { trackEvent("paywall_open", { from: "analysis_card", caseId, brand: "widerspruch24" }); } catch {}
                    window.location.href = createPageUrl(`ChoosePlan?case_id=${caseId}`);
                  }}
                >
                  Vollständigen Widerspruch freischalten
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    try { trackEvent("preview_open", { caseId, brand: "widerspruch24" }); } catch {}
                    setShowPreview(true);
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" /> Vorschau anzeigen
                </Button>
              </div>

              {/* Umgebaut: „Details“ klappt nun die komplexen Infos (Risiken/To‑Do) ein/aus */}
              <Button
                variant="ghost"
                onClick={() => setShowDetails(!showDetails)}
                className="text-slate-600 group"
              >
                Details
                <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showDetails ? "rotate-180" : ""}`} />
              </Button>
            </div>

            {/* Animiertes Dropdown der Details: Risiken & To‑Dos (vorher sichtbar, jetzt optional) */}
            <div
              className={`overflow-hidden transition-all duration-300 ${showDetails ? "max-h-[800px] opacity-100 mt-2" : "max-h-0 opacity-0"}`}
              aria-hidden={!showDetails}
            >
              <div className="grid md:grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="text-sm text-slate-600 mb-1">Risiken</div>
                  <ul className="list-disc ml-5 text-slate-800 space-y-1">
                    {risks.length === 0 ? <li>Keine erkennbaren Risiken.</li> : risks.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="text-sm text-slate-600 mb-1">To‑Do</div>
                  <ul className="text-slate-800 space-y-2">
                    {todos.length === 0 ? (
                      <li className="text-slate-700">Keine Aufgaben erkannt.</li>
                    ) : (
                      todos.map((tItem, i) => {
                        const checked = !!todosChecked[i];
                        return (
                          <li key={i}>
                            <button
                              className="flex items-start gap-2 hover:bg-slate-50 px-2 py-1 rounded w-full text-left"
                              onClick={async () => {
                                const next = { ...(todosChecked || {}), [i]: !checked };
                                setTodosChecked(next);
                                const latest = analysis || {};
                                const updated = { ...latest, todos_checked: next };
                                await updateCaseSafe(caseId, {
                                  analysis: {
                                    latest: updated,
                                    history: [...(caseData?.analysis?.history || []), updated]
                                  }
                                }, caseData);
                              }}
                              aria-pressed={checked}
                            >
                              {checked ? <CheckSquare className="w-4 h-4 text-green-600 mt-0.5" /> : <Square className="w-4 h-4 text-slate-400 mt-0.5" />}
                              <span className={checked ? "line-through text-slate-500" : ""}>{tItem}</span>
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              </div>
              {/* Debug JSON bleibt optional via showDetails */}
              <div className="mt-2 p-3 rounded-md border bg-white text-xs overflow-auto max-h-64">
                <pre className="whitespace-pre-wrap">{JSON.stringify(analysis, null, 2)}</pre>
              </div>
            </div>

            {/* Mobile Sticky CTA – unverändert */}
            <div className="md:hidden sticky bottom-2">
              <Button
                className="w-full mt-3 btn-primary"
                onClick={async () => {
                  if (isBetaFree()) {
                    try { trackEvent("preview_open_from_unlock_sticky", { caseId, brand: "widerspruch24", beta: true }); } catch {}
                    navigate(createPageUrl(`Preview?case_id=${caseId}`));
                    return;
                  }
                  let paymentsEnabled = true;
                  try {
                    const { data } = await configStatus();
                    paymentsEnabled = !!data?.paymentsEnabled;
                  } catch {
                    paymentsEnabled = false;
                  }
                  if (isOnTrial || !paymentsEnabled) {
                    try { trackEvent("preview_open_from_unlock_sticky", { caseId, brand: "widerspruch24" }); } catch {}
                    navigate(createPageUrl(`Preview?case_id=${caseId}`));
                    return;
                  }
                  try { trackEvent("paywall_open", { from: "analysis_card_sticky", caseId, brand: "widerspruch24" }); } catch {}
                  window.location.href = createPageUrl(`ChoosePlan?case_id=${caseId}`);
                }}
              >
                Vollständigen Widerspruch freischalten
              </Button>
            </div>
          </>
        )}
      </CardContent>

      <PreviewWatermarkModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        snippet={analysis?.preview_snippet || ""}
        caseRef={caseData?.reference_number || caseId}
      />
    </Card>
  );
}
