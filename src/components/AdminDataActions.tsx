import React, { useContext, useMemo, useState } from "react";
import { AlertTriangle, ListX, Loader2, Trash2, X } from "lucide-react";

import { AppContext } from "./Root";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

export function AdminDataActions() {
  const ctx = useContext(AppContext);
  const isAdmin = ctx?.isAdmin || false;
  const tasks = ctx?.operationalTasks?.length ? ctx.operationalTasks : ctx?.tasks || [];
  const setTasks = ctx?.setTasks || (() => {});
  const setSuccessLogs = ctx?.setSuccessLogs || (() => {});
  const setOpsCampaigns = ctx?.setOpsCampaigns || (() => {});

  const [isClearingAll, setIsClearingAll] = useState(false);
  const [isClearingTasks, setIsClearingTasks] = useState(false);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [clearTasksOpen, setClearTasksOpen] = useState(false);

  const taskCount = useMemo(() => tasks.length, [tasks.length]);

  if (!isAdmin) {
    return null;
  }

  const handleClearAllData = async () => {
    setIsClearingAll(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b626472b/reset-data`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        },
      );

      if (response.ok) {
        setTasks([]);
        setSuccessLogs([]);
        setOpsCampaigns([]);
        setClearAllOpen(false);
      }
    } catch (error) {
      console.error("Failed to clear data", error);
    } finally {
      setIsClearingAll(false);
    }
  };

  const handleClearTasks = async () => {
    setIsClearingTasks(true);
    try {
      const [tasksResponse, campaignsResponse] = await Promise.all([
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-b626472b/tasks`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ tasks: [] }),
          },
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-b626472b/ops-campaigns`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ opsCampaigns: [] }),
          },
        ),
      ]);

      if (tasksResponse.ok && campaignsResponse.ok) {
        setTasks([]);
        setOpsCampaigns([]);
        setClearTasksOpen(false);
      }
    } catch (error) {
      console.error("Failed to clear tasks", error);
    } finally {
      setIsClearingTasks(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="p-6 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <div className="flex items-start gap-3 mb-4">
            <ListX className="w-6 h-6 text-zinc-700 dark:text-zinc-300 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-zinc-800 dark:text-zinc-100 mb-1">Clear Tasks</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                Remove all campaign and operational tasks while keeping the rest of the workspace data.
              </p>
              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-200 dark:bg-zinc-700 px-3 py-1 rounded-lg inline-block">
                {taskCount} tasks currently in workspace
              </p>
            </div>
          </div>
          <button
            onClick={() => setClearTasksOpen(true)}
            disabled={taskCount === 0}
            className="px-6 py-3 bg-zinc-800 dark:bg-zinc-200 text-white dark:text-black rounded-xl font-bold hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <ListX className="w-4 h-4" />
            Clear Tasks
          </button>
        </div>

        <div className="p-6 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 rounded-2xl">
          <div className="flex items-start gap-3 mb-4">
            <Trash2 className="w-6 h-6 text-zinc-700 dark:text-zinc-300 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-zinc-800 dark:text-zinc-100 mb-1">Clear All Data</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                Permanently delete all tasks, success logs, and synced workspace metrics.
              </p>
              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-200 dark:bg-zinc-700 px-3 py-1 rounded-lg inline-block">
                Danger Zone
              </p>
            </div>
          </div>
          <button
            onClick={() => setClearAllOpen(true)}
            disabled={isClearingAll}
            className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Data
          </button>
        </div>
      </div>

      <ConfirmationModal
        description={`This will remove all ${taskCount} tasks from the workspace. Success logs and other records will stay available.`}
        icon={<ListX className="w-6 h-6" />}
        isBusy={isClearingTasks}
        isOpen={clearTasksOpen}
        onClose={() => setClearTasksOpen(false)}
        onConfirm={handleClearTasks}
        title="Clear All Tasks?"
        confirmLabel="Clear Tasks"
      />

      <ConfirmationModal
        description="This action will permanently delete all tasks, success logs, and workspace metrics. This cannot be undone."
        icon={<AlertTriangle className="w-6 h-6" />}
        isBusy={isClearingAll}
        isOpen={clearAllOpen}
        onClose={() => setClearAllOpen(false)}
        onConfirm={handleClearAllData}
        title="Clear All Data?"
        confirmLabel="Delete Everything"
      />
    </>
  );
}

function ConfirmationModal({
  confirmLabel,
  description,
  icon,
  isBusy,
  isOpen,
  onClose,
  onConfirm,
  title,
}: {
  confirmLabel: string;
  description: string;
  icon: React.ReactNode;
  isBusy: boolean;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-white dark:bg-zinc-950 rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-200 border border-zinc-200 dark:border-zinc-800">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl text-zinc-800 dark:text-zinc-200">
              {icon}
            </div>
            <h2 className="text-2xl font-black text-zinc-800 dark:text-zinc-100 tracking-tight">
              {title}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
            <X className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
          </button>
        </div>

        <p className="text-zinc-600 dark:text-zinc-400 mb-8 font-medium">
          {description}
        </p>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-[1.5rem] font-bold transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isBusy}
            className="flex-1 py-4 bg-black dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black rounded-[1.5rem] font-bold shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : icon}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
