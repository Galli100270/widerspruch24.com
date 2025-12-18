
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageCircle, Send, CheckCircle, Info, ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { SendEmail } from '@/integrations/Core';

export default function Feedback({ t }) {
  // Hooks müssen immer an erster Stelle und bedingungslos aufgerufen werden.
  const [formData, setFormData] = useState({
    email: '',
    category: 'general',
    message: '',
    includeTechInfo: false,
    includeUrl: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Erst NACH den Hooks kann eine bedingte Rückgabe erfolgen.
  if (!t) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      let emailBody = `
Feedback-Kategorie: ${t(`feedback.category.${formData.category}`)}
=====================================
Nachricht:
${formData.message}
=====================================
`;

      if (formData.email) {
        emailBody += `\nAntwort-E-Mail: ${formData.email}\n`;
      }

      if (formData.includeTechInfo) {
        emailBody += `\n--- Technische Daten (vom Nutzer freigegeben) ---\n`;
        emailBody += `Browser: ${navigator.userAgent}\n`;
        emailBody += `Sprache: ${navigator.language}\n`;
      }

      if (formData.includeUrl) {
        emailBody += `Aktuelle Seite: ${window.location.href}\n`;
      }

      await SendEmail({
        to: 'info@best-preis.net',
        subject: `[W24-Feedback] ${t(`feedback.category.${formData.category}`)}: Neues Feedback`,
        body: emailBody,
        from_name: 'Widerspruch24 Feedback-System'
      });
      
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      setError(t('feedback.submitError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen px-4 py-16 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <Card className="glass border-white/20 text-center">
            <CardContent className="pt-12 pb-8">
              <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-4">{t('feedback.thanksTitle')}</h1>
              <p className="text-white/80 mb-6">{t('feedback.thanksMessage')}</p>
              <div className="flex gap-3 justify-center">
                <Link to={createPageUrl('Home')}>
                  <Button className="glass text-white border-white/30 hover:glow transition-all duration-300">
                    {t('feedback.backToHome')}
                  </Button>
                </Link>
                <Button 
                  onClick={() => {
                    setSubmitted(false);
                    setError('');
                    setFormData({
                      email: '',
                      category: 'general', 
                      message: '',
                      includeTechInfo: false,
                      includeUrl: false
                    });
                  }}
                  variant="outline"
                  className="glass border-white/30 text-white hover:bg-white/10"
                >
                  {t('feedback.sendMore')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl('BetaDetails')}>
            <Button variant="ghost" className="glass rounded-xl text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">{t('feedback.title')}</h1>
            <p className="text-white/80">{t('feedback.subtitle')}</p>
          </div>
        </div>

        <Card className="glass border-white/20">
          <CardHeader className="text-center">
            <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-blue-400" />
            </div>
            <CardTitle className="text-white text-2xl">{t('feedback.formTitle')}</CardTitle>
            <p className="text-white/80">{t('feedback.formSubtitle')}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
               {error && (
                <Alert variant="destructive" className="glass bg-red-900/50 border-red-500/50">
                    <AlertDescription className="text-white">{error}</AlertDescription>
                </Alert>
               )}
              <div>
                <Label htmlFor="email" className="text-white mb-2 block">
                  {t('feedback.emailLabel')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="glass border-white/30 text-white placeholder-white/60"
                  placeholder={t('feedback.emailPlaceholder')}
                />
                <p className="text-white/60 text-xs mt-1">
                  {t('feedback.emailHint')}
                </p>
              </div>

              <div>
                <Label htmlFor="category" className="text-white mb-2 block">{t('feedback.categoryLabel')}</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="glass border-white/30 text-white bg-transparent w-full p-3 rounded-lg appearance-none"
                  style={{ background: 'url("data:image/svg+xml,...") no-repeat right 0.75rem center/8px 10px' }}
                >
                  <option value="general">{t('feedback.category.general')}</option>
                  <option value="bug">{t('feedback.category.bug')}</option>
                  <option value="feature">{t('feedback.category.feature')}</option>
                  <option value="ui">{t('feedback.category.ui')}</option>
                  <option value="performance">{t('feedback.category.performance')}</option>
                </select>
              </div>

              <div>
                <Label htmlFor="message" className="text-white mb-2 block">
                  {t('feedback.messageLabel')}
                </Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  className="glass border-white/30 text-white placeholder-white/60"
                  placeholder={t('feedback.messagePlaceholder')}
                  rows={6}
                  required
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="includeTechInfo"
                    checked={formData.includeTechInfo}
                    onCheckedChange={(checked) => setFormData({...formData, includeTechInfo: !!checked})}
                    className="border-white/30 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 mt-1"
                  />
                  <div>
                    <Label htmlFor="includeTechInfo" className="text-white text-sm font-normal cursor-pointer">
                      {t('feedback.techInfoLabel')}
                    </Label>
                    <p className="text-white/60 text-xs">
                      {t('feedback.techInfoHint')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="includeUrl"
                    checked={formData.includeUrl}
                    onCheckedChange={(checked) => setFormData({...formData, includeUrl: !!checked})}
                    className="border-white/30 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 mt-1"
                  />
                  <div>
                    <Label htmlFor="includeUrl" className="text-white text-sm font-normal cursor-pointer">
                      {t('feedback.urlLabel')}
                    </Label>
                    <p className="text-white/60 text-xs">
                      {t('feedback.urlHint')}
                    </p>
                  </div>
                </div>
              </div>

              <Alert className="glass border-blue-500/50">
                <Info className="w-4 h-4 text-blue-400" />
                <AlertDescription className="text-white/80 text-sm">
                  <strong>{t('feedback.privacyTitle')}</strong> {t('feedback.privacyMessage')}
                </AlertDescription>
              </Alert>

              <Button
                type="submit"
                disabled={isSubmitting || !formData.message.trim()}
                className="glass text-white border-white/30 hover:glow transition-all duration-300 w-full py-3"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('feedback.submitting')}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {t('feedback.submitButton')}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
