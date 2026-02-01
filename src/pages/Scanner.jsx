import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Case } from "@/entities/Case";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadFile, InvokeLLM } from "@/integrations/Core";
import { base44 } from "@/api/base44Client";
import { Loader2, Upload as UploadIcon } from "lucide-react";

import CameraCapture from "@/components/intake/CameraCapture";
import AnalysisPanel from "@/components/intake/AnalysisPanel";
import ReasonField from "@/components/intake/ReasonField";
import { analyzeFiles } from "@/components/intake/analyze";

export default function Scanner({ t, language }) {
  const navigate = useNavigate();

  const [files, setFiles] = useState([]); // {name,url,type}
  const [analysis, setAnalysis] = useState(null);
  const [reason, setReason] = useState("");
  const [tone, setTone] = useState("sachlich");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1); // 1: intake, 2: reason

  const onCameraShot = async (shot) => {
    try {
      const file = new File([shot.blob], `scan_${Date.now()}.jpg`, { type: "image/jpeg" });
      const { file_url } = await UploadFile({ file });
      const item = { name: file.name, url: file_url, type: file.type };
      const next = [...files, item];
      setFiles(next);
      await triggerAnalysis(next);
    } catch {
      setError("Upload fehlgeschlagen. Bitte erneut versuchen.");
    }
  };

  const onPickFiles = async (e) => {
    const list = Array.from(e.target.files || []);
    if (!list.length) return;
    setLoading(true); setError("");
    try {
      const uploaded = [];
      for (const f of list) {
        const { file_url } = await UploadFile({ file: f });
        uploaded.push({ name: f.name, url: file_url, type: f.type || "" });
      }
      const next = [...files, ...uploaded];
      setFiles(next);
      await triggerAnalysis(next);
    } catch (e2) {
      setError("Upload fehlgeschlagen. Bitte erneut versuchen.");
    } finally { setLoading(false); e.target.value = ''; }
  };

  const triggerAnalysis = async (list) => {
    setLoading(true); setError("");
    try {
      const res = await analyzeFiles(list);
      setAnalysis(res);
      setStep(2);
    } catch (e) {
      setAnalysis({ notes: 'Analyse unsicher/fehlgeschlagen – bitte bessere Aufnahme oder PDF hochladen.' });
      setStep(2);
    } finally { setLoading(false); }
  };

  const submitAndGenerate = async () => {
    setLoading(true); setError("");
    try {
      // 1) Case anlegen (nur strukturierte Daten + Unsicherheiten)
      const fields = analysis?.fields || {};
      const casePayload = {
        origin: "scanner",
        case_number: `W24-${Date.now().toString(36).toUpperCase()}`,
        sender_name: fields?.sender_name?.value || "",
        sender_address: fields?.recipient?.value?.address || "",
        reference_number: fields?.reference_number?.value || "",
        document_date: fields?.document_date?.value || new Date().toISOString().slice(0,10),
        amount: fields?.amount_total?.value || null,
        deadline: fields?.deadline?.value || undefined,
        document_urls: files.map(f=>f.url),
        status: "detailed",
        language: language || 'de',
        analysis: {
          latest: {
            doc_type: analysis?.document_type || 'Sonstiges',
            doc_type_uncertain: (analysis?.document_type_confidence||0) < 70,
            uncertainties: mapUncertainties(fields),
          }
        },
        custom_reason: reason,
      };
      const created = await Case.create(casePayload);

      // 2) Automatische Texterstellung (Legal-Pipeline)
      const payload = {
        caseId: created.id,
        objection_details: {
          main_objection_reason: reason,
          detailed_reasoning: '',
          requested_outcome: ''
        },
        format: "DIN5008",
        tone: tone === 'sehr' ? 'sehr_deutlich' : (tone === 'bestimmt' ? 'bestimmt' : 'sachlich')
      };
      const res = await base44.functions.invoke('generateLetter', payload);
      const text = res?.data?.text || res?.data?.letter || res?.data?.content || res?.data?.generated_text || '';

      if (text && text.trim().length > 40) {
        await Case.update(created.id, { generated_text: text });
      }

      // 3) Weiter zur Vorschau
      navigate(createPageUrl(`Preview?case_id=${created.id}`));
    } catch (e) {
      setError("Erstellung fehlgeschlagen. Bitte erneut versuchen.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Scanner / Intake (Neu)</h1>
          <p className="text-white/80">Foto oder Upload → Sofortanalyse → Begründung → fertiges Schreiben.</p>
        </div>

        {error && (
          <Alert className="glass border-red-500/50">
            <AlertDescription className="text-white">{error}</AlertDescription>
          </Alert>
        )}

        {step === 1 && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass rounded-2xl p-4">
              <h3 className="text-white font-semibold mb-3">Kamera</h3>
              <CameraCapture onCapture={onCameraShot} t={t} />
            </div>
            <div className="glass rounded-2xl p-4">
              <h3 className="text-white font-semibold mb-3">Datei-Upload</h3>
              <input id="filepick" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.HEIC,.docx,.txt,image/*,application/pdf" className="hidden" onChange={onPickFiles} />
              <Button onClick={()=>document.getElementById('filepick')?.click()} className="glass text-white border-white/30"><UploadIcon className="w-4 h-4 mr-2" />Dateien auswählen</Button>
              {files.length>0 && (
                <div className="mt-4 text-white/80 text-sm">{files.length} Datei(en) gewählt – Analyse startet automatisch…</div>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="glass rounded-2xl p-4 text-white flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Bitte warten…</div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <AnalysisPanel analysis={analysis} t={t} />
            {analysis?.notes && (
              <div className="glass rounded-2xl p-4 text-yellow-200 text-sm">{analysis.notes}</div>
            )}

            <div className="glass rounded-2xl p-4 space-y-4">
              <ReasonField value={reason} onChange={setReason} t={t} />
              <div>
                <Label className="text-white mb-2 block">Ton</Label>
                <Select value={tone} onValueChange={(v)=>setTone(v)}>
                  <SelectTrigger className="glass border-white/30 text-white">
                    <SelectValue placeholder="Ton wählen" />
                  </SelectTrigger>
                  <SelectContent className="glass border-white/20">
                    <SelectItem value="sachlich">Sachlich</SelectItem>
                    <SelectItem value="bestimmt">Bestimmt</SelectItem>
                    <SelectItem value="sehr">Sehr deutlich</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-right">
                <Button onClick={submitAndGenerate} disabled={!reason || loading} className="glass text-white border-white/30">Fertiges Schreiben erstellen</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function mapUncertainties(fields){
  const out = {};
  for (const [k,v] of Object.entries(fields||{})) {
    out[k] = (v?.confidence||0) < 70;
  }
  return out;
}