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
        <h1 className="text-4xl font-black text-zinc-800 dark:text-zinc-100 mb-2">Function-Based Kanban</h1>
        <p className="text-zinc-500 font-medium">Tasks organized by functional categories</p>
      </div>
      <FunctionSplitView tasks={tasks} onEditTask={handleEditTask} />
    </div>
  );
}
