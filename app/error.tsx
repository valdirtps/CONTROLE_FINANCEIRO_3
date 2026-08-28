'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100/80 p-4 text-center">
      <h2 className="text-2xl font-black text-slate-900 mb-4">Algo deu errado!</h2>
      <p className="text-slate-600 mb-8 font-medium max-w-md">
        Ocorreu um erro inesperado. Tentamos registrar o problema para correção.
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all"
        >
          Tentar Novamente
        </button>
        <Link 
          href="/"
          className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
        >
          Voltar para Home
        </Link>
      </div>
    </div>
  );
}
