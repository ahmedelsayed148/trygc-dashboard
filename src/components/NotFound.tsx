import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from '../lib/routerCompat';
import { ArrowLeft, Home, Search } from 'lucide-react';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="text-center max-w-md w-full"
      >
        {/* Large 404 */}
        <div className="relative mb-6 select-none">
          <div className="text-[10rem] font-black leading-none text-zinc-100 dark:text-zinc-900 tracking-tighter">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-[var(--app-card-radius-sm)] bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center shadow-2xl">
              <Search className="w-9 h-9 text-white dark:text-zinc-900" />
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mb-2 tracking-tight">
          Page not found
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">
          This route doesn't exist or you don't have access to it. Check the URL or head back to the dashboard.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-sm font-bold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </button>
        </div>
      </motion.div>
    </div>
  );
}
