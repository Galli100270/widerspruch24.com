import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Case } from "@/entities/Case";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, ArrowRight, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import MicrophoneInput from "@/components/MicrophoneInput";
import SmartScanner from "@/components/SmartScanner";
import { UploadFile } from "@/integrations/Core";
import { useGuestSession } from '@/components/hooks/useGuestSession';
import { callWithRetry } from '@/components/lib/network';

// Hilfsfunktion zur Generierung einer eindeutigen Fallnummer
const generateCaseNumber = () => {
    const prefix = 'W24';
    const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${randomPart}`;
};

export default function Scanner({ t, language }) {
  // Move all hooks to the top of the component to follow the Rules of Hooks
  const navigate = useNavigate();
  const { guestSession, isGuest, isLoading: guestLoading } = useGuestSession(language);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    sender_name: "",
    sender_address: "",
    reference_number: "",
    document_date: "",
    amount: "",
    objection_reason: "",
    custom_reason: ""
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documentUrls, setDocumentUrls] = useState([]);
  const [isPreparingForm, setIsPreparingForm] = useState(false);

  // This conditional return is now safe to use after all hooks have been called.
  if (!t) return null;

  const handleScanSuccess = async (data) => {
    try {
      // Map suggested_category to a valid objection_reason enum value
      const validObjectionReasons = ["incorrect_calculation", "decision_unjustified", "deadline_missed", "formal_error", "other"];
      let reason = 'other'; // default
      if (data.suggested_category && validObjectionReasons.includes(data.suggested_category)) {
        reason = data.suggested_category;
      } else if (data.suggested_category) {
        // Fallback for categories not in the simple enum, e.g. factual_error
        if (data.suggested_category === 'factual_error' || data.suggested_category === 'procedural_error') {
            reason = 'formal_error';
        } else if (data.suggested_category === 'legal_basis') {
            reason = 'decision_unjustified';
        } else if (data.suggested_category === 'calculation_error') {
            reason = 'incorrect_calculation';
        }
      }

      // Handle multi-page documents: SmartScanner can return data.document_urls (array) or data.document_url (single string)
      const scannedDocumentUrls = data.document_urls || (data.document_url ? [data.document_url] : []);
      setDocumentUrls(scannedDocumentUrls); // Store the scanned URLs

      const caseData = {
        origin: "scanner", // REQUIRED: Set origin for scanner-created cases
        case_number: generateCaseNumber(), // NEU: Fallnummer generieren
        sender_name: data.sender_name || t('common.unknown'),
        sender_address: data.sender_address || '',
        reference_number: data.reference_number || t('common.unknown'),
        document_date: data.document_date || new Date().toISOString().split('T')[0],
        amount: data.amount ? parseFloat(data.amount) : null,
        // Now passing an array of document URLs
        document_urls: scannedDocumentUrls,
        objection_reason: reason, // Add required field with mapping
        objection_categories: data.suggested_category ? [data.suggested_category] : [], // NEU: KI-Vorauswahl
        custom_reason: data.reason_summary || t('common.reason_from_scan'), // NEU: KI-Zusammenfassung
        status: "draft",
        language: language,
        // NEU: Kundendaten speichern
        customer_name: data.customer_name || '',
        customer_address: data.customer_address || '',
        // Associate with guest session if user is guest
        ...(isGuest && guestSession ? { guest_session_id: guestSession.id } : {})
      };

      const newCase = await Case.create(caseData);
      
      sessionStorage.setItem(`scan_progress_${newCase.id}`, JSON.stringify({
        progress: 60, // Changed from 75 to 60
        timestamp: Date.now(),
        step: 'scan_completed'
      }));

      // Redirect to CaseDetails instead of Preview
      navigate(createPageUrl(`CaseDetails?case_id=${newCase.id}`));

    } catch (err) {
      console.error("Scanner submit error:", err);
      setError(t('scanner.submitError'));
    }
  };

  const handleScanError = (errorMsg) => {
    setError(errorMsg);
    setTimeout(() => setError(""), 5000); // Clear error after 5 seconds
  };
  
  const handleTextFile = async (textContent, file) => {
    setIsPreparingForm(true);
    setError("");
    try {
      const { file_url } = await callWithRetry(() => UploadFile({ file }), 2, 700);
      // Set documentUrls as an array containing the single uploaded file URL
      setDocumentUrls([file_url]);

      setFormData(prev => ({
        ...prev,
        custom_reason: textContent,
      }));
      setStep(2);
    } catch (err) {
      setError('Upload fehlgeschlagen (Verbindungsproblem). Bitte erneut versuchen.');
    } finally {
      setIsPreparingForm(false);
    }
  };

  const handleManualEntry = () => setStep(2);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const caseData = {
        origin: "scanner", // REQUIRED: Set origin for manual entry cases
        case_number: generateCaseNumber(), // NEU: Fallnummer generieren
        ...formData,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        // Now passing the stored documentUrls array
        document_urls: documentUrls,
        status: "draft",
        language: language,
        // Associate with guest session if user is guest
        ...(isGuest && guestSession ? { guest_session_id: guestSession.id } : {})
      };
      
      const newCase = await Case.create(caseData);

      sessionStorage.setItem(`scan_progress_${newCase.id}`, JSON.stringify({
        progress: 60, // Changed from 75 to 60
        timestamp: Date.now(),
        step: 'form_completed'
      }));

      // Redirect to CaseDetails instead of Preview
      navigate(createPageUrl(`CaseDetails?case_id=${newCase.id}`));
    } catch (err) {
      setError(t('scanner.submitError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMicrophoneTranscript = (transcript, fieldName = 'custom_reason') => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: prev[fieldName] ? prev[fieldName] + ' ' + transcript : transcript
    }));
  };

  const objectionReasons = [
    "incorrect_calculation",
    "decision_unjustified",
    "deadline_missed",
    "formal_error",
    "other"
  ];

  if (step === 1) {
    return (
      <div className="min-h-screen px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">{t('scanner.choiceTitle')}</h1>
            <p className="text-xl text-white/80">{t('scanner.choiceSubtitle')}</p>
          </div>
          {error && (
            <Alert className="glass border-red-500/50 mb-8">
              <AlertDescription className="text-white">{error}</AlertDescription>
            </Alert>
          )}
          
          {isPreparingForm && (
            <div className="glass rounded-3xl p-8 text-white text-center mb-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              {t('scanner.preparingForm')}
            </div>
          )}

          <SmartScanner
            t={t}
            onSuccess={handleScanSuccess}
            onError={handleScanError}
            onTextContent={handleTextFile}
          />

          <div className="text-center mt-8">
            <Button
              onClick={handleManualEntry}
              variant="outline"
              className="glass border-white/30 text-white hover:bg-white/10 rounded-2xl px-8 py-4"
            >
              <FileText className="w-5 h-5 mr-2" />
              {t('scanner.manualButton')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">{t('scanner.formTitle')}</h1>
          <p className="text-xl text-white/80">
            {t('scanner.formSubtitleManual')}
          </p>
        </div>
        {error && (
          <Alert className="glass border-red-500/50 mb-8">
            <AlertDescription className="text-white">{error}</AlertDescription>
            </Alert>
        )}
        <form onSubmit={handleSubmit} className="glass rounded-3xl p-8">
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <Label htmlFor="sender_name" className="text-white mb-2 block">{t('form.senderName')}</Label>
              <Input
                id="sender_name"
                value={formData.sender_name}
                onChange={(e) => setFormData({...formData, sender_name: e.target.value})}
                className="glass border-white/30 text-white placeholder-white/60"
                placeholder={t('form.senderNamePlaceholder')}
                required
              />
            </div>
            <div>
              <Label htmlFor="reference_number" className="text-white mb-2 block">{t('form.referenceNumber')}</Label>
              <Input
                id="reference_number"
                value={formData.reference_number}
                onChange={(e) => setFormData({...formData, reference_number: e.target.value})}
                className="glass border-white/30 text-white placeholder-white/60"
                placeholder={t('form.referenceNumberPlaceholder')}
                required
              />
            </div>
            <div>
              <Label htmlFor="document_date" className="text-white mb-2 block">{t('form.documentDate')}</Label>
              <Input
                id="document_date"
                type="date"
                value={formData.document_date}
                onChange={(e) => setFormData({...formData, document_date: e.target.value})}
                className="glass border-white/30 text-white"
                required
              />
            </div>
            <div>
              <Label htmlFor="amount" className="text-white mb-2 block">{t('form.amount')}</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="glass border-white/30 text-white placeholder-white/60"
                placeholder={t('form.amountPlaceholder')}
              />
            </div>
          </div>

          <div className="mb-6">
            <Label htmlFor="sender_address" className="text-white mb-2 block">{t('form.senderAddress')}</Label>
            <Textarea
              id="sender_address"
              value={formData.sender_address}
              onChange={(e) => setFormData({...formData, sender_address: e.target.value})}
              className="glass border-white/30 text-white placeholder-white/60"
              placeholder={t('form.senderAddressPlaceholder')}
              rows={3}
            />
          </div>

          <div className="mb-6">
            <Label htmlFor="objection_reason" className="text-white mb-2 block">{t('form.objectionReason')}</Label>
            <Select
              value={formData.objection_reason}
              onValueChange={(value) => setFormData({...formData, objection_reason: value})}
            >
              <SelectTrigger className="glass border-white/30 text-white">
                <SelectValue placeholder={t('form.objectionReasonPlaceholder')} />
              </SelectTrigger>
              <SelectContent className="glass border-white/20">
                {objectionReasons.map((key) => (
                  <SelectItem
                    key={key}
                    value={key}
                    className="text-white focus:bg-white/10"
                  >
                    {t(`objectionReason.${key}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-6">
            <Label htmlFor="custom_reason" className="text-white mb-2 block">{t('form.customReason')}</Label>
            <Textarea
              id="custom_reason"
              value={formData.custom_reason}
              onChange={(e) => setFormData({...formData, custom_reason: e.target.value})}
              className="glass border-white/30 text-white placeholder-white/60"
              placeholder={t('form.customReasonPlaceholder')}
              rows={4}
              required
            />
            <MicrophoneInput
              onTranscript={(transcript) => handleMicrophoneTranscript(transcript, 'custom_reason')}
              t={t}
              className="mt-3"
            />
          </div>

          <Button
            type="submit"
            className="glass text-white border-white/30 hover:glow transition-all duration-300 w-full py-6 rounded-2xl text-lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{t('form.submittingButton')}</>
            ) : (
              <><ArrowRight className="w-5 h-5 mr-2" />{t('form.submitButton')}</>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}