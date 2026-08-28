'use client';

import React, { useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { AppLayout } from '@/components/AppLayout';
import { 
  Wallet, 
  Plus, 
  Pencil, 
  Trash2, 
  X,
  AlertCircle
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Conta } from '@/types/finance';

const schema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  descricao: z.string().min(5, 'Descrição deve ter pelo menos 5 caracteres'),
  isReceita: z.boolean().default(false),
});

type FormData = z.infer<typeof schema>;

export default function ContasPage() {
  const { contas, lancamentos, addAccount, updateAccount, deleteAccount } = useFinance();
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
    resolver: zodResolver(schema),
    defaultValues: {
      isReceita: false
    }
  });

  const onSubmit = async (data: FormData) => {
    try {
      if (editingId) {
        await updateAccount(editingId, data);
        toast.success('Conta atualizada com sucesso!');
      } else {
        await addAccount(data);
        toast.success('Conta cadastrada com sucesso!');
      }
      handleCloseModal();
    } catch (error: any) {
      console.error('Erro ao salvar conta:', error);
      let message = 'Erro ao salvar conta. Verifique sua conexão e permissões.';
      try {
        const errObj = JSON.parse(error.message);
        if (errObj.error.includes('permission-denied')) {
          message = 'Acesso negado. Verifique se você está logado corretamente.';
        }
      } catch (e) {}
      toast.error(message);
    }
  };

  const handleEdit = (conta: Conta) => {
    setEditingId(conta.id);
    setValue('nome', conta.nome);
    setValue('descricao', conta.descricao);
    setValue('isReceita', conta.isReceita || false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    reset();
  };

  const handleDelete = async (id: string) => {
    
    // Check if account is linked to any lancamento
    const linkedLancamentos = lancamentos.filter(l => l.contaId === id);
    const isLinked = linkedLancamentos.length > 0;
    
    if (isLinked) {
      toast.error('Não é possível excluir: existem lançamentos vinculados.', {
        description: `Esta conta está vinculada a ${linkedLancamentos.length} lançamentos. Remova-os primeiro.`
      });
      return;
    }

    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      await deleteAccount(deleteConfirmId);
      toast.success('Conta excluída com sucesso!');
    } catch (error: any) {
      console.error('Erro ao excluir conta:', error);
      toast.error('Erro ao excluir', {
        description: error.message || 'Verifique sua conexão e permissões.'
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
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Contas</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Gerencie suas contas e saldos</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/10 active:scale-95"
          >
            <Plus size={16} />
            Nova Conta
          </button>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#ebf0f5]/50 border-b border-slate-200">
                  <th className="px-4 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">Conta</th>
                  <th className="px-4 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">Descrição</th>
                  <th className="px-4 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Receita?</th>
                  <th className="w-20 px-4 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {contas.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Wallet size={32} className="opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma conta cadastrada</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  contas.map((conta) => (
                    <tr key={conta.id} className="hover:bg-[#ebf0f5]/50 transition-colors group">
                      <td className="px-4 py-0.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
                            <Wallet size={14} />
                          </div>
                          <span className="text-sm font-black text-slate-700 tracking-tight">{conta.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-0.5">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">{conta.descricao}</span>
                      </td>
                      <td className="px-4 py-0.5 text-center">
                        <div className="flex justify-center">
                          {conta.isReceita ? (
                            <div className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest">Sim</div>
                          ) : (
                            <div className="bg-[#ebf0f5] text-slate-400 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest">Não</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-0.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(conta)}
                            className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(conta.id)}
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
                    {editingId ? 'Editar Conta' : 'Nova Conta'}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="p-2 hover:bg-[#ebf0f5] rounded-xl transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Nome da Conta
                    </label>
                    <input
                      {...register('nome')}
                      type="text"
                      placeholder="Ex: Nubank, Itaú, Carteira"
                      className="w-full bg-[#ebf0f5] border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl px-5 py-4 transition-all outline-none font-medium"
                    />
                    {errors.nome && (
                      <p className="mt-2 text-rose-500 text-xs font-bold flex items-center gap-1">
                        <AlertCircle size={12} />
                        {errors.nome.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Descrição
                    </label>
                    <textarea
                      {...register('descricao')}
                      rows={3}
                      placeholder="Breve descrição da conta..."
                      className="w-full bg-[#ebf0f5] border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl px-5 py-4 transition-all outline-none font-medium resize-none"
                    />
                    {errors.descricao && (
                      <p className="mt-2 text-rose-500 text-xs font-bold flex items-center gap-1">
                        <AlertCircle size={12} />
                        {errors.descricao.message}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 bg-[#ebf0f5] p-4 rounded-2xl cursor-pointer hover:bg-[#ebf0f5] transition-colors" onClick={() => setValue('isReceita', !watch('isReceita'))}>
                    <div className={`w-12 h-6 rounded-full transition-all relative ${watch('isReceita') ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${watch('isReceita') ? 'left-7' : 'left-1'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">Flag Receita</p>
                      <p className="text-[10px] text-slate-500 font-medium">Contas marcadas serão exibidas no campo RECEITA do dashboard</p>
                    </div>
                    <input type="hidden" {...register('isReceita')} />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Plus size={20} />
                        {editingId ? 'Salvar Alterações' : 'Cadastrar Conta'}
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
                <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Excluir Conta?</h3>
                <p className="text-slate-500 text-sm font-medium mb-8">
                  Esta ação não pode ser desfeita. Tem certeza que deseja remover esta conta?
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
