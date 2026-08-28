'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useFinance } from '@/context/FinanceContext';
import { 
  Filter, 
  Download, 
  Plus, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Calendar,
  Wallet,
  Users,
  ListFilter,
  Search,
  Edit2,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NovoLancamentoModal } from '@/components/NovoLancamentoModal';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function LancamentosPage() {
  const { lancamentos, parcelas, contas, tipos, devedores, deleteLancamento } = useFinance();
  const [selectedDate, setSelectedDate] = useState<string>('todos');
  const [referenteTerm, setReferenteTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const lancamentosResumo = React.useMemo(() => {
    // Create maps for fast lookups
    const contasMap = new Map(contas.map(c => [c.id, c]));
    const tiposMap = new Map(tipos.map(t => [t.id, t]));
    const devedoresMap = new Map(devedores.map(d => [d.id, d]));
    
    // Group parcelas by lancamentoId for faster access
    const parcelasByLancamento = new Map<string, typeof parcelas>();
    parcelas.forEach(p => {
      const list = parcelasByLancamento.get(p.lancamentoId) || [];
      list.push(p);
      parcelasByLancamento.set(p.lancamentoId, list);
    });

    return lancamentos.map(l => {
      const c = contasMap.get(l.contaId);
      const t = tiposMap.get(l.tipoLancamentoId);
      const d = l.devedorId ? devedoresMap.get(l.devedorId) : undefined;
      
      const installments = parcelasByLancamento.get(l.id) || [];
      const firstVencimento = installments.length > 0 
        ? [...installments].sort((a, b) => new Date(a.dataVencimento + 'T12:00:00').getTime() - new Date(b.dataVencimento + 'T12:00:00').getTime())[0].dataVencimento 
        : l.dataCompra;
      
      const valorParcela = l.valorTotal / l.numParcelas;
      const valorDevParcela = installments.length > 0 ? installments[0].valorDevedor : 0;
      const valorAdmParcela = installments.length > 0 ? installments[0].valorAdministrador : 0;

      return {
        id: l.id,
        dataVencimento: firstVencimento,
        dataCompra: l.dataCompra,
        referente: l.referente,
        tipoNome: t?.nome || 'N/A',
        flagMatematica: t?.flagMatematica || '+',
        contaNome: c?.nome || 'N/A',
        devedorNome: d?.nome,
        numParcelas: l.numParcelas,
        valorTotal: l.valorTotal,
        valorTotalLancamento: l.valorTotal,
        valorParcela: valorParcela,
        totalAdm: valorAdmParcela,
        totalDev: valorDevParcela
      };
    });
  }, [lancamentos, parcelas, contas, tipos, devedores]);

  // Get unique dates for the filter
  const uniqueDates = React.useMemo(() => {
    return Array.from(new Set(lancamentosResumo.map(item => item.dataVencimento)))
      .filter(Boolean)
      .sort((a, b) => new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime());
  }, [lancamentosResumo]);

  const filteredData = React.useMemo(() => {
    return lancamentosResumo.filter(item => {
      const matchesDate = selectedDate === 'todos' || item.dataVencimento === selectedDate;
      const matchesReferente = item.referente.toLowerCase().includes(referenteTerm.toLowerCase());
      return matchesDate && matchesReferente;
    }).sort((a, b) => {
      const dateA = a.dataVencimento ? new Date(a.dataVencimento + 'T12:00:00').getTime() : 0;
      const dateB = b.dataVencimento ? new Date(b.dataVencimento + 'T12:00:00').getTime() : 0;
      return dateB - dateA;
    });
  }, [lancamentosResumo, selectedDate, referenteTerm]);

  const handleEdit = (id: string) => {
    setEditingId(id);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteLancamento(deleteConfirmId);
      toast.success('Lançamento excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir lançamento');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Lançamentos</h1>
            <p className="text-slate-500 font-medium">Resumo de todas as transações realizadas</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all font-bold text-sm shadow-lg shadow-emerald-500/10 active:scale-95 cursor-pointer uppercase tracking-wider"
          >
            <Plus size={16} />
            <span>Novo Lançamento</span>
          </button>
        </div>

        <NovoLancamentoModal 
          isOpen={isModalOpen} 
          onClose={closeModal} 
          editingId={editingId}
        />

        <AnimatePresence>
          {deleteConfirmId && (
            <div className="fixed inset-0 z-[105] flex items-center justify-center p-4">
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
                <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Excluir Lançamento?</h3>
                <p className="text-slate-500 text-sm font-medium mb-8">
                  Esta ação excluirá o lançamento e todas as suas parcelas vinculadas. Tem certeza?
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

        {/* Filtros e Busca */}
        <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:w-64 group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
              <Calendar size={20} />
            </div>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-14 pr-12 py-3 bg-[#ebf0f5] border-none rounded-2xl text-sm font-black text-slate-600 focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer"
            >
              <option value="todos">TODOS OS VENCIMENTOS</option>
              {uniqueDates.map(date => (
                <option key={date} value={date}>
                  VENCIMENTO: {format(new Date(date + 'T12:00:00'), 'dd/MM/yyyy')}
                </option>
              ))}
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ListFilter size={18} />
            </div>
          </div>

          <div className="relative flex-1 group w-full">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="FILTRAR POR REFERENTE..."
              value={referenteTerm}
              onChange={(e) => setReferenteTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-3 bg-[#ebf0f5] border-none rounded-2xl text-sm font-black text-slate-600 placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>

          <div className="flex gap-2 shrink-0">
            <button className="flex items-center justify-center p-3 bg-[#ebf0f5] text-slate-400 rounded-xl hover:bg-emerald-50 hover:text-emerald-500 transition-all">
              <Download size={18} />
            </button>
          </div>
        </div>

        {/* Tabela de Lançamentos */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1200px] table-fixed">
              <thead>
                <tr className="bg-[#ebf0f5]/50 border-b border-slate-200">
                  <th className="w-24 px-4 py-2 text-[12px] font-black text-slate-400 uppercase tracking-wider">Vencimento</th>
                  <th className="w-24 px-4 py-2 text-[12px] font-black text-slate-400 uppercase tracking-wider">Categoria</th>
                  <th className="w-32 px-4 py-2 text-[12px] font-black text-slate-400 uppercase tracking-wider">Conta</th>
                  <th className="w-24 px-4 py-2 text-[12px] font-black text-slate-400 uppercase tracking-wider text-right">Valor Total</th>
                  <th className="w-20 px-4 py-2 text-[12px] font-black text-slate-400 uppercase tracking-wider text-center">Parcelas</th>
                  <th className="w-24 px-4 py-2 text-[12px] font-black text-slate-400 uppercase tracking-wider text-right">Valor Parcela</th>
                  <th className="px-4 py-2 text-[12px] font-black text-slate-400 uppercase tracking-wider">Referente</th>
                  <th className="w-32 px-4 py-2 text-[12px] font-black text-slate-400 uppercase tracking-wider">Devedor</th>
                  <th className="w-24 px-4 py-2 text-[12px] font-black text-slate-400 uppercase tracking-wider text-right">Valor DEV</th>
                  <th className="w-24 px-4 py-2 text-[12px] font-black text-slate-400 uppercase tracking-wider">Data da Compra</th>
                  <th className="w-20 px-4 py-2 text-[12px] font-black text-slate-400 uppercase tracking-wider text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-20 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Calendar size={48} className="opacity-20" />
                        <p className="font-bold text-base">Nenhum lançamento encontrado</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-[#ebf0f5]/50 transition-colors group">
                      <td className="px-4 py-2">
                        <span className="text-sm font-black text-slate-900 whitespace-nowrap">
                          {item.dataVencimento ? format(new Date(item.dataVencimento + 'T12:00:00'), 'dd/MM/yyyy') : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider whitespace-nowrap ${
                          item.flagMatematica === '+' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {item.flagMatematica === '+' ? <ArrowUpCircle size={12} /> : <ArrowDownCircle size={12} />}
                          {item.tipoNome}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-600 truncate">
                          <Wallet size={14} className="text-slate-400 shrink-0" />
                          <span className="truncate">{item.contaNome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className="text-sm font-black text-slate-900 whitespace-nowrap">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorTotal)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className="text-xs font-black text-slate-500 bg-[#ebf0f5] px-2.5 py-1 rounded-lg">
                          {item.numParcelas}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className="text-sm font-bold text-slate-600 whitespace-nowrap">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorParcela)}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className="text-sm font-bold text-slate-900 line-clamp-1 break-all">{item.referente}</span>
                      </td>
                      <td className="px-4 py-2">
                        {item.devedorNome ? (
                          <div className="flex items-center gap-1.5 text-sm font-bold text-slate-600 truncate">
                            <Users size={14} className="text-slate-400 shrink-0" />
                            <span className="truncate">{item.devedorNome}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-sm">---</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className="text-sm font-bold text-rose-600 whitespace-nowrap">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.totalDev)}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                          {item.dataCompra ? format(new Date(item.dataCompra + 'T12:00:00'), 'dd/MM/yyyy') : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => handleEdit(item.id)}
                            className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(item.id)}
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
      </div>
    </AppLayout>
  );
}
