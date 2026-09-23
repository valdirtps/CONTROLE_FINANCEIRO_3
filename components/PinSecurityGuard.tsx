'use client';

import React, { useState, useEffect } from 'react';
import { usePinSecurity } from '@/context/PinSecurityContext';
import { useAuth } from '@/components/FirebaseProvider';
import { 
  KeyRound, 
  ShieldCheck, 
  Lock, 
  Delete, 
  AlertCircle, 
  LogOut,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function PinSecurityGuard({ children }: { children: React.ReactNode }) {
  const { 
    isLocked, 
    isPinEnabled, 
    hasPin, 
    isCheckingPin,
    unlockWithPin, 
    registerPin 
  } = usePinSecurity();
  const { user, logout } = useAuth();

  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Setup mode states (when user hasn't registered a PIN yet)
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Reset states when lock status changes
  useEffect(() => {
    if (isLocked) {
      setPin('');
      setErrorMsg(null);
      setNewPin('');
      setConfirmPin('');
    }
  }, [isLocked]);

  const verifyPinDirectly = React.useCallback(async (pinToTest: string) => {
    if (isVerifying) return;
    setIsVerifying(true);
    setErrorMsg(null);

    try {
      const success = await unlockWithPin(pinToTest);
      if (!success) {
        setErrorMsg('PIN incorreto. Tente novamente.');
        setPin('');
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate?.([80, 50, 80]);
        }
      }
    } catch (e: any) {
      setErrorMsg('Erro ao verificar PIN.');
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  }, [isVerifying, unlockWithPin]);

  const handleDigitPress = React.useCallback((digit: string) => {
    setPin((prev) => {
      if (prev.length >= 6) return prev;
      const nextPin = prev + digit;
      setErrorMsg(null);
      if (nextPin.length === 4) {
        verifyPinDirectly(nextPin);
      }
      return nextPin;
    });
  }, [verifyPinDirectly]);

  const handleDelete = React.useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  }, []);

  const handleClear = React.useCallback(() => {
    setPin('');
    setErrorMsg(null);
  }, []);

  const handleSubmitPin = React.useCallback(() => {
    if (pin.length >= 4) {
      verifyPinDirectly(pin);
    } else {
      setErrorMsg('Digite um PIN com pelo menos 4 números.');
    }
  }, [pin, verifyPinDirectly]);

  // Handle keyboard inputs on desktop
  useEffect(() => {
    if (!isLocked || !isPinEnabled || !user) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!hasPin) return; // Allow normal form filling during initial setup
      if (/^[0-9]$/.test(e.key)) {
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Enter') {
        handleSubmitPin();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, isPinEnabled, user, hasPin, handleDigitPress, handleDelete, handleSubmitPin]);

  // Setup form submission
  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPin.length < 4) {
      setErrorMsg('O PIN deve ter no mínimo 4 dígitos.');
      return;
    }

    if (newPin !== confirmPin) {
      setErrorMsg('A confirmação do PIN não confere.');
      setConfirmPin('');
      return;
    }

    await registerPin(newPin);
  };

  // If user is not logged in or session is unlocked -> render content
  if (!user || !isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 10 }}
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl text-center text-white"
      >
        {/* Top security tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-wider text-emerald-400 mb-6">
          <ShieldCheck size={13} className="text-emerald-400" />
          PIN Obrigatório a Cada Acesso
        </div>

        {/* Lock Icon */}
        <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
          <KeyRound size={28} />
        </div>

        {isCheckingPin ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <Loader2 size={28} className="animate-spin text-emerald-400" />
            <p className="text-xs text-slate-400 font-medium">Verificando credenciais de acesso...</p>
          </div>
        ) : hasPin ? (
          /* Normal Unlock Mode (when PIN is registered) */
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white mb-1">
              Digite seu PIN
            </h2>
            <p className="text-xs text-slate-400 font-medium mb-6">
              Obrigatório informar o PIN para liberar o sistema financeiro
            </p>

            {/* Masked PIN Indicators (dots) */}
            <div className="flex justify-center items-center gap-4 mb-6">
              {[0, 1, 2, 3].map((index) => {
                const filled = pin.length > index;
                return (
                  <div
                    key={index}
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${
                      filled
                        ? 'bg-emerald-400 scale-125 shadow-lg shadow-emerald-400/50'
                        : 'bg-slate-700 border border-slate-600'
                    }`}
                  />
                );
              })}
              {pin.length > 4 && (
                <div className="text-xs font-bold text-emerald-400">+{pin.length - 4}</div>
              )}
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-2.5 rounded-xl text-xs font-medium mb-4 flex items-center justify-center gap-2"
                >
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Numeric Keypad (Banking-style) */}
            <div className="grid grid-cols-3 gap-3 mb-5 max-w-[260px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigitPress(digit)}
                  className="w-16 h-16 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xl font-black text-white active:scale-90 transition-all flex items-center justify-center shadow-md mx-auto"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="w-16 h-16 rounded-2xl bg-slate-800/50 hover:bg-slate-800 text-xs font-bold text-slate-400 active:scale-90 transition-all flex items-center justify-center mx-auto"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => handleDigitPress('0')}
                className="w-16 h-16 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xl font-black text-white active:scale-90 transition-all flex items-center justify-center shadow-md mx-auto"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="w-16 h-16 rounded-2xl bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-rose-400 active:scale-90 transition-all flex items-center justify-center mx-auto"
                title="Apagar"
              >
                <Delete size={20} />
              </button>
            </div>

            {/* Manual confirm if needed */}
            {pin.length >= 4 && (
              <button
                type="button"
                onClick={handleSubmitPin}
                disabled={isVerifying}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all mb-2 active:scale-95 flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <span>Confirmar PIN</span>
                )}
              </button>
            )}
          </div>
        ) : (
          /* First-time Setup Mode (when no PIN exists yet) */
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white mb-1">
              Cadastrar PIN
            </h2>
            <p className="text-xs text-slate-400 font-medium mb-5">
              Para proteger o sistema, defina seu PIN numérico (4 a 6 dígitos). Ele será exigido a cada acesso.
            </p>

            <form onSubmit={handleSetupSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Novo PIN (4 a 6 números)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="••••"
                  required
                  autoFocus
                  className="w-full text-center tracking-[0.5em] text-2xl font-black py-3 px-4 bg-slate-800 border border-slate-700 rounded-2xl text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Confirmar PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="••••"
                  required
                  className="w-full text-center tracking-[0.5em] text-2xl font-black py-3 px-4 bg-slate-800 border border-slate-700 rounded-2xl text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              {errorMsg && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-2.5 rounded-xl text-xs font-medium flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                Salvar PIN e Acessar Sistema
              </button>
            </form>
          </div>
        )}

        {/* Footer Logout */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-slate-500 text-xs">
          <span className="text-[11px] text-slate-400">FinancePro Segurança</span>
          <button
            onClick={() => logout()}
            className="hover:text-rose-400 flex items-center gap-1 transition-colors text-[11px] font-bold"
          >
            <LogOut size={13} />
            Sair da Conta
          </button>
        </div>
      </motion.div>
    </div>
  );
}
