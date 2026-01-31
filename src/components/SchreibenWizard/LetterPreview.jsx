import React, { useState, useEffect } from 'react';
import { Letter } from '@/entities/Letter';
import { generateLetter } from '@/functions/generateLetter';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGuestSession } from '@/components/hooks/useGuestSession';
import DocumentActions from '@/components/DocumentActions';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import KILawyer from '@/components/animations/KILawyer';
import RichTextEditor from '@/components/editors/RichTextEditor';

export default function LetterPreview({ letterId, t, language, onBack }) {
  const [letter, setLetter] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDisclaimerAccepted, setIsDisclaimerAccepted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedDraft, setEditedDraft] = useState('');
  
  const { isGuest, guestExpired } = useGuestSession(language);
  const isBetaMode = isGuest && !guestExpired;

  const FULL_MARK = '<!-- FULL_LETTER -->';

  const buildFullLetterHTML = (contentHTML) => {
    const dateStr = format(new Date(), 'd. MMMM yyyy', { locale: de });
    const sender = letter?.parties?.sender || {};
    const recipient = letter?.parties?.recipient || {};
    const _s = t ? t('letter.previewTitle') : '';
    const subjectText = _s && _s !== 'letter.previewTitle' ? _s : 'Widerspruch'; // DIN: Betreff fett
    const _g = t ? t('letterGreeting') : '';
    const greetingText = _g && _g !== 'letterGreeting' ? _g : 'Sehr geehrte Damen und Herren,';
    const _c = t ? t('letterClosing') : '';
    const closingText = _c && _c !== 'letterClosing' ? _c : 'Mit freundlichen Grüßen';

    const body = (() => {
      const isContentHTML = typeof contentHTML === 'string' && /<\/?[a-z][\s\S]*>/i.test(contentHTML);
      if (isContentHTML) return contentHTML;
      // Convert plain text to HTML with pre-line for preserving whitespace/line breaks
      return `<div style="white-space:pre-line">${(contentHTML || '').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`;
    })();

    return `${FULL_MARK}
    <div style="font-family:'Times New Roman','Liberation Serif',serif; font-size:12pt; line-height:1.5; color:#000;">
      <div style="height:0.4cm; overflow:hidden; white-space:nowrap; border-bottom:1px solid #000; padding-bottom:2pt; margin-bottom:12pt;">
        ${[sender.name, sender.strasse, `${sender.plz||''} ${sender.ort||''}`].filter(Boolean).join(', ')}
      </div>
      <div style="margin-top:2cm; margin-bottom:2cm;">
        <div style="font-weight:bold; margin-bottom:0.5cm;">${recipient.name || ''}</div>
        ${[recipient.strasse, `${recipient.plz||''} ${recipient.ort||''}`].filter(Boolean).map(l => `<div style="margin-bottom:0.2cm;">${l}</div>`).join('')}
      </div>
      <div style="text-align:right; margin-bottom:2cm;">${(sender.ort || 'Musterstadt')}, den ${dateStr}</div>
      <div style="margin-bottom:2cm; font-weight:bold;">${subjectText}</div>
      <div style="margin-bottom:1.5cm;">${greetingText}</div>
      <div style="margin-bottom:2cm; text-align:justify;">
        ${body}
      </div>
      <div style="margin-bottom:3cm;">${closingText}</div>
      <div style="font-weight:bold;">${sender.name || ''}</div>
    </div>`;
  };

  const isFullLetter = typeof editedDraft === 'string' && editedDraft.includes(FULL_MARK);

  useEffect(() => {
    const fetchAndGenerate = async () => {
      if (!letterId) {
        setError('Keine Brief-ID gefunden.');
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError('');
      
      try {
        let fetchedLetter = await Letter.get(letterId);
        
        // Initialize editor content
        if (fetchedLetter?.draft) {
          setEditedDraft(fetchedLetter.draft);
        }

        // Generate text if not present
        if (!fetchedLetter.draft) {
          const { data } = await generateLetter({ letterData: fetchedLetter });
          
          if (data.error) {
            throw new Error(data.error);
          }
          
          const updatedLetter = await Letter.update(letterId, { draft: data.generatedText });
          setLetter(updatedLetter);
          setEditedDraft(updatedLetter.draft || data.generatedText);
        } else {
          setLetter(fetchedLetter);
        }
        
      } catch (err) {
        setError('Fehler beim Laden oder Generieren des Entwurfs: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAndGenerate();
  }, [letterId]);

  useEffect(() => {
    // When entering editing mode, if it's not already a full letter, generate the full HTML structure
    if (editing && !isFullLetter && letter) {
      setEditedDraft(buildFullLetterHTML(letter?.draft || ''));
    }
   
  }, [editing, letter, t]); // Added letter and t as dependencies for buildFullLetterHTML

  const saveEditedDraft = async () => {
    if (!letter) return;
    const updated = await Letter.update(letter.id, { draft: editedDraft });
    setLetter(updated);
    setEditing(false);
  };
  
  const needsKündigungDisclaimer = letter?.shortcodesRaw?.toLowerCase().includes('kündig');

  const isHTML = typeof editedDraft === 'string' && /<\/?[a-z][\s\S]*>/i.test(editedDraft);

  if (isLoading) {
    return (
      <div className="text-center py-20">
        <div className="max-w-3xl mx-auto">
          <KILawyer
            message={t('letter.loadingDraft')}
            subMessage={t('preview.generatingDesc')}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-2xl p-8 text-center text-red-400">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
        <p className="font-bold">Fehler</p>
        <p>{error}</p>
        <Button onClick={onBack} variant="outline" className="mt-6 glass border-white/30 text-white hover:bg-white/10">
          Zurück und erneut versuchen
        </Button>
      </div>
    );
  }

  const canProceed = needsKündigungDisclaimer ? isDisclaimerAccepted : true;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">{t('letter.previewTitle')}</h2>
        <p className="text-white/80">{t('letter.previewSubtitle')}</p>
      </div>
      
      {/* Editor Toggle + Editable area */}
      <div className="flex items-center gap-3">
        <Button variant="outline" className="glass border-white/30 text-white hover:bg-white/10" onClick={() => setEditing(!editing)}>
          {editing ? 'Bearbeitung beenden' : 'Entwurf bearbeiten (Word‑Modus)'}
        </Button>
        {editing && (
          <Button className="glass text-white border-white/30 hover:glow" onClick={saveEditedDraft}>
            Speichern
          </Button>
        )}
      </div>

      {/* Externe Toolbar nur im Edit‑Modus */}
      {editing && (
        <div id="letter-toolbar-letter" className="ql-toolbar ql-snow no-print glass rounded-xl p-2 border-white/30">
          <span className="ql-formats">
            <select className="ql-font">
              <option value="serif" selected>Serif</option>
              <option value="sans-serif">Sans</option>
              <option value="monospace">Mono</option>
              <option value="Dancing">Schreibschrift</option>
            </select>
            <select className="ql-size">
              <option value="small"></option>
              <option selected></option>
              <option value="large"></option>
              <option value="huge"></option>
            </select>
          </span>
          <span className="ql-formats">
            <button className="ql-bold"></button>
            <button className="ql-italic"></button>
            <button className="ql-underline"></button>
          </span>
          <span className="ql-formats">
            <select className="ql-color"></select>
          </span>
          <span className="ql-formats">
            <select className="ql-align"></select>
          </span>
          <span className="ql-formats">
            <button className="ql-clean"></button>
          </span>
        </div>
      )}

      {/* DIN 5008 Layout Preview mit voll editierbarem Inhalt */}
      <div 
        id="letter-content" 
        className="bg-white text-black shadow-xl max-w-[21cm] mx-auto mt-6"
        style={{
          fontFamily: "'Liberation Serif', 'Times New Roman', serif",
          fontSize: '11pt',
          lineHeight: '1.5',
          width: '21cm',
          minHeight: '29.7cm',
          boxSizing: 'border-box',
          padding: '2cm 2.5cm',
          position: 'relative'
        }}
      >
        {editing ? (
          <RichTextEditor value={editedDraft} onChange={setEditedDraft} toolbarId="letter-toolbar-letter" />
        ) : (
          (typeof editedDraft === 'string' && editedDraft.includes(FULL_MARK)) ? (
            <div dangerouslySetInnerHTML={{ __html: editedDraft }} />
          ) : (
            isHTML ? (
              <div dangerouslySetInnerHTML={{ __html: editedDraft }} />
            ) : (
              <pre className="whitespace-pre-wrap font-sans" style={{fontFamily: "'Liberation Serif', 'Times New Roman', serif"}}>
                {editedDraft || 'Entwurf wird geladen...'}
              </pre>
            )
          )
        )}
      </div>
      
      {/* Disclaimers */}
      <div className="space-y-4">
        <div className="glass p-4 rounded-lg border border-amber-500/30">
          <p className="text-amber-200 text-sm">{t('letter.disclaimer')}</p>
        </div>
        {needsKündigungDisclaimer && (
          <div className="glass p-4 rounded-lg border border-red-500/30">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="disclaimer-kündigung"
                checked={isDisclaimerAccepted}
                onChange={(e) => setIsDisclaimerAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 accent-red-400"
              />
              <label htmlFor="disclaimer-kündigung" className="text-red-200 text-sm cursor-pointer">
                {t('letter.disclaimerKündigung')}
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <DocumentActions 
        caseData={letter}
        generatedText={letter?.draft} // Keep original draft for actions, or adjust if full HTML should be used
        isGuest={isGuest}
        guestExpired={guestExpired}
        isBetaMode={isBetaMode}
        contentType="letter"
        canProceed={canProceed}
      />
      
      <div className="flex justify-start mt-8">
        <Button onClick={onBack} variant="outline" className="glass border-white/30 text-white hover:bg-white/10">
          Zurück zum Inhalt
        </Button>
      </div>
    </div>
  );
}