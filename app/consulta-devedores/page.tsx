'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { AppLayout } from '@/components/AppLayout';
import { 
  Users, 
  Calendar as CalendarIcon,
  MessageCircle
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ConsultaDevedoresPage() {
  const { allLancamentosCompletos, devedores, loading } = useFinance();
  const [selectedVencimento, setSelectedVencimento] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [selectedDevedor, setSelectedDevedor] = useState<string>('todos');
  const [selectedVctoDia, setSelectedVctoDia] = useState<string>('todos');

  useEffect(() => {
    setSelectedVctoDia('todos');
  }, [selectedVencimento, selectedDevedor]);

  const handleWhatsAppShare = () => {
    if (selectedDevedor === 'todos' || finalFilteredData.length === 0) return;

    const devedor = devedores.find(d => d.id === selectedDevedor);
    if (!devedor || !devedor.telefone) {
      alert('Este devedor não possui telefone cadastrado.');
      return;
    }

    const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    const total = finalFilteredData.reduce((acc, curr) => acc + curr.valorDevedor, 0);
    
    const [year, month] = (selectedVencimento || '').split('-').map(Number);
    const dateRef = !isNaN(year) && !isNaN(month) ? new Date(year, month - 1) : new Date();
    
    let message = `*EXTRATO DE VALORES A PAGAR*\n`;
    message += `*Devedor:* ${devedor.nome.toUpperCase()}\n`;
    message += `*Vencimento:* ${format(dateRef, 'MMMM yyyy', { locale: ptBR }).toUpperCase()}\n`;
    if (selectedVctoDia !== 'todos') {
      message += `*Data Específica:* ${format(parseISO(selectedVctoDia), 'dd/MM/yyyy')}\n`;
    }
    message += `\n`;
    
    // Header for the table - using a more compact format for mobile
    message += `\`Valor    | Parc. | Ref.\`\n`;
    message += `\`---------|-------|------\`\n`;
    
    finalFilteredData.forEach(item => {
      // Remove R$ and use a more compact numeric representation
      const valorStr = currencyFormatter.format(item.valorDevedor).replace('R$', '').trim();
      const parc = `${item.numeroParcela}/${item.totalParcelas}`;
      const ref = item.referente.substring(0, 12);
      message += `\`${valorStr.padEnd(8)} | ${parc.padEnd(5)} | ${ref}\`\n`;
    });
    
    message += `\n*TOTAL: ${currencyFormatter.format(total)}*`;

    const phone = devedor.telefone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/55${phone}?text=${encodedMessage}`, '_blank');
  };

  // Extract all unique months from parcelas that have debtor values
  const availableVencimentos = useMemo(() => {
    const months = new Set<string>();
    
    // Always include current month
    months.add(format(new Date(), 'yyyy-MM'));
    
    (allLancamentosCompletos || []).forEach(p => {
      if (p && p.valorDevedor !== 0 && p.dataVencimento) {
        const date = parseISO(p.dataVencimento);
        months.add(format(date, 'yyyy-MM'));
      }
    });
    return Array.from(months).sort().reverse(); // Most recent first
  }, [allLancamentosCompletos]);


  const filteredData = useMemo(() => {
    if (!selectedVencimento || !selectedVencimento.includes('-')) return [];
    
    const [year, month] = selectedVencimento.split('-').map(Number);
    if (isNaN(year) || isNaN(month)) return [];
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(new Date(year, month - 1));

    return (allLancamentosCompletos || []).filter(p => {
      if (!p || !p.dataVencimento) return false;
      const date = parseISO(p.dataVencimento);
      const matchesVencimento = p.valorDevedor !== 0 && isWithinInterval(date, { start, end });
      const matchesDevedor = selectedDevedor === 'todos' || p.devedorId === selectedDevedor;
      return matchesVencimento && matchesDevedor;
    }).sort((a, b) => (a.dataVencimento || '').localeCompare(b.dataVencimento || ''));
  }, [allLancamentosCompletos, selectedVencimento, selectedDevedor]);

  const uniqueDueDates = useMemo(() => {
    const dates = new Set<string>();
    filteredData.forEach(p => {
      if (p.dataVencimento) {
        dates.add(p.dataVencimento);
      }
    });
    return Array.from(dates).sort();
  }, [filteredData]);

  const hasMultipleDueDates = uniqueDueDates.length > 1;

  const finalFilteredData = useMemo(() => {
    if (selectedVctoDia === 'todos' || !hasMultipleDueDates) return filteredData;
    return filteredData.filter(item => item.dataVencimento === selectedVctoDia);
  }, [filteredData, selectedVctoDia, hasMultipleDueDates]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Valores a Receber</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Visão detalhada por vencimento</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <CalendarIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={selectedVencimento}
                onChange={(e) => setSelectedVencimento(e.target.value)}
                className="pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold uppercase tracking-widest outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-emerald-500/20"
              >
                {availableVencimentos.length === 0 && <option value="">Nenhum vencimento</option>}
                {availableVencimentos.map(v => {
                  if (!v || !v.includes('-')) return null;
                  const [y, m] = v.split('-');
                  const date = new Date(Number(y), Number(m) - 1);
                  return (
                    <option key={v} value={v}>
                      {format(date, 'MMMM yyyy', { locale: ptBR }).toUpperCase()}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="relative">
              <Users size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={selectedDevedor}
                onChange={(e) => setSelectedDevedor(e.target.value)}
                className="pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold uppercase tracking-widest outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="todos">TODOS OS DEVEDORES</option>
                {devedores.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.nome.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {hasMultipleDueDates && (
              <div className="relative">
                <CalendarIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={selectedVctoDia}
                  onChange={(e) => setSelectedVctoDia(e.target.value)}
                  className="pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold uppercase tracking-widest outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-emerald-500/20 text-slate-700"
                >
                  <option value="todos">TODOS OS VCTOS</option>
                  {uniqueDueDates.map(dateStr => (
                    <option key={dateStr} value={dateStr}>
                      {format(parseISO(dateStr), 'dd/MM/yyyy')}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedDevedor !== 'todos' && finalFilteredData.length > 0 && (
              <button
                onClick={handleWhatsAppShare}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-200 active:scale-95"
              >
                <MessageCircle size={16} />
                Enviar WhatsApp
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#ebf0f5]/50 border-b border-slate-200">
                  <th className="px-4 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">Vcto</th>
                  <th className="px-4 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">Devedor</th>
                  <th className="px-4 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">Conta</th>
                  <th className="px-4 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">Num Parcela</th>
                  <th className="w-24 px-4 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Valor Dev</th>
                  <th className="px-4 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">Referente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {finalFilteredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Users size={32} className="opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhum lançamento encontrado para este período</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  finalFilteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-[#ebf0f5]/50 transition-colors group">
                      <td className="px-4 py-0.5 whitespace-nowrap">
                        <span className="text-xs font-black text-slate-700">
                          {format(parseISO(item.dataVencimento), 'dd/MM/yyyy')}
                        </span>
                      </td>
                      <td className="px-4 py-0.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-black text-[10px]">
                            {item.devedorNome?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-bold text-slate-900">{item.devedorNome || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-0.5">
                        <span className="text-xs font-medium text-slate-600">{item.contaNome}</span>
                      </td>
                      <td className="px-4 py-0.5">
                        <span className="px-2 py-1 bg-[#ebf0f5] text-slate-600 rounded-lg text-[10px] font-black tracking-widest">
                          {item.numeroParcela}/{item.totalParcelas}
                        </span>
                      </td>
                      <td className="px-4 py-0.5 text-right">
                        <span className={`text-xs font-black ${item.valorDevedor >= 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorDevedor)}
                        </span>
                      </td>
                      <td className="px-4 py-0.5">
                        <span className="text-xs font-medium text-slate-600 line-clamp-1">{item.referente}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {finalFilteredData.length > 0 && (
                <tfoot className="bg-[#ebf0f5]/50">
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-[10px] font-black text-slate-900 uppercase tracking-widest text-right">
                      Total no Período:
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className={`text-sm font-black ${finalFilteredData.reduce((acc, curr) => acc + curr.valorDevedor, 0) >= 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                          finalFilteredData.reduce((acc, curr) => acc + curr.valorDevedor, 0)
                        )}
                      </span>
                    </td>
                    <td colSpan={1}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
