
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Upload, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const MicrophoneInput = ({ onTranscript, t, language = "de", className = "" }) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  const L = (key, fallback) => {
    const v = typeof t === 'function' ? t(key) : null;
    // Immer verständliche deutsche Defaults, falls Key fehlt
    if (!v || v === key) return fallback;
    return v;
  };

  const startListening = async () => {
    setError("");
    
    // Check for Web Speech API support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        // Sprache dynamisch setzen, Standard: Deutsch
        const langMap = { de: 'de-DE', en: 'en-GB', ar: 'ar-SA' };
        recognitionRef.current.lang = langMap[language] || 'de-DE';
        
        recognitionRef.current.onstart = () => {
          setIsListening(true);
        };
        
        recognitionRef.current.onresult = (event) => {
          let finalTranscript = '';
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }
          
          const fullTranscript = finalTranscript + interimTranscript;
          setTranscript(fullTranscript);
          
          if (finalTranscript) {
            onTranscript?.(finalTranscript);
          }
        };
        
        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setError(L('microphoneError', 'Mikrofon konnte nicht verwendet werden.'));
          setIsListening(false);
        };
        
        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
        
        recognitionRef.current.start();
      } catch (err) {
        setError(L('microphoneError', 'Mikrofon konnte nicht verwendet werden.'));
      }
    } else {
      // Fallback: prompt for file upload
      setError(L('microphoneUnsupported', 'Dieses Gerät unterstützt keine Spracherkennung. Bitte Audiodatei hochladen.'));
      fileInputRef.current?.click();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
      setError(L('fileTypeError', 'Bitte wählen Sie eine Audio- oder Video-Datei aus.'));
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError(L('fileSizeError', 'Die Datei ist zu groß (max. 10MB).'));
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      // In a real app, you would upload to your STT service
      // For now, we'll simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock transcription result
      const mockTranscript = "Dies ist ein simuliertes Transkriptionsergebnis der hochgeladenen Audiodatei.";
      setTranscript(mockTranscript);
      onTranscript?.(mockTranscript);
      
    } catch (err) {
      setError(L('processingError', 'Fehler beim Verarbeiten der Audio-Datei.'));
    } finally {
      setIsProcessing(false);
    }

    // Clear the input
    event.target.value = '';
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={isListening ? stopListening : startListening}
          disabled={isProcessing}
          className="glass border-white/30 text-white hover:glow px-4 py-2 rounded-full gap-2"
          aria-label={isListening ? L('dictationStopAria', 'Diktat beenden') : L('dictationStartAria', 'Diktat starten')}
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isListening ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
          <span className="text-sm">
            {isProcessing 
              ? L('audioProcessing', 'Audio wird verarbeitet…')
              : isListening 
                ? L('dictationStopped', 'Diktat beenden')
                : L('microphoneButton', 'Diktat starten')
            }
          </span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isListening || isProcessing}
          className="glass border-white/30 text-white hover:glow px-4 py-2 rounded-full gap-2"
          aria-label={L('uploadAudioAria', 'Audio hochladen')}
        >
          <Upload className="w-4 h-4" />
          <span className="text-sm">{L('microphoneUpload', 'Audio hochladen')}</span>
        </Button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,video/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {isListening && (
        <div className="glass rounded-lg p-3 border border-green-500/50">
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            {L('dictationActive', 'Diktat läuft…')}
          </div>
          {transcript && (
            <div className="text-white/80 text-sm mt-2">
              {transcript}
            </div>
          )}
        </div>
      )}

      {error && (
        <Alert className="glass border-red-500/50">
          <AlertDescription className="text-white">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default MicrophoneInput;
