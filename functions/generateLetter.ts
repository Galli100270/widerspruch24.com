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
      : "Sehr geehrte Damen und Herren,"; // bewusst neutral; kein Kanzlei-/Vertretungsbezug

    const systemPrompt = `Du verfasst juristisch belastbare Schriftsätze im deutschen Recht.
Ziel: gerichtsfeste, lückenlose Argumentation.
Perspektive: IMMER Ich-Perspektive des Absenders (eigenständig handelnde Person), niemals als Anwalt/Kanzlei/Vertreter.
Verbotene Formulierungen: „in anwaltlicher Vertretung“, „als Ihr Rechtsanwalt“, „unsere Kanzlei“, „wir vertreten“ u.ä.
Keine Hinweise auf Plattformen, KI, Tools oder interne Workflows.
Stil: nüchtern, präzise, professionell; keine Umgangssprache, keine weichen Formulierungen.
Form: DIN 5008, klare Überschriften/Absätze, keine Markdown-Syntax.

Arbeitsgrundsatz:
- Nutzerangaben gelten als Tatsachenvortrag; KEINE Ergänzung/Erfindung.
- Unklare/widersprüchliche/fehlende Angaben nur juristisch bewerten (Beweislast, Indizwirkung), keine „internen Hinweise“ im Schriftsatz.
- Nur allgemein anerkannte rechtliche Maßstäbe ergänzen, keine neuen Tatsachen.

Juristische Anforderungen (zwingend):
- Struktur: 1) Sachverhalt, 2) Rechtliche Würdigung, 3) Anspruchsprüfung (Tatbestandsmerkmale → Subsumtion → Ergebnis), 4) Ergebnis/Rechtsfolge, 5) Antizipierte Gegenargumente (mit Entkräftung), 6) Antrag/Frist, 7) Quellen.
- Paragraphengestützt mit präzisen Fundstellen (z.B. § 280 Abs. 1, § 254, § 249, § 241 Abs. 2, § 823, § 831 BGB je nach Fall). Keine pauschalen Normnennungen ohne Subsumtion.
- Technische Normen (DIN/Regelwerke) rechtlich einordnen (z.B. Verkehrssicherungspflichten), sofern relevant.
- Aktuelle Rechtslage/Rechtsprechung (Gericht, Datum, Az.) berücksichtigen.
- Keine unbelegten Aussagen; bei Unsicherheit enge Formulierungen mit Quelle.
- Abschluss: Quellenliste (8–12 belastbare Fundstellen; z.B. gesetze-im-internet.de, dejure.org, EUR-Lex) mit Datum „Stand: <heute>“. `;

    const userPrompt = `
Erstelle ein belastbares Widerspruchs-/Abwehrschreiben ausschließlich auf Basis der gelieferten Informationen.
Perspektive: Ich-Form des Absenders (eigenständig handelnde Person). Kein Kanzlei-/Anwalts-/Vertretungsbezug und keinerlei Hinweise auf Plattformen/KI/Tools.
Arbeitsgrundsatz: KEINE Tatsachenergänzungen; unklare/fehlende Angaben nur juristisch bewerten (Beweislast beachten), ohne dies im Schreiben auszuschmücken.
Struktur: Betreff, Anrede, 1) Sachverhalt, 2) Rechtliche Würdigung, 3) Anspruchsprüfung (Tatbestandsmerkmale – Subsumtion – Ergebnis), 4) Ergebnis/Rechtsfolge, 5) Antizipierte Gegenargumente (mit Entkräftung), 6) Antrag/Frist, 7) Quellen, Grußformel + Name.

ABSENDER:
${parties?.sender?.name || ''}
${parties?.sender?.strasse || ''}
${parties?.sender?.plz || ''} ${parties?.sender?.ort || ''}
${parties?.sender?.email ? 'E-Mail: ' + parties.sender.email : ''}
${parties?.sender?.tel ? 'Tel.: ' + parties.sender.tel : ''}
Rolle (falls vorhanden): ${normFacts.rolle || normFacts.role || ''}

EMPFÄNGER:
${parties?.recipient?.name || ''}
${parties?.recipient?.strasse || ''}
${parties?.recipient?.plz || ''} ${parties?.recipient?.ort || ''}
Aktenzeichen/Referenz (falls vorhanden): ${normFacts.referenz || normFacts.kundennummer || ''}

SACHVERHALT / KURZINPUT:
${shortcodes || ''}

STRUKTURIERTE FAKTEN:
${JSON.stringify(normFacts, null, 2)}

KONFIGURATION (falls vorhanden):
- Ton: ${normFacts.ton || normFacts.tone || 'sachlich-neutral'}
- Eskalationsstufe: ${normFacts.escalation || 'Erstes Widerspruchsschreiben'}

WEITERE ANWEISUNGEN:
- Anrede: "${personalizedGreeting}"
- Anspruchsprüfung mit klaren Tatbestandsmerkmalen und konkreter Subsumtion (z.B. §§ 280 Abs. 1, 241 Abs. 2, 249, 254, 823, 831 BGB – nur bei Relevanz).
- Relevante DIN-/technische Normen rechtlich einordnen (z.B. Verkehrssicherungspflichten), sofern einschlägig.
- Beweismittel: nur die vorliegenden (z.B. Anlagen/Schriftverkehr) würdigen; nichts hinzufügen.
- Frist: ${normFacts.frist_tage} Tage ab heute inkl. Datum und Rechtsfolgenhinweis.
- Typische Gegeneinwände (Mitverschulden, Pflichtenkreise, Kausalität) antizipieren und widerlegen mit Normen/Rechtsprechung.
- Stil: nüchtern, präzise, ohne Umgangssprache; keine verbotenen Formulierungen (Anwalt/Kanzlei/Vertretung/„wir vertreten“ etc.).
- Schluss: „Quellen (Auszug) – Stand: ${new Date().toLocaleDateString('de-DE')}“ (8–12 Fundstellen) und Grußformel „Mit freundlichen Grüßen“ + eigener Name.
- Ausgabe: reiner Fließtext, keine Markdown-Syntax.`;

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