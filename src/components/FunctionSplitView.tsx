import React, { useMemo } from 'react';
import { 
  Users, Headphones, ShieldCheck, Palette, Briefcase, BarChart3, Cpu,
  CheckCircle2, Clock, AlertCircle, ChevronRight
} from 'lucide-react';

const FUNCTION_ICONS: Record<string, any> = {
  'Operations': Users,
  'Follow-up': Headphones,
  'Quality & Audit': ShieldCheck,
  'Creative & Content': Palette,
  'Client Management': Briefcase,
  'Reporting & Analytics': BarChart3,
  'Tech & System': Cpu,
};

// Monochrome shades for each function
const FUNCTION_SHADES: Record<string, { bg: string; iconBg: string }> = {
  'Operations': { bg: 'bg-zinc-50 dark:bg-zinc-900', iconBg: 'bg-black dark:bg-white dark:text-black' },
  'Follow-up': { bg: 'bg-zinc-50 dark:bg-zinc-900', iconBg: 'bg-zinc-800 dark:bg-zinc-200 dark:text-black' },
  'Quality & Audit': { bg: 'bg-zinc-50 dark:bg-zinc-900', iconBg: 'bg-zinc-700 dark:bg-zinc-300 dark:text-black' },
  'Creative & Content': { bg: 'bg-zinc-50 dark:bg-zinc-900', iconBg: 'bg-zinc-600 dark:bg-zinc-400 dark:text-black' },
  'Client Management': { bg: 'bg-zinc-50 dark:bg-zinc-900', iconBg: 'bg-zinc-500' },
  'Reporting & Analytics': { bg: 'bg-zinc-50 dark:bg-zinc-900', iconBg: 'bg-zinc-400 dark:bg-zinc-500' },
  'Tech & System': { bg: 'bg-zinc-50 dark:bg-zinc-900', iconBg: 'bg-zinc-300 dark:bg-zinc-600 text-zinc-800 dark:text-zinc-200' },
};

interface Task {
  id: number | string;
  campaign: string;
  description: string;
  assignedTo: string;
  priority: string;
  status: string;
  category: string;
  slaHrs: number;
  startDateTime: string;
  endDateTime?: string;
  [key: string]: any;
}

interface FunctionSplitViewProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
}

function detectFunctionFromTask(task: Task): string {
  const text = `${task.description} ${task.category}`.toLowerCase();
  const rules: Record<string, string[]> = {
    'Operations': ['execution', 'send', 'deliver', 'dispatch', 'process', 'batch', 'approve', 'approved', 'sent', 'ops'],
    'Follow-up': ['follow', 'reminder', 'rem', 'call', 'callback', 'reach', 'contact', 'chase'],
    'Quality & Audit': ['audit', 'quality', 'check', 'verify', 'sync', 'review', 'qa', 'validate', 'duplicate'],
    'Creative & Content': ['design', 'creative', 'content', 'copy', 'visual', 'banner', 'video', 'media', 'artwork'],
    'Client Management': ['client', 'approval', 'feedback', 'brief', 'requirement', 'meeting', 'presentation'],
    'Reporting & Analytics': ['report', 'analytics', 'data', 'dashboard', 'metric', 'kpi', 'performance', 'insight', 'tracking'],
    'Tech & System': ['system', 'api', 'integration', 'platform', 'bug', 'fix', 'deploy', 'server', 'database', 'tech'],
  };

  let best = 'Operations';
  let bestScore = 0;
  for (const [func, keywords] of Object.entries(rules)) {
    const score = keywords.filter(kw => text.includes(kw)).length;
    if (score > bestScore) { bestScore = score; best = func; }
  }
  return best;
}

export function FunctionSplitView({ tasks, onEditTask }: FunctionSplitViewProps) {
  const grouped = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    tasks.forEach(task => {
      const func = detectFunctionFromTask(task);
      if (!groups[func]) groups[func] = [];
      groups[func].push(task);
    });
    return groups;
  }, [tasks]);

  const sortedFunctions = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex flex-wrap gap-3">
        {sortedFunctions.map(([func, funcTasks]) => {
          const done = funcTasks.filter(t => t.status === 'Done').length;
          const pct = funcTasks.length > 0 ? Math.round((done / funcTasks.length) * 100) : 0;
          return (
            <div key={func} className="flex items-center gap-3 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950">
              <span className="text-xs font-black text-zinc-700 dark:text-zinc-300">{func}</span>
              <span className="text-[10px] font-bold text-zinc-400">{funcTasks.length} tasks</span>
              <div className="w-16 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-black dark:bg-white rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[10px] font-black text-zinc-500">{pct}%</span>
            </div>
          );
        })}
      </div>

      {/* Function columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {sortedFunctions.map(([func, funcTasks]) => {
          const shade = FUNCTION_SHADES[func] || FUNCTION_SHADES['Operations'];
          const Icon = FUNCTION_ICONS[func] || Users;
          const done = funcTasks.filter(t => t.status === 'Done').length;
          const inProgress = funcTasks.filter(t => t.status === 'In Progress').length;
          const blocked = funcTasks.filter(t => t.status === 'Blocked').length;

          return (
            <div key={func} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950">
              {/* Function header */}
              <div className={`${shade.bg} p-4 border-b border-zinc-200 dark:border-zinc-800`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl ${shade.iconBg} flex items-center justify-center`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100">{func}</h3>
                      <p className="text-[10px] text-zinc-400 font-bold">{funcTasks.length} total tasks</p>
                    </div>
                  </div>
                </div>
                {/* Mini stats */}
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {done} Done
                  </span>
                  <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {inProgress} Active
                  </span>
                  {blocked > 0 && (
                    <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {blocked} Blocked
                    </span>
                  )}
                </div>
              </div>

              {/* Task list */}
              <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
                {funcTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => onEditTask(task)}
                    className="p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-zinc-800 dark:text-zinc-100 leading-snug truncate">{task.description}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] font-black text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{task.campaign}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            task.priority === 'High' ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-black' :
                            task.priority === 'Low' ? 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400' :
                            'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                          }`}>{task.priority}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {task.status === 'Done' && <CheckCircle2 className="w-4 h-4 text-zinc-800 dark:text-zinc-200" />}
                        {task.status === 'In Progress' && <Clock className="w-4 h-4 text-zinc-500" />}
                        {task.status === 'Blocked' && <AlertCircle className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />}
                        {task.status === 'Pending' && <Clock className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />}
                        <ChevronRight className="w-3 h-3 text-zinc-300 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[8px] font-black text-zinc-500 dark:text-zinc-400">
                          {task.assignedTo?.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[10px] text-zinc-400 font-medium">{task.assignedTo}</span>
                      </div>
                      <span className="text-[9px] text-zinc-300 dark:text-zinc-600 font-bold">{task.slaHrs}h SLA</span>
                    </div>
                  </div>
                ))}
                {funcTasks.length === 0 && (
                  <p className="text-center text-xs text-zinc-300 dark:text-zinc-600 py-6">No tasks assigned</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}