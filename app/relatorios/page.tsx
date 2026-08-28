'use client';

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useFinance } from '@/context/FinanceContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['#10b981', '#f43f5e', '#3b82f6', '#f59e0b', '#8b5cf6'];

export default function RelatoriosPage() {
  const { lancamentosCompletos } = useFinance();

  // Dados para o gráfico de barras (últimos 6 meses)
  const barData = React.useMemo(() => {
    const last6Months = eachMonthOfInterval({
      start: startOfMonth(subMonths(new Date(), 5)),
      end: endOfMonth(new Date())
    });

    return last6Months.map(month => {
      const monthStr = format(month, 'MMM', { locale: ptBR });
      const monthLancamentos = lancamentosCompletos.filter(l => {
        const date = new Date(l.dataVencimento + 'T12:00:00');
        return date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear();
      });

      const receitas = monthLancamentos
        .filter(l => l.flagMatematica === '+')
        .reduce((acc, curr) => acc + curr.valorTotal, 0);
      
      const despesas = monthLancamentos
        .filter(l => l.flagMatematica === '-')
        .reduce((acc, curr) => acc + curr.valorTotal, 0);

      return {
        name: monthStr.charAt(0).toUpperCase() + monthStr.slice(1),
        receitas,
        despesas
      };
    });
  }, [lancamentosCompletos]);

  // Dados para o gráfico de pizza (por categoria)
  const categoryData = React.useMemo(() => {
    return lancamentosCompletos.reduce((acc: any[], curr) => {
      if (!curr.tipoNome) return acc;
      const existing = acc.find(item => item.name === curr.tipoNome);
      if (existing) {
        existing.value += curr.valorTotal;
      } else {
        acc.push({ name: curr.tipoNome, value: curr.valorTotal });
      }
      return acc;
    }, []).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [lancamentosCompletos]);

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Relatórios e Análises</h1>
          <p className="text-slate-500">Visualize o desempenho das suas finanças</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Gráfico de Barras - Fluxo de Caixa */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Fluxo de Caixa (6 Meses)</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => `R$ ${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                  />
                  <Bar dataKey="receitas" fill="#10b981" radius={[4, 4, 0, 0]} name="Receitas" />
                  <Bar dataKey="despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Despesas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico de Pizza - Categorias */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Top 5 Categorias</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 flex flex-wrap justify-center gap-4">
                {categoryData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-xs text-slate-600 font-medium">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tabela de Resumo Anual */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Resumo Detalhado</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#ebf0f5]">
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Mês</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Receitas</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Despesas</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {barData.reverse().map((data) => (
                  <tr key={data.name} className="hover:bg-[#ebf0f5] transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{data.name}</td>
                    <td className="px-6 py-4 text-right text-emerald-600 font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.receitas)}
                    </td>
                    <td className="px-6 py-4 text-right text-rose-600 font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.despesas)}
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${data.receitas - data.despesas >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.receitas - data.despesas)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
