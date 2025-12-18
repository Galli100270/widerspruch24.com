import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

export default function RescueBanner({ message = "Wir haben den Vorgang wiederhergestellt.", hint = "", onContinue, onReload }) {
  return (
    <Alert className="glass border-amber-400/40">
      <AlertDescription className="text-white">
        <div className="font-semibold mb-1">{message}</div>
        {hint && <div className="text-white/80 text-sm mb-3">{hint}</div>}
        <div className="flex gap-2">
          {onContinue && (
            <Button onClick={onContinue} className="glass text-white border-white/30 hover:glow">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Weiter
            </Button>
          )}
          {onReload && (
            <Button onClick={onReload} variant="outline" className="glass border-white/30 text-white hover:bg-white/10">
              <RefreshCw className="w-4 h-4 mr-2" /> Neu laden
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}