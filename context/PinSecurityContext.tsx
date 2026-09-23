'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/FirebaseProvider';
import { 
  saveSecurityPin, 
  verifySecurityPin, 
  hasSecurityPin, 
  syncPinFromCloud 
} from '@/lib/pin-security';
import { toast } from 'sonner';

interface PinSecurityContextType {
  isPinEnabled: boolean;
  hasPin: boolean;
  isLocked: boolean;
  isCheckingPin: boolean;
  unlockWithPin: (pin: string) => Promise<boolean>;
  registerPin: (pin: string) => Promise<boolean>;
  lockSession: () => void;
}

const PinSecurityContext = createContext<PinSecurityContextType | undefined>(undefined);

export function PinSecurityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  // Mandatory: PIN is always active for every access
  const isPinEnabled = true;
  
  // Always lock initially whenever a user accesses the application
  const [isLocked, setIsLocked] = useState(true);
  const [hasPin, setHasPin] = useState(false);
  const [isCheckingPin, setIsCheckingPin] = useState(true);
  const hiddenTimeRef = useRef<number | null>(null);

  // Sync PIN existence on user mount or change
  useEffect(() => {
    if (!user) {
      setIsLocked(false);
      setHasPin(false);
      setIsCheckingPin(false);
      return;
    }

    let isMounted = true;
    setIsCheckingPin(true);

    // Initial state on each new access is LOCKED
    setIsLocked(true);

    const localHas = hasSecurityPin(user.uid);
    setHasPin(localHas);

    // Also check cloud Firestore in background
    syncPinFromCloud(user.uid).then((exists) => {
      if (isMounted) {
        setHasPin(exists || localHas);
        setIsCheckingPin(false);
      }
    }).catch(() => {
      if (isMounted) {
        setIsCheckingPin(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Lock when user leaves the app (screen locked on mobile, switching tabs, or minimizing window)
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenTimeRef.current = Date.now();
      } else if (document.visibilityState === 'visible') {
        if (hiddenTimeRef.current) {
          const elapsed = Date.now() - hiddenTimeRef.current;
          // If user was away from the screen for more than 15 seconds, re-lock automatically
          if (elapsed > 15 * 1000) {
            setIsLocked(true);
          }
        }
        hiddenTimeRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const lockSession = useCallback(() => {
    if (!user) return;
    setIsLocked(true);
    toast.info('Acesso bloqueado. Digite seu PIN.');
  }, [user]);

  const unlockWithPin = useCallback(async (pin: string): Promise<boolean> => {
    if (!user) return false;
    const ok = await verifySecurityPin(user.uid, pin);
    if (ok) {
      setIsLocked(false);
      toast.success('PIN correto! Acesso liberado.');
      return true;
    }
    return false;
  }, [user]);

  const registerPin = useCallback(async (pin: string): Promise<boolean> => {
    if (!user) return false;
    await saveSecurityPin(user.uid, pin);
    setHasPin(true);
    setIsLocked(false);
    toast.success('PIN de segurança cadastrado com sucesso!');
    return true;
  }, [user]);

  return (
    <PinSecurityContext.Provider
      value={{
        isPinEnabled,
        hasPin,
        isLocked,
        isCheckingPin,
        unlockWithPin,
        registerPin,
        lockSession,
      }}
    >
      {children}
    </PinSecurityContext.Provider>
  );
}

export function usePinSecurity() {
  const context = useContext(PinSecurityContext);
  if (!context) {
    throw new Error('usePinSecurity must be used within a PinSecurityProvider');
  }
  return context;
}
