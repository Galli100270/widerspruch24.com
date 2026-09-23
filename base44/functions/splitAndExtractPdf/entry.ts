/*
Musterfall (Beispiel-Aufruf):
- Zweck: Große PDFs in handliche Teile splitten und strukturierte Daten extrahieren
- Aufruf (Frontend SDK): await base44.functions.invoke('splitAndExtractPdf', { file_url: '<PDF_URL>', json_schema: { invoice_number: {type:'string'} }, pages_per_chunk: 6 })
- Erwartete Antwort: { status: 'success', page_count: <n>, chunks: <m>, output: { ...extrahierte Felder } }
Hinweise:
- Gastmodus wird unterstützt (kein Login erforderlich)
- Wenn json_schema leer ist, wird ein leeres Objekt übergeben (Extraktion dann ggf. generisch)
*/
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { PDFDocument } from 'npm:pdf-lib@1.17.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Auth optional: Gastnutzer erlaubt
    await base44.auth.me().catch(() => null);

    let body = {};
    try { body = await req.json(); } catch (_) { body = {}; }
    const fileUrl = body?.file_url;
    const fileUri = body?.file_uri;
    const jsonSchema = body?.json_schema || body?.schema || {};
    let pagesPerChunk = Number(body?.pages_per_chunk) || 8;
    if (pagesPerChunk < 1) pagesPerChunk = 1;

    let effectiveFileUrl = typeof fileUrl === 'string' ? fileUrl : '';
    if (!effectiveFileUrl && typeof fileUri === 'string' && fileUri) {
      const su = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 600 });
      effectiveFileUrl = su?.signed_url || '';
    }

    if (!effectiveFileUrl) {
      return Response.json({ error: 'file_url or file_uri is required' }, { status: 400 });
    }

    // Fetch original PDF
    const res = await fetch(effectiveFileUrl);
    if (!res.ok) {
      return Response.json({ error: `Failed to fetch source PDF (${res.status})` }, { status: 400 });
    }
    const srcBytes = new Uint8Array(await res.arrayBuffer());

    // Load and inspect pages
    const srcDoc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();

    // Helper: upload a chunk and return signed URL
    const uploadChunkAndGetUrl = async (bytes, name) => {
      const file = new File([bytes], name, { type: 'application/pdf', lastModified: Date.now() });
      const up = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file });
      const fileUri = up?.file_uri;
      if (!fileUri) throw new Error('UploadPrivateFile failed');
      const su = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 600 });
      return su?.signed_url;
    };

    // Build chunks (adaptive size reduction if a chunk exceeds ~9.5MB)
    const MAX_CHUNK_BYTES = 9.5 * 1024 * 1024; // safety under 10MB integration limit
    const chunkUrls = [];

    for (let start = 0; start < totalPages; ) {
      let currentChunkSize = Math.min(pagesPerChunk, totalPages - start);
      let success = false;
      let attempts = 0;

      while (!success && attempts < 5) {
        attempts++;
        // Create a new PDF with current chunk of pages
        const outDoc = await PDFDocument.create();
        const indices = Array.from({ length: currentChunkSize }, (_, i) => start + i);
        const copied = await outDoc.copyPages(srcDoc, indices);
        copied.forEach((p) => outDoc.addPage(p));
        const outBytes = await outDoc.save();

        if (outBytes.byteLength > MAX_CHUNK_BYTES && currentChunkSize > 1) {
          // Reduce chunk size and retry
          currentChunkSize = Math.max(1, Math.floor(currentChunkSize / 2));
          continue;
        }

        // Upload chunk and collect URL
        const chunkName = `chunk-${start + 1}-${start + currentChunkSize}.pdf`;
        const signedUrl = await uploadChunkAndGetUrl(outBytes, chunkName);
        if (!signedUrl) throw new Error('Failed to create signed URL for chunk');
        chunkUrls.push(signedUrl);
        start += currentChunkSize;
        success = true;
      }

      if (!success) {
        return Response.json({ error: 'Failed to split PDF into acceptable chunk size' }, { status: 500 });
      }
    }

    // Extract data per chunk and merge
    const merged = {};
    for (const url of chunkUrls) {
      try {
        const res = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({ file_url: url, json_schema: jsonSchema });
        const out = res?.output || res; // depending on integration response wrapper
        if (out && typeof out === 'object') {
          for (const k of Object.keys(out)) {
            const nv = out[k];
            const ov = merged[k];
            if (ov == null) {
              merged[k] = nv;
            } else if (typeof nv === 'string') {
              if ((nv || '').trim().length > (typeof ov === 'string' ? (ov || '').trim().length : 0)) merged[k] = nv;
            } else if (typeof nv === 'number' && (ov == null)) {
              merged[k] = nv;
            }
          }
        }
      } catch (e) {
        // continue with other chunks
      }
    }

    return Response.json({ status: 'success', page_count: totalPages, chunks: chunkUrls.length, output: merged });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});