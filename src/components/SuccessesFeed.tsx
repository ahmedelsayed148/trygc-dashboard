import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from './Root';
import { Award, Calendar, ChevronDown, ChevronRight, Edit2, Save, Search, Target, Trophy, Trash2, TrendingUp, Users, Zap } from 'lucide-react';
import { DateRangeFilter } from './DateRangeFilter';
import { emptyDateRange, filterByDateRange } from '../lib/dateFilters';
import { cn } from '@/lib/utils';

export function SuccessesFeed() {
  const ctx = useContext(AppContext);
  const successLogs = ctx?.successLogs || [];
  const setSuccessLogs = ctx?.setSuccessLogs || (() => {});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCampaign, setFilterCampaign] = useState('All');
  const [dateRange, setDateRange] = useState(emptyDateRange);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ title: '', detail: '' });
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());

  const allCampaigns = useMemo(() => {
    const s = new Set<string>();
    successLogs.forEach((l: any) => { if (l.campaign) s.add(l.campaign); });
    return ['All', ...Array.from(s).sort()];
  }, [successLogs]);

  const filtered = useMemo(() => {
    return filterByDateRange(
      successLogs,
      dateRange,
      (log: any) => log.timestamp || log.createdAt || log.date,
    ).filter((log: any) => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !q || log.title?.toLowerCase().includes(q) || log.agent?.toLowerCase().includes(q) || log.detail?.toLowerCase().includes(q) || log.campaign?.toLowerCase().includes(q);
      const matchCampaign = filterCampaign === 'All' || (log.campaign || 'General') === filterCampaign;
      return matchSearch && matchCampaign;
    });
  }, [successLogs, dateRange, searchTerm, filterCampaign]);

  // Group by campaign
  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    filtered.forEach((log: any) => {
      const key = log.campaign || 'General';
      if (!map[key]) map[key] = [];
      map[key].push(log);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const uniqueAgents = [...new Set(successLogs.map((s: any) => s.agent))].length;

  const toggleCampaign = (name: string) => {
    setExpandedCampaigns((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const handleEdit = (log: any) => { setEditingId(log.id); setEditForm({ title: log.title || log.agent || '', detail: log.detail }); };
  const handleSave = () => {
    if (editingId !== null) {
      setSuccessLogs(successLogs.map((log: any) => log.id === editingId ? { ...log, ...editForm } : log));
      setEditingId(null);
    }
  };
  const handleDelete = (id: number) => setSuccessLogs(successLogs.filter((log: any) => log.id !== id));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[var(--app-card-radius)] bg-zinc-900 dark:bg-zinc-950 border border-zinc-800 p-6">
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Updates Feed</h1>
            <p className="text-sm text-zinc-400 mt-0.5">{successLogs.length} total · {uniqueAgents} contributors · {grouped.length} campaign{grouped.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {successLogs.length > 0 && (
          <div className="relative mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { icon: Zap, label: 'Total Updates', value: successLogs.length },
              { icon: TrendingUp, label: 'Contributors', value: uniqueAgents },
              { icon: Target, label: 'Campaigns', value: grouped.length },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</span>
                </div>
                <div className="text-xl font-black text-white">{value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search updates…"
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors"
          />
        </div>
        <select
          value={filterCampaign}
          onChange={(e) => setFilterCampaign(e.target.value)}
          className="px-3.5 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none text-sm text-zinc-800 dark:text-zinc-200 focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors min-w-[160px]"
        >
          {allCampaigns.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <DateRangeFilter label="Date Range" value={dateRange} onChange={setDateRange} />

      {/* Campaign Groups */}
      {grouped.length > 0 ? (
        <div className="space-y-4">
          {grouped.map(([campaignName, logs]) => {
            const isExpanded = expandedCampaigns.has(campaignName);
            return (
              <div key={campaignName} className="rounded-[var(--app-card-radius)] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
                {/* Campaign Header */}
                <button
                  onClick={() => toggleCampaign(campaignName)}
                  className="w-full flex items-center justify-between px-6 py-4 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4 text-zinc-500" />
                        : <ChevronRight className="w-4 h-4 text-zinc-500" />}
                      <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">{campaignName}</span>
                    </div>
                    <span className="text-xs font-bold text-zinc-500 bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded-full">
                      {logs.length} update{logs.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 text-xs text-zinc-500">
                    <span>{[...new Set(logs.map((l: any) => l.agent))].length} contributor{[...new Set(logs.map((l: any) => l.agent))].length !== 1 ? 's' : ''}</span>
                  </div>
                </button>

                {/* Entries */}
                {isExpanded && (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {logs.map((success: any) => (
                      <div key={success.id} className="group p-5 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="w-9 h-9 rounded-xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center shrink-0">
                            <Trophy className="w-4 h-4 text-white dark:text-zinc-900" />
                          </div>
                          <div className="flex-1 min-w-0">
                            {editingId === success.id ? (
                              <div className="space-y-2.5">
                                <input
                                  value={editForm.title}
                                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                  className="w-full px-3.5 py-2 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-xl outline-none text-sm"
                                  placeholder="Title"
                                />
                                <textarea
                                  value={editForm.detail}
                                  onChange={(e) => setEditForm({ ...editForm, detail: e.target.value })}
                                  className="w-full px-3.5 py-2 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-xl h-20 outline-none text-sm resize-none"
                                  placeholder="Details"
                                />
                                <div className="flex gap-2">
                                  <button onClick={handleSave} className="px-3.5 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-xs font-bold flex items-center gap-1.5">
                                    <Save className="w-3.5 h-3.5" /> Save
                                  </button>
                                  <button onClick={() => setEditingId(null)} className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl text-xs font-bold">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-start justify-between gap-3 mb-1.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-black text-zinc-900 dark:text-zinc-50">{success.title || success.agent}</span>
                                    <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {success.date || success.time || ''}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <button onClick={() => handleEdit(success)} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleDelete(success.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{success.detail}</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[var(--app-card-radius)] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-16 text-center">
          <Trophy className="w-12 h-12 text-zinc-200 dark:text-zinc-700 mx-auto mb-3" />
          <h3 className="text-base font-black text-zinc-800 dark:text-zinc-100 mb-1">No updates yet</h3>
          <p className="text-sm text-zinc-400">Use "+ Update" in the top bar to log a win and tag it to a campaign.</p>
        </div>
      )}
    </div>
  );
}
