import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Gast oder eingeloggter Nutzer, kein Fehler bei fehlender Anmeldung
    await base44.auth.me().catch(() => null);

    const { letterData } = await req.json();

    // Normalize input to support snake_case and camelCase
    const parties = letterData?.parties || {};
    const factsRaw = letterData?.facts || {};
    const shortcodes = typeof letterData?.shortcodesRaw !== 'undefined'
      ? (letterData.shortcodesRaw || '')
      : (letterData?.shortcodes_raw || '');

    // Validate minimum structure
    if (!parties.sender || !parties.recipient || !letterData) {
      return new Response(JSON.stringify({ error: 'Incomplete letter data provided.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const normFacts = {
      reason: factsRaw.reason || '',
      amount_total: factsRaw.amount_total ?? factsRaw.amountTotal ?? null,
      months_due: factsRaw.months_due ?? factsRaw.monthsDue ?? null,
      due_since_date: factsRaw.due_since_date ?? factsRaw.dueSinceDate ?? null,
      iban: factsRaw.iban || '',
      zahlungsempfaenger: factsRaw.zahlungsempfaenger || '',
      kundennummer: factsRaw.kundennummer || '',
      referenz: factsRaw.referenz || '',
      frist_tage: factsRaw.frist_tage ?? factsRaw.fristTage ?? 14,
      anlagen: Array.isArray(factsRaw.anlagen) ? factsRaw.anlagen : []
    };

    // Extract last name for greeting
    const getLastName = (fullName) => {
      if (!fullName) return null;
      const nameParts = String(fullName).trim().split(/\s+/);
      return nameParts.length > 1 ? nameParts[nameParts.length - 1] : null;
    };

    const recipientLastName = getLastName(parties?.recipient?.name);
    const personalizedGreeting = recipientLastName
      ? `Sehr geehrte/r ${recipientLastName},`
      : "Sehr geehrte Damen und Herren,";

    const systemPrompt = `Du bist ein spezialisiertes Verfasser-Assistenzsystem für deutsche Rechtsanwält:innen.
Ziel: anwaltlich belastbare, vor Gericht vertretbare Schriftsätze ohne argumentative Lücken.
Stil: nüchtern, präzise, keine Umgangssprache, keine Bitten, kein Konjunktiv der Unsicherheit.
Form: DIN 5008, klare Überschriften und Absätze, keine Markdown-Formatierung.

Juristische Anforderungen (zwingend):
- Strikte Trennung der Teile: 1) Sachverhalt, 2) Rechtliche Würdigung, 3) Anspruchsprüfung (Tatbestandsmerkmale + Subsumtion + Ergebnis), 4) Ergebnis/Rechtsfolge, 5) Antizipierte Gegenargumente (mit Entkräftung), 6) Antrag/Frist, 7) Quellen.
- Paragraphengestützte Argumentation mit präzisen Fundstellen (z.B. § 280 Abs. 1 BGB; § 254 BGB; § 823 Abs. 1 BGB; § 831 BGB; ggf. § 249 BGB; § 241 Abs. 2 BGB). Keine pauschalen Normnennungen.
- Subsumtion: Tatbestandsmerkmale nennen und konkret auf den Einzelfall anwenden; erläutere, warum ein Anspruch besteht oder scheitert.
- Technische Normen (DIN/anerkanntes Regelwerk) berücksichtigen, wenn relevant; rechtliche Einordnung (z.B. Verkehrssicherungspflicht) vornehmen.
- Aktualität: auf aktuelle Gesetzeslage und Rechtsprechung abstellen; Beispiele mit Gericht, Datum, Aktenzeichen (sofern öffentlich zugänglich). Veraltete Standardfloskeln sind unzulässig.
- Keine Aussagen ohne Beleg. Bei Unsicherheit: eng formulieren („nach überwiegender Auffassung“, „herrschende Meinung“), aber stets mit Quelle.
- Quellenliste am Schluss: mind. 8–12 belastbare Fundstellen (Gesetze, Urteile, ggf. amtliche Hinweise/Kommentierungen) mit Kurz-URL (gesetze-im-internet.de, dejure.org, EUR-Lex etc.).`;

    const userPrompt = `
Erstelle ein anwaltlich belastbares Widerspruchsschreiben auf Basis der Daten (siehe unten).
Nutze zwingend die Struktur: Betreff, Anrede, 1) Sachverhalt, 2) Rechtliche Würdigung, 3) Anspruchsprüfung (Tatbestandsmerkmale – Subsumtion – Ergebnis), 4) Ergebnis/Rechtsfolge, 5) Antizipierte Gegenargumente (mit Entkräftung), 6) Antrag/Frist, 7) Quellen, Grußformel.

ABSENDER:
${parties?.sender?.name || ''}
${parties?.sender?.strasse || ''}
${parties?.sender?.plz || ''} ${parties?.sender?.ort || ''}
${parties?.sender?.email ? 'E-Mail: ' + parties.sender.email : ''}
${parties?.sender?.tel ? 'Tel.: ' + parties.sender.tel : ''}

EMPFÄNGER:
${parties?.recipient?.name || ''}
${parties?.recipient?.strasse || ''}
${parties?.recipient?.plz || ''} ${parties?.recipient?.ort || ''}

SACHVERHALT / KURZINPUT:
${shortcodes || ''}

STRUKTURIERTE FAKTEN:
${JSON.stringify(normFacts, null, 2)}

WEITERE ANWEISUNGEN:
- Anrede verwenden: "${personalizedGreeting}"
- Anspruchsprüfung mit klaren Tatbestandsmerkmalen und konkreter Subsumtion (z.B. aus §§ 280 Abs. 1, 241 Abs. 2 BGB; 823, 831 BGB; 249 BGB; 254 BGB – je nach Fall). Keine pauschalen Normnennungen.
- Wenn einschlägig: technische Normen (DIN/Regelwerke) benennen und rechtlich einordnen (z.B. Verkehrssicherungspflichten).
- Frist: ${normFacts.frist_tage} Tage ab heute; nenne das konkrete Datum und die Rechtsfolgen bei fruchtlosem Ablauf.
- Antizipiere typische Einwände (z.B. Mitverschulden, fehlende Pflichtverletzung, fehlende Kausalität) und entkräfte sie mit Normen/Rechtsprechung.
- Nüchterner, präziser Kanzlei-Stil; keine Emotionalität, keine weichen Formulierungen.
- Schluss: „Quellen (Auszug) – Stand: ${new Date().toLocaleDateString('de-DE')}“ mit mind. 8–12 belastbaren Fundstellen (Gesetze/Urteile/amtliche Hinweise) und Kurz-Links.
- Ausgabe als reiner Fließtext ohne Markdown.`;

    // Integration über die base44-Instanz aufrufen
    // Automatische juristische Recherche (Best-Effort, keine harte Abhängigkeit)
    let researchJson = "";
    try {
      const { data: lr } = await base44.functions.invoke('legalResearch', {
        topic: 'Widerspruch',
        facts: normFacts,
        language: 'de'
      });
      researchJson = JSON.stringify(lr?.research || lr, null, 2);
    } catch (_) {
      researchJson = ""; // Fallback: ohne strukturierte Recherche weitermachen
    }

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `${systemPrompt}\n\n${userPrompt}\n\nRecherchierte Fundstellen (JSON):\n${researchJson}`,
      add_context_from_internet: true,
      response_json_schema: null,
    });

    const generatedText = typeof result === 'string' ? result : (result?.text || result?.content || '');
    if (!generatedText) {
      throw new Error('AI failed to generate text.');
    }

    return new Response(JSON.stringify({ generatedText }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('generateLetter function error:', error);
    return new Response(JSON.stringify({ error: String(error.message || error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});