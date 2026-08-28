'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ListFilter,
  Wallet, 
  Users, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Menu, 
  X, 
  Calendar,
  LogOut,
  LogIn,
  Lock,
  Sliders,
  ClipboardList,
  ShieldCheck
} from 'lucide-react';
import { useFinance } from '@/context/FinanceContext';
import { useAuth } from '@/components/FirebaseProvider';
import { auth } from '@/lib/firebase';
import { FirestoreService } from '@/lib/firestore-service';
import { signOut } from 'firebase/auth';
import { format, parseISO, startOfMonth, startOfDay, differenceInDays } from 'date-fns';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const { currentMonth, setCurrentMonth, allLancamentosCompletos, eventos } = useFinance();
  const { user, loading: authLoading, loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nome, setNome] = useState('');
  const [pix, setPix] = useState('');
  const [contato, setContato] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthLoading) return;
    
    setAuthError('');
    setIsAuthLoading(true);

    const trimmedEmail = email.trim();
    
    if (isRegistering && password !== confirmPassword) {
      setAuthError('As senhas não coincidem.');
      setIsAuthLoading(false);
      return;
    }
    
    try {
      if (isRegistering) {
        await registerWithEmail(trimmedEmail, password);
        // Initialize admin profile
        await FirestoreService.setAdmin({
          nome,
          email: trimmedEmail,
          pix,
          contato
        });
      } else {
        await loginWithEmail(trimmedEmail, password);
      }
    } catch (error: any) {
      console.error('Erro na autenticação:', error);
      let msg = error.message || 'Erro na autenticação';
      
      if (error.code === 'auth/operation-not-allowed') {
        msg = 'O login com Email/Senha não está ativado no Firebase Console. Ative-o em Authentication > Sign-in method.';
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        msg = 'Email ou senha incorretos. Verifique seus dados ou crie uma nova conta.';
      } else if (error.code === 'auth/email-already-in-use') {
        msg = 'Este email já está cadastrado. Tente fazer login.';
      } else if (error.code === 'auth/weak-password') {
        msg = 'A senha deve ter pelo menos 6 caracteres.';
      } else if (error.code === 'auth/invalid-email') {
        msg = 'Formato de email inválido.';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        msg = 'Este email já está associado a outro método de login (ex: Google). Tente entrar usando o Google.';
      }
      
      setAuthError(msg);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setAuthError('Digite seu email para recuperar a senha.');
      return;
    }
    
    setIsAuthLoading(true);
    setAuthError('');
    setAuthSuccess('');
    
    try {
      await resetPassword(email.trim());
      setAuthSuccess('E-mail de recuperação enviado! Se não receber em 1 minuto, verifique sua caixa de Spam ou Lixo Eletrônico.');
    } catch (error: any) {
      console.error('Erro ao resetar senha:', error);
      let msg = 'Erro ao enviar email de recuperação.';
      if (error.code === 'auth/user-not-found') {
        msg = 'Usuário não encontrado com este email.';
      } else if (error.code === 'auth/invalid-email') {
        msg = 'Formato de email inválido.';
      }
      setAuthError(msg);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isAuthLoading) return;
    setAuthError('');
    setIsAuthLoading(true);
    try {
      await loginWithGoogle();
    } catch (error: any) {
      setAuthError(error.message || 'Erro no login com Google');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  const pendingRemindersCount = useMemo(() => {
    if (!eventos) return 0;
    const today = startOfDay(new Date());
    return eventos.filter(e => {
      if (e.finalizado) return false;
      const eventDate = startOfDay(parseISO(e.data));
      const daysDiff = differenceInDays(eventDate, today);
      return daysDiff <= 3;
    }).length;
  }, [eventos]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const monthlySummaries = React.useMemo(() => {
    const monthsMap = new Map<string, {
      vencimento: string;
      receita: number;
      despesa: number;
      credito: number;
      saldo: number;
      dateObj: Date;
    }>();

    const today = startOfMonth(new Date());
    const baselineDate = new Date();
    baselineDate.setMonth(baselineDate.getMonth() - 3);
    let minDate = startOfMonth(baselineDate);
    
    allLancamentosCompletos.forEach(l => {
      const date = parseISO(l.dataVencimento);
      const start = startOfMonth(date);
      if (start < minDate) minDate = start;
    });

    let currentIter = new Date(minDate);
    while (currentIter <= today) {
      const monthKey = format(currentIter, 'yyyy-MM');
      const displayDate = new Date(currentIter);
      displayDate.setDate(5);

      monthsMap.set(monthKey, {
        vencimento: format(displayDate, 'dd/MM/yyyy'),
        receita: 0,
        despesa: 0,
        credito: 0,
        saldo: 0,
        dateObj: new Date(currentIter)
      });
      currentIter.setMonth(currentIter.getMonth() + 1);
    }

    allLancamentosCompletos.forEach(l => {
      const date = parseISO(l.dataVencimento);
      const monthKey = format(date, 'yyyy-MM');
      let current = monthsMap.get(monthKey);
      
      if (!current) {
        const displayDate = new Date(date);
        displayDate.setDate(5);
        current = {
          vencimento: format(displayDate, 'dd/MM/yyyy'),
          receita: 0,
          despesa: 0,
          credito: 0,
          saldo: 0,
          dateObj: startOfMonth(date)
        };
        monthsMap.set(monthKey, current);
      }

      const normalizeString = (str: string) => str.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
      const isReceb = l.tipoNome ? normalizeString(l.tipoNome) === 'RECEB' : false;

      if (l.flagMatematica === '+') {
        if (l.isReceita) {
          current.receita += l.valorAdministrador;
        }
      } else {
        current.despesa += l.valorAdministrador;
      }
      current.credito += l.valorDevedor;
      current.saldo = current.receita - current.despesa;
    });

    return Array.from(monthsMap.values()).sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
  }, [allLancamentosCompletos]);

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
    { name: 'Lançamentos', icon: ListFilter, href: '/lancamentos' },
    { name: 'Valores a Receber', icon: ListFilter, href: '/consulta-devedores' },
    { name: 'Valores a Pagar', icon: ClipboardList, href: '/consulta-adm' },
    { name: 'Contas', icon: Wallet, href: '/contas' },
    { name: 'Devedores', icon: Users, href: '/devedores' },
    { name: 'Agenda', icon: Calendar, href: '/agenda' },
    { name: 'Categorias', icon: Settings, href: '/tipos' },
    { name: 'Relatórios', icon: Calendar, href: '/relatorios' },
    { name: 'Configurações', icon: Sliders, href: '/admin' },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#ebf0f5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Carregando FinancePro...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#ebf0f5] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl shadow-slate-200 p-8 md:p-12 text-center border border-slate-200">
          <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Lock className="text-emerald-500" size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-1">
            FINANCE<span className="text-emerald-500">PRO</span>
          </h1>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#ebf0f5] rounded-full text-[10px] font-black text-slate-500 mb-6 uppercase tracking-wider">
            SISTEMA ATUALIZADO <span className="text-emerald-500">•</span> v1.2.2
          </div>
          <p className="text-slate-600 mb-8 font-medium">
            {isRegistering ? 'Crie sua conta administrativa' : 'Acesse sua conta para gerenciar suas finanças.'}
          </p>

          <div className="text-left mb-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest px-1">
              {isRegistering ? 'Cadastro de Usuário' : 'Acesso por Email'}
            </h3>
          </div>

          <form onSubmit={handleAuth} className="space-y-4 mb-6">
            {isRegistering && (
              <>
                <div className="text-left space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Nome Completo</label>
                  <input 
                    type="text" 
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    className="w-full px-5 py-4 bg-[#ebf0f5] border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 font-medium"
                    placeholder="Seu nome"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-left space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Chave PIX</label>
                    <input 
                      type="text" 
                      value={pix}
                      onChange={(e) => setPix(e.target.value)}
                      required
                      className="w-full px-5 py-4 bg-[#ebf0f5] border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 font-medium"
                      placeholder="Email, CPF ou Celular"
                    />
                  </div>
                  <div className="text-left space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Contato</label>
                    <input 
                      type="text" 
                      value={contato}
                      onChange={(e) => setContato(e.target.value)}
                      required
                      className="w-full px-5 py-4 bg-[#ebf0f5] border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 font-medium"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              </>
            )}
            <div className="text-left space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-5 py-4 bg-[#ebf0f5] border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 font-medium"
                placeholder="seu@email.com"
              />
            </div>
            <div className="text-left space-y-1 relative">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Senha</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-5 py-4 bg-[#ebf0f5] border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 font-medium pr-14"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  {showPassword ? <X size={18} /> : <Lock size={18} />}
                </button>
              </div>
            </div>

            {isRegistering && (
              <div className="text-left space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Confirmar Senha</label>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-5 py-4 bg-[#ebf0f5] border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 font-medium"
                  placeholder="••••••••"
                />
              </div>
            )}

            {authError && (
              <p className="text-rose-500 text-xs font-bold bg-rose-50 p-3 rounded-xl border border-rose-100">
                {authError}
              </p>
            )}

            {authSuccess && (
              <p className="text-emerald-500 text-xs font-bold bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                {authSuccess}
              </p>
            )}

            <button 
              type="submit"
              disabled={isAuthLoading}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-slate-900/10 flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              {isAuthLoading ? 'Processando...' : (isRegistering ? 'Cadastrar Administrador' : 'Entrar no Sistema')}
            </button>
          </form>

          {!isRegistering && (
            <button 
              onClick={handleResetPassword}
              disabled={isAuthLoading}
              className="text-xs font-bold text-slate-400 hover:text-emerald-500 transition-colors mb-6 block mx-auto uppercase tracking-widest"
            >
              Esqueci minha senha
            </button>
          )}

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-slate-400 font-black tracking-widest">ou</span>
            </div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            disabled={isAuthLoading}
            className="w-full bg-white border-2 border-slate-200 hover:border-emerald-500/30 hover:bg-[#ebf0f5] disabled:opacity-50 text-slate-600 font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            <LogIn size={20} className="text-emerald-500" />
            {isAuthLoading ? 'Entrando...' : 'Entrar com Google'}
          </button>

          <button 
            onClick={() => {
              setIsRegistering(!isRegistering);
              setAuthError('');
              setAuthSuccess('');
            }}
            disabled={isAuthLoading}
            className="mt-6 text-sm font-bold text-emerald-600 hover:text-emerald-700 disabled:opacity-50 transition-colors"
          >
            {isRegistering ? 'Já tenho uma conta? Entrar' : 'Novo por aqui? Criar conta ADM'}
          </button>

          <p className="mt-8 text-xs text-slate-400 font-medium">
            Sistema Seguro & Criptografado
          </p>
          
          <div className="mt-4 pt-4 border-t border-slate-50">
            <Link 
              href="/super-admin" 
              className="text-[9px] font-black text-slate-300 hover:text-slate-500 uppercase tracking-widest transition-colors"
            >
              Acesso Mestre
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#ebf0f5] flex overflow-hidden">
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        bg-slate-900 text-white
        transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'w-64' : 'w-20'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Sidebar Header */}
        <div className="h-20 flex items-center px-6 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
              <Wallet size={18} className="text-white" />
            </div>
            {isSidebarOpen && (
              <span className="font-black tracking-tighter text-lg">FINANCEPRO</span>
            )}
          </div>
        </div>

        {/* Sidebar Content */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 relative
                  ${isActive 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                `}
              >
                <item.icon size={20} className="shrink-0" />
                {isSidebarOpen && <span className="text-sm font-semibold tracking-tight flex-1">{item.name}</span>}
                {item.name === 'Agenda' && pendingRemindersCount > 0 && (
                  <span className={`
                    flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black
                    ${isActive ? 'bg-white text-emerald-600' : 'bg-emerald-500 text-white'}
                    ${!isSidebarOpen ? 'absolute top-2 right-2' : ''}
                  `}>
                    {pendingRemindersCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 shrink-0 space-y-2">
          <Link 
            href="/super-admin"
            className="flex items-center gap-3.5 px-3.5 py-2 w-full hover:bg-slate-800 hover:text-white rounded-xl text-slate-500 transition-colors text-[10px] font-black uppercase tracking-widest"
          >
            <ShieldCheck size={14} className="shrink-0" />
            <span className={`${!isSidebarOpen && 'hidden'}`}>Painel Mestre</span>
          </Link>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3.5 px-3.5 py-3 w-full hover:bg-rose-500/10 hover:text-rose-400 rounded-xl text-slate-400 transition-colors text-sm font-semibold"
          >
            <LogOut size={19} className="shrink-0" />
            <span className={`${!isSidebarOpen && 'hidden'}`}>Encerrar Sessão</span>
          </button>
        </div>

        {/* Toggle Button */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-24 bg-slate-900 border border-slate-800 p-1.5 rounded-full text-slate-400 hover:text-white hidden lg:block"
        >
          {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="h-16 lg:hidden bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
          <button onClick={() => setIsMobileOpen(true)} className="p-2 text-slate-600">
            <Menu size={24} />
          </button>
          <span className="font-black tracking-tighter text-slate-900">FINANCEPRO</span>
          <div className="w-10" />
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-[#ebf0f5] relative">
          {children}
        </div>
      </main>
    </div>
  );
}
