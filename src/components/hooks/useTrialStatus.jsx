
import { useState, useEffect, useCallback } from 'react';
import { User } from '@/entities/User';

export const useTrialStatus = () => {
  const [trialStatus, setTrialStatus] = useState({
    isOnTrial: false,
    daysLeft: 0,
    trialEndsAt: null,
    decisionRequired: false,
    plan: null,
    isLoading: true
  });

  const calculateTrialStatus = useCallback((user) => {
    if (!user) return { 
      isOnTrial: false, 
      daysLeft: 0, 
      trialEndsAt: null, 
      decisionRequired: false, 
      plan: null, 
      isLoading: false 
    };

    try {
      // Mock-Logik für Trial-Status (in echter App aus Backend)
      const now = new Date();
      const trialStarted = user.trial_started_at || user.created_date;
      const trialLength = 30; // Tage

      if (!trialStarted) {
        // Neuer User, Trial noch nicht gestartet
        return { 
          isOnTrial: true, 
          daysLeft: trialLength, 
          trialEndsAt: null, 
          decisionRequired: false,
          plan: user.plan || null,
          isLoading: false 
        };
      }

      // Sichere Datums-Berechnung
      let trialStart;
      if (typeof trialStarted === 'string') {
        // The condition `trialStarted.includes('T')` is often used to distinguish between
        // 'YYYY-MM-DD' (local interpretation) and ISO 'YYYY-MM-DDTHH:mm:ss.sssZ' (UTC interpretation).
        // For robustness, new Date(string) generally handles both, but keeping the requested logic.
        trialStart = trialStarted.includes('T') ? new Date(trialStarted) : new Date(trialStarted);
      } else {
        trialStart = new Date(trialStarted);
      }
      
      // Validierung des Datums
      if (isNaN(trialStart.getTime())) {
        console.warn('Invalid trial start date:', trialStarted);
        // Fallback: Trial als aktiv betrachten
        return {
          isOnTrial: true,
          daysLeft: trialLength,
          trialEndsAt: null,
          decisionRequired: false,
          plan: user.plan || null,
          isLoading: false
        };
      }

      const trialEnd = new Date(trialStart);
      trialEnd.setDate(trialEnd.getDate() + trialLength);

      const isOnTrial = now < trialEnd;
      const daysLeft = isOnTrial 
        ? Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Entscheidung erforderlich, wenn Trial abgelaufen und kein Plan gewählt
      const decisionRequired = !isOnTrial && !user.plan;

      return {
        isOnTrial,
        daysLeft,
        trialEndsAt: trialEnd,
        decisionRequired,
        plan: user.plan || null,
        isLoading: false
      };
    } catch (error) {
      console.error('Error calculating trial status:', error);
      // Fehler-Fallback
      return {
        isOnTrial: true,
        daysLeft: 30, // Default to 30 days if an error occurs
        trialEndsAt: null,
        decisionRequired: false,
        plan: user.plan || null,
        isLoading: false
      };
    }
  }, []);

  const refreshTrialStatus = useCallback(async () => {
    try {
      const user = await User.me();
      const status = calculateTrialStatus(user);
      setTrialStatus(status);
      return status;
    } catch (error) {
      // User not logged in (e.g., 401 status from User.me()) is an expected state for guests,
      // not an application error that needs to be logged in the console for every guest visit.
      setTrialStatus({ 
        isOnTrial: false, 
        daysLeft: 0, 
        trialEndsAt: null, 
        decisionRequired: false,
        plan: null,
        isLoading: false 
      });
      return null;
    }
  }, [calculateTrialStatus]);

  const startTrial = useCallback(async () => {
    try {
      const user = await User.me();
      // In echter App: Backend-Call zum Trial-Start
      const updatedUser = await User.updateMyUserData({
        trial_started_at: new Date().toISOString()
      });
      const status = calculateTrialStatus(updatedUser);
      setTrialStatus(status);
      return status;
    } catch (error) {
      console.error('Failed to start trial:', error);
      return null;
    }
  }, [calculateTrialStatus]);

  const selectPlan = useCallback(async (planType) => {
    try {
      const user = await User.me();
      // In echter App: Backend-Call zur Plan-Auswahl
      const updatedUser = await User.updateMyUserData({
        plan: planType,
        // Assuming decision_required might be a flag that needs to be reset on plan selection
        decision_required: false 
      });
      const status = calculateTrialStatus(updatedUser);
      setTrialStatus(status);
      return status;
    } catch (error) {
      console.error('Failed to select plan:', error);
      return null;
    }
  }, [calculateTrialStatus]);

  useEffect(() => {
    refreshTrialStatus();
  }, [refreshTrialStatus]);

  return {
    ...trialStatus,
    refreshTrialStatus,
    startTrial,
    selectPlan
  };
};
