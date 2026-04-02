import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ArrowRight, RefreshCw, Search, Trophy, UploadCloud } from "lucide-react";
import { useLocation, useNavigate } from "../lib/routerCompat";
import { getVisibleNavItems } from "../lib/navigation";

interface CommandPaletteProps {
  isAdmin: boolean;
  isOpen: boolean;
  onClose: () => void;
  onOpenSuccess: () => void;
  onOpenUpload: () => void;
  onRefreshWorkspace: () => void;
  userEmail: string;
  userFeatures: string[] | null;
}

export function CommandPalette({
  isAdmin,
  isOpen,
  onClose,
  onOpenSuccess,
  onOpenUpload,
  onRefreshWorkspace,
  userEmail,
  userFeatures,
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const navItems = useMemo(
    () => getVisibleNavItems({ isAdmin, userEmail, userFeatures }),
    [isAdmin, userEmail, userFeatures],
  );

  const actions = useMemo(() => {
    const quickActions = [
      {
        id: "refresh",
        label: "Refresh workspace data",
        description: "Reload the latest data from the backend.",
        icon: RefreshCw,
        run: () => {
          onRefreshWorkspace();
          onClose();
        },
      },
      {
        id: "success",
        label: "Log an update",
        description: "Open the quick success logger from anywhere.",
        icon: Trophy,
        run: () => {
          onOpenSuccess();
          onClose();
        },
      },
      ...(isAdmin
        ? [
            {
              id: "upload",
              label: "Upload XLSX",
              description: "Bulk import tasks or campaigns from a spreadsheet.",
              icon: UploadCloud,
              run: () => {
                onOpenUpload();
                onClose();
              },
            },
          ]
        : []),
    ];

    const routeActions = navItems.map((item) => ({
      id: item.id,
      label: item.label,
      description: item.description,
      icon: item.icon,
      run: () => {
        navigate(item.to);
        onClose();
      },
    }));

    return [...quickActions, ...routeActions];
  }, [isAdmin, navItems, navigate, onClose, onOpenSuccess, onOpenUpload, onRefreshWorkspace]);

  const filteredActions = useMemo(() => {
    if (!deferredQuery) {
      return actions;
    }

    return actions.filter((action) =>
      `${action.label} ${action.description}`.toLowerCase().includes(deferredQuery),
    );
  }, [actions, deferredQuery]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-md p-4 md:p-8" onClick={onClose}>
      <div
        className="mx-auto max-w-2xl rounded-[2rem] border border-zinc-200/70 bg-white/95 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950/95"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <Search className="h-4 w-4 text-zinc-400" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search pages, actions, and tools..."
              className="flex-1 bg-transparent text-sm font-medium text-zinc-800 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
            />
            <div className="rounded-lg bg-white px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 shadow-sm dark:bg-zinc-950">
              {location.pathname}
            </div>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3">
          {filteredActions.length > 0 ? (
            filteredActions.map((action) => (
              <button
                key={action.id}
                onClick={action.run}
                className="group flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left transition-all hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black">
                  <action.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                    {action.label}
                  </div>
                  <div className="truncate text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {action.description}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-300 transition-transform group-hover:translate-x-1 group-hover:text-zinc-500 dark:text-zinc-700" />
              </button>
            ))
          ) : (
            <div className="px-4 py-10 text-center">
              <Search className="mx-auto mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-700" />
              <div className="text-sm font-black text-zinc-500 dark:text-zinc-400">
                No matches for "{query}"
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
