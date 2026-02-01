import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, X, Plus } from 'lucide-react';
// SmartScanner entfernt (Clean Rebuild)
import { Badge } from '@/components/ui/badge';

export default function AdditionalDocuments({ t, caseData, onDocumentsAdded, existingDocuments = [] }) {
  const [showScanner, setShowScanner] = useState(false);
  const [documents, setDocuments] = useState(existingDocuments);

  const handleScanSuccess = (data) => {
    const newDocuments = data.document_urls || [];
    const updatedDocuments = [...documents, ...newDocuments];
    setDocuments(updatedDocuments);
    setShowScanner(false);
    onDocumentsAdded?.(updatedDocuments);
  };

  const handleScanError = (error) => {
    console.error('Document scan error:', error);
  };

  const removeDocument = (index) => {
    const updatedDocuments = documents.filter((_, i) => i !== index);
    setDocuments(updatedDocuments);
    onDocumentsAdded?.(updatedDocuments);
  };

  if (showScanner) {
    return (
      <Card className="glass rounded-3xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Upload className="w-5 h-5" />
              {t('additionalDocuments.title')}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowScanner(false)}
              className="text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Scanner wurde vorübergehend entfernt. Upload bitte über die neue Scanner-Seite durchführen. */}
          <div className="text-white/80">Der alte Scanner wurde deaktiviert. Bitte nutzen Sie die neue Scanner-Seite.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass rounded-3xl">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <FileText className="w-5 h-5" />
          {t('additionalDocuments.title')}
          {documents.length > 0 && (
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
              {documents.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length > 0 && (
          <div className="space-y-3 mb-6">
            {documents.map((doc, index) => (
              <div key={index} className="glass rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span className="text-white text-sm">
                    {t('additionalDocuments.document')} {index + 1}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeDocument(index)}
                  className="text-red-400 hover:bg-red-500/20"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button
          onClick={() => setShowScanner(true)}
          variant="outline"
          className="w-full glass border-white/30 text-white hover:bg-white/10 py-3"
        >
          <Plus className="w-4 h-4 mr-2" />
          {documents.length === 0 
            ? t('additionalDocuments.addFirst') 
            : t('additionalDocuments.addMore')
          }
        </Button>

        <div className="mt-4 text-white/60 text-sm">
          <p>{t('additionalDocuments.description')}</p>
        </div>
      </CardContent>
    </Card>
  );
}