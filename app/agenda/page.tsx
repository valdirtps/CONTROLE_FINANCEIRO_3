'use client';

import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useFinance } from '@/context/FinanceContext';
import { 
  Plus, 
  Search, 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Edit3,
  AlertCircle,
  X,
  ChevronRight,
  Bell
} from 'lucide-react';
import { format, parseISO, differenceInDays, isAfter, startOfDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const eventSchema = z.object({
  titulo: z.string().min(3, 'O título deve ter pelo menos 3 caracteres'),
  descricao: z.string().optional(),
  data: z.string().min(1, 'A data é obrigatória'),
});

type EventFormData = z.infer<typeof eventSchema>;

export default function AgendaPage() {
  const { eventos, addEvento, updateEvento, deleteEvento, loading } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendentes' | 'finalizados'>('todos');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      titulo: '',
      descricao: '',
      data: format(new Date(), 'yyyy-MM-dd')
    }
  });

  const onSubmit = async (data: EventFormData) => {
    try {
      if (editingId) {
        await updateEvento(editingId, {
          titulo: data.titulo,
          descricao: data.descricao || '',
          data: data.data
        });
      } else {
        await addEvento({
          titulo: data.titulo,
          descricao: data.descricao || '',
          data: data.data,
          finalizado: false
        });
      }
      setIsModalOpen(false);
      setEditingId(null);
      reset();
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
    }
  };

  const handleEdit = (evento: any) => {
    setEditingId(evento.id);
    setValue('titulo', evento.titulo);
    setValue('descricao', evento.descricao || '');
    setValue('data', evento.data);
    setIsModalOpen(true);
  };

  const toggleFinalizado = async (evento: any) => {
    await updateEvento(evento.id, { finalizado: !evento.finalizado });
  };

  const filteredEventos = useMemo(() => {
    return eventos
      .filter(e => {
        const matchesSearch = e.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             e.descricao.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'todos' ? true : 
                             filterStatus === 'finalizados' ? e.finalizado : !e.finalizado;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [eventos, searchTerm, filterStatus]);

  const isNear = (dateStr: string) => {
    const eventDate = startOfDay(parseISO(dateStr));
    const today = startOfDay(new Date());
    const daysDiff = differenceInDays(eventDate, today);
    return daysDiff <= 3 && daysDiff >= 0;
  };

  const isExpired = (dateStr: string) => {
    const eventDate = startOfDay(parseISO(dateStr));
    const today = startOfDay(new Date());
    return isAfter(today, eventDate);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">AGENDA PRO</h1>
            <p className="text-slate-500 font-medium">Programe seus eventos e receba lembretes automáticos</p>
          </div>
          
          <button 
            onClick={() => {
              setEditingId(null);
              reset();
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10 active:scale-95"
          >
            <Plus size={20} />
            Novo Evento
          </button>
        </div>

        {/* Filters & Search */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-8">
          <div className="lg:col-span-8 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por título ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm"
            />
          </div>
          
          <div className="lg:col-span-4 flex p-1 bg-white border border-slate-200 rounded-2xl shadow-sm">
            {(['todos', 'pendentes', 'finalizados'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                  filterStatus === status 
                    ? 'bg-slate-900 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredEventos.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 bg-white border border-slate-200 rounded-3xl"
              >
                <div className="w-16 h-16 bg-[#ebf0f5] rounded-full flex items-center justify-center mb-4">
                  <CalendarIcon size={32} />
                </div>
                <p className="font-bold">Nenhum evento encontrado</p>
                <p className="text-xs">Tente ajustar seus filtros ou crie um novo evento</p>
              </motion.div>
            ) : (
              filteredEventos.map((evento) => {
                const near = isNear(evento.data) && !evento.finalizado;
                const expired = isExpired(evento.data) && !evento.finalizado;
                
                return (
                  <motion.div
                    key={evento.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`group relative bg-white border-2 rounded-3xl p-6 transition-all hover:shadow-2xl hover:shadow-slate-200/50 ${
                      near ? 'border-emerald-500/30' : expired ? 'border-rose-500/30' : 'border-slate-200'
                    } ${evento.finalizado ? 'opacity-70 grayscale-[0.5]' : ''}`}
                  >
                    {/* Status Badge */}
                    <div className="flex items-start justify-between mb-6">
                      <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        evento.finalizado ? 'bg-[#ebf0f5] text-slate-400' : 
                        near ? 'bg-emerald-100 text-emerald-600 animate-pulse' : 
                        expired ? 'bg-rose-100 text-rose-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {evento.finalizado ? 'Concluído' : near ? 'Lembrete Ativo' : expired ? 'Atrasado' : 'Agendado'}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleEdit(evento)}
                          className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => deleteEvento(evento.id)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <h3 className={`text-lg font-black text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors ${evento.finalizado ? 'line-through decoration-slate-400' : ''}`}>
                      {evento.titulo}
                    </h3>
                    
                    <p className="text-sm text-slate-500 font-medium mb-6 line-clamp-2">
                      {evento.descricao || 'Sem descrição definida'}
                    </p>

                    <div className="space-y-3 pt-6 border-t border-slate-200">
                      <div className="flex items-center gap-3 text-slate-500">
                        <div className="w-8 h-8 rounded-lg bg-[#ebf0f5] flex items-center justify-center text-slate-400">
                          <CalendarIcon size={14} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest">
                          {format(parseISO(evento.data), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-8">
                      <button
                        onClick={() => toggleFinalizado(evento)}
                        className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest transition-all ${
                          evento.finalizado 
                            ? 'bg-[#ebf0f5] text-slate-400 hover:bg-emerald-50 hover:text-emerald-600' 
                            : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 active:scale-95'
                        }`}
                      >
                        {evento.finalizado ? (
                          <>
                            <Circle size={18} />
                            Reabrir Evento
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={18} />
                            Finalizar Agora
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setIsModalOpen(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      {editingId ? 'EDITAR EVENTO' : 'NOVO EVENTO'}
                    </h2>
                    <p className="text-slate-500 text-sm font-medium">Preencha os dados do agendamento</p>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="w-10 h-10 rounded-full bg-[#ebf0f5] flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Título do Evento</label>
                    <input 
                      {...register('titulo')}
                      placeholder="Ex: Pagamento Fornecedor"
                      className={`w-full bg-[#ebf0f5] border-2 rounded-2xl px-6 py-4 text-sm font-bold outline-none transition-all ${
                        errors.titulo ? 'border-rose-500' : 'border-transparent focus:border-emerald-500 focus:bg-white'
                      }`}
                    />
                    {errors.titulo && <p className="mt-2 text-xs font-bold text-rose-500 px-1">{errors.titulo.message}</p>}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Data do Evento</label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        {...register('data')}
                        type="date"
                        className="w-full bg-[#ebf0f5] border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl pl-16 pr-6 py-4 text-sm font-bold outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Descrição (Opcional)</label>
                    <textarea 
                      {...register('descricao')}
                      placeholder="Detalhes adicionais sobre o evento..."
                      rows={3}
                      className="w-full bg-[#ebf0f5] border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="flex flex-col gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 transition-all active:scale-[0.98]"
                    >
                      {isSubmitting ? 'Salvando...' : editingId ? 'Atualizar Evento' : 'Criar Evento'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
