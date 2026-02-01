import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, CheckCircle2 } from "lucide-react";

export default function AnalysisPanel({ analysis, t }) {
  if (!analysis) return null;
  const type = analysis.document_type || 'Sonstiges';
  const conf = Math.round(analysis.document_type_confidence || 0);
  const fields = analysis.fields || {};
  const deadline = fields?.deadline?.value || '';

  const risk = (() => {
    if (!deadline) return { level: 'info', text: t?.('scanner.noDeadline') || 'Keine Frist erkannt.' };
    const d = new Date(deadline);
    if (isNaN(d)) return { level: 'info', text: t?.('scanner.noDeadline') || 'Keine Frist erkannt.' };
    const days = Math.ceil((d.getTime() - Date.now()) / (1000*60*60*24));
    if (days <= 3) return { level: 'high', text: `Frist sehr nah (${days} Tage)` };
    if (days <= 7) return { level: 'med', text: `Frist bald (${days} Tage)` };
    return { level: 'low', text: `Frist in ${days} Tagen` };
  })();

  const Suggest = () => (
    <ul className="list-disc ml-5 space-y-1 text-white/80">
      <li>{t?.('scanner.next.reason') || 'Bitte kurze Begründung eingeben.'}</li>
      <li>{t?.('scanner.next.morePages') || 'Falls mehr Seiten vorhanden sind, bitte nachreichen.'}</li>
    </ul>
  );

  return (
    <div className="space-y-4">
      <Card className="glass rounded-2xl">
        <CardHeader>
          <CardTitle className="text-white">Was ich erkannt habe</CardTitle>
        </CardHeader>
        <CardContent className="text-white/90 space-y-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">{type}</Badge>
            <span className="text-white/70">Confidence: {conf}%</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-2">
            {Object.entries(fields).map(([k,v]) => (
              <div key={k} className="p-2 rounded border border-white/10">
                <div className="text-xs text-white/60">{k}</div>
                <div className="font-medium">{v?.value || '—'}</div>
                <div className="text-xs text-white/50">Conf: {Math.round(v?.confidence||0)}%{v?.evidence ? ` • ${v.evidence}`: ''}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass rounded-2xl">
        <CardHeader>
          <CardTitle className="text-white">Risiko / Dringlichkeit</CardTitle>
        </CardHeader>
        <CardContent className="text-white/90 flex items-center gap-2">
          {risk.level === 'high' && <AlertCircle className="w-4 h-4 text-red-400" />}
          {risk.level === 'med' && <Clock className="w-4 h-4 text-yellow-300" />}
          {risk.level === 'low' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
          <span>{risk.text}</span>
        </CardContent>
      </Card>

      <Card className="glass rounded-2xl">
        <CardHeader>
          <CardTitle className="text-white">Nächste Schritte</CardTitle>
        </CardHeader>
        <CardContent className="text-white/90">
          <Suggest />
        </CardContent>
      </Card>
    </div>
  );
}