import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Edit3, Save, Gavel } from 'lucide-react';
import { format } from 'date-fns';
import { de, enGB } from 'date-fns/locale';
import RichTextEditor from '@/components/editors/RichTextEditor';
import { legalResearch } from '@/functions/legalResearch';

const EditableLetterPreview = ({
  caseData,
  generatedText,
  t,
  language = 'de',
  onSave,
  readonly = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editableText, setEditableText] = useState(generatedText || '');

  const [senderData, setSenderData] = useState({
    name: '',
    street: '',
    zip_code: '',
    city: ''
  });

  const [researchLoading, setResearchLoading] = useState(false);

  // Placeholder for full letter content
  const FULL_MARK = '<!-- FULL_LETTER -->';

  useEffect(() => {
    if (generatedText) {
      setEditableText(generatedText);
    }
  }, [generatedText]);

  useEffect(() => {
    // Fülle Kundendaten aus dem Case oder setze Defaults
    if (caseData?.sender_data && caseData.sender_data.name) {
      setSenderData(caseData.sender_data);
    } else if (caseData?.customer_name) {
      const addressParts = (caseData.customer_address || '').split('\n');
      const streetLine = addressParts[0] || '';
      const cityLine = addressParts[1] || '';
      const cityParts = cityLine.match(/^(\d{5})\s+(.+)$/) || [];

      setSenderData({
        name: caseData.customer_name,
        street: streetLine,
        zip_code: cityParts[1] || '',
        city: cityParts[2] || cityLine
      });
    }
  }, [caseData]);

  // Verstärkter Kopierschutz
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isEditing) { // Apply protection only when not editing
        // Verhindere Ctrl+C, Ctrl+A, Ctrl+S, F12, etc.
        // Also check for common developer tool shortcuts
        if (
          (e.ctrlKey && (e.key === 'c' || e.key === 'a' || e.key === 's' || e.key === 'x')) || // Basic copy/cut/select all/save for Windows/Linux
          (e.metaKey && (e.key === 'c' || e.key === 'a' || e.key === 's' || e.key === 'x')) || // Basic copy/cut/select all/save for Mac
          e.key === 'F12' || // Developer tools
          (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || // Chrome/Edge DevTools
          (e.metaKey && e.altKey && e.key === 'i') // macOS Safari/Chrome DevTools
        ) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    const handleContextMenu = (e) => {
      if (!isEditing) { // Apply protection only when not editing
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleSelectStart = (e) => {
      if (!isEditing) { // Apply protection only when not editing
        e.preventDefault();
      }
    };

    const handleDragStart = (e) => {
      if (!isEditing) { // Apply protection only when not editing
        e.preventDefault();
      }
    };

    // Use `true` for capture phase to ensure these handlers run before native ones
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('selectstart', handleSelectStart, true);
    document.addEventListener('dragstart', handleDragStart, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('selectstart', handleSelectStart, true);
      document.removeEventListener('dragstart', handleDragStart, true);
    };
  }, [isEditing]); // Re-run effect when isEditing status changes

  const dateLocale = language === 'de' ? de : enGB;

  const formatSafeDate = (dateString) => {
    if (!dateString) return '...';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '...';
      return format(date, 'dd.MM.yyyy');
    } catch { return '...'; }
  };

  const cityOnly = (fullCity) => {
    if (!fullCity) return 'Musterstadt';
    return fullCity.replace(/^\d{5}\s+/, '');
  };

  const handleInsertResearch = async () => {
    try {
      setResearchLoading(true);
      const facts = {
        reason: caseData?.objection_reason || caseData?.custom_reason || caseData?.facts?.reason,
        amount_total: caseData?.facts?.amount_total,
        due_since_date: caseData?.facts?.due_since_date,
        frist_tage: caseData?.facts?.frist_tage || 14,
        reference: caseData?.reference_number,
      };
      const { data } = await legalResearch({ topic: 'Widerspruch', facts, language });
      const r = data?.research || data || {};

      const esc = (s) => String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      const statutes = (r.statutes || []).map(s => (
        `<li><strong>${esc(s.paragraph)} ${esc(s.law)}</strong> – ${esc(s.summary)} <a href="${esc(s.source_url)}" target="_blank" rel="noopener">Quelle</a></li>`
      )).join('');

      const cases = (r.case_law || []).map(c => (
        `<li><strong>${esc(c.court)}</strong>, ${esc(c.date)}, Az. ${esc(c.docket_number)} – ${esc(c.holding)} <a href="${esc(c.source_url)}" target="_blank" rel="noopener">Quelle</a></li>`
      )).join('');

      const counters = (r.counterarguments || []).map(x => (
        `<li><em>${esc(x.argument)}</em>: ${esc(x.refutation)}</li>`
      )).join('');

      const sources = (r.additional_sources || []).map(u => (
        `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a></li>`
      )).join('');

      const section = `
        <hr />
        <h3>Rechtsgrundlagen und Rechtsprechung (automatisch recherchiert)</h3>
        <h4>Gesetzliche Grundlagen</h4>
        <ul>${statutes}</ul>
        <h4>Rechtsprechung</h4>
        <ul>${cases}</ul>
        ${counters ? `<h4>Typische Gegenargumente und Entkräftung</h4><ul>${counters}</ul>` : ''}
        ${sources ? `<h4>Weitere Quellen</h4><ul>${sources}</ul>` : ''}
      `;

      setEditableText(prev => (prev || '') + section);
      if (!isEditing) setIsEditing(true);
    } finally {
      setResearchLoading(false);
    }
  };

  const buildFullLetterHTML = () => {
    const now = new Date();
    const currentDateFormatted = isNaN(now.getTime()) ? '' : format(now, 'd. MMMM yyyy', { locale: dateLocale });
    const documentDate = formatSafeDate(caseData.document_date);
    const ref = caseData.reference_number || '';
    const _subject = t ? t('letterSubject', { date: documentDate, reference: ref }) : '';
    const subjectText = _subject && _subject !== 'letterSubject' ? _subject : `Widerspruch gegen Bescheid vom ${documentDate}${ref ? ` – AZ: ${ref}` : ''}`;
    const _greet = t ? t('letterGreeting') : '';
    const greetingText = _greet && _greet !== 'letterGreeting' ? _greet : 'Sehr geehrte Damen und Herren,';
    const _close = t ? t('letterClosing') : '';
    const closingText = _close && _close !== 'letterClosing' ? _close : 'Mit freundlichen Grüßen';
    const signatureImg = caseData?.sender_data?.signature ? `<img src="${caseData.sender_data.signature}" alt="Unterschrift" loading="lazy" style="height:2cm;margin-bottom:0.4cm;" />` : '';
    const senderLine = `${senderData.name || ''}, ${senderData.street || ''}, ${senderData.zip_code || ''} ${senderData.city || ''}`;

    const body = (() => {
      const isHTML = typeof editableText === 'string' && /<\/?[a-z][\s\S]*>/i.test(editableText);
      if (isHTML) return editableText;
      return `<div style="white-space:pre-line">${(editableText || '').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`;
    })();

    // Note: The outer div with Times New Roman is removed here as it's applied to the main #letter-content for the RTE.
    // The individual elements' styles (font-size, line-height) are kept as these are what quill generates or expects.
    return `${FULL_MARK}
    <div>
      <!-- Absenderzeile für Fensterumschlag (Position nach DIN 5008) -->
      <div style="height:0.4cm; overflow:hidden; white-space:nowrap; border-bottom:1px solid #000; padding-bottom:2pt; margin-bottom:12pt; font-size:8pt; line-height:1.2; color:#666;">
        ${senderLine}
      </div>

      <!-- Empfänger -->
      <div style="margin-top:2cm; margin-bottom:2cm; line-height:1.3; font-size:12pt;">
        <div style="font-weight:bold; margin-bottom:0.5cm;">
          ${caseData.sender_name || ''}
        </div>
        ${(caseData.sender_address || '').split('\n').map(l => `<div style="margin-bottom:0.2cm;">${l}</div>`).join('')}
      </div>

      <!-- Datum -->
      <div style="text-align:right; margin-bottom:2cm; font-size:12pt;">
        ${cityOnly(senderData.city || 'Musterstadt')}, den ${currentDateFormatted}
      </div>

      <!-- Betreff -->
      <div style="margin-bottom:2cm; font-size:12pt;">
        <div style="font-weight:bold;">${subject}</div>
      </div>

      <!-- Anrede -->
      <div style="margin-bottom:1.5cm; font-size:12pt;">
        ${greeting}
      </div>

      <!-- Brieftext -->
      <div style="margin-bottom:2cm; font-size:12pt; line-height:1.5; text-align:justify;">
        ${body}
      </div>

      <!-- Grußformel -->
      <div style="margin-bottom:3cm; font-size:12pt;">
        ${closing}
      </div>

      <!-- Unterschrift + Name -->
      <div style="font-size:12pt; font-weight:bold;">
        ${signatureImg}
        ${senderData.name || ''}
      </div>
    </div>`;
  };

  const isFullLetter = typeof editableText === 'string' && editableText.includes(FULL_MARK);

  // Beim Start der Bearbeitung ggf. in Voll-Brief umwandeln
  useEffect(() => {
    if (isEditing && !isFullLetter && caseData) {
      setEditableText(buildFullLetterHTML());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    onSave?.(editableText, senderData);
  };

  const handleSenderChange = (field, value) => {
    setSenderData(prev => ({ ...prev, [field]: value }));
  };

  // Erkennen, ob HTML formatiert ist (for non-full-letter mode)
  const isBodyHTML = typeof editableText === 'string' && /<\/?[a-z][\s\S]*>/i.test(editableText);

  const currentDate = format(new Date(), 'd. MMMM yyyy', { locale: dateLocale });

  // Guard render after all hooks are defined to keep hook order stable
  if (!caseData) return null;

  return (
    <div className="space-y-4">
      {/* Edit Controls */}
      {!readonly && (
        <div className="flex justify-between items-center not-prose">
          <h3 className="text-lg font-semibold text-white">Ihr Widerspruch</h3>
          <div className="flex gap-2">
            {isEditing ? (
              <Button onClick={handleSave} className="glass text-white border-white/30 hover:glow" size="sm">
                <Save className="w-4 h-4 mr-2" /> Speichern
              </Button>
            ) : (
              <Button onClick={() => setIsEditing(true)} variant="outline" className="glass border-white/30 text-white hover:bg-white/10" size="sm">
                <Edit3 className="w-4 h-4 mr-2" /> Bearbeiten (Word-Modus)
              </Button>
            )}
            <Button onClick={handleInsertResearch} disabled={researchLoading} className="glass text-white border-white/30 hover:glow" size="sm">
              <Gavel className="w-4 h-4 mr-2" /> {researchLoading ? 'Recherche läuft…' : 'Rechtsrecherche einfügen'}
            </Button>
            </div>
        </div>
      )}

      {/* Externe Toolbar direkt über dem Brief – wird NICHT mit ins PDF gerendert */}
      {isEditing && (
        <div id="letter-toolbar" className="ql-toolbar ql-snow no-print glass rounded-xl p-2 border-white/30">
          <span className="ql-formats">
            <select className="ql-font">
              <option value="serif" selected>Serif (Times)</option>
              <option value="sans-serif">Sans</option>
              <option value="monospace">Mono</option>
              <option value="Dancing">Schreibschrift</option>
            </select>
            <select className="ql-size">
              <option value="small">Klein</option>
              <option value="" selected>Normal</option>
              <option value="large">Groß</option>
              <option value="huge">Sehr Groß</option>
            </select>
          </span>
          <span className="ql-formats">
            <button className="ql-bold"></button>
            <button className="ql-italic"></button>
            <button className="ql-underline"></button>
          </span>
          <span className="ql-formats">
            <select className="ql-color"></select>
            <select className="ql-background"></select>
          </span>
          <span className="ql-formats">
            <select className="ql-align"></select>
          </span>
          <span className="ql-formats">
            <button className="ql-list" value="ordered"></button>
            <button className="ql-list" value="bullet"></button>
            <button className="ql-indent" value="-1"></button>
            <button className="ql-indent" value="+1"></button>
          </span>
          <span className="ql-formats">
            <button className="ql-link"></button>
            <button className="ql-image"></button>
          </span>
          <span className="ql-formats">
            <button className="ql-clean"></button>
          </span>
        </div>
      )}

      {/* A4-Container – kompletter Brief ist editierbar */}
      <div
        id="letter-content"
        role="document"
        aria-label="Briefvorschau"
        lang={language || 'de'}
        className="bg-white text-black shadow-xl max-w-[21cm] mx-auto print:bg-white"
        style={{
          fontFamily: "'Times New Roman', 'Liberation Serif', serif", // Klassische Schrift für Briefe
          fontSize: '12pt',
          lineHeight: '1.4',
          width: '21cm',
          minHeight: '29.7cm',
          boxSizing: 'border-box',
          padding: isEditing && isFullLetter ? '2cm 2.5cm' : '4.5cm 2.5cm 2cm 2.5cm', // DIN 5008: oben 4.5cm for Adressfeld; 2cm 2.5cm for full RTE
          userSelect: isEditing ? 'auto' : 'none',
          WebkitUserSelect: isEditing ? 'auto' : 'none',
          MozUserSelect: isEditing ? 'auto' : 'none',
          msUserSelect: isEditing ? 'auto' : 'none',
          pointerEvents: isEditing ? 'auto' : 'none',
          WebkitTouchCallout: 'none', // Disable callout on long press for iOS (always for this content)
          WebkitTapHighlightColor: 'transparent', // Disable tap highlight for iOS (always for this content)
          position: 'relative' // Needed for absolute positioning of children
        }}
        onContextMenu={(e) => { if (!isEditing) e.preventDefault(); }}
        onDragStart={(e) => { if (!isEditing) e.preventDefault(); }}
      >
        {/* Absenderzeile für Fensterumschlag (Position nach DIN 5008) */}
        {(!isFullLetter || (isEditing && !isFullLetter)) && ( // Only show if not in full letter mode, or if editing but hasn't converted yet
          <div style={{
            position: 'absolute',
            top: '4.5cm',
            left: '2.5cm',
            fontSize: '8pt',
            lineHeight: '1.2',
            color: '#666',
            width: '8.5cm',
            boxSizing: 'border-box'
          }}>
            {isEditing ? (
              <div className="space-y-1 not-prose pointer-events-auto">
                <Input
                  value={senderData.name}
                  onChange={(e) => handleSenderChange('name', e.target.value)}
                  placeholder="Vollständiger Name"
                  className="text-xs h-6 bg-white border select-auto"
                  style={{ userSelect: 'auto', WebkitUserSelect: 'auto' }}
                />
                <Input
                  value={senderData.street}
                  onChange={(e) => handleSenderChange('street', e.target.value)}
                  placeholder="Straße Nr."
                  className="text-xs h-6 bg-white border select-auto"
                  style={{ userSelect: 'auto', WebkitUserSelect: 'auto' }}
                />
                <div className="flex gap-1">
                  <Input
                    value={senderData.zip_code}
                    onChange={(e) => handleSenderChange('zip_code', e.target.value)}
                    placeholder="PLZ"
                    className="text-xs h-6 flex-1 bg-white border select-auto"
                    style={{ userSelect: 'auto', WebkitUserSelect: 'auto' }}
                  />
                  <Input
                    value={senderData.city}
                    onChange={(e) => handleSenderChange('city', e.target.value)}
                    placeholder="Ort"
                    className="text-xs h-6 flex-2 bg-white border select-auto"
                    style={{ userSelect: 'auto', WebkitUserSelect: 'auto' }}
                  />
                </div>
              </div>
            ) : (
              // Non-editing display: Compact single line for window
              <div style={{
                height: '0.4cm',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                borderBottom: '1px solid #000',
                paddingBottom: '2pt',
                marginBottom: '12pt'
              }}>
                {`${senderData.name}, ${senderData.street}, ${senderData.zip_code} ${senderData.city}`}
              </div>
            )}
          </div>
        )}

        {isEditing && isFullLetter ? (
          <div className="select-auto pointer-events-auto">
            <RichTextEditor
              value={editableText.replace(FULL_MARK, '')} // Remove marker for the editor
              onChange={(value) => setEditableText(FULL_MARK + value)} // Add marker back when saving
              toolbarId="letter-toolbar"
            />
          </div>
        ) : (
          // Anzeige: wenn FULL_LETTER vorhanden, rendere genau dieses HTML;
          // sonst strukturiertes Fallback wie zuvor.
          isFullLetter ? (
            <div dangerouslySetInnerHTML={{ __html: editableText.replace(FULL_MARK, '') }} /> // Remove marker for display
          ) : (
            <>
              {/* Empfängeradresse (Position nach DIN 5008) */}
              <div style={{
                marginTop: '2cm',
                marginBottom: '2cm',
                lineHeight: '1.3',
                fontSize: '12pt'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.5cm' }}>
                  {caseData.sender_name}
                </div>
                {caseData.sender_address && caseData.sender_address.split('\n').map((line, idx) => (
                  <div key={idx} style={{ marginBottom: '0.2cm' }}>{line}</div>
                ))}
              </div>

              {/* Datum - rechtsbündig */}
              <div style={{
                textAlign: 'right',
                marginBottom: '2cm',
                fontSize: '12pt'
              }}>
                {cityOnly(senderData.city)}, den {currentDate || ''}
              </div>

              {/* Betreffzeile */}
              <div style={{
                marginBottom: '2cm',
                fontSize: '12pt'
              }}>
                <div style={{ fontWeight: 'bold' }}>{subjectText}</div>
              </div>

              {/* Anrede */}
              <div style={{
                marginBottom: '1.5cm',
                fontSize: '12pt'
              }}>
                {greetingText}
              </div>

              {/* Brieftext */}
              <div style={{
                marginBottom: '2cm',
                fontSize: '12pt',
                lineHeight: '1.5',
                textAlign: 'justify'
              }}>
                {isBodyHTML ? (
                  <div dangerouslySetInnerHTML={{ __html: editableText }} />
                ) : (
                  <div style={{ whiteSpace: 'pre-line' }}>
                    {editableText}
                  </div>
                )}
              </div>

              {/* Grußformel */}
              <div style={{
                marginBottom: '3cm',
                fontSize: '12pt'
              }}>
                {closingText}
              </div>

              {/* Unterschriftenbereich */}
              <div style={{
                fontSize: '12pt',
                fontWeight: 'bold'
              }}>
                {caseData?.sender_data?.signature && (
                  <img
                      src={caseData.sender_data.signature}
                      alt="Unterschrift"
                      loading="lazy"
                      style={{ height: '2cm', marginBottom: '0.4cm' }}
                    />
                )}
                {senderData.name}
              </div>
            </>
          )
        )}
      </div>

      {isEditing && (
        <div className="glass rounded-lg p-4 mt-6 not-prose">
          <div className="text-white/80 text-sm">
            ✏️ Sie bearbeiten den gesamten Brief im Word-Modus. Die Toolbar oben steuert Schriftart, Größe, Fett, Kursiv, Unterstreichen und Farbe.
            {(!isFullLetter || (isEditing && !isFullLetter)) && ( // Only show if not in full letter mode, or if editing but hasn't converted yet
              <ul className="mt-2 ml-4 list-disc space-y-1">
                <li>Korrigieren Sie Ihre Absenderdaten für das Sichtfenster.</li>
              </ul>
            )}
            <ul className="mt-2 ml-4 list-disc space-y-1">
              <li>Der Brief ist optimiert für A4-Druck und Briefumschläge mit Sichtfenster.</li>
              <li className="text-yellow-200">⚠️ Das Dokument ist kopiergeschützt - Download nur nach Bestätigung möglich.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditableLetterPreview;