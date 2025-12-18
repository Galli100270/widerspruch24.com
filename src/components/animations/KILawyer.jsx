import React from "react";
import { BookOpen, Scale, Gavel, Brain } from "lucide-react";

export default function KILawyer({ message = "Erstelle Widerspruchstext…", subMessage = "Die KI formuliert gerade Ihren persönlichen Widerspruch. Dies kann einen Moment dauern." }) {
  return (
    <div className="glass rounded-3xl p-8 md:p-12 text-center">
      <style>{`
        @keyframes float {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes swing {
          0%,100% { transform: rotate(-8deg); }
          50% { transform: rotate(8deg); }
        }
        @keyframes page {
          0%,100% { transform: rotateX(0deg); opacity: .8; }
          50% { transform: rotateX(35deg); opacity: 1; }
        }
        @keyframes think {
          0%,100% { transform: translate(0,0) scale(1); opacity: .7; }
          50% { transform: translate(6px,-6px) scale(1.08); opacity: 1; }
        }
        @keyframes tap {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(2px); }
        }
      `}</style>

      <div className="mx-auto w-48 sm:w-56 h-40 relative mb-6">
        {/* Tisch */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 sm:w-56 h-3 rounded-full bg-black/30 blur-sm" />

        {/* Kopf / Gehirn */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-lg"
             style={{ animation: "float 4s ease-in-out infinite" }}>
          <Brain className="w-7 h-7 opacity-95" />
        </div>

        {/* Gesetzbuch */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-28 h-16 bg-white rounded-md shadow-xl border border-slate-200 flex items-center justify-center"
             style={{ animation: "page 2.2s ease-in-out infinite" }}>
          <BookOpen className="w-8 h-8 text-slate-700" />
        </div>

        {/* Waage, leicht pendelnd */}
        <div className="absolute top-6 left-6 text-amber-300"
             style={{ animation: "swing 2.4s ease-in-out infinite" }}>
          <Scale className="w-8 h-8 drop-shadow" />
        </div>

        {/* Richterhammer, leichtes Tippen */}
        <div className="absolute bottom-6 right-6 text-rose-300"
             style={{ animation: "tap 1.8s ease-in-out infinite" }}>
          <Gavel className="w-7 h-7 drop-shadow" />
        </div>

        {/* Denkblasen */}
        <div className="absolute -top-2 right-10 text-white/80"
             style={{ animation: "think 2.6s ease-in-out infinite" }}>
          <div className="w-2 h-2 rounded-full bg-white/80 mb-1"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-white/60"></div>
        </div>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{message}</h1>
      <p className="text-white/80">{subMessage}</p>
    </div>
  );
}