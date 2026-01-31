import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Letter } from '@/entities/Letter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Settings, Eye, Loader2 } from 'lucide-react';
import { useGuestSession } from '@/components/hooks/useGuestSession';
import { log } from '@/components/lib/log';
import { Case } from '@/entities/Case';
import { InvokeLLM } from '@/integrations/Core';
import { fetchLetterById } from '@/components/lib/letterUtils';
import { base44 } from "@/api/base44Client";

import PartiesForm from '@/components/SchreibenWizard/PartiesForm';
import DetailsForm from '@/components/SchreibenWizard/DetailsForm';
import LetterPreview from '@/components/SchreibenWizard/LetterPreview';

import RescueBanner from '@/components/RescueBanner';
import { saveSnapshot, getTodayKey } from '@/components/lib/snapshot';

// Helper to parse URL query params
const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

export default function SchreibenPage({ t, language }) {
  const navigate = useNavigate();
  const query = useQuery();
  const { guestSession, isGuest } = useGuestSession(language);

  const [letterId, setLetterId] = useState(query.get('id'));
  const [currentStep, setCurrentStep] = useState(parseInt(query.get('step') || '1'));
  const [letterData, setLetterData] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [caseIdFromQuery, setCaseIdFromQuery] = useState(null);
  const [prefilledFromCase, setPrefilledFromCase] = useState(false);
  const [templateKeyFromQuery, setTemplateKeyFromQuery] = useState(null); // NEW STATE

  const [watchdogTriggered, setWatchdogTriggered] = useState(false); // NEW STATE
  const [creatingOnPreview, setCreatingOnPreview] = useState(false);
  const [createError, setCreateError] = useState('');

  // Autosave: versuche lokale Sicherung zu laden, wenn kein Letter vorhanden und letterData noch nicht initialisiert
  useEffect(() => {
    // This effect runs once on mount or when letterId changes to null,
    // and only if letterData is currently null, indicating no data has been loaded or initialized yet.
    if (!letterId && letterData === null) {
      try {
        const raw = localStorage.getItem('w24_letter_autosave');
        if (raw) {
          const parsed = JSON.parse(raw);
          // Basic validation for parsed data
          if (parsed && typeof parsed === 'object' && parsed.parties && parsed.facts) {
            setLetterData(parsed);
            log.info('letter.autosave_loaded_initial');
          }
        }
      } catch (e) {
        log.error('letter.autosave_load_failed_initial', { error: e.message });
      }
    }
  }, [letterId, letterData]); // letterData is included to avoid re-running if it's already set

  // Autosave bei Änderungen von letterData
  useEffect(() => {
    if (letterData) { // Only save if letterData is not null (i.e., it has been initialized or loaded)
      try {
        localStorage.setItem('w24_letter_autosave', JSON.stringify(letterData));
      } catch (e) {
        log.error('letter.autosave_save_failed', { error: e.message });
      }
    }
  }, [letterData]); // Runs whenever letterData changes

  // Watchdog: Falls Seite „hängen bleibt“, initialisiere sicher nach 6s
  useEffect(() => {
    const timer = setTimeout(() => {
      // If after 6 seconds letterData is still null, it means initial loading/autosave failed or is stuck.
      if (letterData === null) {
        setLetterData({
          parties: { sender: {}, recipient: {} },
          facts: { fristTage: 14, anlagen: [] },
          shortcodesRaw: '',
          flags: { disclaimerAccepted: false }
        });
        setWatchdogTriggered(true);
        try {
          saveSnapshot(`${getTodayKey()}-rescue`, { page: 'Schreiben', reason: 'watchdog_init', url: window.location.href });
          log.warn('letter.watchdog_triggered');
        } catch (e) {
          log.error('letter.watchdog_snapshot_failed', { error: e.message });
        }
      }
    }, 6000);
    return () => clearTimeout(timer);
  }, [letterData]); // Dependency letterData. If letterData becomes non-null within 6s, the watchdog doesn't trigger.

  // Load existing letter data if ID is present (safe) or initialize new letter data
  useEffect(() => {
    const loadLetter = async () => {
      setIsLoading(true); // Set loading state at the start of the process
      try {
        if (letterId) {
          const data = await fetchLetterById(letterId);
          if (data) {
            setLetterData(data);
          } else {
            // ID invalid or no access: start fresh and remove id from URL
            // This path also ensures that if autosave has data, it will be used in the subsequent render cycle
            // since letterId will become null.
            if (letterData === null) { // Only set default if no autosave data was present
                setLetterData({
                    parties: { sender: {}, recipient: {} },
                    facts: { fristTage: 14, anlagen: [] },
                    shortcodesRaw: '',
                    flags: { disclaimerAccepted: false }
                });
            }
            setLetterId(null); // Setting letterId to null will trigger re-evaluation for a new letter
            const params = new URLSearchParams(window.location.search);
            params.delete('id');
            if (!params.get('step')) params.set('step', String(currentStep || 1));
            // Replace URL without the invalid id
            const qs = params.toString();
            const url = qs ? `${createPageUrl('Schreiben')}?${qs}` : createPageUrl('Schreiben');
            navigate(url, { replace: true });
          }
        } else {
          // Initialize new letter data only if letterData is still null (i.e., autosave didn't pre-fill it)
          if (letterData === null) {
            setLetterData({
              parties: { sender: {}, recipient: {} },
              facts: { fristTage: 14, anlagen: [] },
              shortcodesRaw: '',
              flags: { disclaimerAccepted: false }
            });
          }
        }
      } catch (err) {
        setError('Brief konnte nicht geladen werden.');
        log.error('letter.load_failed', { letterId, error: err.message });
      } finally {
        setIsLoading(false); // Always set loading to false when the process is complete
      }
    };
    loadLetter();
  }, [letterId, currentStep, navigate, letterData]); // letterData added to dependencies to correctly handle autosave interaction

  // parse case_id from URL for new letters
  useEffect(() => {
    const cid = query.get('case_id');
    setCaseIdFromQuery(cid || null);
  }, [query]);

  // parse template_key from URL
  useEffect(() => {
    const tk = query.get('template_key');
    setTemplateKeyFromQuery(tk || null);
  }, [query]);

  useEffect(() => {
    const prefillFromCase = async () => {
      // Only prefill if a caseId is present, letterData is loaded, and we haven't prefilled yet
      // Also, ensure letterData is not null before proceeding
      if (!caseIdFromQuery || !letterData || prefilledFromCase) return;

      try {
        const caseData = await Case.get(caseIdFromQuery);
        if (!caseData) {
          log.warn('case.prefill_failed', { message: `Case with ID ${caseIdFromQuery} not found for prefill.` });
          return;
        }

        // Prefill parties: Sender = Nutzer (falls vorhanden) oder Kunde im Fall; Empfänger = Absender aus Fall
        const newParties = {
          sender: {
            name: letterData.parties?.sender?.name || caseData.customer_name || '',
            strasse: '',
            plz: '',
            ort: '',
            email: ''
          },
          recipient: {
            name: letterData.parties?.recipient?.name || caseData.sender_name || '',
            strasse: '',
            plz: '',
            ort: '',
            email: ''
          }
        };

        // NEW: Load existing letters and automatically summarize them
        let combinedContext = '';
        const ids = Array.isArray(caseData.related_letters) ? caseData.related_letters : [];
        if (ids.length > 0) {
          const loaded = [];
          for (const id of ids) {
            try {
              const lt = await Letter.get(id);
              if (lt) loaded.push(lt);
            } catch (err) {
              log.error('letter.prefill_from_case_load_related_failed', { relatedLetterId: id, error: err.message });
            }
          }

          // Create raw context (without PII, truncated)
          const parts = loaded.map((lt, idx) => {
            const source = lt.draft || lt.shortcodesRaw || JSON.stringify(lt.facts || {});
            const snippet = String(source).slice(0, 1200); // Truncate to avoid excessive LLM context
            const dateStr = lt.created_date ? new Date(lt.created_date).toLocaleDateString(language) : '';
            return `Schreiben ${idx + 1}${dateStr ? ` (${dateStr})` : ''}:\n${snippet}`;
          });
          const rawContext = parts.join('\n\n---\n\n');

          // Optional: short AI summary (failsafe – if InvokeLLM is unavailable, just use raw context)
          let summary = '';
          if (rawContext.trim().length > 0) {
            try {
              const prompt = `Fasse die folgenden Schreiben kurz und objektiv zusammen (stichpunktartig, max. 6 Bulletpoints), ohne neue Fakten zu erfinden:\n\n${rawContext}`;
              const result = await InvokeLLM({ prompt });
              summary = typeof result === 'string' ? result : '';
            } catch (llmErr) {
              log.error('letter.prefill_from_case_llm_summary_failed', { caseId: caseIdFromQuery, error: llmErr.message });
              summary = ''; // Fallback if LLM fails
            }
          }

          combinedContext = [
            'Kontext bisheriger Schriftwechsel:',
            summary || rawContext, // Use summary if available, otherwise raw context
            '',
            'Bitte entwirf ein sachliches Antwortschreiben, das auf die Punkte eingeht und klare Forderungen/Fristen enthält.'
          ].filter(Boolean).join('\n'); // Filter Boolean to remove empty strings if e.g. summary is empty
        }

        // Only set shortcodesRaw if it's currently empty – do not overwrite user input
        const initialShortcodes = letterData.shortcodesRaw?.trim()
          ? letterData.shortcodesRaw
          : [
              caseData.custom_reason ? `Sachverhalt: ${caseData.custom_reason}` : '',
              caseData.reference_number ? `/ref ${caseData.reference_number}` : '',
              combinedContext
            ].filter(Boolean).join('\n\n');

        setLetterData(prev => ({
          ...prev,
          parties: { ...prev.parties, ...newParties },
          facts: { ...prev.facts, referenz: caseData.reference_number || prev.facts?.referenz },
          shortcodesRaw: initialShortcodes
        }));
        setPrefilledFromCase(true); // Mark as prefilled
      } catch (err) {
        setError('Fehler beim Vorbefüllen des Briefes aus dem Fall.');
        log.error('letter.prefill_from_case_failed', { caseId: caseIdFromQuery, error: err.message });
      }
    };
    prefillFromCase();
  }, [caseIdFromQuery, letterData, prefilledFromCase, language]); // Dependencies: caseIdFromQuery, letterData, prefilledFromCase, language. Removed currentStep and navigate as they are not directly used in the effect logic causing re-runs, and `navigate` is stable from `useNavigate`.

  // Prefill from template if provided
  useEffect(() => {
    const loadTemplate = async () => {
      if (!templateKeyFromQuery || !letterData) return;
      try {
        const list = await base44.entities.Template.filter({ key: templateKeyFromQuery });
        const tpl = Array.isArray(list) ? list[0] : null;
        if (!tpl) return;

        // Build initial shortcodes/intro
        const intro = language === 'en' ? tpl.intro_en : tpl.intro_de;
        const defaults = (tpl.placeholders || [])
          .map(p => {
            const ph = p.name;
            const ex = language === 'en' ? (p.example_en || p.default || '') : (p.example_de || p.default || '');
            return ex ? `/${ph} ${ex}` : `/${ph}`;
          })
          .join('\n');

        const mergedShortcodes = [
          intro || '',
          defaults
        ].filter(Boolean).join('\n\n');

        setLetterData(prev => ({
          ...prev,
          template_key: tpl.key,
          facts: { ...(prev.facts || {}), frist_tage: tpl.frist_default_days || 14 },
          shortcodesRaw: prev.shortcodesRaw && prev.shortcodesRaw.trim() ? prev.shortcodesRaw : mergedShortcodes
        }));
      } catch (e) {
        console.warn("Failed to prefill from template", e);
      }
    };
    loadTemplate();
  }, [templateKeyFromQuery, letterData, language]);

  // Auto-Heilung: Wenn auf Schritt 3 noch keine Letter-ID existiert (z.B. wegen Rate Limit), versuche Erstellung mit Backoff
  useEffect(() => {
    if (currentStep === 3 && !letterId && letterData && !creatingOnPreview) {
      setCreatingOnPreview(true);
      setCreateError('');
      createLetterWithRetry()
        .catch((e) => setCreateError(e?.message || 'Speichern fehlgeschlagen (Rate Limit).'))
        .finally(() => setCreatingOnPreview(false));
    }
  }, [currentStep, letterId, letterData, creatingOnPreview]);

  // Steps configuration (simplified)
  const steps = [
    { number: 1, title: t('letter.step1'), subtitle: t('letter.step1Subtitle'), icon: Users },
    { number: 2, title: t('letter.step2'), subtitle: t('letter.step2Subtitle'), icon: Settings },
    { number: 3, title: t('letter.step3'), subtitle: t('letter.step3Subtitle'), icon: Eye }
  ];

  const currentStepData = steps[currentStep - 1];

  const updateLetterData = (update, shortcodes) => {
    setLetterData(prev => {
        // Correctly merge nested party and fact objects
        const newParties = { ...prev.parties, ...update.parties };
        const newFacts = { ...prev.facts, ...update.facts };

        return {
            ...prev,
            ...update,
            parties: newParties,
            facts: newFacts,
            shortcodesRaw: typeof shortcodes !== 'undefined' ? shortcodes : prev.shortcodesRaw,
        };
    });
  };

  const navigateToStep = (step, id) => {
    setCurrentStep(step);
    const qs = new URLSearchParams();
    qs.set('step', String(step));
    const finalId = typeof id !== 'undefined' && id !== null ? id : letterId;
    if (finalId) qs.set('id', finalId);
    navigate(`${createPageUrl('Schreiben')}?${qs.toString()}`);
  };

  // Neue Hilfsfunktion: Sanitize data before API calls
  const sanitizeLetterData = (data) => {
    const sanitized = { ...data };

    // Map top-level keys to schema (snake_case)
    if (sanitized.templateKey && !sanitized.template_key) {
      sanitized.template_key = sanitized.templateKey;
    }
    if (typeof sanitized.shortcodesRaw !== 'undefined' && sanitized.shortcodes_raw === undefined) {
      sanitized.shortcodes_raw = sanitized.shortcodesRaw || '';
    }

    // Normalize parties to always include required fields (schema requires name, strasse, plz, ort)
    const normalizeParty = (p = {}) => ({
      name: p.name || '',
      strasse: p.strasse || '',
      plz: p.plz || '',
      ort: p.ort || '',
      email: p.email || '',
      tel: p.tel || ''
    });
    const parties = sanitized.parties || {};
    sanitized.parties = {
      sender: normalizeParty(parties.sender),
      recipient: normalizeParty(parties.recipient)
    };

    // Flags required by schema
    const rawFlags = sanitized.flags || {};
    sanitized.flags = {
      disclaimer_accepted: Boolean(rawFlags.disclaimerAccepted ?? rawFlags.disclaimer_accepted ?? false),
      kuendigung_hinweis_akzeptiert: Boolean(rawFlags.kuendigung_hinweis_akzeptiert ?? false),
      content_logging_consent: rawFlags.content_logging_consent ?? true
    };

    // Clean up facts - convert to schema names (snake_case) and drop nulls
    const mappedFacts = {};
    const f = { ...(sanitized.facts || {}) };

    // Convert camelCase -> snake_case and include only valid values (no nulls)
    const reason = f.reason || f.Reason;
    if (typeof reason === 'string' && reason.length >= 0) mappedFacts.reason = reason;

    const months_due_raw = f.months_due ?? f.monthsDue;
    const months_due = Number.isInteger(months_due_raw) ? months_due_raw : (typeof months_due_raw === 'string' && months_due_raw.trim() ? parseInt(months_due_raw, 10) : undefined);
    if (Number.isInteger(months_due) && months_due >= 1) mappedFacts.months_due = months_due;

    const amount_total_raw = f.amount_total ?? f.amountTotal;
    const amount_total_num = typeof amount_total_raw === 'number' ? amount_total_raw : (typeof amount_total_raw === 'string' && amount_total_raw.trim() ? parseFloat(amount_total_raw) : undefined);
    if (typeof amount_total_num === 'number' && !Number.isNaN(amount_total_num)) mappedFacts.amount_total = amount_total_num;

    const due_since_date = f.due_since_date ?? f.dueSinceDate;
    if (typeof due_since_date === 'string' && due_since_date.trim()) mappedFacts.due_since_date = due_since_date;

    if (typeof f.iban === 'string') mappedFacts.iban = f.iban || '';
    if (typeof f.zahlungsempfaenger === 'string') mappedFacts.zahlungsempfaenger = f.zahlungsempfaenger || '';
    if (typeof f.kundennummer === 'string') mappedFacts.kundennummer = f.kundennummer || '';
    if (typeof f.referenz === 'string') mappedFacts.referenz = f.referenz || '';

    const frist_tage_raw = f.frist_tage ?? f.fristTage;
    const frist_tage = typeof frist_tage_raw === 'number' ? frist_tage_raw : (typeof frist_tage_raw === 'string' && frist_tage_raw.trim() ? parseInt(frist_tage_raw, 10) : 14);
    mappedFacts.frist_tage = Number.isInteger(frist_tage) && frist_tage > 0 ? frist_tage : 14;

    mappedFacts.anlagen = Array.isArray(f.anlagen) ? f.anlagen : [];

    sanitized.facts = mappedFacts;

    // Ensure shortcodes_raw field exists
    if (sanitized.shortcodes_raw === undefined) {
      sanitized.shortcodes_raw = '';
    }

    return sanitized;
  };

  const createLetterWithRetry = async (maxRetries = 3) => {
    const data = sanitizeLetterData(letterData);
    let lastErr = null;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const created = await Letter.create({
          ...data,
          language,
          ...(isGuest && guestSession?.id ? { guest_session_id: guestSession.id } : {})
        });
        setLetterId(created.id);
        return created.id;
      } catch (e) {
        lastErr = e;
        const msg = String(e?.message || '');
        if (/429|rate limit/i.test(msg)) {
          await new Promise(r => setTimeout(r, 800 * (i + 1)));
          continue;
        }
        throw e;
      }
    }
    throw lastErr || new Error('Erstellung fehlgeschlagen');
  };

  const retryCreate = async () => {
    setCreatingOnPreview(true);
    setCreateError('');
    try {
      await createLetterWithRetry();
    } catch (e) {
      setCreateError(e?.message || 'Speichern fehlgeschlagen.');
    } finally {
      setCreatingOnPreview(false);
    }
  };

  const handleNext = async () => {
    if (currentStep < steps.length) {
      setIsLoading(true);
      try {
        let currentLetterId = letterId;
        const sanitizedData = sanitizeLetterData(letterData);

        if (letterId) {
          await Letter.update(letterId, sanitizedData);
        } else {
          const created = await Letter.create({
            ...sanitizedData,
            language,
            ...(isGuest && { guest_session_id: guestSession.id })
          });
          setLetterId(created.id);
          currentLetterId = created.id;

          // Wenn aus Fall gestartet: Verknüpfen
          if (caseIdFromQuery) {
            try {
              const c = await Case.get(caseIdFromQuery);
              const related = Array.isArray(c.related_letters) ? c.related_letters : [];
              await Case.update(caseIdFromQuery, { related_letters: Array.from(new Set([...related, created.id])) });
            } catch (err) {
              log.error('letter.link_to_case_failed', { caseId: caseIdFromQuery, newLetterId: created.id, error: err.message });
              // Do not block progression due to linking error
            }
          }
        }
        navigateToStep(currentStep + 1, currentLetterId);
      } catch (err) {
        setError('Fehler beim Speichern des Fortschritts.');
        log.error('letter.save_failed', { step: currentStep, error: err.message });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      navigateToStep(currentStep - 1);
    } else {
      navigate(createPageUrl('Home'));
    }
  };

  const canProceedToNext = () => {
    if (!letterData) return false;
    switch (currentStep) {
      case 1:
        return !!(letterData.parties?.sender?.name && letterData.parties?.recipient?.name);
      case 2:
        return !!(letterData.shortcodesRaw?.trim());
      default:
        return false;
    }
  };

  // Stelle sicher, dass nie „leer“ zurückgegeben wird – zeige Fallback
  if (!letterData) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-16">
        <div className="glass rounded-3xl p-8 text-white text-center max-w-xl w-full">
          {isLoading ? (
            <>
              <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" />
              <div className="text-lg font-semibold mb-2">Initialisiere Schreiben‑Generator…</div>
              <div className="text-white/70 text-sm mb-4">Falls dies länger dauert, klicken Sie auf „Neu laden“.</div>
            </>
          ) : (
            <>
              <div className="text-lg font-semibold mb-2">Ein Problem ist aufgetreten</div>
              <div className="text-white/70 text-sm mb-4">Der Generator konnte nicht geladen werden.</div>
            </>
          )}
          <RescueBanner
            message="Es dauert ungewöhnlich lange oder es gab einen Fehler."
            hint="Ihre Eingaben wurden lokal gespeichert. Sie können fortfahren."
            onReload={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  // if (!t || !letterData) return null; // This check is now redundant due to the previous block

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Button onClick={handleBack} variant="ghost" className="glass rounded-xl text-white mr-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {currentStep === 1 ? 'Startseite' : 'Zurück'}
            </Button>
            <div>
              <h1 className="text-4xl font-bold text-white">{t('letter.wizardTitle')}</h1>
              <p className="text-white/80">{t('letter.wizardSubtitle')}</p>
            </div>
          </div>
        </div>

        {watchdogTriggered && (
          <div className="mb-6">
            <RescueBanner
              message="Wir haben den Generator automatisch wiederhergestellt."
              hint="Ihre Eingaben wurden lokal gespeichert. Sie können fortfahren."
              onContinue={() => setWatchdogTriggered(false)}
              onReload={() => window.location.reload()}
            />
          </div>
        )}

        <div className="glass rounded-3xl p-6 mb-8">
          {/* Progress Steps could be added here if desired */}
        </div>

        <div className="mb-8">
          {currentStep === 1 && (
            <PartiesForm
              t={t}
              parties={letterData.parties}
              onUpdate={(p) => updateLetterData({ parties: p })}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {currentStep === 2 && (
            <DetailsForm
              t={t}
              facts={letterData.facts}
              shortcodesRaw={letterData.shortcodesRaw}
              onUpdate={(facts, shortcodes) => updateLetterData({ facts }, shortcodes)}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {currentStep === 3 && (
            letterId ? (
              <LetterPreview
                letterId={letterId}
                t={t}
                language={language}
                onBack={handleBack}
              />
            ) : (
              <div className="glass rounded-2xl p-8 text-center text-white">
                {creatingOnPreview ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                    <div className="text-lg font-semibold">Speichere und generiere Vorschau</div>
                    <div className="text-white/70 text-sm mt-1">Bei hoher Auslastung kann es kurz zu Wartezeiten kommen.</div>
                  </>
                ) : (
                  <>
                    <div className="text-lg font-semibold mb-2">Entwurf noch nicht gespeichert</div>
                    {createError && <div className="text-red-300 text-sm mb-4">{createError}</div>}
                    <div className="flex justify-center gap-3">
                      <Button onClick={retryCreate} className="glass text-white border-white/30 hover:glow">Erneut versuchen</Button>
                      <Button onClick={handleBack} variant="outline" className="glass border-white/30 text-white hover:bg-white/10">Zur FCck</Button>
                    </div>
                    <p className="text-white/60 text-xs mt-4">Hinweis: Das System begrenzt kurzfristig zu viele Anfragen (429). Ein erneuter Versuch hilft meist sofort.</p>
                  </>
                )}
              </div>
            )
          )}
        </div>

        {(currentStep < 3) && (
          <div className="glass rounded-2xl p-4">
            <div className="flex justify-between items-center">
               <div className="text-white/60 text-sm">
                Schritt {currentStep} von {steps.length}: {currentStepData.title}
              </div>
              <div className="flex gap-3">
                {currentStep > 1 && (
                  <Button onClick={handleBack} variant="outline" className="glass border-white/30 text-white hover:bg-white/10">Zurück</Button>
                )}
                {currentStep < 3 && (
                  <Button onClick={handleNext} disabled={!canProceedToNext() || isLoading} className="glass text-white border-white/30 hover:glow">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Weiter'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="glass border-red-500/50 rounded-2xl p-4 mt-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}