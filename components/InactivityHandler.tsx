'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from './FirebaseProvider';
import { toast } from 'sonner';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const INACTIVITY_LIMIT = 60 * 1000; // 1 minuto
const WARNING_THRESHOLD = 15 * 1000; // Aviso faltando 15 segundos
const CHECK_INTERVAL = 1000; // Verificar a cada segundo
const STORAGE_KEY = 'finance_pro_last_activity_v3';

export function InactivityHandler() {
  const { user } = useAuth();
  
  const userRef = useRef(user);
  const isProcessingLogout = useRef(false);
  const warningShown = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Sincronizar usuário
  useEffect(() => {
    userRef.current = user;
    if (user) {
      console.log('InactivityHandler: Usuário monitorado:', user.email);
      isProcessingLogout.current = false;
      warningShown.current = false;
    }
  }, [user]);

  const updateActivity = useCallback(() => {
    if (userRef.current && !isProcessingLogout.current) {
      try {
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
      } catch (e) {
        // Silenciar erros de storage em iframes restritos
      }
    }
  }, []);

  useEffect(() => {
    if (!user) {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      return;
    }

    // Inicialização
    updateActivity();

    const checkInactivity = async () => {
      if (!userRef.current || isProcessingLogout.current) return;

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

      // Log informativo a cada 10s no console (F12)
      if (Math.floor(diff / 1000) % 10 === 0 && diff > 0) {
        console.log(`[Monitor] Inativo há ${Math.floor(diff / 1000)}s de 60s`);
      }

      // Aviso visual
      if (diff >= (INACTIVITY_LIMIT - WARNING_THRESHOLD) && diff < INACTIVITY_LIMIT) {
        if (!warningShown.current) {
          warningShown.current = true;
          toast.warning('Sessão expirando', {
            id: 'inactivity-warning',
            description: 'Sua sessão será encerrada em 15 segundos por inatividade.',
            duration: 10000,
          });
        }
      }

      // Logout se passar de 1 minuto
      if (diff >= INACTIVITY_LIMIT) {
        isProcessingLogout.current = true;
        console.warn('!!! Limite de inatividade atingido. Executando logout...');
        
        try {
          toast.dismiss('inactivity-warning');
          await signOut(auth);
          try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
          
          toast.error('Sessão encerrada', {
            description: 'Você foi desconectado por segurança.',
            duration: Infinity,
          });

          // Redirecionamento forçado após pequeno delay para o usuário ver o toast
          setTimeout(() => {
            window.location.href = '/';
          }, 1500);

        } catch (error) {
          console.error('Erro no logout automático:', error);
          isProcessingLogout.current = false;
        }
      }
    };

    const intervalId = setInterval(checkInactivity, CHECK_INTERVAL);

    // Filtro de movimento de mouse para ignorar trepidações de extensões
    const handleMouseMove = (e: MouseEvent) => {
      const dist = Math.abs(e.clientX - lastMousePos.current.x) + Math.abs(e.clientY - lastMousePos.current.y);
      if (dist > 50) { // Exige um movimento real de 50 pixels
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        updateActivity();
      }
    };

    const handleIntentionalActivity = () => updateActivity();

    // Eventos de monitoramento
    window.addEventListener('mousemove', handleMouseMove, { capture: true, passive: true });
    window.addEventListener('mousedown', handleIntentionalActivity, { capture: true, passive: true });
    window.addEventListener('keydown', handleIntentionalActivity, { capture: true, passive: true });
    window.addEventListener('scroll', handleIntentionalActivity, { capture: true, passive: true });
    window.addEventListener('touchstart', handleIntentionalActivity, { capture: true, passive: true });
    window.addEventListener('click', handleIntentionalActivity, { capture: true, passive: true });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab focada: verificando inatividade imediatamente...');
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
  }, [user, updateActivity]);

  return null;
}
