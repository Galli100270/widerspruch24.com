import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Info, 
  Smile, 
  ArrowRight, 
  FileText,
  Lightbulb
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PhotoDetectionDialog({ 
  isOpen, 
  onClose, 
  detectionResult, 
  t,
  onOptionSelect 
}) {
  const [selectedOption, setSelectedOption] = useState('purpose'); // Default: zurück zum Zweck
  const [funConsent, setFunConsent] = useState(false);
  const [humorEnabled, setHumorEnabled] = useState(
    localStorage.getItem('w24_humor_enabled') !== 'false'
  );

  if (!detectionResult) return null;

  const { objectDetection, confidence, documentScore } = detectionResult;
  const { label, category } = objectDetection;

  const handleContinue = () => {
    if (selectedOption === 'fun' && !funConsent) {
      return; // Verhindere Fortsetzung ohne Zustimmung
    }

    // Speichere Humor-Einstellung
    localStorage.setItem('w24_humor_enabled', humorEnabled.toString());

    onOptionSelect(selectedOption, { 
      funConsent, 
      objectInfo: { label, category, confidence },
      humorEnabled 
    });
    onClose();
  };

  const getObjectEmoji = (category, label) => {
    const emojiMap = {
      'vehicle': label.toLowerCase().includes('fahrrad') ? '🚴' : '🚗',
      'furniture': '🪑',
      'animal': label.toLowerCase().includes('hund') ? '🐕' : '🐱',
      'building': '🏢',
      'nature': '🌲',
      'unknown': '📷'
    };
    return emojiMap[category] || '📷';
  };

  const objectEmoji = getObjectEmoji(category, label);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass border-white/20 max-w-lg text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            {objectEmoji} 
            {t('photoDetection.title', { defaultValue: 'Kein Dokument erkannt' })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Erkennung anzeigen */}
          <div className="text-center">
            <div className="text-lg mb-2">
              {t('photoDetection.detected', { 
                label, 
                defaultValue: `Erkannt: ${label}` 
              })}
            </div>
            <div className="flex justify-center gap-2 mb-4">
              <Badge variant="outline" className="border-blue-400/50 text-blue-300">
                {Math.round(confidence * 100)}% {t('photoDetection.confident', { defaultValue: 'sicher' })}
              </Badge>
              <Badge variant="outline" className="border-orange-400/50 text-orange-300">
                {Math.round((1 - documentScore) * 100)}% {t('photoDetection.notDocument', { defaultValue: 'kein Dokument' })}
              </Badge>
            </div>
            <p className="text-white/80 text-sm">
              {t('photoDetection.subtitle', { 
                defaultValue: 'Was sollen wir damit tun?' 
              })}
            </p>
          </div>

          {/* Optionen */}
          <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
            <div className="space-y-4">
              {/* Option 1: Technische Infos */}
              <div className="glass rounded-lg p-4 border border-white/10">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="info" id="info" />
                  <Label htmlFor="info" className="flex items-center gap-2 cursor-pointer">
                    <Info className="w-4 h-4" />
                    {t('photoDetection.option1', { 
                      label, 
                      defaultValue: `🔧 Kurzinfo: Technische Infos zum ${label}` 
                    })}
                  </Label>
                </div>
              </div>

              {/* Option 2: Spaß-Schreiben (nur wenn Humor aktiviert) */}
              {humorEnabled && (
                <div className="glass rounded-lg p-4 border border-white/10">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fun" id="fun" />
                    <Label htmlFor="fun" className="flex items-center gap-2 cursor-pointer">
                      <Smile className="w-4 h-4" />
                      {t('photoDetection.option2', { 
                        defaultValue: '😜 Spaß-Schreiben verfassen (rein humorvoll, nicht versendbar)' 
                      })}
                    </Label>
                  </div>
                  
                  {selectedOption === 'fun' && (
                    <div className="mt-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                      <div className="flex items-start space-x-2">
                        <Checkbox 
                          id="fun-consent" 
                          checked={funConsent}
                          onCheckedChange={setFunConsent}
                        />
                        <Label htmlFor="fun-consent" className="text-sm text-amber-200 cursor-pointer">
                          {t('photoDetection.funConsent', { 
                            defaultValue: 'Ich weiß, dass dieses Schreiben nur Spaß ist und keine echte Rechtswirkung hat. Es wird mit einem Wasserzeichen versehen und kann nicht versendet werden.' 
                          })}
                        </Label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Option 3: Zurück zum Zweck (vorausgewählt) */}
              <div className="glass rounded-lg p-4 border border-green-500/30 bg-green-500/10">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="purpose" id="purpose" />
                  <Label htmlFor="purpose" className="flex items-center gap-2 cursor-pointer">
                    <FileText className="w-4 h-4" />
                    {t('photoDetection.option3', { 
                      defaultValue: '🧭 Zurück zum Zweck: Ein juristisch korrektes Schreiben erstellen' 
                    })}
                  </Label>
                </div>
                <p className="text-green-200 text-xs mt-2 ml-6">
                  {t('photoDetection.option3Help', { 
                    defaultValue: 'Empfohlen: Für echte Rechtsfälle bitte ein klar fotografiertes Dokument hochladen.' 
                  })}
                </p>
              </div>
            </div>
          </RadioGroup>

          {/* Humor-Toggle */}
          <div className="flex items-center space-x-2 text-sm">
            <Checkbox 
              id="humor-toggle" 
              checked={humorEnabled}
              onCheckedChange={setHumorEnabled}
            />
            <Label htmlFor="humor-toggle" className="text-white/80 cursor-pointer">
              {t('photoDetection.humorToggle', { 
                defaultValue: 'Humor-Texte anzeigen' 
              })}
            </Label>
          </div>

          {/* Hinweis */}
          <Alert className="border-blue-500/30 bg-blue-500/10">
            <Lightbulb className="w-4 h-4 text-blue-400" />
            <AlertDescription className="text-blue-200">
              {t('photoDetection.safetyNote', { 
                defaultValue: 'Keine Sorge, dein Upload ist sicher. Bei echten Dokumenten lieber nochmal ein klar fotografiertes Schreiben hochladen.' 
              })}
              {' '}
              <Link 
                to={createPageUrl('DocumentTips')} 
                className="underline hover:text-blue-100"
              >
                {t('photoDetection.tipsLink', { 
                  defaultValue: 'Tipps: So fotografierst du Dokumente richtig' 
                })}
              </Link>
            </AlertDescription>
          </Alert>

          {/* Aktions-Buttons */}
          <div className="flex justify-between gap-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="glass border-white/30 text-white hover:bg-white/10"
            >
              {t('common.cancel', { defaultValue: 'Abbrechen' })}
            </Button>
            <Button 
              onClick={handleContinue}
              disabled={selectedOption === 'fun' && !funConsent}
              className="glass text-white border-white/30 hover:glow"
            >
              {t('common.continue', { defaultValue: 'Weiter' })}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}