import React from 'react';
import { useNavigate } from '../lib/routerCompat';
import { Home, ArrowLeft } from 'lucide-react';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-8">
      <div className="text-center">
        <div className="text-9xl font-black text-zinc-200 dark:text-zinc-800 mb-4">404</div>
        <h1 className="text-4xl font-black text-zinc-800 dark:text-zinc-100 mb-4">Page Not Found</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-2xl font-bold flex items-center gap-2 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold flex items-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-lg"
          >
            <Home className="w-5 h-5" />
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
