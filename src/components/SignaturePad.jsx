import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Save } from "lucide-react";

export default function SignaturePad({ onSave }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches[0]) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e) => { setDrawing(true); draw(e); };
  const end = () => { setDrawing(false); };
  const draw = (e) => {
    if (!drawing) return;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
  };

  const save = () => {
    const url = canvasRef.current.toDataURL("image/png");
    onSave?.(url);
  };

  return (
    <div>
      <div
        className="bg-white rounded-lg border border-gray-200"
        style={{ width: "100%", height: 200, touchAction: "none" }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full rounded-lg"
          onMouseDown={start}
          onMouseUp={end}
          onMouseLeave={end}
          onMouseMove={draw}
          onTouchStart={start}
          onTouchEnd={end}
          onTouchMove={draw}
        />
      </div>
      <div className="flex gap-2 mt-3">
        <Button variant="outline" className="glass border-white/30 text-white hover:bg-white/10" onClick={clear}>
          <Eraser className="w-4 h-4 mr-2" /> Löschen
        </Button>
        <Button className="glass text-white border-white/30 hover:glow" onClick={save}>
          <Save className="w-4 h-4 mr-2" /> Speichern
        </Button>
      </div>
    </div>
  );
}