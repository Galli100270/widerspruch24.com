
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import LegalProse from '@/components/LegalProse';

const DATENSCHUTZ_TEXT = `Datenschutzerklärung
für Widerspruch24 (widerspruch24.com)

A. Verantwortlicher
Widerspruch24, Inhaber Guido Gall
Buutendörp 19, 19322 Breese / OT Kuhblank, Deutschland
Telefon: +49 3877 5669413 · Fax: +49 3877 5653908
E-Mail: info@best-preis.net

B. Geltungsbereich
Diese Hinweise informieren über die Verarbeitung personenbezogener Daten bei Nutzung von „widerspruch24.com" (Web-App inkl. Beta-/Gastmodus), der dazugehörigen Funktionen (Upload/SmartScanner, Vorschau, Checkout, Download/Versand, Feedback) sowie über Ihre Rechte nach der DSGVO.

C. Kategorien verarbeiteter Daten
1. Nutzungs-/Protokolldaten: IP-Adresse, Datum/Uhrzeit, Request-Header, Referrer, Geräte-/Browserdaten, Fehlercodes, Session-IDs.
2. Inhalts-/Falldaten: von Ihnen hochgeladene Dokumente (z. B. Bescheide, Rechnungen, Schreiben), Metadaten (Dateiname/-größe/-typ), aus OCR/Analyse extrahierte Textbausteine.
3. Kontodaten (bei Registrierung): Name, E-Mail, Login-Daten, ggf. Rechnungs- und Kommunikationsdaten.
4. Zahlungsdaten: Transaktions-/Payment-IDs, Zahlungsstatus, genutzter Zahlungsdienstleister. Vollständige Karten-/Kontodaten werden NICHT bei uns gespeichert, sondern ausschließlich beim Zahlungsdienstleister verarbeitet.
5. Support-/Kommunikationsdaten: Inhalte Ihrer Anfragen, Kontaktwege, Protokollierung von Einwilligungen und Einstellungen (z. B. Cookie-Consent).

D. Zwecke und Rechtsgrundlagen (Art. 6 Abs. 1 DSGVO)
1. Bereitstellung der Plattform, Stabilität/Sicherheit (inkl. Fehleranalyse, Missbrauchs-/Angriffsabwehr): Art. 6 Abs. 1 lit. f DSGVO.
2. Vertragliche Leistung (Upload/Analyse/Generierung/Preview, Freischaltung/Download/Versand, Kontoverwaltung): Art. 6 Abs. 1 lit. b DSGVO.
3. Beta-/Gastmodus (30 Tage) und Wiedererkennung über technisch notwendiges Cookie: Art. 6 Abs. 1 lit. b und lit. f DSGVO.
4. Zahlungsabwicklung über Zahlungsdienstleister (Stripe, ggf. PayPal): Art. 6 Abs. 1 lit. b DSGVO; bei Prüfungen zur Betrugsprävention zusätzlich Art. 6 Abs. 1 lit. f DSGVO.
5. Einwilligungsbasierte Cookies/Tracking (sofern eingesetzt): Art. 6 Abs. 1 lit. a DSGVO i. V. m. § 25 Abs. 1 TTDSG.
6. Erfüllung gesetzlicher Pflichten (z. B. steuer-/handelsrechtliche Aufbewahrung): Art. 6 Abs. 1 lit. c DSGVO.
7. Kommunikation/Support: Art. 6 Abs. 1 lit. b und lit. f DSGVO.

E. Beta-Phase & Gastmodus
Während der Beta-Phase ist eine Nutzung ohne Registrierung („Gastmodus") für 30 Tage möglich. Zur Wiedererkennung wird ein technisch erforderliches HttpOnly-Cookie gesetzt. Nach Ablauf ist eine Registrierung erforderlich; vorhandene Gast-Fälle werden – soweit technisch zuordenbar – dem Nutzerkonto zugeordnet.

F. Cookies & Einwilligungen
Wir verwenden technisch notwendige Cookies (u. a. Session, Gastmodus-Wiedererkennung). Nicht erforderliche Cookies oder ähnliche Technologien werden – sofern eingesetzt – nur mit Ihrer Einwilligung gesetzt. Sie können Ihre Auswahl jederzeit über „Cookie-Einstellungen" im Footer ändern. Rechtsgrundlage: § 25 TTDSG / Art. 6 Abs. 1 lit. a DSGVO (für nicht notwendige Cookies), Art. 6 Abs. 1 lit. f DSGVO (für notwendige Cookies).

G. SmartScanner/OCR & KI-gestützte Verarbeitung
Für die Analyse hochgeladener Dateien (OCR/Strukturerkennung) sowie zur Generierung von Textvorschlägen können spezialisierte Drittanbieter-/Cloud-Dienste eingesetzt werden. Die Verarbeitung erfolgt ausschließlich zweckgebunden zur Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO). Bitte laden Sie keine Inhalte hoch, die besondere Kategorien personenbezogener Daten (Art. 9 DSGVO) enthalten, sofern dies für Ihren Fall nicht zwingend erforderlich ist.

H. Zahlungsabwicklung (Stripe, ggf. PayPal)
Zahlungen werden über folgende Anbieter abgewickelt:
– Stripe Payments Europe, Ltd. (Irland) – Datenschutzhinweise: https://stripe.com/de/privacy
– PayPal (Europe) S.à r.l. et Cie, S.C.A. (Luxemburg) – Datenschutzhinweise: https://www.paypal.com/de/webapps/mpp/ua/privacy-full
Im Rahmen der Abwicklung können Daten (Zahlungsdaten, Betrugspräventionsdaten, Geräteinfos) an die Anbieter übermittelt werden. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) und Art. 6 Abs. 1 lit. f DSGVO (Sicherheit/Betrugsprävention).

I. Versand/Download, E-Mail-Kommunikation
Nach Freischaltung stellen wir Dokumente zum Download bereit oder versenden sie – sofern Sie dies auswählen – per E-Mail. Dazu verarbeiten wir die von Ihnen angegebenen Empfängerdaten. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.

J. Hosting, Protokollierung, Sicherheit
Das Hosting und technische Betriebsdienste (z. B. Server, Content Delivery, E-Mail-Gateway, Logging, DDoS-Schutz) erfolgen bei beauftragten Auftragsverarbeitern. Es werden Logdaten zu Sicherheit, Fehleranalyse und Nachvollziehbarkeit verarbeitet. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.

K. Empfänger und Auftragsverarbeitung
Wir setzen sorgfältig ausgewählte Auftragsverarbeiter gemäß Art. 28 DSGVO ein (u. a. Hosting/Cloud, OCR/KI, E-Mail/Transaktion, Zahlungsabwicklung, Fehler-/Leistungsmonitoring). Diese verarbeiten Daten nur nach dokumentierter Weisung, sind vertraglich gebunden und werden datenschutzrechtlich auditiert.

L. Drittlandübermittlungen
Soweit Dienstleister Daten außerhalb der EU/des EWR verarbeiten (z. B. in den USA), erfolgen Übermittlungen auf Grundlage eines Angemessenheitsbeschlusses der EU-Kommission (sofern vorhanden) oder geeigneter Garantien gemäß Art. 44 ff. DSGVO (insb. EU-Standardvertragsklauseln) einschließlich ergänzender Schutzmaßnahmen.

M. Speicherdauer
1. Vertrags-/Falldaten: grundsätzlich bis zur Erfüllung der vertraglichen Zwecke; darüber hinaus gemäß gesetzlichen Aufbewahrungspflichten (i. d. R. 6–10 Jahre, z. B. steuer-/handelsrechtlich).
2. Log-/Sicherheitsdaten: in der Regel 7–90 Tage, sofern keine längere Aufbewahrung zur Vorfallaufklärung erforderlich ist.
3. Gastmodus-Cookie: 30 Tage ab erstmaliger Nutzung.
4. Einwilligungen: bis Widerruf und darüber hinaus, soweit Nachweispflichten bestehen.
5. Bewerbungs-/Supportdaten: nach Abschluss des Vorgangs, soweit keine gesetzlichen Pflichten entgegenstehen.

N. Pflicht zur Bereitstellung
Die Bereitstellung technisch notwendiger Daten (u. a. Session, Security) ist für die Nutzung der Plattform erforderlich. Ohne relevante Vertragsdaten (z. B. für Zahlungen) ist eine Leistungserbringung nicht möglich.

O. Keine automatisierten Einzelentscheidungen
Es finden keine ausschließlich automatisierten Entscheidungen i. S. d. Art. 22 DSGVO statt. KI-unterstützte Funktionen generieren Textvorschläge; die Entscheidung über deren Verwendung trifft der Nutzer.

P. Minderjährige
Das Angebot richtet sich an Personen ab 18 Jahren. Eine gezielte Ansprache Minderjähriger erfolgt nicht.

Q. Ihre Rechte (Art. 15–21 DSGVO)
Sie haben – unter den jeweiligen gesetzlichen Voraussetzungen – folgende Rechte:
• Auskunft (Art. 15),
• Berichtigung (Art. 16),
• Löschung (Art. 17),
• Einschränkung der Verarbeitung (Art. 18),
• Datenübertragbarkeit (Art. 20),
• Widerspruch (Art. 21) gegen Verarbeitungen auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO; bei Direktwerbung jederzeit.
• Widerruf erteilter Einwilligungen (Art. 7 Abs. 3) mit Wirkung für die Zukunft.
Zur Ausübung genügt eine formlose Mitteilung an: info@best-preis.net.

R. Beschwerderecht
Sie haben das Recht, bei einer Datenschutz-Aufsichtsbehörde Beschwerde einzulegen, insbesondere am Ort Ihres gewöhnlichen Aufenthalts, Ihres Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes.

S. Aktualität dieser Erklärung
Wir passen diese Datenschutzhinweise an, wenn dies erforderlich ist (z. B. bei Rechtsänderungen, neuen Diensten). Es gilt die jeweils veröffentlichte Fassung.

Stand: 23.09.2025`;

export default function Datenschutz() {
  const stripeLink = 'https://stripe.com/de/privacy';
  const paypalLink = 'https://www.paypal.com/de/webapps/mpp/ua/privacy-full';

  // Links als Markdown klickbar machen
  const DATENSCHUTZ_MD = DATENSCHUTZ_TEXT
    .replaceAll(stripeLink, `[${stripeLink}](${stripeLink})`)
    .replaceAll(paypalLink, `[${paypalLink}](${paypalLink})`);

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
            <h1 className="text-3xl font-bold text-white">Datenschutzerklärung</h1>
          </div>
        </div>

        {/* Content */}
        <div className="glass rounded-2xl p-8">
          <LegalProse markdown={DATENSCHUTZ_MD} />
        </div>
      </div>
    </div>
  );
}
