import React from 'react';
import { useForm } from 'react-hook-form';
import { AnimatePresence, motion } from 'framer-motion';
import { Save, X } from 'lucide-react';
import {
  CAMPAIGN_PHASES,
  CAMPAIGN_STATUSES,
  MARKETS,
  TASK_PRIORITIES,
  createOpsCampaign,
  type OpsCampaign,
  type CampaignPhase,
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

  const submit = handleSubmit((values) => {
    const nextCampaign = createOpsCampaign({
      ...campaign,
      ...values,
      budget: Number(values.budget) || 0,
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
                  Every new campaign is auto-distributed across all operations teams.
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
