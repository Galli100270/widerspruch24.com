import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Try to identify user, but don't block unauthenticated usage
    try {
      await base44.auth.me();
    } catch (e) {
      console.debug('exportLetterPdf: proceeding without user auth');
    }

    let payload;
    try {
      payload = await req.json();
    } catch {
      payload = {};
    }

    const text = String(payload?.text ?? '').trim();
    const title = String(payload?.title ?? 'Schreiben').trim();

    if (!text) {
      return Response.json({ error: 'Missing text' }, { status: 400 });
    }

    const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });

    // Title
    doc.setFontSize(14);
    doc.text(title, 40, 50);

    // Content
    doc.setFontSize(12);
    const maxWidth = 515;
    const lines = doc.splitTextToSize(text, maxWidth);

    let y = 80;
    const lineHeight = 18;
    const pageHeight = doc.internal.pageSize.getHeight();
    const bottomMargin = 60;

    for (const line of lines) {
      if (y + lineHeight > pageHeight - bottomMargin) {
        doc.addPage();
        y = 60;
      }
      doc.text(line, 40, y);
      y += lineHeight;
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${title.replace(/[^a-z0-9_\-]+/gi, '_')}.pdf"`
      }
    });
  } catch (error) {
    return Response.json({ error: error?.message || 'Internal error' }, { status: 500 });
  }
});