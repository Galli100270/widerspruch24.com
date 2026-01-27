import React from "react";
import BookshelfLawyer from "@/components/animations/BookshelfLawyer";

/**
 * AnalysisVideo
 * - Zeigt ein stummes, seriöses Loop-Video (Anwalt/Bibliothek)
 * - Fällt automatisch auf die bestehende BookshelfLawyer-Animation zurück, wenn das Video nicht geladen werden kann
 */
export default function AnalysisVideo({ message, subMessage, step, progress, videoUrls }) {
  const defaultUrls = [
    // Mehrere seriöse, lizenzfreie Kandidaten – Browser probiert sie der Reihe nach.
    // Falls keine Quelle lädt, erscheint automatisch der Fallback (BookshelfLawyer).
    "https://assets.mixkit.co/videos/preview/mixkit-woman-focused-on-research-in-law-library-8860-large.mp4",
    "https://assets.mixkit.co/videos/preview/mixkit-woman-focused-on-research-in-law-library-8860-medium.mp4",
  ];

  const sources = Array.isArray(videoUrls) && videoUrls.length > 0 ? videoUrls : defaultUrls;
  const [canPlay, setCanPlay] = React.useState(false);
  const [errored, setErrored] = React.useState(false);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
      <div className="relative w-full h-[320px] sm:h-[380px] md:h-[420px]">
        {!errored && (
          <video
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            onCanPlay={() => setCanPlay(true)}
            onError={() => setErrored(true)}
          >
            {sources.map((src, i) => (
              <source key={i} src={src} type="video/mp4" />
            ))}
          </video>
        )}

        {/* Overlay-Gradient zur besseren Lesbarkeit */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />



        {/* Fallback: bestehende Animation, wenn Video nicht spielbar ist */}
        {(!canPlay || errored) && (
          <div className="absolute inset-0">
            <BookshelfLawyer message={message} subMessage={subMessage} step={step} progress={progress} />
          </div>
        )}
      </div>
    </div>
  );
}