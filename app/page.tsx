'use client';

import React, { useMemo } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { AppLayout } from '@/components/AppLayout';
import { 
  Plus,
  Calendar,
  Bell,
  CheckCircle2,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { format, parseISO, startOfMonth, startOfDay, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { NovoLancamentoModal } from '@/components/NovoLancamentoModal';

export default function Dashboard() {
  const { allLancamentosCompletos, eventos, updateEvento } = useFinance();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const pendingReminders = useMemo(() => {
    const today = startOfDay(new Date());
    return eventos
      .filter(e => {
        if (e.finalizado) return false;
        const eventDate = startOfDay(parseISO(e.data));
        const daysDiff = differenceInDays(eventDate, today);
        return daysDiff <= 3; // Start 3 days before OR even if already passed (but not finished)
      })
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [eventos]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const monthlySummaries = useMemo(() => {
    const datesMap = new Map<string, {
      vencimento: string;
      receita: number;
      despesa: number;
      credito: number;
      saldo: number;
      dateObj: Date;
    }>();

    const today = startOfDay(new Date());

    allLancamentosCompletos.forEach(l => {
      const date = parseISO(l.dataVencimento);
      const dateKey = format(date, 'yyyy-MM-dd');
      let current = datesMap.get(dateKey);
      
      if (!current) {
        current = {
          vencimento: format(date, 'dd/MM/yyyy'),
          receita: 0,
          despesa: 0,
          credito: 0,
          saldo: 0,
          dateObj: startOfDay(date)
        };
        datesMap.set(dateKey, current);
      }

      const valorParcela = (l.valorAdministrador || 0) + (l.valorDevedor || 0);
      
      const normalizeString = (str: string) => str.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
      const isReceb = l.tipoNome ? normalizeString(l.tipoNome) === 'RECEB' : false;
      
      const isEmprestimo = l.tipoNome ? (
        normalizeString(l.tipoNome).includes('EMPRESTIMO') || 
        normalizeString(l.tipoNome).includes('EMPRESTIMOS') || 
        normalizeString(l.tipoNome).includes('LOAN')
      ) : false;

      if (l.flagMatematica === '+') {
        if (l.isReceita) {
          current.receita += valorParcela;
        }
      } else {
        if (!isEmprestimo) {
          current.despesa += valorParcela;
        }
      }
      current.credito += l.valorDevedor;
      
      // O saldo deve refletir a posição líquida do administrador
      const share = l.flagMatematica === '+' ? l.valorAdministrador : -l.valorAdministrador;
      current.saldo += share;
    });

    return Array.from(datesMap.values())
      .filter(summary => summary.dateObj >= startOfMonth(today))
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [allLancamentosCompletos]);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
              DASH<span className="text-emerald-500">BOARD</span>
            </h1>
            <p className="text-slate-400 text-sm font-medium">Resumo mensal consolidado</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center gap-2 text-xs"
          >
            <Plus className="w-4 h-4" />
            NOVO LANÇAMENTO
          </button>
        </div>

        {/* Agenda Reminders Section */}
        {pendingReminders.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Bell className="text-emerald-500 animate-bounce" size={16} />
                LEMBRETES DA AGENDA
                <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-1 animate-pulse">
                  {pendingReminders.length}
                </span>
              </h3>
              <Link href="/agenda" className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest flex items-center gap-1 transition-colors">
                Ver Agenda Completa
                <ChevronRight size={12} />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {pendingReminders.slice(0, 6).map((evento) => {
                  const eventDate = startOfDay(parseISO(evento.data));
                  const today = startOfDay(new Date());
                  const daysDiff = differenceInDays(eventDate, today);
                  const isExpired = daysDiff < 0;

                  return (
                    <motion.div
                      key={evento.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`bg-white p-5 rounded-[2rem] border-2 transition-all hover:shadow-xl hover:shadow-slate-200/40 group ${
                        isExpired ? 'border-rose-100' : 'border-emerald-100'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                          isExpired ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          {isExpired ? 'Atrasado' : daysDiff === 0 ? 'Hoje' : `Em ${daysDiff} dias`}
                        </div>
                        <button 
                          onClick={() => updateEvento(evento.id, { finalizado: true })}
                          className="w-8 h-8 rounded-full bg-[#ebf0f5] flex items-center justify-center text-slate-400 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                          title="Marcar como Finalizado"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      </div>
                      
                      <h4 className="text-sm font-black text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors line-clamp-1">
                        {evento.titulo}
                      </h4>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Calendar size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-tight">
                          {format(parseISO(evento.data), "dd 'de' MMM", { locale: ptBR })}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Main Summary Table - RESTORED AND COMPACTED */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-lg shadow-slate-200/40 overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-[#ebf0f5]/30">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Calendar className="text-emerald-500" size={18} />
              Resumo por Vencimento
            </h3>
          </div>
          
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar relative bg-white">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                <tr className="bg-[#ebf0f5]/80 backdrop-blur-sm">
                  <th className="px-6 py-2 text-[11px] font-black text-slate-400 uppercase tracking-widest">Data do Vcto</th>
                  <th className="px-6 py-2 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Receita</th>
                  <th className="px-6 py-2 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Valores a Pagar</th>
                  <th className="px-6 py-2 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Valores a Receber</th>
                  <th className="px-6 py-2 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Saldo Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {monthlySummaries.map((summary, index) => (
                  <tr 
                    key={index} 
                    className="hover:bg-[#ebf0f5]/50 transition-colors group"
                  >
                    <td className="px-6 py-1.5">
                      <span className="text-sm font-black text-slate-900 capitalize group-hover:text-emerald-600 transition-colors">
                        {summary.vencimento}
                      </span>
                    </td>
                    <td className="px-6 py-1.5 text-right">
                      <span className="text-sm font-bold text-emerald-600">
                        {formatCurrency(summary.receita)}
                      </span>
                    </td>
                    <td className="px-6 py-1.5 text-right">
                      <span className="text-sm font-bold text-rose-500">
                        {formatCurrency(summary.despesa)}
                      </span>
                    </td>
                    <td className="px-6 py-1.5 text-right">
                      <span className="text-sm font-bold text-amber-500">
                        {formatCurrency(summary.credito)}
                      </span>
                    </td>
                    <td className="px-6 py-1.5 text-right">
                      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${
                        summary.saldo >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {formatCurrency(summary.saldo)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <NovoLancamentoModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      </div>
    </AppLayout>
  );
}
