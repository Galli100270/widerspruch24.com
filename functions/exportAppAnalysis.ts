import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const marginX = 15;
    const lineWidth = 180; // usable width
    let y = 20;

    const now = new Date().toLocaleString('de-DE');

    // Normalize text to ASCII-friendly for jsPDF standard fonts
    const normalizeText = (s) => (s || '')
      .replace(/[\u2010-\u2015]/g, '-') // various dashes/hyphens
      .replace(/\u2212/g, '-') // minus sign
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'") // single quotes
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"') // double quotes
      .replace(/\u2026/g, '...') // ellipsis
      .replace(/\u2022/g, '-') // bullet
      .replace(/[\u00A0\u2007\u202F]/g, ' ') // non-breaking spaces
      .replace(/[\u2705]/g, '-') // checkmark
      .replace(/[\uFE0F]/g, '') // variation selector
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, '') // emojis and symbols
    ;

    const addTitle = (text) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(text, marginX, y);
      y += 8;
    };

    const addSubtitle = (text) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(text, marginX, y);
      y += 6;
    };

    const addParagraph = (text) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(normalizeText(text), lineWidth);
      for (const line of lines) {
        if (y > 285) { doc.addPage(); y = 20; }
        doc.text(line, marginX, y);
        y += 5;
      }
      y += 1;
    };

    const addBullets = (items) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      for (const it of items) {
        const lines = doc.splitTextToSize(normalizeText(`- ${it}`), lineWidth);
        for (const line of lines) {
          if (y > 285) { doc.addPage(); y = 20; }
          doc.text(line, marginX, y);
          y += 5;
        }
      }
      y += 2;
    };

    // Header
    addTitle('Widerspruch24 – Selbstanalyse & Launch-Leitfaden (inkl. Zahlungsabwicklung)');
    addParagraph(`Erstellt für: ${user.full_name || user.email} | Stand: ${now}`);

    // 1) Kurzprofil
    addSubtitle('1) Kurzprofil der App');
    addParagraph('Widerspruch24 ist eine KI-gestützte Plattform zum Erstellen, Verwalten und Versenden rechtlicher Widersprüche. Der spezialisierte Assistent “Paragraphen‑Heini” liefert fundierte Antworten und DIN‑5008‑konforme Entwürfe mit aktueller Rechtslage.');
    addBullets([
      'KI-Assistent Paragraphen‑Heini mit Live‑Rechtsrecherche (web_search) und Quellenangaben.',
      'Fallverwaltung (Case) mit Status, Fristen, Absender-/Referenzdaten, Analyse‑Historie.',
      'Dokumentenverwaltung (Evidence) inkl. OCR‑Daten und Metadaten.',
      'Briefentwürfe (Letter) nach DIN 5008, verknüpft mit Fällen.',
      'Mehrsprachigkeit (DE/EN/AR), PWA/SEO‑Grundlagen und Monitoring.',
    ]);

    // 2) Funktionsumfang im Detail
    addSubtitle('2) Funktionsumfang im Detail');
    addBullets([
      'Chat-Oberfläche + WhatsApp-Anbindung für den Assistenten.',
      'Kontextsensitive Q&A: Status, Fristen, Referenz, Dokumentdaten.',
      'Automatisierte Entwurfs-Erstellung mit Normzitaten und klaren Anträgen.',
      'Entitäten: Case, Evidence, Letter, Template, GuestSession, Transaction, StripeEvent.',
      'Preview/Export von Schreiben, Option für spätere E‑Mail‑Versendung.',
    ]);

    // 3) Stärken
    addSubtitle('3) Stärken');
    addBullets([
      'Hohe juristische Qualität durch verpflichtende Live‑Recherche & Quellen.',
      'Niedrige Nutzungshürde dank Chat/WhatsApp und automatisierter Entwürfe.',
      'Solide Datenmodelle und bereits vorbereitete Zahlungsintegration.',
    ]);

    // 4) Konkrete Verbesserungen
    addSubtitle('4) Konkrete Verbesserungen (Priorisiert)');
    addBullets([
      'Fristen‑Automatisierung: Geplante Funktion, die Case.deadline prüft und Erinnerungen/E‑Mails auslöst.',
      'Dokument‑Autoanalyse: Nach Evidence‑Upload Schlüsselwerte (Aktenzeichen, Datum, Absender) extrahieren und Case vorbefüllen.',
      'Vorlagen‑Studio: Admin‑UI zur Verwaltung/Versionierung von Templates inkl. Platzhaltern.',
      'Visuelle Fallübersicht: Zeitleiste/Kanban für Status & zugehörige Schreiben/Dokumente.',
      'Qualitätssicherung: In‑App‑Feedback für Antworten/Entwürfe (Daumen/Kommentar).',
    ]);

    // 5) Schritte bis zur Veröffentlichung
    addSubtitle('5) Schritte bis zur Veröffentlichung');
    addBullets([
      'Code-Freeze und Regressionstests (kritisch: Assistent, Schreiben‑Erstellung, Upload).',
      'Performance-/UX‑Feinschliff (Ladezeiten, Mobile‑Optimierung, Barrierefreiheit).',
      'Rechtstexte final: AGB, Datenschutz, Impressum (DSGVO, Auftragsverarbeitung).',
      'Monitoring & Analytics final prüfen (fehlerarme Logs, Events).',
      'Custom Domain verbinden und SSL prüfen.',
    ]);

    // 6) Zahlungsabwicklung (Stripe)
    addSubtitle('6) Zahlungsabwicklung (Stripe) – To‑Dos');
    addBullets([
      'Stripe Live‑Konto vollständig einrichten (Firmendaten, Bank, Branding).',
      'Produkte & Preise in Stripe anlegen (Einzelfall, Bundles, Abos).',
      'BASE44: Secret STRIPE_SECRET (live) gesetzt lassen; ggf. STRIPE_WEBHOOK_SECRET ergänzen.',
      'Webhook im Stripe‑Dashboard auf den Base44‑Endpoint setzen (checkout.session.completed, invoice.paid, …).',
      'End‑to‑End testen: Checkout → Redirect → Event‑Verarbeitung → Transaction/StripeEvent‑Erstellung.',
      'Refund‑Flow und Rechnungserstellung (generateInvoice) testweise durchspielen.',
    ]);

    // 7) Go‑Live Checkliste
    addSubtitle('7) Go‑Live Checkliste');
    addBullets([
      '✅ Zahlungen live erfolgreich getestet (mind. 2 reale Transaktionen).',
      '✅ Webhook‑Events kommen an und werden idempotent verarbeitet.',
      '✅ Rechtstexte/Datenschutz ok; Cookie‑Banner & Einwilligungen aktiv.',
      '✅ Backup‑Kontakt/Support‑Prozess definiert; Fehlerseiten vorhanden.',
      '✅ Notfallplan (Rollback/Feature‑Toggle) dokumentiert.',
    ]);

    // Footer
    if (y > 280) { doc.addPage(); y = 20; }
    doc.setDrawColor(150);
    doc.line(marginX, 287, marginX + lineWidth, 287);
    doc.setFontSize(9);
    doc.text('Widerspruch24 – Interner Analyse- & Launch-Report | Automatisch generiert', marginX, 293);

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Widerspruch24_App_Analyse_und_Launchleitfaden.pdf"'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});