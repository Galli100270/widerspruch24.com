import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AppReport() {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { data } = await base44.functions.invoke('exportAppAnalysis');
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Widerspruch24_App_Analyse_und_Launchleitfaden.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen py-16">
      <div className="max-w-3xl mx-auto">
        <div className="glass rounded-3xl p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 glass rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">App‑Analyse & Launch‑Leitfaden</h1>
              <p className="text-white/80 mt-1">Lade ein PDF mit Selbstanalyse, Verbesserungen und allen Schritten bis zum Go‑Live (inkl. Zahlungsabwicklung) herunter.</p>
            </div>
          </div>

          <Button onClick={handleDownload} disabled={downloading} className="glass text-white border-white/30 hover:glow">
            <Download className="w-4 h-4 mr-2" />
            {downloading ? 'Wird erstellt…' : 'PDF herunterladen'}
          </Button>
        </div>
      </div>
    </div>
  );
}