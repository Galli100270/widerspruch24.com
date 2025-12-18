
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Building } from 'lucide-react';
import { User as UserEntity } from '@/entities/User';

export default function PartiesForm({ t, parties, onUpdate, onNext, onBack }) {
  const [formData, setFormData] = useState({
    sender: {
      name: '',
      strasse: '',
      plz: '',
      ort: '',
      email: '',
      tel: ''
    },
    recipient: {
      name: '',
      strasse: '',
      plz: '',
      ort: '',
      email: ''
    }
  });

  const [errors, setErrors] = useState({});

  // Auto-fill sender data from user profile
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = await UserEntity.me();
        if (user?.full_name) {
          setFormData(prev => ({
            ...prev,
            sender: {
              ...prev.sender,
              name: user.full_name,
              email: user.email || ''
            }
          }));
        }
      } catch (error) {
        // User not logged in - use guest mode
      }
    };

    loadUserData();
  }, []);

  // Initialize with existing data
  useEffect(() => {
    if (parties) {
      setFormData(parties);
    }
  }, [parties]);

  const validateField = (section, field, value) => {
    const fieldKey = `${section}.${field}`;
    let error = null;

    switch (field) {
      case 'name':
      case 'strasse':
      case 'ort':
        if (!value.trim()) {
          error = t('common.fieldRequired');
        }
        break;
      case 'plz':
        if (!value.trim()) {
          error = t('common.zipRequired');
        } else if (!/^\d{5}$/.test(value.trim())) {
          error = t('common.zipInvalid');
        }
        break;
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = t('common.emailInvalid');
        }
        break;
      case 'tel':
        if (value && !/^[\d\s\-\+\(\)]+$/.test(value)) {
          error = t('common.phoneInvalid');
        }
        break;
    }

    setErrors(prev => ({
      ...prev,
      [fieldKey]: error
    }));

    return !error;
  };

  const handleChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));

    validateField(section, field, value);
    onUpdate({
      ...formData,
      [section]: {
        ...formData[section],
        [field]: value
      }
    });
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {};

    // Required fields validation
    const requiredFields = {
      sender: ['name', 'strasse', 'plz', 'ort'],
      recipient: ['name', 'strasse', 'plz', 'ort']
    };

    for (const [section, fields] of Object.entries(requiredFields)) {
      for (const field of fields) {
        if (!formData[section][field]?.trim()) {
          newErrors[`${section}.${field}`] = t('common.fieldRequired');
          isValid = false;
        }
      }
    }

    // Email validation
    if (formData.sender.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.sender.email)) {
      newErrors['sender.email'] = t('common.emailInvalid');
      isValid = false;
    }

    if (formData.recipient.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.recipient.email)) {
      newErrors['recipient.email'] = t('common.emailInvalid');
      isValid = false;
    }

    // PLZ validation
    if (formData.sender.plz && !/^\d{5}$/.test(formData.sender.plz)) {
      newErrors['sender.plz'] = t('common.zipInvalid');
      isValid = false;
    }

    if (formData.recipient.plz && !/^\d{5}$/.test(formData.recipient.plz)) {
      newErrors['recipient.plz'] = t('common.zipInvalid');
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onNext();
    }
  };

  const renderPersonForm = (section, titleKey, icon, isRequired = true) => {
    const Icon = icon;
    const person = formData[section];

    return (
      <Card className="glass border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Icon className="w-5 h-5" />
            {t(titleKey)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor={`${section}-name`} className="text-white">
              {t('letter.labelName')} {isRequired && '*'}
            </Label>
            <Input
              id={`${section}-name`}
              value={person.name}
              onChange={(e) => handleChange(section, 'name', e.target.value)}
              onBlur={(e) => validateField(section, 'name', e.target.value)}
              className="glass border-white/30 text-white placeholder-white/60"
              placeholder={t('letter.placeholderName')}
              dir="auto"
            />
            {errors[`${section}.name`] && (
              <p className="text-red-400 text-sm mt-1">{errors[`${section}.name`]}</p>
            )}
          </div>

          <div>
            <Label htmlFor={`${section}-strasse`} className="text-white">
              {t('letter.labelStreet')} {isRequired && '*'}
            </Label>
            <Input
              id={`${section}-strasse`}
              value={person.strasse}
              onChange={(e) => handleChange(section, 'strasse', e.target.value)}
              onBlur={(e) => validateField(section, 'strasse', e.target.value)}
              className="glass border-white/30 text-white placeholder-white/60"
              placeholder={t('letter.placeholderStreet')}
              dir="auto"
            />
            {errors[`${section}.strasse`] && (
              <p className="text-red-400 text-sm mt-1">{errors[`${section}.strasse`]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`${section}-plz`} className="text-white">
                {t('letter.labelZip')} {isRequired && '*'}
              </Label>
              <Input
                id={`${section}-plz`}
                value={person.plz}
                onChange={(e) => handleChange(section, 'plz', e.target.value)}
                onBlur={(e) => validateField(section, 'plz', e.target.value)}
                className="glass border-white/30 text-white placeholder-white/60 text-left"
                placeholder={t('letter.placeholderZip')}
                maxLength={5}
                inputMode="numeric"
              />
              {errors[`${section}.plz`] && (
                <p className="text-red-400 text-sm mt-1">{errors[`${section}.plz`]}</p>
              )}
            </div>
            <div>
              <Label htmlFor={`${section}-ort`} className="text-white">
                {t('letter.labelCity')} {isRequired && '*'}
              </Label>
              <Input
                id={`${section}-ort`}
                value={person.ort}
                onChange={(e) => handleChange(section, 'ort', e.target.value)}
                onBlur={(e) => validateField(section, 'ort', e.target.value)}
                className="glass border-white/30 text-white placeholder-white/60"
                placeholder={t('letter.placeholderCity')}
                dir="auto"
              />
              {errors[`${section}.ort`] && (
                <p className="text-red-400 text-sm mt-1">{errors[`${section}.ort`]}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor={`${section}-email`} className="text-white">
              {section === 'sender' ? t('letter.labelEmail') + ' ( ' + (t('letter.labelEmail') || 'E-Mail') + ' )' : t('letter.labelEmailOptional')}
            </Label>
            <Input
              id={`${section}-email`}
              type="email"
              value={person.email}
              onChange={(e) => handleChange(section, 'email', e.target.value)}
              onBlur={(e) => validateField(section, 'email', e.target.value)}
              className="glass border-white/30 text-white placeholder-white/60"
              placeholder={t('letter.placeholderEmail')}
              dir="auto"
            />
            {errors[`${section}.email`] && (
              <p className="text-red-400 text-sm mt-1">{errors[`${section}.email`]}</p>
            )}
          </div>

          {section === 'sender' && (
            <div>
              <Label htmlFor="sender-tel" className="text-white">
                {t('letter.labelPhoneOptional')}
              </Label>
              <Input
                id="sender-tel"
                value={person.tel}
                onChange={(e) => handleChange('sender', 'tel', e.target.value)}
                onBlur={(e) => validateField('sender', 'tel', e.target.value)}
                className="glass border-white/30 text-white placeholder-white/60"
                placeholder={t('letter.placeholderPhone')}
                dir="auto"
              />
              {errors['sender.tel'] && (
                <p className="text-red-400 text-sm mt-1">{errors['sender.tel']}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">{t('letter.partiesTitle')}</h2>
        <p className="text-white/80">{t('letter.partiesSubtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {renderPersonForm('recipient', 'letter.recipientTitle', Building)}
          {renderPersonForm('sender', 'letter.senderTitle', User)}
        </div>

        <div className="flex justify-between">
          <Button
            type="button"
            onClick={onBack}
            variant="outline"
            className="glass border-white/30 text-white hover:bg-white/10"
          >
            {t('common.back')}
          </Button>
          <Button
            type="submit"
            className="glass text-white border-white/30 hover:glow transition-all duration-300"
          >
            {t('letter.nextToDetails')}
          </Button>
        </div>
      </form>
    </div>
  );
}
