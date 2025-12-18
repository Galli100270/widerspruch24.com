import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { shortcodesParser } from '@/components/lib/shortcodesParser';
import { X, PlusCircle } from 'lucide-react';

export default function DetailsForm({ t, facts, shortcodesRaw, onUpdate, onNext, onBack }) {
  const [internalFacts, setInternalFacts] = useState(facts || {});
  const [internalShortcodes, setInternalShortcodes] = useState(shortcodesRaw || '');

  // Sync from props
  useEffect(() => {
    setInternalFacts(facts);
    setInternalShortcodes(shortcodesRaw);
  }, [facts, shortcodesRaw]);

  const handleShortcodesChange = (e) => {
    const text = e.target.value;
    setInternalShortcodes(text);
    const parsed = shortcodesParser.parse(text);
    const newFacts = {
      fristTage: parsed.frist || internalFacts.fristTage || 14,
      amountTotal: parsed.betrag || internalFacts.amountTotal || '',
      iban: parsed.iban || internalFacts.iban || '',
      zahlungsempfaenger: parsed.zahlungsempfaenger || internalFacts.zahlungsempfaenger || '',
      kundennummer: parsed.kundennummer || internalFacts.kundennummer || '',
      referenz: parsed.referenz || internalFacts.referenz || '',
      anlagen: parsed.anlagen || internalFacts.anlagen || [],
      reason: parsed.reason || internalFacts.reason || '',
    };
    setInternalFacts(newFacts);
    onUpdate(newFacts, text);
  };
  
  const handleFactChange = (field, value) => {
    const newFacts = { ...internalFacts, [field]: value };
    setInternalFacts(newFacts);
    
    // Regenerate shortcodes from facts
    const lines = [];
    if (newFacts.reason) lines.push(newFacts.reason);
    if (newFacts.fristTage && newFacts.fristTage !== 14) lines.push(`/frist ${newFacts.fristTage}`);
    if (newFacts.amountTotal) lines.push(`/betrag ${newFacts.amountTotal}`);
    if (newFacts.iban) lines.push(`/iban ${newFacts.iban}`);
    if (newFacts.zahlungsempfaenger) lines.push(`/zahlungsempf ${newFacts.zahlungsempfaenger}`);
    if (newFacts.kundennummer) lines.push(`/kdnr ${newFacts.kundennummer}`);
    if (newFacts.referenz) lines.push(`/ref ${newFacts.referenz}`);
    newFacts.anlagen?.forEach(anlage => lines.push(`/anlage ${anlage}`));
    
    const newShortcodeText = lines.join(' ');
    setInternalShortcodes(newShortcodeText);
    onUpdate(newFacts, newShortcodeText);
  };

  const handleAnlagenChange = (index, value) => {
    const newAnlagen = [...(internalFacts.anlagen || [])];
    newAnlagen[index] = value;
    handleFactChange('anlagen', newAnlagen);
  };

  const addAnlage = () => {
    const newAnlagen = [...(internalFacts.anlagen || []), ''];
    handleFactChange('anlagen', newAnlagen);
  };

  const removeAnlage = (index) => {
    const newAnlagen = (internalFacts.anlagen || []).filter((_, i) => i !== index);
    handleFactChange('anlagen', newAnlagen);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">{t('letter.detailsTitle')}</h2>
        <p className="text-white/80">{t('letter.detailsSubtitle')}</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Shortcodes Input */}
        <Card className="glass border-white/20">
          <CardHeader>
            <CardTitle className="text-white">{t('letter.shortcodesLabel')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={internalShortcodes}
              onChange={handleShortcodesChange}
              placeholder={t('letter.shortcodesPlaceholder')}
              className="glass border-white/30 text-white min-h-[300px] font-mono text-sm"
              autoFocus
            />
            <p className="text-white/60 text-xs mt-3">{t('letter.shortcodesHelp')}</p>
          </CardContent>
        </Card>

        {/* Structured Form */}
        <Card className="glass border-white/20">
          <CardHeader>
            <CardTitle className="text-white">{t('letter.factsTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="frist" className="text-white">{t('letter.factsFrist')}</Label>
                <Input type="number" id="frist" value={internalFacts.fristTage || ''} onChange={e => handleFactChange('fristTage', e.target.value)} className="glass border-white/30 text-white" />
              </div>
              <div>
                <Label htmlFor="amount" className="text-white">{t('letter.factsAmount')}</Label>
                <Input type="number" id="amount" value={internalFacts.amountTotal || ''} onChange={e => handleFactChange('amountTotal', e.target.value)} className="glass border-white/30 text-white" />
              </div>
            </div>
            <div>
              <Label htmlFor="iban" className="text-white">{t('letter.factsIBAN')}</Label>
              <Input id="iban" value={internalFacts.iban || ''} onChange={e => handleFactChange('iban', e.target.value)} className="glass border-white/30 text-white" />
            </div>
            <div>
              <Label htmlFor="recipient" className="text-white">{t('letter.factsRecipient')}</Label>
              <Input id="recipient" value={internalFacts.zahlungsempfaenger || ''} onChange={e => handleFactChange('zahlungsempfaenger', e.target.value)} className="glass border-white/30 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                <Label htmlFor="kundennummer" className="text-white">{t('letter.factsCustomerNo')}</Label>
                <Input id="kundennummer" value={internalFacts.kundennummer || ''} onChange={e => handleFactChange('kundennummer', e.target.value)} className="glass border-white/30 text-white" />
              </div>
               <div>
                <Label htmlFor="referenz" className="text-white">{t('letter.factsRefNo')}</Label>
                <Input id="referenz" value={internalFacts.referenz || ''} onChange={e => handleFactChange('referenz', e.target.value)} className="glass border-white/30 text-white" />
              </div>
            </div>
            <div>
              <Label className="text-white">{t('letter.factsAttachments')}</Label>
              <div className="space-y-2 mt-2">
                {(internalFacts.anlagen || []).map((anlage, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input value={anlage} onChange={e => handleAnlagenChange(index, e.target.value)} className="glass border-white/30 text-white" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeAnlage(index)} className="text-red-400 hover:text-red-300">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addAnlage} className="glass border-white/30 text-white hover:bg-white/10 w-full">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  {t('letter.addAttachment')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between mt-8">
        <Button onClick={onBack} variant="outline" className="glass border-white/30 text-white hover:bg-white/10">Zurück</Button>
        <Button onClick={onNext} className="glass text-white border-white/30 hover:glow">Weiter zur Vorschau</Button>
      </div>
    </div>
  );
}