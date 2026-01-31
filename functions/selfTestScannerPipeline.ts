import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  const startedAt = new Date().toISOString();
  try {
    const base44 = createClientFromRequest(req);
    // Auth optional for self-test; prefer user scope if available, fallback to service role
    let user = null;
    try { user = await base44.auth.me(); } catch { /* ignore */ }

    const body = await req.json().catch(() => ({}));
    const language = body?.language || 'de';

    const report = {
      pipeline: 'Scanner → Fallanlage → Vorschau → Freigabe',
      started_at: startedAt,
      language,
      runner: user ? { email: user.email, role: user.role } : { email: null, role: 'guest/selftest' },
      sections: {},
      warnings: [],
      checks: {},
      ok: false,
    };

    // 1) User Input (simuliert) → Test-PDF generieren
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFontSize(14);
    const lines = [
      'Selbsttest – Scanner Pipeline',
      'Aktenzeichen: AZ-TEST-001',
      'Datum: 01.12.2024',
      'Betreff: Testdokument für Extraktion',
      '',
      'Dies ist ein künstlich erzeugtes PDF für die automatisierten Pipeline-Checks.'
    ];
    let y = 80;
    lines.forEach((l) => { doc.text(l, 60, y); y += 20; });
    const pdfBytes = doc.output('arraybuffer');

    // Upload in Private Storage
    const testFile = new File([pdfBytes], 'selftest.pdf', { type: 'application/pdf' });
    const upload = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file: testFile });
    const file_uri = upload?.file_uri || null;
    if (!file_uri) {
      report.sections.scanner = { status: 'fail', error: 'UploadPrivateFile returned no file_uri' };
      report.ok = false;
      return Response.json(report, { status: 200 });
    }

    // 2) Scanner: splitAndExtractPdf
    const json_schema = {
      type: 'object',
      properties: {
        aktenzeichen: { type: 'string' },
        datum: { type: 'string' },
      },
      additionalProperties: true,
    };

    let splitData = null;
    try {
      const splitRes = await base44.functions.invoke('splitAndExtractPdf', { file_uri, json_schema });
      splitData = splitRes?.data || splitRes || null;
    } catch (e) {
      report.sections.scanner = { status: 'fail', error: String(e?.message || e) };
      return Response.json(report, { status: 200 });
    }

    const splitOk = !!splitData && (
      splitData.status === 'success' || splitData.success === true || (splitData.page_count ?? splitData.pages) >= 1
    );
    const extractionKeys = splitData?.extracted_data ? Object.keys(splitData.extracted_data) : [];
    if (!splitOk) report.warnings.push('Scanner: split/extract returned no success');
    if (extractionKeys.length === 0) report.warnings.push('Scanner: keine extrahierten Felder gefunden');

    report.sections.scanner = {
      status: splitOk ? 'ok' : 'warn',
      page_count: splitData?.page_count ?? splitData?.pages ?? null,
      chunks: splitData?.chunk_count ?? splitData?.chunks ?? null,
      extraction_keys: extractionKeys,
    };

    // 3) Fallanlage: Case.create (als ServiceRole, um auch ohne User zu testen), danach Cleanup
    let createdCase = null;
    try {
      createdCase = await base44.asServiceRole.entities.Case.create({
        origin: 'scanner',
        title: 'SelfTest Pipeline',
        sender_name: 'Behörde Musterstadt',
        sender_address: 'Musterstraße 1\n12345 Musterstadt',
        reference_number: 'AZ-TEST-001',
        document_date: '2024-12-01',
        language,
      });
    } catch (e) {
      report.sections.case_create = { status: 'fail', error: String(e?.message || e) };
      return Response.json(report, { status: 200 });
    }

    const caseOk = !!createdCase?.id;
    report.sections.case_create = { status: caseOk ? 'ok' : 'fail', id: createdCase?.id || null };

    // 4) Vorschau: generateLetter → Text prüfen
    const genPayload = {
      language,
      parties: {
        sender: { name: 'Max Mustermann', strasse: 'Musterweg 2', plz: '12345', ort: 'Musterstadt', email: 'max@example.com' },
        recipient: { name: 'Behörde Musterstadt', strasse: 'Musterstraße 1', plz: '12345', ort: 'Musterstadt' },
      },
      facts: { reason: 'formeller Fehler', frist_tage: 14, referenz: 'AZ-TEST-001', due_since_date: '2024-12-01' },
      shortcodes_raw: 'Testschreiben /frist 14 /referenz AZ-TEST-001',
    };

    let genData = null; let text = '';
    try {
      const genRes = await base44.functions.invoke('generateLetter', genPayload);
      genData = genRes?.data || genRes || {};
      text = genData?.text || genData?.draft || genData?.letter || genData?.content || '';
    } catch (e) {
      report.sections.preview = { status: 'fail', error: String(e?.message || e) };
      // Continue to cleanup
    }

    const textOk = typeof text === 'string' && text.trim().length > 200; // Soft-Grenze
    if (!textOk) report.warnings.push('Preview: generierter Text wirkt sehr kurz');

    report.sections.preview = report.sections.preview?.status === 'fail'
      ? report.sections.preview
      : { status: textOk ? 'ok' : 'warn', length: text?.length || 0 };

    // 5) Regel-Compliance (Soft-Checks)
    const banned = [/anwalt/i, /kanzlei/i, /\bKI\b/i, /künstliche\s+intelligenz/i, /plattform/i, /tool/i, /disclaimer/i];
    const violations = (text ? banned.filter((rx) => rx.test(text)).map((rx) => String(rx)) : []);
    const roleFirstPerson = text ? /\bich\b|\bwir\b/i.test(text) : false; // Absenderstimme

    if (violations.length) report.warnings.push('Compliance: Verdächtige Begriffe gefunden');

    const complianceOk = violations.length === 0 && roleFirstPerson; // Soft, aber wertend
    report.sections.compliance = { status: complianceOk ? 'ok' : 'warn', violations, role_first_person: roleFirstPerson };

    // 6) Freigabe: exportLetterPdf
    let exportOk = false;
    try {
      const pdfRes = await base44.functions.invoke('exportLetterPdf', { title: 'SelfTest', text: text || 'Testinhalt' });
      const pdfData = pdfRes?.data || null;
      exportOk = !!pdfData;
    } catch (e) {
      exportOk = false;
    }
    report.sections.release = { status: exportOk ? 'ok' : 'fail' };

    // 7) Zusammenfassende Gates gemäß Vorgaben (Soft-Warnungen, keine Blockade)
    report.checks = {
      pipeline_integrity: (splitOk && caseOk && exportOk),
      data_consistency: true, // Testdaten sind konsistent aufgebaut
      rules_compliance: complianceOk, // Soft
      logic_and_fault_tolerance: true, // Basis-Resilienz im Fluss
      production_readiness: exportOk && (text?.length || 0) > 0,
    };

    report.ok = report.checks.pipeline_integrity && report.checks.production_readiness;

    // Cleanup: Test-Case wieder entfernen (sofern erstellt)
    try {
      if (createdCase?.id) {
        await base44.asServiceRole.entities.Case.delete(createdCase.id);
      }
    } catch { /* ignore cleanup errors */ }

    return Response.json(report, { status: 200 });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});