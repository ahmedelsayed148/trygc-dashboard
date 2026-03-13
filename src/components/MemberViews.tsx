import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from './Root';
import { PersonalDashboard as PersonalDashboardComponent } from './PersonalDashboard';
import { Eye, AlertCircle } from 'lucide-react';

export function MemberViews() {
  const ctx = useContext(AppContext);
  const [selectedMember, setSelectedMember] = useState<string>('all');

  const tasks = ctx?.operationalTasks?.length ? ctx.operationalTasks : ctx?.tasks || [];
  const successLogs = ctx?.successLogs || [];
  const isAdmin = ctx?.isAdmin || false;

  // Get all unique team members
  const allAgents = useMemo(() => {
    return [...new Set(tasks.map((t: any) => t.assignedTo).filter(Boolean))].sort();
  }, [tasks]);

  // Filter tasks by selected member
  const memberViewTasks = useMemo(() => {
    if (selectedMember === 'all') return tasks;
    return tasks.filter((t: any) => t.assignedTo === selectedMember);
  }, [tasks, selectedMember]);

  const handleEditTask = (task: any) => {
    console.log('Edit task:', task);
  };

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-zinc-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-zinc-800 dark:text-zinc-100 mb-2">Admin Access Required</h2>
          <p className="text-zinc-600 dark:text-zinc-400">This page is only accessible to administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-4xl font-black text-zinc-800 dark:text-zinc-100 mb-2">Member Views</h1>
        <p className="text-zinc-500 font-medium">View individual team member dashboards</p>
      </div>

      {/* Member Selector */}
      <div className="bg-white dark:bg-zinc-950 rounded-3xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-6 flex flex-wrap items-center gap-3">
        <Eye className="w-5 h-5 text-zinc-500" />
        <span className="text-sm font-black text-zinc-400 uppercase tracking-widest">View as:</span>
        <button 
          onClick={() => setSelectedMember('all')} 
          className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
            selectedMember === 'all' ? 'bg-black dark:bg-white text-white dark:text-black shadow-md' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          }`}
        >
          All Members
        </button>
        {allAgents.map((agent: string) => (
          <button 
            key={agent} 
            onClick={() => setSelectedMember(agent)} 
            className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
              selectedMember === agent ? 'bg-black dark:bg-white text-white dark:text-black shadow-md' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            {agent}
          </button>
        ))}
      </div>

      {/* Display Member Dashboard */}
      {selectedMember === 'all' ? (
        <div className="bg-white dark:bg-zinc-950 rounded-3xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-8">
          <h2 className="text-2xl font-black text-zinc-800 dark:text-zinc-100 mb-4">Select a Member</h2>
          <p className="text-zinc-600 dark:text-zinc-400">Choose a team member above to view their personal dashboard.</p>
          
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {allAgents.map((agent: string) => {
              const agentTasks = tasks.filter((t: any) => t.assignedTo === agent);
              const done = agentTasks.filter((t: any) => t.status === 'Done').length;
              const completionRate = agentTasks.length > 0 ? ((done / agentTasks.length) * 100).toFixed(0) : 0;
              
              return (
                <button
                  key={agent}
                  onClick={() => setSelectedMember(agent)}
                  className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-6 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all text-left"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-black dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-black font-black">
                      {agent.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-lg font-black text-zinc-800 dark:text-zinc-100">{agent}</div>
                      <div className="text-sm text-zinc-500">{agentTasks.length} tasks</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400 uppercase">Completion</span>
                    <span className="text-2xl font-black text-zinc-800 dark:text-zinc-100">{completionRate}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <PersonalDashboardComponent
          tasks={memberViewTasks}
          allTasks={tasks}
          userName={selectedMember}
          userEmail={selectedMember}
          onEditTask={handleEditTask}
          successLogs={successLogs}
        />
      )}
    </div>
  );
}
