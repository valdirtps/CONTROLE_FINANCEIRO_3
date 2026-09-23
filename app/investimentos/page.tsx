'use client';

import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useFinance } from '@/context/FinanceContext';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Pencil, 
  Trash2, 
  Filter, 
  Search, 
  DollarSign, 
  Calendar, 
  Layers, 
  Building2, 
  AlertCircle, 
  X, 
  ArrowUpRight, 
  ArrowDownRight,
  BarChart3,
  FileText,
  Percent,
  CheckCircle2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Investimento, LancamentoInvestimento, LancamentoInvestimentoCompleto } from '@/types/finance';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const TIPOS_INVESTIMENTO = [
  'Renda Fixa',
  'Ações',
  'Fundos Imobiliários (FIIs)',
  'Fundos Multimercado',
  'Tesouro Direto',
  'CDB / LCI / LCA',
  'Criptoativos',
  'Previdência Privada',
  'Outros'
];

export default function InvestimentosPage() {
  const { 
    investimentos, 
    lancamentosInvestimentos, 
    lancamentosInvestimentosCompletos,
    addInvestimento, 
    updateInvestimento, 
    deleteInvestimento,
    addLancamentoInvestimento,
    updateLancamentoInvestimento,
    deleteLancamentoInvestimento
  } = useFinance();

  // Active view tab: 'lancamentos' | 'ativos'
  const [activeTab, setActiveTab] = useState<'lancamentos' | 'ativos'>('lancamentos');

  // Filters
  const [selectedInvestimentoId, setSelectedInvestimentoId] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>('todos');

  // Modals state
  const [isInvestimentoModalOpen, setIsInvestimentoModalOpen] = useState(false);
  const [editingInvestimento, setEditingInvestimento] = useState<Investimento | null>(null);
  const [investimentoFormData, setInvestimentoFormData] = useState({
    nome: '',
    tipo: 'Renda Fixa',
    instituicao: '',
    descricao: ''
  });

  const [isLancamentoModalOpen, setIsLancamentoModalOpen] = useState(false);
  const [editingLancamento, setEditingLancamento] = useState<LancamentoInvestimento | null>(null);
  const [lancamentoFormData, setLancamentoFormData] = useState({
    investimentoId: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    valorLiquido: '',
    observacao: ''
  });

  // Deletion confirm modals
  const [deleteInvestimentoId, setDeleteInvestimentoId] = useState<string | null>(null);
  const [deleteLancamentoId, setDeleteLancamentoId] = useState<string | null>(null);

  // Currency Formatter
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  // Available unique Year-Months for filter
  const uniqueMonths = useMemo(() => {
    const setMonths = new Set<string>();
    lancamentosInvestimentos.forEach(item => {
      if (item.data) {
        setMonths.add(item.data.substring(0, 7)); // 'YYYY-MM'
      }
    });
    return Array.from(setMonths).sort((a, b) => b.localeCompare(a));
  }, [lancamentosInvestimentos]);

  // Filtered entries
  const filteredLancamentos = useMemo(() => {
    return lancamentosInvestimentosCompletos.filter(item => {
      const matchesInvest = selectedInvestimentoId === 'todos' || item.investimentoId === selectedInvestimentoId;
      const matchesMonth = selectedYearMonth === 'todos' || item.data.startsWith(selectedYearMonth);
      const matchesSearch = 
        item.investimentoNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.investimentoTipo && item.investimentoTipo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.investimentoInstituicao && item.investimentoInstituicao.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.observacao && item.observacao.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesInvest && matchesMonth && matchesSearch;
    });
  }, [lancamentosInvestimentosCompletos, selectedInvestimentoId, selectedYearMonth, searchTerm]);

  // Key performance indicators (KPIs)
  const metrics = useMemo(() => {
    // Latest balance per investment
    const latestPerInvest = new Map<string, LancamentoInvestimentoCompleto>();
    // Sort chronological ascending first
    const sortedAsc = [...lancamentosInvestimentosCompletos].sort((a, b) => a.data.localeCompare(b.data));
    
    sortedAsc.forEach(entry => {
      latestPerInvest.set(entry.investimentoId, entry);
    });

    let patrimonioTotal = 0;
    let variacaoTotal = 0;
    let prevTotal = 0;

    latestPerInvest.forEach(entry => {
      patrimonioTotal += entry.valorLiquido;
      if (entry.diferencaValor) {
        variacaoTotal += entry.diferencaValor;
      }
      if (entry.valorAnterior !== undefined) {
        prevTotal += entry.valorAnterior;
      }
    });

    const percentualGeral = prevTotal > 0 ? (variacaoTotal / prevTotal) * 100 : null;

    return {
      patrimonioTotal,
      variacaoTotal,
      percentualGeral,
      totalAtivos: investimentos.length,
      totalLancamentos: lancamentosInvestimentos.length
    };
  }, [lancamentosInvestimentosCompletos, investimentos, lancamentosInvestimentos]);

  // Live preview inside the entry modal
  const livePreview = useMemo(() => {
    if (!lancamentoFormData.investimentoId || !lancamentoFormData.valorLiquido) {
      return null;
    }
    const currentVal = parseFloat(lancamentoFormData.valorLiquido.replace(',', '.'));
    if (isNaN(currentVal)) return null;

    // Find entries of the same investment sorted by date
    const sameInvestEntries = lancamentosInvestimentos
      .filter(e => e.investimentoId === lancamentoFormData.investimentoId && (!editingLancamento || e.id !== editingLancamento.id))
      .sort((a, b) => a.data.localeCompare(b.data));

    // Find previous entry strictly before current date (or last entry)
    let prevEntry: LancamentoInvestimento | undefined = undefined;
    for (let i = sameInvestEntries.length - 1; i >= 0; i--) {
      if (sameInvestEntries[i].data <= lancamentoFormData.data) {
        prevEntry = sameInvestEntries[i];
        break;
      }
    }
    if (!prevEntry && sameInvestEntries.length > 0) {
      prevEntry = sameInvestEntries[sameInvestEntries.length - 1];
    }

    if (!prevEntry) {
      return { isFirst: true, prevVal: 0, diff: 0, pct: null };
    }

    const diff = currentVal - prevEntry.valorLiquido;
    const pct = prevEntry.valorLiquido !== 0 ? (diff / Math.abs(prevEntry.valorLiquido)) * 100 : 0;

    return {
      isFirst: false,
      prevVal: prevEntry.valorLiquido,
      prevDate: prevEntry.data,
      diff,
      pct
    };
  }, [lancamentoFormData, lancamentosInvestimentos, editingLancamento]);

  // Handlers for Investimento
  const handleOpenInvestimentoModal = (investimento?: Investimento) => {
    if (investimento) {
      setEditingInvestimento(investimento);
      setInvestimentoFormData({
        nome: investimento.nome,
        tipo: investimento.tipo || 'Renda Fixa',
        instituicao: investimento.instituicao || '',
        descricao: investimento.descricao || ''
      });
    } else {
      setEditingInvestimento(null);
      setInvestimentoFormData({
        nome: '',
        tipo: 'Renda Fixa',
        instituicao: '',
        descricao: ''
      });
    }
    setIsInvestimentoModalOpen(true);
  };

  const handleSaveInvestimento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!investimentoFormData.nome.trim()) {
      toast.error('Informe o nome do investimento');
      return;
    }

    try {
      if (editingInvestimento) {
        await updateInvestimento(editingInvestimento.id, {
          nome: investimentoFormData.nome.trim(),
          tipo: investimentoFormData.tipo,
          instituicao: investimentoFormData.instituicao.trim(),
          descricao: investimentoFormData.descricao.trim()
        });
        toast.success('Investimento atualizado com sucesso!');
      } else {
        await addInvestimento({
          nome: investimentoFormData.nome.trim(),
          tipo: investimentoFormData.tipo,
          instituicao: investimentoFormData.instituicao.trim(),
          descricao: investimentoFormData.descricao.trim(),
          ativo: true
        });
        toast.success('Investimento cadastrado com sucesso!');
      }
      setIsInvestimentoModalOpen(false);
    } catch (err: any) {
      toast.error('Erro ao salvar investimento: ' + (err.message || ''));
    }
  };

  const handleConfirmDeleteInvestimento = async () => {
    if (!deleteInvestimentoId) return;
    try {
      await deleteInvestimento(deleteInvestimentoId);
      toast.success('Investimento e seus lançamentos excluídos!');
      if (selectedInvestimentoId === deleteInvestimentoId) {
        setSelectedInvestimentoId('todos');
      }
    } catch (err: any) {
      toast.error('Erro ao excluir investimento: ' + (err.message || ''));
    } finally {
      setDeleteInvestimentoId(null);
    }
  };

  // Handlers for Lancamento
  const handleOpenLancamentoModal = (lancamento?: LancamentoInvestimentoCompleto, defaultInvestId?: string) => {
    if (investimentos.length === 0) {
      toast.info('Cadastre primeiro um investimento para poder registrar lançamentos.', {
        action: {
          label: 'Criar Ativo',
          onClick: () => handleOpenInvestimentoModal()
        }
      });
      handleOpenInvestimentoModal();
      return;
    }

    if (lancamento) {
      setEditingLancamento(lancamento);
      setLancamentoFormData({
        investimentoId: lancamento.investimentoId,
        data: lancamento.data,
        valorLiquido: lancamento.valorLiquido.toString(),
        observacao: lancamento.observacao || ''
      });
    } else {
      setEditingLancamento(null);
      setLancamentoFormData({
        investimentoId: defaultInvestId || (selectedInvestimentoId !== 'todos' ? selectedInvestimentoId : (investimentos[0]?.id || '')),
        data: format(new Date(), 'yyyy-MM-dd'),
        valorLiquido: '',
        observacao: ''
      });
    }
    setIsLancamentoModalOpen(true);
  };

  const handleSaveLancamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lancamentoFormData.investimentoId) {
      toast.error('Selecione o investimento.');
      return;
    }
    if (!lancamentoFormData.data) {
      toast.error('Informe a data do lançamento.');
      return;
    }
    const valor = parseFloat(lancamentoFormData.valorLiquido.replace(',', '.'));
    if (isNaN(valor) || valor < 0) {
      toast.error('Informe um valor líquido válido.');
      return;
    }

    try {
      if (editingLancamento) {
        await updateLancamentoInvestimento(editingLancamento.id, {
          investimentoId: lancamentoFormData.investimentoId,
          data: lancamentoFormData.data,
          valorLiquido: valor,
          observacao: lancamentoFormData.observacao.trim()
        });
        toast.success('Lançamento atualizado!');
      } else {
        await addLancamentoInvestimento({
          investimentoId: lancamentoFormData.investimentoId,
          data: lancamentoFormData.data,
          valorLiquido: valor,
          observacao: lancamentoFormData.observacao.trim()
        });
        toast.success('Lançamento de evolução registrado!');
      }
      setIsLancamentoModalOpen(false);
    } catch (err: any) {
      toast.error('Erro ao salvar lançamento: ' + (err.message || ''));
    }
  };

  const handleConfirmDeleteLancamento = async () => {
    if (!deleteLancamentoId) return;
    try {
      await deleteLancamentoInvestimento(deleteLancamentoId);
      toast.success('Lançamento excluído com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao excluir lançamento: ' + (err.message || ''));
    } finally {
      setDeleteLancamentoId(null);
    }
  };

  // PDF Export
  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('FINANCEPRO - RELATÓRIO DE INVESTIMENTOS', 14, 15);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    const filterDesc = selectedInvestimentoId === 'todos' 
      ? 'Todos os Investimentos' 
      : (investimentos.find(i => i.id === selectedInvestimentoId)?.nome || '');
    doc.text(`Filtro: ${filterDesc} | Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 22);

    const tableData = filteredLancamentos.map(l => [
      format(parseISO(l.data), 'dd/MM/yyyy'),
      l.investimentoNome,
      l.investimentoTipo || '-',
      l.investimentoInstituicao || '-',
      formatCurrency(l.valorLiquido),
      l.valorAnterior !== undefined ? formatCurrency(l.diferencaValor || 0) : '-',
      l.percentualCrescimento !== null && l.percentualCrescimento !== undefined 
        ? `${l.percentualCrescimento >= 0 ? '+' : ''}${l.percentualCrescimento.toFixed(2)}%`
        : '1º Lançamento',
      l.observacao || '-'
    ]);

    autoTable(doc, {
      startY: 28,
      head: [['Data', 'Investimento', 'Categoria', 'Instituição', 'Valor Líquido', 'Variação (R$)', 'Crescimento (%)', 'Obs']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'center' }
      }
    });

    const timestampName = format(new Date(), 'yyyyMMdd_HHmmss');
    doc.save(`relatorio-investimentos-${timestampName}.pdf`);
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Módulo Patrimonial
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase mt-1">
              Investimentos
            </h1>
            <p className="text-slate-500 text-xs font-medium mt-0.5">
              Acompanhe a evolução do valor líquido e o crescimento percentual mês a mês dos seus investimentos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleOpenInvestimentoModal()}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <Plus size={15} className="text-emerald-500" />
              Novo Investimento
            </button>
            <button
              onClick={() => handleOpenLancamentoModal()}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Plus size={16} />
              Lançar Evolução
            </button>
            {filteredLancamentos.length > 0 && (
              <button
                onClick={handleExportPDF}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
                title="Exportar Relatório PDF"
              >
                <FileText size={15} />
                PDF
              </button>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Patrimônio Total */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Patrimônio Líquido Total</span>
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <DollarSign size={18} />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(metrics.patrimonioTotal)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              Soma dos últimos saldos líquidos registrados
            </p>
          </div>

          {/* Card 2: Variação Recente */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Variação Nominal</span>
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${metrics.variacaoTotal >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {metrics.variacaoTotal >= 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
              </div>
            </div>
            <div className={`text-2xl font-black tracking-tight ${metrics.variacaoTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {metrics.variacaoTotal >= 0 ? '+' : ''}{formatCurrency(metrics.variacaoTotal)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              Ganhos/perdas nominais somados no último ciclo
            </p>
          </div>

          {/* Card 3: Crescimento Médio */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Crescimento Médio</span>
              <div className="w-9 h-9 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Percent size={18} />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              {metrics.percentualGeral !== null ? (
                <>
                  <span className={metrics.percentualGeral >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {metrics.percentualGeral >= 0 ? '+' : ''}{metrics.percentualGeral.toFixed(2)}%
                  </span>
                </>
              ) : (
                <span className="text-slate-400 text-lg">Sem histórico</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              Evolução percentual ponderada dos ativos
            </p>
          </div>

          {/* Card 4: Ativos Cadastrados */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ativos Acompanhados</span>
              <div className="w-9 h-9 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Layers size={18} />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {metrics.totalAtivos}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              {metrics.totalLancamentos} lançamentos de saldo registrados
            </p>
          </div>
        </div>

        {/* Tab Buttons & Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('lancamentos')}
            className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'lancamentos'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TrendingUp size={16} />
            Lançamentos & Evolução ({filteredLancamentos.length})
          </button>
          <button
            onClick={() => setActiveTab('ativos')}
            className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'ativos'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers size={16} />
            Investimentos Cadastrados ({investimentos.length})
          </button>
        </div>

        {/* TAB 1: LANÇAMENTOS E EVOLUÇÃO */}
        {activeTab === 'lancamentos' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                {/* Filter by Investment */}
                <div className="flex items-center gap-2 bg-[#ebf0f5] px-3 py-2 rounded-2xl border border-slate-200">
                  <Filter size={14} className="text-slate-400" />
                  <span className="text-[10px] font-black uppercase text-slate-500">Investimento:</span>
                  <select
                    value={selectedInvestimentoId}
                    onChange={(e) => setSelectedInvestimentoId(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="todos">Todos os Investimentos ({investimentos.length})</option>
                    {investimentos.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.nome} {inv.instituicao ? `(${inv.instituicao})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter by Month */}
                {uniqueMonths.length > 0 && (
                  <div className="flex items-center gap-2 bg-[#ebf0f5] px-3 py-2 rounded-2xl border border-slate-200">
                    <Calendar size={14} className="text-slate-400" />
                    <span className="text-[10px] font-black uppercase text-slate-500">Mês:</span>
                    <select
                      value={selectedYearMonth}
                      onChange={(e) => setSelectedYearMonth(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="todos">Todos os Meses</option>
                      {uniqueMonths.map(ym => (
                        <option key={ym} value={ym}>
                          {format(parseISO(`${ym}-01`), 'MMMM / yyyy', { locale: ptBR }).toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por investimento, tipo ou observação..."
                    className="w-full pl-9 pr-4 py-2 bg-[#ebf0f5] border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {(selectedInvestimentoId !== 'todos' || selectedYearMonth !== 'todos' || searchTerm) && (
                <button
                  onClick={() => {
                    setSelectedInvestimentoId('todos');
                    setSelectedYearMonth('todos');
                    setSearchTerm('');
                  }}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 px-3 py-1.5 self-center"
                >
                  Limpar Filtros
                </button>
              )}
            </div>

            {/* Table of Entries */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#ebf0f5]/60 border-b border-slate-200 text-slate-500">
                      <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider">Data Lançamento</th>
                      <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider">Investimento</th>
                      <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider text-right">Valor Líquido</th>
                      <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider text-right">Variação (R$)</th>
                      <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider text-center">Crescimento (%)</th>
                      <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider">Observações</th>
                      <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLancamentos.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                          <BarChart3 className="mx-auto text-slate-300 mb-3" size={40} />
                          <p className="font-bold text-slate-700 text-sm">Nenhum lançamento encontrado</p>
                          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                            {investimentos.length === 0 
                              ? 'Comece criando o seu primeiro investimento para depois lançar a evolução do valor líquido.'
                              : 'Clique no botão "Lançar Evolução" para registrar o saldo deste mês e acompanhar o crescimento.'}
                          </p>
                          <div className="mt-4 flex justify-center gap-2">
                            {investimentos.length === 0 ? (
                              <button
                                onClick={() => handleOpenInvestimentoModal()}
                                className="bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl"
                              >
                                Cadastrar Primeiro Investimento
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenLancamentoModal()}
                                className="bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl"
                              >
                                Fazer Primeiro Lançamento
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredLancamentos.map((item) => {
                        const dateFormatted = format(parseISO(item.data), 'dd/MM/yyyy');
                        const hasPct = typeof item.percentualCrescimento === 'number';
                        const isPositive = hasPct && (item.percentualCrescimento as number) > 0;
                        const isNegative = hasPct && (item.percentualCrescimento as number) < 0;
                        const isZero = hasPct && (item.percentualCrescimento as number) === 0;
                        const isFirst = !hasPct;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                            {/* Data */}
                            <td className="px-5 py-3.5 text-xs font-bold text-slate-900 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-slate-400" />
                                {dateFormatted}
                              </div>
                            </td>

                            {/* Investimento */}
                            <td className="px-5 py-3.5">
                              <div>
                                <div className="font-black text-slate-900 text-xs tracking-tight">
                                  {item.investimentoNome}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {item.investimentoTipo && (
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                      {item.investimentoTipo}
                                    </span>
                                  )}
                                  {item.investimentoInstituicao && (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1">
                                      <Building2 size={10} />
                                      {item.investimentoInstituicao}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Valor Líquido */}
                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                              <span className="font-black text-slate-900 text-sm">
                                {formatCurrency(item.valorLiquido)}
                              </span>
                            </td>

                            {/* Variação Nominal */}
                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                              {item.valorAnterior !== undefined ? (
                                <span className={`text-xs font-bold ${
                                  (item.diferencaValor || 0) > 0 
                                    ? 'text-emerald-600' 
                                    : (item.diferencaValor || 0) < 0 
                                    ? 'text-rose-600' 
                                    : 'text-slate-500'
                                }`}>
                                  {(item.diferencaValor || 0) > 0 ? '+' : ''}
                                  {formatCurrency(item.diferencaValor || 0)}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                            </td>

                            {/* Crescimento (%) */}
                            <td className="px-5 py-3.5 text-center whitespace-nowrap">
                              {isFirst ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider bg-slate-100 text-slate-500 uppercase">
                                  1º Lançamento
                                </span>
                              ) : isPositive ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm">
                                  <TrendingUp size={13} className="text-emerald-600" />
                                  +{item.percentualCrescimento?.toFixed(2)}%
                                </span>
                              ) : isNegative ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200 shadow-sm">
                                  <TrendingDown size={13} className="text-rose-600" />
                                  {item.percentualCrescimento?.toFixed(2)}%
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                                  0,00%
                                </span>
                              )}
                            </td>

                            {/* Observação */}
                            <td className="px-5 py-3.5 text-xs text-slate-500 max-w-[200px] truncate">
                              {item.observacao || '-'}
                            </td>

                            {/* Ações */}
                            <td className="px-5 py-3.5 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleOpenLancamentoModal(item)}
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                  title="Editar lançamento"
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  onClick={() => setDeleteLancamentoId(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Excluir lançamento"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ATIVOS CADASTRADOS */}
        {activeTab === 'ativos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500 font-medium">
                Gerencie seus investimentos (produtos/ativos). Nos lançamentos, você apenas seleciona o investimento desejado.
              </p>
              <button
                onClick={() => handleOpenInvestimentoModal()}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95"
              >
                <Plus size={14} />
                Novo Investimento
              </button>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#ebf0f5]/60 border-b border-slate-200 text-slate-500">
                      <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider">Investimento</th>
                      <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider">Categoria / Tipo</th>
                      <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider">Instituição</th>
                      <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider text-center">Lançamentos</th>
                      <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider text-right">Último Saldo Líquido</th>
                      <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {investimentos.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                          <Layers className="mx-auto text-slate-300 mb-3" size={40} />
                          <p className="font-bold text-slate-700 text-sm">Nenhum investimento cadastrado</p>
                          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                            Cadastre seu primeiro produto financeiro (ex: CDB, Tesouro Direto, FIIs, Ações) para começar a lançar os saldos.
                          </p>
                          <button
                            onClick={() => handleOpenInvestimentoModal()}
                            className="mt-4 bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl"
                          >
                            Cadastrar Investimento
                          </button>
                        </td>
                      </tr>
                    ) : (
                      investimentos.map(inv => {
                        // Find entries for this investment
                        const entries = lancamentosInvestimentos
                          .filter(e => e.investimentoId === inv.id)
                          .sort((a, b) => b.data.localeCompare(a.data));
                        const latestEntry = entries[0];

                        return (
                          <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="font-black text-slate-900 text-sm">{inv.nome}</div>
                              {inv.descricao && (
                                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{inv.descricao}</p>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                                {inv.tipo || 'Renda Fixa'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-xs font-bold text-slate-700">
                              {inv.instituicao ? (
                                <span className="flex items-center gap-1 text-slate-800">
                                  <Building2 size={13} className="text-slate-400" />
                                  {inv.instituicao}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <span className="text-xs font-black bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                                {entries.length}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              {latestEntry ? (
                                <div>
                                  <div className="font-black text-slate-900 text-sm">
                                    {formatCurrency(latestEntry.valorLiquido)}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    Em {format(parseISO(latestEntry.data), 'dd/MM/yyyy')}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 font-medium">Nenhum lançamento</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleOpenLancamentoModal(undefined, inv.id)}
                                  className="text-[10px] font-black uppercase text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                  title="Lançar saldo neste investimento"
                                >
                                  <Plus size={12} />
                                  Lançar
                                </button>
                                <button
                                  onClick={() => handleOpenInvestimentoModal(inv)}
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                  title="Editar cadastro"
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  onClick={() => setDeleteInvestimentoId(inv.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Excluir investimento"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: NOVO / EDITAR INVESTIMENTO (ATIVO) */}
        <AnimatePresence>
          {isInvestimentoModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-slate-200 shadow-2xl relative"
              >
                <button
                  onClick={() => setIsInvestimentoModalOpen(false)}
                  className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={20} />
                </button>

                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Layers size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      {editingInvestimento ? 'Editar Investimento' : 'Novo Investimento'}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Cadastre o ativo para selecioná-lo facilmente nos lançamentos.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveInvestimento} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                      Nome do Investimento *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Tesouro Selic 2029, CDB Banco Inter, FII MXRF11..."
                      value={investimentoFormData.nome}
                      onChange={(e) => setInvestimentoFormData({ ...investimentoFormData, nome: e.target.value })}
                      className="w-full px-4 py-3 bg-[#ebf0f5] border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                        Categoria / Tipo
                      </label>
                      <select
                        value={investimentoFormData.tipo}
                        onChange={(e) => setInvestimentoFormData({ ...investimentoFormData, tipo: e.target.value })}
                        className="w-full px-3 py-3 bg-[#ebf0f5] border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        {TIPOS_INVESTIMENTO.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                        Instituição / Corretora
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: XP, Nubank, BTG..."
                        value={investimentoFormData.instituicao}
                        onChange={(e) => setInvestimentoFormData({ ...investimentoFormData, instituicao: e.target.value })}
                        className="w-full px-4 py-3 bg-[#ebf0f5] border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                      Observações / Detalhes (Opcional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ex: Vencimento em 2029, indexado ao CDI, liquidez diária..."
                      value={investimentoFormData.descricao}
                      onChange={(e) => setInvestimentoFormData({ ...investimentoFormData, descricao: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#ebf0f5] border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsInvestimentoModalOpen(false)}
                      className="px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                    >
                      {editingInvestimento ? 'Salvar Alterações' : 'Cadastrar Investimento'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL: NOVO / EDITAR LANÇAMENTO DE EVOLUÇÃO */}
        <AnimatePresence>
          {isLancamentoModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-slate-200 shadow-2xl relative"
              >
                <button
                  onClick={() => setIsLancamentoModalOpen(false)}
                  className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={20} />
                </button>

                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      {editingLancamento ? 'Editar Lançamento' : 'Novo Lançamento de Saldo'}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Informe o valor líquido na data para calcular o crescimento automático.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveLancamento} className="space-y-4">
                  {/* Select Investment */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Investimento *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsLancamentoModalOpen(false);
                          handleOpenInvestimentoModal();
                        }}
                        className="text-[10px] font-black text-emerald-600 hover:underline uppercase"
                      >
                        + Criar Novo Ativo
                      </button>
                    </div>
                    <select
                      required
                      value={lancamentoFormData.investimentoId}
                      onChange={(e) => setLancamentoFormData({ ...lancamentoFormData, investimentoId: e.target.value })}
                      className="w-full px-4 py-3 bg-[#ebf0f5] border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="">Selecione um investimento...</option>
                      {investimentos.map(inv => (
                        <option key={inv.id} value={inv.id}>
                          {inv.nome} {inv.instituicao ? `(${inv.instituicao})` : ''} - {inv.tipo || 'Renda Fixa'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Data e Valor Líquido */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                        Data do Lançamento *
                      </label>
                      <input
                        type="date"
                        required
                        value={lancamentoFormData.data}
                        onChange={(e) => setLancamentoFormData({ ...lancamentoFormData, data: e.target.value })}
                        className="w-full px-3 py-3 bg-[#ebf0f5] border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                        Valor Líquido (R$) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                          R$
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          placeholder="0,00"
                          value={lancamentoFormData.valorLiquido}
                          onChange={(e) => setLancamentoFormData({ ...lancamentoFormData, valorLiquido: e.target.value })}
                          className="w-full pl-9 pr-3 py-3 bg-[#ebf0f5] border border-slate-200 rounded-2xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Live preview box */}
                  {livePreview && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3.5 rounded-2xl border ${
                        livePreview.isFirst 
                          ? 'bg-slate-50 border-slate-200 text-slate-700'
                          : livePreview.diff >= 0
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50/80 border-rose-200 text-rose-900'
                      }`}
                    >
                      {livePreview.isFirst ? (
                        <div className="flex items-center gap-2 text-xs">
                          <CheckCircle2 size={16} className="text-emerald-500" />
                          <span className="font-semibold">Este será o primeiro lançamento deste investimento. Servirá de base para os próximos meses!</span>
                        </div>
                      ) : (
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between items-center text-slate-600">
                            <span>Saldo anterior registrado:</span>
                            <span className="font-bold">{formatCurrency(livePreview.prevVal)}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-slate-200/50">
                            <span className="font-bold">Crescimento calculado:</span>
                            <span className={`font-black text-sm flex items-center gap-1 ${livePreview.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {livePreview.diff >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                              {livePreview.diff >= 0 ? '+' : ''}{formatCurrency(livePreview.diff)} ({livePreview.diff >= 0 ? '+' : ''}{livePreview.pct?.toFixed(2)}%)
                            </span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Observações */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                      Observações (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Aporte adicional de R$ 500, rendimento do mês..."
                      value={lancamentoFormData.observacao}
                      onChange={(e) => setLancamentoFormData({ ...lancamentoFormData, observacao: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#ebf0f5] border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsLancamentoModalOpen(false)}
                      className="px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                    >
                      {editingLancamento ? 'Salvar Alterações' : 'Confirmar Lançamento'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* CONFIRM DELETE MODALS */}
        {/* Delete Investimento Modal */}
        <AnimatePresence>
          {deleteInvestimentoId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl text-center"
              >
                <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center mb-3">
                  <AlertCircle size={24} />
                </div>
                <h3 className="text-lg font-black text-slate-900">Excluir Investimento?</h3>
                <p className="text-xs text-slate-500 mt-1 mb-5">
                  Esta ação excluirá o cadastro do investimento e todos os seus lançamentos de histórico vinculados.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDeleteInvestimentoId(null)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmDeleteInvestimento}
                    className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl text-xs shadow-lg shadow-rose-500/20"
                  >
                    Sim, Excluir
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Lancamento Modal */}
        <AnimatePresence>
          {deleteLancamentoId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl text-center"
              >
                <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center mb-3">
                  <AlertCircle size={24} />
                </div>
                <h3 className="text-lg font-black text-slate-900">Excluir Lançamento?</h3>
                <p className="text-xs text-slate-500 mt-1 mb-5">
                  Tem certeza que deseja excluir este registro de saldo da evolução?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDeleteLancamentoId(null)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmDeleteLancamento}
                    className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl text-xs shadow-lg shadow-rose-500/20"
                  >
                    Sim, Excluir
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
