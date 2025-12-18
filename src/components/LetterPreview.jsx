import React from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { de, enGB } from 'date-fns/locale';

const LetterPreview = ({ caseData, generatedText, t, language = 'de', showPartial = true }) => {
  if (!caseData || !generatedText) return null;

  const dateLocale = language === 'de' ? de : enGB;
  const currentDate = format(new Date(), 'dd. MMMM yyyy', { locale: dateLocale });
  
  // Sichere Datumsformatierung
  const formatSafeDate = (dateString, formatString = 'dd.MM.yyyy') => {
    if (!dateString) return '...';
    
    try {
      let date;
      if (typeof dateString === 'string') {
        date = dateString.includes('T') ? parseISO(dateString) : new Date(dateString);
      } else {
        date = new Date(dateString);
      }
      
      if (isValid(date) && !isNaN(date.getTime())) {
        return format(date, formatString, { locale: dateLocale });
      }
      
      return '...';
    } catch (error) {
      return '...';
    }
  };

  const documentDate = formatSafeDate(caseData.document_date);
  const words = generatedText.split(' ');
  const visibleText = showPartial ? words.slice(0, Math.floor(words.length * 0.75)).join(' ') : generatedText;
  const hasMoreContent = showPartial && words.length > Math.floor(words.length * 0.75);

  const subject = t('letterSubject', { date: documentDate, reference: caseData.reference_number || '...' });
  const senderName = "Max Mustermann";
  const senderStreet = "Musterstraße 1";
  const senderCity = "12345 Musterstadt";

  return (
    <div className="bg-white text-black p-8 rounded-lg shadow-2xl max-w-4xl mx-auto" style={{
      fontFamily: '"Times New Roman", Times, serif',
      fontSize: '12pt',
      lineHeight: '1.6',
      minHeight: '800px'
    }}>
      {/* Professional Header */}
      <div className="text-sm mb-8 text-gray-600">
        {senderName} • {senderStreet} • {senderCity}
      </div>

      {/* Recipient Address */}
      <div className="mb-12 font-medium">
        <div>{caseData.sender_name}</div>
        {caseData.sender_address && caseData.sender_address.split('\n').map((line, idx) => (
          <div key={idx}>{line}</div>
        ))}
      </div>
      
      {/* Date */}
      <div className="text-right mb-8">
        Musterstadt, den {currentDate}
      </div>

      {/* Subject */}
      <div className="mb-8">
        <div className="font-bold text-lg">{subject}</div>
      </div>

      {/* Content */}
      <div className="mb-8">
        <div className="mb-4">{t('letterGreeting')}</div>
        
        <div className="mb-4 whitespace-pre-line text-justify leading-relaxed relative">
          {visibleText}
          {hasMoreContent && (
            <>
              <span className="blur-sm select-none text-gray-400">
                {' '}{words.slice(Math.floor(words.length * 0.75)).join(' ')}
              </span>
              <div className="text-center mt-6 p-4 bg-gray-100 border border-gray-300 rounded-lg">
                <div className="text-gray-800 font-semibold">
                  {t('previewHiddenWords', { count: words.length - Math.floor(words.length * 0.75)})}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {t('previewUnlockHint')}
                </div>
              </div>
            </>
          )}
        </div>

        {!hasMoreContent && (
          <div className="mb-4">
            Ich bitte um eine schriftliche Bestätigung über den Eingang meines Widerspruchs innerhalb von 14 Tagen.
          </div>
        )}

        <div className="mb-8">{t('letterClosing')}</div>
        
        {/* Signature */}
        <div className="mt-16 mb-8">
          <div className="border-b border-gray-400 w-64 mb-2"></div>
          <div>{senderName}</div>
        </div>
      </div>

      {/* Professional Footer */}
      <div className="text-xs text-gray-500 text-center mt-12 pt-4 border-t">
        Erstellt mit Widerspruch24.de
      </div>
    </div>
  );
};

export default LetterPreview;