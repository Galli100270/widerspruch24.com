
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import LegalProse from '@/components/LegalProse';

const IMPRESSUM_TEXT = `Impressum – widerspruch24.com

Angaben gemäß § 5 TMG / § 18 Abs. 2 MStV

Diensteanbieter / Verantwortlich für den Inhalt:
Widerspruch24 (Angebot: „widerspruch24.com")
Inhaber / vertretungsberechtigt: Guido Gall

Sitz der Firma / ladungsfähige Anschrift:
Widerspruch24, Inhaber Guido Gall
Buutendörp 19
19322 Breese / OT Kuhblank
Deutschland

Kontakt:
Telefon: +49 3877 5669413
Fax:     +49 3877 5653908
E-Mail:  info@best-preis.net

Umsatzsteuer-Identifikationsnummer nach § 27a UStG: DE815826978
Steuernummer: 052/151/04097

Registereintrag:
Kein Registereintrag vorhanden.

Zuständige Aufsichtsbehörde (nur falls einschlägig):
– nicht zutreffend –

Berufsrechtliche Angaben (nur bei reglementierten Berufen):
– nicht zutreffend –


Online-Streitbeilegung (OS-Plattform) & Verbraucherstreitbeilegung
Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit:
https://ec.europa.eu/consumers/odr/
Wir sind nicht verpflichtet und in der Regel nicht bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen (§ 36 VSBG).


Haftung für Inhalte
Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden entsprechender Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.

Haftung für Links
Unser Angebot enthält ggf. Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.

Urheberrecht
Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Beiträge Dritter sind als solche gekennzeichnet. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechts bedürfen der vorherigen schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet, sofern nicht anders angegeben.

Hinweise zu Rechtsdienstleistungen
Widerspruch24 stellt keine Rechtsberatung dar. Es werden automatisierte Textvorschläge (z. B. Widerspruchsschreiben) generiert; die abschließende rechtliche Prüfung, Verwendung und Fristwahrung liegt bei den Nutzenden. Bei individuellen Rechtsfragen wende dich bitte an eine Rechtsanwältin oder einen Rechtsanwalt.

Verantwortlich i. S. d. § 18 Abs. 2 MStV (sofern journalistisch-redaktionelle Inhalte vorliegen):
Guido Gall, Buutendörp 19, 19322 Breese / OT Kuhblank

Bild- und Markenhinweise
Genutzte Marken und Logos sind Eigentum der jeweiligen Rechteinhaber. Bildquellen und Lizenzen werden – sofern erforderlich – im Einzelfall benannt.

Datenschutz
Unsere Datenschutzhinweise findest du unter: /datenschutz

Stand: 23.09.2025`;

export default function Impressum() {
  const osLink = 'https://ec.europa.eu/consumers/odr/';
  // Markdown mit klickbarem Link
  const IMPRESSUM_MD = IMPRESSUM_TEXT.replaceAll(osLink, `[${osLink}](${osLink})`);

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="glass rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" className="glass rounded-xl text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zurück
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-white">Impressum</h1>
          </div>
        </div>

        {/* Content */}
        <LegalProse markdown={IMPRESSUM_MD} />
      </div>
    </div>
  );
}
