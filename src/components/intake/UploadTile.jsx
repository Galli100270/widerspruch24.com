import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileText, Image } from "lucide-react";
import CloudUploadIllustration from "@/components/illustrations/CloudUploadIllustration";

export default function UploadTile({ title = "Datei-Upload", hint = "Zieh deine PDF oder Fotos hierher – oder klicke auf Hochladen.", accept = "*/*", onSelect, filesCount = 0 }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const openPicker = () => inputRef.current?.click();

  const handleChange = (e) => {
    onSelect?.(e);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length) {
      onSelect?.({ target: { files } });
    }
  };

  const handleDrag = (e, over) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(over);
  };

  return (
    <div className="rounded-3xl p-4 min-h-[360px] bg-gradient-to-br from-indigo-600/20 to-blue-600/20 border border-white/15 flex flex-col">
      <h3 className="text-white font-semibold mb-3">{title}</h3>
      <div
        className={`flex-1 rounded-2xl border-2 border-dashed transition ${dragOver ? 'border-white/70 bg-white/5' : 'border-white/20 bg-black/20'} flex flex-col items-center justify-center text-center px-6`}
        onDragEnter={(e)=>handleDrag(e,true)}
        onDragOver={(e)=>handleDrag(e,true)}
        onDragLeave={(e)=>handleDrag(e,false)}
        onDrop={handleDrop}
      >
        <CloudUploadIllustration className="floating" />
        <p className="text-white font-medium mt-2">Dateien hierher ziehen</p>
        <p className="text-white/70 text-sm mt-1">{hint}</p>
        <div className="flex items-center gap-3 text-white/60 text-xs mt-3">
          <Image className="w-4 h-4" /> JPG • PNG • WEBP • HEIC
          <FileText className="w-4 h-4" /> PDF • DOCX • TXT
        </div>
        <Button onClick={openPicker} className="mt-5 h-12 w-full max-w-xs text-base glass border-white/30 text-white">Dateien hochladen</Button>
        <input ref={inputRef} type="file" multiple accept={accept} className="hidden" onChange={handleChange} />
      </div>
      {filesCount > 0 && (
        <div className="mt-3 text-white/80 text-sm">{filesCount} Datei(en) ausgewählt – Analyse startet automatisch…</div>
      )}
    </div>
  );
}