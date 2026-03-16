import React, { useContext, useDeferredValue, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Calendar, Check, CheckCircle2, Filter, Pencil, Plus, Search, Trash2, User, X } from 'lucide-react';
import { AppContext } from './Root';
import { DateRangeFilter } from './DateRangeFilter';
import { emptyDateRange, filterByDateRange } from '../lib/dateFilters';

interface Mistake {
  id: string;
  taskId: string | number;
  taskDescription: string;
  campaign: string;
  team: string;
  mistakeDescription: string;
  reportedBy: string;
  reportedAt: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
}

type AddForm = {
  taskSource: 'campaign' | 'manual';
  selectedTaskId: string;
  taskDescription: string;
  campaign: string;
  team: string;
  mistakeDescription: string;
};

const emptyAddForm = (): AddForm => ({
  taskSource: 'campaign',
  selectedTaskId: '',
  taskDescription: '',
  campaign: '',
  team: '',
  mistakeDescription: '',
});

export function MistakeLogger() {
  const ctx = useContext(AppContext);
  const tasks = ctx?.operationalTasks?.length ? ctx.operationalTasks : ctx?.tasks || [];
  const tasksPerTeam = ctx?.tasksPerTeam || {};
  const userName = ctx?.userName || '';
  const userEmail = ctx?.userEmail || '';
  const mistakes = ctx?.mistakes || [];
  const setMistakes = ctx?.setMistakes;

  const [search, setSearch] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterCampaign, setFilterCampaign] = useState('');
  const [filterResolved, setFilterResolved] = useState<'all' | 'resolved' | 'unresolved'>('all');
  const [dateRange, setDateRange] = useState(emptyDateRange);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState<AddForm>(emptyAddForm());
  const [editingMistake, setEditingMistake] = useState<Mistake | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const allTeams = useMemo(() => {
    const s = new Set<string>();
    mistakes.forEach((m: Mistake) => { if (m.team) s.add(m.team); });
    tasks.forEach((t: any) => { if (t.assignedTo) s.add(t.assignedTo); });
    return Array.from(s).sort();
  }, [mistakes, tasks]);

  const allCampaigns = useMemo(() => {
    const s = new Set<string>();
    mistakes.forEach((m: Mistake) => { if (m.campaign) s.add(m.campaign); });
    tasks.forEach((t: any) => { if (t.campaign) s.add(t.campaign); });
    return Array.from(s).sort();
  }, [mistakes, tasks]);

  const allTeamTasks = useMemo(() => {
    const list: Array<{ team: string; task: string; key: string }> = [];
    Object.entries(tasksPerTeam).forEach(([key, data]: [string, any]) => {
      const [teamId, taskName] = key.split('::');
      if (teamId && taskName && data) list.push({ team: teamId, task: taskName, key });
    });
    return list;
  }, [tasksPerTeam]);

  const filteredMistakes = useMemo(() => {
    const matched = mistakes.filter((m: Mistake) => {
      const matchesSearch = !deferredSearch ||
        m.taskDescription.toLowerCase().includes(deferredSearch) ||
        m.mistakeDescription.toLowerCase().includes(deferredSearch) ||
        m.campaign.toLowerCase().includes(deferredSearch) ||
        m.team.toLowerCase().includes(deferredSearch) ||
        m.reportedBy.toLowerCase().includes(deferredSearch);
      const matchesTeam = !filterTeam || m.team === filterTeam;
      const matchesCampaign = !filterCampaign || m.campaign === filterCampaign;
      const matchesResolved =
        filterResolved === 'all' ||
        (filterResolved === 'resolved' && m.resolved) ||
        (filterResolved === 'unresolved' && !m.resolved);
      return matchesSearch && matchesTeam && matchesCampaign && matchesResolved;
    });
    return filterByDateRange(matched, dateRange, (m: Mistake) => m.resolvedAt || m.reportedAt);
  }, [mistakes, deferredSearch, filterTeam, filterCampaign, filterResolved, dateRange]);

  const summary = useMemo(() => ({
    total: mistakes.length,
    unresolved: mistakes.filter((m: Mistake) => !m.resolved).length,
    resolved: mistakes.filter((m: Mistake) => m.resolved).length,
    visible: filteredMistakes.length,
  }), [mistakes, filteredMistakes]);

  const handleAdd = () => {
    if (!form.mistakeDescription.trim() || !form.team.trim() || !setMistakes) return;

    let taskDescription = form.taskDescription.trim();
    let campaign = form.campaign.trim();

    if (form.taskSource === 'campaign' && form.selectedTaskId) {
      const t = tasks.find((t: any) => String(t.id) === form.selectedTaskId) as any;
      if (t) { taskDescription = t.description || t.title || taskDescription; campaign = t.campaign || campaign; }
    }

    const newMistake: Mistake = {
      id: `mistake-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      taskId: form.selectedTaskId || 0,
      taskDescription: taskDescription || 'Manual entry',
      campaign: campaign || '—',
      team: form.team,
      mistakeDescription: form.mistakeDescription,
      reportedBy: userName || userEmail,
      reportedAt: new Date().toISOString(),
      resolved: false,
    };

    setMistakes((prev: Mistake[]) => [newMistake, ...prev]);
    toast.success('Mistake logged');
    setForm(emptyAddForm());
    setIsAddOpen(false);
  };

  const handleResolve = (mistake: Mistake) => {
    if (!setMistakes) return;
    setMistakes((prev: Mistake[]) =>
      prev.map((m: Mistake) =>
        m.id === mistake.id
          ? { ...m, resolved: true, resolvedBy: userName || userEmail, resolvedAt: new Date().toISOString() }
          : m,
      ),
    );
    toast.success('Marked as resolved');
  };

  const handleUnresolve = (id: string) => {
    if (!setMistakes) return;
    setMistakes((prev: Mistake[]) =>
      prev.map((m: Mistake) =>
        m.id === id ? { ...m, resolved: false, resolvedBy: undefined, resolvedAt: undefined } : m,
      ),
    );
  };

  const handleDelete = (id: string) => {
    if (!setMistakes) return;
    setMistakes((prev: Mistake[]) => prev.filter((m: Mistake) => m.id !== id));
    toast.success('Deleted');
  };

  const commitEdit = () => {
    if (!editingMistake || !setMistakes) return;
    setMistakes((prev: Mistake[]) =>
      prev.map((m: Mistake) => m.id === editingMistake.id ? { ...m, mistakeDescription: editDesc } : m),
    );
    toast.success('Updated');
    setEditingMistake(null);
  };

  return (
    <div className="px-4 py-6 md:px-6">
      <div className="mx-auto max-w-screen-2xl space-y-6">

        {/* Header */}
        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">Quality Control</p>
              <h1 className="mt-2 text-3xl font-black text-zinc-900 dark:text-zinc-100">Mistake Logger</h1>
              <p className="mt-2 text-sm text-zinc-500">Capture, resolve, and learn from execution issues across all campaigns and teams.</p>
            </div>
            <button
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
            >
              <Plus className="h-4 w-4" />
              Log Mistake
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <StatTile label="Total Logged" value={summary.total} />
            <StatTile label="Unresolved" value={summary.unresolved} accent />
            <StatTile label="Resolved" value={summary.resolved} />
            <StatTile label="Visible" value={summary.visible} />
          </div>

          {/* Filters */}
          <div className="mt-6 grid gap-3 xl:grid-cols-[1.5fr,repeat(3,minmax(0,1fr))]">
            <label className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
              <Search className="h-4 w-4 text-zinc-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by task, team, campaign, description…"
                className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
              />
            </label>
            <FilterSelect label="Team" value={filterTeam} onChange={setFilterTeam}
              options={[['', 'All Teams'], ...allTeams.map((t): [string, string] => [t, t])]} />
            <FilterSelect label="Campaign" value={filterCampaign} onChange={setFilterCampaign}
              options={[['', 'All Campaigns'], ...allCampaigns.map((c): [string, string] => [c, c])]} />
            <FilterSelect label="Status" value={filterResolved} onChange={(v) => setFilterResolved(v as any)}
              options={[['all', 'All'], ['unresolved', 'Unresolved'], ['resolved', 'Resolved']]} />
          </div>
          <div className="mt-4">
            <DateRangeFilter label="Date Range" value={dateRange} onChange={setDateRange} />
          </div>
        </section>

        {/* Table */}
        <section className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                <tr className="text-left">
                  {['Campaign', 'Team', 'Task', 'Mistake', 'Reported By', 'Date', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMistakes.map((mistake: Mistake) => (
                  <tr key={mistake.id} className="border-b border-zinc-100 text-sm last:border-b-0 dark:border-zinc-900 group">
                    <td className="px-6 py-5">
                      <span className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        {mistake.campaign}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{mistake.team}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 max-w-[220px]">
                      <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 line-clamp-2">{mistake.taskDescription}</div>
                    </td>
                    <td className="px-6 py-5 max-w-[240px]">
                      {editingMistake?.id === mistake.id ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            autoFocus
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            rows={3}
                            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-sm px-3 py-2 outline-none resize-none"
                          />
                          <div className="flex gap-1">
                            <button onClick={commitEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black text-xs font-bold hover:opacity-80 transition-all">
                              <Check className="w-3 h-3" /> Save
                            </button>
                            <button onClick={() => setEditingMistake(null)} className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">{mistake.mistakeDescription}</div>
                      )}
                    </td>
                    <td className="px-6 py-5 text-sm text-zinc-600 dark:text-zinc-300">{mistake.reportedBy}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <Calendar className="w-3 h-3 shrink-0" />
                        {new Date(mistake.reportedAt).toLocaleDateString()}
                      </div>
                      {mistake.resolved && mistake.resolvedAt && (
                        <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          {new Date(mistake.resolvedAt).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      {mistake.resolved ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-3 py-1 text-[10px] font-black uppercase tracking-wider border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Resolved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-3 py-1 text-[10px] font-black uppercase tracking-wider border border-amber-200 dark:border-amber-800">
                          <AlertTriangle className="w-3 h-3" /> Open
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!mistake.resolved && (
                          <button
                            onClick={() => handleResolve(mistake)}
                            className="rounded-xl p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"
                            title="Mark resolved"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        {mistake.resolved && (
                          <button
                            onClick={() => handleUnresolve(mistake.id)}
                            className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                            title="Mark unresolved"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => { setEditingMistake(mistake); setEditDesc(mistake.mistakeDescription); }}
                          className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(mistake.id)}
                          className="rounded-xl p-2 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredMistakes.length === 0 && (
            <div className="p-12 text-center">
              <AlertTriangle className="w-12 h-12 text-zinc-200 dark:text-zinc-700 mx-auto mb-3" />
              <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100">No mistakes found</h3>
              <p className="mt-2 text-sm text-zinc-500">
                {mistakes.length === 0 ? 'Start logging mistakes to track quality issues.' : 'Try adjusting your filters.'}
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-950 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-950 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white dark:text-black" />
                </div>
                <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100">Log New Mistake</h2>
              </div>
              <button onClick={() => { setIsAddOpen(false); setForm(emptyAddForm()); }} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">Task Source</label>
                <div className="flex gap-2">
                  {(['campaign', 'manual'] as const).map((src) => (
                    <button
                      key={src}
                      onClick={() => setForm({ ...form, taskSource: src, selectedTaskId: '' })}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${form.taskSource === src ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'}`}
                    >
                      {src === 'campaign' ? 'Campaign Task' : 'Manual Entry'}
                    </button>
                  ))}
                </div>
              </div>

              {form.taskSource === 'campaign' && tasks.length > 0 && (
                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">Select Task</label>
                  <select
                    value={form.selectedTaskId}
                    onChange={(e) => setForm({ ...form, selectedTaskId: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm font-medium focus:outline-none"
                  >
                    <option value="">Choose a task…</option>
                    {tasks.map((t: any) => (
                      <option key={t.id} value={String(t.id)}>
                        {t.campaign} — {t.description || t.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {form.taskSource === 'manual' && (
                <>
                  <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">Task Description</label>
                    <input
                      value={form.taskDescription}
                      onChange={(e) => setForm({ ...form, taskDescription: e.target.value })}
                      placeholder="Describe the task…"
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm font-medium focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">Campaign</label>
                    <input
                      value={form.campaign}
                      onChange={(e) => setForm({ ...form, campaign: e.target.value })}
                      placeholder="Campaign name…"
                      list="campaign-suggestions"
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm font-medium focus:outline-none"
                    />
                    <datalist id="campaign-suggestions">
                      {allCampaigns.map((c) => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">Team / Person Responsible *</label>
                <input
                  value={form.team}
                  onChange={(e) => setForm({ ...form, team: e.target.value })}
                  placeholder="Team or person name…"
                  list="team-suggestions"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm font-medium focus:outline-none"
                />
                <datalist id="team-suggestions">
                  {allTeams.map((t) => <option key={t} value={t} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">Mistake Description *</label>
                <textarea
                  value={form.mistakeDescription}
                  onChange={(e) => setForm({ ...form, mistakeDescription: e.target.value })}
                  placeholder="Describe the mistake in detail…"
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm font-medium focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAdd}
                  disabled={!form.mistakeDescription.trim() || !form.team.trim()}
                  className="flex-1 px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-xl font-black text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Log Mistake
                </button>
                <button
                  onClick={() => { setIsAddOpen(false); setForm(emptyAddForm()); }}
                  className="px-6 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-xl font-black text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: Array<[string, string]>;
}) {
  return (
    <label className="block text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-bold normal-case tracking-normal text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      >
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function StatTile({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-[1.75rem] border p-5 ${accent ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/10' : 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900'}`}>
      <div className={`text-xs font-black uppercase tracking-[0.2em] ${accent ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-400'}`}>{label}</div>
      <div className={`mt-3 text-3xl font-black ${accent ? 'text-amber-700 dark:text-amber-300' : 'text-zinc-900 dark:text-zinc-100'}`}>{value}</div>
    </div>
  );
}
