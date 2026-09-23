'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from './FirebaseProvider';
import { usePinSecurity } from '@/context/PinSecurityContext';
import { toast } from 'sonner';

const INACTIVITY_LIMIT = 60 * 1000; // 1 minuto de inatividade
const WARNING_THRESHOLD = 15 * 1000; // Aviso faltando 15 segundos
const CHECK_INTERVAL = 1000; // Checagem a cada segundo
const STORAGE_KEY = 'finance_pro_last_activity_v3';

export function InactivityHandler() {
  const { user } = useAuth();
  const { lockSession, isLocked } = usePinSecurity();
  
  const userRef = useRef(user);
  const isLockedRef = useRef(isLocked);
  const isProcessingLock = useRef(false);
  const warningShown = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Sincronizar referências
  useEffect(() => {
    userRef.current = user;
    if (user) {
      isProcessingLock.current = false;
      warningShown.current = false;
    }
  }, [user]);

  useEffect(() => {
    isLockedRef.current = isLocked;
    if (isLocked) {
      // Já está bloqueado, não precisa de aviso
      warningShown.current = false;
      toast.dismiss('inactivity-warning');
    }
  }, [isLocked]);

  const updateActivity = useCallback(() => {
    if (userRef.current && !isProcessingLock.current) {
      try {
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
      } catch (e) {
        // Silenciar erros de storage
      }
    }
  }, []);

  useEffect(() => {
    if (!user) {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      return;
    }

    // Inicialização da contagem
    updateActivity();

    const checkInactivity = () => {
      if (!userRef.current || isProcessingLock.current || isLockedRef.current) return;

      let lastActivityStr = null;
      try {
        lastActivityStr = localStorage.getItem(STORAGE_KEY);
      } catch (e) {}

      if (!lastActivityStr) {
        updateActivity();
        return;
      }

      const lastActivity = parseInt(lastActivityStr, 10);
      const now = Date.now();
      const diff = now - lastActivity;

      // Aviso visual faltando 15 segundos (apenas se a tela não estiver bloqueada)
      if (diff >= (INACTIVITY_LIMIT - WARNING_THRESHOLD) && diff < INACTIVITY_LIMIT) {
        if (!warningShown.current) {
          warningShown.current = true;
          toast.warning('Bloqueio por inatividade', {
            id: 'inactivity-warning',
            description: 'O sistema será bloqueado em 15 segundos para proteger seus dados.',
            duration: 10000,
          });
        }
      }

      // Bloqueia e volta à tela de entrada ao passar do limite
      if (diff >= INACTIVITY_LIMIT) {
        isProcessingLock.current = true;
        toast.dismiss('inactivity-warning');
        
        try {
          updateActivity();
          // Trava a sessão e exibe a tela de PIN imediatamente
          lockSession();
        } catch (e) {
          console.error('Erro ao bloquear sessão por inatividade:', e);
        } finally {
          setTimeout(() => {
            isProcessingLock.current = false;
          }, 1000);
        }
      }
    };

    const intervalId = setInterval(checkInactivity, CHECK_INTERVAL);

    // Filtro de movimento de mouse para ignorar trepidações
    const handleMouseMove = (e: MouseEvent) => {
      const dist = Math.abs(e.clientX - lastMousePos.current.x) + Math.abs(e.clientY - lastMousePos.current.y);
      if (dist > 50) {
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        updateActivity();
      }
    };

    const handleIntentionalActivity = () => updateActivity();

    // Eventos de monitoramento de atividade do usuário
    window.addEventListener('mousemove', handleMouseMove, { capture: true, passive: true });
    window.addEventListener('mousedown', handleIntentionalActivity, { capture: true, passive: true });
    window.addEventListener('keydown', handleIntentionalActivity, { capture: true, passive: true });
    window.addEventListener('scroll', handleIntentionalActivity, { capture: true, passive: true });
    window.addEventListener('touchstart', handleIntentionalActivity, { capture: true, passive: true });
    window.addEventListener('click', handleIntentionalActivity, { capture: true, passive: true });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('mousemove', handleMouseMove, true);
      window.removeEventListener('mousedown', handleIntentionalActivity, true);
      window.removeEventListener('keydown', handleIntentionalActivity, true);
      window.removeEventListener('scroll', handleIntentionalActivity, true);
      window.removeEventListener('touchstart', handleIntentionalActivity, true);
      window.removeEventListener('click', handleIntentionalActivity, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, updateActivity, lockSession]);

  return null;
}
