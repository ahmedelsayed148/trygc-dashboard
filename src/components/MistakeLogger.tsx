import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from './Root';
import { AlertTriangle, Plus, X, Search, Calendar, User, FileText, Trash2, Filter, CheckCircle2, Edit2, Layers } from 'lucide-react';

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

export function MistakeLogger() {
  const ctx = useContext(AppContext);
  const tasks = ctx?.operationalTasks?.length ? ctx.operationalTasks : ctx?.tasks || [];
  const tasksPerTeam = ctx?.tasksPerTeam || {};
  const userName = ctx?.userName || '';
  const userEmail = ctx?.userEmail || '';
  const mistakes = ctx?.mistakes || [];
  const setMistakes = ctx?.setMistakes;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [selectedMistake, setSelectedMistake] = useState<Mistake | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | number | null>(null);
  const [selectedTeamTask, setSelectedTeamTask] = useState('');
  const [mistakeDesc, setMistakeDesc] = useState('');
  const [teamName, setTeamName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterResolved, setFilterResolved] = useState<'all' | 'resolved' | 'unresolved'>('all');
  const [taskSource, setTaskSource] = useState<'campaign' | 'team'>('campaign');

  // Get all unique teams from tasks
  const allTeams = useMemo(() => {
    const teams = new Set<string>();
    tasks.forEach((t: any) => {
      if (t.assignedTo) teams.add(t.assignedTo);
    });
    return Array.from(teams).sort();
  }, [tasks]);

  // Get all team tasks from Tasks Per Team
  const allTeamTasks = useMemo(() => {
    const teamTasks: Array<{ team: string; task: string; key: string }> = [];
    Object.entries(tasksPerTeam).forEach(([key, data]: [string, any]) => {
      const [teamId, taskName] = key.split('::');
      if (teamId && taskName && data) {
        teamTasks.push({
          team: teamId,
          task: taskName,
          key: key,
        });
      }
    });
    return teamTasks;
  }, [tasksPerTeam]);

  const handleSubmit = () => {
    if (!mistakeDesc.trim() || !teamName.trim() || !setMistakes) return;
    if (taskSource === 'campaign' && !selectedTaskId) return;
    if (taskSource === 'team' && !selectedTeamTask) return;

    let taskDescription = '';
    let campaign = '';

    if (taskSource === 'campaign' && selectedTaskId) {
      const selectedTask = tasks.find((t: any) => String(t.id) === String(selectedTaskId));
      if (!selectedTask) return;
      taskDescription = selectedTask.description;
      campaign = selectedTask.campaign;
    } else if (taskSource === 'team' && selectedTeamTask) {
      const teamTask = allTeamTasks.find(t => t.key === selectedTeamTask);
      if (!teamTask) return;
      taskDescription = teamTask.task;
      campaign = `Team: ${teamTask.team}`;
    }

    const newMistake: Mistake = {
      id: `mistake-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      taskId: selectedTaskId || 0,
      taskDescription,
      campaign,
      team: teamName,
      mistakeDescription: mistakeDesc,
      reportedBy: userName || userEmail,
      reportedAt: new Date().toISOString(),
      resolved: false,
    };

    setMistakes((prev: Mistake[]) => [...prev, newMistake]);

    // Reset form
    setSelectedTaskId(null);
    setSelectedTeamTask('');
    setMistakeDesc('');
    setTeamName('');
    setIsAddModalOpen(false);
  };

  const handleResolve = () => {
    if (!selectedMistake || !setMistakes) return;

    setMistakes((prev: Mistake[]) =>
      prev.map((m: Mistake) =>
        m.id === selectedMistake.id
          ? {
              ...m,
              resolved: true,
              resolvedBy: userName || userEmail,
              resolvedAt: new Date().toISOString(),
            }
          : m
      )
    );

    setIsResolveModalOpen(false);
    setSelectedMistake(null);
  };

  const handleUnresolve = (mistakeId: string) => {
    if (!setMistakes) return;

    setMistakes((prev: Mistake[]) =>
      prev.map((m: Mistake) =>
        m.id === mistakeId
          ? {
              ...m,
              resolved: false,
              resolvedBy: undefined,
              resolvedAt: undefined,
            }
          : m
      )
    );
  };

  const handleDelete = (mistakeId: string) => {
    if (!setMistakes) return;
    if (confirm('Are you sure you want to delete this mistake log?')) {
      setMistakes((prev: Mistake[]) => prev.filter((m: Mistake) => m.id !== mistakeId));
    }
  };

  // Filter mistakes
  const filteredMistakes = useMemo(() => {
    return mistakes.filter((m: Mistake) => {
      const matchesSearch = searchTerm === '' ||
        m.taskDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.mistakeDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.campaign.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTeam = filterTeam === '' || m.team === filterTeam;

      const matchesResolved =
        filterResolved === 'all' ||
        (filterResolved === 'resolved' && m.resolved) ||
        (filterResolved === 'unresolved' && !m.resolved);

      return matchesSearch && matchesTeam && matchesResolved;
    });
  }, [mistakes, searchTerm, filterTeam, filterResolved]);

  // Group by team
  const mistakesByTeam = useMemo(() => {
    const grouped: Record<string, Mistake[]> = {};
    filteredMistakes.forEach((m: Mistake) => {
      if (!grouped[m.team]) grouped[m.team] = [];
      grouped[m.team].push(m);
    });
    return grouped;
  }, [filteredMistakes]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-gradient-to-br from-black to-zinc-800 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.05),transparent_60%)]" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <AlertTriangle className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">Mistake Logger</h1>
                <p className="text-white/50 text-sm font-medium">Track team mistakes on tasks</p>
              </div>
            </div>
            <p className="text-white/60 font-medium text-sm max-w-2xl">
              Log mistakes made by teams during task execution to improve quality and accountability.
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-2xl font-black text-sm hover:bg-white/90 transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Log Mistake
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-zinc-950 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-xl p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search mistakes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
            />
          </div>
          <div className="relative min-w-[200px]">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <select
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white appearance-none"
            >
              <option value="">All Teams</option>
              {allTeams.map((team) => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>
          <div className="relative min-w-[200px]">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <select
              value={filterResolved}
              onChange={(e) => setFilterResolved(e.target.value as 'all' | 'resolved' | 'unresolved')}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white appearance-none"
            >
              <option value="all">All Mistakes</option>
              <option value="resolved">Resolved</option>
              <option value="unresolved">Unresolved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black dark:bg-white flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white dark:text-black" />
            </div>
            <div>
              <p className="text-2xl font-black text-zinc-800 dark:text-zinc-100">{mistakes.length}</p>
              <p className="text-xs font-black text-zinc-400 uppercase tracking-wider">Total Mistakes</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-700 dark:bg-zinc-300 flex items-center justify-center">
              <User className="w-5 h-5 text-white dark:text-black" />
            </div>
            <div>
              <p className="text-2xl font-black text-zinc-800 dark:text-zinc-100">{Object.keys(mistakesByTeam).length}</p>
              <p className="text-xs font-black text-zinc-400 uppercase tracking-wider">Teams Involved</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-500 dark:bg-zinc-400 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white dark:text-black" />
            </div>
            <div>
              <p className="text-2xl font-black text-zinc-800 dark:text-zinc-100">{filteredMistakes.length}</p>
              <p className="text-xs font-black text-zinc-400 uppercase tracking-wider">Filtered Results</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mistakes List */}
      {filteredMistakes.length === 0 ? (
        <div className="bg-white dark:bg-zinc-950 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-16 text-center">
          <AlertTriangle className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-black text-zinc-400">No Mistakes Logged</h3>
          <p className="text-sm text-zinc-400 mt-1">Start logging mistakes to track quality issues.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(mistakesByTeam).map(([team, teamMistakes]) => (
            <div key={team} className="bg-white dark:bg-zinc-950 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden">
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-zinc-500" />
                    <h3 className="text-sm font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-tight">{team}</h3>
                    <span className="text-xs font-bold text-white dark:text-black bg-black dark:bg-white px-2 py-1 rounded-full">
                      {teamMistakes.length}
                    </span>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {teamMistakes.map((mistake: Mistake) => (
                  <div key={mistake.id} className="p-6 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all group">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <p className="text-sm font-black text-zinc-800 dark:text-zinc-100 mb-1">{mistake.taskDescription}</p>
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                                {mistake.campaign}
                              </span>
                              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                                Task #{mistake.taskId}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDelete(mistake.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                          </button>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-3 mb-3 border border-zinc-100 dark:border-zinc-800">
                          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{mistake.mistakeDescription}</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-bold text-zinc-400">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>Reported by {mistake.reportedBy}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(mistake.reportedAt).toLocaleDateString()} at {new Date(mistake.reportedAt).toLocaleTimeString()}</span>
                          </div>
                        </div>
                        {mistake.resolved && (
                          <div className="flex items-center gap-4 text-xs font-bold text-zinc-400">
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Resolved by {mistake.resolvedBy}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(mistake.resolvedAt!).toLocaleDateString()} at {new Date(mistake.resolvedAt!).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        )}
                        {!mistake.resolved && (
                          <button
                            onClick={() => {
                              setSelectedMistake(mistake);
                              setIsResolveModalOpen(true);
                            }}
                            className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-black text-sm hover:opacity-90 transition-all"
                          >
                            Resolve
                          </button>
                        )}
                        {mistake.resolved && (
                          <button
                            onClick={() => handleUnresolve(mistake.id)}
                            className="px-6 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-xl font-black text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                          >
                            Unresolve
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Mistake Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-950 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-950 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-black dark:bg-white flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white dark:text-black" />
                </div>
                <h2 className="text-lg font-black text-zinc-800 dark:text-zinc-100">Log New Mistake</h2>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Task Source */}
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                  Task Source *
                </label>
                <select
                  value={taskSource}
                  onChange={(e) => setTaskSource(e.target.value as 'campaign' | 'team')}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                >
                  <option value="campaign">Campaign Task</option>
                  <option value="team">Team Task</option>
                </select>
              </div>

              {/* Task Selection */}
              {taskSource === 'campaign' && (
                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                    Select Task *
                  </label>
                  <select
                    value={selectedTaskId || ''}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  >
                    <option value="">Choose a task...</option>
                    {tasks.map((task: any) => (
                      <option key={task.id} value={task.id}>
                        #{task.id} - {task.campaign} - {task.description}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Team Task Selection */}
              {taskSource === 'team' && (
                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                    Select Team Task *
                  </label>
                  <select
                    value={selectedTeamTask}
                    onChange={(e) => setSelectedTeamTask(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  >
                    <option value="">Choose a team task...</option>
                    {allTeamTasks.map((task) => (
                      <option key={task.key} value={task.key}>
                        {task.team} - {task.task}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Team Name */}
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                  Team/Person Responsible *
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter team or person name..."
                  list="team-suggestions"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
                <datalist id="team-suggestions">
                  {allTeams.map((team) => (
                    <option key={team} value={team} />
                  ))}
                </datalist>
              </div>

              {/* Mistake Description */}
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                  Mistake Description *
                </label>
                <textarea
                  value={mistakeDesc}
                  onChange={(e) => setMistakeDesc(e.target.value)}
                  placeholder="Describe the mistake in detail..."
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={handleSubmit}
                  disabled={!mistakeDesc.trim() || !teamName.trim()}
                  className="flex-1 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-black text-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Log Mistake
                </button>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-6 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-xl font-black text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Mistake Modal */}
      {isResolveModalOpen && selectedMistake && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-950 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-950 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-black dark:bg-white flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-white dark:text-black" />
                </div>
                <h2 className="text-lg font-black text-zinc-800 dark:text-zinc-100">Resolve Mistake</h2>
              </div>
              <button
                onClick={() => setIsResolveModalOpen(false)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Mistake Details */}
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                  Task Description
                </label>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{selectedMistake.taskDescription}</p>
              </div>
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                  Campaign
                </label>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{selectedMistake.campaign}</p>
              </div>
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                  Team/Person Responsible
                </label>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{selectedMistake.team}</p>
              </div>
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                  Mistake Description
                </label>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{selectedMistake.mistakeDescription}</p>
              </div>
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                  Reported By
                </label>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{selectedMistake.reportedBy}</p>
              </div>
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                  Reported At
                </label>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {new Date(selectedMistake.reportedAt).toLocaleDateString()} at {new Date(selectedMistake.reportedAt).toLocaleTimeString()}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={handleResolve}
                  className="flex-1 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-black text-sm hover:opacity-90 transition-all"
                >
                  Resolve Mistake
                </button>
                <button
                  onClick={() => setIsResolveModalOpen(false)}
                  className="px-6 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-xl font-black text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
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
