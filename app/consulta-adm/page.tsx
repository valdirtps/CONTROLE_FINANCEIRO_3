'use client';

import React, { useState, useMemo } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { AppLayout } from '@/components/AppLayout';
import { 
  Calendar as CalendarIcon,
  Wallet,
  ClipboardList,
  FileDown
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ConsultaADMPage() {
  const { allLancamentosCompletos, contas, admin, loading } = useFinance();
  const [selectedVencimento, setSelectedVencimento] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [selectedConta, setSelectedConta] = useState<string>('todos');
  const [selectedVctoDia, setSelectedVctoDia] = useState<string>('todos');

  // Reset selectedVctoDia when main filters change
  React.useEffect(() => {
    setSelectedVctoDia('todos');
  }, [selectedVencimento, selectedConta]);

  // Extract all unique months from all lancamentos
  const availableVencimentos = useMemo(() => {
    const months = new Set<string>();
    // Always include current month
    months.add(format(new Date(), 'yyyy-MM'));
    
    (allLancamentosCompletos || []).forEach(p => {
      if (p && p.dataVencimento) {
        const date = parseISO(p.dataVencimento);
        months.add(format(date, 'yyyy-MM'));
      }
    });
    return Array.from(months).sort().reverse();
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
      const matchesVencimento = isWithinInterval(date, { start, end });
      const matchesConta = selectedConta === 'todos' || p.contaId === selectedConta;
      const isDebito = p.flagMatematica === '-';
      const hasValue = p.valorTotal !== 0;
      
      const normalizeString = (str: string) => str.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
      const isEmprestimo = p.tipoNome ? (
        normalizeString(p.tipoNome).includes('EMPRESTIMO') || 
        normalizeString(p.tipoNome).includes('EMPRESTIMOS') || 
        normalizeString(p.tipoNome).includes('LOAN')
      ) : false;

      return matchesVencimento && matchesConta && isDebito && hasValue && !p.isDV && !isEmprestimo;
    }).sort((a, b) => b.valorTotal - a.valorTotal);
  }, [allLancamentosCompletos, selectedVencimento, selectedConta]);

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

  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const periodStr = selectedVencimento ? format(new Date(Number(selectedVencimento.split('-')[0]), Number(selectedVencimento.split('-')[1]) - 1), 'MMMM yyyy', { locale: ptBR }).toUpperCase() : '-';
    const accountStr = selectedConta === 'todos' ? 'TODAS AS CONTAS' : (contas.find(c => c.id === selectedConta)?.nome.toUpperCase() || '');
    const timestamp = format(new Date(), 'dd/MM/yyyy HH:mm');

    // Title and Header
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('Relatorio de Valores a Pagar', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Finance Pro - ${admin?.nome || 'Admin'}`, 14, 26);

    doc.setFontSize(8);
    doc.text(`Periodo: ${periodStr}`, 200, 20, { align: 'left' });
    doc.text(`Conta: ${accountStr}`, 200, 24, { align: 'left' });
    doc.text(`Gerado em: ${timestamp}`, 200, 28, { align: 'left' });

    // Table Data
    const tableData = finalFilteredData.map(item => [
      format(parseISO(item.dataVencimento), 'dd/MM/yyyy'),
      item.contaNome,
      `${item.numeroParcela}/${item.totalParcelas}`,
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorTotal),
      item.referente,
      item.devedorNome || '-',
      item.valorDevedor > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorDevedor) : '-'
    ]);

    const totalValor = finalFilteredData.reduce((acc, curr) => acc + curr.valorTotal, 0);
    const totalDevedor = finalFilteredData.reduce((acc, curr) => acc + curr.valorDevedor, 0);
    const totalLiquido = totalValor - totalDevedor;

    autoTable(doc, {
      startY: 35,
      head: [['Vencimento', 'Conta', 'Parcela', 'Valor Parcela', 'Referente', 'Devedor', 'Valor Devedor']],
      body: tableData,
      foot: [
        [
          { content: 'TOTAL GERAL:', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValor), styles: { fontStyle: 'bold' } },
          { content: '', colSpan: 2 },
          { content: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDevedor), styles: { fontStyle: 'bold' } }
        ],
        [
          { content: 'TOTAL LÍQUIDO A PAGAR:', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalLiquido), styles: { fontStyle: 'bold', textColor: [5, 150, 105] } },
          { content: '', colSpan: 3 }
        ]
      ],
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 8 },
      columnStyles: {
        3: { halign: 'right' },
        6: { halign: 'right' }
      }
    });

    const timestampName = format(new Date(), 'yyyyMMdd_HHmmss');
    doc.save(`relatorio-pagar-${selectedVencimento}-${timestampName}.pdf`);
  };

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
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">
              Valores a Pagar ({admin?.nome || 'ADMIN'})
            </h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">
              Controle de Valores a Pagar por Vencimento e Conta
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <CalendarIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={selectedVencimento}
                onChange={(e) => setSelectedVencimento(e.target.value)}
                className="pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold uppercase tracking-widest outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-emerald-500/20"
              >
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
              <Wallet size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={selectedConta}
                onChange={(e) => setSelectedConta(e.target.value)}
                className="pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold uppercase tracking-widest outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="todos">TODAS AS CONTAS</option>
                {contas.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nome.toUpperCase()}
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
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPDF}
                disabled={finalFilteredData.length === 0}
                className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg ${
                  finalFilteredData.length === 0 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-900/20 active:scale-95'
                }`}
              >
                <FileDown size={16} />
                Gerar Relatório PDF
              </button>
            </div>
            <p className="hidden md:block text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 max-w-[150px] leading-tight">
              Se o PDF não baixar, clique no ícone de &quot;Abrir em nova aba&quot; no topo do navegador.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#ebf0f5]/50 border-b border-slate-200">
                  <th className="px-4 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">Vcto</th>
                  <th className="px-4 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">Conta</th>
                  <th className="px-4 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">Parcela</th>
                  <th className="px-4 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Valor Parcela</th>
                  <th className="px-4 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">Referente</th>
                  <th className="px-4 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">Devedor</th>
                  <th className="w-24 px-4 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Valor Dev</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {finalFilteredData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <ClipboardList size={32} className="opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhum valor a pagar encontrado</p>
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
                        <span className="text-xs font-bold text-slate-900">{item.contaNome}</span>
                      </td>
                      <td className="px-4 py-0.5">
                        <span className="px-2 py-0.5 bg-[#ebf0f5] text-slate-600 rounded-lg text-[10px] font-black tracking-widest">
                          {item.numeroParcela}/{item.totalParcelas}
                        </span>
                      </td>
                      <td className="px-4 py-0.5 text-right">
                        <span className="text-xs font-black text-slate-900">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorTotal)}
                        </span>
                      </td>
                      <td className="px-4 py-0.5">
                        <span className="text-xs font-medium text-slate-600 line-clamp-1">{item.referente}</span>
                      </td>
                      <td className="px-4 py-0.5">
                        {item.devedorNome ? (
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-rose-50 text-rose-600 rounded-md flex items-center justify-center font-black text-[9px]">
                              {item.devedorNome.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-[11px] font-medium text-slate-600">{item.devedorNome}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Nenhum</span>
                        )}
                      </td>
                      <td className="px-4 py-0.5 text-right">
                        <span className="text-xs font-black text-rose-500">
                          {item.valorDevedor > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorDevedor) : '-'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {finalFilteredData.length > 0 && (
                <tfoot className="bg-[#ebf0f5]/50">
                  <tr>
                    <td colSpan={3} className="px-4 py-1 text-[10px] font-black text-slate-900 uppercase tracking-widest text-right">
                      Total no Período:
                    </td>
                    <td className="px-4 py-1 text-right">
                      <span className="text-sm font-black text-slate-900">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                          finalFilteredData.reduce((acc, curr) => acc + curr.valorTotal, 0)
                        )}
                      </span>
                    </td>
                    <td colSpan={2}></td>
                    <td className="px-4 py-1 text-right">
                      <span className="text-sm font-black text-rose-500">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                          finalFilteredData.reduce((acc, curr) => acc + curr.valorDevedor, 0)
                        )}
                      </span>
                    </td>
                  </tr>
                  <tr className="border-t border-slate-200">
                    <td colSpan={3} className="px-4 py-1 text-[10px] font-black text-slate-900 uppercase tracking-widest text-right">
                      Total Líquido a Pagar:
                    </td>
                    <td className="px-4 py-1 text-right">
                      <span className="text-sm font-black text-emerald-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                          finalFilteredData.reduce((acc, curr) => acc + curr.valorTotal, 0) - finalFilteredData.reduce((acc, curr) => acc + curr.valorDevedor, 0)
                        )}
                      </span>
                    </td>
                    <td colSpan={3}></td>
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
