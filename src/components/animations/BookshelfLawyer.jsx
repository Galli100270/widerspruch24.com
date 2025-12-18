import React from "react";
import { Scale, Gavel } from "lucide-react";
import { BRAND } from "@/components/brand";

export default function BookshelfLawyer({
  message = "Arbeite am Fall …",
  subMessage = "",
  step = "analyzing",
  progress = 0
}) {
  // Map step -> animation state
  const mode =
    step === "convert_heic" || step === "uploading"
      ? "climb"
      : step === "ocr" || step === "analyzing"
      ? "browse"
      : step === "drafting"
      ? "read"
      : step === "done"
      ? "celebrate"
      : "browse";

  return (
    <div className="w-full">
      <div className="relative mx-auto max-w-2xl">
        {/* Header icons */}
        <div className="flex items-center justify-center gap-4 mb-5">
          <Scale className="w-6 h-6 text-amber-300 animate-pulse" />
          <div className="w-7 h-7 rounded-full bg-sky-300/20 border border-sky-300/40" />
          <Gavel className="w-6 h-6 text-rose-300 animate-wiggle" />
        </div>

        {/* Scene */}
        <div className="relative glass rounded-2xl border border-white/15 p-4 overflow-hidden">
          {/* Shelves */}
          <div className="relative h-40 sm:h-48 md:h-56">
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                className="absolute left-0 right-0"
                style={{ top: `${(row + 1) * 25 + 10}%` }}
              >
                <div className="h-[3px] bg-white/25 rounded-full" />
                <div className="relative h-8 mt-1">
                  {/* Animated books */}
                  {Array.from({ length: 22 }).map((_, i) => (
                    <div
                      key={`${row}-${i}`}
                      className="absolute bottom-0 bg-white/15 border border-white/20 rounded-t-[4px]"
                      style={{
                        left: `${(i * 4.5) % 95}%`,
                        width: `${10 + ((i + row) % 4) * 4}px`,
                        height: `${16 + ((i + row) % 5) * 6}px`,
                        animation: `bookBreath 2.6s ease-in-out ${(i + row) * 0.07}s infinite`
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Ladder */}
            <div
              className={`absolute bottom-2 w-8 h-[85%] ladder ${mode === "climb" ? "animate-ladder-walk" : "animate-ladder-drift"}`}
              aria-hidden="true"
            >
              <div className="absolute inset-0 rounded-md border border-white/25 bg-gradient-to-b from-white/10 to-white/5" />
              <div className="absolute inset-x-[6px] top-2 bottom-2 bg-[repeating-linear-gradient(to_bottom,transparent,transparent_10px,rgba(255,255,255,0.35)_11px,transparent_12px)]" />
            </div>

            {/* Runner (logo) */}
            <div
              className={`absolute runner ${mode === "climb" ? "animate-runner-climb" : mode === "browse" ? "animate-runner-browse" : mode === "read" ? "animate-runner-read" : "animate-runner-celebrate"}`}
              style={{
                // progress influences horizontal offset slightly for variety
                transform: `translateX(${(progress % 20) - 10}px)`
              }}
              aria-label="Paragraphen‑Heini arbeitet"
            >
              <div className="w-16 h-16 rounded-full bg-white shadow-lg ring-1 ring-black/10 overflow-hidden flex items-center justify-center">
                <img
                  src={BRAND.logoUrl}
                  alt={BRAND.alt}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Paper flipping while reading */}
              <div className={`mt-1 h-3 ${mode === "read" ? "block" : "hidden"}`}>
                <div className="w-8 h-3 mx-auto origin-left bg-white/80 rounded-sm shadow animate-page-flip" />
              </div>
            </div>
          </div>

          {/* Caption */}
          <div className="mt-4 px-1">
            <div className="text-white text-lg font-semibold leading-snug text-center">{message}</div>
            {subMessage && (
              <div className="text-white/70 text-sm text-center mt-1">{subMessage}</div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        /* Icon wiggle */
        @keyframes wiggle { 0%,100% { transform: rotate(0deg) } 50% { transform: rotate(6deg) } }
        .animate-wiggle { animation: wiggle 3s ease-in-out infinite; transform-origin: 50% 100%; }

        /* Books breathing */
        @keyframes bookBreath { 0%,100% { transform: translateY(0px); opacity: .85 } 50% { transform: translateY(-2px); opacity: 1 } }

        /* Ladder movement */
        @keyframes ladderWalk {
          0% { left: 4% }
          25% { left: 28% }
          50% { left: 52% }
          75% { left: 76% }
          100% { left: 4% }
        }
        .animate-ladder-walk { animation: ladderWalk 8s ease-in-out infinite; }
        @keyframes ladderDrift {
          0%,100% { left: 14% }
          50% { left: 62% }
        }
        .animate-ladder-drift { animation: ladderDrift 10s ease-in-out infinite; }

        /* Runner states */
        @keyframes runnerClimb {
          0% { bottom: 12%; left: 8% }
          20% { bottom: 40%; left: 8% }
          40% { bottom: 70%; left: 8% }
          60% { bottom: 40%; left: 8% }
          80% { bottom: 20%; left: 8% }
          100% { bottom: 12%; left: 8% }
        }
        @keyframes runnerBrowse {
          0% { bottom: 58%; left: 6% }
          25% { left: 32% }
          50% { left: 58% }
          75% { left: 82% }
          100% { left: 6% }
        }
        @keyframes runnerRead {
          0%,100% { bottom: 30%; left: 68% }
        }
        @keyframes runnerCelebrate {
          0% { bottom: 30%; left: 70%; transform: translateY(0) }
          25% { transform: translateY(-6px) }
          50% { transform: translateY(0) }
          75% { transform: translateY(-6px) }
          100% { transform: translateY(0) }
        }
        .runner { position: absolute; }
        .animate-runner-climb { animation: runnerClimb 4.5s ease-in-out infinite; }
        .animate-runner-browse { animation: runnerBrowse 9s ease-in-out infinite; bottom: 58%; }
        .animate-runner-read { animation: runnerRead 2s steps(1,end) infinite; bottom: 30%; }
        .animate-runner-celebrate { animation: runnerCelebrate 2.6s ease-in-out infinite; bottom: 30%; left: 70%; }

        /* Page flip while reading */
        @keyframes pageFlip {
          0% { transform: rotateY(0deg) }
          50% { transform: rotateY(-160deg) }
          100% { transform: rotateY(-360deg) }
        }
        .animate-page-flip { animation: pageFlip 1.2s ease-in-out infinite; }

        /* Ladder styling helper */
        .ladder { will-change: left; }
      `}</style>
    </div>
  );
}