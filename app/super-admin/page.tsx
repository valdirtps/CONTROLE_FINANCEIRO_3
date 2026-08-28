'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Users, Lock, ShieldCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';

export default function SuperAdminPage() {
  useEffect(() => {
    console.log('SuperAdminPage mounted');
  }, []);
  const [passcode, setPasscode] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === '12581') {
      setIsAuthorized(true);
      fetchUserCount();
    } else {
      setError('Senha incorreta');
      setPasscode('');
      setTimeout(() => setError(''), 3000);
    }
  };

  const fetchUserCount = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      setUserCount(querySnapshot.size);
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
      setError('Erro ao carregar dados do Firestore');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100/80 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-200/60"
        >
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-slate-900 rounded-2xl">
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <h1 className="text-2xl font-black text-slate-900 text-center mb-2">Acesso Restrito</h1>
          <p className="text-slate-500 text-center mb-8 font-medium">Digite a senha de administrador mestre</p>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Senha de acesso"
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-center text-xl tracking-widest font-black"
                autoFocus
              />
            </div>
            
            <AnimatePresence>
              {error && (
                <motion.p 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-red-500 text-sm font-bold text-center"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/20"
            >
              Verificar Acesso
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100 flex justify-center">
            <Link 
              href="/"
              className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-bold text-xs uppercase tracking-widest"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Início
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/80 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900">Estatísticas do Sistema</h1>
              <p className="text-slate-500 font-medium tracking-tight">Painel de Controle Mestre</p>
            </div>
          </div>
          
          <Link 
            href="/"
            className="flex items-center gap-2 px-6 py-3 bg-white text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:text-slate-900 hover:shadow-md transition-all border border-slate-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard Principal
          </Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="col-span-1 md:col-span-2 bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-200/60 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Total de Usuários</span>
              </div>
              
              {loading ? (
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin"></div>
                  <span className="text-slate-400 font-bold">Carregando dados...</span>
                </div>
              ) : (
                <div className="flex items-baseline gap-4">
                  <span className="text-8xl font-black text-slate-900 tracking-tighter">
                    {userCount ?? 0}
                  </span>
                  <span className="text-slate-400 font-bold text-lg italic">contas criadas</span>
                </div>
              )}
            </div>

            <div className="mt-12 p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-slate-500 text-sm font-medium leading-relaxed">
                Este número representa todos os administradores individuais que configuraram suas contas no Finance Pro. Cada usuário possui seu próprio ambiente isolado de lançamentos, devedores e contas.
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl shadow-slate-900/20 flex flex-col items-center justify-center text-center"
          >
            <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mb-6 backdrop-blur-xl">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-black mb-2">Ambiente Seguro</h3>
            <p className="text-slate-400 text-sm font-medium mb-8">
              Sessão de auditoria mestre protegida por criptografia de ponta.
            </p>
            <button
              onClick={() => setIsAuthorized(false)}
              className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
            >
              Sair da Sessão
            </button>
          </motion.div>
        </div>

        <footer className="mt-12 text-center">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
            Finance Pro System Analytics • v0.1.0
          </p>
        </footer>
      </div>
    </div>
  );
}
