import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Smile, 
  Download, 
  AlertTriangle, 
  Mail, 
  Loader2,
  FileText,
  ArrowLeft 
} from 'lucide-react';
import { InvokeLLM } from '@/integrations/Core';
import { format } from 'date-fns';

const FUN_LETTER_TEMPLATES = {
  'Fahrrad': {
    subject: 'Abmahnung mit Augenzwinkern an ein Fahrrad wegen renitenter Kettengeräusche',
    addressee: 'An das Fahrrad,\nwohnhaft: Fahrradständer neben dem Elbdeich',
    intro: 'In Ansehung der wiederholten Kettengeräusche und Parkmanöver quer zum Fahrradständer mahnen wir Sie – das betroffene Fahrrad – hiermit satirisch ab.',
    legal: 'Gemäß § 823 BGB (in äußerst freier Auslegung) wird deliktische Ungezogenheit von Drahteseln grundsätzlich missbilligt.',
    demand: 'Wir setzen Ihnen – symbolisch – eine Frist von 14 Tagen zur Wiederherstellung geräuscharmen Gleitens.',
    consequence: 'Sollten Sie dieser Aufforderung nicht nachkommen, behalten wir uns vor, Ihnen eine freundliche Ölung angedeihen zu lassen.'
  },
  'Auto': {
    subject: 'Humoristische Verwarnung an ein Kraftfahrzeug wegen eigenwilliger Parkmanöver',
    addressee: 'An das Auto,\nwohnhaft: Parkplatz vor dem Supermarkt',
    intro: 'Hiermit rügen wir – nicht ganz ernst gemeint – Ihre kreative Interpretation von Parkplatzlinien.',
    legal: 'Nach § 12 StVO (satirisch betrachtet) sollten auch motorisierte Blechkameraden zwischen den Linien parken.',
    demand: 'Wir bitten Sie höflich, Ihre Reifen künftig parallel zu den weißen Strichen auszurichten.',
    consequence: 'Andernfalls müssen wir Ihnen eventuell einen Fahrstunden-Gutschein schenken.'
  },
  'Stuhl': {
    subject: 'Scherzhafter Verweis an ein Sitzmöbel wegen mangelnder Bequemlichkeit',
    addressee: 'An den Stuhl,\nwohnhaft: Ecke des Wohnzimmers',
    intro: 'Wir beanstanden – augenzwinkernd – Ihre unbefriedigende Sitzhaltung-Unterstützung.',
    legal: 'Gemäß den ungeschriebenen Gesetzen der Gemütlichkeit sollten Stühle für Wohlbefinden sorgen.',
    demand: 'Wir fordern Sie auf, Ihre Polsterung zu überdenken und eventuelle Rückenschäden zu vermeiden.',
    consequence: 'Bei Nichtbeachtung droht Ihnen der Ersatz durch einen bequemeren Kollegen.'
  },
  'Hund': {
    subject: 'Liebevolle Ermahnung an einen Vierbeiner wegen übermäßiger Niedlichkeit',
    addressee: 'An den Hund,\nwohnhaft: Das gemütlichste Körbchen im Haus',
    intro: 'Hiermit monieren wir – völlig liebevoll – Ihre exzessive Verwendung von Hundeblick und Schwanzwedeln.',
    legal: 'Nach dem universellen Gesetz der Niedlichkeit dürfen Hunde nicht permanent entzückend sein.',
    demand: 'Wir bitten Sie, Ihre Zuckersüßigkeit auf ein erträgliches Maß zu reduzieren.',
    consequence: 'Andernfalls müssen wir Ihnen noch mehr Leckerlis und Streicheleinheiten zukommen lassen.'
  },
  'Objekt': {
    subject: 'Humoristische Beanstandung an ein unidentifiziertes Objekt',
    addressee: 'An das geheimnisvolle Objekt,\nwohnhaft: Irgendwo im Bild',
    intro: 'Hiermit beanstanden wir – mit einem Schmunzeln – Ihre unklare Identität.',
    legal: 'Nach dem Grundsatz der fotografischen Klarheit sollten Objekte erkennbar sein.',
    demand: 'Wir fordern Sie auf, sich deutlicher zu präsentieren oder ein Namensschild zu tragen.',
    consequence: 'Bei weiterer Unkenntlichkeit droht Ihnen eine Verwechslung mit einem anderen Gegenstand.'
  }
};

export default function FunLetterGenerator({ 
  objectInfo, 
  t, 
  onBack, 
  onComplete 
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState('');
  const [error, setError] = useState('');

  const generateFunLetter = useCallback(async () => {
    setIsGenerating(true);
    setError('');

    try {
      const { label, category } = objectInfo;
      const template = FUN_LETTER_TEMPLATES[label] || FUN_LETTER_TEMPLATES['Objekt'];
      
      const prompt = `
Du bist ein humorvoller Textgenerator und erstellst ein satirisches "Schreiben" an ein Objekt.

WICHTIGE REGELN:
- Niemals ernsthafte Rechtswirkung suggerieren
- Nur harmloses Augenzwinkern, keine Beleidigungen
- §-Verweise sind offensichtlich scherzhaft
- Ton: freundlich-ironisch, niemals aggressiv

OBJEKT: ${label} (Kategorie: ${category})
VORLAGE VERWENDEN: ${JSON.stringify(template)}

Erstelle einen vollständigen Brief nach deutschem Briefformat:

1. Absender: "Ein augenzwinkernder Mensch" + heutiges Datum
2. Empfänger: Verwende Template-Adressat oder erfinde passenden
3. Betreff: Verwende Template-Betreff oder erfinde passenden
4. Anrede: "Sehr geehrtes/geehrter [Objekt],"
5. Haupttext (3-4 Absätze):
   - Intro: Verwende Template oder erfinde situationsbezogen
   - Pseudo-Rechtliches: Harmlose §-Anspielung (Template oder erfinde)
   - Forderung: Humorvolle "Aufforderung" (Template oder erfinde)
   - Konsequenz: Liebevolle "Drohung" (Template oder erfinde)
6. Schlussformel: "Mit nicht ganz ernst gemeinten Grüßen"
7. Disclaimer: "Dieses Schreiben ist eine humoristische Generierung ohne Rechtswirkung. Kein Versand. Kein Rechtsrat."

Achte darauf, dass der Text eindeutig als Spaß erkennbar ist!
`;

      const result = await InvokeLLM({ 
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            letter: { type: "string" }
          }
        }
      });

      const letterText = typeof result === 'string' ? result : result.letter;
      setGeneratedLetter(letterText);
      
    } catch (err) {
      setError('Fehler beim Generieren des Spaß-Schreibens: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  }, [objectInfo]); // objectInfo ist die einzige externe Dependency

  useEffect(() => {
    generateFunLetter();
  }, [generateFunLetter]); // Jetzt ist die Dependency korrekt

  const handleDownload = () => {
    if (!generatedLetter) return;

    // Erstelle PDF-Content mit Wasserzeichen
    const pdfContent = `
    ${generatedLetter}
    
    ⚠️ NUR ZUM SPAß / JUST FOR FUN ⚠️
    ⚠️ KEINE RECHTSWIRKUNG / NO LEGAL EFFECT ⚠️
    `;

    // Einfacher Text-Download (in produktiver Version würde hier ein PDF mit Wasserzeichen generiert)
    const blob = new Blob([pdfContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Spass-Schreiben-${objectInfo.label}-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);

    onComplete?.();
  };

  if (isGenerating) {
    return (
      <div className="text-center text-white py-20">
        <Loader2 className="w-12 h-12 mx-auto animate-spin mb-4" />
        <p className="text-lg">Scharfe Feder wird gespitzt... (nur zum Spaß!) ✍️</p>
        <p className="text-white/60 mt-2">
          Verfasse humorvolles Schreiben an: {objectInfo.label}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <Alert className="glass border-red-500/50">
          <AlertTriangle className="w-6 h-6 text-red-400" />
          <AlertDescription className="text-white p-4">
            <div className="font-medium mb-2">Generierung fehlgeschlagen</div>
            <div className="mb-4">{error}</div>
            <div className="flex gap-3 justify-center">
              <Button 
                onClick={generateFunLetter} 
                className="glass text-white border-white/30"
              >
                Erneut versuchen
              </Button>
              <Button
                onClick={onBack}
                variant="outline"
                className="glass border-white/30 text-white hover:bg-white/10"
              >
                Zurück
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4 flex items-center justify-center gap-2">
          <Smile className="w-8 h-8" />
          Spaß-Schreiben generiert!
        </h2>
        <div className="flex justify-center gap-2 mb-4">
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            Nur zum Spaß
          </Badge>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            Objekt: {objectInfo.label}
          </Badge>
        </div>
      </div>

      {/* Letter Content */}
      <Card className="glass border-white/20 bg-white/5">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Dein humorvolles Schreiben
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-white/10 rounded-lg p-6 border border-white/20">
            <pre className="text-white whitespace-pre-wrap font-mono text-sm">
              {generatedLetter}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Alert className="border-amber-500/50 bg-amber-500/10">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <AlertDescription className="text-amber-200">
          <strong>Wichtiger Hinweis:</strong> Dieses Schreiben ist reine Satire ohne jede Rechtswirkung. 
          Es kann nicht versendet werden und dient ausschließlich der Unterhaltung.
        </AlertDescription>
      </Alert>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <Button
          onClick={onBack}
          variant="outline"
          className="glass border-white/30 text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück
        </Button>

        <div className="flex gap-3">
          {/* E-Mail-Button (deaktiviert) */}
          <Button
            disabled
            variant="outline"
            className="glass border-white/30 text-white/50 cursor-not-allowed"
            title="Versand nicht möglich - nur zum Spaß!"
          >
            <Mail className="w-4 h-4 mr-2" />
            Per E-Mail senden
          </Button>

          {/* Download-Button */}
          <Button
            onClick={handleDownload}
            className="glass text-white border-white/30 hover:glow"
          >
            <Download className="w-4 h-4 mr-2" />
            Als Textdatei herunterladen
          </Button>
        </div>
      </div>
    </div>
  );
}