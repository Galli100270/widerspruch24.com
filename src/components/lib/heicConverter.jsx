import { UploadPrivateFile } from '@/integrations/Core';
import { convertHeic } from '@/functions/convertHeic';

// HEIC-Konverter mit Client/Server-Fallback-Strategie
class HEICConverter {
  constructor() {
    this.wasmLoaded = false;
    this.initWASM();
  }

  async initWASM() {
    // Client-side WASM is not available on the platform, so this will always be false.
    this.wasmLoaded = false;
    console.log('Client-side HEIC WASM-Decoder is not available. Using server-side conversion only.');
  }

  // Erkennt HEIC/HEIF-Dateien anhand MIME-Type und Magic Bytes
  isHEIC(file) {
    const mimeTypes = ['image/heic', 'image/heif'];
    return mimeTypes.includes(file.type.toLowerCase()) || 
           file.name.toLowerCase().match(/\.(heic|heif)$/);
  }

  // Magic Bytes Detection für zusätzliche Sicherheit
  async detectHEICMagicBytes(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target.result;
        const uint8Array = new Uint8Array(arrayBuffer.slice(0, 32));
        const header = Array.from(uint8Array).map(b => String.fromCharCode(b)).join('');
        
        const isHEIC = header.includes('ftyp') && 
                      (header.includes('heic') || header.includes('heix') || 
                       header.includes('hevc') || header.includes('mif1'));
        resolve(isHEIC);
      };
      reader.onerror = () => resolve(false);
      reader.readAsArrayBuffer(file);
    });
  }

  // Server-seitige Konvertierung
  async convertServerSide(file, options = {}) {
    const { onProgress = () => {}, quality = 85 } = options;
    
    try {
      onProgress(10, 'Lade HEIC sicher hoch...');

      // 1. Upload the raw HEIC file to private storage
      const { file_uri } = await UploadPrivateFile({ file });
      if (!file_uri) {
        throw new Error('Private file upload failed.');
      }

      onProgress(40, 'Server konvertiert das Bild...');

      // 2. Call the backend function to convert the file
      const response = await convertHeic({
        file_uri: file_uri,
        quality: quality,
      });

      // The function returns raw image data, so we get it from response.data
      const convertedBlob = new Blob([response.data], { type: 'image/jpeg' });
      
      onProgress(90, 'Konvertierung abgeschlossen!');

      // 3. Create a new File object from the returned blob
      const originalName = file.name.replace(/\.(heic|heif)$/i, '');
      const convertedFile = new File([convertedBlob], `${originalName}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      convertedFile._originalName = file.name;
      convertedFile._converted = true;
      convertedFile._conversionMethod = 'server';

      return convertedFile;

    } catch (error) {
      console.error('Server-seitige HEIC-Konvertierung fehlgeschlagen:', error);
      throw error;
    }
  }

  // Hauptmethode: Da Client-side nicht geht, wird immer der Server genutzt
  async convert(file, options = {}) {
    const { onProgress = () => {} } = options;

    try {
      // Validiere HEIC-Datei
      if (!this.isHEIC(file)) {
        throw new Error('Datei ist kein HEIC/HEIF-Format');
      }

      // Magic Bytes zusätzlich prüfen
      const isTrueHEIC = await this.detectHEICMagicBytes(file);
      if (!isTrueHEIC) {
        throw new Error('Datei hat HEIC-Endung, aber falsches Format');
      }

      // Always use server-side conversion
      onProgress(5, 'Starte Server-Konvertierung...');
      return await this.convertServerSide(file, {
        ...options,
        onProgress: (progress, status) => onProgress(progress, `☁️ ${status}`)
      });

    } catch (error) {
      onProgress(0, '❌ Konvertierung fehlgeschlagen');
      throw new Error(`HEIC-Konvertierung fehlgeschlagen: ${error.message}`);
    }
  }
}

// Singleton-Export
export const heicConverter = new HEICConverter();
export default heicConverter;