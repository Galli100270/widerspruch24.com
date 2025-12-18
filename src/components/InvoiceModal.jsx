import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Transaction } from '@/entities/Transaction';

export default function InvoiceModal({ transaction, onClose, onSave, t }) {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    street: '',
    zip: '',
    city: '',
    country: 'Deutschland',
    vatId: '',
    ...transaction?.billingAddress
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.street || !formData.zip || !formData.city || !formData.country) {
      setError('Bitte füllen Sie alle Pflichtfelder (*) aus.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await Transaction.update(transaction.id, { billingAddress: formData });
      onSave();
    } catch (err) {
      setError('Fehler beim Speichern. Bitte versuchen Sie es erneut.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass rounded-2xl p-8 w-full max-w-lg text-white" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4">Rechnungsadresse eingeben</h2>
        <p className="text-white/70 mb-6">Diese Informationen erscheinen auf Ihrer Rechnung. Bitte prüfen Sie die Angaben sorgfältig.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name / Firma*</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required className="glass border-white/30" />
            </div>
            <div>
              <Label htmlFor="vatId">USt-IdNr. (optional)</Label>
              <Input id="vatId" name="vatId" value={formData.vatId} onChange={handleChange} className="glass border-white/30" />
            </div>
          </div>
          <div>
            <Label htmlFor="street">Straße & Hausnummer*</Label>
            <Input id="street" name="street" value={formData.street} onChange={handleChange} required className="glass border-white/30" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="zip">PLZ*</Label>
              <Input id="zip" name="zip" value={formData.zip} onChange={handleChange} required className="glass border-white/30" />
            </div>
            <div className="col-span-2">
              <Label htmlFor="city">Stadt*</Label>
              <Input id="city" name="city" value={formData.city} onChange={handleChange} required className="glass border-white/30" />
            </div>
          </div>
           <div>
              <Label htmlFor="country">Land*</Label>
              <Input id="country" name="country" value={formData.country} onChange={handleChange} required className="glass border-white/30" />
            </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="glass text-white border-white/30">Abbrechen</Button>
            <Button type="submit" disabled={isSaving} className="glass text-white border-white/30 hover:glow">
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Adresse speichern
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}