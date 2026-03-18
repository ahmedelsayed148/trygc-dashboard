import React, { useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  AlertTriangle,
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  Globe2,
  Layers3,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { AppContext } from './Root';
import { useConfiguration } from '../context/ConfigurationContext';
import { DateRangeFilter } from './DateRangeFilter';
import type { BulkCampaign } from './CampaignBulkUpload';
import { CampaignEditorModal } from './operations/CampaignEditorModal';
import { TaskEditorModal } from './operations/TaskEditorModal';
import { appendAssignmentNotification } from '../lib/taskNotifications';
import { emptyDateRange, filterByDateRange } from '../lib/dateFilters';
import {
  CAMPAIGN_PHASES,
  CAMPAIGN_STATUSES,
  MARKETS,
  OPERATIONS_TEAMS,
  TASK_PRIORITIES,
  createCampaignTask,
  createOpsCampaign,
  getAssigneeLabel,
  getCampaignProgress,
  normalizeOpsCampaigns,
  type CampaignTeamTask,
  type OpsCampaign,
} from '../lib/operations';

type TaskModalState = {
  campaignId: string;
  defaultTeamId: string;
  task?: CampaignTeamTask;
} | null;

const LazyCampaignBulkUpload = React.lazy(() =>
  import('./CampaignBulkUpload').then((module) => ({ default: module.CampaignBulkUpload })),
);

export function CampaignsManager() {
  const ctx = useContext(AppContext);
  const { configuration } = useConfiguration();
  const campaignConfig = configuration.campaign;
  const opsCampaigns = normalizeOpsCampaigns(ctx?.opsCampaigns || []);
  const setOpsCampaigns = ctx?.setOpsCampaigns || (() => {});
  const teamMembers = ctx?.teamMembers || [];
  const taskNotifications = ctx?.taskNotifications || [];
  const setTaskNotifications = ctx?.setTaskNotifications || (() => {});
  const userEmail = ctx?.userEmail || '';
  const disabledTeams: string[] = ctx?.disabledTeams || [];
  const enabledTeams = OPERATIONS_TEAMS.filter((t) => !disabledTeams.includes(t.id));

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [phaseFilter, setPhaseFilter] = useState('All');
  const [marketFilter, setMarketFilter] = useState('All');
  const [dateRange, setDateRange] = useState(emptyDateRange);
  const [expandedCampaigns, setExpandedCampaigns] = useState<string[]>([]);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<OpsCampaign | undefined>();
  const [taskModalState, setTaskModalState] = useState<TaskModalState>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredCampaigns = useMemo(() => {
    const matchingCampaigns = opsCampaigns.filter((campaign) => {
      const matchesSearch =
        !search ||
        campaign.name.toLowerCase().includes(search.toLowerCase()) ||
        campaign.client.toLowerCase().includes(search.toLowerCase()) ||
        campaign.owner.toLowerCase().includes(search.toLowerCase()) ||
        campaign.criteria.toLowerCase().includes(search.toLowerCase()) ||
        campaign.methodology.toLowerCase().includes(search.toLowerCase()) ||
        campaign.teamPlans.some((plan) =>
          plan.tasks.some((task) =>
            [
              task.title,
              task.description,
              String(task.metricTarget || ''),
              String(task.metricCON || ''),
              String(task.metricCOV || ''),
            ].some((value) =>
              value.toLowerCase().includes(search.toLowerCase()),
            ),
          ),
        );
      const matchesStatus = statusFilter === 'All' || campaign.status === statusFilter;
      const matchesPhase = phaseFilter === 'All' || campaign.currentPhase === phaseFilter;
      const matchesMarket = marketFilter === 'All' || campaign.market === marketFilter;
      return matchesSearch && matchesStatus && matchesPhase && matchesMarket;
    });

    return filterByDateRange(matchingCampaigns, dateRange, (campaign) => campaign.startDate || campaign.updatedAt || campaign.createdAt);
  }, [dateRange, marketFilter, opsCampaigns, phaseFilter, search, statusFilter]);

  const stats = useMemo(() => {
    const tasks = opsCampaigns.flatMap((campaign) =>
      campaign.teamPlans.filter((plan) => !disabledTeams.includes(plan.teamId)).flatMap((plan) => plan.tasks)
    );
    return {
      campaigns: opsCampaigns.length,
      active: opsCampaigns.filter((campaign) => campaign.status === 'Active').length,
      teamsCovered: opsCampaigns.length * enabledTeams.length,
      tasks: tasks.length,
    };
  }, [opsCampaigns, disabledTeams, enabledTeams.length]);

  const toggleExpanded = (campaignId: string) => {
    setExpandedCampaigns((current) =>
      current.includes(campaignId)
        ? current.filter((value) => value !== campaignId)
        : [...current, campaignId],
    );
  };

  const handleSaveCampaign = (campaign: OpsCampaign) => {
    const isNew = !editingCampaign;
    setOpsCampaigns((current: OpsCampaign[]) => {
      const existing = current.some((item) => item.id === campaign.id);
      return existing
        ? current.map((item) => (item.id === campaign.id ? campaign : item))
        : [campaign, ...current];
    });
    if (isNew && campaignConfig.autoExpandNew) {
      setExpandedCampaigns((prev) => [...prev, campaign.id]);
    }
    toast.success(editingCampaign ? 'Campaign updated' : 'Campaign created');
    setEditingCampaign(undefined);
  };

  const handleDeleteCampaign = (campaignId: string) => {
    if (deleteConfirmId !== campaignId) {
      setDeleteConfirmId(campaignId);
      return;
    }
    setOpsCampaigns((current: OpsCampaign[]) => current.filter((campaign) => campaign.id !== campaignId));
    setDeleteConfirmId(null);
    toast.success('Campaign removed');
  };

  const handleBulkImport = (items: BulkCampaign[]) => {
    const imported = items.map((item) =>
      createOpsCampaign({
        name: item.name,
        client: item.client,
        market: item.market,
        budget: item.budget,
        startDate: item.startDate,
        endDate: item.endDate,
        currentPhase: (item.currentPhase as OpsCampaign['currentPhase']) || 'Planning',
        notes: item.notes,
      }),
    );

    setOpsCampaigns((current: OpsCampaign[]) => [...imported, ...current]);
    toast.success(`${imported.length} campaigns imported`);
  };

  const handleSaveTask = (nextTask: CampaignTeamTask) => {
    if (!taskModalState) {
      return;
    }

    const campaign = opsCampaigns.find((item) => item.id === taskModalState.campaignId);

    setOpsCampaigns((current: OpsCampaign[]) =>
      current.map((campaign) => {
        if (campaign.id !== taskModalState.campaignId) {
          return campaign;
        }

        const teamPlans = campaign.teamPlans.map((plan) => {
          const withoutTask = plan.tasks.filter((task) => task.id !== nextTask.id);
          if (plan.teamId === nextTask.teamId) {
            return {
              ...plan,
              tasks: [nextTask, ...withoutTask],
            };
          }
          return {
            ...plan,
            tasks: withoutTask,
          };
        });

        return {
          ...campaign,
          updatedAt: new Date().toISOString(),
          teamPlans,
        };
      }),
    );

    if (campaign) {
      setTaskNotifications((current: any[]) =>
        appendAssignmentNotification({
          currentNotifications: current,
          previousTask: taskModalState.task,
          nextTask,
          campaignId: campaign.id,
          campaignName: campaign.name,
          assignedBy: userEmail,
        }),
      );
    }

    toast.success(taskModalState.task ? 'Task updated' : 'Task added');
    setTaskModalState(null);
  };

  const handleDeleteTask = (campaignId: string, teamId: string, taskId: string) => {
    setOpsCampaigns((current: OpsCampaign[]) =>
      current.map((campaign) => {
        if (campaign.id !== campaignId) {
          return campaign;
        }

        return {
          ...campaign,
          updatedAt: new Date().toISOString(),
          teamPlans: campaign.teamPlans.map((plan) => {
            if (plan.teamId !== teamId) {
              return plan;
            }

            return {
              ...plan,
              tasks: plan.tasks.filter((task) => task.id !== taskId),
            };
          }),
        };
      }),
    );
  };

  return (
    <div className="px-4 py-6 md:px-6">
      <div className="mx-auto max-w-screen-2xl space-y-6">
        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">Campaign Operations Matrix</p>
              <h1 className="mt-2 text-3xl font-black text-zinc-900 dark:text-zinc-100">
                Every campaign now carries editable subtasks for every team
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-zinc-500">
                Create a campaign once, then manage assignments, reassignment, and progress team by team from the same shared structure.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setBulkUploadOpen(true)}
                className="rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-sm font-bold text-zinc-700 transition-all hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Bulk Upload
              </button>
              <button
                onClick={() => {
                  setEditingCampaign(undefined);
                  setCampaignModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
              >
                <Plus className="h-4 w-4" />
                New Campaign
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <SummaryCard label="Campaigns" value={stats.campaigns} icon={BriefcaseBusiness} />
            <SummaryCard label="Active" value={stats.active} icon={Layers3} />
            <SummaryCard label="Team Lanes" value={stats.teamsCovered} icon={Users} />
            <SummaryCard label="Subtasks" value={stats.tasks} icon={Globe2} />
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-[1.5fr,repeat(3,minmax(0,1fr))]">
            <label className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
              <Search className="h-4 w-4 text-zinc-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search campaign, client, or owner"
                className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
              />
            </label>

            <SelectFilter value={statusFilter} onChange={setStatusFilter} label="Status" options={['All', ...CAMPAIGN_STATUSES]} />
            <SelectFilter value={phaseFilter} onChange={setPhaseFilter} label="Phase" options={['All', ...CAMPAIGN_PHASES]} />
            <SelectFilter value={marketFilter} onChange={setMarketFilter} label="Market" options={['All', ...MARKETS]} />
          </div>

          <div className="mt-4">
            <DateRangeFilter label="Campaign Date Range" value={dateRange} onChange={setDateRange} />
          </div>
        </section>

        <div className="space-y-4">
          {filteredCampaigns.map((campaign) => {
            const expanded = expandedCampaigns.includes(campaign.id);
            const progress = getCampaignProgress(campaign);

            const progressBarColor = campaignConfig.progressBarColors
              ? progress.completionRate >= 75
                ? 'bg-emerald-500'
                : progress.completionRate >= 40
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              : 'bg-zinc-900 dark:bg-zinc-100';

            return (
              <motion.section
                key={campaign.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex flex-col gap-4 p-6 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => toggleExpanded(campaign.id)}
                        className="rounded-2xl bg-zinc-100 p-2 text-zinc-600 transition-all hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                      >
                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <h2 className="truncate text-2xl font-black text-zinc-900 dark:text-zinc-100">{campaign.name}</h2>
                      <StatusBadge status={campaign.status} />
                      <MutedBadge>{campaign.currentPhase}</MutedBadge>
                      <PriorityBadge priority={campaign.priority} />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-zinc-500">
                      <span>{campaign.client || 'No client set'}</span>
                      <span>{campaign.market}</span>
                      <span>{campaign.owner || 'No owner assigned'}</span>
                      <span>{campaign.teamPlans.filter((p) => !disabledTeams.includes(p.teamId)).length} teams</span>
                    </div>

                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between text-xs font-bold text-zinc-500">
                        <span>Cross-team completion</span>
                        <span>
                          {progress.done}/{progress.total} done · {progress.completionRate}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className={`h-2 rounded-full transition-all ${progressBarColor}`}
                          style={{ width: `${progress.completionRate}%` }}
                        />
                      </div>
                    </div>

                    {campaignConfig.showCriteriaMethodology && (campaign.criteria || campaign.methodology) && (
                      <div className="mt-5 grid gap-3 rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-2">
                        {campaign.criteria && (
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Criteria</div>
                            <p className="mt-1 text-zinc-600 dark:text-zinc-300">{campaign.criteria}</p>
                          </div>
                        )}
                        {campaign.methodology && (
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Methodology</div>
                            <p className="mt-1 text-zinc-600 dark:text-zinc-300">{campaign.methodology}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-start gap-2 xl:flex-col xl:items-end">
                    <button
                      onClick={() => {
                        setEditingCampaign(campaign);
                        setCampaignModalOpen(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-2.5 text-sm font-bold text-zinc-700 transition-all hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        setTaskModalState({
                          campaignId: campaign.id,
                          defaultTeamId: campaign.teamPlans.find((p) => !disabledTeams.includes(p.teamId))?.teamId || enabledTeams[0]?.id || OPERATIONS_TEAMS[0].id,
                        })
                      }
                      className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-2.5 text-sm font-bold text-zinc-700 transition-all hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <Plus className="h-4 w-4" />
                      Add Task
                    </button>
                    <button
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      onBlur={() => setDeleteConfirmId(null)}
                      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all ${
                        deleteConfirmId === campaign.id
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40'
                      }`}
                    >
                      {deleteConfirmId === campaign.id
                        ? <><AlertTriangle className="h-4 w-4" /> Confirm?</>
                        : <><Trash2 className="h-4 w-4" /> Delete</>
                      }
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-zinc-200 px-6 pb-6 dark:border-zinc-800"
                    >
                      <div className="mt-6 grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                        {campaign.teamPlans.filter((plan) => !disabledTeams.includes(plan.teamId)).map((plan) => {
                          const done = plan.tasks.filter((task) => task.status === 'Done').length;
                          const percent = plan.tasks.length > 0 ? Math.round((done / plan.tasks.length) * 100) : 0;

                          return (
                            <div
                              key={plan.teamId}
                              className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">{plan.teamName}</h3>
                                  <p className="mt-1 text-xs text-zinc-500">{plan.summary}</p>
                                </div>
                                <button
                                  onClick={() =>
                                    setTaskModalState({
                                      campaignId: campaign.id,
                                      defaultTeamId: plan.teamId,
                                    })
                                  }
                                  className="rounded-2xl bg-zinc-900 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
                                >
                                  Add
                                </button>
                              </div>

                              <div className="mt-4">
                                <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                                  <span>Progress</span>
                                  <span>{done}/{plan.tasks.length} · {percent}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-white dark:bg-black">
                                  <div
                                    className={`h-2 rounded-full transition-all ${
                                      campaignConfig.progressBarColors
                                        ? percent >= 75 ? 'bg-emerald-500' : percent >= 40 ? 'bg-amber-500' : 'bg-red-500'
                                        : 'bg-zinc-900 dark:bg-zinc-100'
                                    }`}
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                              </div>

                              <div className="mt-4 space-y-3">
                                {plan.tasks.map((task) => (
                                  <div
                                    key={task.id}
                                    className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-black text-zinc-900 dark:text-zinc-100">{task.title}</p>
                                        <p className="mt-1 text-xs text-zinc-500">{task.description || 'No description yet'}</p>
                                        {(task.metricTarget || task.metricCON || task.metricCOV) && (
                                          <div className="mt-2 space-y-1 text-[11px] text-zinc-500">
                                            {task.metricTarget > 0 && <p><span className="font-bold text-zinc-700 dark:text-zinc-300">Target:</span> {task.metricTarget}</p>}
                                            {task.metricCON > 0 && <p><span className="font-bold text-zinc-700 dark:text-zinc-300">Confirmations:</span> {task.metricCON}</p>}
                                            {task.metricCOV > 0 && <p><span className="font-bold text-zinc-700 dark:text-zinc-300">Coverage:</span> {task.metricCOV}</p>}
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() =>
                                            setTaskModalState({
                                              campaignId: campaign.id,
                                              defaultTeamId: plan.teamId,
                                              task,
                                            })
                                          }
                                          className="rounded-xl p-2 text-zinc-500 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteTask(campaign.id, plan.teamId, task.id)}
                                          className="rounded-xl p-2 text-zinc-500 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <MutedBadge>{task.status}</MutedBadge>
                                      <PriorityBadge priority={task.priority} />
                                      <MutedBadge>{getAssigneeLabel(task, plan.teamName)}</MutedBadge>
                                      {task.dueDate && <MutedBadge>Due {task.dueDate}</MutedBadge>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>
            );
          })}

          {filteredCampaigns.length === 0 && (
            <div className="rounded-[2rem] border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-950">
              <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100">No campaigns matched the current filters</h3>
              <p className="mt-2 text-sm text-zinc-500">Adjust the filters or create a new campaign to auto-generate team subtasks.</p>
            </div>
          )}
        </div>
      </div>

      <CampaignEditorModal
        isOpen={campaignModalOpen}
        campaign={editingCampaign}
        onClose={() => {
          setCampaignModalOpen(false);
          setEditingCampaign(undefined);
        }}
        onSave={handleSaveCampaign}
      />

      <TaskEditorModal
        isOpen={Boolean(taskModalState)}
        task={taskModalState?.task}
        defaultTeamId={taskModalState?.defaultTeamId || OPERATIONS_TEAMS[0].id}
        teamMembers={teamMembers}
        onClose={() => setTaskModalState(null)}
        onSave={handleSaveTask}
      />

      {bulkUploadOpen && (
        <React.Suspense fallback={null}>
          <LazyCampaignBulkUpload
            isOpen={bulkUploadOpen}
            onClose={() => setBulkUploadOpen(false)}
            onImport={handleBulkImport}
            existingCount={opsCampaigns.length}
          />
        </React.Suspense>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">{label}</p>
        <Icon className="h-5 w-5 text-zinc-500" />
      </div>
      <p className="mt-4 text-3xl font-black text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  );
}

function SelectFilter({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: readonly string[];
}) {
  return (
    <label className="block text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-bold normal-case tracking-normal text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    Active:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    Planning:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Paused:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'On Hold': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    Completed: 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300',
    Cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };
  const cls = colorMap[status] ?? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black';
  return (
    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${cls}`}>
      {status}
    </span>
  );
}

function MutedBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
      {children}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const className =
    priority === 'Critical' || priority === 'High'
      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black'
      : priority === 'Medium'
        ? 'bg-zinc-300 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200'
        : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400';

  return (
    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${className}`}>
      {priority}
    </span>
  );
}
