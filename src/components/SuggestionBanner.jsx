import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, ChevronRight } from "lucide-react";

export default function SuggestionBanner({ suggestion, onAccept, onDismiss, t }) {
  if (!suggestion) return null;
  const labelMap = {
    widerspruch: t?.('suggest.widerspruch') || 'Widerspruch',
    "kündigung": t?.('suggest.kuendigung') || 'Kündigung',
    mahnung: t?.('suggest.mahnung') || 'Mahnung',
    widerruf: t?.('suggest.widerruf') || 'Widerruf',
    beschwerde: t?.('suggest.beschwerde') || 'Beschwerde',
    sonstiges: t?.('suggest.sonstiges') || 'Allgemeines Schreiben'
  };

  const title = t?.('suggest.title') || 'Passender Prozess gefunden';
  const desc = t?.('suggest.desc') || 'Basierend auf Ihrem Dokument empfehlen wir:';
  const typeLabel = labelMap[suggestion.type] || 'Schreiben';
  const conf = Math.round((suggestion.confidence || 0) * 100);

  return (
    <Card className="glass border-white/20 mb-6">
      <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 text-white">
          <div className="w-9 h-9 glass rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="font-semibold">{title}</div>
            <div className="text-white/80 text-sm">
              {desc} <strong>{typeLabel}</strong>{Number.isFinite(conf) ? ` (${conf}%)` : ''}
              {suggestion?.reason ? <span className="block text-white/60 mt-0.5">{suggestion.reason}</span> : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onDismiss} variant="outline" className="glass border-white/30 text-white hover:bg-white/10">
            {t?.('common.ignore') || 'Ignorieren'}
          </Button>
          <Button onClick={onAccept} className="bg-blue-600 hover:bg-blue-700">
            {(t?.('suggest.start') || 'Passenden Prozess starten')} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}