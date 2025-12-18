
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import LegalProse from '@/components/LegalProse';

const AGB_TEXT = `Allgemeine Geschäftsbedingungen (AGB)
für die Nutzung von „Widerspruch24" (widerspruch24.com)

1. Geltungsbereich, Anbieter, Vertragssprache
1.1 Diese Allgemeinen Geschäftsbedingungen (AGB) regeln die Vertragsbeziehung zwischen
    Widerspruch24, Inhaber Guido Gall, Buutendörp 19, 19322 Breese / OT Kuhblank, Deutschland
    (nachfolgend: „Widerspruch24", „wir" oder „uns"), und den Nutzenden der Plattform
    „widerspruch24.com" (nachfolgend: „Nutzer" oder „Sie").
1.2 Abweichende, entgegenstehende oder ergänzende AGB des Nutzers werden nicht Vertragsbestandteil,
    es sei denn, wir stimmen ihrer Geltung ausdrücklich schriftlich zu.
1.3 Vertragssprache ist Deutsch. Etwaige Übersetzungen dienen nur der Orientierung.

2. Leistungsbeschreibung, KEINE RECHTSBERATUNG
2.1 Widerspruch24 ist ein digitales Werkzeug-Set, das Nutzer bei der Erstellung formeller Schreiben unterstützt. Die Plattform nutzt hierzu KI-gestützte Komponenten. Die bereitgestellten Funktionen umfassen insbesondere:
    a) Widerspruchs-Funktion: Generierung von Widerspruchsschreiben auf Basis vom Nutzer hochgeladener Dokumente (z. B. Bescheide, Rechnungen).
    b) Schreiben-Generator: Erstellung beliebiger formeller Schreiben (z.B. Kündigungen, Mahnungen, Fristsetzungen) auf Basis von Stichpunkten, Kurzbefehlen oder freier Texteingabe des Nutzers.
2.2 AUSDRÜCKLICHER HINWEIS: Widerspruch24 erbringt zu keinem Zeitpunkt Rechtsdienstleistungen im Sinne des Rechtsdienstleistungsgesetzes (RDG) und erteilt KEINE Rechtsberatung. Die von der Plattform erzeugten Texte sind computergenerierte Vorschläge und Entwürfe, die auf den Eingaben des Nutzers und KI-Modellen basieren.
2.3 DER NUTZER IST ALLEIN VERANTWORTLICH: Die Überprüfung der generierten Texte auf inhaltliche Richtigkeit, Vollständigkeit, rechtliche Zulässigkeit, Plausibilität sowie die Einhaltung von Fristen obliegt allein dem Nutzer. Der Nutzer ist der alleinige Verfasser und Verantwortliche für das endgültige Dokument. Für eine verbindliche rechtliche Einschätzung ist zwingend eine Rechtsanwältin oder ein Rechtsanwalt zu konsultieren.
2.4 BESONDERER HINWEIS BEI KÜNDIGUNGSSCHREIBEN: Bei der Erstellung von Kündigungsschreiben oder kündigungsnahen Schreiben bestätigt der Nutzer ausdrücklich, dass alle gesetzlichen und vertraglichen Voraussetzungen (insb. Kündigungsfristen, Kündigungsformen, Kündigungsgründe) geprüft und erfüllt sind. Eine Prüfung dieser Voraussetzungen durch Widerspruch24 erfolgt nicht.

3. Beta-Phase, Gastmodus (30 Tage), Testnutzung
3.1 In der Beta-Phase bieten wir optional eine zeitlich begrenzte Nutzung „ohne Registrierung" („Gastmodus") für 30 Kalendertage ab dem ersten Zugriff. Für die Wiedererkennung wird ein technisch erforderliches Cookie gesetzt. Die im Gastmodus verfügbaren Funktionen können eingeschränkt sein.
3.2 Im Gastmodus gelten Nutzungsbeschränkungen (z.B. max. 10 Dokumente pro Tag). Bei Überschreitung behalten wir uns eine temporäre Sperrung vor.
3.3 Nach Ablauf des Gastmodus ist eine Registrierung zur Weiternutzung erforderlich. Vorhandene Gast-Daten werden, soweit technisch zuordenbar und rechtlich zulässig, dem registrierten Nutzerkonto zugeordnet.

4. Registrierung, Konto, Altersgrenze, Nutzungslimits
4.1 Für den vollen Funktionsumfang ist eine Registrierung erforderlich. Die Registrierung ist nur unbeschränkt geschäftsfähigen Personen ab 18 Jahren gestattet.
4.2 Zugangsdaten sind vertraulich zu behandeln. Änderungen relevanter Daten sind unverzüglich im Nutzerkonto zu aktualisieren.
4.3 Auch bei registrierten Konten gelten angemessene Nutzungslimits (z.B. max. 50 Dokumente pro Tag). Bei missbräuchlicher Nutzung, automatisierten Anfragen oder Überlastung der Systeme behalten wir uns eine Sperrung des Kontos vor.

5. Preise, Modelle, Zahlungsabwicklung, Credits
5.1 Die Nutzung der Plattform erfolgt nach verschiedenen Preismodellen:
    a) Einzelfallabrechnung: Pro erstelltem und freigeschaltetem Dokument wird der jeweils gültige Einzelpreis berechnet.
    b) Credit-Pakete: Vorabkauf von Credits, die zur Freischaltung von Dokumenten verwendet werden. Credits sind 12 Monate ab Kauf gültig und verfallen danach ersatzlos. Eine Auszahlung ungenutzter Credits erfolgt nicht.
    c) Abonnements: Monatliche oder jährliche Abonnements mit unbegrenzter Nutzung. Abonnements verlängern sich automatisch um die jeweilige Laufzeit, wenn sie nicht mindestens 24 Stunden vor Ablauf gekündigt werden.
5.2 Alle Preise verstehen sich inkl. gesetzlicher Umsatzsteuer. Die jeweils aktuellen Preise sind in der App ersichtlich.
5.3 Die Freischaltung, der Download oder der Versand eines finalen Dokuments erfolgt erst nach erfolgreicher Zahlung.
5.4 Bei Einwilligung des Nutzers in die sofortige Vertragsausführung erlischt das Widerrufsrecht mit Bereitstellung des digitalen Inhalts (siehe Ziffer 6.2).

6. Zahlungsdienstleister
6.1 Die Zahlungsabwicklung erfolgt über folgende externe Zahlungsdienstleister:
    a) Stripe Payments Europe Ltd., Irland (stripe.com)
    b) PayPal (Europe) S.à r.l. et Cie, S.C.A., Luxemburg (paypal.com)
6.2 Für die Zahlungsabwicklung gelten ergänzend die jeweiligen Nutzungsbedingungen und Datenschutzerklärungen der Zahlungsdienstleister.
6.3 Rechnungen werden elektronisch im Nutzerkonto bereitgestellt.

7. Widerrufsbelehrung (nur für Verbraucher)
7.1 Verbrauchern steht bei Fernabsatzverträgen grundsätzlich ein 14-tägiges Widerrufsrecht zu.
7.2 BEI DIGITALEN INHALTEN ERLISCHT DAS WIDERRUFSRECHT, sobald wir mit der Ausführung des Vertrags begonnen haben, nachdem der Nutzer (1) ausdrücklich zugestimmt hat, dass wir mit der Ausführung des Vertrags vor Ablauf der Widerrufsfrist beginnen, und (2) seine Kenntnis davon bestätigt hat, dass er durch seine Zustimmung mit Beginn der Ausführung des Vertrags sein Widerrufsrecht verliert. Die Freischaltung und Bereitstellung des finalen Dokuments zum Download oder Versand stellt eine solche Ausführung dar.
7.3 Der Nutzer wird vor der Freischaltung kostenpflichtiger digitaler Inhalte über den Widerrufsverlust informiert und muss diesem ausdrücklich zustimmen.

8. Verfügbarkeit, Wartung, Höhere Gewalt
8.1 Wir bemühen uns um eine hohe Verfügbarkeit der Plattform, gewährleisten jedoch keine 24/7-Verfügbarkeit. Wartungsarbeiten können zu temporären Ausfällen führen.
8.2 Bei höherer Gewalt, Stromausfällen, Internetstörungen, Cyberangriffen oder anderen außerhalb unseres Einflussbereichs liegenden Ereignissen übernehmen wir keine Haftung für Ausfälle oder Verzögerungen.
8.3 Geplante Wartungsarbeiten kündigen wir nach Möglichkeit im Voraus an.

9. Mitwirkungspflichten und Inhalte der Nutzer
9.1 Der Nutzer ist verpflichtet, für alle von ihm hochgeladenen (Widerspruchs-Funktion) oder eingegebenen (Schreiben-Generator) Inhalte und Informationen die erforderlichen Rechte zu besitzen und sicherzustellen, dass diese keine Rechte Dritter verletzen.
9.2 Der Nutzer ist für die inhaltliche Wahrheit, Richtigkeit und rechtliche Zulässigkeit seiner Eingaben und der daraus resultierenden Dokumente allein verantwortlich.
9.3 Verboten sind rechtswidrige, beleidigende, diskriminierende, unwahre oder sonstige unzulässige Inhalte. Wir behalten uns die Sperrung/Löschung solcher Inhalte und des Nutzerkontos vor.
9.4 Der Nutzer räumt uns ein einfaches, weltweites, auf die Vertragsdauer beschränktes Nutzungsrecht ein, die von ihm bereitgestellten Inhalte zum Zweck der Vertragserfüllung (Analyse, Texterstellung, Support) zu speichern, technisch zu verarbeiten und an zur Leistungserbringung eingesetzte KI-Dienstleister (stets innerhalb der EU oder nach äquivalenten Datenschutzstandards) zu übermitteln.

10. Nutzungsrechte an der Plattform
10.1 Die vom Nutzer erstellten und (sofern kostenpflichtig) bezahlten Dokumente dürfen für eigene private und geschäftliche Zwecke uneingeschränkt genutzt werden.
10.2 Automatisierte Abfragen (Scraping), Reverse Engineering oder eine missbräuchliche Nutzung der Plattform sind untersagt.

11. Protokollierung, Datenverarbeitung
11.1 Zur Leistungserbringung, Fehleranalyse und Sicherheit protokollieren wir Nutzungsaktivitäten (Log-Dateien). Details regelt unsere Datenschutzerklärung.
11.2 Nutzereingaben werden ausschließlich zur Vertragserfüllung (Dokumentenerstellung) verarbeitet und nicht für andere Zwecke verwendet.

12. Gewährleistung und Haftung
12.1 Wir haften unbeschränkt bei Vorsatz, grober Fahrlässigkeit sowie bei Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit. Dies gilt auch für Ansprüche nach dem Produkthaftungsgesetz.
12.2 Für die inhaltliche Richtigkeit, juristische Korrektheit oder Vollständigkeit der KI-generierten Texte wird KEINE Gewährleistung oder Haftung übernommen. Die Nutzung erfolgt auf eigenes Risiko des Nutzers (siehe Ziffer 2).
12.3 Bei einfach fahrlässiger Verletzung wesentlicher Vertragspflichten (Kardinalpflichten) ist unsere Haftung auf den vorhersehbaren, vertragstypischen Schaden begrenzt. Im Übrigen ist die Haftung für einfache Fahrlässigkeit ausgeschlossen.
12.4 Die Haftung für mittelbare Schäden, entgangenen Gewinn oder sonstige Vermögensschäden ist ausgeschlossen, sofern nicht Vorsatz oder grobe Fahrlässigkeit vorliegt.

13. Kündigung, Sperrung
13.1 Registrierte Nutzer können ihr Konto jederzeit ohne Einhaltung einer Frist kündigen.
13.2 Wir können Konten bei Verstoß gegen diese AGB, rechtswidrigem Verhalten oder missbräuchlicher Nutzung sperren oder kündigen.
13.3 Abonnements können von beiden Seiten unter Einhaltung der vereinbarten Kündigungsfristen gekündigt werden.

14. Datenschutz
Die Verarbeitung personenbezogener Daten richtet sich nach unserer separaten Datenschutzerklärung, die auf der Webseite abrufbar ist.

15. Änderungen der AGB, Schlussbestimmungen
15.1 Wir können diese AGB mit Wirkung für die Zukunft ändern. Über Änderungen informieren wir in Textform. Bei wesentlichen Änderungen wird die Zustimmung des Nutzers eingeholt.
15.2 Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Gerichtsstand für Kaufleute ist der Sitz von Widerspruch24.
15.3 Online-Streitbeilegung: Die EU-Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit, die Sie unter https://ec.europa.eu/consumers/odr/ finden. Wir sind zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle nicht verpflichtet und nicht bereit.
15.4 Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.

– Ende der AGB –
Stand: 24.09.2025
Kontakt: Widerspruch24, Inhaber Guido Gall, Buutendörp 19, 19322 Breese / OT Kuhblank, Deutschland
Telefon: +49 3877 5669413 · Fax: +49 3877 5653908 · E-Mail: info@best-preis.net`;

export default function Agb() {
  const osLink = 'https://ec.europa.eu/consumers/odr/';
  const AGB_MD = AGB_TEXT.replaceAll(osLink, `[${osLink}](${osLink})`);

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
            <h1 className="text-3xl font-bold text-white">Allgemeine Geschäftsbedingungen</h1>
          </div>
        </div>

        {/* Content */}
        <LegalProse markdown={AGB_MD} />
      </div>
    </div>
  );
}
