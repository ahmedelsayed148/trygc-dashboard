import React, { useContext } from 'react';
import { AppContext } from './Root';
import { FunctionSplitView } from './FunctionSplitView';
import { AlertCircle } from 'lucide-react';

export function FunctionKanban() {
  const ctx = useContext(AppContext);
  const tasks = ctx?.operationalTasks?.length ? ctx.operationalTasks : ctx?.tasks || [];
  const isAdmin = ctx?.isAdmin || false;

  const handleEditTask = (task: any) => {
    console.log('Edit task:', task);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-8">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-zinc-400 dark:text-zinc-600" />
          </div>
          <h2 className="text-xl font-black text-zinc-800 dark:text-zinc-100 mb-1">Admin Access Required</h2>
          <p className="text-sm text-zinc-500">This page is only accessible to administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 md:px-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-black text-zinc-800 dark:text-zinc-100 mb-1">Function-Based Kanban</h1>
        <p className="text-sm text-zinc-500 font-medium">Tasks organized by functional categories</p>
      </div>
      <FunctionSplitView tasks={tasks} onEditTask={handleEditTask} />
    </div>
  );
}
