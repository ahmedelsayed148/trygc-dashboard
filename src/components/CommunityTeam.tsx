import React, { useCallback, useContext, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronRight,
  Globe2,
  Layers3,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';
import { AppContext } from './Root';
import { DateRangeFilter } from './DateRangeFilter';
import { TaskEditorModal } from './operations/TaskEditorModal';
import { apiRequest } from '../lib/api';
import {
  TASK_STATUSES,
  getAssigneeLabel,
  type CampaignTeamTask,
  type TaskStatus,
} from '../lib/operations';
import { createAssignmentNotification } from '../lib/taskNotifications';
import {
  COMMUNITY_TEAM,
  COUNTRIES,
  createEmptyCommunityWorkspace,
  normalizeCommunityWorkspace,
  type ChecklistItem,
  type CommunityChecklistSection,
  type CommunityWorkspace,
} from '../lib/communityWorkspace';
import { emptyDateRange, filterByDateRange } from '../lib/dateFilters';
import { createAssignmentAlertPayload, publishWorkspaceAlert } from '../lib/realtimeAlerts';

type TaskModalState = {
  countryId: string;
  task?: CampaignTeamTask;
} | null;

function getTaskProgress(tasks: CampaignTeamTask[]) {
  const total = tasks.length;
  const done = tasks.filter((task) => task.status === 'Done').length;
  const blocked = tasks.filter((task) => task.status === 'Blocked').length;
  const assigned = tasks.filter((task) => task.assignmentMode !== 'unassigned').length;

  return {
    total,
    done,
    blocked,
    assigned,
    completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
  };
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
    <div className="app-hero-stat rounded-[1.75rem] border p-5">
      <div className="flex items-center justify-between">
        <p className="app-hero-kicker text-xs font-black uppercase tracking-[0.24em]">{label}</p>
        <Icon className="h-5 w-5 app-hero-kicker" />
      </div>
      <p className="app-hero-title mt-4 text-3xl font-black">{value}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
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

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-zinc-900 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white dark:bg-zinc-100 dark:text-black">
      {children}
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

type ChecklistEditState = { sectionId: string; itemId: string; field: 'text' | 'notes' } | null;
type TeamMemberOption = { email: string; name?: string; teamName?: string };
type TaskNotificationRecord = {
  id: string;
  type: string;
  taskId: string;
  taskName: string;
  taskDescription: string;
  assignedTo: string;
  assignedToName: string;
  assignedBy: string;
  timestamp: string;
  time: string;
  date: string;
  read: boolean;
};
const EMPTY_TEAM_MEMBERS: Array<{ email: string; name?: string; teamName?: string }> = [];
const NOOP_SET_TASK_NOTIFICATIONS: React.Dispatch<React.SetStateAction<TaskNotificationRecord[]>> = () => undefined;
const NOOP_SET_COMMUNITY_WORKSPACE: React.Dispatch<React.SetStateAction<CommunityWorkspace>> = () => undefined;

function ChecklistItemRow({
  item,
  index,
  platformMembers,
  isEditingText,
  isEditingNotes,
  editValue,
  onEditValueChange,
  onToggleCheck,
  onStartEditText,
  onStartEditNotes,
  onCommitEdit,
  onCancelEdit,
  onAssign,
  onDueDateChange,
  onDelete,
}: {
  item: ChecklistItem;
  index: number;
  platformMembers: { email: string; name: string }[];
  isEditingText: boolean;
  isEditingNotes: boolean;
  editValue: string;
  onEditValueChange: (v: string) => void;
  onToggleCheck: () => void;
  onStartEditText: () => void;
  onStartEditNotes: () => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onAssign: (email: string) => void;
  onDueDateChange: (date: string) => void;
  onDelete: () => void;
}) {
  return (
    <div className={`rounded-2xl border p-4 transition-colors ${item.checked ? 'border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/50' : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950'}`}>
      <div className="flex items-start gap-3">
        {/* Index + checkbox */}
        <div className="flex flex-shrink-0 items-center gap-2 pt-0.5">
          <span className="w-5 text-right text-xs font-bold text-zinc-400">{index}.</span>
          <button
            onClick={onToggleCheck}
            className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all ${item.checked ? 'border-zinc-900 bg-zinc-900 dark:border-zinc-100 dark:bg-zinc-100' : 'border-zinc-300 bg-transparent hover:border-zinc-500 dark:border-zinc-600'}`}
          >
            {item.checked && <Check className="h-3 w-3 text-white dark:text-black" />}
          </button>
        </div>

        {/* Text + notes */}
        <div className="min-w-0 flex-1">
          {isEditingText ? (
            <textarea
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              onBlur={onCommitEdit}
              onKeyDown={(e) => { if (e.key === 'Escape') onCancelEdit(); }}
              rows={2}
              autoFocus
              className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            />
          ) : (
            <button
              onClick={onStartEditText}
              className={`block w-full text-left text-sm font-medium leading-relaxed ${item.checked ? 'text-zinc-400 line-through dark:text-zinc-500' : 'text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100'}`}
            >
              {item.text}
            </button>
          )}

          {isEditingNotes ? (
            <textarea
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              onBlur={onCommitEdit}
              onKeyDown={(e) => { if (e.key === 'Escape') onCancelEdit(); }}
              rows={2}
              autoFocus
              placeholder="Add notes..."
              className="mt-2 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 outline-none focus:border-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
            />
          ) : (
            <button
              onClick={onStartEditNotes}
              className="mt-1 block text-left text-xs text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              {item.notes ? item.notes : '+ Add note'}
            </button>
          )}

          {/* Assignee + due date row */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              value={item.assignedToEmail}
              onChange={(e) => onAssign(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs font-medium text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <option value="">Unassigned</option>
              {platformMembers.map((m) => (
                <option key={m.email} value={m.email}>{m.name}</option>
              ))}
            </select>

            <input
              type="date"
              value={item.dueDate}
              onChange={(e) => onDueDateChange(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs font-medium text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            />

            {item.assignedToName && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                {item.assignedToName}
              </span>
            )}
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="flex-shrink-0 rounded-xl p-1.5 text-zinc-400 transition-all hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function ChecklistsPanel({
  checklists,
  platformMembers,
  onUpdateChecklists,
}: {
  checklists: CommunityChecklistSection[];
  platformMembers: { email: string; name: string }[];
  onUpdateChecklists: (checklists: CommunityChecklistSection[]) => void;
}) {
  const [expandedSections, setExpandedSections] = useState<string[]>([checklists[0]?.id].filter(Boolean));
  const [editingItem, setEditingItem] = useState<ChecklistEditState>(null);
  const [editValue, setEditValue] = useState('');
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');

  const updateItem = useCallback((sectionId: string, itemId: string, changes: Partial<ChecklistItem>) => {
    onUpdateChecklists(
      checklists.map((section) =>
        section.id !== sectionId ? section : {
          ...section,
          items: section.items.map((item) =>
            item.id !== itemId ? item : { ...item, ...changes, updatedAt: new Date().toISOString() }
          ),
        }
      )
    );
  }, [checklists, onUpdateChecklists]);

  const toggleCheck = (sectionId: string, itemId: string) => {
    const item = checklists.find((s) => s.id === sectionId)?.items.find((i) => i.id === itemId);
    if (item) updateItem(sectionId, itemId, { checked: !item.checked });
  };

  const startEdit = (sectionId: string, itemId: string, field: 'text' | 'notes') => {
    const item = checklists.find((s) => s.id === sectionId)?.items.find((i) => i.id === itemId);
    if (item) {
      setEditingItem({ sectionId, itemId, field });
      setEditValue(field === 'text' ? item.text : item.notes);
    }
  };

  const commitEdit = () => {
    if (!editingItem) return;
    updateItem(editingItem.sectionId, editingItem.itemId, { [editingItem.field]: editValue });
    setEditingItem(null);
    setEditValue('');
  };

  const assignPerson = (sectionId: string, itemId: string, email: string) => {
    const member = platformMembers.find((m) => m.email === email);
    updateItem(sectionId, itemId, { assignedToEmail: email, assignedToName: member?.name || '' });
  };

  const addItem = (sectionId: string) => {
    const newId = `${sectionId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newItem: ChecklistItem = {
      id: newId,
      text: 'New item',
      checked: false,
      assignedToEmail: '',
      assignedToName: '',
      notes: '',
      dueDate: '',
      updatedAt: new Date().toISOString(),
    };
    onUpdateChecklists(
      checklists.map((section) =>
        section.id !== sectionId ? section : { ...section, items: [...section.items, newItem] }
      )
    );
    setTimeout(() => {
      setEditingItem({ sectionId, itemId: newId, field: 'text' });
      setEditValue('New item');
    }, 30);
  };

  const deleteItem = (sectionId: string, itemId: string) => {
    onUpdateChecklists(
      checklists.map((section) =>
        section.id !== sectionId ? section : { ...section, items: section.items.filter((i) => i.id !== itemId) }
      )
    );
  };

  const startEditTitle = (sectionId: string, title: string) => {
    setEditingTitleId(sectionId);
    setEditTitleValue(title);
  };

  const commitTitleEdit = (sectionId: string) => {
    onUpdateChecklists(
      checklists.map((section) => section.id !== sectionId ? section : { ...section, title: editTitleValue || section.title })
    );
    setEditingTitleId(null);
  };

  const addSection = () => {
    const newId = `custom-${Date.now()}`;
    const newSection: CommunityChecklistSection = {
      id: newId,
      title: 'New Checklist',
      description: '',
      items: [],
    };
    onUpdateChecklists([...checklists, newSection]);
    setExpandedSections((prev) => [...prev, newId]);
    setTimeout(() => {
      setEditingTitleId(newId);
      setEditTitleValue('New Checklist');
    }, 30);
  };

  const deleteSection = (sectionId: string) => {
    onUpdateChecklists(checklists.filter((s) => s.id !== sectionId));
  };

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  return (
    <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">Monitor & Follow Up</p>
          <h2 className="mt-2 text-2xl font-black text-zinc-900 dark:text-zinc-100">Community Checklists</h2>
          <p className="mt-1 text-sm text-zinc-500">Track, assign, and update your community team's recurring responsibilities. Click any item to edit it.</p>
        </div>
        <button
          onClick={addSection}
          className="flex-shrink-0 inline-flex items-center gap-2 rounded-2xl border border-dashed border-zinc-300 px-4 py-2.5 text-sm font-bold text-zinc-500 transition-all hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
        >
          <Plus className="h-4 w-4" />
          Add Section
        </button>
      </div>

      <div className="space-y-4">
        {checklists.map((section) => {
          const expanded = expandedSections.includes(section.id);
          const checkedCount = section.items.filter((i) => i.checked).length;
          const total = section.items.length;
          const pct = total > 0 ? Math.round((checkedCount / total) * 100) : 0;

          return (
            <div key={section.id} className="overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              {/* Section header */}
              <div className="flex items-center gap-3 px-5 py-4">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex-shrink-0 rounded-xl bg-zinc-100 p-2 text-zinc-600 transition-all hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>

                {editingTitleId === section.id ? (
                  <input
                    value={editTitleValue}
                    onChange={(e) => setEditTitleValue(e.target.value)}
                    onBlur={() => commitTitleEdit(section.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitTitleEdit(section.id); if (e.key === 'Escape') setEditingTitleId(null); }}
                    autoFocus
                    className="flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-1 text-lg font-black text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                ) : (
                  <button
                    onClick={() => startEditTitle(section.id, section.title)}
                    className="flex-1 text-left text-lg font-black text-zinc-900 transition-colors hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
                  >
                    {section.title}
                  </button>
                )}

                <span className="flex-shrink-0 text-sm font-bold text-zinc-500">{checkedCount}/{total}</span>
                <div className="hidden w-24 flex-shrink-0 sm:block">
                  <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <div className="h-2 rounded-full bg-zinc-900 transition-all dark:bg-zinc-100" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <button
                  onClick={() => deleteSection(section.id)}
                  className="flex-shrink-0 rounded-xl p-1.5 text-zinc-400 transition-all hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-zinc-200 px-5 pb-5 dark:border-zinc-800"
                  >
                    {section.description && (
                      <p className="mt-4 text-sm text-zinc-500">{section.description}</p>
                    )}
                    <div className="mt-4 space-y-3">
                      {section.items.map((item, idx) => (
                        <ChecklistItemRow
                          key={item.id}
                          item={item}
                          index={idx + 1}
                          platformMembers={platformMembers}
                          isEditingText={editingItem?.sectionId === section.id && editingItem?.itemId === item.id && editingItem?.field === 'text'}
                          isEditingNotes={editingItem?.sectionId === section.id && editingItem?.itemId === item.id && editingItem?.field === 'notes'}
                          editValue={editValue}
                          onEditValueChange={setEditValue}
                          onToggleCheck={() => toggleCheck(section.id, item.id)}
                          onStartEditText={() => startEdit(section.id, item.id, 'text')}
                          onStartEditNotes={() => startEdit(section.id, item.id, 'notes')}
                          onCommitEdit={commitEdit}
                          onCancelEdit={() => setEditingItem(null)}
                          onAssign={(email) => assignPerson(section.id, item.id, email)}
                          onDueDateChange={(date) => updateItem(section.id, item.id, { dueDate: date })}
                          onDelete={() => deleteItem(section.id, item.id)}
                        />
                      ))}
                    </div>

                    <button
                      onClick={() => addItem(section.id)}
                      className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-dashed border-zinc-300 px-4 py-2.5 text-sm font-bold text-zinc-500 transition-all hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
                    >
                      <Plus className="h-4 w-4" />
                      Add Item
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function CommunityTeam() {
  const ctx = useContext(AppContext);
  const teamMembers = ctx?.teamMembers ?? EMPTY_TEAM_MEMBERS;
  const userEmail = ctx?.userEmail || '';
  const setTaskNotifications = ctx?.setTaskNotifications ?? NOOP_SET_TASK_NOTIFICATIONS;
  const workspace = useMemo(
    () => normalizeCommunityWorkspace(ctx?.communityWorkspace || createEmptyCommunityWorkspace()),
    [ctx?.communityWorkspace],
  );
  const setCommunityWorkspace = ctx?.setCommunityWorkspace ?? NOOP_SET_COMMUNITY_WORKSPACE;
  const [saving, setSaving] = useState(false);
  const [expandedCountries, setExpandedCountries] = useState<string[]>([COUNTRIES[0].id]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | TaskStatus>('All');
  const [dateRange, setDateRange] = useState(emptyDateRange);
  const [taskModalState, setTaskModalState] = useState<TaskModalState>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const platformMembers = useMemo(() => {
    return teamMembers.map((member: TeamMemberOption) => ({
      email: member.email,
      name: member.name || member.email,
      teamName: member.teamName || '',
    }));
  }, [teamMembers]);

  const persistWorkspace = useCallback((nextWorkspace: CommunityWorkspace) => {
    setSaving(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await apiRequest('community-team-data', {
          method: 'POST',
          body: { data: nextWorkspace },
        });
      } catch (error) {
        console.error('Error saving community team workspace:', error);
      } finally {
        setSaving(false);
      }
    }, 800);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const updateWorkspace = useCallback((updater: CommunityWorkspace | ((current: CommunityWorkspace) => CommunityWorkspace)) => {
    setCommunityWorkspace((current: CommunityWorkspace) => {
      const currentWorkspace = normalizeCommunityWorkspace(current || createEmptyCommunityWorkspace());
      const nextWorkspace = typeof updater === 'function' ? updater(currentWorkspace) : updater;
      const normalizedNext = normalizeCommunityWorkspace({
        ...nextWorkspace,
        updatedAt: new Date().toISOString(),
      });
      persistWorkspace(normalizedNext);
      return normalizedNext;
    });
  }, [persistWorkspace, setCommunityWorkspace]);

  const handleUpdateChecklists = useCallback((checklists: CommunityChecklistSection[]) => {
    updateWorkspace((current) => ({ ...current, checklists }));
  }, [updateWorkspace]);

  const visibleCountries = useMemo(() => {
    return workspace.countries
      .map((country) => {
        const filteredTasks = country.tasks.filter((task) => {
          const matchesStatus = statusFilter === 'All' || task.status === statusFilter;
          const matchesSearch =
            !deferredSearch ||
            [
              country.name,
              country.marketCode,
              country.managerName,
              task.title,
              task.description,
              task.criteria,
              task.methodology,
              task.notes,
              getAssigneeLabel(task, COMMUNITY_TEAM.name),
            ].some((value) => value.toLowerCase().includes(deferredSearch));
          return matchesStatus && matchesSearch;
        });

        const dateFilteredTasks = filterByDateRange(
          filteredTasks,
          dateRange,
          (task) => task.dueDate || task.updatedAt || task.createdAt,
        );

        return { country, filteredTasks: dateFilteredTasks, progress: getTaskProgress(country.tasks) };
      })
      .filter(({ country, filteredTasks }) =>
        statusFilter !== 'All' || deferredSearch || dateRange.startDate || dateRange.endDate
          ? filteredTasks.length > 0 || country.name.toLowerCase().includes(deferredSearch)
          : true,
      );
  }, [dateRange, deferredSearch, statusFilter, workspace.countries]);

  const totals = useMemo(() => {
    const allTasks = workspace.countries.flatMap((country) => country.tasks);
    const progress = getTaskProgress(allTasks);
    return {
      markets: workspace.countries.length,
      managers: workspace.countries.filter((country) => country.managerName).length,
      ...progress,
    };
  }, [workspace.countries]);

  const toggleExpanded = (countryId: string) => {
    setExpandedCountries((current) =>
      current.includes(countryId) ? current.filter((value) => value !== countryId) : [...current, countryId],
    );
  };

  const handleManagerChange = (countryId: string, email: string) => {
    const member = platformMembers.find((item) => item.email === email);
    updateWorkspace((current) => ({
      ...current,
      countries: current.countries.map((country) =>
        country.id === countryId
          ? { ...country, managerEmail: member?.email || '', managerName: member?.name || '' }
          : country,
      ),
    }));
  };

  const handleSaveTask = (nextTask: CampaignTeamTask) => {
    if (!taskModalState) return;

    const country = workspace.countries.find((item) => item.id === taskModalState.countryId);

    updateWorkspace((current) => ({
      ...current,
      countries: current.countries.map((country) => {
        if (country.id !== taskModalState.countryId) return country;
        const withoutTask = country.tasks.filter((task) => task.id !== nextTask.id);
        return { ...country, tasks: [nextTask, ...withoutTask] };
      }),
    }));

    if (country) {
      const notification = createAssignmentNotification({
        previousTask: taskModalState.task,
        nextTask,
        campaignId: `community-${country.id}`,
        campaignName: `Community - ${country.name}`,
        assignedBy: userEmail,
      });

      if (notification) {
        setTaskNotifications((current: TaskNotificationRecord[]) => [notification, ...current]);
        void publishWorkspaceAlert(createAssignmentAlertPayload(notification));
      }
    }

    toast.success(taskModalState.task ? 'Community task updated' : 'Community task added');
    setTaskModalState(null);
  };

  const handleDeleteTask = (countryId: string, taskId: string) => {
    updateWorkspace((current) => ({
      ...current,
      countries: current.countries.map((country) => {
        if (country.id !== countryId) return country;
        if (country.tasks.length <= 1) {
          toast.error('Each market must keep at least one task');
          return country;
        }
        return { ...country, tasks: country.tasks.filter((task) => task.id !== taskId) };
      }),
    }));
  };

  return (
    <div className="px-4 py-6 md:px-6">
      <div className="mx-auto max-w-screen-2xl space-y-6">
        <section className="app-hero-panel rounded-[2rem] border p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="app-hero-kicker text-xs font-black uppercase tracking-[0.24em]">Community Operations Matrix</p>
              <h1 className="app-hero-title mt-2 text-3xl font-black">Community team distribution now follows the campaigns workflow</h1>
              <p className="app-hero-copy mt-2 max-w-3xl text-sm">Markets keep their own criteria and methodology playbooks while using the same shared assignment flow and task tracking model.</p>
            </div>
            {saving && (
              <div className="app-hero-stat inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-bold">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Saving
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <SummaryCard label="Markets" value={totals.markets} icon={Globe2} />
            <SummaryCard label="Managers Assigned" value={totals.managers} icon={Users} />
            <SummaryCard label="Assigned Tasks" value={totals.assigned} icon={UserRound} />
            <SummaryCard label="Completed" value={totals.done} icon={Layers3} />
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-[1.5fr,repeat(2,minmax(0,1fr))]">
            <label className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
              <Search className="h-4 w-4 text-zinc-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search market, manager, task, criteria, or methodology"
                className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
              />
            </label>
            <FilterSelect label="Status" value={statusFilter} onChange={(value) => setStatusFilter(value as 'All' | TaskStatus)} options={['All', ...TASK_STATUSES]} />
            <div className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">Completion</div>
                  <div className="mt-3 text-3xl font-black text-zinc-900 dark:text-zinc-100">{totals.completionRate}%</div>
                </div>
                <BriefcaseBusiness className="h-5 w-5 text-zinc-500" />
              </div>
              <div className="mt-4 h-2 rounded-full bg-white dark:bg-black">
                <div className="h-2 rounded-full bg-zinc-900 transition-all dark:bg-zinc-100" style={{ width: `${totals.completionRate}%` }} />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <DateRangeFilter label="Community Date Range" value={dateRange} onChange={setDateRange} />
          </div>
        </section>

        <ChecklistsPanel
          checklists={workspace.checklists}
          platformMembers={platformMembers}
          onUpdateChecklists={handleUpdateChecklists}
        />

        <div className="space-y-4">
          {visibleCountries.map(({ country, filteredTasks, progress }) => {
            const expanded = expandedCountries.includes(country.id);
            return (
              <motion.section key={country.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex flex-col gap-4 p-6 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => toggleExpanded(country.id)} className="rounded-2xl bg-zinc-100 p-2 text-zinc-600 transition-all hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700">
                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <h2 className="truncate text-2xl font-black text-zinc-900 dark:text-zinc-100">{country.name}</h2>
                      <Badge>{country.marketCode}</Badge>
                      <MutedBadge>{country.nameAr}</MutedBadge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-zinc-500">
                      <span>{country.managerName || 'No manager assigned'}</span>
                      <span>{progress.total} tasks</span>
                      <span>{progress.assigned} assigned</span>
                      <span>{progress.blocked} blocked</span>
                    </div>
                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between text-xs font-bold text-zinc-500">
                        <span>Market completion</span>
                        <span>{progress.done}/{progress.total} done</span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div className="h-2 rounded-full bg-zinc-900 transition-all dark:bg-zinc-100" style={{ width: `${progress.completionRate}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <label className="min-w-[220px] rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-sm font-bold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                      Manager
                      <select value={country.managerEmail} onChange={(event) => handleManagerChange(country.id, event.target.value)} className="mt-2 w-full bg-transparent text-sm font-medium text-zinc-900 outline-none dark:text-zinc-100">
                        <option value="">Unassigned</option>
                        {platformMembers.map((member) => (
                          <option key={member.email} value={member.email}>
                            {member.name}{member.teamName ? ` - ${member.teamName}` : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button onClick={() => setTaskModalState({ countryId: country.id })} className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200">
                      <Plus className="h-4 w-4" />
                      Add Task
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {expanded && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="border-t border-zinc-200 px-6 pb-6 dark:border-zinc-800">
                      <div className="mt-6 rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                        {country.summary}
                      </div>
                      <div className="mt-6 grid gap-4 xl:grid-cols-2">
                        {filteredTasks.map((task) => (
                          <div key={task.id} className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-lg font-black text-zinc-900 dark:text-zinc-100">{task.title}</p>
                                <p className="mt-1 text-sm text-zinc-500">{task.description || 'No description yet'}</p>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => setTaskModalState({ countryId: country.id, task })} className="rounded-xl p-2 text-zinc-500 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800"><Pencil className="h-4 w-4" /></button>
                                <button onClick={() => handleDeleteTask(country.id, task.id)} className="rounded-xl p-2 text-zinc-500 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800"><Trash2 className="h-4 w-4" /></button>
                              </div>
                            </div>
                            {(task.criteria || task.methodology) && (
                              <div className="mt-4 space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                                {task.criteria && <div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Criteria</div><p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{task.criteria}</p></div>}
                                {task.methodology && <div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Methodology</div><p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{task.methodology}</p></div>}
                              </div>
                            )}
                            <div className="mt-4 flex flex-wrap gap-2">
                              <MutedBadge>{task.status}</MutedBadge>
                              <PriorityBadge priority={task.priority} />
                              <MutedBadge>{getAssigneeLabel(task, COMMUNITY_TEAM.name)}</MutedBadge>
                              {task.dueDate && <MutedBadge>Due {task.dueDate}</MutedBadge>}
                            </div>
                            {task.notes && <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">{task.notes}</div>}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>
            );
          })}

          {visibleCountries.length === 0 && (
            <div className="rounded-[2rem] border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-950">
              <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100">No community tasks matched the current filters</h3>
              <p className="mt-2 text-sm text-zinc-500">Adjust the filters or open a market to add a new community task.</p>
            </div>
          )}
        </div>
      </div>

      <TaskEditorModal
        isOpen={Boolean(taskModalState)}
        title={taskModalState?.task ? 'Edit Community Task' : 'Add Community Task'}
        task={taskModalState?.task}
        defaultTeamId={COMMUNITY_TEAM.id}
        availableTeams={[COMMUNITY_TEAM]}
        hideTeamField
        teamMembers={platformMembers}
        onClose={() => setTaskModalState(null)}
        onSave={handleSaveTask}
      />
    </div>
  );
}
