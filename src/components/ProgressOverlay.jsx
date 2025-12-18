
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, RotateCw, FileText } from 'lucide-react';

const STEPS = [
  { key: 'uploading', label: 'Upload', icon: '📤' },
  { key: 'convert_heic', label: 'HEIC-Konvertierung', icon: '🔄' },
  { key: 'ocr', label: 'Texterkennung', icon: '👀' },
  { key: 'analyzing', label: 'Analyse', icon: '🔍' },
  { key: 'drafting', label: 'Entwurf', icon: '✍️' },
  { key: 'refining', label: 'Feinschliff', icon: '✨' },
  { key: 'rendering_pdf', label: 'PDF Erstellung', icon: '📄' },
  { key: 'sending_email', label: 'Versand', icon: '📧' },
  { key: 'done', label: 'Fertig', icon: '🎉' },
  { key: 'idle', label: 'Bereit', icon: '✅' },
];

export default function ProgressOverlay({ 
  isVisible, 
  currentStep, 
  progress, 
  error, 
  retryCount, 
  onCancel, 
  onComplete,
  t, // Pass t as a prop for consistency
  previews = [] // NEU: kleine Seitenvorschau während Verarbeitung
}) {
  const [humorSnippet, setHumorSnippet] = useState('');

  // Rotates humor snippets
  useEffect(() => {
    let humorInterval;
    if (isVisible && !error && currentStep !== 'done' && currentStep !== 'idle') {
      const updateHumor = () => {
        try {
          const humorObject = t('progress.humor', { returnObjects: true });
          // Ensure it's an object before getting keys
          if (humorObject && typeof humorObject === 'object') {
            const humorKeys = Object.keys(humorObject);
            if (humorKeys.length > 0) {
              const randomKey = humorKeys[Math.floor(Math.random() * humorKeys.length)];
              setHumorSnippet(t(`progress.humor.${randomKey}`));
            }
          } else {
            setHumorSnippet(''); // Fallback if translations are not loaded
          }
        } catch (e) {
            console.warn("Could not load humor snippets, translations might be pending.", e);
            setHumorSnippet('');
        }
      };
      updateHumor();
      humorInterval = setInterval(updateHumor, 6000); // Change every 6 seconds
    } else {
      setHumorSnippet('');
    }
    
    return () => clearInterval(humorInterval);
  }, [isVisible, error, currentStep, t]);

  const currentStepInfo = STEPS.find(s => s.key === currentStep);

  const title = error 
    ? t('progress.error.title', { retry: retryCount, max: 3, defaultValue: 'Hoppla, da klemmt was...' })
    : (currentStep === 'done' 
        ? t('progress.success.title', { defaultValue: 'Geschafft!' }) 
        : t('progress.title.working', { defaultValue: 'Wir arbeiten für dich…' }));
        
  const subtitle = error
    ? error
    : (currentStep === 'done' 
        ? t('progress.success.message', { defaultValue: 'Dein Dokument ist fertig.' })
        : t('progress.subtitle.working', { defaultValue: 'Dein Dokument entsteht gerade' }));

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="glass rounded-3xl p-8 w-full max-w-lg text-center border-white/20"
      >
        <div className="w-16 h-16 glass rounded-full mx-auto mb-6 flex items-center justify-center border-2 border-white/20">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {error ? (
                <AlertTriangle className="w-8 h-8 text-red-400" />
              ) : currentStep === 'done' ? (
                <CheckCircle className="w-8 h-8 text-green-400" />
              ) : (
                <span className="text-3xl">{currentStepInfo?.icon || '🚀'}</span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">
          {title}
        </h2>
        <p className="text-white/80 mb-8 min-h-[24px]">{subtitle}</p>

        {!error && (
          <>
            <div className="w-full text-left">
              <div className="relative h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="absolute top-0 left-0 h-full bg-green-400"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                />
              </div>
              <div className="flex justify-between items-center mt-3">
                <div className="text-white/70 text-sm flex items-center gap-2">
                  <span>{currentStepInfo?.icon}</span>
                  <span>{t(`progress.steps.${currentStep}`, { defaultValue: currentStepInfo?.label || '...' })}</span>
                  {/* Witz wird hier als Status angezeigt */}
                  {humorSnippet && (
                    <>
                      <span className="text-white/40">•</span>
                      <span className="italic">{humorSnippet}</span>
                    </>
                  )}
                </div>
                <span className="text-white/70 text-sm font-mono">{Math.round(progress)}%</span>
              </div>
            </div>

            {/* NEU: Mini-Vorschauzeile der Seiten */}
            {previews && previews.length > 0 && (
              <div className="mt-4 text-left">
                <div className="text-white/60 text-xs mb-2">{t('scanner.previewDuringProcessing', { defaultValue: 'Seitenvorschau während der Verarbeitung' })}</div>
                <div className="flex gap-2 overflow-x-auto py-1 custom-scrollbar"> {/* Added custom-scrollbar for styling */}
                  {previews.slice(0, 10).map((url, idx) => (
                    <div key={idx} className="min-w-[48px] h-16 rounded-md overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center border border-white/10">
                      {url ? (
                        <img src={url} alt={`Seite ${idx + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-white/70 text-[10px] px-1 text-center">
                          <FileText className="w-4 h-4 mb-1" />
                          {`Seite ${idx + 1}`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-8 flex gap-4 justify-center">
          {error ? (
            <>
              <Button onClick={onCancel} variant="outline" className="glass text-white border-white/30 hover:bg-white/10">
                <RotateCw className="w-4 h-4 mr-2" />
                {t('progress.error.restart', { defaultValue: 'Neu starten' })}
              </Button>
            </>
          ) : currentStep === 'done' ? (
            <Button onClick={onComplete} className="bg-green-500 hover:bg-green-600 text-white">
              {t('progress.success.continue', { defaultValue: 'Weiter' })}
            </Button>
          ) : (
            <Button onClick={onCancel} variant="ghost" className="text-white/60 hover:text-white">
              {t('progress.cancel', { defaultValue: 'Vorgang abbrechen' })}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
