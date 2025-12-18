// Bildklassifikation: Dokument vs. Alltagsfoto
class ImageClassifier {
  constructor() {
    this.documentFeatures = {
      // Gewichtungen für Dokument-Erkennung
      whiteBackground: 0.25,
      rectangularShapes: 0.20,
      textDensity: 0.30,
      edgeContrast: 0.15,
      aspectRatio: 0.10
    };
  }

  // Hauptfunktion: Klassifiziert Bild als Dokument oder Foto
  async classifyImage(file) {
    try {
      const features = await this.extractFeatures(file);
      const documentScore = this.calculateDocumentScore(features);
      const objectLabel = await this.detectObject(file);

      return {
        isDocument: documentScore >= 0.6,
        documentScore: documentScore,
        objectDetection: objectLabel,
        features: features,
        confidence: objectLabel.confidence
      };
    } catch (error) {
      console.error('Bildklassifikation fehlgeschlagen:', error);
      return {
        isDocument: true, // Fallback: behandle als Dokument
        documentScore: 0.8,
        objectDetection: { label: 'unbekannt', confidence: 0.5 },
        features: {},
        confidence: 0.5
      };
    }
  }

  // Feature-Extraktion aus dem Bild
  async extractFeatures(file) {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        canvas.width = Math.min(img.width, 800); // Skaliert für Performance
        canvas.height = Math.min(img.height, 800);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const features = this.analyzeImageData(imageData, canvas.width, canvas.height);
        resolve(features);
      };

      img.onerror = () => resolve({});
      img.src = URL.createObjectURL(file);
    });
  }

  // Bildanalyse für Dokument-Features
  analyzeImageData(imageData, width, height) {
    const data = imageData.data;
    const pixels = width * height;
    
    let whitePixels = 0;
    let totalBrightness = 0;
    let edgePixels = 0;
    
    // Analysiere Pixel
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Helligkeit berechnen
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
      
      // Weiße/helle Pixel (typisch für Dokumente)
      if (brightness > 240) {
        whitePixels++;
      }
    }

    // Kanten-Detektion (vereinfacht)
    edgePixels = this.detectEdges(data, width, height);

    // Seitenverhältnis
    const aspectRatio = width / height;
    const isDocumentRatio = (aspectRatio > 0.7 && aspectRatio < 1.5); // A4-ähnlich

    return {
      whiteBackgroundRatio: whitePixels / pixels,
      averageBrightness: totalBrightness / pixels,
      edgeDensity: edgePixels / pixels,
      aspectRatio: aspectRatio,
      isDocumentRatio: isDocumentRatio,
      width: width,
      height: height
    };
  }

  // Vereinfachte Kantenerkennung
  detectEdges(data, width, height) {
    let edgeCount = 0;
    const threshold = 30;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4;
        
        const current = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const right = (data[i + 4] + data[i + 5] + data[i + 6]) / 3;
        const bottom = (data[(y + 1) * width * 4 + x * 4] + 
                       data[(y + 1) * width * 4 + x * 4 + 1] + 
                       data[(y + 1) * width * 4 + x * 4 + 2]) / 3;
        
        if (Math.abs(current - right) > threshold || Math.abs(current - bottom) > threshold) {
          edgeCount++;
        }
      }
    }

    return edgeCount;
  }

  // Dokument-Score berechnen
  calculateDocumentScore(features) {
    let score = 0;

    // Weißer Hintergrund (Dokumente haben meist viel Weiß)
    if (features.whiteBackgroundRatio > 0.6) {
      score += this.documentFeatures.whiteBackground * (features.whiteBackgroundRatio - 0.6) * 2.5;
    }

    // Rechteckige Formen / Kantendichte
    if (features.edgeDensity > 0.1) {
      score += this.documentFeatures.edgeContrast * Math.min(features.edgeDensity * 10, 1);
    }

    // Dokument-typisches Seitenverhältnis
    if (features.isDocumentRatio) {
      score += this.documentFeatures.aspectRatio;
    }

    // Durchschnittliche Helligkeit (Dokumente sind oft heller)
    if (features.averageBrightness > 200) {
      score += this.documentFeatures.textDensity * 0.3;
    }

    return Math.min(score, 1.0);
  }

  // Objekt-Erkennung (zunächst simuliert, später durch echte AI)
  async detectObject(file) {
    // Simuliere Objekt-Erkennung basierend auf Dateinamen und Features
    const filename = file.name.toLowerCase();
    
    // Einfache Keyword-basierte Erkennung als Fallback
    const objectKeywords = {
      'fahrrad': { label: 'Fahrrad', confidence: 0.85, category: 'vehicle' },
      'bike': { label: 'Fahrrad', confidence: 0.85, category: 'vehicle' },
      'auto': { label: 'Auto', confidence: 0.80, category: 'vehicle' },
      'car': { label: 'Auto', confidence: 0.80, category: 'vehicle' },
      'stuhl': { label: 'Stuhl', confidence: 0.75, category: 'furniture' },
      'chair': { label: 'Stuhl', confidence: 0.75, category: 'furniture' },
      'tisch': { label: 'Tisch', confidence: 0.75, category: 'furniture' },
      'table': { label: 'Tisch', confidence: 0.75, category: 'furniture' },
      'hund': { label: 'Hund', confidence: 0.90, category: 'animal' },
      'dog': { label: 'Hund', confidence: 0.90, category: 'animal' },
      'katze': { label: 'Katze', confidence: 0.90, category: 'animal' },
      'cat': { label: 'Katze', confidence: 0.90, category: 'animal' },
      'gebäude': { label: 'Gebäude', confidence: 0.70, category: 'building' },
      'building': { label: 'Gebäude', confidence: 0.70, category: 'building' },
      'landschaft': { label: 'Landschaft', confidence: 0.65, category: 'nature' },
      'landscape': { label: 'Landschaft', confidence: 0.65, category: 'nature' }
    };

    // Prüfe Dateinamen auf Keywords
    for (const [keyword, data] of Object.entries(objectKeywords)) {
      if (filename.includes(keyword)) {
        return data;
      }
    }

    // Fallback für unbekannte Objekte
    return {
      label: 'Objekt',
      confidence: 0.60,
      category: 'unknown'
    };
  }

  // Text-Override: Wenn OCR viel Text findet, trotzdem als Dokument behandeln
  shouldOverrideWithText(ocrResult, textThreshold = 200) {
    if (!ocrResult || !ocrResult.text) return false;
    
    const cleanText = ocrResult.text.replace(/\s+/g, ' ').trim();
    return cleanText.length >= textThreshold;
  }
}

export const imageClassifier = new ImageClassifier();