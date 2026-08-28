'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  PlusCircle, 
  X, 
  FileText, 
  Wallet, 
  Calendar, 
  Tag, 
  Users, 
  AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinance } from '@/context/FinanceContext';

const lancamentoSchema = z.object({
  referente: z.string().min(3, 'Referente deve ter pelo menos 3 caracteres'),
  valorTotal: z.coerce.number().min(0.01, 'Valor deve ser maior que zero'),
  numParcelas: z.coerce.number().min(1, 'Mínimo 1 parcela'),
  contaId: z.string().min(1, 'Selecione uma conta'),
  tipoLancamentoId: z.string().min(1, 'Selecione um tipo'),
  vencimentoInicial: z.string().min(1, 'Selecione o vencimento'),
  dataCompra: z.string().optional(),
  dividirConta: z.boolean().default(false),
  devedorId: z.string().optional(),
  valorDebitoDevedor: z.coerce.number().optional(),
});

type LancamentoFormValues = z.infer<typeof lancamentoSchema>;

interface NovoLancamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingId?: string | null;
}

export function NovoLancamentoModal({ isOpen, onClose, editingId }: NovoLancamentoModalProps) {
  const { 
    contas, 
    tipos, 
    devedores, 
    addLancamento,
    updateLancamento,
    lancamentos,
    parcelas
  } = useFinance();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting }
  } = useForm<LancamentoFormValues>({
    resolver: zodResolver(lancamentoSchema),
    defaultValues: {
      numParcelas: 1,
      dividirConta: false,
      vencimentoInicial: new Date().toISOString().split('T')[0]
    }
  });

  const selectedTipoId = watch('tipoLancamentoId');
  const selectedTipo = tipos.find(t => t.id === selectedTipoId);
  
  const normalize = (str: string) => str.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const isDV = selectedTipo?.dv === true;

  React.useEffect(() => {
    if (isDV) {
      setValue('dividirConta', true);
    }
  }, [isDV, setValue]);

  const devedorId = watch('devedorId');
  const valorTotal = watch('valorTotal') || 0;
  const numParcelas = watch('numParcelas') || 1;
  const dividirConta = watch('dividirConta');
  const valorDebitoDevedorInput = watch('valorDebitoDevedor') || 0;

  React.useEffect(() => {
    if (devedorId && devedorId !== 'none' && valorTotal > 0) {
      const currentVal = watch('valorDebitoDevedor');
      if (!currentVal || currentVal === 0) {
        setValue('valorDebitoDevedor', valorTotal);
      }
    }
  }, [devedorId, valorTotal, setValue, watch]);

  React.useEffect(() => {
    if (editingId && isOpen) {
      const lancamento = lancamentos.find(l => l.id === editingId);
      if (lancamento) {
        const installments = (parcelas || []).filter(p => p && p.lancamentoId === editingId);
        const firstVencimento = installments.length > 0 
          ? (installments.sort((a, b) => {
              const dateA = a.dataVencimento ? new Date(a.dataVencimento + 'T12:00:00').getTime() : 0;
              const dateB = b.dataVencimento ? new Date(b.dataVencimento + 'T12:00:00').getTime() : 0;
              return dateA - dateB;
            })[0]?.dataVencimento || lancamento.dataCompra || new Date().toISOString().split('T')[0])
          : (lancamento.dataCompra || new Date().toISOString().split('T')[0]);

        reset({
          referente: lancamento.referente,
          valorTotal: lancamento.valorTotal,
          numParcelas: lancamento.numParcelas,
          contaId: lancamento.contaId,
          tipoLancamentoId: lancamento.tipoLancamentoId,
          dataCompra: lancamento.dataCompra,
          vencimentoInicial: firstVencimento,
          dividirConta: lancamento.dividirConta,
          devedorId: lancamento.devedorId || '',
          valorDebitoDevedor: lancamento.valorDebitoDevedor || 0
        });
      }
    } else if (isOpen) {
      reset({
        referente: '',
        valorTotal: 0,
        numParcelas: 1,
        contaId: '',
        tipoLancamentoId: '',
        dataCompra: new Date().toISOString().split('T')[0],
        vencimentoInicial: new Date().toISOString().split('T')[0],
        dividirConta: false,
        devedorId: '',
        valorDebitoDevedor: 0
      });
    }
  }, [editingId, isOpen, reset, lancamentos, parcelas]);

  const valorParcela = valorTotal / numParcelas;
  let valorDevedor = 0;
  if (isDV) {
    valorDevedor = selectedTipo?.flagMatematica === '+' ? -valorParcela : valorParcela;
  } else if (dividirConta) {
    valorDevedor = valorDebitoDevedorInput > 0 ? (valorDebitoDevedorInput / numParcelas) : (valorParcela / 2);
  }
  const valorAdmin = isDV ? 0 : valorParcela - valorDevedor;

  const onSubmit = async (data: LancamentoFormValues) => {
    if (isDV && !data.devedorId) {
      alert(`Para a categoria ${selectedTipo?.nome || 'DV'}, é obrigatório selecionar um devedor.`);
      return;
    }
    try {
      const lancamentoData = {
        referente: data.referente,
        valorTotal: data.valorTotal,
        numParcelas: data.numParcelas,
        contaId: data.contaId,
        tipoLancamentoId: data.tipoLancamentoId,
        dataCompra: data.dataCompra || data.vencimentoInicial,
        dividirConta: data.dividirConta,
        devedorId: data.devedorId,
        valorDebitoDevedor: isDV ? data.valorTotal : data.valorDebitoDevedor
      };

      if (editingId) {
        await updateLancamento(editingId, lancamentoData, data.vencimentoInicial);
      } else {
        await addLancamento(lancamentoData, data.vencimentoInicial);
      }
      
      reset();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden max-h-[95vh] flex flex-col"
          >
            <div className="p-3 flex-shrink-0 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tighter flex items-center gap-2">
                    <PlusCircle className="text-emerald-500" size={18} />
                    {editingId ? 'Editar Lançamento' : 'Novo Lançamento'}
                  </h2>
                </div>
                <button 
                  onClick={onClose}
                  className="p-1.5 hover:bg-[#ebf0f5] rounded-full transition-colors text-slate-400"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-grow overflow-hidden">
              <div className="p-3 overflow-y-auto space-y-2 flex-grow scrollbar-hide">
                <div className="bg-[#ebf0f5]/50 p-3 rounded-[2rem] border border-slate-200 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Referente */}
                    <div className="col-span-2">
                      <label className="block text-[8px] font-black text-slate-400 mb-0.5 flex items-center gap-1 uppercase tracking-wider">
                        <FileText size={10} />
                        Referente
                      </label>
                      <input
                        {...register('referente')}
                        type="text"
                        placeholder="Ex: Aluguel, Supermercado..."
                        className="w-full bg-white border-2 border-transparent focus:border-emerald-500 rounded-xl px-2.5 py-1 transition-all outline-none font-bold text-xs shadow-sm"
                      />
                      {errors.referente && <p className="mt-0.5 text-rose-500 text-[8px] font-bold">{errors.referente.message}</p>}
                    </div>

                    {/* Valor Total */}
                    <div>
                      <label className="block text-[8px] font-black text-slate-400 mb-0.5 flex items-center gap-1 uppercase tracking-wider">
                        <Wallet size={10} />
                        Valor Total
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">R$</span>
                        <Controller
                          name="valorTotal"
                          control={control}
                          render={({ field }) => (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(field.value || 0)}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                const newValue = value ? parseInt(value, 10) / 100 : 0;
                                field.onChange(newValue);
                              }}
                              placeholder="0,00"
                              className="w-full bg-white border-2 border-transparent focus:border-emerald-500 rounded-xl pl-7 pr-2.5 py-1 transition-all outline-none font-bold text-xs shadow-sm"
                            />
                          )}
                        />
                      </div>
                    </div>

                    {/* Parcelas */}
                    <div>
                      <label className="block text-[8px] font-black text-slate-400 mb-0.5 flex items-center gap-1 uppercase tracking-wider">
                        <Calendar size={10} />
                        Parcelas
                      </label>
                      <input
                        {...register('numParcelas')}
                        type="number"
                        min="1"
                        className="w-full bg-white border-2 border-transparent focus:border-emerald-500 rounded-xl px-2.5 py-1 transition-all outline-none font-bold text-xs shadow-sm"
                      />
                    </div>

                    {/* Conta */}
                    <div>
                      <label className="block text-[8px] font-black text-slate-400 mb-0.5 flex items-center gap-1 uppercase tracking-wider">
                        <Wallet size={10} />
                        Conta
                      </label>
                      <select
                        {...register('contaId')}
                        className="w-full bg-white border-2 border-transparent focus:border-emerald-500 rounded-xl px-2.5 py-1 transition-all outline-none font-bold text-xs appearance-none shadow-sm"
                      >
                        <option value="">Selecione...</option>
                        {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                    </div>

                    {/* Tipo */}
                    <div>
                      <label className="block text-[8px] font-black text-slate-400 mb-0.5 flex items-center gap-1 uppercase tracking-wider">
                        <Tag size={10} />
                        Tipo
                      </label>
                      <select
                        {...register('tipoLancamentoId')}
                        className="w-full bg-white border-2 border-transparent focus:border-emerald-500 rounded-xl px-2.5 py-1 transition-all outline-none font-bold text-xs appearance-none shadow-sm"
                      >
                        <option value="">Selecione...</option>
                        {tipos.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.flagMatematica} {t.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Vencimento Inicial */}
                    <div>
                      <label className="block text-[8px] font-black text-slate-400 mb-0.5 flex items-center gap-1 uppercase tracking-wider">
                        <Calendar size={10} />
                        Venc. Inicial
                      </label>
                      <input
                        {...register('vencimentoInicial')}
                        type="date"
                        className="w-full bg-white border-2 border-transparent focus:border-emerald-500 rounded-xl px-2.5 py-1 transition-all outline-none font-bold text-xs shadow-sm"
                      />
                    </div>

                    {/* Data da Compra */}
                    <div>
                      <label className="block text-[8px] font-black text-slate-400 mb-0.5 flex items-center gap-1 uppercase tracking-wider">
                        <Calendar size={10} />
                        Data Compra
                      </label>
                      <input
                        {...register('dataCompra')}
                        type="date"
                        className="w-full bg-white border-2 border-transparent focus:border-emerald-500 rounded-xl px-2.5 py-1 transition-all outline-none font-bold text-xs shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Dividir Conta */}
                  <div className="pt-1 border-t border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        {...register('dividirConta')}
                        type="checkbox"
                        disabled={isDV}
                        className="w-3 h-3 rounded border-2 border-slate-200 text-emerald-500 focus:ring-emerald-500 transition-all cursor-pointer disabled:opacity-50"
                      />
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider group-hover:text-emerald-500 transition-colors">
                        Dividir conta com devedor? {isDV && `(Obrigatório para ${selectedTipo?.nome || 'DV'})`}
                      </span>
                    </label>
                  </div>

                  {dividirConta && (
                    <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div>
                        <label className="block text-[8px] font-black text-slate-400 mb-0.5 flex items-center gap-1 uppercase tracking-wider">
                          <Users size={10} />
                          Devedor
                        </label>
                        <select
                          {...register('devedorId')}
                          className="w-full bg-white border-2 border-transparent focus:border-emerald-500 rounded-xl px-2.5 py-1 transition-all outline-none font-bold text-xs appearance-none shadow-sm"
                        >
                          <option value="">Selecione...</option>
                          {devedores.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[8px] font-black text-slate-400 mb-0.5 flex items-center gap-1 uppercase tracking-wider">
                          <Wallet size={10} />
                          Valor Dev.
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">R$</span>
                          <Controller
                            name="valorDebitoDevedor"
                            control={control}
                            render={({ field }) => (
                              <input
                                type="text"
                                inputMode="numeric"
                                value={new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(field.value || 0)}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\D/g, '');
                                  const newValue = value ? parseInt(value, 10) / 100 : 0;
                                  field.onChange(newValue);
                                }}
                                disabled={isDV}
                                placeholder={isDV ? "Automático" : "0,00"}
                                className="w-full bg-white border-2 border-transparent focus:border-emerald-500 rounded-xl pl-7 pr-2.5 py-1 transition-all outline-none font-bold text-xs shadow-sm disabled:opacity-50"
                              />
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 pt-0.5 bg-white border-t border-slate-100 flex-shrink-0 space-y-2">
                {/* Resumo Box */}
                {valorTotal > 0 && (
                  <div className="bg-slate-900 rounded-[1.2rem] p-2.5 text-white shadow-xl shadow-slate-900/20">
                    <div className="grid grid-cols-3 gap-1 text-center">
                      <div>
                        <p className="text-slate-500 text-[6px] font-black uppercase tracking-widest mb-0.5">Parcela</p>
                        <p className="text-[9px] font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorParcela)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-[6px] font-black uppercase tracking-widest mb-0.5">Admin</p>
                        <p className="text-[9px] font-black text-emerald-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorAdmin)}</p>
                      </div>
                      {dividirConta && (
                        <div>
                          <p className="text-slate-500 text-[6px] font-black uppercase tracking-widest mb-0.5">Devedor</p>
                          <p className="text-[9px] font-black text-rose-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorDevedor)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 text-white font-black py-2 rounded-2xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 active:scale-[0.98] text-[8px] uppercase tracking-widest"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <PlusCircle size={14} />
                      Confirmar Lançamento
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
