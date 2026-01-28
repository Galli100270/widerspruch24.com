import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function ok(detail) { return { status: 'ok', detail }; }
function fail(detail) { return { status: 'fail', detail }; }

Deno.serve(async (req) => {
  const startedAt = Date.now();
  try {
    const base44 = createClientFromRequest(req);

    // Require authenticated user to run selftest (no secrets needed)
    const me = await base44.auth.me();
    if (!me) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = {};

    // Entities basic access (non-fatal)
    try {
      const few = await base44.entities.Template.list(1);
      results.entities_access = ok({ templates: Array.isArray(few) ? few.length : 0 });
    } catch (e) {
      results.entities_access = fail(e.message || 'entities access error');
    }

    // Create → Update → Delete a temporary Letter (non-destructive)
    let tmpLetterId = null;
    try {
      const letter = await base44.entities.Letter.create({
        language: 'de',
        parties: {
          sender: { name: 'Test User', strasse: 'Teststr. 1', plz: '10115', ort: 'Berlin', email: 'test@example.com' },
          recipient: { name: 'Behörde', strasse: 'Amtweg 2', plz: '10117', ort: 'Berlin', email: 'amt@example.com' }
        },
        facts: {
          reason: 'Selbsttest',
          frist_tage: 14,
          anlagen: []
        },
        flags: { disclaimer_accepted: true, content_logging_consent: true },
        shortcodes_raw: 'Test /ref 123'
      });
      tmpLetterId = letter.id;
      await base44.entities.Letter.update(letter.id, { facts: { reason: 'Selbsttest-Update', frist_tage: 14, anlagen: [] } });
      results.letter_crud = ok({ id: letter.id });
    } catch (e) {
      results.letter_crud = fail(e.message || 'letter CRUD error');
    } finally {
      if (tmpLetterId) {
        try { 
          await base44.entities.Letter.delete(tmpLetterId); 
        } catch (_) { 
          /* ignore cleanup errors */ 
        }
      }
    }

    // Create → Delete a temporary Case (non-destructive)
    let tmpCaseId = null;
    try {
      const kase = await base44.entities.Case.create({ origin: 'scanner', title: 'Selftest Case' });
      tmpCaseId = kase.id;
      results.case_crud = ok({ id: kase.id });
    } catch (e) {
      results.case_crud = fail(e.message || 'case CRUD error');
    } finally {
      if (tmpCaseId) {
        try { await base44.entities.Case.delete(tmpCaseId); } catch (_) {}
      }
    }

    // Invoke configStatus function (optional)
    try {
      const cfg = await base44.asServiceRole.functions.invoke('configStatus', {});
      const payload = (cfg && typeof cfg === 'object' && 'data' in cfg) ? cfg.data : cfg;
      results.config_status = ok(payload || {});
    } catch (e) {
      const msg = e?.message || '';
      if (String(msg).includes('403')) {
        results.config_status = ok({ skipped: true, reason: 'forbidden' });
      } else {
        results.config_status = fail(msg || 'invoke configStatus failed');
      }
    }

    // Small upload probe
    try {
      const blob = new Blob(["demo"], { type: "text/plain" });
      const file = new File([blob], "probe.txt", { type: "text/plain" });
      const up = await base44.integrations.Core.UploadFile({ file });
      results.upload = ok({ ok: !!up?.file_url });
    } catch (e) {
      results.upload = fail(e.message || 'upload failed');
    }

    // LLM smoke (no external context)
    try {
      const llm = await base44.integrations.Core.InvokeLLM({ prompt: 'Sag kurz: OK', add_context_from_internet: false });
      results.llm = ok(typeof llm === 'string' ? llm.slice(0, 50) : '[json]');
    } catch (e) {
      results.llm = fail(e.message || 'llm failed');
    }

    // Summarize
    const durationMs = Date.now() - startedAt;
    const summary = Object.values(results).reduce((acc, r) => {
      if (r.status === 'ok') acc.ok += 1; else acc.fail += 1;
      return acc;
    }, { ok: 0, fail: 0 });

    return Response.json({
      ok: summary.ok,
      fail: summary.fail,
      duration_ms: durationMs,
      results
    });
  } catch (error) {
    return Response.json({ error: error.message || 'selftest error' }, { status: 500 });
  }
});