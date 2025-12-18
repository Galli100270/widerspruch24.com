
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

// Eine robuste HTML-Vorschau mit A4-Seitenlayout und diagonalem Wasserzeichen.
// Vermeidet PDF-Embeds und funktioniert daher konsistent in allen Browsern.
export default function PreviewWatermarkModal({ open, onClose, snippet = "", caseRef = "" }) {
  const text = typeof snippet === "string" && snippet.trim().length > 0
    ? snippet.trim()
    : "Keine Vorschau verfügbar. Bitte Inhalte prüfen.";

  const lines = text.split("\n");

  return (
    <Dialog open={!!open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="max-w-[96vw] w-[1000px] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-4 pb-2">
          <DialogTitle className="flex items-center justify-between">
            <span>Vorschau {caseRef ? `– Fall ${caseRef}` : ""}</span>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Schließen">
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6">
          <div className="w-full overflow-auto" style={{ maxHeight: "75vh" }}>
            {/* A4-Layout: 210×297mm ≈ 794×1123px bei 96dpi – responsive skaliert */}
            <div className="relative mx-auto bg-white text-black shadow-xl border rounded-md"
                 style={{ width: "794px", maxWidth: "100%", minHeight: "1123px" }}>
              {/* Wasserzeichen */}
              <div
                aria-hidden
                className="pointer-events-none select-none absolute inset-0 flex items-center justify-center"
                style={{ opacity: 0.12, transform: "rotate(-24deg)" }}
              >
                <span className="text-6xl md:text-8xl font-extrabold tracking-widest">VORSCHAU</span>
              </div>

              {/* Seiteninhalt */}
              <div className="relative p-10 md:p-12 space-y-4" id="letter-content">
                {caseRef && (
                  <div className="text-xs text-slate-500 mb-2">VORSCHAU – Fall {caseRef}</div>
                )}
                {lines.map((ln, i) => {
                  const trimmed = ln.trim();
                  if (trimmed === "") return <div key={i} className="h-3" />;
                  return (
                    <p key={i} className="text-[15px] leading-7 text-slate-900">
                      {trimmed}
                    </p>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Hinweisleiste */}
          <div className="mt-3 text-xs text-slate-400">
            Diese Vorschau dient nur zur Orientierung und stellt keine Rechtsberatung dar.
          </div>
        </div>
      </DialogContent>

      <style>{`
        @media (max-width: 900px) {
          #letter-content { padding: 24px !important; }
        }
        /* Druck: Seite bleibt weiß, Text schwarz */
        @media print {
          .dark &, .glass &, body { background: #fff !important; color: #000 !important; }
          #letter-content, #letter-content * { background: #fff !important; color: #000 !important; }
        }
      `}</style>
    </Dialog>
  );
}
