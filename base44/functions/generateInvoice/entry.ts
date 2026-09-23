import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { jsPDF } from 'npm:jspdf@2.5.1';
import { format } from 'npm:date-fns@3.6.0';

// Simple invoice number generator (for a real app, use a sequence in DB)
function generateInvoiceNumber(transactionId) {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    // Use part of transaction ID for uniqueness
    const uniquePart = transactionId.slice(-6).toUpperCase();
    return `W24-${year}-${month}-${uniquePart}`;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const { transactionId } = await req.json();
        if (!transactionId) {
            return new Response(JSON.stringify({ error: 'Transaction ID is required' }), { status: 400 });
        }

        const transaction = await base44.entities.Transaction.get(transactionId);

        // Security check
        if (transaction.userEmail !== user.email) {
            return new Response(JSON.stringify({ error: 'Access denied' }), { status: 403 });
        }

        if (!transaction.billingAddress) {
            return new Response(JSON.stringify({ error: 'Billing address not set' }), { status: 400 });
        }
        
        const invoiceNumber = transaction.invoiceNumber || generateInvoiceNumber(transaction.id);
        if (!transaction.invoiceNumber) {
            await base44.entities.Transaction.update(transaction.id, { invoiceNumber });
        }
        
        const doc = new jsPDF();

        // Add Fonts (jsPDF requires this)
        // For simplicity, we use built-in fonts. For custom fonts, they must be added.
        doc.setFont('helvetica', 'normal');

        // Header
        doc.setFontSize(22);
        doc.text('Widerspruch24', 20, 30);
        doc.setFontSize(10);
        doc.text('Musterfirma GmbH, Musterstraße 1, 12345 Musterstadt, DE', 20, 40);

        // Billing Address
        const ba = transaction.billingAddress;
        doc.setFontSize(12);
        doc.text(ba.company || ba.name, 20, 60);
        doc.text(ba.street, 20, 67);
        doc.text(`${ba.zip} ${ba.city}`, 20, 74);
        doc.text(ba.country, 20, 81);

        // Invoice Details
        doc.setFontSize(12);
        doc.text('Rechnung', 180, 50, { align: 'right' });
        doc.setFontSize(10);
        doc.text(`Rechnungsnummer: ${invoiceNumber}`, 180, 60, { align: 'right' });
        doc.text(`Datum: ${format(new Date(), 'dd.MM.yyyy')}`, 180, 67, { align: 'right' });

        // Line Items Table Header
        doc.setLineWidth(0.5);
        doc.line(20, 100, 190, 100);
        doc.setFontSize(10);
        doc.text('Beschreibung', 22, 107);
        doc.text('Menge', 120, 107);
        doc.text('Preis', 150, 107);
        doc.text('Gesamt', 180, 107, { align: 'right' });
        doc.line(20, 112, 190, 112);

        // Line Item
        const amountInEuro = (transaction.amount / 100).toFixed(2);
        doc.text(transaction.productName, 22, 120);
        doc.text('1', 120, 120);
        doc.text(`${amountInEuro} EUR`, 150, 120);
        doc.text(`${amountInEuro} EUR`, 180, 120, { align: 'right' });
        
        // Totals
        const yPos = 140;
        doc.line(120, yPos - 5, 190, yPos - 5);
        doc.text('Nettobetrag:', 122, yPos);
        doc.text(`${(amountInEuro / 1.19).toFixed(2)} EUR`, 180, yPos, { align: 'right' });
        doc.text('MwSt. (19%):', 122, yPos + 7);
        doc.text(`${(amountInEuro - (amountInEuro / 1.19)).toFixed(2)} EUR`, 180, yPos + 7, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.text('Gesamtbetrag:', 122, yPos + 14);
        doc.text(`${amountInEuro} EUR`, 180, yPos + 14, { align: 'right' });

        // Footer
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('Vielen Dank für Ihren Auftrag.', 20, 250);
        doc.text('Betrag dankend erhalten.', 20, 257);

        const pdfBytes = doc.output('arraybuffer');
        return new Response(pdfBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename=rechnung-${invoiceNumber}.pdf`
            }
        });

    } catch (error) {
        console.error('Invoice generation error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});