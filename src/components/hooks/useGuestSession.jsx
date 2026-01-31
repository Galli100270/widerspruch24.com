import { useState, useEffect, useCallback } from 'react';
import { GuestSession } from '@/entities/GuestSession';
import { User } from '@/entities/User';

// Simple token generation (in real app use crypto.randomBytes)
const generateGuestToken = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const hashToken = (token) => {
  // Simple hash for demo - in production use proper crypto
  return btoa(token).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
};

export const useGuestSession = (language = 'de') => {
  const [guestSession, setGuestSession] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [guestExpired, setGuestExpired] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const setGuestTokenHeader = async (token) => {
    if (!token) return;
    // ensure the platform picks up the guest token for RLS (if available)
    if (typeof window !== 'undefined' && window.app && typeof window.app.setGuestToken === 'function') {
      try { window.app.setGuestToken(token); } catch (e) {
        console.warn('Failed to set guest token on window.app:', e);
      }
    }
  };

  const initializeGuestSession = useCallback(async () => {
    setIsLoading(true);
    
    // 1) Logged-in user? -> keine Gast-Session notwendig
    try {
      const user = await User.me();
      if (user && user.id) { // Ensure user and user.id exist
        setIsGuest(false);
        setIsLoading(false);
        return;
      }
    } catch (_) {
      // not logged in -> continue as guest
    }

    try {
      // 2) vorhandenes Token laden/erzeugen
      let guestToken = localStorage.getItem('w24_guest') || generateGuestToken();
      await setGuestTokenHeader(guestToken);
      localStorage.setItem('w24_guest', guestToken); // Ensure the token is stored immediately

      const tokenHash = hashToken(guestToken);

      // 3) bestehende Session vom Server versuchen (kann 403 liefern)
      let session = null;
      try {
        const sessions = await GuestSession.filter({ token_hash: tokenHash });
        session = sessions?.[0] || null; // Safely get the first session or null
      } catch (e) {
        // Kein Zugriff/RLS -> komplett lokal weiterarbeiten (session remains null)
        console.warn('Failed to retrieve guest session from server, proceeding locally:', e);
        session = null; // Explicitly set to null if filter fails, to trigger local fallback
      }

      const now = new Date();

      // 4) Wenn Server-Session existiert, vorsichtig aktualisieren
      if (session) {
        // ends_at robust parsen
        let endsAt;
        try {
          endsAt = session.ends_at ? new Date(session.ends_at) : new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
          if (isNaN(endsAt.getTime())) throw new Error('Invalid ends_at');
        } catch (parseError) {
          console.warn('Invalid session.ends_at date from server, defaulting to 30 days:', session.ends_at, parseError);
          endsAt = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
          // Nur updaten, wenn id existiert (es ist eine Server-Session)
          if (session.id) {
            try { await GuestSession.update(session.id, { ends_at: endsAt.toISOString() }); } catch (updateError) {
              console.error('Failed to update guest session ends_at on server:', updateError);
            }
          }
          session.ends_at = endsAt.toISOString(); // Update the local session object for immediate use
        }

        if (now > endsAt) {
          // Session expired
          if (session.id) {
            try { await GuestSession.update(session.id, { status: 'expired' }); } catch (updateError) {
              console.error('Failed to update guest session status to expired on server:', updateError);
            }
          }
          session.status = 'expired'; // Update the local session object
          setGuestExpired(true);
          setDaysLeft(0);
        } else {
          // Session active, update last seen
          if (session.id) {
            try { await GuestSession.update(session.id, { last_seen_at: now.toISOString() }); } catch (updateError) {
              console.error('Failed to update guest session last_seen_at on server:', updateError);
            }
          }
          const diffTime = endsAt.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setDaysLeft(diffDays);
          setGuestExpired(false);
        }

        setGuestSession(session);
        setIsGuest(true);
        setIsLoading(false);
        return; // Server session handled, exit early
      }

      // 5) Keine Server-Session gefunden -> versuche, eine Server-Session anzulegen (damit RLS auf Case greift)
      const expiresAt = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 Tage
      try {
        const created = await GuestSession.create({
          token_hash: tokenHash,
          locale: language,
          started_at: now.toISOString(),
          ends_at: expiresAt.toISOString(),
          last_seen_at: now.toISOString(),
          status: 'active',
        });
        if (created && created.id) {
          setGuestSession(created);
          setIsGuest(true);
          setGuestExpired(false);
          const diffDays = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          setDaysLeft(diffDays);
          setIsLoading(false);
          return; // Erfolgreich auf Server erstellt – fertig
        }
      } catch (createErr) {
        console.warn('Server GuestSession.create failed, falling back to local session:', createErr);
      }

      // 5b) Fallback: Lokale Session (ohne Server-ID) – nur falls Create nicht mglich
      const localSession = {
        id: null, // Kennzeichnet lokale Session (kein Server-Record) – nur Fallback
        token_hash: tokenHash,
        locale: language,
        started_at: now.toISOString(),
        ends_at: expiresAt.toISOString(),
        last_seen_at: now.toISOString(),
        status: 'active',
        free_exports_used: 0
      };

      setGuestSession(localSession);
      setIsGuest(true);
      setGuestExpired(false);
      setDaysLeft(30);
    } catch (error) {
      console.error('Error initializing guest session (general catch, falling back to local):', error);
      // In case of any unexpected error, still try to set a basic local session
      const fallbackGuestToken = localStorage.getItem('w24_guest') || generateGuestToken();
      localStorage.setItem('w24_guest', fallbackGuestToken);
      const fallbackTokenHash = hashToken(fallbackGuestToken);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
      setGuestSession({
        id: null,
        token_hash: fallbackTokenHash,
        locale: language,
        started_at: now.toISOString(),
        ends_at: expiresAt.toISOString(),
        last_seen_at: now.toISOString(),
        status: 'active',
        free_exports_used: 0
      });
      setIsGuest(true);
      setGuestExpired(false);
      setDaysLeft(30);
    } finally {
      setIsLoading(false);
    }
  }, [language]);

  useEffect(() => {
    initializeGuestSession();
  }, [initializeGuestSession]);

  const claimGuestSession = async () => {
    if (!guestSession) return;
    try {
      const token = localStorage.getItem('w24_guest');
      await setGuestTokenHeader(token);
      // Only attempt to update the server if it's a server-backed session (i.e., has an ID)
      if (guestSession.id) {
        try { await GuestSession.update(guestSession.id, { status: 'claimed' }); } catch (updateError) {
          console.error('Failed to update guest session status to claimed on server:', updateError);
        }
      }
      localStorage.removeItem('w24_guest');
      setIsGuest(false);
      setGuestSession(null);
    } catch (error) {
      console.error('Error claiming guest session:', error);
    }
  };

  return {
    guestSession,
    isGuest,
    guestExpired,
    daysLeft,
    isLoading,
    claimGuestSession
  };
};