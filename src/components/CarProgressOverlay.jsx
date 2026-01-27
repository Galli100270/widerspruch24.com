
import React from "react";
import AnalysisVideo from "@/components/AnalysisVideo";
import { Button } from "@/components/ui/button";

export default function CarProgressOverlay({
  isVisible,
  currentStep = "idle",
  progress = 0,
  error = "",
  retryCount = 0,
  onCancel,
  onComplete,
  onRetry,
  t,
  previews = []
}) {
  if (!isVisible) return null;

  const L = (key, fallback) => {
    const v = typeof t === "function" ? t(key) : null;
    return !v || v === key ? fallback : v;
  };

  const percent = Math.max(0, Math.min(100, Math.round(progress || 0)));
  const isDone = currentStep === "done" || percent >= 100;

  const stepCopy = {
    convert_heic: {
      title: L("progress.converting", "Wandelt Fotos in ein lesbares Format …"),
      sub: L("progress.convertingDesc", "Die Akten werden ordentlich einsortiert."),
    },
    uploading: {
      title: L("progress.uploading", "Lädt Dokumente hoch …"),
      sub: L("progress.uploadingDesc", "Die Unterlagen landen sicher im Aktenschrank."),
    },
    ocr: {
      title: L("progress.ocr", "Liest das Dokument …"),
      sub: L("progress.ocrDesc", "Paragraphen-Heini entziffert jede Zeile."),
    },
    analyzing: {
      title: L("preview.generating", "Erkennt die wichtigsten Punkte …"),
      sub: L("preview.generatingDesc", "Der Anwalt greift ins Regal, prüft Grundlagen und denkt nach."),
    },
    drafting: {
      title: L("progress.drafting", "Formuliert deinen Widerspruch …"),
      sub: L("progress.draftingDesc", "Freundlich, bestimmt und rechtlich fundiert – gleich ist der Entwurf fertig."),
    },
    done: {
      title: L("progress.done", "Fertig!"),
      sub: L("progress.doneDesc", "Der Entwurf ist bereit."),
    },
    idle: {
      title: L("progress.start", "Starte …"),
      sub: "",
    },
  };

  const step = stepCopy[currentStep] || stepCopy.idle;
  const title = error ? L("progress.error.title", "Es gab ein Problem …") : step.title;
  const subtitle = error
    ? L("progress.error.subtitle", "Bitte erneut versuchen oder später wiederkommen.")
    : step.sub;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm pointer-events-auto">
      <div
        className="min-h-screen w-full flex items-center justify-center px-4"
        style={{
          paddingTop: "max(24px, env(safe-area-inset-top))",
          paddingBottom: "max(24px, env(safe-area-inset-bottom))",
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="w-full max-w-2xl">
          <AnalysisVideo message={title} subMessage={subtitle} step={currentStep} progress={percent} />

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            {!isDone && !error && (
              <Button
                variant="outline"
                onClick={() => onCancel?.()}
                className="glass border-white/30 text-white hover:bg-white/10"
              >
                {L("common.cancel", "Abbrechen")}
              </Button>
            )}

            {error && (
              <div className="flex gap-3">
                <Button
                  onClick={() => onRetry?.()}
                  className="glass text-white border-white/30 hover:glow"
                >
                  {L("common.retry", "Erneut versuchen")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onComplete?.()}
                  className="glass border-white/30 text-white hover:bg-white/10"
                >
                  {L("common.close", "Schließen")}
                </Button>
              </div>
            )}

            {isDone && !error && (
              <Button
                onClick={() => onComplete?.()}
                className="glass text-white border-white/30 hover:glow"
              >
                {L("common.continue", "Weiter")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
