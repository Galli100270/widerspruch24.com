import { ExtractDataFromUploadedFile } from "@/integrations/Core";
import { getRemoteFileSize } from "@/components/lib/files";

/**
 * Ruft die OCR-Integration nur auf, wenn die Datei sicher <10MB ist
 * und keine "schweren" Dokumenttypen mit unbekannter Größe vorliegen.
 * Gibt ein Objekt im selben Stil wie die Integration zurück:
 *  - { status: "success", output: {...} }  bei Erfolg
 *  - { status: "bypassed", output: null, reason } wenn bewusst übersprungen
 */
export async function safeExtractData(file_url, json_schema) {
  const MAX_BYTES = 10 * 1024 * 1024;
  const urlLower = (file_url || "").toLowerCase();
  const isPdf = urlLower.endsWith(".pdf") || urlLower.includes("application/pdf");
  const isDocx = urlLower.endsWith(".docx") || urlLower.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  const isOdt = urlLower.endsWith(".odt") || urlLower.includes("application/vnd.oasis.opendocument.text");
  const isHeavyDoc = isPdf || isDocx || isOdt;

  let sizeKnown = false;
  let tooLarge = false;

  try {
    const size = await getRemoteFileSize(file_url);
    sizeKnown = typeof size === "number" && !Number.isNaN(size) && size > 0;
    tooLarge = !!(sizeKnown && size > MAX_BYTES);
  } catch {
    // Größe unbekannt => behandeln wir später
  }

  if (tooLarge) {
    return { status: "bypassed", output: null, reason: "too_large" };
  }
  if (isHeavyDoc && !sizeKnown) {
    // Unbekannte Größe bei schweren Formaten → nicht riskieren (413 vermeiden)
    return { status: "bypassed", output: null, reason: "unknown_size_heavy_doc" };
  }

  // Sicher: Integration ausführen
  const res = await ExtractDataFromUploadedFile({ file_url, json_schema });
  return res;
}