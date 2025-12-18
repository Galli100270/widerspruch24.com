
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Case } from "@/entities/Case";
import { User } from "@/entities/User";
import { updateCaseSafe } from "@/components/lib/caseUtils";
import { InvokeLLM } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, Shield, Lock, CheckCircle, AlertTriangle } from "lucide-react";
import EditableLetterPreview from '@/components/EditableLetterPreview';
// Removed: import AISuggestions from "@/components/AISuggestions";
import PricingOptions from "@/components/PricingOptions";
import { usePreviewGuard } from "@/components/hooks/usePreviewGuard";
import { useLocalization } from "@/components/hooks/useLocalization";
import { useGuestSession } from '@/components/hooks/useGuestSession';
import BetaGuestBanner from '@/components/BetaGuestBanner';
import DocumentActions from '@/components/DocumentActions';
import AdditionalDocuments from '@/components/AdditionalDocuments';
import KILawyer from "@/components/animations/KILawyer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SignaturePad from "@/components/SignaturePad";

export default function Preview() {
  // All hooks MUST be called before any conditional returns
  const { t, language, formatCurrency, isLoading: isLocalizationLoading } = useLocalization();
  const navigate = useNavigate();
  const { guestSession, isGuest, guestExpired, daysLeft } = useGuestSession(language);
  
  // URL Parameter
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('case_id');
  
  // Preview Guard
  const { canAccess, isChecking } = usePreviewGuard(caseId, 75);

  // State hooks
  const [caseData, setCaseData] = useState(null);
  const [generatedText, setGeneratedText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiValidated, setAiValidated] = useState(false);
  const [error, setError] = useState("");
  // Removed: const [appliedSuggestions, setAppliedSuggestions] = useState([]);
  const [additionalDocuments, setAdditionalDocuments] = useState([]);
  const [signOpen, setSignOpen] = useState(false);

  // Derived state for guest trial status
  // A guest is on trial if they are a guest AND they have days left.
  const isOnTrial = isGuest && daysLeft > 0;

  // Callback hooks
  const generateObjectionText = useCallback(async (caseInfo) => {
    setIsGenerating(true);
    try {
      const detailedPrompt = `
Rolle: Du bist ein Assistent und schreibst im Namen einer Privatperson einen Widerspruch in ICH-Form. Die Person ist keine Juristin.
Stil: freundlich, bestimmt, klar verständlich (Leseniveau B1–B2), ohne Floskeln, ohne erfundene Fakten, keine konkreten Paragraphen nennen. 
Recht: Nutze neutrale rechtliche Grundsätze (z. B. Nachvollziehbarkeit der Entscheidung, Verhältnismäßigkeit, Anspruch auf fehlerfreie Berechnung) in 1–2 Sätzen je Begründung – nur als Einordnung.
Frist: Am Ende eine sachliche 14‑Tage‑Frist setzen (fällt das Fristende aufs Wochenende/Feiertag, gilt der nächste Werktag) und um Eingangsbestätigung bitten.

FALLDETAILS:
- Absender des Bescheids/Schreibens: ${caseInfo.sender_name || '—'}
- Aktenzeichen/Referenz: ${caseInfo.reference_number || '—'}
- Datum des Bescheids: ${caseInfo.document_date || '—'}
- Mein Name: ${caseInfo.customer_name || '—'}

MEINE ANGABEN:
- Meine Hauptbegründung (wörtlich übernehmen, ggf. sprachlich glätten, nichts erfinden): ${caseInfo.objection_details?.main_objection_reason || caseInfo.custom_reason || '—'}
- Falls in der Begründung keine Leitfrage enthalten ist, formuliere eine präzise Leitfrage (z. B. „Ist der Preis zu hoch?“) und beziehe dich darauf.
- Weitere Details/Belege: ${caseInfo.objection_details?.detailed_reasoning || '—'}
- Gewünschtes Ergebnis: ${caseInfo.objection_details?.requested_outcome || 'Aufhebung/Neubewertung'}

AUFGABE – Struktur (nur Fließtext, keine Anrede/Gruß/Kopf/Fuß):
1) Einleitung: Bezug auf Bescheid (Datum/Aktenzeichen) und dass ich fristgerecht widerspreche.
2) Sachverhalt kurz aus meiner Sicht.
3) Individuelle Begründung: meine Worte wertschätzend aufgreifen; 1–2 Sätze einfache rechtliche Einordnung (keine Paragraphen).
4) Konkreter Antrag (z. B. Aufhebung/Neuberechnung/Begründung nachreichen).
5) Fristsetzung: 14 Tage, Wochenende/Feiertag → nächster Werktag. Bitte um Eingangsbestätigung.

Variabilität: Vermeide generische Satzstarter; formuliere natürlich und präzise. 320–520 Wörter.
Ergebnis: Gib ausschließlich den Fließtext zurück.
`;
      const result1 = await InvokeLLM({ prompt: detailedPrompt });
      
      const validationPrompt = `
Überarbeite folgenden Widerspruchstext:
Ziele: Ich-Form, freundlich-bestimmt, leicht verständlich (B1–B2), kurze klare Sätze, keine neuen Fakten, keine Paragraphen.
Sorge für:
- saubere Gliederung gemäß: Einleitung → Sachverhalt → Begründung (inkl. knapper rechtlicher Einordnung) → Antrag → Frist (14 Tage, Wochenende/Feiertag → nächster Werktag) → Bitte um Eingangsbestätigung.
- natürliche Variation (keine Standardsätze wiederholen).
- konsistente Terminologie (z. B. Bescheid, Aktenzeichen, Neuberechnung).

TEXT:
"${result1}"

Gib ausschließlich den finalen Fließtext zurück (ohne Anrede/Gruß/Kopf/Fuß).
`;
      
      const finalResult = await InvokeLLM({ prompt: validationPrompt });
      const finalText = typeof finalResult === 'string' ? finalResult : JSON.stringify(finalResult);

      await updateCaseSafe(caseInfo.id, { 
        generated_text: finalText, 
        ai_validated: true, 
        status: 'preview' 
      }, caseInfo);
      
      setGeneratedText(finalText);
      setAiValidated(true);
    } catch (err) {
      setError("Fehler bei der Texterstellung.");
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const loadCaseAndGenerate = useCallback(async (caseId) => {
    try {
      const allCases = await Case.list();
      const currentCase = allCases.find(c => c.id === caseId);
      
      if (!currentCase) {
        setError("Fall nicht gefunden.");
        return;
      }

      // Check ownership for guests
      if (isGuest && guestSession && currentCase.guest_session_id !== guestSession.id) {
        setError("Zugriff verweigert. Dieser Fall gehört nicht zu deiner Gast-Session.");
        return;
      }

      setCaseData(currentCase);
      
      // Load additional documents if they exist
      if (currentCase.additional_documents) {
        setAdditionalDocuments(currentCase.additional_documents);
      }

      if (!currentCase.generated_text) {
        await generateObjectionText(currentCase);
      } else {
        setGeneratedText(currentCase.generated_text);
        setAiValidated(currentCase.ai_validated);
      }
    } catch (err) {
      console.error("Error loading case:", err);
      setError("Fehler beim Laden des Falls.");
    }
  }, [generateObjectionText, isGuest, guestSession]);

  const handleAdditionalDocuments = async (documents) => {
    setAdditionalDocuments(documents);
    if (caseData) {
      try {
        await updateCaseSafe(caseData.id, {
          ...caseData,
          additional_documents: documents
        }, caseData);
      } catch (error) {
        console.error('Error saving additional documents:', error);
      }
    }
  };

  const handleBack = useCallback(() => {
    navigate(createPageUrl(`Scanner?case_id=${caseId}`));
  }, [navigate, caseId]);
  
  const handlePayment = useCallback(async (plan) => {
    // Skip payment for guests - they get full access during trial
    if (isGuest && !guestExpired) {
      console.log('Guest gets free access during trial period');
      return;
    }

    try {
      await User.me();
    } catch (e) {
      await User.loginWithRedirect(window.location.href);
      return;
    }
    
    const amounts = {
      single: 500, // 5€ in Cent
      package: 2250, // 22,50€ in Cent  
      subscription: 2000 // 20€ in Cent
    };

    console.log(`Initiating payment for plan: ${plan}, amount: ${amounts[plan]/100}€`);
    alert(`Weiterleitung zur Bezahlung für Plan: ${plan} (${formatCurrency(amounts[plan]/100)})`);
  }, [formatCurrency, isGuest, guestExpired]);

  // Removed: handleApplySuggestion, handleIgnoreSuggestion, handleAttachmentSuggestion callbacks
  /*
  const handleApplySuggestion = useCallback((suggestion) => {
    const enhancedText = generatedText + '\n\n' + suggestion.textSnippet;
    setGeneratedText(enhancedText);
    setAppliedSuggestions(prev => [...prev, suggestion.id]);
    
    if (caseData) {
      Case.update(caseData.id, { generated_text: enhancedText });
    }
  }, [generatedText, caseData]);

  const handleIgnoreSuggestion = useCallback((suggestion) => {
    console.log('Ignored suggestion:', suggestion);
  }, []);

  const handleAttachmentSuggestion = useCallback((suggestion) => {
    console.log('Requested as attachment:', suggestion);
  }, []);
  */

  const handleSaveEditedText = useCallback(async (newText, senderData) => {
    if (!caseData) {
      setError("Kein Fall zum Speichern der Änderungen gefunden.");
      return;
    }
    try {
      await updateCaseSafe(caseData.id, { 
        generated_text: newText,
        sender_data: senderData 
      }, caseData);
      setGeneratedText(newText);
      setCaseData(prev => ({ ...prev, sender_data: senderData })); // Update local caseData state as well
    } catch (error) {
      setError("Fehler beim Speichern der Änderungen.");
    }
  }, [caseData]);

  const handleSaveSignature = useCallback(async (dataUrl) => {
    if (!caseData) return;
    try {
      const sender = { ...(caseData.sender_data || {}), signature: dataUrl };
      await updateCaseSafe(caseData.id, { sender_data: sender }, caseData);
      setCaseData(prev => ({ ...prev, sender_data: sender }));
      setSignOpen(false);
    } catch (e) {
      setError("Fehler beim Speichern der Unterschrift.");
    }
  }, [caseData]);

  // Effect hooks
  useEffect(() => {
    if (caseId && canAccess) {
      loadCaseAndGenerate(caseId);
    } else if (!caseId && canAccess) {
      setError("Kein Fall gefunden. Bitte starten Sie erneut.");
    }
  }, [caseId, canAccess, loadCaseAndGenerate]);

  // NOW we can have conditional returns after all hooks are called
  if (isLocalizationLoading || isChecking || !t) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-16">
        <div className="glass rounded-3xl p-12 text-center">
          <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-2">
            {isChecking ? t('preview.checking') : t('common.loading')}
          </h1>
          <p className="text-white/80">
            {isChecking ? t('preview.validating') : t('preview.loading')}
          </p>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return null; 
  }
  
  if (isGenerating) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-16">
        <div className="max-w-3xl w-full">
          <KILawyer
            message={t('preview.generating')}
            subMessage={t('preview.generatingDesc')}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <Alert className="glass border-red-500/50">
            <AlertTriangle className="w-6 h-6 text-red-400 mr-2" />
            <AlertDescription className="text-white p-4">
              <div className="font-medium mb-2">{t('preview.errorTitle')}</div>
              <div className="mb-4">{error}</div>
              <div className="flex gap-3">
                <Button 
                  onClick={() => navigate(createPageUrl('Scanner'))} 
                  className="glass text-white border-white/30"
                >
                  {t('preview.retry')}
                </Button>
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="glass border-white/30 text-white hover:bg-white/10"
                >
                  {t('preview.editButton')}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Guest Banner */}
      {isGuest && daysLeft > 0 && (
        <BetaGuestBanner daysLeft={daysLeft} />
      )}
      
      <div className="px-4 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Button 
                onClick={handleBack} 
                variant="ghost" 
                className="glass rounded-xl text-white mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2"/> 
                {t('preview.editButton')}
              </Button>
              <div>
                <h1 className="text-4xl font-bold text-white">{t('preview.title')}</h1>
                <p className="text-white/80">{t('preview.subtitle')}</p>
              </div>
            </div>
          </div>

          {/* Case Overview */}
          <div className="glass rounded-3xl p-6 mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-white">
              <div>
                <p className="text-white/60 text-sm">{t('preview.caseSender')}</p>
                <p className="font-semibold">{caseData?.sender_name}</p>
              </div>
              <div>
                <p className="text-white/60 text-sm">{t('preview.caseRefNo')}</p>
                <p className="font-semibold">{caseData?.reference_number}</p>
              </div>
              <div>
                 <p className="text-white/60 text-sm">Fall-Nr.</p>
                 <p className="font-semibold">{caseData?.case_number}</p>
              </div>
              <div>
                <p className="text-white/60 text-sm">{t('preview.caseStatus')}</p>
                <Badge className={
                  aiValidated 
                    ? "bg-green-500/20 text-green-400 border-green-500/30" 
                    : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                }>
                  {aiValidated ? t('preview.statusValidated') : t('preview.statusValidating')}
                </Badge>
              </div>
            </div>
          </div>

          {/* Removed AI Suggestions section */}

          {/* Additional Documents Section */}
          <div className="mb-8">
            <AdditionalDocuments
              t={t}
              caseData={caseData}
              existingDocuments={additionalDocuments}
              onDocumentsAdded={handleAdditionalDocuments}
            />
          </div>

          {/* Button to add signature */}
          <div className="mb-4">
            <Button
              variant="outline"
              className="glass border-white/30 text-white hover:bg-white/10"
              onClick={() => setSignOpen(true)}
            >
              ✍️ Unterschrift hinzufügen
            </Button>
          </div>

          {/* Editable Letter Preview - BETA: 100% bearbeitbar */}
          <div className="mb-8">
            <div className="glass rounded-3xl p-6">
              <EditableLetterPreview 
                caseData={caseData}
                generatedText={generatedText}
                t={t}
                language={language}
                onSave={handleSaveEditedText}
                readonly={false}
              />
            </div>
          </div>

          {/* Document Actions (Download/Email) - BETA: voll funktionsfähig */}
          <div className="mb-8">
            <DocumentActions 
              caseData={caseData}
              generatedText={generatedText}
              isGuest={isGuest}
              guestExpired={guestExpired}
              isBetaMode={isOnTrial || isGuest} // Beta-Modus für Trials und Gäste
            />
          </div>

          {/* Pricing Options - KOMPLETT AUSGEBLENDET IN BETA */}
          {!isOnTrial && !isGuest && guestExpired && (
            <div className="mb-8">
              <PricingOptions t={t} onSelectPlan={handlePayment} isGuest={isGuest} guestExpired={guestExpired} caseData={caseData} isBetaMode={false} />
            </div>
          )}
          
          {/* Trust Indicators */}
          <div className="flex justify-center items-center gap-8 mt-8 text-white/60">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400"/> 
              {t('home.trustIndicatorAI')}
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-400"/> 
              {t('home.trustIndicatorSSL')}
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400"/> 
              {t('home.trustIndicatorGDPR')}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={signOpen} onOpenChange={setSignOpen}>
        <DialogContent className="max-w-lg w-[92vw]">
          <DialogHeader>
            <DialogTitle>Unterschrift erfassen</DialogTitle>
          </DialogHeader>
          <SignaturePad onSave={handleSaveSignature} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
