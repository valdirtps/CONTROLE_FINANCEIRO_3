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
  AlertCircle
} from 'lucide-react';
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
