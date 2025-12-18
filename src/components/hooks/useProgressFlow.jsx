import { useState, useCallback } from 'react';

const STEPS = [
  { key: 'uploading', weight: 10, icon: '📤' },
  { key: 'convert_heic', weight: 10, icon: '🔄' }, // NEU: HEIC-Konvertierung
  { key: 'ocr', weight: 25, icon: '👀' },
  { key: 'analyzing', weight: 20, icon: '🔍' },
  { key: 'drafting', weight: 20, icon: '✍️' },
  { key: 'refining', weight: 10, icon: '✨' },
  { key: 'rendering_pdf', weight: 8, icon: '📄' },
  { key: 'sending_email', weight: 2, icon: '📧' }
];

export const useProgressFlow = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const show = useCallback(() => {
    setIsVisible(true);
    setCurrentStep('idle');
    setProgress(0);
    setError(null);
    setRetryCount(0);
  }, []);

  const hide = useCallback(() => {
    setIsVisible(false);
    setCurrentStep('idle');
    setProgress(0);
    setError(null);
  }, []);

  const startStep = useCallback((stepKey) => {
    setCurrentStep(stepKey);
    setProgress(0);
    setError(null);
  }, []);

  const updateProgress = useCallback((newProgress, statusMessage) => {
    setProgress(Math.min(100, Math.max(0, newProgress)));
    // statusMessage kann für detailliertere Updates verwendet werden
  }, []);

  const completeStep = useCallback(() => {
    setProgress(100);
  }, []);

  const nextStep = useCallback(() => {
    const currentIndex = STEPS.findIndex(s => s.key === currentStep);
    if (currentIndex >= 0 && currentIndex < STEPS.length - 1) {
      const nextStepKey = STEPS[currentIndex + 1].key;
      setCurrentStep(nextStepKey);
      setProgress(0);
    } else {
      setCurrentStep('done');
      setProgress(100);
    }
  }, [currentStep]);

  const setStepError = useCallback((errorMessage) => {
    setError(errorMessage);
    setRetryCount(prev => prev + 1);
  }, []);

  const cancel = useCallback(() => {
    setIsVisible(false);
    setCurrentStep('idle');
    setProgress(0);
    setError(null);
  }, []);

  return {
    isVisible,
    currentStep,
    progress,
    error,
    retryCount,
    show,
    hide,
    startStep,
    updateProgress,
    completeStep,
    nextStep,
    setStepError,
    cancel
  };
};