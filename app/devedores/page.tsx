'use client';

import React, { useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { AppLayout } from '@/components/AppLayout';
import { 
  Users, 
  Plus, 
  Pencil, 
  Trash2, 
  X,
  AlertCircle,
  Phone,
  Mail,
  FileText
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Devedor } from '@/types/finance';

const schema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  telefone: z.string().min(10, 'WhatsApp inválido'),
});

type FormData = z.infer<typeof schema>;

export default function DevedoresPage() {
  const { devedores, lancamentos, addDebtor, updateDebtor, deleteDebtor } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  const telefoneValue = watch('telefone');

  const maskPhone = (value: string) => {
    if (!value) return '';
    let v = value.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);

    if (v.length > 10) {
      v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    } else if (v.length > 6) {
      v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    } else if (v.length > 2) {
      v = v.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
    } else if (v.length > 0) {
      v = v.replace(/^(\d*)/, '($1');
    }
    return v;
  };

  const onTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const maskedValue = maskPhone(e.target.value);
    setValue('telefone', maskedValue);
  };

  const onSubmit = async (data: FormData) => {
    try {
      if (editingId) {
        await updateDebtor(editingId, data);
        toast.success('Devedor atualizado com sucesso!');
      } else {
        await addDebtor(data);
        toast.success('Devedor cadastrado com sucesso!');
      }
      handleCloseModal();
    } catch (error) {
      toast.error('Erro ao salvar devedor');
    }
  };

  const handleEdit = (devedor: Devedor) => {
    setEditingId(devedor.id);
    setValue('nome', devedor.nome);
    setValue('telefone', maskPhone(devedor.telefone));
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    reset();
  };

  const handleDelete = async (id: string) => {
    // Check if debtor is linked to any lancamento
    const linkedLancamentos = lancamentos.filter(l => l.devedorId === id);
    const isLinked = linkedLancamentos.length > 0;
    
    if (isLinked) {
      toast.error('Não é possível excluir: existem lançamentos vinculados.', {
        description: `Este devedor está vinculado a ${linkedLancamentos.length} lançamentos. Remova-os primeiro.`
      });
      return;
    }

    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      await deleteDebtor(deleteConfirmId);
      toast.success('Devedor excluído!');
    } catch (error: any) {
      console.error('Erro ao excluir devedor:', error);
      toast.error('Erro ao excluir', {
        description: error.message || 'Verifique sua conexão.'
      });
    } finally {
      setDeleteConfirmId(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Devedores</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Gerenciamento de pessoas com pendências</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/10 active:scale-95"
          >
            <Plus size={16} />
            Novo Devedor
          </button>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#ebf0f5]/50 border-b border-slate-200">
                  <th className="px-4 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">Devedor</th>
                  <th className="px-4 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">WhatsApp</th>
                  <th className="w-20 px-4 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {devedores.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Users size={32} className="opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhum devedor cadastrado</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  devedores.map((devedor) => (
                    <tr key={devedor.id} className="hover:bg-[#ebf0f5]/50 transition-colors group">
                      <td className="px-4 py-0.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center font-black text-[10px]">
                            {devedor.nome.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-black text-slate-700 tracking-tight">{devedor.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-0.5">
                        <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-tight">
                          <Phone size={12} className="text-emerald-500" />
                          {maskPhone(devedor.telefone)}
                        </div>
                      </td>
                      <td className="px-4 py-0.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(devedor)}
                            className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(devedor.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de Cadastro/Edição */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleCloseModal}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl p-8 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tighter">
                    {editingId ? 'Editar Devedor' : 'Novo Devedor'}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="p-2 hover:bg-[#ebf0f5] rounded-xl transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Nome Completo</label>
                      <input
                        {...register('nome')}
                        type="text"
                        placeholder="Ex: João Silva"
                        className="w-full bg-[#ebf0f5] border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl px-5 py-3.5 transition-all outline-none font-medium"
                      />
                      {errors.nome && <p className="mt-1 text-rose-500 text-xs font-bold">{errors.nome.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">WhatsApp</label>
                      <input
                        {...register('telefone', { onChange: onTelefoneChange })}
                        type="text"
                        placeholder="(00) 00000-0000"
                        className="w-full bg-[#ebf0f5] border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl px-5 py-3.5 transition-all outline-none font-medium"
                      />
                      {errors.telefone && <p className="mt-1 text-rose-500 text-xs font-bold">{errors.telefone.message}</p>}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2 mt-4"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Plus size={20} />
                        {editingId ? 'Salvar Alterações' : 'Cadastrar Devedor'}
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal de Confirmação de Exclusão */}
        <AnimatePresence>
          {deleteConfirmId && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDeleteConfirmId(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl p-8 text-center"
              >
                <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Trash2 size={40} />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Excluir Devedor?</h3>
                <p className="text-slate-500 text-sm font-medium mb-8">
                  Esta ação não pode ser desfeita. Tem certeza que deseja remover este devedor?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-[#ebf0f5] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-500/20 transition-all active:scale-95"
                  >
                    Confirmar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
