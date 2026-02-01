import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Plus, Trash2, RotateCw, AlertCircle } from "lucide-react";

export default function CameraCapture({ onCapture, t }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streamError, setStreamError] = useState("");
  const [active, setActive] = useState(false);
  const [shots, setShots] = useState([]); // {blob,url}

  useEffect(() => {
    return () => {
      try {
        const v = videoRef.current;
        if (v && v.srcObject) {
          v.srcObject.getTracks().forEach((tr) => tr.stop());
        }
      } catch {}
    };
  }, []);

  const startCamera = async () => {
    setStreamError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      const v = videoRef.current;
      if (!v) return;
      v.srcObject = stream;
      await v.play();
      setActive(true);
    } catch (e) {
      setStreamError("Kamera nicht verfügbar. Bitte Datei-Upload nutzen.");
    }
  };

  const stopCamera = () => {
    const v = videoRef.current;
    if (v && v.srcObject) {
      v.srcObject.getTracks().forEach((tr) => tr.stop());
      v.srcObject = null;
    }
    setActive(false);
  };

  const applyBasicEnhance = (ctx, w, h) => {
    // leichte Kontrast-/Helligkeitsanhebung via CSS-Filter-Äquivalent
    // canvas filter support
    try { ctx.filter = "contrast(1.15) brightness(1.05) saturate(1.05)"; } catch {}
    ctx.drawImage(videoRef.current, 0, 0, w, h);
  };

  const capture = async () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    const w = v.videoWidth || 1280;
    const h = v.videoHeight || 720;
    c.width = w; c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.save();
    applyBasicEnhance(ctx, w, h);
    ctx.restore();
    c.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const shot = { blob, url };
      setShots((prev) => [...prev, shot]);
      onCapture?.(shot);
    }, "image/jpeg", 0.92);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl overflow-hidden bg-black/40">
        <video ref={videoRef} className="w-full h-64 object-contain bg-black" playsInline muted />
        <canvas ref={canvasRef} className="hidden" />
      </div>
      {streamError && (
        <div className="text-yellow-300 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{streamError}</div>
      )}
      <div className="flex flex-wrap gap-2">
        {!active ? (
          <Button onClick={startCamera} className="h-12 w-full text-base glass border-white/30 text-white"><Camera className="w-5 h-5 mr-2" />{t?.('scanner.startCamera') || 'Kamera starten'}</Button>
        ) : (
          <>
            <Button onClick={capture} className="h-12 flex-1 text-base glass border-white/30 text-white"><Plus className="w-5 h-5 mr-2" />Foto aufnehmen</Button>
            <Button onClick={stopCamera} variant="outline" className="h-12 flex-1 text-base glass border-white/30 text-white"><RotateCw className="w-5 h-5 mr-2" />Stop</Button>
          </>
        )}
      </div>
      {shots.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {shots.map((s, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden bg-black">
              <img src={s.url} alt={`Shot ${i+1}`} className="w-full h-24 object-cover" />
              <button
                onClick={() => setShots((prev) => prev.filter((_,idx)=>idx!==i))}
                className="absolute top-1 right-1 bg-black/50 rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                title="Entfernen"
              >
                <Trash2 className="w-4 h-4 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}