import React, { useContext, useMemo, useState, useCallback } from 'react';
import { AppContext } from './Root';
import { PersonalDashboard as PersonalDashboardComponent } from './PersonalDashboard';
import {
  UploadCloud,
  Plus,
  X,
  Loader2,
  ChevronDown,
  FileSpreadsheet,
  ClipboardPlus,
  Save,
  TrendingUp,
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { isTaskAssignedToUser } from '../lib/operations';

const LazyXlsxUploader = React.lazy(() =>
  import('./XlsxUploader').then((module) => ({ default: module.XlsxUploader })),
);

const PRIORITY_OPTIONS = ['High', 'Medium', 'Low'];
const STATUS_OPTIONS = ['Pending', 'In Progress', 'Blocked', 'Done'];
const CATEGORY_OPTIONS = [
  'Operations',
  'Follow-up',
  'Quality & Audit',
  'Creative & Content',
  'Client Management',
  'Reporting & Analytics',
  'Tech & System',
];

const emptyTask = {
  campaign: '',
  description: '',
  priority: 'Medium',
  status: 'Pending',
  category: 'Operations',
  slaHrs: 24,
  metricTarget: 0,
  metricCON: 0,
  metricCOV: 0,
};

export function PersonalDashboard() {
  const ctx = useContext(AppContext);
  const legacyTasks = ctx?.tasks || [];
  const operationalTasks = ctx?.operationalTasks || [];
  const tasks = operationalTasks.length > 0 ? [...operationalTasks, ...legacyTasks] : legacyTasks;
  const setTasks = ctx?.setTasks;
  const setOpsCampaigns = ctx?.setOpsCampaigns;
  const userName = ctx?.userName || '';
  const userEmail = ctx?.userEmail || '';
  const successLogs = ctx?.successLogs || [];

  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ ...emptyTask });
  const [addingTask, setAddingTask] = useState(false);

  // Edit task state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const myTasks = useMemo(() => {
    return tasks.filter((t: any) => isTaskAssignedToUser(t, { userEmail, userName }));
  }, [tasks, userName, userEmail]);

  const handleEditTask = (task: any) => {
    setEditFormData({ ...task });
    setIsEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editFormData) return;
    setSavingEdit(true);

    const isOperationalTask = Boolean(editFormData.campaignId && editFormData.teamId);
    const now = new Date().toISOString();

    if (isOperationalTask && setOpsCampaigns) {
      setOpsCampaigns((prev: any[]) =>
        prev.map((campaign: any) => {
          if (campaign.id !== editFormData.campaignId) {
            return campaign;
          }

          return {
            ...campaign,
            updatedAt: now,
            teamPlans: campaign.teamPlans.map((plan: any) => {
              if (plan.teamId !== editFormData.teamId) {
                return plan;
              }

              return {
                ...plan,
                tasks: plan.tasks.map((task: any) => {
                  if (task.id !== editFormData.id) {
                    return task;
                  }

                  return {
                    ...task,
                    status: editFormData.status,
                    priority: editFormData.priority || task.priority,
                    notes: editFormData.notes ?? task.notes,
                    updatedAt: now,
                  };
                }),
              };
            }),
          };
        }),
      );
    } else if (setTasks) {
      setTasks((prev: any[]) =>
        prev.map((t: any) => {
          if (t.id === editFormData.id) {
            const endDateTime =
              editFormData.status === 'Done' && t.status !== 'Done'
                ? now
                : editFormData.status !== 'Done'
                ? undefined
                : t.endDateTime;
            return { ...t, ...editFormData, endDateTime };
          }
          return t;
        }),
      );
    }

    setTimeout(() => {
      setSavingEdit(false);
      setIsEditOpen(false);
      setEditFormData(null);
    }, 300);
  };

  const handleXlsxImport = useCallback(
    (importedTasks: any[]) => {
      const tagged = importedTasks.map((t: any) => ({
        ...t,
        assignedTo: t.assignedTo || userName,
      }));
      if (setTasks) {
        setTasks((prev: any[]) => [...prev, ...tagged]);
      }
    },
    [setTasks, userName]
  );

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.description.trim()) return;
    setAddingTask(true);

    const task = {
      id: Date.now() + Math.random(),
      ...newTask,
      assignedTo: userName,
      startDateTime: new Date().toISOString(),
      location: '',
      channel: '',
      deliverable: '',
      metricMissingDate: 0,
      metricWithDate: 0,
      metricMissingCOV: 0,
      metricConfirmationToday: 0,
    };

    if (setTasks) {
      setTasks((prev: any[]) => [...prev, task]);
    }

    setNewTask({ ...emptyTask });
    setShowAddTask(false);
    setAddingTask(false);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header with action buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-zinc-800 dark:text-zinc-100 mb-2">
            My Dashboard
          </h1>
          <p className="text-zinc-500 font-medium">
            Personal task overview and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddTask(!showAddTask)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold transition-all text-sm ${
              showAddTask
                ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                : 'bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200'
            }`}
          >
            {showAddTask ? (
              <X className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {showAddTask ? 'Cancel' : 'Add Task'}
          </button>
          <button
            onClick={() => setIsUploaderOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-2xl font-bold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all text-sm"
          >
            <UploadCloud className="w-4 h-4" />
            Upload XLSX
          </button>
        </div>
      </div>

      {/* Add Task Form */}
      {showAddTask && (
        <div className="bg-white dark:bg-zinc-950 rounded-3xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in slide-in-from-top-2 duration-200">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex items-center gap-3">
            <div className="p-2.5 bg-zinc-200 dark:bg-zinc-700 rounded-xl">
              <ClipboardPlus className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-800 dark:text-zinc-100">
                Add New Task
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                Task will be assigned to you automatically
              </p>
            </div>
          </div>
          <form onSubmit={handleAddTask} className="p-6 space-y-5">
            {/* Row 1: Campaign & Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black uppercase text-zinc-400 dark:text-zinc-500 mb-1.5 block tracking-wider">
                  Campaign
                </label>
                <input
                  type="text"
                  value={newTask.campaign}
                  onChange={(e) =>
                    setNewTask({ ...newTask, campaign: e.target.value })
                  }
                  placeholder="Campaign name"
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-black dark:focus:border-white font-medium text-zinc-800 dark:text-zinc-200 text-sm transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase text-zinc-400 dark:text-zinc-500 mb-1.5 block tracking-wider">
                  Description *
                </label>
                <input
                  type="text"
                  required
                  value={newTask.description}
                  onChange={(e) =>
                    setNewTask({ ...newTask, description: e.target.value })
                  }
                  placeholder="What needs to be done?"
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-black dark:focus:border-white font-medium text-zinc-800 dark:text-zinc-200 text-sm transition-colors"
                />
              </div>
            </div>

            {/* Row 2: Priority, Status, Category */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-black uppercase text-zinc-400 dark:text-zinc-500 mb-1.5 block tracking-wider">
                  Priority
                </label>
                <div className="relative">
                  <select
                    value={newTask.priority}
                    onChange={(e) =>
                      setNewTask({ ...newTask, priority: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-black dark:focus:border-white font-medium text-zinc-800 dark:text-zinc-200 text-sm appearance-none transition-colors"
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-black uppercase text-zinc-400 dark:text-zinc-500 mb-1.5 block tracking-wider">
                  Status
                </label>
                <div className="relative">
                  <select
                    value={newTask.status}
                    onChange={(e) =>
                      setNewTask({ ...newTask, status: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-black dark:focus:border-white font-medium text-zinc-800 dark:text-zinc-200 text-sm appearance-none transition-colors"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-black uppercase text-zinc-400 dark:text-zinc-500 mb-1.5 block tracking-wider">
                  Category
                </label>
                <div className="relative">
                  <select
                    value={newTask.category}
                    onChange={(e) =>
                      setNewTask({ ...newTask, category: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-black dark:focus:border-white font-medium text-zinc-800 dark:text-zinc-200 text-sm appearance-none transition-colors"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Row 3: SLA & Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-black uppercase text-zinc-400 dark:text-zinc-500 mb-1.5 block tracking-wider">
                  SLA (hours)
                </label>
                <input
                  type="number"
                  min={0}
                  value={newTask.slaHrs}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      slaHrs: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-black dark:focus:border-white font-medium text-zinc-800 dark:text-zinc-200 text-sm transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase text-zinc-400 dark:text-zinc-500 mb-1.5 block tracking-wider">
                  Target
                </label>
                <input
                  type="number"
                  min={0}
                  value={newTask.metricTarget}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      metricTarget: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-black dark:focus:border-white font-medium text-zinc-800 dark:text-zinc-200 text-sm transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase text-zinc-400 dark:text-zinc-500 mb-1.5 block tracking-wider">
                  CON
                </label>
                <input
                  type="number"
                  min={0}
                  value={newTask.metricCON}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      metricCON: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-black dark:focus:border-white font-medium text-zinc-800 dark:text-zinc-200 text-sm transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase text-zinc-400 dark:text-zinc-500 mb-1.5 block tracking-wider">
                  COV
                </label>
                <input
                  type="number"
                  min={0}
                  value={newTask.metricCOV}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      metricCOV: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-black dark:focus:border-white font-medium text-zinc-800 dark:text-zinc-200 text-sm transition-colors"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddTask(false);
                  setNewTask({ ...emptyTask });
                }}
                className="flex-1 px-4 py-3 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addingTask || !newTask.description.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all disabled:opacity-50 text-sm"
              >
                {addingTask ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add Task
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Personal Dashboard Component */}
      <PersonalDashboardComponent
        tasks={myTasks}
        allTasks={tasks}
        userName={userName}
        userEmail={userEmail}
        onEditTask={handleEditTask}
        successLogs={successLogs}
      />

      {/* XLSX Uploader Modal */}
      {isUploaderOpen && (
        <React.Suspense fallback={null}>
          <LazyXlsxUploader
            isOpen={isUploaderOpen}
            onClose={() => setIsUploaderOpen(false)}
            onImport={handleXlsxImport}
          />
        </React.Suspense>
      )}

      {/* ========== EDIT TASK SLIDE-OUT PANEL ========== */}
      {isEditOpen && editFormData && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={() => {
              setIsEditOpen(false);
              setEditFormData(null);
            }}
          />
          <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-950 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-zinc-200 dark:bg-zinc-700 rounded-xl">
                  <ClipboardPlus className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-zinc-800 dark:text-zinc-100 tracking-tight">
                    Edit Task
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    Update your task progress and metrics
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsEditOpen(false);
                  setEditFormData(null);
                }}
                className="p-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all"
              >
                <X className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              </button>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Task Info (Read-only context) */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                  <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest">
                    Task Info
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    <p className="text-[10px] font-black uppercase text-zinc-400 mb-1 tracking-wider">
                      Campaign
                    </p>
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                      {editFormData.campaign || 'No campaign'}
                    </p>
                  </div>
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    <p className="text-[10px] font-black uppercase text-zinc-400 mb-1 tracking-wider">
                      Description
                    </p>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {editFormData.description || 'No description'}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
                      <p className="text-[8px] font-black uppercase text-zinc-400 tracking-wider">
                        Priority
                      </p>
                      <p
                        className={`text-xs font-black mt-1 ${
                          editFormData.priority === 'High'
                            ? 'text-zinc-900 dark:text-white'
                            : 'text-zinc-600 dark:text-zinc-300'
                        }`}
                      >
                        {editFormData.priority}
                      </p>
                    </div>
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
                      <p className="text-[8px] font-black uppercase text-zinc-400 tracking-wider">
                        SLA
                      </p>
                      <p className="text-xs font-black mt-1 text-zinc-600 dark:text-zinc-300">
                        {editFormData.slaHrs}h
                      </p>
                    </div>
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
                      <p className="text-[8px] font-black uppercase text-zinc-400 tracking-wider">
                        Category
                      </p>
                      <p className="text-xs font-black mt-1 text-zinc-600 dark:text-zinc-300 truncate">
                        {editFormData.category || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Status Update */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                  <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest">
                    Status Update
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {STATUS_OPTIONS.map((status) => {
                    const isActive = editFormData.status === status;
                    const StatusIcon =
                      status === 'Done'
                        ? CheckCircle2
                        : status === 'Blocked'
                        ? AlertCircle
                        : Clock;
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() =>
                          setEditFormData({ ...editFormData, status })
                        }
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${
                          isActive
                            ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg'
                            : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {status}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Performance Metrics */}
              <section className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-[2rem] border-2 border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 mb-5">
                  <TrendingUp className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                  <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest">
                    Performance Metrics
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <EditMetricInput
                    label="Target"
                    value={editFormData.metricTarget || 0}
                    onChange={(v: number) =>
                      setEditFormData({ ...editFormData, metricTarget: v })
                    }
                  />
                  <EditMetricInput
                    label="CON (Confirmations)"
                    value={editFormData.metricCON || 0}
                    onChange={(v: number) =>
                      setEditFormData({ ...editFormData, metricCON: v })
                    }
                  />
                  <EditMetricInput
                    label="COV (Coverage)"
                    value={editFormData.metricCOV || 0}
                    onChange={(v: number) =>
                      setEditFormData({ ...editFormData, metricCOV: v })
                    }
                  />
                  <EditMetricInput
                    label="Today's Confirmations"
                    value={editFormData.metricConfirmationToday || 0}
                    onChange={(v: number) =>
                      setEditFormData({
                        ...editFormData,
                        metricConfirmationToday: v,
                      })
                    }
                  />
                  <EditMetricInput
                    label="Missing Date"
                    value={editFormData.metricMissingDate || 0}
                    onChange={(v: number) =>
                      setEditFormData({
                        ...editFormData,
                        metricMissingDate: v,
                      })
                    }
                  />
                  <EditMetricInput
                    label="With Date"
                    value={editFormData.metricWithDate || 0}
                    onChange={(v: number) =>
                      setEditFormData({
                        ...editFormData,
                        metricWithDate: v,
                      })
                    }
                  />
                </div>
              </section>

              {/* Notes & Updates */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <FileSpreadsheet className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                  <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest">
                    Notes & Updates
                  </h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-400 mb-1.5 block tracking-wider">
                      Result Summary
                    </label>
                    <textarea
                      value={editFormData.resultSummary || ''}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          resultSummary: e.target.value,
                        })
                      }
                      placeholder="Describe results so far..."
                      className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-black dark:focus:border-white font-medium text-zinc-800 dark:text-zinc-200 text-sm h-20 transition-colors resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-400 mb-1.5 block tracking-wider">
                      Blocker / Issue
                    </label>
                    <textarea
                      value={editFormData.blocker || ''}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          blocker: e.target.value,
                        })
                      }
                      placeholder="Any blockers or issues?"
                      className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-black dark:focus:border-white font-medium text-zinc-800 dark:text-zinc-200 text-sm h-20 transition-colors resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-400 mb-1.5 block tracking-wider">
                      Next Step
                    </label>
                    <textarea
                      value={editFormData.nextStep || ''}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          nextStep: e.target.value,
                        })
                      }
                      placeholder="What's the next action?"
                      className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-black dark:focus:border-white font-medium text-zinc-800 dark:text-zinc-200 text-sm h-20 transition-colors resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-400 mb-1.5 block tracking-wider">
                      Final Output
                    </label>
                    <textarea
                      value={editFormData.finalOutput || ''}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          finalOutput: e.target.value,
                        })
                      }
                      placeholder="Final deliverable or output..."
                      className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-black dark:focus:border-white font-medium text-zinc-800 dark:text-zinc-200 text-sm h-20 transition-colors resize-none"
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex gap-4">
              <button
                onClick={() => {
                  setIsEditOpen(false);
                  setEditFormData(null);
                }}
                className="flex-1 py-4 bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl font-black text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="flex-[2] flex items-center justify-center gap-2 py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black text-base shadow-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all disabled:opacity-50"
              >
                {savingEdit ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditMetricInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="text-[9px] font-black uppercase text-zinc-400 mb-1.5 block tracking-wider">
        {label}
      </label>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:border-black dark:focus:border-white font-bold text-zinc-800 dark:text-zinc-200 text-sm transition-colors"
      />
    </div>
  );
}
