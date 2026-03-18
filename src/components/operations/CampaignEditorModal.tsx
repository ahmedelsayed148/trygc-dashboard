import React from 'react';
import { useForm } from 'react-hook-form';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Save, Trash2, X } from 'lucide-react';
import {
  CAMPAIGN_PHASES,
  CAMPAIGN_STATUSES,
  MARKETS,
  OPERATIONS_TEAMS,
  TASK_PRIORITIES,
  createCampaignTask,
  createOpsCampaign,
  type OpsCampaign,
  type CampaignPhase,
  type CampaignTeamPlan,
  type CampaignStatus,
  type TaskPriority,
} from '../../lib/operations';

type CampaignFormValues = {
  name: string;
  client: string;
  criteria: string;
  methodology: string;
  market: string;
  budget: number;
  startDate: string;
  endDate: string;
  status: CampaignStatus;
  priority: TaskPriority;
  currentPhase: CampaignPhase;
  owner: string;
  notes: string;
};

interface CampaignEditorModalProps {
  isOpen: boolean;
  campaign?: OpsCampaign;
  onClose: () => void;
  onSave: (campaign: OpsCampaign) => void;
}

export function CampaignEditorModal({
  isOpen,
  campaign,
  onClose,
  onSave,
}: CampaignEditorModalProps) {
  React.useEffect(() => {
    if (!isOpen || typeof document === 'undefined') {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

  const defaults = React.useMemo(
    () =>
      ({
        name: campaign?.name || '',
        client: campaign?.client || '',
        criteria: campaign?.criteria || '',
        methodology: campaign?.methodology || '',
        market: campaign?.market || 'EGY',
        budget: campaign?.budget || 0,
        startDate: campaign?.startDate || '',
        endDate: campaign?.endDate || '',
        status: campaign?.status || 'Planning',
        priority: campaign?.priority || 'Medium',
        currentPhase: campaign?.currentPhase || 'Planning',
        owner: campaign?.owner || '',
        notes: campaign?.notes || '',
      }) satisfies CampaignFormValues,
    [campaign],
  );

  const { register, handleSubmit, reset } = useForm<CampaignFormValues>({
    values: defaults,
  });

  React.useEffect(() => {
    if (isOpen) {
      reset(defaults);
    }
  }, [defaults, isOpen, reset]);

  const [selectedTeamIds, setSelectedTeamIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const currentTeamIds = campaign?.teamPlans?.map((plan) => plan.teamId) || [];
    setSelectedTeamIds(currentTeamIds.length > 0 ? currentTeamIds : OPERATIONS_TEAMS.map((team) => team.id));
  }, [campaign, isOpen]);

  const submit = handleSubmit((values) => {
    const preservedPlans = new Map<string, CampaignTeamPlan>(
      (campaign?.teamPlans || []).map((plan) => [plan.teamId, plan]),
    );
    const nextTeamPlans: CampaignTeamPlan[] = selectedTeamIds.map((teamId) => {
      const teamDefinition = OPERATIONS_TEAMS.find((team) => team.id === teamId);
      const existing = preservedPlans.get(teamId);
      if (existing) {
        return existing;
      }

      return {
        teamId,
        teamName: teamDefinition?.name || teamId,
        summary: teamDefinition?.description || '',
        tasks: (teamDefinition?.defaultTasks || []).map((template) =>
          createCampaignTask(teamId, {
            title: template.title,
            description: template.description.replace('{campaign}', values.name),
            priority: template.priority || 'Medium',
            dueDate: values.startDate,
            assignmentMode: 'team',
            assignedTeamId: teamId,
          }),
        ),
      };
    });

    const nextCampaign = createOpsCampaign({
      ...campaign,
      ...values,
      budget: Number(values.budget) || 0,
      teamPlans: nextTeamPlans,
      updatedAt: new Date().toISOString(),
    });

    onSave(nextCampaign);
    onClose();
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
              <div>
                <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100">
                  {campaign ? 'Edit Campaign' : 'New Campaign'}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Add or remove campaign teams, then manage subtasks only for selected teams.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl p-2 text-zinc-500 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300 md:col-span-2">
                  Campaign Name
                  <input
                    {...register('name', { required: true })}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    placeholder="Ramadan Activation - GCC"
                  />
                </label>

                <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  Client / Brand
                  <input
                    {...register('client')}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </label>

                <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  Owner
                  <input
                    {...register('owner')}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </label>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  Campaign Criteria
                  <textarea
                    {...register('criteria')}
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    placeholder="Overall campaign criteria, targeting rules, or acceptance conditions"
                  />
                </label>

                <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  Methodology
                  <textarea
                    {...register('methodology')}
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    placeholder="How the campaign should be executed, validated, and managed across teams"
                  />
                </label>
              </div>

              <div className="grid gap-5 md:grid-cols-4">
                <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  Market
                  <select
                    {...register('market')}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {MARKETS.map((market) => (
                      <option key={market} value={market}>
                        {market}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  Status
                  <select
                    {...register('status')}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {CAMPAIGN_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  Priority
                  <select
                    {...register('priority')}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {TASK_PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  Phase
                  <select
                    {...register('currentPhase')}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {CAMPAIGN_PHASES.map((phase) => (
                      <option key={phase} value={phase}>
                        {phase}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  Budget
                  <input
                    type="number"
                    {...register('budget', { valueAsNumber: true })}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </label>

                <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  Start Date
                  <input
                    type="date"
                    {...register('startDate')}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </label>

                <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  End Date
                  <input
                    type="date"
                    {...register('endDate')}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </label>
              </div>

              <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                Notes
                <textarea
                  {...register('notes')}
                  rows={4}
                  className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  placeholder="Campaign brief, risks, handover notes, client requirements"
                />
              </label>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Campaign Teams</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">Select teams that should exist in this campaign.</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTeamIds(OPERATIONS_TEAMS.map((team) => team.id))}
                      className="inline-flex items-center gap-1 rounded-xl border border-zinc-300 px-3 py-1.5 text-xs font-bold text-zinc-700 transition-all hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add all
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTeamIds([])}
                      className="inline-flex items-center gap-1 rounded-xl border border-zinc-300 px-3 py-1.5 text-xs font-bold text-zinc-700 transition-all hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove all
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {OPERATIONS_TEAMS.map((team) => {
                    const selected = selectedTeamIds.includes(team.id);
                    return (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() =>
                          setSelectedTeamIds((current) =>
                            current.includes(team.id)
                              ? current.filter((id) => id !== team.id)
                              : [...current, team.id],
                          )
                        }
                        className={`rounded-xl border px-3 py-2 text-left transition-all ${
                          selected
                            ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-black'
                            : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <div className="text-xs font-black uppercase tracking-[0.16em]">{team.name}</div>
                        <div className={`mt-1 text-[11px] ${selected ? 'opacity-85' : 'text-zinc-500 dark:text-zinc-400'}`}>{team.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              </div>

              <div className="flex shrink-0 justify-end gap-3 border-t border-zinc-200 bg-white px-6 py-5 dark:border-zinc-800 dark:bg-zinc-950">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl bg-zinc-100 px-5 py-3 text-sm font-bold text-zinc-700 transition-all hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
                >
                  <Save className="h-4 w-4" />
                  Save Campaign
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
