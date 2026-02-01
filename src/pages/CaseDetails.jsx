import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, ArrowLeft, Upload, Loader2, FileText, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import MicrophoneInput from "@/components/MicrophoneInput";
import { useLocalization } from "@/components/hooks/useLocalization";
import { UploadFile, InvokeLLM } from "@/integrations/Core";
import { useGuestSession } from '@/components/hooks/useGuestSession';
import { Badge } from "@/components/ui/badge";
import CaseLettersDialog from "@/components/CaseLettersDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { callWithRetry } from "@/components/lib/network";
import { getRemoteFileSize } from "@/components/lib/files";
import RecipientFinder from "@/components/RecipientFinder";
import DeadlineCalculator from "@/components/DeadlineCalculator";
import { base44 } from "@/api/base44Client";
import CarProgressOverlay from "@/components/CarProgressOverlay";
import { splitAndExtractPdf } from "@/functions/splitAndExtractPdf";
const AdditionalDocumentsLazy = React.lazy(() => import("../components/AdditionalDocuments"));
import DocumentActions from "@/components/DocumentActions";
import { trackEvent } from "@/components/lib/analytics";
import SuggestionBanner from "@/components/SuggestionBanner";
import { classifyContent } from "@/components/lib/classifier";
import { updateCaseSafe, fetchCaseById, getCachedCase } from "@/components/lib/caseUtils";
import { useFormTelemetry } from "@/components/hooks/useFormTelemetry";

export default function CaseDetails() {
  const { t, language } = useLocalization();
  const navigate = useNavigate();
  const { guestSession, isGuest, isLoading: guestLoading } = useGuestSession(language);

  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('case_id');

  const [caseData, setCaseData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  // Detaillierte Eingabefelder
  const [objectionDetails, setObjectionDetails] = useState({
    main_objection_reason: '',
    detailed_reasoning: '',
    requested_outcome: '',
    supporting_documents: []
  });

  // Vorschlags-Logik für das Begründungsfeld
  const [suggestedReason, setSuggestedReason] = useState("");
  const [isSuggestionActive, setIsSuggestionActive] = useState(false);
  const [suggestionInjected, setSuggestionInjected] = useState(false);

  // NEU: State for the letters dialog
  const [showLettersDialog, setShowLettersDialog] = useState(false);

  // NEW: State for active tab and generated text
  const [activeTab, setActiveTab] = useState("overview");
  const [generatedText, setGeneratedText] = useState("");
  // NEW: Generation overlay + progress
  const [genVisible, setGenVisible] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genStep, setGenStep] = useState("idle");
  const [genError, setGenError] = useState("");
  const [suggestion, setSuggestion] = useState(null);
  const [classified, setClassified] = useState(false);

  const formT = useFormTelemetry(`case_${caseId || "new"}`, ["main_objection_reason", "detailed_reasoning", "requested_outcome"]);

  // Schnellstart: sofort aus Cache befüllen, falls vorhanden
  useEffect(() => {
    if (!caseId) return;
    const cached = getCachedCase(caseId);
    if (cached && !caseData) {
      setCaseData(cached);
    }
  }, [caseId, caseData]);

  // Erzeuge fallabhängigen Vorschlag (regelbasierter Fallback)
  const buildSuggestedReason = (c) => {
    if (!c) return "";
    const cls = c?.analysis?.latest?.classification || "";
    const hasAmount = !!c?.amount;
    const ref = c?.reference_number ? ` (Aktenzeichen ${c.reference_number})` : "";
    const date = c?.document_date ? ` vom ${c.document_date}` : "";
    const name = c?.sender_name ? ` bei ${c.sender_name}` : "";

    // Rechnung/Preis
    if (hasAmount || /rechnung|invoice/i.test(cls)) {
      return `Ist der berechnete Preis zu hoch oder fehlerhaft? Bitte prüfen Sie die Positionen und die Berechnung der Rechnung${date}${ref}${name}.`;
    }
    // Mahnung/Inkasso
    if (/mahnung|inkasso/i.test(cls)) {
      return `Sind die geltend gemachten Forderungen berechtigt und korrekt berechnet? Bitte prüfen Sie Beträge, Fristen und den zugrunde liegenden Vertrag${ref}.`;
    }
    // Verwaltungs-/Behördenbescheid
    if (/bescheid/i.test(cls)) {
      return `Ist die Entscheidung sachlich nachvollziehbar und korrekt? Wurden alle relevanten Tatsachen berücksichtigt${ref}?`;
    }
    // Fristen-Thema
    if (c?.deadline || c?.document_date) {
      return `Wurden die Fristen korrekt berechnet? Bitte bestätigen Sie die maßgebliche Frist und die rechtzeitige Einlegung des Widerspruchs${ref}.`;
    }
    // Fallback
    return `Ist die Entscheidung nachvollziehbar und korrekt? Bitte erläutern Sie die Grundlage und korrigieren Sie ggf. Fehler${ref}.`;
  };

  const loadCase = useCallback(async () => {
    try {
      let currentCase = null;

      // Kurzer Retry für robustes Laden
      const fetchWithRetry = async () => {
        try {
          return await fetchCaseById(caseId);
        } catch {
          // mini delay und zweiter Versuch
          await new Promise((r) => setTimeout(r, 250));
          return await fetchCaseById(caseId);
        }
      };

      // Use safe helper to avoid 404s from Case.get
      if (caseId) {
        currentCase = await fetchWithRetry();
      }

      if (!currentCase) {
        setError("Fall nicht gefunden oder kein Zugriff.");
        return;
      }

      // Check ownership for guests
      if (isGuest && guestSession && currentCase.guest_session_id !== guestSession.id) {
        setError("Zugriff verweigert.");
        return;
      }

      setCaseData(currentCase);

      // Pre-fill with scanned and analyzed content
      if (currentCase.custom_reason) {
        setObjectionDetails(prev => ({
          ...prev,
          main_objection_reason: currentCase.custom_reason
        }));
      }
    } catch (err) {
      console.error("Error loading case:", err);
      setError("Fehler beim Laden des Falls.");
    }
  }, [caseId, isGuest, guestSession]);

  useEffect(() => {
    if (caseId) {
      loadCase();
    } else {
      setError("Kein Fall gefunden.");
    }
  }, [caseId, loadCase]);

  useEffect(() => {
    if (caseId) {
      try { trackEvent('case_open', { caseId, brand: 'widerspruch24' }); } catch {}
    }
  }, [caseId]);

  useEffect(() => {
    if (caseData?.generated_text) setGeneratedText(caseData.generated_text);
  }, [caseData]);

  // AI classification for suggesting the best process/template
  useEffect(() => {
    (async () => {
      if (!caseData || classified) return;
      try {
        const text =
          (caseData.objection_details?.detailed_reasoning) ||
          caseData.custom_reason ||
          caseData.generated_text ||
          "";
        if (!text || text.length < 30) { setClassified(true); return; }
        const res = await classifyContent({ text, language });
        if (res && res.suggested_process) setSuggestion(res);
      } catch (_e) {
        // ignore classification errors
      } finally {
        setClassified(true);
      }
    })();
  }, [caseData, classified, language]);

  // KI‑Vorschlag erzeugen und nur setzen, wenn Feld leer/Platzhalter
  useEffect(() => {
    if (!caseData || suggestionInjected) return;

    const current = (objectionDetails?.main_objection_reason || "").trim();
    // Prüfen, ob der aktuelle Text leer ist oder einem bekannten Platzhaltertext ähnelt
    const looksLikePlaceholder = /Automatische Analyse|ohne Dateikontext/i.test(current);

    if (!current || looksLikePlaceholder) {
      (async () => {
        let s = "";
        try {
          const schema = { type: "object", properties: { suggestion: { type: "string" } } };
          const ctx = [
            caseData.sender_name ? `Absender: ${caseData.sender_name}` : null,
            caseData.reference_number ? `Aktenzeichen: ${caseData.reference_number}` : null,
            caseData.document_date ? `Datum: ${caseData.document_date}` : null,
            caseData.amount ? `Betrag: ${caseData.amount} €` : null,
            caseData.analysis?.latest?.preview_snippet ? `Hinweis: ${caseData.analysis.latest.preview_snippet}` : null
          ].filter(Boolean).join(" | ");

          const prompt = `Formuliere exakt EINE kurze Leitfrage (max. 18 Wörter) als realistische Ansatzfrage für einen Widerspruch.
Sie soll konkret und prüfbar sein, z. B. "Ist der berechnete Preis zu hoch?" oder "Wurde die Frist korrekt berechnet?".
Kontext: ${ctx || "—"}
Antworte ausschließlich als JSON mit {"suggestion": "Frage?"}.`;

          const res = await InvokeLLM({ prompt, response_json_schema: schema });
          if (res && typeof res === "object" && typeof res.suggestion === "string") {
            s = res.suggestion.trim();
          }
        } catch (e) {
          console.warn("LLM suggestion failed, falling back to rule-based:", e);
          // LLM kann ausfallen – dann Fallback verwenden
        }

        if (!s) s = buildSuggestedReason(caseData);

        if (s) {
          setSuggestedReason(s);
          setObjectionDetails((prev) => ({ ...prev, main_objection_reason: s }));
          setIsSuggestionActive(true);
          setSuggestionInjected(true);
        }
      })();
    }
     
  }, [caseData, suggestionInjected, objectionDetails?.main_objection_reason]); // Added objectionDetails.main_objection_reason to trigger check if it's cleared

  const handleInputChange = (field, value) => {
    setObjectionDetails(prev => ({
      ...prev,
      [field]: value
    }));
    formT.mark({ field, stage: "input_ok", ok: true });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError('');

    try {
      const { file_url } = await callWithRetry(() => UploadFile({ file }), 2, 700);

      const isTextLikely =
        (file.type && file.type.toLowerCase().startsWith('text/')) ||
        /\.(txt|md|csv|eml|msg)$/i.test(file.name);
      const isPdfType = (file.type && file.type.toLowerCase().includes('application/pdf')) || /\.pdf$/i.test(file.name);

      let sizeBytes = null;
      try { sizeBytes = await getRemoteFileSize(file_url); } catch {}
      const tooLarge = typeof sizeBytes === 'number' && sizeBytes > (10 * 1024 * 1024);

      let analysisSummary = '';

      if (isTextLikely) {
        // Reinen Text lokal lesen (keine file_urls nötig)
        const textContent = await (await fetch(file_url)).text();
        const snippet = textContent.slice(0, 8000);
        const prompt = `Das folgende TEXT-Dokument wurde als zusätzlicher Beleg hochgeladen. Analysiere den Inhalt und fasse die relevantesten Informationen, die den Widerspruch unterstützen, in einem kurzen Absatz zusammen.
Bisheriger Hauptgrund: "${objectionDetails.main_objection_reason || '—'}".
Antworte ausschließlich auf Deutsch, nur mit dem zusammengefassten Text, ohne Einleitung oder Disclaimer.

TEXT:
"""${snippet}"""`;
        analysisSummary = await InvokeLLM({ prompt });
      } else if (tooLarge) {
        // Sicherer Guard: keine LLM-Dateianalyse bei >10MB
        analysisSummary = 'Das Dokument überschreitet das 10MB-Limit für die automatische Analyse. Bitte laden Sie relevante Seiten als Fotos (JPG/PNG) oder eine kleinere PDF hoch.';
      } else if (isPdfType) {
        // PDF: zuerst Backend-Extraktion versuchen (ohne file_urls), dann mit LLM zusammenfassen
        try {
          const schema = { type: 'object', properties: { sender_name: { type: 'string' }, reference_number: { type: 'string' }, amount: { type: 'number' }, document_date: { type: 'string' } } };
          const res = await splitAndExtractPdf({ file_url, json_schema: schema, pages_per_chunk: 8 });
          const merged = res?.data?.output;
          if (merged && typeof merged === 'object') {
            const prompt = `Fasse die wichtigsten Punkte dieses PDF-Belegs in 3–5 Sätzen auf Deutsch zusammen. Nutze diese extrahierten Felder als Kontext (falls vorhanden): ${JSON.stringify(merged).slice(0, 3500)}. Antworte nur mit dem Text.`;
            const out = await InvokeLLM({ prompt });
            analysisSummary = typeof out === 'string' ? out : (out?.text || '');
          }
        } catch (_e) {
          // Fallback: kleine PDFs direkt an LLM schicken
          const prompt = `Das folgende Dokument wurde als zusätzlicher Beleg hochgeladen. Bitte analysiere es und fasse die relevantesten Informationen, die den Widerspruch unterstützen, in einem kurzen Absatz zusammen. Der bisherige Hauptgrund des Widerspruchs lautet: "${objectionDetails.main_objection_reason || '—'}". Antworte ausschließlich auf Deutsch und nur mit dem zusammengefassten Text.`;
          analysisSummary = await InvokeLLM({ prompt, file_urls: [file_url] });
        }
      } else {
        // Bilder/andere kleine Dateien: direkte LLM-Analyse mit Datei
        const prompt = `Das folgende Dokument wurde als zusätzlicher Beleg hochgeladen. Bitte analysiere es und fasse die relevantesten Informationen, die den Widerspruch unterstützen, in einem kurzen Absatz zusammen. Der bisherige Hauptgrund des Widerspruchs lautet: "${objectionDetails.main_objection_reason || '—'}". Antworte ausschließlich auf Deutsch und nur mit dem zusammengefassten Text.`;
        analysisSummary = await InvokeLLM({ prompt, file_urls: [file_url] });
      }

      setObjectionDetails(prev => ({
        ...prev,
        detailed_reasoning:
          (prev.detailed_reasoning || '') +
          `\n\n--- Zusammenfassung aus Beleg: ${file.name} ---\n${analysisSummary}`,
        supporting_documents: [
          ...(prev.supporting_documents || []),
          { name: file.name, url: file_url, type: file.type }
        ]
      }));
    } catch (err) {
      console.error('Upload/Analyse fehlgeschlagen:', err);
      setError('Upload oder Analyse fehlgeschlagen. Bitte erneut versuchen.');
      const f = e.target.files?.[0];
      if (f) {
        setObjectionDetails(prev => ({
          ...prev,
          supporting_documents: [
            ...(prev.supporting_documents || []),
            { name: f.name, url: undefined, type: f.type }
          ]
        }));
      }
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError("");
    setGenVisible(true);
    setGenError("");
    setGenStep("analyzing");
    setGenProgress(10);

    formT.mark({ field: "form", stage: "validate_ok", ok: !!objectionDetails.main_objection_reason });

    try {
      // Basisdaten speichern
      const updatedData = {
        ...caseData,
        objection_details: objectionDetails,
        status: "detailed"
      };

      // 1) Speichere Details
      setGenProgress(20);
      await updateCaseSafe(caseId, updatedData, caseData);

      // 2) Brief generieren (DIN 5008, freundlich‑bestimmt, rechtlich fundiert)
      setGenStep("drafting");
      setGenProgress(40);
      const payload = {
        caseId,
        objection_details: objectionDetails,
        format: "DIN5008",
        tone: "freundlich_bestimmt_rechtlich"
      };
      let genRes = null;
      try {
        genRes = await callWithRetry(() => base44.functions.invoke("generateLetter", payload), 1, 500);
      } catch (e) {
        console.warn("Primary letter generation failed, falling back to LLM", e);
        // continue to LLM fallback
      }
      const letterText = genRes?.data?.text || genRes?.data?.letter || genRes?.data?.content || genRes?.data?.generated_text || "";

      let finalText = letterText;
      if (!finalText) {
        // Fallback über integrierte LLM-API (ohne externe Secrets)
        const userReason = objectionDetails?.main_objection_reason || "";
        const detail = objectionDetails?.detailed_reasoning || "";
        const requested = objectionDetails?.requested_outcome || "";
        const header = [
          caseData?.sender_name ? `Behörde/Firma: ${caseData.sender_name}` : null,
          caseData?.reference_number ? `Aktenzeichen/Referenz: ${caseData.reference_number}` : null,
          caseData?.document_date ? `Datum des Bescheids/Schreibens: ${caseData.document_date}` : null,
          caseData?.amount ? `Betrag: ${caseData.amount} €` : null
        ].filter(Boolean).join(" | ");
        const prompt = `
        Rolle & Perspektive: Ich-Form des Absenders (selbst handelnd). Keine Hinweise auf Anwälte/Kanzlei/Vertretung, keine Plattform-/KI-/Tool-Bezüge.
        Ziel: gerichtsfestes, lückenlos begründetes Widerspruchs-/Abwehrschreiben in nüchternem, präzisem Stil.
        Kontext: ${header || "—"}
        Meine Begründung (aufgreifen, straffen): """${userReason}"""
        Weitere Details/Belege: """${detail}"""
        Gewünschtes Ergebnis: """${requested}"""

        Arbeitsgrundsatz:
        - Keine Ergänzung/Erfindung von Tatsachen.
        - Unklare/fehlende Angaben nur juristisch bewerten (Beweislast/Indizien), ohne dies im Schreiben auszubreiten.

        Struktur (reiner Fließtext, keine Markdown-Syntax):
        1) Sachverhalt (kurz, geordnet, mit Aktenzeichen/Datum).
        2) Rechtliche Würdigung mit präzisen Normzitaten (z.B. § 280 Abs. 1, § 241 Abs. 2, § 249, § 254, § 823, § 831 BGB – nur soweit einschlägig) und ggf. technische Normen (DIN/Regelwerke) mit rechtlicher Einordnung.
        3) Anspruchsprüfung: Tatbestandsmerkmale → Subsumtion → Ergebnis (warum Anspruch besteht oder scheitert).
        4) Antizipierte Gegenargumente (Mitverschulden, Pflichtenkreise, Kausalität etc.) und Entkräftung mit Quellen.
        5) Ergebnis/Rechtsfolge und konkreter Antrag mit Frist (14 Tage ab heute, Datum nennen; Rechtsfolgenhinweis).
        6) Quellenliste „Stand: ${new Date().toLocaleDateString('de-DE')}“ mit belastbaren Fundstellen (Gesetze/Urteile) inkl. Kurz-Links.

        Verbote:
        - Keine Formulierungen wie „in anwaltlicher Vertretung“, „als Ihr Rechtsanwalt“, „unsere Kanzlei“, „wir vertreten“ etc.
        - Keine Plattform-/KI-/Tool-Hinweise.

        Anforderungen:
        - Subsumtion statt Behauptung; Aktualität der Rechtslage beachten.
        - Länge: 380–700 Wörter.
        Ausgabe: nur der Fließtext (Deutsch).`;
        setGenProgress(65);
        const llmText = await InvokeLLM({ prompt });
        finalText = typeof llmText === "string" ? llmText : (llmText?.text || "");
      }

      if (!finalText || String(finalText).trim().length < 40) {
        throw new Error("Die Briefgenerierung hat keinen verwertbaren Text geliefert.");
      }

      setGenProgress(85);
      await updateCaseSafe(caseId, { generated_text: finalText }, caseData);
      setGeneratedText(finalText);

      formT.mark({ field: "form", stage: "persist_ok", ok: true });

      // 3) Beta-abhängiger Vorschau-Zugriff
      const isBetaFree = (() => {
        try {
          let started = localStorage.getItem("w24_beta_started_at");
          if (!started) return true;
          const diffDays = (Date.now() - Date.parse(started)) / (1000 * 60 * 60 * 24);
          return diffDays <= 30;
        } catch {
          return true;
        }
      })();
      const progressVal = isBetaFree ? 100 : 75;

      sessionStorage.setItem(`scan_progress_${caseId}`, JSON.stringify({
        progress: progressVal,
        timestamp: Date.now(),
        step: "details_completed"
      }));

      setGenProgress(100);
      setGenStep("done");
      // 4) Direkt zur bearbeitbaren Vorschau
      navigate(createPageUrl(`Preview?case_id=${caseId}`));
    } catch (err) {
      formT.mark({ field: "form", stage: "persist_ok", ok: false, code: "save_failed", extra: String(err) });
      setError("Fehler beim Speichern/Generieren des Schreibens.");
      setGenError(String(err?.message || err) || "Unbekannter Fehler bei der Briefgenerierung.");
    } finally {
      setIsSubmitting(false);
      // Overlay bleibt bei Fehler offen, bei Erfolg schließt es sich nach Navigation automatisch durch Seitenwechsel
    }
  };

  // Add handler to save deadline
  const saveDeadline = async (dateStr) => {
    if (!caseId || !caseData) return;
    try {
      const patch = { deadline: dateStr, deadline_source: "manual" };
      await updateCaseSafe(caseId, patch, caseData);
      setCaseData(prev => ({ ...prev, ...patch }));
    } catch (e) {
      console.error("deadline save failed", e);
    }
  };

  // Beim Fokussieren Vorschlag leeren
  const handleMainReasonFocus = () => {
    if (isSuggestionActive && objectionDetails.main_objection_reason === suggestedReason) {
      setObjectionDetails((prev) => ({ ...prev, main_objection_reason: "" }));
    }
    setIsSuggestionActive(false); // Always deactivate suggestion on focus
  };

  if (guestLoading || !caseId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-16">
        <div className="glass rounded-3xl p-8 text-white text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          <div>{guestLoading ? 'Gast-Sitzung wird initialisiert…' : 'Kein Fall gefunden.'}</div>
          {!guestLoading && (
            <div className="pt-2">
              <Button variant="outline" className="glass border-white/30 text-white hover:bg-white/10" onClick={() => navigate(createPageUrl('Scanner'))}>
                Zurück zum Scanner
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-16">
        <div className="glass rounded-3xl p-8 text-white text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          <div>Fall-Details werden geladen…</div>
          {error && (
            <div className="text-red-300 text-sm">{error}</div>
          )}
          <div className="pt-2">
            <Button variant="outline" className="glass border-white/30 text-white hover:bg-white/10" onClick={loadCase}>
              Erneut laden
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-5xl mx-auto">
        <CarProgressOverlay
          isVisible={genVisible}
          currentStep={genStep}
          progress={genProgress}
          error={genError}
          retryCount={0}
          onCancel={() => { setGenVisible(false); setIsSubmitting(false); }}
          onComplete={() => setGenVisible(false)}
          onRetry={() => { setGenError(""); handleSubmit(); }}
          t={t}
        />
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button
              onClick={() => navigate(createPageUrl(`Scanner?case_id=${caseId}`))}
              variant="ghost"
              className="glass rounded-xl text-white mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2"/>
              Zurück zum Scanner
            </Button>
            <div>
              <h1 className="text-4xl font-bold text-white">Widerspruchs-Details</h1>
              <p className="text-white/80">Vervollständigen Sie Ihren Fall für eine optimale KI-Analyse</p>
            </div>
          </div>

          {/* Actions rechts */}
          <div className="hidden md:flex gap-2">
            <Button
              variant="outline"
              className="glass text-white border-white/30 hover:bg-white/10"
              onClick={() => navigate(createPageUrl('Dashboard'))}
            >
              Zurück zum Dashboard
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="glass rounded-2xl p-2 mb-6" role="tablist" aria-label="Fallfunktionen">
          <Tabs value={activeTab} onValueChange={(v)=>{ setActiveTab(v); if(v==='letters'){ try{trackEvent('generator_open',{caseId,brand:'widerspruch24'})}catch{}} }} className="w-full">
            <TabsList className="glass flex flex-wrap">
              <TabsTrigger value="overview">Übersicht</TabsTrigger>
              <TabsTrigger value="documents">Dokumente</TabsTrigger>

              <TabsTrigger value="letters">Schreiben</TabsTrigger>
              <TabsTrigger value="export">Versand & Export</TabsTrigger>
              <TabsTrigger value="protocol">Protokoll</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              {error && (
                <Alert className="glass border-red-500/50 mb-8">
                  <AlertDescription className="text-white">{error}</AlertDescription>
                </Alert>
              )}

              {/* KI-Vorschlag für passenden Prozess */}
              {suggestion && suggestion.suggested_process === 'schreiben' && (
                <SuggestionBanner
                  suggestion={suggestion}
                  onAccept={() => {
                    const type = suggestion.type || 'schreiben';
                    const tpl = suggestion.suggested_template_key || '';
                    navigate(createPageUrl(`Schreiben?process=${encodeURIComponent(type)}${tpl ? `&template=${encodeURIComponent(tpl)}` : ''}&case_id=${encodeURIComponent(caseId || caseData?.id || '')}`));
                  }}
                  onDismiss={() => setSuggestion(null)}
                  t={t}
                />
              )}

              {/* Gescannte Daten bestätigen */}
              <Card className="glass rounded-3xl mb-8">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Gescannte Dokumentdaten
                    </span>
                    {caseData.case_number && <Badge variant="secondary" className="glass">{caseData.case_number}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white/80">Absender</Label>
                      <div className="text-white font-medium">{caseData.sender_name}</div>
                    </div>
                    <div>
                      <Label className="text-white/80">Aktenzeichen</Label>
                      <div className="text-white font-medium">{caseData.reference_number}</div>
                    </div>
                    <div>
                      <Label className="text-white/80">Datum</Label>
                      <div className="text-white font-medium">{caseData.document_date}</div>
                    </div>
                    {caseData.amount && (
                      <div>
                        <Label className="text-white/80">Betrag</Label>
                        <div className="text-white font-medium">{caseData.amount} €</div>
                      </div>
                    )}
                  </div>
                  {caseData.sender_address && (
                    <div className="pt-4 border-t border-white/10">
                      <Label className="text-white/80">Adresse des Absenders</Label>
                      <div className="text-white font-medium whitespace-pre-wrap">{caseData.sender_address}</div>
                    </div>
                  )}

                  {/* Empfänger-Finder */}
                  <div className="pt-6 border-t border-white/10">
                    <RecipientFinder
                      onPick={async (it) => {
                        const address = (it.address_lines || []).join("\n");
                        const patch = {
                          sender_name: it.name,
                          sender_address: address,
                          notify: {
                            ...(caseData.notify || {}),
                            recipients: {
                              ...(caseData.notify?.recipients || {}),
                              opponent: {
                                ...(caseData.notify?.recipients?.opponent || {}),
                                email: it.email || ""
                              }
                            }
                          }
                        };
                        await updateCaseSafe(caseId, patch, caseData);
                        setCaseData((prev) => ({ ...prev, ...patch }));
                      }}
                    />
                    <p className="text-xs text-white/60 mt-2">
                      Tipp: Auswahl übernimmt Name, Adresse und – falls vorhanden – die E‑Mail der Gegenseite.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Detaillierte Eingaben */}
              <div className="grid grid-cols-1 gap-8 mb-8">
                <Card className="glass rounded-3xl">
                  <CardHeader>
                    <CardTitle className="text-white">Ihre Begründung</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label htmlFor="main_objection" className="text-white mb-2 block">
                        Warum widersprechen Sie? (bitte in Ihren Worten, gern mit 1 Leitfrage) *
                      </Label>
                      <Textarea
                        id="main_objection"
                        value={objectionDetails.main_objection_reason}
                        onFocus={handleMainReasonFocus}
                        onChange={(e) => {
                          // Beim ersten Tipp automatisch Vorschlag entfernen
                          if (isSuggestionActive) {
                            setIsSuggestionActive(false);
                            // Falls der Text noch exakt dem Vorschlag entspricht, ersetze durch Eingabe
                            // Andernfalls, wenn der Nutzer bereits tippt und der Vorschlag noch aktiv ist (z.B. durch focus-out),
                            // ersetze den Vorschlag mit dem getippten Wert.
                            const v = e.target.value;
                            setObjectionDetails((prev) => ({ ...prev, main_objection_reason: v }));
                          } else {
                            setObjectionDetails((prev) => ({ ...prev, main_objection_reason: e.target.value }));
                          }
                          formT.mark({ field: "main_objection_reason", stage: "input_ok", ok: true });
                        }}
                        className="glass border-white/30 text-white placeholder-white/60 h-32"
                        placeholder="Beschreiben Sie kurz Ihr Anliegen – und stellen Sie eine Leitfrage (z. B. „Ist der Preis zu hoch?“)…"
                        required
                      />
                      <MicrophoneInput
                        onTranscript={(transcript) => {
                          // Mikrofon-Eingabe überschreibt den Vorschlag oder fügt an bestehenden Text an
                          const base = isSuggestionActive || objectionDetails.main_objection_reason === suggestedReason
                            ? "" // Wenn Vorschlag aktiv ist oder aktueller Text exakt der Vorschlag ist, leere
                            : (objectionDetails.main_objection_reason || ""); // Sonst behalte den aktuellen Text bei
                          const sep = base ? " " : "";
                          setIsSuggestionActive(false);
                          handleInputChange('main_objection_reason', base + sep + transcript);
                        }}
                        t={t}
                        language={language}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="detailed_reasoning" className="text-white mb-2 block">
                        Ergänzende Details/Belege (optional)
                      </Label>
                      <Textarea
                        id="detailed_reasoning"
                        value={objectionDetails.detailed_reasoning}
                        onChange={(e) => handleInputChange('detailed_reasoning', e.target.value)}
                        className="glass border-white/30 text-white placeholder-white/60 h-32"
                        placeholder="Weitere Hinweise, Zahlen, Daten, konkrete Stellen im Bescheid/Rechnung – oder laden Sie Belege hoch, deren Kern automatisch hier ergänzt wird…"
                      />
                    </div>

                    <div>
                      <Label htmlFor="requested_outcome" className="text-white mb-2 block">
                        Gewünschtes Ergebnis
                      </Label>
                      <Textarea
                        id="requested_outcome"
                        value={objectionDetails.requested_outcome}
                        onChange={(e) => handleInputChange('requested_outcome', e.target.value)}
                        className="glass border-white/30 text-white placeholder-white/60 h-24"
                        placeholder="Was soll die Gegenseite konkret tun? z. B. 'Aufhebung/Neuberechnung', 'Rückerstattung', 'Begründung nachreichen'…"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Zusätzliche Dokumente */}
              <Card className="glass rounded-3xl mb-8">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Zusätzliche Belege hochladen & analysieren lassen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      id="supporting-docs"
                      disabled={isUploading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="glass border-white/30 text-white hover:bg-white/10"
                      onClick={() => document.getElementById('supporting-docs')?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analysiere...</>
                      ) : (
                        <><Upload className="w-4 h-4 mr-2" /> Dokument hinzufügen</>
                      )}
                    </Button>

                    {objectionDetails.supporting_documents.length > 0 && (
                      <div className="space-y-2 pt-4 border-t border-white/10">
                        <Label className="text-white/80">Hochgeladene Dokumente:</Label>
                        {objectionDetails.supporting_documents.map((doc, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-white/80">
                            <FileText className="w-4 h-4" />
                            <span>{doc.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Fristenrechner */}
              <div className="glass rounded-3xl p-6 mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white text-xl font-semibold">Frist berechnen</h3>
                  <div className="text-white/60 text-sm">Standard: 14 Tage, Wochenende → nächster Werktag</div>
                </div>
                <DeadlineCalculator
                  baseDate={caseData?.document_date || new Date().toISOString().slice(0,10)}
                  defaultDays={14}
                  onPick={saveDeadline}
                />
                {caseData?.deadline && (
                  <div className="text-white/70 text-sm mt-3">Aktuelle Frist: <span className="text-white font-medium">{caseData.deadline}</span></div>
                )}
              </div>

              {/* Submit Button */}
              <div className="text-center">
                <Button
                  onClick={handleSubmit}
                  className="glass text-white border-white/30 hover:glow transition-all duration-300 text-lg px-12 py-6 rounded-2xl"
                  disabled={isSubmitting || !objectionDetails.main_objection_reason}
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Erstelle anwaltlichen Widerspruch...</>
                  ) : (
                    <><ArrowRight className="w-5 h-5 mr-2" />Anwaltlichen Widerspruch generieren</>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              <Suspense fallback={<div className="glass rounded-2xl p-4 text-white/80">Lade Dokumente…</div>}>
                <AdditionalDocumentsLazy
                  t={t}
                  caseData={caseData}
                  existingDocuments={caseData?.additional_documents || []}
                  onDocumentsAdded={async (docs) => {
                    await updateCaseSafe(caseId, { additional_documents: docs }, caseData);
                    setCaseData(prev => ({...prev, additional_documents: docs}));
                    try { trackEvent('upload_success', { type: 'additional', caseId, brand: 'widerspruch24' }); } catch {}
                  }}
                />
              </Suspense>
            </TabsContent>



            <TabsContent value="letters" className="mt-4">
              <div className="flex gap-2 mb-4">
                <Link to={createPageUrl(`Schreiben?step=1&case_id=${caseId}`)}>
                  <Button className="glass text-white border-white/30 hover:glow">
                    <Plus className="w-4 h-4 mr-2" /> Antwortschreiben erstellen
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="glass text-white border-white/30 hover:bg-white/10"
                  onClick={() => setShowLettersDialog(true)}
                >
                  <FileText className="w-4 h-4 mr-2" /> Schreiben-Übersicht
                </Button>
              </div>
              {showLettersDialog && (
                <CaseLettersDialog
                  open={showLettersDialog}
                  onClose={() => setShowLettersDialog(false)}
                  caseItem={caseData}
                  t={t}
                />
              )}
            </TabsContent>

            <TabsContent value="export" className="mt-4">
              <DocumentActions
                caseData={caseData}
                generatedText={generatedText}
                isGuest={false}
                guestExpired={false}
                isBetaMode={true}
                contentType="case"
                canProceed={true}
              />
            </TabsContent>

            <TabsContent value="protocol" className="mt-4">
              <div className="glass rounded-2xl p-4 text-white">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><span className="text-white/60 text-sm">Fall-Nr.</span><div className="font-semibold">{caseData?.case_number || '—'}</div></div>
                  <div><span className="text-white/60 text-sm">Aktenzeichen</span><div className="font-semibold">{caseData?.reference_number || '—'}</div></div>
                  <div><span className="text-white/60 text-sm">Erstellt</span><div className="font-semibold">{caseData?.created_date ? new Date(caseData.created_date).toLocaleString() : '—'}</div></div>
                  <div><span className="text-white/60 text-sm">Frist</span><div className="font-semibold">{caseData?.deadline || '—'}</div></div>
                </div>
                <div className="mt-4">
                  <Button variant="outline" className="glass border-white/30 text-white hover:bg-white/10">
                    Beweis-Paket exportieren
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}