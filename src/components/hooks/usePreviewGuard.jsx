
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export const usePreviewGuard = (caseId, requiredProgress = 75) => { // Vereinheitlicht auf 75%
  const [canAccess, setCanAccess] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const isBetaFree = () => {
      try {
        let started = localStorage.getItem("w24_beta_started_at");
        if (!started) return true; // If not started, user is "beta free" (or hasn't activated beta)
        const diffDays = (Date.now() - Date.parse(started)) / (1000 * 60 * 60 * 24);
        return diffDays <= 30; // Beta period is 30 days
      } catch (e) {
        console.error("Error checking beta status:", e);
        return true; // Default to allowing access in case of error
      }
    };

    const checkAccess = () => {
      try {
        if (isBetaFree()) {
          setCanAccess(true);
          setIsChecking(false);
          return;
        }

        const scanState = sessionStorage.getItem(`scan_progress_${caseId}`);
        const progress = scanState ? JSON.parse(scanState).progress : 0;

        if (progress >= requiredProgress) {
          setCanAccess(true);
        } else {
          navigate(createPageUrl(`CaseDetails?case_id=${caseId}`));
          return;
        }
      } catch (error) {
        console.error('Preview guard error:', error);
        navigate(createPageUrl('Scanner'));
      } finally {
        setIsChecking(false);
      }
    };

    if (caseId) {
      checkAccess();
    } else {
      navigate(createPageUrl('Scanner'));
    }
  }, [caseId, requiredProgress, navigate]);

  return { canAccess, isChecking };
};
