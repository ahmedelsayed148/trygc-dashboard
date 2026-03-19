import React, { useContext, useDeferredValue } from 'react';
import { AppContext } from './Root';
import { AdvancedAnalytics } from './AdvancedAnalytics';
import { AlertCircle } from 'lucide-react';
import { DateRangeFilter } from './DateRangeFilter';
import { emptyDateRange, filterByDateRange } from '../lib/dateFilters';

export function Analytics() {
  const ctx = useContext(AppContext);
  const tasks = ctx?.operationalTasks?.length ? ctx.operationalTasks : ctx?.tasks || [];
  const successLogs = ctx?.successLogs || [];
  const isAdmin = ctx?.isAdmin || false;
  const [dateRange, setDateRange] = React.useState(emptyDateRange);
  const filteredTasks = React.useMemo(
    () => filterByDateRange(tasks, dateRange, (task: any) => task.endDateTime || task.startDateTime || task.createdAt),
    [dateRange, tasks],
  );
  const filteredSuccessLogs = React.useMemo(
    () => filterByDateRange(successLogs, dateRange, (log: any) => log.timestamp || log.createdAt || log.date),
    [dateRange, successLogs],
  );
  const deferredTasks = useDeferredValue(filteredTasks);
  const deferredSuccessLogs = useDeferredValue(filteredSuccessLogs);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-8">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-zinc-400" />
          </div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 mb-2">Admin access required</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">This page is only accessible to administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 md:px-6 space-y-6 max-w-screen-2xl mx-auto">
      <div className="app-hero-panel rounded-[2rem] border p-6">
        <p className="app-hero-kicker text-xs font-black uppercase tracking-[0.24em]">Analytics Center</p>
        <h1 className="app-hero-title mt-2 text-3xl font-black mb-1">Team Analytics</h1>
        <p className="app-hero-copy text-sm font-medium">Comprehensive performance insights and metrics</p>
      </div>
      <DateRangeFilter label="Analytics Date Range" value={dateRange} onChange={setDateRange} />
      <AdvancedAnalytics tasks={deferredTasks} successLogs={deferredSuccessLogs} />
    </div>
  );
}
