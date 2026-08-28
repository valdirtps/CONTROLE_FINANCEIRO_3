'use client';

import React, { useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { AppLayout } from '@/components/AppLayout';
import { 
  Tag, 
  Plus, 
  Trash2, 
  Pencil,
  X,
  AlertCircle,
  ArrowUpCircle,
  ArrowDownCircle
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { TipoLancamento } from '@/types/finance';

const schema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  flagMatematica: z.enum(['+', '-'], {
    errorMap: () => ({ message: 'Selecione se é Receita (+) ou Despesa (-)' })
  }),
  dv: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export default function TiposPage() {
  const { tipos, lancamentos, addType, updateType, deleteType } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoLancamento | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      flagMatematica: '-',
      dv: false
    }
  });

  const selectedFlag = watch('flagMatematica');

  const onSubmit = async (data: FormData) => {
    try {
      if (editingTipo) {
        await updateType(editingTipo.id, data);
        toast.success('Tipo de lançamento atualizado!');
      } else {
        await addType(data);
        toast.success('Tipo de lançamento cadastrado!');
      }
      handleCloseModal();
    } catch (error) {
      toast.error(editingTipo ? 'Erro ao atualizar tipo' : 'Erro ao cadastrar tipo');
    }
  };

  const handleEdit = (tipo: TipoLancamento) => {
    setEditingTipo(tipo);
    setValue('nome', tipo.nome);
    setValue('flagMatematica', tipo.flagMatematica as '+' | '-');
    setValue('dv', tipo.dv || false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTipo(null);
    reset({
      nome: '',
      flagMatematica: '-',
      dv: false
    });
  };

  const handleDelete = async (id: string) => {
    // Check if type is linked to any lancamento
    const linkedLancamentos = lancamentos.filter(l => l.tipoLancamentoId === id);
    const isLinked = linkedLancamentos.length > 0;
    
    if (isLinked) {
      toast.error('Não é possível excluir: existem lançamentos vinculados.', {
        description: `Esta categoria está vinculada a ${linkedLancamentos.length} lançamentos. Remova-os primeiro.`
      });
      return;
    }

    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      await deleteType(deleteConfirmId);
      toast.success('Categoria excluída!');
    } catch (error: any) {
      console.error('Erro ao excluir categoria:', error);
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
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Categorias</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Tipos de lançamentos financeiros</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/10 active:scale-95"
          >
            <Plus size={16} />
            Nova Categoria
          </button>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#ebf0f5]/50 border-b border-slate-200">
                  <th className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-wider">Tipo</th>
                  <th className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-wider">Nome da Categoria</th>
                  <th className="w-20 px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tipos.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Tag size={32} className="opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma categoria cadastrada</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tipos.map((tipo) => (
                    <tr key={tipo.id} className="hover:bg-[#ebf0f5]/50 transition-colors group">
                      <td className="px-4 py-1">
                        {tipo.flagMatematica === '+' ? (
                          <div className="flex items-center gap-1.5 text-emerald-500 font-black text-[10px] uppercase tracking-tighter">
                            <ArrowUpCircle size={14} />
                            <span>Receita</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-rose-500 font-black text-[10px] uppercase tracking-tighter">
                            <ArrowDownCircle size={14} />
                            <span>Despesa</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-700 tracking-tight">{tipo.nome}</span>
                          {tipo.dv && (
                            <span className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 rounded">
                              DV
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-1">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(tipo)}
                            className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(tipo.id)}
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

        {/* Modal de Cadastro */}
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
                className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-8 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tighter">
                    {editingTipo ? 'Editar Categoria' : 'Nova Categoria'}
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
                    <label className="block text-sm font-bold text-slate-700 mb-2">Nome da Categoria</label>
                    <input
                      {...register('nome')}
                      type="text"
                      placeholder="Ex: Alimentação, Lazer..."
                      className="w-full bg-[#ebf0f5] border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl px-5 py-4 transition-all outline-none font-medium"
                    />
                    {errors.nome && <p className="mt-2 text-rose-500 text-xs font-bold">{errors.nome.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3">Tipo</label>
                    <div className="grid grid-cols-2 gap-4">
                      <label className={`
                        flex items-center justify-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all
                        ${selectedFlag === '-' ? 'border-rose-500 bg-rose-50 text-rose-600' : 'border-transparent bg-[#ebf0f5] text-slate-500'}
                      `}>
                        <input {...register('flagMatematica')} type="radio" value="-" className="hidden" />
                        <ArrowDownCircle size={20} />
                        <span className="font-bold uppercase text-xs tracking-widest">Despesa</span>
                      </label>
                      <label className={`
                        flex items-center justify-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all
                        ${selectedFlag === '+' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-transparent bg-[#ebf0f5] text-slate-500'}
                      `}>
                        <input {...register('flagMatematica')} type="radio" value="+" className="hidden" />
                        <ArrowUpCircle size={20} />
                        <span className="font-bold uppercase text-xs tracking-widest">Receita</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[#ebf0f5] rounded-2xl border-2 border-transparent hover:border-slate-200 transition-all">
                    <div className="pr-4">
                      <label className="block text-sm font-black text-slate-800 uppercase tracking-tight">Vincular ao Devedor (DV)</label>
                      <span className="text-[10px] text-slate-500 font-medium block leading-tight mt-0.5">O crédito/débito ficará para o devedor conforme o parcelamento</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input 
                        {...register('dv')} 
                        type="checkbox" 
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
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
                        {editingTipo ? <Pencil size={20} /> : <Plus size={20} />}
                        {editingTipo ? 'Salvar Alterações' : 'Cadastrar Categoria'}
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
                <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Excluir Categoria?</h3>
                <p className="text-slate-500 text-sm font-medium mb-8">
                  Esta ação não pode ser desfeita. Tem certeza que deseja remover esta categoria?
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
