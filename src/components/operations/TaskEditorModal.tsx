import React from 'react';
import { useForm } from 'react-hook-form';
import { AnimatePresence, motion } from 'framer-motion';
import { Save, X } from 'lucide-react';
import {
  OPERATIONS_TEAMS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  createCampaignTask,
  type CampaignTeamTask,
  type TaskPriority,
  type TaskStatus,
  type AssignmentMode,
} from '../../lib/operations';

type TaskFormValues = {
  teamId: string;
  title: string;
  description: string;
  metricTarget: number;
  metricCON: number;
  metricCOV: number;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assignmentMode: AssignmentMode;
  assigneeEmail: string;
  notes: string;
};

interface TaskEditorModalProps {
  isOpen: boolean;
  title?: string;
  task?: CampaignTeamTask;
  defaultTeamId: string;
  teamMembers: Array<{ email: string; name: string; teamName?: string }>;
  availableTeams?: Array<{ id: string; name: string }>;
  hideTeamField?: boolean;
  onClose: () => void;
  onSave: (task: CampaignTeamTask, previousTeamId?: string) => void;
}

export function TaskEditorModal({
  isOpen,
  title,
  task,
  defaultTeamId,
  teamMembers,
  availableTeams,
  hideTeamField = false,
  onClose,
  onSave,
}: TaskEditorModalProps) {
  const dialogRef = React.useRef<HTMLDivElement | null>(null);

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

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      dialogRef.current?.scrollIntoView({ block: 'start', inline: 'nearest' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  const teamOptions = availableTeams || OPERATIONS_TEAMS;
  const defaults = React.useMemo(() => {
    const base = createCampaignTask(defaultTeamId, task);
    return {
      teamId: base.teamId,
      title: base.title,
      description: base.description,
      metricTarget: base.metricTarget,
      metricCON: base.metricCON,
      metricCOV: base.metricCOV,
      status: base.status,
      priority: base.priority,
      dueDate: base.dueDate,
      assignmentMode: base.assignmentMode,
      assigneeEmail: base.assignedToEmail,
      notes: base.notes,
    } satisfies TaskFormValues;
  }, [defaultTeamId, task]);

  const { register, handleSubmit, watch, reset } = useForm<TaskFormValues>({
    values: defaults,
  });

  React.useEffect(() => {
    if (isOpen) {
      reset(defaults);
    }
  }, [defaults, isOpen, reset]);

  const selectedTeamId = watch('teamId');
  const assignmentMode = watch('assignmentMode');

  const submit = handleSubmit((values) => {
    const assignee = teamMembers.find((member) => member.email === values.assigneeEmail);
    const now = new Date().toISOString();

    const nextTask = createCampaignTask(values.teamId, {
      ...task,
      title: values.title.trim(),
      description: values.description.trim(),
      criteria: undefined,
      methodology: undefined,
      metricTarget: values.metricTarget || 0,
      metricCON: values.metricCON || 0,
      metricCOV: values.metricCOV || 0,
      status: values.status,
      priority: values.priority,
      dueDate: values.dueDate,
      assignmentMode: values.assignmentMode,
      assignedTeamId: values.assignmentMode === 'team' ? values.teamId : values.assignmentMode === 'person' ? values.teamId : '',
      assignedToName: values.assignmentMode === 'person' ? assignee?.name || '' : '',
      assignedToEmail: values.assignmentMode === 'person' ? assignee?.email || '' : '',
      notes: values.notes.trim(),
      createdAt: task?.createdAt || now,
      updatedAt: now,
    });

    onSave(nextTask, task?.teamId);
    onClose();
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-6"
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="my-4 flex min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 sm:my-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
              <div>
                <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100">
                  {title || (task ? 'Edit Operational Task' : 'Add Operational Task')}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">Editable team task with reassignment support.</p>
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
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6 overscroll-contain max-h-[calc(100vh-15rem)] sm:max-h-[calc(100vh-17rem)]">
              <div className="grid gap-5 md:grid-cols-2">
                {!hideTeamField && (
                  <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                    Team
                    <select
                      {...register('teamId')}
                      className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      {teamOptions.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  Assignment Mode
                  <select
                    {...register('assignmentMode')}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    <option value="team">Assigned to Team</option>
                    <option value="person">Assigned to Person</option>
                    <option value="unassigned">Unassigned</option>
                  </select>
                </label>
              </div>

              <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                Task Title
                <input
                  {...register('title', { required: true })}
                  className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  placeholder="Campaign task title"
                />
              </label>

              <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                Description
                <textarea
                  {...register('description')}
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  placeholder="What should this team deliver?"
                />
              </label>

              <div className="grid gap-5 md:grid-cols-3">
                <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  Target
                  <input
                    type="number"
                    min="0"
                    {...register('metricTarget', { valueAsNumber: true })}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    placeholder="0"
                  />
                </label>

                <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  Confirmations
                  <input
                    type="number"
                    min="0"
                    {...register('metricCON', { valueAsNumber: true })}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    placeholder="0"
                  />
                </label>

                <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  Coverage
                  <input
                    type="number"
                    min="0"
                    {...register('metricCOV', { valueAsNumber: true })}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    placeholder="0"
                  />
                </label>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  Status
                  <select
                    {...register('status')}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {TASK_STATUSES.map((status) => (
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
                  Due Date
                  <input
                    type="date"
                    {...register('dueDate')}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </label>
              </div>

              {assignmentMode === 'person' && (
                <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  Specific Person
                  <select
                    {...register('assigneeEmail')}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    <option value="">Select a team member</option>
                    {teamMembers.map((member) => (
                      <option key={member.email} value={member.email}>
                        {member.name}{member.teamName ? ` - ${member.teamName}` : ''} ({member.email})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {assignmentMode === 'team' && (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                  This task will stay assigned to the <span className="font-bold text-zinc-900 dark:text-zinc-100">{teamOptions.find((team) => team.id === selectedTeamId)?.name}</span> team.
                </div>
              )}

              <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                Notes
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  placeholder="Dependencies, blockers, or handover notes"
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
                  Save Task
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
