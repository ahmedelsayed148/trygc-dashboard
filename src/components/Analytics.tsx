import React, { useContext, useDeferredValue } from 'react';
import { AppContext } from './Root';
import { AdvancedAnalytics } from './AdvancedAnalytics';
import { AlertCircle } from 'lucide-react';

export function Analytics() {
  const ctx = useContext(AppContext);
  const tasks = ctx?.operationalTasks?.length ? ctx.operationalTasks : ctx?.tasks || [];
  const successLogs = ctx?.successLogs || [];
  const isAdmin = ctx?.isAdmin || false;
  const deferredTasks = useDeferredValue(tasks);
  const deferredSuccessLogs = useDeferredValue(successLogs);

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-zinc-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-zinc-800 dark:text-zinc-100 mb-2">Admin Access Required</h2>
          <p className="text-zinc-600 dark:text-zinc-400">This page is only accessible to administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-4xl font-black text-zinc-800 dark:text-zinc-100 mb-2">Team Analytics</h1>
        <p className="text-zinc-500 font-medium">Comprehensive performance insights and metrics</p>
      </div>
      <AdvancedAnalytics tasks={deferredTasks} successLogs={deferredSuccessLogs} />
    </div>
  );
}
