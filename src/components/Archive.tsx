import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from './Root';
import { Archive as ArchiveIcon, Search, Filter, Calendar, CheckCircle2, Clock, AlertCircle, RotateCcw, Trash2 } from 'lucide-react';

export function Archive() {
  const ctx = useContext(AppContext);
  const tasks = ctx?.operationalTasks?.length ? ctx.operationalTasks : ctx?.tasks || [];
  const isAdmin = ctx?.isAdmin || false;
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Done');

  const archivedTasks = useMemo(() => {
    return tasks.filter((task: any) => task.status === 'Done');
  }, [tasks]);

  const filteredArchive = useMemo(() => {
    return archivedTasks.filter((task: any) => {
      const matchesSearch = 
        task.campaign?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.assignedTo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || task.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [archivedTasks, searchTerm, statusFilter]);

  const getCompletionTime = (task: any) => {
    if (!task.endDateTime || !task.startDateTime) return 'N/A';
    const start = new Date(task.startDateTime);
    const end = new Date(task.endDateTime);
    const hours = ((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(1);
    return `${hours}h`;
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
      {/* Header */}
      <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-3xl p-8 text-white shadow-xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
            <ArchiveIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-4xl font-black mb-1">Archive</h1>
            <p className="text-zinc-300 text-lg font-medium">Completed tasks and historical records</p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-white/90">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-bold">{archivedTasks.length} Completed Tasks</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <span className="text-sm font-bold">Historical Data</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Total Archived" value={archivedTasks.length} icon={ArchiveIcon} color="bg-zinc-700 dark:bg-zinc-300 dark:text-black" />
        <StatCard 
          label="This Month" 
          value={archivedTasks.filter((t: any) => {
            const taskDate = new Date(t.endDateTime || t.startDateTime);
            const now = new Date();
            return taskDate.getMonth() === now.getMonth() && taskDate.getFullYear() === now.getFullYear();
          }).length} 
          icon={Calendar} 
          color="bg-black dark:bg-white dark:text-black" 
        />
        <StatCard 
          label="On Time" 
          value={archivedTasks.filter((t: any) => {
            if (!t.endDateTime || !t.startDateTime) return false;
            const hours = (new Date(t.endDateTime).getTime() - new Date(t.startDateTime).getTime()) / (1000 * 60 * 60);
            return hours <= t.slaHrs;
          }).length} 
          icon={CheckCircle2} 
          color="bg-zinc-800 dark:bg-zinc-200 dark:text-black" 
        />
        <StatCard 
          label="Avg Completion" 
          value={archivedTasks.length > 0 ? 
            (archivedTasks.reduce((sum: number, t: any) => {
              if (!t.endDateTime || !t.startDateTime) return sum;
              const hours = (new Date(t.endDateTime).getTime() - new Date(t.startDateTime).getTime()) / (1000 * 60 * 60);
              return sum + hours;
            }, 0) / archivedTasks.length).toFixed(1) + 'h' : '0h'
          } 
          icon={Clock} 
          color="bg-zinc-600 dark:bg-zinc-400 dark:text-black" 
        />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-zinc-950 rounded-3xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="Search archived tasks..." 
              className="w-full pl-12 pr-6 py-3 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-600 rounded-2xl outline-none text-sm font-medium transition-all text-zinc-800 dark:text-zinc-200" 
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400" />
            <button 
              onClick={() => setStatusFilter('All')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                statusFilter === 'All' ? 'bg-zinc-800 dark:bg-zinc-200 text-white dark:text-black shadow-md' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              All
            </button>
            <button 
              onClick={() => setStatusFilter('Done')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                statusFilter === 'Done' ? 'bg-black dark:bg-white text-white dark:text-black shadow-md' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Archive List */}
      <div className="bg-white dark:bg-zinc-950 rounded-3xl shadow-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {filteredArchive.length > 0 ? (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filteredArchive.map((task: any) => (
              <div key={task.id} className="p-6 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-600 dark:text-zinc-400 flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-black text-zinc-800 dark:text-zinc-100 mb-1 truncate">{task.campaign}</h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-2">{task.description}</p>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="flex items-center gap-1 text-xs font-bold text-zinc-500">
                            <Calendar className="w-3 h-3" />
                            {task.endDateTime ? new Date(task.endDateTime).toLocaleDateString() : 'N/A'}
                          </span>
                          <span className="flex items-center gap-1 text-xs font-bold text-zinc-500">
                            <Clock className="w-3 h-3" />
                            Completed in {getCompletionTime(task)}
                          </span>
                          <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-bold">
                            {task.assignedTo}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-400 transition-all" title="Restore">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-400 transition-all" title="Delete Permanently">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {(task.metricCON || task.metricTarget || task.metricCOV) && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {task.metricCON > 0 && (
                          <div className="px-3 py-1 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-bold border border-zinc-200 dark:border-zinc-700">
                            CON: {task.metricCON}
                          </div>
                        )}
                        {task.metricCOV > 0 && (
                          <div className="px-3 py-1 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-bold border border-zinc-200 dark:border-zinc-700">
                            COV: {task.metricCOV}
                          </div>
                        )}
                        {task.metricTarget > 0 && (
                          <div className="px-3 py-1 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-bold border border-zinc-200 dark:border-zinc-700">
                            Target: {task.metricTarget}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <ArchiveIcon className="w-20 h-20 text-zinc-200 dark:text-zinc-700 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-zinc-800 dark:text-zinc-100 mb-2">No Archived Tasks</h3>
            <p className="text-zinc-500 font-medium">Completed tasks will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white dark:bg-zinc-950 rounded-3xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-6">
      <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center text-white shadow-lg mb-4`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-3xl font-black text-zinc-800 dark:text-zinc-100">{value}</div>
    </div>
  );
}
