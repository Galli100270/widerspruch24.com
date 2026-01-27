import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Mail, Loader2, CheckCircle, FileText, FileType } from 'lucide-react';
import { useLocalization } from '@/components/hooks/useLocalization';
import { Alert, AlertDescription } from '@/components/ui/alert';
import GuestExpiredModal from './GuestExpiredModal';
// Lazy import jsPDF + html2canvas at runtime to reduce initial bundle size
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from '@/entities/User'; // Corrected import syntax
import { useGuestSession } from '@/components/hooks/useGuestSession';
import { trackEvent } from '@/components/lib/analytics';
import { base44 } from "@/api/base44Client";
import { BRAND } from "@/components/brand";

export default function DocumentActions({ caseData, generatedText, isGuest, guestExpired, isBetaMode = false, contentType = 'case', canProceed = true }) {
  const { t } = useLocalization();
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailAddress, setEmailAddress] = useState(caseData?.parties?.recipient?.email || '');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [sendMode, setSendMode] = useState('mailto'); // 'mailto' | 'directHtml'

  const { guestSession } = useGuestSession(); // Trial/limits for guests

  // Global Beta window (same behavior as in AnalysisPreviewCard)
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
      return true; // be permissive if storage not available
    }
  }, []);

  const betaUnlocked = isBetaMode || isBetaFree();

  const getFullAddress = (party) => {
    if (!party) return '';
    return `${party.name || ''}\n${party.strasse || ''}\n${party.plz || ''} ${party.ort || ''}`;
  }

  // HTML → Text (für TXT-Export)
  const htmlToText = (html) => {
    try {
      const el = document.createElement('div');
      el.innerHTML = html;
      return (el.textContent || el.innerText || "").trim();
    } catch {
      return String(html || "");
    }
  };

  const constructFullLetter = () => {
    if (!caseData || !generatedText) return "Dokument wird geladen...";

    let senderBlock = '';
    if (contentType === 'letter' && caseData.parties?.sender) {
      senderBlock = getFullAddress(caseData.parties.sender);
    } else if (caseData.customer_name) {
      senderBlock = `${caseData.customer_name}\n${(caseData.customer_address || '').replace(/\\n/g, '\n')}`;
    }

    // Wenn HTML vorliegt, in Klartext für TXT umwandeln (PDF nutzt DOM-Render)
    const containsHTML = typeof generatedText === 'string' && /<\/?[a-z][\s\S]*>/i.test(generatedText);
    if (containsHTML) return htmlToText(generatedText);
    
    return generatedText;
  };

  // Build HTML letter for email body (preserves formatting)
  const buildEmailHtml = () => {
    const FULL_MARK = '<!-- FULL_LETTER -->';
    const hasFull = typeof generatedText === 'string' && generatedText.includes(FULL_MARK);
    const isHtml = typeof generatedText === 'string' && /<\/?[a-z][\s\S]*>/i.test(generatedText);
    const cityOnly = (fullCity) => (fullCity || '').replace(/^\d{5}\s+/, '');
    const sender = caseData?.sender_data || {}; // Prioritize sender_data from caseData
    
    const senderName = sender.name || caseData?.parties?.sender?.name || '';
    const senderStreet = sender.street || sender.strasse || caseData?.parties?.sender?.strasse || '';
    const senderZip = sender.zip_code || sender.plz || caseData?.parties?.sender?.plz || '';
    const senderCity = sender.city || sender.ort || caseData?.parties?.sender?.ort || '';
    
    const senderLineParts = [senderName, senderStreet, [senderZip, senderCity].filter(Boolean).join(' ')].filter(Boolean);
    const senderLine = senderLineParts.join(', ');

    const today = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
    const subject = caseData?.reference_number
      ? `Ihr Schreiben zu ${caseData.reference_number}`
      : (caseData?.title || 'Ihr Anliegen');
    const greeting = 'Sehr geehrte Damen und Herren,';
    const closing = 'Mit freundlichen Grüßen';
    const bodyContent = (() => {
      if (hasFull) return generatedText.replace(FULL_MARK, '');
      if (isHtml) return generatedText;
      return `<div style="white-space:pre-line;">${(generatedText || '').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`;
    })();

    // Recipient details for the HTML email body
    const recipient = caseData?.parties?.recipient || {};
    const recipientNameHtml = recipient?.name ? `<div style="font-weight:bold;margin-bottom:6px;">${recipient.name}</div>` : '';
    const recipientAddressHtml = [
      recipient.strasse,
      [recipient.plz, recipient.ort].filter(Boolean).join(' ')
    ].filter(Boolean).map(l => `<div>${l}</div>`).join('');

    // Minimal, email‑safe wrapper with inline styles (600px container)
    return `
    <!DOCTYPE html>
    <html lang="de">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${subject}</title>
      </head>
      <body style="margin:0;padding:0;background:#f5f7fb;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f5f7fb;">
          <tr>
            <td align="center" style="padding:24px 12px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;font-family:'Times New Roman','Liberation Serif',serif;color:#111;line-height:1.5;">
                <tr>
                  <td style="padding:24px 28px;">
                    <!-- Absenderzeile -->
                    <div style="font-size:10pt;color:#4b5563;border-bottom:1px solid #9ca3af;padding-bottom:6px;margin-bottom:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                      ${senderLine || ''}
                    </div>

                    <!-- Empfänger -->
                    <div style="margin-top:18px;margin-bottom:24px;font-size:12pt;">
                      ${recipientNameHtml}
                      ${recipientAddressHtml}
                    </div>

                    <!-- Datum -->
                    <div style="text-align:right;margin-bottom:24px;font-size:12pt;">
                      ${cityOnly(senderCity) || 'Musterstadt'}, den ${today}
                    </div>

                    <!-- Betreff -->
                    <div style="margin-bottom:18px;font-weight:bold;font-size:13pt;">
                      ${subject}
                    </div>

                    <!-- Anrede -->
                    <div style="margin-bottom:16px;font-size:12pt;">
                      ${greeting}
                    </div>

                    <!-- Text -->
                    <div style="margin-bottom:24px;font-size:12pt;text-align:justify;">
                      ${bodyContent}
                    </div>

                    <!-- Grußformel -->
                    <div style="margin-bottom:28px;font-size:12pt;">
                      ${closing}
                    </div>

                    <!-- Unterschrift -->
                    <div style="font-size:12pt;font-weight:bold;">
                      ${sender?.signature ? `<img src="${sender.signature}" alt="Unterschrift" style="height:60px;display:block;margin-bottom:8px;" />` : ''}
                      ${senderName || ''}
                    </div>
                  </td>
                </tr>
              </table>
              <div style="color:#6b7280;font-size:11px;margin-top:10px;">Gesendet über ${BRAND?.name || 'Widerspruch24'}</div>
            </td>
          </tr>
        </table>
      </body>
    </html>`;
  };

  const ensureExportAllowance = async () => {
    // Beta-Freigabe: während der Beta keine Limits/Paywall
    if (betaUnlocked) return true;

    // Order: subscription > credits > one_time > trial(2/30d)
    try {
      // Logged-in user path
      const user = await User.me().catch(() => null);
      if (user && user.id) {
        // Subscription quota
        const mq = user.monthly_quota || 0;
        const used = user.monthly_quota_used || 0;
        if ((user.subscription_status === 'active' || user.subscription_status === 'trialing') && mq > used) {
          await User.updateMyUserData({ monthly_quota_used: used + 1 });
          return true;
        }
        // Credits
        const credits = user.credits || 0;
        if (credits > 0) {
          await User.updateMyUserData({ credits: credits - 1 });
          return true;
        }
        // One-time exports
        const one = user.one_time_exports || 0;
        if (one > 0) {
          await User.updateMyUserData({ one_time_exports: one - 1 });
          return true;
        }
        // Trial 2 exports per 30 days
        const now = new Date();
        let periodStart = user.trial_free_period_start ? new Date(user.trial_free_period_start) : null;
        if (!periodStart || (now.getTime() - periodStart.getTime()) > 30 * 24 * 60 * 60 * 1000) {
          periodStart = now;
          await User.updateMyUserData({ trial_free_period_start: periodStart.toISOString(), trial_free_exports_used: 0 });
        }
        const usedFree = user.trial_free_exports_used || 0;
        if (usedFree < 2) {
          await User.updateMyUserData({ trial_free_exports_used: usedFree + 1 });
          return true;
        }
        return false;
      }

      // Guest path: prefer entity updates only if id exists, otherwise localStorage fallback
      const now = new Date();

      // Fallback store
      const statsKey = 'w24_guest_stats';
      const loadStats = () => {
        try { return JSON.parse(localStorage.getItem(statsKey) || '{}'); } catch { return {}; }
      };
      const saveStats = (s) => { try { localStorage.setItem(statsKey, JSON.stringify(s)); } catch {} };

      if (guestSession?.id) {
        // Server-backed guest session
        let periodStart = guestSession.free_exports_period_start ? new Date(guestSession.free_exports_period_start) : null;
        if (!periodStart || (now.getTime() - periodStart.getTime()) > 30 * 24 * 60 * 60 * 1000) {
          periodStart = now;
          try { await window.app.entities.GuestSession.update(guestSession.id, { free_exports_period_start: periodStart.toISOString(), free_exports_used: 0 }); } catch {}
        }
        const usedFree = guestSession.free_exports_used || 0;
        if (usedFree < 2) {
          try { await window.app.entities.GuestSession.update(guestSession.id, { free_exports_used: usedFree + 1 }); } catch {}
          return true;
        }
        return false;
      } else {
        // Pure local guest session (no API calls to avoid 403)
        const stats = loadStats();
        let periodStart = stats.free_exports_period_start ? new Date(stats.free_exports_period_start) : null;
        if (!periodStart || (now.getTime() - periodStart.getTime()) > 30 * 24 * 60 * 60 * 1000) {
          periodStart = now;
          stats.free_exports_period_start = periodStart.toISOString();
          stats.free_exports_used = 0;
          saveStats(stats);
        }
        const usedFree = Number(stats.free_exports_used || 0);
        if (usedFree < 2) {
          stats.free_exports_used = usedFree + 1;
          saveStats(stats);
          return true;
        }
        return false;
      }
    } catch (e) {
      console.error('ensureExportAllowance error:', e);
      return false;
    }
  };

  const handleDownloadTxt = async () => {
    // analytics attempt
    try { trackEvent('export_attempt', { channel: 'txt', caseId: caseData?.id, brand: 'widerspruch24' }); } catch {}

    if (!isTermsAccepted) {
      setError('Bitte stimmen Sie zuerst den AGB zu, um fortzufahren.');
      return;
    }
    if (guestExpired && !betaUnlocked) { // Use betaUnlocked here
      setShowExpiredModal(true);
      return;
    }
    
    if (!canProceed) {
      setError('Bitte bestätigen Sie zuerst alle erforderlichen Hinweise.');
      return;
    }

    const allowed = await ensureExportAllowance();
    if (!allowed) {
      window.location.href = createPageUrl("ChoosePlan");
      return;
    }
    
    const fullContent = constructFullLetter();
    const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Schreiben_${caseData?.reference_number || caseData?.id?.slice(0,6) || 'Entwurf'}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    try { trackEvent('export_success', { channel: 'txt', caseId: caseData?.id, brand: 'widerspruch24' }); } catch {}
  };

  const handleDownloadPdf = async () => {
    try { trackEvent('export_attempt', { channel: 'pdf', caseId: caseData?.id, brand: 'widerspruch24' }); } catch {}
    if (!isTermsAccepted) {
      setError('Bitte stimmen Sie zuerst den AGB zu, um fortzufahren.');
      return false;
    }
    if (guestExpired && !betaUnlocked) { // Use betaUnlocked here
      setShowExpiredModal(true);
      return false; // Indicate failure
    }
    
    if (!canProceed) {
      setError('Bitte bestätigen Sie zuerst alle erforderlichen Hinweise.');
      return false; // Indicate failure
    }

    const allowed = await ensureExportAllowance();
    if (!allowed) {
      window.location.href = createPageUrl("ChoosePlan");
      return false; // Indicate failure
    }
    
    setIsDownloadingPdf(true);
    setError('');
    
    try {
      const letterElement = document.getElementById('letter-content');
      if (!letterElement) {
        setError("Fehler: Briefelement für PDF-Generierung nicht gefunden.");
        setIsDownloadingPdf(false);
        return false; // Indicate failure
      }

      // Lazy-load heavy libs for faster initial load
      const [{ jsPDF }, html2canvasMod] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ]);
      const html2canvas = html2canvasMod.default || html2canvasMod;

      const scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      const canvas = await html2canvas(letterElement, {
        scale,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Use JPEG for smaller PDFs, keep high quality
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Bildbreite an Seitenbreite anpassen
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const fileName = `Schreiben_${caseData?.reference_number || caseData?.id?.slice(0,6) || 'Entwurf'}.pdf`;
      pdf.setProperties({
        title: fileName,
        subject: 'Widerspruchsschreiben',
        author: BRAND?.name || 'Widerspruch24',
        keywords: 'Widerspruch, PDF',
        creator: BRAND?.name || 'Widerspruch24'
      });

      if (imgHeight <= pdfHeight) {
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
      } else {
        // Mehrseitiger Export: Bild nach unten versetzt wiederholt einsetzen
        let heightLeft = imgHeight;
        let position = 0;
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
        while (heightLeft > 0) {
          pdf.addPage();
          position = - (imgHeight - heightLeft);
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pdfHeight;
        }
      }

      pdf.save(fileName);
      try { trackEvent('export_success', { channel: 'pdf', caseId: caseData?.id, brand: 'widerspruch24' }); } catch {}
      return true; // Indicate success

    } catch (err) {
      console.error('PDF Generation Error:', err);
      setError('PDF-Generierung fehlgeschlagen. Bitte versuchen Sie es mit dem TXT-Download.');
      return false; // Indicate failure
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSendEmail = async () => {
    try { trackEvent('export_attempt', { channel: 'email', caseId: caseData?.id, brand: 'widerspruch24', mode: sendMode }); } catch {}
    if (!isTermsAccepted) {
      setError('Bitte stimmen Sie zuerst den AGB zu, um fortzufahren.');
      return;
    }
    if (guestExpired && !betaUnlocked) {
      setShowExpiredModal(true);
      return;
    }
    if (!emailAddress) {
      setError(t('documentActions.emailRequired'));
      return;
    }
    if (!canProceed) {
      setError('Bitte bestätigen Sie zuerst alle erforderlichen Hinweise.');
      return;
    }
    const allowed = await ensureExportAllowance();
    if (!allowed) {
      window.location.href = createPageUrl("ChoosePlan");
      return;
    }

    setIsSendingEmail(true);
    setError('');

    try {
      const recipientEmail = emailAddress;
      const senderName = caseData?.parties?.sender?.name || caseData?.customer_name || '';
      const subject = `Ihr Schreiben bezüglich: ${caseData?.reference_number || caseData?.shortcodesRaw?.substring(0, 60) || 'Widerspruch'}`;

      if (sendMode === 'directHtml') {
        // Send formatted HTML email directly via Core integration
        const htmlBody = buildEmailHtml();
        await base44.integrations.Core.SendEmail({
          to: recipientEmail,
          subject,
          body: htmlBody,
          from_name: BRAND?.name || senderName || 'Widerspruch24'
        });
        setEmailSent(true);
        setShowEmailForm(false);
        try { trackEvent('export_success', { channel: 'email', mode: 'direct_html', caseId: caseData?.id, brand: 'widerspruch24' }); } catch {}
        setTimeout(() => setEmailSent(false), 8000);
      } else { // sendMode === 'mailto'
        // Legacy: open default mail client (plain text), and help user attach PDF
        const pdfDownloadedSuccessfully = await handleDownloadPdf();
        if (!pdfDownloadedSuccessfully) {
          setIsSendingEmail(false);
          return;
        }
        const coreText = (typeof generatedText === 'string' && generatedText.trim().length > 0)
          ? htmlToText(generatedText).trim()
          : constructFullLetter();
        const emailBody = `Sehr geehrte Damen und Herren,

${coreText}

Mit freundlichen Grüßen
${senderName}`;
        const mailtoLink = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
        window.location.href = mailtoLink;
        setEmailSent(true);
        setShowEmailForm(false);
        try { trackEvent('export_success', { channel: 'email', mode: 'mailto', caseId: caseData?.id, brand: 'widerspruch24' }); } catch {}
        setTimeout(() => setEmailSent(false), 8000);
      }
    } catch (error) {
      console.error('Email send failed:', error);
      setError(t('documentActions.emailSendError'));
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <>
      <div aria-live="polite" role="status" className="sr-only">
        {isDownloadingPdf ? 'PDF wird erstellt…' : ''}
        {emailSent ? 'E-Mail erfolgreich vorbereitet oder gesendet' : ''}
        {error ? `Fehler: ${error}` : ''}
      </div>
      <div className="glass rounded-3xl p-6">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            <Download className="w-5 h-5" />
            {t('documentActions.documentActionsTitle')}
          </h3>
          <p className="text-white/80">{t('documentActions.documentActionsSubtitle')}</p>
        </div>

        {error && <Alert className="glass border-red-500/50 mb-6"><AlertDescription className="text-white">{error}</AlertDescription></Alert>}
        {emailSent && (
          <Alert className="glass border-green-500/50 mb-6">
            <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
            <AlertDescription className="text-white">
              ✅ {sendMode === 'directHtml' ? 'E-Mail wurde erfolgreich gesendet!' : 'E-Mail-Programm geöffnet! Das PDF wurde heruntergeladen. Fügen Sie es als Anhang hinzu.'}
            </AlertDescription>
          </Alert>
        )}

        {/* AGB-Zustimmung vor Download */}
        <div className="mb-6">
          <div className="flex items-start gap-3 glass rounded-lg p-4 border border-white/20">
            <Checkbox
              id="terms-download"
              checked={isTermsAccepted}
              onCheckedChange={setIsTermsAccepted}
              className="mt-1"
              aria-label="Ich habe die AGB gelesen und stimme diesen zu."
            />
            <label htmlFor="terms-download" className="text-sm text-white/80 text-left">
              Ich habe die <Link to={createPageUrl("Agb")} target="_blank" className="underline hover:text-white">AGB</Link> gelesen und stimme diesen zu. Bei Fragen zum <Link to={createPageUrl("Agb")} target="_blank" className="underline hover:text-white">Widerrufsrecht</Link> finden Sie alle Informationen in unseren Bedingungen.
            </label>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* PDF Download */}
          <Button 
            type="button"
            aria-label="PDF herunterladen"
            onClick={handleDownloadPdf} 
            disabled={isDownloadingPdf || !isTermsAccepted || !canProceed} 
            className="glass text-white border-white/30 hover:glow transition-all duration-300 py-6 text-lg"
          >
            {isDownloadingPdf ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{t('documentActions.downloading')}</> : <><FileType className="w-5 h-5 mr-2" />PDF</>}
          </Button>

          {/* TXT Download */}
          <Button 
            type="button"
            aria-label="TXT herunterladen"
            onClick={handleDownloadTxt} 
            disabled={!isTermsAccepted || !canProceed}
            variant="outline" 
            className="glass border-white/30 text-white hover:bg-white/10 py-6 text-lg"
          >
            <FileText className="w-5 h-5 mr-2" />TXT
          </Button>

          {/* Email */}
          <Button 
            type="button"
            aria-label="E-Mail senden"
            onClick={() => setShowEmailForm(!showEmailForm)} 
            disabled={!isTermsAccepted || !canProceed}
            variant="outline" 
            className="glass border-white/30 text-white hover:bg-white/10 py-6 text-lg lg:col-span-1"
          >
            <Mail className="w-5 h-5 mr-2" />{t('documentActions.sendEmail')}
          </Button>
        </div>

        {showEmailForm && (
          <Card className="glass border-white/20 mt-6">
            <CardHeader><CardTitle className="text-white text-lg">{t('documentActions.emailFormTitle')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-white mb-2 block">{t('documentActions.emailAddress')}</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={emailAddress} 
                  onChange={(e) => setEmailAddress(e.target.value)} 
                  className="glass border-white/30 text-white placeholder-white/60" 
                  placeholder="behoerde@beispiel.de"
                  required
                />
              </div>

              {/* Versandmodus */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-white/80 text-sm mr-2">Versandmodus:</span>
                <Button
                  type="button"
                  variant={sendMode === 'directHtml' ? 'default' : 'outline'}
                  className={`h-8 px-3 ${sendMode === 'directHtml' ? 'bg-blue-600 hover:bg-blue-700' : 'glass border-white/30 text-white hover:bg-white/10'}`}
                  onClick={() => setSendMode('directHtml')}
                >
                  Direkt versenden (HTML)
                </Button>
                <Button
                  type="button"
                  variant={sendMode === 'mailto' ? 'default' : 'outline'}
                  className={`h-8 px-3 ${sendMode === 'mailto' ? 'bg-blue-600 hover:bg-blue-700' : 'glass border-white/30 text-white hover:bg-white/10'}`}
                  onClick={() => setSendMode('mailto')}
                >
                  E‑Mail‑Programm öffnen
                </Button>
              </div>

              <div className="p-3 glass rounded-lg border border-blue-400/30">
                <p className="text-blue-200 text-sm">
                  💡 <strong>Hinweis:</strong>
                </p>
                <ul className="text-blue-200/80 text-sm mt-2 space-y-1 list-disc list-inside">
                  {sendMode === 'directHtml' ? (
                    <>
                      <li>Der Brief wird formatiert (HTML) direkt als E‑Mail gesendet.</li>
                      <li>Für Anhänge (PDF) nutzen Sie bitte die Option „E‑Mail‑Programm öffnen“.</li>
                    </>
                  ) : (
                    <>
                      <li>Das PDF wird automatisch heruntergeladen.</li>
                      <li>Ihr E‑Mail‑Programm öffnet sich mit vorbefülltem Text.</li>
                      <li>Fügen Sie das PDF als Anhang hinzu und senden Sie ab.</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="flex justify-end gap-3">
                <Button onClick={() => setShowEmailForm(false)} variant="outline" className="glass border-white/30 text-white hover:bg-white/10">{t('common.cancel')}</Button>
                <Button 
                  onClick={handleSendEmail} 
                  disabled={isSendingEmail || !emailAddress || !isTermsAccepted || !canProceed} 
                  className="glass text-white border-white/30 hover:glow transition-all duration-300"
                >
                  {isSendingEmail ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Vorbereiten...</> : <><Mail className="w-4 h-4 mr-2" />{sendMode === 'directHtml' ? 'Direkt senden' : 'E‑Mail öffnen'}</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {betaUnlocked && (
          <div className="mt-6 p-4 glass rounded-lg border border-green-400/30">
            <p className="text-green-200 text-sm text-center">🎯 <strong>Beta-Vollzugriff:</strong> Alle Funktionen sind 30 Tage kostenfrei verfügbar.</p>
          </div>
        )}
      </div>

      <GuestExpiredModal isOpen={showExpiredModal} onClose={() => setShowExpiredModal(false)} />
    </>
  );
}