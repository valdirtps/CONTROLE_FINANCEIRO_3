import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100/80 p-4">
      <h2 className="text-4xl font-black text-slate-900 mb-4">404</h2>
      <p className="text-slate-600 mb-8 font-medium">Página não encontrada</p>
      <Link 
        href="/"
        className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
      >
        Voltar para o Dashboard
      </Link>
    </div>
  );
}
