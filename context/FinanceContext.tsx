'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Devedor, 
  Conta, 
  TipoLancamento, 
  Lancamento, 
  Parcela,
  LancamentoCompleto,
  Administrador,
  Evento
} from '@/types/finance';
import { FirestoreService } from '@/lib/firestore-service';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { useAuth } from '@/components/FirebaseProvider';

interface FinanceContextType {
  devedores: Devedor[];
  contas: Conta[];
  tipos: TipoLancamento[];
  lancamentos: Lancamento[];
  parcelas: Parcela[];
  lancamentosCompletos: LancamentoCompleto[];
  allLancamentosCompletos: LancamentoCompleto[];
  admin: Administrador | null;
  eventos: Evento[];
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  loading: boolean;
  addDebtor: (data: Omit<Devedor, 'id'>) => Promise<void>;
  updateDebtor: (id: string, data: Partial<Devedor>) => Promise<void>;
  deleteDebtor: (id: string) => Promise<void>;
  addAccount: (data: Omit<Conta, 'id'>) => Promise<void>;
  updateAccount: (id: string, data: Partial<Conta>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addType: (data: Omit<TipoLancamento, 'id'>) => Promise<void>;
  updateType: (id: string, data: Partial<TipoLancamento>) => Promise<void>;
  deleteType: (id: string) => Promise<void>;
  addLancamento: (data: Omit<Lancamento, 'id'>, firstVencimento: string) => Promise<void>;
  updateLancamento: (id: string, data: Omit<Lancamento, 'id'>, firstVencimento: string) => Promise<void>;
  updateParcelaSituacao: (id: string, situacao: Parcela['situacao']) => Promise<void>;
  deleteLancamento: (id: string) => Promise<void>;
  updateAdmin: (data: Administrador) => Promise<void>;
  addEvento: (data: Omit<Evento, 'id'>) => Promise<void>;
  updateEvento: (id: string, data: Partial<Evento>) => Promise<void>;
  deleteEvento: (id: string) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [devedores, setDevedores] = useState<Devedor[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [tipos, setTipos] = useState<TipoLancamento[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [admin, setAdmin] = useState<Administrador | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading || !user) {
      if (!authLoading && !user) {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    const unsubDevedores = FirestoreService.getDevedores(setDevedores);
    const unsubContas = FirestoreService.getContas(setContas);
    const unsubTipos = FirestoreService.getTipos(setTipos);
    const unsubLancamentos = FirestoreService.getLancamentos(setLancamentos);
    const unsubParcelas = FirestoreService.getParcelas(setParcelas);
    const unsubEventos = FirestoreService.getEventos(setEventos);
    
    FirestoreService.getAdmin().then(data => {
      if (data) {
        setAdmin(data);
      } else if (user) {
        setAdmin({
          nome: user.displayName || '',
          email: user.email || '',
          pix: '',
          contato: ''
        } as Administrador);
      }
      setLoading(false);
    }).catch(error => {
      console.error("Erro ao carregar admin:", error);
      if (user) {
        setAdmin({
          nome: user.displayName || '',
          email: user.email || '',
          pix: '',
          contato: ''
        } as Administrador);
      }
      setLoading(false);
    });

    return () => {
      unsubDevedores();
      unsubContas();
      unsubTipos();
      unsubLancamentos();
      unsubParcelas();
      unsubEventos();
    };
  }, [user, authLoading]);

  const allLancamentosCompletos: LancamentoCompleto[] = React.useMemo(() => {
    // Create maps for O(1) lookups
    const lancamentosMap = new Map(lancamentos.map(l => [l.id, l]));
    const contasMap = new Map(contas.map(c => [c.id, c]));
    const tiposMap = new Map(tipos.map(t => [t.id, t]));
    const devedoresMap = new Map(devedores.map(d => [d.id, d]));

    const normalize = (str: string) => str.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

    return (parcelas || [])
      .filter(p => p && typeof p.dataVencimento === 'string' && p.dataVencimento.trim() !== '')
      .map(p => {
        const l = lancamentosMap.get(p.lancamentoId);
        const c = l ? contasMap.get(l.contaId) : undefined;
        const t = l ? tiposMap.get(l.tipoLancamentoId) : undefined;
        const d = l?.devedorId ? devedoresMap.get(l.devedorId) : undefined;

        const isDV = t?.dv === true;
        
        const valorParcelaTotal = l ? (l.valorTotal / l.numParcelas) : (p.valorAdministrador + p.valorDevedor);
        let finalValorDevedor = p.valorDevedor;
        let finalValorAdministrador = p.valorAdministrador;

        if (isDV) {
          finalValorDevedor = t?.flagMatematica === '+' ? -Math.abs(valorParcelaTotal) : Math.abs(valorParcelaTotal);
          finalValorAdministrador = 0;
        }

        return {
          ...p,
          valorAdministrador: finalValorAdministrador,
          valorDevedor: finalValorDevedor,
          referente: l?.referente || '',
          contaNome: c?.nome || 'N/A',
          contaId: l?.contaId || '',
          isReceita: c?.isReceita || false,
          tipoNome: t?.nome || 'N/A',
          flagMatematica: t?.flagMatematica || '+',
          devedorNome: d?.nome,
          devedorId: l?.devedorId,
          dataCompra: l?.dataCompra,
          valorTotal: valorParcelaTotal,
          valorTotalLancamento: l?.valorTotal || 0,
          valorDebitoDevedor: l?.valorDebitoDevedor,
          isDV
        };
      });
  }, [parcelas, lancamentos, contas, tipos, devedores]);

  const lancamentosCompletos = React.useMemo(() => {
    return allLancamentosCompletos.filter(p => {
      if (!p.dataVencimento || typeof p.dataVencimento !== 'string') return false;
      const date = parseISO(p.dataVencimento);
      return isWithinInterval(date, {
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth)
      });
    });
  }, [allLancamentosCompletos, currentMonth]);

  const value = {
    devedores,
    contas,
    tipos,
    lancamentos,
    parcelas,
    lancamentosCompletos,
    allLancamentosCompletos,
    admin,
    eventos,
    currentMonth,
    setCurrentMonth,
    loading,
    addDebtor: FirestoreService.addDebtor,
    updateDebtor: FirestoreService.updateDebtor,
    deleteDebtor: FirestoreService.deleteDebtor,
    addAccount: FirestoreService.addAccount,
    updateAccount: FirestoreService.updateAccount,
    deleteAccount: FirestoreService.deleteAccount,
    addType: FirestoreService.addType,
    updateType: FirestoreService.updateType,
    deleteType: FirestoreService.deleteType,
    addLancamento: FirestoreService.addLancamento,
    updateLancamento: FirestoreService.updateLancamento,
    updateParcelaSituacao: FirestoreService.updateParcelaSituacao,
    deleteLancamento: FirestoreService.deleteLancamento,
    updateAdmin: async (data: Administrador) => {
      await FirestoreService.setAdmin(data);
      setAdmin(data);
    },
    addEvento: FirestoreService.addEvento,
    updateEvento: FirestoreService.updateEvento,
    deleteEvento: FirestoreService.deleteEvento
  };

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
