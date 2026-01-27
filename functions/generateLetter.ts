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
      ? `Sehr geehrte${recipientLastName.toLowerCase().includes('frau') || Math.random() > 0.5 ? ' Frau' : 'r Herr'} ${recipientLastName},`
      : "Sehr geehrte Damen und Herren,";

    const systemPrompt = `Du bist ein erfahrener juristischer Sachbearbeiter (deutsches Recht). Verfasse professionelle, rechtlich fundierte Schreiben nach DIN 5008 (Variante A, klare Absätze, sachlich-höflicher Ton). Du gibst KEINE individuelle Rechtsberatung, arbeitest aber mit belastbaren Normzitaten und aktueller Rechtsprechung (Gericht, Datum, Aktenzeichen). Füge am Ende eine kurze Quellenliste mit „Stand: <Datum>“ an.`;

    const userPrompt = `
Erstelle ein ausführliches, rechtlich fundiertes Schreiben basierend auf den folgenden Daten.

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

SACHVERHALT UND ANLIEGEN:
${shortcodes || ''}

STRUKTURIERTE DATEN:
${JSON.stringify(normFacts, null, 2)}

ANWEISUNGEN FÜR DEN BRIEF:
- Verwende die Anrede: "${personalizedGreeting}"
- Gliedere nach DIN 5008: Betreff, Anrede, Sachverhalt, Rechtliche Würdigung (mit präzisen Zitaten: z.B. § 280 Abs. 1 BGB; BGH, Urt. v. <Datum>, Az. ...), Antrag/Frist (konkretes Datum + Rechtsfolgenhinweis), Grußformel.
- Setze die Frist auf ${normFacts.frist_tage} Kalendertage ab heutigem Datum und nenne das konkrete Datum.
- Höflich-bestimmter, anwaltlicher Stil; keine Drohkulisse.
- Am Ende: „Quellen (Auszug) – Stand: ${new Date().toLocaleDateString('de-DE')}“ mit kurzen Links/Referenzen.
- Kein Markdown, reiner Text.
`;

    // Integration über die base44-Instanz aufrufen
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `${systemPrompt}\n\n${userPrompt}`,
      add_context_from_internet: true,
      response_json_schema: null,
    });

    const generatedText = result;
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