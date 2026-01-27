import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Upload, Loader2, AlertTriangle, X, PlusCircle, Check, FileUp, Info, FileText, Zap } from 'lucide-react';
import { UploadFile, InvokeLLM } from '@/integrations/Core';
import { safeExtractData } from '@/components/lib/ocr';
import { AnimatePresence, motion } from 'framer-motion';
import { useProgressFlow } from './hooks/useProgressFlow';
import CarProgressOverlay from './CarProgressOverlay';
import { heicConverter } from './lib/heicConverter';
import { trackEvent } from './lib/analytics';
import { callWithRetry } from '@/components/lib/network';
import { getRemoteFileSize } from '@/components/lib/files';

// Define accepted file types - HEIC wieder hinzugefügt mit Auto-Konvertierung
const ACCEPTED_FORMATS = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'image/heic', 'image/heif', // HEIC/HEIF wieder erlaubt
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.oasis.opendocument.text', // odt
  'message/rfc822', // .eml
  'application/vnd.ms-outlook' // .msg
].join(',');

const SmartScanner = ({ t, onSuccess, onError, onTextContent, maxFileSize = 30 * 1024 * 1024, mode = 'initial', autoProcess = true }) => {
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [capturedFiles, setCapturedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [isHandlingFiles, setIsHandlingFiles] = useState(false);
  const [autoKick, setAutoKick] = useState(false); // Auto-Verarbeitung
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const progressFlow = useProgressFlow();
  const processAllFilesRef = useRef(null);

  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  // Startet automatisch die Verarbeitung, sobald Dateien vorhanden sind (benutzt Ref, kein TDZ)
  useEffect(() => {
    if (!autoProcess) return;
    if (autoKick && capturedFiles.length > 0 && !progressFlow.isVisible && !isHandlingFiles) {
      setAutoKick(false);
      const fn = processAllFilesRef.current;
      if (fn) setTimeout(() => fn(), 0);
    }
  }, [autoProcess, autoKick, capturedFiles.length, progressFlow.isVisible, isHandlingFiles]);

  const sanitizeImage = useCallback((file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onerror = () => {
        console.error('File reading failed for:', file.name);
        resolve(null);
      };
      reader.onload = (event) => {
        const img = new Image();
        img.onerror = () => {
          console.error('Image loading failed for:', file.name, '. It might be corrupted.');
          resolve(null);
        };
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 2048;
          const MAX_HEIGHT = 2048;
          let { width, height } = img;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const originalFileName = file.name.split('.').slice(0, -1).join('.') || 'scan';
                const newFile = new File([blob], `${originalFileName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
                resolve(newFile);
              } else {
                console.error('Canvas toBlob conversion failed.');
                resolve(null);
              }
            },
            'image/jpeg',
            0.9
          );
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const processAllFiles = useCallback(async () => {
    if (capturedFiles.length === 0) {
      setError(t('scanner.noFilesToProcess'));
      return;
    }

    progressFlow.show();

    try {
      let processedFiles = [...capturedFiles];

      // Phase 1: HEIC-Konvertierung (falls nötig)
      const heicFiles = processedFiles.filter(file => heicConverter.isHEIC(file));
      if (heicFiles.length > 0) {
        progressFlow.startStep('convert_heic');
        progressFlow.updateProgress(0, t('scanner.convertingHeicFiles'));

        let heicConvertCount = 0;
        const convertedFiles = await Promise.all(
          processedFiles.map(async (file, index) => {
            if (heicConverter.isHEIC(file)) {
              try {
                const convertedFile = await heicConverter.convert(file, {
                  maxDimension: 4000,
                  quality: 85,
                  stripMetadata: true,
                  onProgress: (progress) => {
                    const totalProgress = ((heicConvertCount + (progress / 100)) / heicFiles.length) * 100;
                    progressFlow.updateProgress(totalProgress, t('scanner.convertingHeicFilesProgress', { file: file.name }));
                  }
                });
                heicConvertCount++;
                console.log(`HEIC konvertiert: ${file.name} → ${convertedFile.name}`);
                // Add a flag to indicate this file has been processed by HEIC converter
                return Object.assign(convertedFile, { _converted: true });
              } catch (conversionError) {
                console.error('HEIC-Konvertierung fehlgeschlagen:', conversionError);
                // HEIC-Konvertierung fehlgeschlagen → Nutzer informieren
                throw new Error(`HEIC-Datei "${file.name}" konnte nicht konvertiert werden. Bitte wandeln Sie die Datei in ein JPG oder PNG um und versuchen Sie es erneut.`);
              }
            }
            return file; // Nicht-HEIC Dateien unverändert durchreichen
          })
        );

        processedFiles = convertedFiles;
        progressFlow.completeStep();
      }

      // Phase 2: Upload (wie bisher)
      progressFlow.startStep('uploading');
      progressFlow.updateProgress(0, t('scanner.uploadingFiles'));

      const uploadedUrls = [];
      let lastUploadError = null;

      // Sanitize nur Standard-Web-Images (nicht die bereits konvertierten HEIC-Dateien)
      const sanitizedFiles = await Promise.all(
        processedFiles.map(file => {
          if (file._converted) { // If it was already converted from HEIC, it's likely a suitable format
            return file;
          }
          if (file.type.startsWith('image/')) {
            return sanitizeImage(file);
          }
          return file;
        })
      );

      for (let i = 0; i < sanitizedFiles.length; i++) {
        const currentFile = sanitizedFiles[i];

        if (!currentFile) {
          console.warn(`Skipping a file that could not be processed (null).`);
          progressFlow.updateProgress(((i + 1) / sanitizedFiles.length) * 100, t('scanner.uploadingFilesProgress', { file: capturedFiles[i]?.name || 'Datei' }));
          continue;
        }

        try {
          const { file_url } = await callWithRetry(() => UploadFile({ file: currentFile }), 3, 1000);
          if (file_url) uploadedUrls.push(file_url);
        } catch (e) {
          lastUploadError = e;
          console.warn('Upload fehlgeschlagen, überspringe Datei:', capturedFiles[i]?.name || '(unbekannt)', e);
        }

        progressFlow.updateProgress(((i + 1) / sanitizedFiles.length) * 100, t('scanner.uploadingFilesProgress', { file: capturedFiles[i]?.name || 'Datei' }));
      }
      // NEW: analytics event after upload batch
      try { trackEvent('upload_success', { type: mode === 'additional' ? 'additional' : 'initial', count: uploadedUrls.length }); } catch {}

      if (uploadedUrls.length === 0) {
        const msg = lastUploadError?.message || t('scanner.allFilesFailed');
        throw new Error(msg);
      }

      progressFlow.completeStep();

      if (mode === 'additional') {
        progressFlow.nextStep(); // Moves to a dummy step or directly completes the flow
        setTimeout(() => {
          progressFlow.completeStep();
          progressFlow.nextStep();

          setTimeout(() => {
            onSuccess?.({ document_urls: uploadedUrls });
            setCapturedFiles([]);
            setPreviewUrls([]);
            progressFlow.hide();
          }, 1000);
        }, 1500);
        return;
      }

      // Phase 3: OCR & Analyse mit hartem Bypass bei >10MB
      progressFlow.nextStep(); // 'ocr'
      progressFlow.updateProgress(0, t('scanner.extractingData'));

      const MAX_BYTES = 10 * 1024 * 1024; // 10MB (Analyse-Limit, Upload erlaubt)
      const firstUrl = uploadedUrls[0];

      let sizeBytes = null;
      let tooLarge = false;
      let sizeKnown = false;
      const urlLower = (firstUrl || "").toLowerCase();
      const isPdf = urlLower.endsWith(".pdf") || urlLower.includes("application/pdf");
      const isDocx = urlLower.endsWith(".docx") || urlLower.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      const isOdt = urlLower.endsWith(".odt") || urlLower.includes("application/vnd.oasis.opendocument.text");
      const isHeavyDoc = isPdf || isDocx || isOdt;

      try {
        sizeBytes = await getRemoteFileSize(firstUrl);
        sizeKnown = typeof sizeBytes === "number" && !Number.isNaN(sizeBytes) && sizeBytes > 0;
        tooLarge = !!(sizeKnown && sizeBytes > MAX_BYTES);
        if (tooLarge) {
          console.log(`File ${firstUrl} size (${sizeBytes} bytes) exceeds ${MAX_BYTES} bytes. Bypassing extraction.`);
        }
      } catch (e) {
        console.warn(`Could not get remote file size for ${firstUrl}, proceeding with OCR guard:`, e);
      }

      // Wenn Datei zu groß ODER (großes Office/PDF-Dokument und Größe unbekannt): KEINE OCR-Integration aufrufen
      // Hintergrund: Einige CDNs liefern keine Content-Length -> 413 bei der Integration vermeiden.
      if (tooLarge) {
        // Überspringe weitere Schritte und liefere sinnvolle Platzhalter
        progressFlow.completeStep(); // OCR done (bypassed)

        progressFlow.nextStep(); // 'analyzing'
        progressFlow.updateProgress(100, t('scanner.analyzingContent'));
        progressFlow.completeStep();

        progressFlow.nextStep(); // 'drafting'
        progressFlow.updateProgress(100, t('scanner.draftingResponse'));
        progressFlow.completeStep();

        progressFlow.nextStep(); // 'done'

        const combinedData = {
          sender_name: t?.('common.unknown') || 'Unbekannt',
          sender_address: '',
          reference_number: t?.('common.unknown') || 'Unbekannt',
          document_date: new Date().toISOString().split('T')[0],
          amount: null,
          document_urls: uploadedUrls,
          suggested_category: 'other',
          reason_summary: tooLarge
            ? 'Das Dokument überschreitet das 10MB-Limit. Bitte laden Sie die relevanten Seiten als Fotos (JPG/PNG) nach oder teilen Sie die PDF in kleinere Teile.'
            : 'Das PDF/Office-Dokument konnte aufgrund unbekannter/zu großer Dateigröße nicht automatisch gelesen werden. Bitte laden Sie relevante Seiten als Fotos (JPG/PNG) nach oder teilen Sie die Datei in kleinere Teile.',
          customer_name: '',
          customer_address: ''
        };

        setTimeout(() => {
          onSuccess?.(combinedData);
          setCapturedFiles([]);
          setPreviewUrls([]);
          progressFlow.hide();
        }, 800);
        return;
      }

      // Nicht zu groß: regulärer Pfad mit OCR (jetzt über safeExtractData) und ggf. LLM-Fallback (ohne große Datei)
      let baseExtraction = null;
      let useLLMFallback = false;

      try {
        const schema = {
            type: "object",
            properties: {
              sender_name: { type: "string" },
              sender_address: { type: "string" },
              reference_number: { type: "string" },
              document_date: { type: "string", format: "date" },
              amount: { type: "number" },
              recipient_name: { type: "string" },
              recipient_address: { type: "string" }
            }
        };
        const urlsForExtraction = isPdf ? [firstUrl] : uploadedUrls.slice(0, Math.min(5, uploadedUrls.length));
        const results = await Promise.all(urlsForExtraction.map(u => safeExtractData(u, schema)));
        const merged = {};
        for (const r of results) {
          if (r?.status === "success" && r.output) {
            const o = r.output;
            for (const k of Object.keys(o)) {
              const nv = o[k];
              const v = merged[k];
              if (v == null || (typeof nv === "string" && nv.trim().length > (typeof v === "string" ? v.trim().length : 0)) || (typeof nv === "number" && (v == null))) {
                merged[k] = nv;
              }
            }
          }
        }
        if (Object.keys(merged).length > 0) {
          baseExtraction = merged;
          console.log("Extraction successful on", urlsForExtraction.length, "file(s).");
        } else {
          console.warn("Extraction bypassed or empty on all files. Falling back to LLM (without file_urls).");
          useLLMFallback = true;
        }
      } catch (e) {
        console.error("Error during extraction, falling back to LLM (without file_urls):", e);
        useLLMFallback = true;
      }

      if (useLLMFallback) {
        console.log("Using LLM for initial structured extraction (without file context).");
        // ACHTUNG: Keine file_urls an LLM schicken (kann ebenfalls 10MB Limit triggern)
        // Stattdessen generischer Versuch, Struktur zu liefern – Nutzerhinweis folgt.
        const schema = {
          type: "object",
          properties: {
            sender_name: { type: "string" },
            sender_address: { type: "string" },
            reference_number: { type: "string" },
            document_date: { type: "string" },
            amount: { type: "number" },
            recipient_name: { type: "string" },
            recipient_address: { type: "string" }
          }
        };
        const prompt = `
Versuche, aus allgemeinen Kenntnissen und Kontextinformationen die folgenden Felder zu füllen.
Dies ist ein Fallback, da keine Dateianalyse möglich war. Antworte ausschließlich als JSON entsprechend des vorgegebenen Schemas.
Verwende Platzhalter wie "Unbekannt" oder leere Strings, wenn keine Informationen ableitbar sind. Deutsch.`;
        const llmRes = await InvokeLLM({
          prompt,
          response_json_schema: schema
        });
        baseExtraction = baseExtraction || {}; // Preserve any partial extraction if available
        if (llmRes && typeof llmRes === 'object') {
            baseExtraction = { ...baseExtraction, ...llmRes }; // Merge if LLM provides something
        }
      }
      if (!baseExtraction || Object.keys(baseExtraction).length === 0) {
        // If even the LLM fallback (without files) didn't provide anything, set sensible defaults
        baseExtraction = {
          sender_name: t?.('common.unknown') || 'Unbekannt',
          sender_address: '',
          reference_number: t?.('common.unknown') || 'Unbekannt',
          document_date: new Date().toISOString().split('T')[0],
          amount: null,
          recipient_name: t?.('common.unknown') || 'Unbekannt',
          recipient_address: ''
        };
      }

      progressFlow.completeStep(); // OCR abgeschlossen (inkl. internem Fallback)

      // Phase 4: inhaltliche Analyse – bei großem File bereits oben übersprungen; hier normal (ohne file_urls)
      progressFlow.nextStep(); // 'analyzing'
      progressFlow.updateProgress(0, t('scanner.analyzingContent'));

      let reasonAnalysis = {
        suggested_category: 'other',
        reason_summary:
          'Automatische Analyse ohne Dateikontext. Bitte prüfen Sie die Angaben und laden Sie bei Bedarf zusätzliche Seiten als Fotos hoch.',
        recipient_name: baseExtraction?.recipient_name || '',
        recipient_address: baseExtraction?.recipient_address || '',
      };

      // Nur wenn wir NICHT zu groß waren und OCR Pfad lief, können wir optional LLM (ohne Datei) befragen
      try {
        const schema = {
          type: "object",
          properties: {
            suggested_category: { type: "string" },
            reason_summary: { type: "string" },
            recipient_name: { type: "string" },
            recipient_address: { type: "string" }
          }
        };
        const rp = `
Analysiere die folgenden bereits extrahierten Basisdaten (kein Dateikontext verfügbar).
Liefere eine kompakte Zusammenfassung in Deutsch:
${JSON.stringify(baseExtraction).slice(0, 1500)}
Antwort nur als JSON.`;
        const ra = await InvokeLLM({ prompt: rp, response_json_schema: schema });
        if (ra && typeof ra === 'object') reasonAnalysis = { ...reasonAnalysis, ...ra };
      } catch (e) {
        console.warn("Error during InvokeLLM for reason analysis (without file context), using generic summary:", e);
        // still fine – we keep the generic reasonAnalysis
      }

      progressFlow.completeStep();

      progressFlow.nextStep(); // 'drafting'
      progressFlow.updateProgress(0, t('scanner.draftingResponse'));
      const combinedData = {
        ...baseExtraction,
        document_urls: uploadedUrls,
        suggested_category: reasonAnalysis.suggested_category,
        reason_summary: reasonAnalysis.reason_summary,
        customer_name: reasonAnalysis.recipient_name || baseExtraction.recipient_name || '',
        customer_address: reasonAnalysis.recipient_address || baseExtraction.recipient_address || ''
      };

      progressFlow.completeStep();
      progressFlow.nextStep(); // 'done'

      setTimeout(() => {
        onSuccess?.(combinedData);
        setCapturedFiles([]);
        setPreviewUrls([]);
        progressFlow.hide();
      }, 800);

    } catch (err) {
      const errorMsg = err.message || t('scanner.genericError');
      progressFlow.setStepError(errorMsg);
      setError(errorMsg);
      onError?.(errorMsg);
    }
  }, [t, onSuccess, onError, capturedFiles, sanitizeImage, mode, progressFlow]);

  // Halte aktuelle Funktion in Ref, damit obige Effekte sie sicher verwenden können
  useEffect(() => {
    processAllFilesRef.current = processAllFiles;
  }, [processAllFiles]);

  const handleFiles = useCallback(async (filesList, source = 'unknown') => {
    if (!filesList || filesList.length === 0) return;

    setError('');
    setIsHandlingFiles(true);

    const newFilesToAdd = [];

    try {
      for (const fileToProcess of Array.from(filesList)) {
        if (fileToProcess.size > maxFileSize) {
          throw new Error(t('scanner.fileTooLarge', {
            size: (fileToProcess.size / (1024 * 1024)).toFixed(1),
            max: (maxFileSize / (1024 * 1024)).toFixed(0)
          }));
        }

        const fileType = (fileToProcess.type || '').toLowerCase();
        const isTextBased = ['text/plain', 'message/rfc822', 'application/vnd.ms-outlook'].includes(fileType);
        const isSupportedImage = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'].includes(fileType);
        const isHEIC = heicConverter.isHEIC(fileToProcess); // NEU: HEIC-Erkennung
        const isDocument = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.oasis.opendocument.text'].includes(fileType);

        // Hinweis: Große PDFs/DOCs dürfen hochgeladen werden; OCR/Analyse wird später für >10MB sicher übersprungen.
        // (Vorab-Grenzen entfernen, nur globales maxFileSize bleibt aktiv)

        if (isTextBased && onTextContent) {
          const reader = new FileReader();
          reader.onload = (e) => {
            onTextContent(e.target.result, fileToProcess);
            setIsHandlingFiles(false);
          };
          reader.onerror = () => {
            const readError = t('scanner.readFileError');
            setError(readError);
            onError?.(readError);
            setIsHandlingFiles(false);
          };
          reader.readAsText(fileToProcess);
          return;
        }

        if (isSupportedImage || isHEIC || isDocument) { // NEU: HEIC erlaubt
          newFilesToAdd.push(fileToProcess);
        } else {
          throw new Error(t('scanner.invalidFileTypeDetailed', { type: fileType }));
        }
      }

      setCapturedFiles(prev => [...prev, ...newFilesToAdd]);

      // Preview-URLs: HEIC-Dateien bekommen ein spezielles Icon
      const newPreviewUrls = newFilesToAdd.map(file => {
        if (heicConverter.isHEIC(file)) {
          return null; // HEIC-Dateien können nicht als Blob-URL angezeigt werden
        }
        return URL.createObjectURL(file);
      });

      setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
      setIsHandlingFiles(false);

      // Nach erfolgreicher Auswahl Verarbeitung automatisch starten
      if (autoProcess && newFilesToAdd.length > 0) {
        setAutoKick(true);
      }
    } catch (err) {
      const errorMsg = err.message || t('scanner.genericError');
      setError(errorMsg);
      onError?.(errorMsg);
      setIsHandlingFiles(false);
    }
  }, [t, onError, onTextContent, maxFileSize, autoProcess]);

  const removeFile = useCallback((index) => {
    setCapturedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      // Only revoke if there was an actual URL to revoke
      if (prev[index]) {
        URL.revokeObjectURL(prev[index]);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(Array.from(e.dataTransfer.files), 'drop');
  };

  const openCamera = useCallback(() => {
    try { if (cameraInputRef.current) cameraInputRef.current.value = null; } catch {}
    cameraInputRef.current?.click();
  }, []);
  const openFilePicker = useCallback(() => {
    try { if (fileInputRef.current) fileInputRef.current.value = null; } catch {}
    fileInputRef.current?.click();
  }, []);

  if (capturedFiles.length > 0) {
    return (
      <>
        <CarProgressOverlay
          isVisible={progressFlow.isVisible}
          currentStep={progressFlow.currentStep}
          progress={progressFlow.progress}
          error={progressFlow.error}
          retryCount={progressFlow.retryCount}
          onCancel={progressFlow.cancel}
          onComplete={progressFlow.hide}
          onRetry={() => {
            // erneuter Versuch: Overlay neu zeigen und Verarbeitung erneut starten
            progressFlow.show();
            setTimeout(() => processAllFiles(), 0);
          }}
          t={t}
          previews={previewUrls}
        />

        <div className="space-y-6">
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">
                {mode === 'additional' ? t('scanner.additionalDocuments') : t('scanner.yourDocumentPages')}
              </h3>
              {/* HEIC-Info Badge */}
              {capturedFiles.some(file => heicConverter.isHEIC(file)) && (
                <div className="glass rounded-full px-3 py-1 border border-blue-400/30">
                  <div className="flex items-center gap-2 text-blue-200 text-sm">
                    <Zap className="w-4 h-4" />
                    HEIC → JPG
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
              <AnimatePresence>
                {previewUrls.map((url, index) => {
                  const file = capturedFiles[index];
                  const isHEIC = file && heicConverter.isHEIC(file);
                  // Ein Bild ist renderbar, wenn es eine gültige Preview-URL hat UND kein HEIC ist
                  const isRenderableImage = url && file && !isHEIC && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type.toLowerCase());

                  return (
                    <motion.div
                      key={`${url || file?.name}-${index}`}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="relative group aspect-[3/4] rounded-lg overflow-hidden border border-white/20"
                    >
                      {isRenderableImage ? (
                        <img
                          src={url}
                          alt={`${mode === 'additional' ? t('scanner.document') : t('scanner.page')} ${index + 1}`}
                          className="object-cover w-full h-full shadow-md bg-white"
                        />
                      ) : file && file.type === 'application/pdf' && url ? (
                        <iframe
                          src={`${url}#page=1&zoom=page-width`}
                          title={`PDF ${index + 1}`}
                          className="w-full h-full bg-white"
                        />
                      ) : (
                        <div className="w-full h-full bg-white/10 flex flex-col items-center justify-center p-2 text-center">
                          {isHEIC ? (
                            <>
                              <div className="flex items-center gap-1 mb-2">
                                <FileText className="w-8 h-8 text-blue-400" />
                                <Zap className="w-4 h-4 text-yellow-400" />
                              </div>
                              <span className="text-xs text-blue-200 font-medium">HEIC</span>
                              <span className="text-xs text-white/60 mt-1">{t('scanner.willBeConverted')}</span>
                            </>
                          ) : (
                            <>
                              <FileText className="w-10 h-10 text-white/80" />
                              {file && (
                                <span className="mt-2 text-xs text-white/70 break-all">{file.name}</span>
                              )}
                            </>
                          )}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          size="icon"
                          variant="destructive"
                          className="rounded-full w-8 h-8"
                          onClick={() => removeFile(index)}
                          title={mode === 'additional' ? t('scanner.removeDocument') : t('scanner.removePage')}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4">
              <Button
                onClick={openFilePicker}
                variant="outline"
                className="glass text-white border-white/30 hover:glow py-3 px-5 rounded-2xl cursor-pointer"
                disabled={isHandlingFiles || progressFlow.isVisible}
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                {mode === 'additional' ? t('scanner.addDocument') : t('scanner.addPage')}
              </Button>

              <Button
                onClick={processAllFiles}
                disabled={isHandlingFiles || progressFlow.isVisible || capturedFiles.length === 0}
                className="glass text-white border-white/30 hover:glow py-4 px-6 rounded-2xl text-base sm:text-lg w-full sm:w-auto"
              >
                {(isHandlingFiles || progressFlow.isVisible) ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Check className="w-5 h-5 mr-2" />
                )}
                {mode === 'additional'
                  ? t('scanner.processDocuments', { count: capturedFiles.length })
                  : t('scanner.processPages', { count: capturedFiles.length })
                }
              </Button>
            </div>
          </div>

          {error && !progressFlow.isVisible && (
            <Alert className="glass border-red-500/50">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <AlertDescription className="text-white">
                <div className="font-medium mb-2">{t('scanner.errorTitle')}</div>
                <div className="text-sm">{error}</div>
                <Button
                  onClick={() => { setError(''); }}
                  variant="outline"
                  size="sm"
                  className="mt-3 glass border-white/30 text-white hover:bg-white/10"
                >
                  {t('scanner.dismissError')}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FORMATS}
            multiple
            onChange={(e) => handleFiles(e.target.files, 'file')}
            className="hidden"
            disabled={isHandlingFiles || progressFlow.isVisible}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <CarProgressOverlay
        isVisible={progressFlow.isVisible}
        currentStep={progressFlow.currentStep}
        progress={progressFlow.progress}
        error={progressFlow.error}
        retryCount={progressFlow.retryCount}
        onCancel={progressFlow.cancel}
        onComplete={progressFlow.hide}
        onRetry={() => {
          progressFlow.show();
          setTimeout(() => processAllFiles(), 0);
        }}
        t={t}
        previews={[]}
      />

      <div className="space-y-6">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`glass rounded-3xl p-8 text-center group hover:glow transition-all duration-300 border-2 border-dashed flex flex-col items-center justify-center ${isDragging ? 'border-purple-400' : 'border-white/20'}`}
        >
          <div className="w-24 h-24 glass rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-105 transition-transform">
            <FileUp className="w-14 h-14 text-white" />
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
            {t('scanner.dropzoneTitle')}
          </h3>
          <p className="text-white/80 mb-6 text-sm">
            {t('scanner.supportedFormats')} PDF, JPG, PNG, DOCX, ...
          </p>

          <div className="glass rounded-2xl p-4 mb-6 border border-blue-400/30 w-full max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-blue-400" />
              <span className="text-blue-200 font-medium text-sm">{t('scanner.photoHint')}</span>
            </div>
            <p className="text-blue-200/80 text-xs">
              {t('scanner.photoHintDesc')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
            {/* Kamera: nur Kamera direkt öffnen */}
            <Button
              onClick={openCamera}
              className="glass text-white border-white/30 hover:glow transition-all duration-300 py-4 px-6 rounded-2xl flex items-center gap-2 flex-1"
              disabled={isHandlingFiles || progressFlow.isVisible}
            >
              <Camera className="w-5 h-5" />
              {t('scanner.useCamera')}
            </Button>
            {/* Datei: alle restlichen Dokumenttypen */}
            <Button
              onClick={openFilePicker}
              variant="outline"
              className="glass border-white/30 text-white hover:bg-white/10 py-4 px-6 rounded-2xl flex items-center gap-2 flex-1"
              disabled={isHandlingFiles || progressFlow.isVisible}
            >
              <Upload className="w-5 h-5" />
              {t('scanner.selectFile')}
            </Button>
          </div>

          {/* NEU: Kamerainput strikt Kamera */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={(e) => handleFiles(e.target.files, 'camera')}
            className="hidden"
            disabled={isHandlingFiles || progressFlow.isVisible}
          />

          {/* Dateiinput bleibt für alle Dokumenttypen */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FORMATS}
            multiple
            onChange={(e) => handleFiles(e.target.files, 'file')}
            className="hidden"
            disabled={isHandlingFiles || progressFlow.isVisible}
          />
        </div>

        {error && !progressFlow.isVisible && (
          <Alert className="glass border-red-500/50">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <AlertDescription className="text-white">
              <div className="font-medium mb-2">{t('scanner.errorTitle')}</div>
              <div className="text-sm">{error}</div>
              <Button
                onClick={() => { setError(''); }}
                variant="outline"
                size="sm"
                className="mt-3 glass border-white/30 text-white hover:bg-white/10"
              >
                {t('scanner.retryUpload')}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="glass rounded-2xl p-4">
          <h4 className="text-white font-medium mb-3">{t('scanner.tipsTitle')}</h4>
          <ul className="text-white/80 text-sm space-y-2">
            <li>• {t('scanner.tip1')}</li>
            <li>• {t('scanner.tip2')}</li>
            <li>• {t('scanner.tip3')}</li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default SmartScanner;