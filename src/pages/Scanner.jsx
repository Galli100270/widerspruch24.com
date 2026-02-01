import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Case } from "@/entities/Case";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UploadFile } from "@/integrations/Core";

// Einfache Fallnummer
const generateCaseNumber = () => {
  const prefix = "W24";
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  const rnd = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${rnd}`;
};

export default function Scanner({ t, language }) {
  const navigate = useNavigate();

  // Schrittsteuerung
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");

  // Stufe 1: Upload + Dokumenttyp
  const [files, setFiles] = useState([]); // {name, url, type}
  const [docType, setDocType] = useState(""); // rechnung|mahnung|bescheid|vertrag|sonstiges
  const [docTypeUncertain, setDocTypeUncertain] = useState(false);

  // Stufe 2: Strukturierte Felder + Unsicherheit
  const [form, setForm] = useState({
    sender_name: "",
    sender_address: "",
    recipient_name: "",
    recipient_address: "",
    reference_number: "",
    document_date: "",
    amount: "",
    deadline: "",
    claim_type: "", // Rechnung, Schadenersatz, Gebühr, etc.
  });
  const [uncertain, setUncertain] = useState({
    sender_name: false,
    recipient_name: false,
    reference_number: false,
    document_date: false,
    amount: false,
    deadline: false,
    claim_type: false,
  });

  const onPickFiles = async (e) => {
    const list = Array.from(e.target.files || []);
    if (!list.length) return;

    setError("");
    const uploaded = [];
    for (const f of list) {
      try {
        const { file_url } = await UploadFile({ file: f });
        uploaded.push({ name: f.name, url: file_url, type: f.type || "" });
      } catch (err) {
        setError("Upload fehlgeschlagen. Bitte erneut versuchen.");
        return;
      }
    }
    setFiles((prev) => [...prev, ...uploaded]);
  };

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const goNext = () => {
    if (!files.length) { setError("Bitte mindestens ein Dokument hochladen – oder manuell ausfüllen."); return; }
    if (!docType) { setError("Bitte Dokumenttyp auswählen."); return; }
    setError("");
    setStep(2);
  };

  const validatePlausibility = () => {
    const missing = [];
    if (!form.sender_name) missing.push("Absender");
    const hasKey = !!(form.reference_number || form.amount || form.deadline);
    if (!hasKey) missing.push("Aktenzeichen/Betrag/Frist (mind. eines)");
    if (!docType) missing.push("Dokumenttyp");
    return missing;
  };

  const createCase = async () => {
    const issues = validatePlausibility();
    if (issues.length) { setError(`Bitte prüfen: ${issues.join(", ")}`); return; }
    setError("");

    const payload = {
      origin: "scanner",
      case_number: generateCaseNumber(),
      // Strukturierte Felder
      sender_name: form.sender_name || "",
      sender_address: form.sender_address || "",
      reference_number: form.reference_number || "",
      document_date: form.document_date || "",
      amount: form.amount ? parseFloat(form.amount) : null,
      deadline: form.deadline || undefined,
      // Dokumente
      document_urls: files.map((f) => f.url),
      // Kontext in Analysis (nur intern, kein Output)
      analysis: {
        latest: {
          doc_type: docType,
          doc_type_uncertain: !!docTypeUncertain,
          plausibility: {
            has_sender: !!form.sender_name,
            has_any_key_field: !!(form.reference_number || form.amount || form.deadline),
          },
          uncertainties: { ...uncertain },
          claim_type: form.claim_type || "",
          recipient_snapshot: {
            name: form.recipient_name || "",
            address: form.recipient_address || "",
          },
        },
      },
      status: "draft",
      language: language || "de",
    };

    try {
      const c = await Case.create(payload);
      navigate(createPageUrl(`CaseDetails?case_id=${c.id}`));
    } catch (e) {
      setError("Fall konnte nicht angelegt werden. Bitte erneut versuchen.");
    }
  };

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setU = (k, v) => setUncertain((p) => ({ ...p, [k]: v }));

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-2">Scanner (Neubau)</h1>
          <p className="text-white/80">Strukturierte Erfassung juristisch relevanter Angaben. Keine automatische Texterzeugung.</p>
        </div>

        {error && (
          <Alert className="glass border-red-500/50 mb-6">
            <AlertDescription className="text-white">{error}</AlertDescription>
          </Alert>
        )}

        {step === 1 && (
          <div className="glass rounded-3xl p-6 space-y-6">
            <div>
              <Label className="text-white mb-2 block">Dokumente hochladen</Label>
              <input id="docfiles" type="file" multiple className="hidden" onChange={onPickFiles} />
              <Button variant="outline" className="glass border-white/30 text-white hover:bg-white/10" onClick={() => document.getElementById("docfiles")?.click()}>
                Dateien auswählen
              </Button>
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-white/80">
                      <span>{f.name}</span>
                      <Button size="sm" variant="ghost" className="text-white/70" onClick={() => removeFile(i)}>Entfernen</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4 items-end">
              <div>
                <Label className="text-white mb-2 block">Dokumenttyp</Label>
                <Select value={docType} onValueChange={(v) => setDocType(v)}>
                  <SelectTrigger className="glass border-white/30 text-white">
                    <SelectValue placeholder="Bitte wählen" />
                  </SelectTrigger>
                  <SelectContent className="glass border-white/20">
                    <SelectItem value="rechnung">Rechnung</SelectItem>
                    <SelectItem value="mahnung">Mahnung</SelectItem>
                    <SelectItem value="bescheid">Bescheid</SelectItem>
                    <SelectItem value="vertrag">Vertrag</SelectItem>
                    <SelectItem value="sonstiges">Sonstiges</SelectItem>
                  </SelectContent>
                </Select>
                <div className="mt-2 text-white/70 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={docTypeUncertain} onChange={(e) => setDocTypeUncertain(e.target.checked)} />
                    <span>Unsicher</span>
                  </label>
                </div>
              </div>

              <div className="text-right sm:text-left">
                <Button onClick={goNext} className="glass text-white border-white/30 hover:glow">Weiter</Button>
                <Button variant="outline" className="ml-2 glass border-white/30 text-white hover:bg-white/10" onClick={() => setStep(2)}>Manuell ausfüllen</Button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="glass rounded-3xl p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label className="text-white mb-1 block">Absender *</Label>
                <Input className="glass border-white/30 text-white placeholder-white/60" placeholder="Behörde/Firma" value={form.sender_name} onChange={(e) => setF("sender_name", e.target.value)} />
                <div className="mt-1 text-white/70 text-xs">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={uncertain.sender_name} onChange={(e) => setU("sender_name", e.target.checked)} />
                    <span>Unsicher</span>
                  </label>
                </div>
              </div>
              <div>
                <Label className="text-white mb-1 block">Aktenzeichen/Rechnungsnr.</Label>
                <Input className="glass border-white/30 text-white placeholder-white/60" value={form.reference_number} onChange={(e) => setF("reference_number", e.target.value)} />
                <div className="mt-1 text-white/70 text-xs">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={uncertain.reference_number} onChange={(e) => setU("reference_number", e.target.checked)} />
                    <span>Unsicher</span>
                  </label>
                </div>
              </div>
              <div>
                <Label className="text-white mb-1 block">Datum</Label>
                <Input type="date" className="glass border-white/30 text-white" value={form.document_date} onChange={(e) => setF("document_date", e.target.value)} />
                <div className="mt-1 text-white/70 text-xs">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={uncertain.document_date} onChange={(e) => setU("document_date", e.target.checked)} />
                    <span>Unsicher</span>
                  </label>
                </div>
              </div>
              <div>
                <Label className="text-white mb-1 block">Betrag (€)</Label>
                <Input type="number" step="0.01" className="glass border-white/30 text-white placeholder-white/60" value={form.amount} onChange={(e) => setF("amount", e.target.value)} />
                <div className="mt-1 text-white/70 text-xs">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={uncertain.amount} onChange={(e) => setU("amount", e.target.checked)} />
                    <span>Unsicher</span>
                  </label>
                </div>
              </div>
              <div>
                <Label className="text-white mb-1 block">Frist (optional)</Label>
                <Input type="date" className="glass border-white/30 text-white" value={form.deadline} onChange={(e) => setF("deadline", e.target.value)} />
                <div className="mt-1 text-white/70 text-xs">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={uncertain.deadline} onChange={(e) => setU("deadline", e.target.checked)} />
                    <span>Unsicher</span>
                  </label>
                </div>
              </div>
              <div>
                <Label className="text-white mb-1 block">Anspruchsart</Label>
                <Input className="glass border-white/30 text-white placeholder-white/60" placeholder="z. B. Rechnung, Schadenersatz, Gebühr" value={form.claim_type} onChange={(e) => setF("claim_type", e.target.value)} />
                <div className="mt-1 text-white/70 text-xs">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={uncertain.claim_type} onChange={(e) => setU("claim_type", e.target.checked)} />
                    <span>Unsicher</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-white mb-1 block">Empfänger (optional)</Label>
              <div className="grid md:grid-cols-2 gap-4">
                <Input className="glass border-white/30 text-white placeholder-white/60" placeholder="Name" value={form.recipient_name} onChange={(e) => setF("recipient_name", e.target.value)} />
                <Textarea className="glass border-white/30 text-white placeholder-white/60" placeholder="Adresse" rows={3} value={form.recipient_address} onChange={(e) => setF("recipient_address", e.target.value)} />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 justify-end">
              <Button variant="outline" className="glass border-white/30 text-white hover:bg-white/10" onClick={() => setStep(1)}>Zurück</Button>
              <Button className="glass text-white border-white/30 hover:glow" onClick={createCase}>Fall anlegen</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}