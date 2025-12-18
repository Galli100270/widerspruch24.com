
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, Mail, MessageSquare, AlertTriangle, Shield } from 'lucide-react';
import { User } from '@/entities/User';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function DeadlineNotificationForm({ 
  t, 
  letterData, 
  onUpdate, 
  onNext, 
  onBack 
}) {
  const [formData, setFormData] = useState({
    deadline: null,
    notifyEnabled: true,
    daysBefore: 2,
    channels: { email: true, whatsapp: false },
    recipients: {
      customer: { email: '', consent: false },
      opponent: { email: '', whatsapp: '', consent: false }
    },
    quietHours: { start: '21:00', end: '08:00' }
  });

  const [currentUser, setCurrentUser] = useState(null);
  const [errors, setErrors] = useState({});
  const [showConsentWarning, setShowConsentWarning] = useState(false);
  const [whatsappAvailable, setWhatsappAvailable] = useState(false);

  // Check WhatsApp availability
  useEffect(() => {
    // For now, assume WhatsApp is not available until backend confirms
    // In a real implementation, you could check via an API endpoint or a global config variable
    // For local development, if you need to test it, you might toggle this to true:
    // setWhatsappAvailable(true); 
    setWhatsappAvailable(false); 
  }, []);

  // Load user data and initialize form
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
        setFormData(prev => ({
          ...prev,
          recipients: {
            ...prev.recipients,
            customer: {
              ...prev.recipients.customer,
              email: user.email || ''
            }
          }
        }));
      } catch (error) {
        // Guest user - will need email input
      }
    };

    // Initialize deadline based on facts
    const defaultDeadline = letterData.facts?.frist_tage 
      ? addDays(new Date(), letterData.facts.frist_tage)
      : addDays(new Date(), 14);
    
    setFormData(prev => ({
      ...prev,
      deadline: defaultDeadline
    }));

    // Pre-fill opponent email if available
    if (letterData.parties?.recipient?.email) {
      setFormData(prev => ({
        ...prev,
        recipients: {
          ...prev.recipients,
          opponent: {
            ...prev.recipients.opponent,
            email: letterData.parties.recipient.email
          }
        }
      }));
    }

    loadUser();
  }, [letterData]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateWhatsApp = (number) => {
    // E.164 format validation
    const whatsappRegex = /^\+[1-9]\d{1,14}$/;
    return whatsappRegex.test(number);
  };

  const handleDeadlineChange = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) {
      setErrors(prev => ({ ...prev, deadline: t('deadline.pastDateError') }));
      return;
    }

    const weekFromNow = addDays(today, 7);
    if (date < weekFromNow) {
      setErrors(prev => ({ ...prev, deadline: t('deadline.tooSoonWarning') }));
    } else {
      setErrors(prev => ({ ...prev, deadline: null }));
    }

    setFormData(prev => ({ ...prev, deadline: date }));
  };

  const handleChannelChange = (channel, enabled) => {
    setFormData(prev => ({
      ...prev,
      channels: { ...prev.channels, [channel]: enabled }
    }));
  };

  const handleRecipientChange = (type, field, value) => {
    setFormData(prev => ({
      ...prev,
      recipients: {
        ...prev.recipients,
        [type]: { ...prev.recipients[type], [field]: value }
      }
    }));

    // Clear validation errors
    setErrors(prev => ({ ...prev, [`${type}_${field}`]: null }));
  };

  const handleConsentChange = (type, consented) => {
    setFormData(prev => ({
      ...prev,
      recipients: {
        ...prev.recipients,
        [type]: { ...prev.recipients[type], consent: consented }
      }
    }));

    if (type === 'opponent') {
      setShowConsentWarning(!consented);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.deadline) {
      newErrors.deadline = t('deadline.required');
    }

    if (formData.notifyEnabled) {
      // Customer email validation (required if reminders enabled)
      if (!currentUser && !formData.recipients.customer.email) {
        newErrors.customer_email = t('deadline.customerEmailRequired');
      } else if (formData.recipients.customer.email && !validateEmail(formData.recipients.customer.email)) {
        newErrors.customer_email = t('deadline.invalidEmail');
      }

      // Opponent validation (only if fields are filled)
      const { opponent } = formData.recipients;
      if (opponent.email && !validateEmail(opponent.email)) {
        newErrors.opponent_email = t('deadline.invalidEmail');
      }
      if (opponent.whatsapp && !validateWhatsApp(opponent.whatsapp)) {
        newErrors.opponent_whatsapp = t('deadline.invalidWhatsApp');
      }

      // Consent validation for opponent notifications
      const hasOpponentContact = opponent.email || opponent.whatsapp;
      const opponentChannelsEnabled = 
        (formData.channels.email && opponent.email) || 
        (formData.channels.whatsapp && opponent.whatsapp);

      if (hasOpponentContact && opponentChannelsEnabled && !opponent.consent) {
        newErrors.opponent_consent = t('deadline.consentRequired');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Update letter data with deadline and notification preferences
      const updateData = {
        deadline: formData.deadline.toISOString().split('T')[0],
        notify_pref: {
          ...formData,
          recipients: {
            ...formData.recipients,
            customer: {
              ...formData.recipients.customer,
              consent_at: formData.notifyEnabled ? new Date().toISOString() : null
            },
            opponent: {
              ...formData.recipients.opponent,
              consent_at: formData.recipients.opponent.consent ? new Date().toISOString() : null
            }
          }
        }
      };
      
      onUpdate(updateData);
      onNext();
    }
  };

  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const minDate = new Date();
  const recommendedMinDate = addDays(new Date(), 7);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Frist & Erinnerungen</h2>
        <p className="text-white/80">Wann läuft die Frist ab und wer soll erinnert werden?</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Deadline Selection */}
        <Card className="glass border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Fristdatum festlegen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-white mb-2 block">
                Bis wann muss gehandelt werden? *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="glass border-white/30 text-white justify-start w-full">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.deadline ? format(formData.deadline, 'PPP', { locale: de }) : 'Datum auswählen'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 glass border-white/20">
                  <Calendar
                    mode="single"
                    selected={formData.deadline}
                    onSelect={handleDeadlineChange}
                    disabled={(date) => date < minDate}
                    modifiers={{
                      weekend: isWeekend,
                      soon: (date) => date >= minDate && date < recommendedMinDate
                    }}
                    modifiersStyles={{
                      weekend: { color: '#fbbf24' },
                      soon: { backgroundColor: '#fef3c7' }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.deadline && (
                <p className="text-red-400 text-sm mt-1">{errors.deadline}</p>
              )}
              <p className="text-white/60 text-sm mt-2">
                💡 Empfohlen: Mindestens 7 Tage in der Zukunft
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="glass border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Erinnerungen konfigurieren
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable Reminders */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notify-enabled" className="text-white font-medium">
                  Fristerinnerung aktivieren
                </Label>
                <p className="text-white/60 text-sm">Automatische Benachrichtigung vor Fristablauf</p>
              </div>
              <Switch
                id="notify-enabled"
                checked={formData.notifyEnabled}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notifyEnabled: checked }))}
              />
            </div>

            {formData.notifyEnabled && (
              <>
                {/* Days Before */}
                <div>
                  <Label className="text-white mb-2 block">Wie viele Tage vorher erinnern?</Label>
                  <Select 
                    value={formData.daysBefore.toString()} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, daysBefore: parseInt(value) }))}
                  >
                    <SelectTrigger className="glass border-white/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass border-white/20 text-white">
                      <SelectItem value="1">1 Tag vorher</SelectItem>
                      <SelectItem value="2">2 Tage vorher (empfohlen)</SelectItem>
                      <SelectItem value="3">3 Tage vorher</SelectItem>
                      <SelectItem value="7">1 Woche vorher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Channels */}
                <div>
                  <Label className="text-white mb-3 block">Erinnerungskanäle</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="channel-email"
                        checked={formData.channels.email}
                        onCheckedChange={(checked) => handleChannelChange('email', checked)}
                      />
                      <Label htmlFor="channel-email" className="text-white flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        E-Mail-Benachrichtigung
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="channel-whatsapp"
                        checked={formData.channels.whatsapp}
                        onCheckedChange={(checked) => handleChannelChange('whatsapp', checked)}
                        disabled={!whatsappAvailable}
                      />
                      <Label htmlFor="channel-whatsapp" className="text-white flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        WhatsApp-Benachrichtigung
                        {!whatsappAvailable && (
                          <span className="text-white/50 text-sm">(nicht verfügbar)</span>
                        )}
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Recipients */}
                <div className="space-y-4">
                  <h4 className="text-white font-medium">Benachrichtigungsempfänger</h4>
                  
                  {/* Customer (Self) */}
                  <div className="space-y-3">
                    <Label className="text-white text-sm">An mich selbst</Label>
                    {!currentUser && (
                      <div>
                        <Input
                          type="email"
                          placeholder="ihre.email@beispiel.de"
                          value={formData.recipients.customer.email}
                          onChange={(e) => handleRecipientChange('customer', 'email', e.target.value)}
                          className="glass border-white/30 text-white placeholder-white/60"
                        />
                        {errors.customer_email && (
                          <p className="text-red-400 text-sm mt-1">{errors.customer_email}</p>
                        )}
                      </div>
                    )}
                    {currentUser && (
                      <p className="text-white/80 text-sm">✓ {currentUser.email}</p>
                    )}
                  </div>

                  {/* Opponent */}
                  <div className="space-y-3">
                    <Label className="text-white text-sm">An Gegenseite (optional)</Label>
                    <div className="space-y-2">
                      <Input
                        type="email"
                        placeholder="gegenseite@beispiel.de"
                        value={formData.recipients.opponent.email}
                        onChange={(e) => handleRecipientChange('opponent', 'email', e.target.value)}
                        className="glass border-white/30 text-white placeholder-white/60"
                      />
                      {errors.opponent_email && (
                        <p className="text-red-400 text-sm">{errors.opponent_email}</p>
                      )}
                      
                      <Input
                        type="tel"
                        placeholder="+491701234567"
                        value={formData.recipients.opponent.whatsapp}
                        onChange={(e) => handleRecipientChange('opponent', 'whatsapp', e.target.value)}
                        className="glass border-white/30 text-white placeholder-white/60"
                      />
                      {errors.opponent_whatsapp && (
                        <p className="text-red-400 text-sm">{errors.opponent_whatsapp}</p>
                      )}
                      
                      {(formData.recipients.opponent.email || formData.recipients.opponent.whatsapp) && (
                        <div className="mt-3">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id="opponent-consent"
                              checked={formData.recipients.opponent.consent}
                              onCheckedChange={(checked) => handleConsentChange('opponent', checked)}
                            />
                            <Label htmlFor="opponent-consent" className="text-sm text-white/90 leading-relaxed">
                              <Shield className="w-4 h-4 inline mr-1 text-green-400" />
                              Ich bin berechtigt, diese Kontaktdaten für Fristerinnerungen zu verwenden und habe die Einwilligung der betroffenen Person eingeholt.
                            </Label>
                          </div>
                          {errors.opponent_consent && (
                            <p className="text-red-400 text-sm mt-1">{errors.opponent_consent}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* DSGVO Notice */}
                <Alert className="glass border-blue-500/50">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription className="text-white">
                    <strong>Datenschutzhinweis:</strong> Die Verarbeitung von Kontaktdaten erfolgt auf Grundlage 
                    des Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) bzw. lit. a DSGVO (Einwilligung bei Dritten). 
                    Details in unserer{' '}
                    <Link to={createPageUrl('Datenschutz')} className="underline hover:text-blue-300">
                      Datenschutzerklärung
                    </Link>.
                  </AlertDescription>
                </Alert>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            type="button"
            onClick={onBack}
            variant="outline"
            className="glass border-white/30 text-white hover:bg-white/10"
          >
            Zurück
          </Button>
          <Button
            type="submit"
            className="glass text-white border-white/30 hover:glow transition-all duration-300"
          >
            Weiter zur Vorschau
          </Button>
        </div>
      </form>
    </div>
  );
}
