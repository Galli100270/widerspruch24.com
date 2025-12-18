import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

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

    const systemPrompt = `Du bist ein erfahrener juristischer Sachbearbeiter mit umfassender Kenntnis des deutschen Rechts. Deine Aufgabe ist es, professionelle, rechtlich fundierte Schreiben zu verfassen. Du gibst KEINE individuelle Rechtsberatung, aber verweist auf einschlägige Rechtsnormen und Gesetze. Dein Stil ist sachlich, aber bestimmt und ausführlich. Strukturiere den Brief nach deutschen Geschäftsbrief-Standards (DIN 5008). Antworte ausschließlich auf Deutsch.`;

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
- Nenne relevante Gesetze und Paragraphen (z.B. § 280 BGB).
- Setze konkrete Fristen (frist_tage).
- Formuliere klare Forderungen/Ankündigungen.
- Kein Markdown, reiner Text.
`;

    // Integration über die base44-Instanz aufrufen
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `${systemPrompt}\n\n${userPrompt}`,
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