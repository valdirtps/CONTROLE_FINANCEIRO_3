'use client';

import React, { useEffect, useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { AppLayout } from '@/components/AppLayout';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  Save,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { usePinSecurity } from '@/context/PinSecurityContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Administrador } from '@/types/finance';

const schema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  cpf: z.string().optional(),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function AdminPage() {
  const { admin, updateAdmin, loading } = useFinance();
  const { 
    hasPin, 
    registerPin, 
    lockSession 
  } = usePinSecurity();

  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [isSavingPin, setIsSavingPin] = useState(false);
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  useEffect(() => {
    if (admin) {
      reset(admin);
    }
  }, [admin, reset]);

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length < 4) {
      toast.error('O PIN deve ter no mínimo 4 dígitos.');
      return;
    }
    if (pinInput !== confirmPinInput) {
      toast.error('Os PINs digitados não coincidem.');
      return;
    }
    setIsSavingPin(true);
    try {
      await registerPin(pinInput);
      setPinInput('');
      setConfirmPinInput('');
    } finally {
      setIsSavingPin(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      await updateAdmin(data as Administrador);
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar perfil');
    }
  };

  if (loading) return null;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="mb-10">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
            <ShieldCheck className="text-emerald-500" size={32} />
            Perfil do Administrador
          </h1>
          <p className="text-slate-500 font-medium">Configure suas informações pessoais</p>
        </div>

        {/* Card de Segurança por PIN de Acesso */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <KeyRound size={28} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Segurança por PIN de Acesso
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                    Obrigatório em todo acesso
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Protege o acesso aos dados e menus financeiros solicitando seu PIN cadastrado a cada entrada no sistema.
                </p>
              </div>
            </div>
          </div>

          {/* Status info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#ebf0f5] flex items-center gap-3">
              <CheckCircle2 size={22} className={hasPin ? "text-emerald-500" : "text-amber-500"} />
              <div>
                <p className="text-xs font-black text-slate-900">Status do PIN</p>
                <p className="text-[11px] text-slate-500">
                  {hasPin ? 'PIN cadastrado e ativo para proteger as finanças.' : 'Nenhum PIN cadastrado. Crie um PIN abaixo.'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#ebf0f5] flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black text-slate-900">Bloquear Imediatamente</p>
                <p className="text-[11px] text-slate-500">
                  Trava a tela solicitando o PIN para liberar.
                </p>
              </div>
              <button
                type="button"
                onClick={lockSession}
                className="bg-slate-900 hover:bg-slate-800 text-white font-black py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
              >
                <Lock size={14} className="text-emerald-400" />
                Bloquear
              </button>
            </div>
          </div>

          {/* Formulário de Cadastro / Troca de PIN */}
          <div className="pt-4 border-t border-slate-100">
            <form onSubmit={handleSavePin} className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <KeyRound size={14} className="text-slate-400" />
                {hasPin ? 'Alterar PIN de Acesso (4 a 6 dígitos numéricos)' : 'Cadastrar Novo PIN de Acesso (4 a 6 dígitos)'}
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Novo PIN (••••)"
                  className="bg-[#ebf0f5] border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-xl px-4 py-3 transition-all outline-none font-black text-center tracking-widest text-sm"
                />
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value)}
                  placeholder="Confirmar PIN (••••)"
                  className="bg-[#ebf0f5] border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-xl px-4 py-3 transition-all outline-none font-black text-center tracking-widest text-sm"
                />
                <button
                  type="submit"
                  disabled={isSavingPin || !pinInput}
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 font-black py-3 px-5 rounded-xl text-xs tracking-wider uppercase transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Save size={16} />
                  {isSavingPin ? 'Salvando...' : 'Salvar PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nome */}
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <User size={16} className="text-slate-400" />
                  Nome Completo
                </label>
                <input
                  {...register('nome')}
                  type="text"
                  className="w-full bg-[#ebf0f5] border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl px-5 py-4 transition-all outline-none font-medium"
                />
                {errors.nome && <p className="mt-1 text-rose-500 text-xs font-bold">{errors.nome.message}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Mail size={16} className="text-slate-400" />
                  E-mail Principal
                </label>
                <input
                  {...register('email')}
                  type="email"
                  className="w-full bg-[#ebf0f5] border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl px-5 py-4 transition-all outline-none font-medium"
                />
                {errors.email && <p className="mt-1 text-rose-500 text-xs font-bold">{errors.email.message}</p>}
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Phone size={16} className="text-slate-400" />
                  Telefone
                </label>
                <input
                  {...register('telefone')}
                  type="text"
                  className="w-full bg-[#ebf0f5] border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl px-5 py-4 transition-all outline-none font-medium"
                />
              </div>

              {/* Endereço */}
              <div className="md:col-span-2 pt-4">
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <MapPin size={16} className="text-slate-400" />
                  Endereço Residencial
                </label>
                <input
                  {...register('endereco')}
                  type="text"
                  className="w-full bg-[#ebf0f5] border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl px-5 py-4 transition-all outline-none font-medium"
                />
              </div>

              {/* Cidade */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Cidade</label>
                <input
                  {...register('cidade')}
                  type="text"
                  className="w-full bg-[#ebf0f5] border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl px-5 py-4 transition-all outline-none font-medium"
                />
              </div>

              {/* Estado */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Estado (UF)</label>
                <input
                  {...register('estado')}
                  type="text"
                  maxLength={2}
                  className="w-full bg-[#ebf0f5] border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl px-5 py-4 transition-all outline-none font-medium"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-black py-6 rounded-[2rem] transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            {isSubmitting ? (
              <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save size={24} />
                Salvar Informações
              </>
            )}
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
