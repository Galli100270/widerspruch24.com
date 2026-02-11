import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Nightly Self-Test for Scanner → Case → Preview pipeline (soft-fail)
// Runs without end-user auth; uses service role for safe, non-destructive probes.
// Returns JSON summary with ok/fail counts and details.

Deno.serve(async (req) => {
  const startedAt = Date.now();
  const results = {};
  let tmpCaseId = null;

  try {
    const base44 = createClientFromRequest(req);

    // 1) Create a temporary Case (minimal fields)
    try {
      const kase = await base44.asServiceRole.entities.Case.create({
        origin: 'scanner',
        title: 'Nightly Self-Test',
        status: 'draft',
        language: 'de'
      });
      tmpCaseId = kase.id;
      results.case_create = { status: 'ok', id: kase.id };
    } catch (e) {
      results.case_create = { status: 'fail', error: e?.message || String(e) };
    }

    // 2) Try to invoke generateLetter (soft-fail if missing or error)
    try {
      if (tmpCaseId) {
        const payload = {
          caseId: tmpCaseId,
          objection_details: {
            main_objection_reason: 'Nightly self-test',
            detailed_reasoning: '',
            requested_outcome: ''
          },
          format: 'DIN5008',
          tone: 'sachlich'
        };
        const resp = await base44.asServiceRole.functions.invoke('generateLetter', payload);
        const data = resp?.data ?? resp;
        const text = data?.text || data?.letter || data?.content || data?.generated_text || '';
        results.generate_letter = { status: 'ok', has_text: !!(text && text.trim().length > 40) };

        // Store if we got a usable text (optional)
        if (text && text.trim().length > 40) {
          try {
            await base44.asServiceRole.entities.Case.update(tmpCaseId, { generated_text: text });
          } catch (_) {
            // non-fatal
          }
        }
      } else {
        results.generate_letter = { status: 'fail', error: 'no case created' };
      }
    } catch (e) {
      // Soft fail: function may be unavailable; keep test running
      results.generate_letter = { status: 'fail', error: e?.message || String(e) };
    }

    // 3) Optional: light read on Templates (sanity)
    try {
      const few = await base44.asServiceRole.entities.Template.list(1);
      results.templates_probe = { status: 'ok', count: Array.isArray(few) ? few.length : 0 };
    } catch (e) {
      results.templates_probe = { status: 'fail', error: e?.message || String(e) };
    }

    // Cleanup: delete temporary case
    if (tmpCaseId) {
      try { await base44.asServiceRole.entities.Case.delete(tmpCaseId); } catch (_) { /* ignore */ }
    }

    // Build summary
    const duration_ms = Date.now() - startedAt;
    const summary = Object.values(results).reduce((acc, r) => {
      if (r && r.status === 'ok') acc.ok += 1; else acc.fail += 1;
      return acc;
    }, { ok: 0, fail: 0 });

    return Response.json({ ok: summary.ok, fail: summary.fail, duration_ms, results });
  } catch (error) {
    // Hard failure (should not happen often)
    try {
      if (tmpCaseId) {
        await createClientFromRequest(req).asServiceRole.entities.Case.delete(tmpCaseId);
      }
    } catch {}
    return Response.json({ error: error?.message || 'selfTestScannerPipeline error' }, { status: 500 });
  }
});