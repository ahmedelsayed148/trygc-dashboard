"use client";

import React, { useCallback, useContext, useDeferredValue, useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  Download,
  ExternalLink,
  FolderOpen,
  Link2,
  Pin,
  PinOff,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AppContext } from "./Root";
import { FeatureGate } from "./FeatureGate";
import {
  createLinkWidgetRecord,
  normalizeLinkWidgetRecords,
  type LinkWidgetLayout,
  type LinkWidgetRecord,
} from "../lib/workspaceTools";

const COLOR_OPTIONS = [
  { id: "slate", label: "Slate", badge: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black", glow: "from-zinc-500/25 to-zinc-700/5" },
  { id: "emerald", label: "Emerald", badge: "bg-emerald-600 text-white", glow: "from-emerald-500/30 to-emerald-500/5" },
  { id: "blue", label: "Blue", badge: "bg-blue-600 text-white", glow: "from-blue-500/30 to-blue-500/5" },
  { id: "amber", label: "Amber", badge: "bg-amber-500 text-black", glow: "from-amber-400/30 to-amber-500/5" },
  { id: "rose", label: "Rose", badge: "bg-rose-500 text-white", glow: "from-rose-500/30 to-rose-500/5" },
  { id: "violet", label: "Violet", badge: "bg-violet-600 text-white", glow: "from-violet-500/30 to-violet-500/5" },
] as const;

type ColorId = (typeof COLOR_OPTIONS)[number]["id"];

const DEFAULT_FORM = {
  title: "",
  url: "",
  description: "",
  category: "",
  color: "slate" as ColorId,
  icon: "",
  layout: "compact" as LinkWidgetLayout,
  pinned: true,
  openInNewTab: true,
};

function getColorOption(color: string) {
  return COLOR_OPTIONS.find((option) => option.id === color) ?? COLOR_OPTIONS[0];
}

function getInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (words.length === 0) {
    return "GL";
  }

  return words.map((word) => word[0]?.toUpperCase() ?? "").join("");
}

function formatTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function WidgetsBoard() {
  return (
    <FeatureGate featureId="widgets">
      <WidgetsBoardContent />
    </FeatureGate>
  );
}

function WidgetsBoardContent() {
  const ctx = useContext(AppContext);
  const rawWidgets = useMemo(() => ctx?.linkWidgets ?? [], [ctx?.linkWidgets]);
  const setLinkWidgets = useMemo(
    () => ctx?.setLinkWidgets ?? (() => {}),
    [ctx?.setLinkWidgets],
  );
  const [isPending, startTransition] = useTransition();

  const widgets = useMemo(() => {
    const deduped = new Map<string, LinkWidgetRecord>();

    normalizeLinkWidgetRecords(rawWidgets).forEach((widget) => {
      const key = `${widget.title.toLowerCase()}::${widget.url.toLowerCase()}`;
      const current = deduped.get(key);
      if (!current || new Date(widget.updatedAt).getTime() >= new Date(current.updatedAt).getTime()) {
        deduped.set(key, widget);
      }
    });

    return Array.from(deduped.values()).sort((left, right) => {
      if (left.pinned !== right.pinned) {
        return left.pinned ? -1 : 1;
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
  }, [rawWidgets]);

  const [form, setForm] = useState(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const categories = useMemo(() => {
    const next = new Set<string>();
    widgets.forEach((widget) => {
      if (widget.category) {
        next.add(widget.category);
      }
    });
    return ["All", ...Array.from(next).sort((left, right) => left.localeCompare(right))];
  }, [widgets]);

  const filteredWidgets = useMemo(() => {
    return widgets.filter((widget) => {
      if (selectedCategory !== "All" && widget.category !== selectedCategory) {
        return false;
      }

      const haystack = [widget.title, widget.description, widget.url, widget.category].join(" ").toLowerCase();
      return !deferredSearch || haystack.includes(deferredSearch);
    });
  }, [deferredSearch, selectedCategory, widgets]);

  const selectedWidget = useMemo(() => {
    if (!filteredWidgets.length) {
      return null;
    }

    return filteredWidgets.find((widget) => widget.id === selectedWidgetId) ?? filteredWidgets[0];
  }, [filteredWidgets, selectedWidgetId]);

  const groupedWidgets = useMemo(() => {
    const groups = new Map<string, LinkWidgetRecord[]>();
    filteredWidgets.forEach((widget) => {
      const key = widget.category || "General";
      const bucket = groups.get(key) || [];
      bucket.push(widget);
      groups.set(key, bucket);
    });

    return Array.from(groups.entries());
  }, [filteredWidgets]);

  const stats = useMemo(
    () => ({
      total: widgets.length,
      pinned: widgets.filter((widget) => widget.pinned).length,
      wide: widgets.filter((widget) => widget.layout === "wide").length,
      categories: Math.max(categories.length - 1, 0),
    }),
    [categories.length, widgets],
  );

  const resetForm = useCallback(() => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
  }, []);

  const commitWidgets = useCallback(
    (nextWidgets: LinkWidgetRecord[]) => {
      startTransition(() => {
        setLinkWidgets(nextWidgets);
      });
    },
    [setLinkWidgets],
  );

  const normalizeUrl = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }

    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }, []);

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const title = form.title.trim();
      const normalizedUrl = normalizeUrl(form.url);

      if (!title) {
        toast.error("Widget title is required");
        return;
      }

      try {
        new URL(normalizedUrl);
      } catch {
        toast.error("Enter a valid URL");
        return;
      }

      const duplicate = widgets.find(
        (widget) =>
          widget.id !== editingId &&
          widget.title.toLowerCase() === title.toLowerCase() &&
          widget.url.toLowerCase() === normalizedUrl.toLowerCase(),
      );

      if (duplicate) {
        toast.error("A matching widget already exists");
        return;
      }

      const nextWidget = createLinkWidgetRecord({
        id: editingId || undefined,
        title,
        url: normalizedUrl,
        description: form.description,
        category: form.category || "General",
        color: form.color,
        icon: form.icon || getInitials(title),
        layout: form.layout,
        pinned: form.pinned,
        openInNewTab: form.openInNewTab,
        createdAt: editingId ? widgets.find((widget) => widget.id === editingId)?.createdAt : undefined,
        updatedAt: new Date().toISOString(),
      });

      const nextWidgets = editingId
        ? widgets.map((widget) => (widget.id === editingId ? nextWidget : widget))
        : [nextWidget, ...widgets];

      commitWidgets(nextWidgets);
      setSelectedWidgetId(nextWidget.id);
      setShowForm(false);
      resetForm();
      toast.success(editingId ? "Widget updated" : "Widget added");
    },
    [commitWidgets, editingId, form, normalizeUrl, resetForm, widgets],
  );

  const handleEdit = useCallback((widget: LinkWidgetRecord) => {
    setEditingId(widget.id);
    setSelectedWidgetId(widget.id);
    setForm({
      title: widget.title,
      url: widget.url,
      description: widget.description,
      category: widget.category,
      color: (widget.color as ColorId) || "slate",
      icon: widget.icon,
      layout: widget.layout,
      pinned: widget.pinned,
      openInNewTab: widget.openInNewTab,
    });
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      commitWidgets(widgets.filter((widget) => widget.id !== id));
      if (selectedWidgetId === id) {
        setSelectedWidgetId(null);
      }
      if (editingId === id) {
        resetForm();
        setShowForm(false);
      }
      setConfirmDeleteId(null);
      toast.success("Widget removed");
    },
    [commitWidgets, editingId, resetForm, selectedWidgetId, widgets],
  );

  const togglePinned = useCallback(
    (id: string) => {
      commitWidgets(
        widgets.map((widget) =>
          widget.id === id
            ? createLinkWidgetRecord({
                ...widget,
                pinned: !widget.pinned,
                updatedAt: new Date().toISOString(),
              })
            : widget,
        ),
      );
    },
    [commitWidgets, widgets],
  );

  const handleOpen = useCallback((widget: LinkWidgetRecord) => {
    if (typeof window === "undefined") {
      return;
    }

    window.open(widget.url, widget.openInNewTab ? "_blank" : "_self", widget.openInNewTab ? "noopener,noreferrer" : undefined);
  }, []);

  const exportWidgets = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const blob = new Blob([JSON.stringify(widgets, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "workspace-widgets.json";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Widgets exported");
  }, [widgets]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="mx-auto max-w-[1600px] space-y-5 px-4 py-5 md:px-6"
    >
      <section className="app-hero-panel rounded-[var(--app-card-radius)] border p-6 md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="app-hero-chip inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em]">
              <Sparkles className="h-3.5 w-3.5" />
              Widgets Hub
            </div>
            <h1 className="app-hero-title mt-4 text-3xl font-black tracking-tight md:text-4xl">Widgets Board</h1>
            <p className="app-hero-copy mt-2 text-sm leading-6 md:text-base">
              Keep your high-value tools in one fast workspace. Search, group, pin, and launch the links your team uses most.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[520px]">
            <HeroStat label="Widgets" value={stats.total} />
            <HeroStat label="Pinned" value={stats.pinned} />
            <HeroStat label="Wide Cards" value={stats.wide} />
            <HeroStat label="Categories" value={stats.categories} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr),360px]">
        <div className="space-y-4">
          <div className="app-panel rounded-[var(--app-card-radius)] border p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <label className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-[rgba(var(--app-primary-rgb),0.08)] bg-[hsl(var(--muted)/0.7)] px-4 py-3">
                <Search className="h-4 w-4 shrink-0 text-zinc-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search widgets, URLs, or categories"
                  className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
                />
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={exportWidgets}
                  className="rounded-xl border border-[rgba(var(--app-primary-rgb),0.08)] bg-[hsl(var(--card)/0.75)] px-3 py-2 text-xs font-bold text-zinc-600 transition-colors hover:bg-[hsl(var(--muted)/0.8)] dark:text-zinc-300"
                >
                  <Download className="mr-1.5 inline h-3.5 w-3.5" />
                  Export
                </button>
                <button
                  onClick={() => {
                    resetForm();
                    setShowForm((current) => !current);
                  }}
                  className="app-accent-button rounded-xl px-4 py-2 text-xs font-black"
                >
                  {showForm ? <X className="mr-1.5 inline h-3.5 w-3.5" /> : <Plus className="mr-1.5 inline h-3.5 w-3.5" />}
                  {showForm ? "Close Editor" : "Add Widget"}
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-full px-3 py-1.5 text-xs font-black transition-all ${
                    selectedCategory === category
                      ? "app-accent-button"
                      : "border border-[rgba(var(--app-primary-rgb),0.08)] bg-[hsl(var(--card)/0.72)] text-zinc-500 hover:bg-[hsl(var(--muted)/0.75)] dark:text-zinc-300"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {showForm ? (
            <div className="app-panel rounded-[var(--app-card-radius)] border p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">
                    {editingId ? "Edit Widget" : "New Widget"}
                  </div>
                  <h2 className="mt-1 text-xl font-black text-zinc-900 dark:text-zinc-100">Create a focused tool card</h2>
                </div>
                <div className="rounded-full bg-[hsl(var(--muted)/0.8)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                  {isPending ? "Saving..." : "Local workspace"}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                <Field label="Title">
                  <input
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    className="app-input"
                    placeholder="Meta Ads, Sheet Tracker, QA Form"
                  />
                </Field>
                <Field label="URL">
                  <input
                    value={form.url}
                    onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
                    className="app-input"
                    placeholder="https://..."
                  />
                </Field>
                <Field label="Category">
                  <input
                    value={form.category}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                    className="app-input"
                    placeholder="Reporting, QA, Creators"
                  />
                </Field>
                <Field label="Icon Label">
                  <input
                    value={form.icon}
                    onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value.slice(0, 3).toUpperCase() }))}
                    className="app-input"
                    placeholder="ADS"
                  />
                </Field>
                <Field label="Description" className="md:col-span-2">
                  <textarea
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    className="app-input min-h-[110px] resize-y py-3"
                    placeholder="What this widget is for, who uses it, and why it matters."
                  />
                </Field>

                <div className="md:col-span-2">
                  <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Accent</div>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, color: option.id }))}
                        className={`rounded-full px-3 py-1.5 text-xs font-black transition-all ${option.badge} ${
                          form.color === option.id ? "ring-2 ring-offset-2 ring-[rgba(var(--app-primary-rgb),0.3)] ring-offset-transparent" : "opacity-75"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 md:col-span-2">
                  <ToggleChip
                    active={form.layout === "compact"}
                    label="Compact card"
                    onClick={() => setForm((current) => ({ ...current, layout: "compact" }))}
                  />
                  <ToggleChip
                    active={form.layout === "wide"}
                    label="Wide card"
                    onClick={() => setForm((current) => ({ ...current, layout: "wide" }))}
                  />
                  <ToggleChip
                    active={form.pinned}
                    label="Pinned"
                    onClick={() => setForm((current) => ({ ...current, pinned: !current.pinned }))}
                  />
                  <ToggleChip
                    active={form.openInNewTab}
                    label="Open in new tab"
                    onClick={() => setForm((current) => ({ ...current, openInNewTab: !current.openInNewTab }))}
                  />
                </div>

                <div className="flex flex-wrap gap-2 md:col-span-2">
                  <button type="submit" className="app-accent-button rounded-xl px-4 py-2 text-sm font-black">
                    <Upload className="mr-1.5 inline h-4 w-4" />
                    {editingId ? "Save Changes" : "Create Widget"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setShowForm(false);
                    }}
                    className="rounded-xl border border-[rgba(var(--app-primary-rgb),0.08)] px-4 py-2 text-sm font-black text-zinc-600 dark:text-zinc-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          {filteredWidgets.length === 0 ? (
            <div className="app-panel rounded-[var(--app-card-radius)] border px-6 py-12 text-center">
              <FolderOpen className="mx-auto h-9 w-9 text-zinc-300 dark:text-zinc-700" />
              <h2 className="mt-4 text-xl font-black text-zinc-900 dark:text-zinc-100">No widgets match the current view</h2>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Change the search, switch category, or create a new shortcut card for your most-used tools.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedWidgets.map(([category, items]) => (
                <div key={category} className="app-panel rounded-[var(--app-card-radius)] border p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Category</div>
                      <h2 className="mt-1 text-xl font-black text-zinc-900 dark:text-zinc-100">{category}</h2>
                    </div>
                    <div className="rounded-full bg-[hsl(var(--muted)/0.8)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                      {items.length} items
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                    {items.map((widget) => (
                      <WidgetCard
                        key={widget.id}
                        widget={widget}
                        active={selectedWidget?.id === widget.id}
                        confirmDelete={confirmDeleteId === widget.id}
                        onDelete={() => handleDelete(widget.id)}
                        onEdit={() => handleEdit(widget)}
                        onOpen={() => handleOpen(widget)}
                        onPinToggle={() => togglePinned(widget.id)}
                        onRequestDelete={() => setConfirmDeleteId((current) => (current === widget.id ? null : widget.id))}
                        onSelect={() => setSelectedWidgetId(widget.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="app-panel rounded-[var(--app-card-radius)] border p-5">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Spotlight</div>
            {selectedWidget ? (
              <>
                <div className={`mt-4 rounded-[1.5rem] bg-gradient-to-br p-5 ${getColorOption(selectedWidget.color).glow}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-black ${getColorOption(selectedWidget.color).badge}`}>
                      {(selectedWidget.icon || getInitials(selectedWidget.title)).slice(0, 3)}
                    </div>
                    <button
                      onClick={() => togglePinned(selectedWidget.id)}
                      className="rounded-xl border border-[rgba(var(--app-primary-rgb),0.08)] bg-[hsl(var(--card)/0.75)] p-2 text-zinc-500"
                    >
                      {selectedWidget.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                    </button>
                  </div>
                  <h3 className="mt-4 text-2xl font-black text-zinc-900 dark:text-zinc-100">{selectedWidget.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{selectedWidget.description || "No description provided."}</p>
                </div>

                <div className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
                  <MetaRow label="Category" value={selectedWidget.category} />
                  <MetaRow label="Layout" value={selectedWidget.layout} />
                  <MetaRow label="Last updated" value={formatTime(selectedWidget.updatedAt)} />
                  <MetaRow label="Destination" value={selectedWidget.url.replace(/^https?:\/\//, "")} />
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button onClick={() => handleOpen(selectedWidget)} className="app-accent-button rounded-xl px-4 py-2 text-sm font-black">
                    <ExternalLink className="mr-1.5 inline h-4 w-4" />
                    Open Link
                  </button>
                  <button
                    onClick={() => handleEdit(selectedWidget)}
                    className="rounded-xl border border-[rgba(var(--app-primary-rgb),0.08)] px-4 py-2 text-sm font-black text-zinc-600 dark:text-zinc-300"
                  >
                    Edit
                  </button>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Select a widget card to inspect its details and quick actions.</p>
            )}
          </div>

          <div className="app-panel rounded-[var(--app-card-radius)] border p-5">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Usage Tips</div>
            <div className="mt-4 space-y-3">
              <Tip icon={Star} title="Pin your daily stack" copy="Keep recurring operations, sheets, and QA links pinned so the board surfaces them first." />
              <Tip icon={Link2} title="Use categories" copy="Segment widgets by workflow so search and scanning stay fast as the board grows." />
              <Tip icon={FolderOpen} title="Prefer wide cards for hubs" copy="Reserve wide cards for tools with context-heavy descriptions or critical launch notes." />
            </div>
          </div>
        </aside>
      </section>
    </motion.div>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4 backdrop-blur-sm">
      <div className="app-hero-kicker text-[11px] font-black uppercase tracking-[0.18em]">{label}</div>
      <div className="app-hero-title mt-3 text-2xl font-black">{value}</div>
    </div>
  );
}

function Field({
  children,
  className = "",
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <label className={`block ${className}`}>
      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</div>
      {children}
    </label>
  );
}

function ToggleChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-black transition-all ${
        active
          ? "app-accent-button"
          : "border border-[rgba(var(--app-primary-rgb),0.08)] bg-[hsl(var(--card)/0.72)] text-zinc-500 hover:bg-[hsl(var(--muted)/0.75)] dark:text-zinc-300"
      }`}
    >
      {label}
    </button>
  );
}

function WidgetCard({
  active,
  confirmDelete,
  onDelete,
  onEdit,
  onOpen,
  onPinToggle,
  onRequestDelete,
  onSelect,
  widget,
}: {
  active: boolean;
  confirmDelete: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onOpen: () => void;
  onPinToggle: () => void;
  onRequestDelete: () => void;
  onSelect: () => void;
  widget: LinkWidgetRecord;
}) {
  const color = getColorOption(widget.color);

  return (
    <button
      onClick={onSelect}
      className={`group relative overflow-hidden rounded-[1.5rem] border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
        active
          ? "border-[rgba(var(--app-primary-rgb),0.35)] bg-[rgba(var(--app-primary-rgb),0.05)]"
          : "border-[rgba(var(--app-primary-rgb),0.08)] bg-[hsl(var(--card)/0.82)]"
      } ${widget.layout === "wide" ? "md:col-span-2 2xl:col-span-2" : ""}`}
    >
      <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br opacity-90 ${color.glow}`} />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl text-xs font-black ${color.badge}`}>
            {(widget.icon || getInitials(widget.title)).slice(0, 3)}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(event) => {
                event.stopPropagation();
                onPinToggle();
              }}
              className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-[hsl(var(--muted))] hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              {widget.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onRequestDelete();
              }}
              className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-rose-500/10 hover:text-rose-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${color.badge}`}>{widget.category}</span>
          {widget.pinned ? (
            <span className="rounded-full bg-amber-500/12 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
              Pinned
            </span>
          ) : null}
        </div>

        <h3 className="mt-3 text-lg font-black text-zinc-900 dark:text-zinc-100">{widget.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          {widget.description || "Launch this widget directly or use it as a quick reference card for a key workflow."}
        </p>

        <div className="mt-4 text-[11px] text-zinc-400">{widget.url.replace(/^https?:\/\//, "")}</div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onOpen();
            }}
            className="app-accent-button rounded-xl px-3 py-2 text-xs font-black"
          >
            <ExternalLink className="mr-1.5 inline h-3.5 w-3.5" />
            Open
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
            className="rounded-xl border border-[rgba(var(--app-primary-rgb),0.08)] px-3 py-2 text-xs font-black text-zinc-600 dark:text-zinc-300"
          >
            Edit
          </button>
        </div>

        {confirmDelete ? (
          <div className="mt-4 rounded-[1.2rem] border border-rose-500/20 bg-rose-500/8 p-3">
            <div className="text-xs font-black text-rose-600 dark:text-rose-400">Remove this widget?</div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete();
                }}
                className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-black text-white"
              >
                Delete
              </button>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onRequestDelete();
                }}
                className="rounded-lg border border-[rgba(var(--app-primary-rgb),0.08)] px-3 py-1.5 text-xs font-black text-zinc-600 dark:text-zinc-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </button>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] border border-[rgba(var(--app-primary-rgb),0.08)] bg-[hsl(var(--muted)/0.45)] px-4 py-3">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-zinc-800 dark:text-zinc-200">{value}</div>
    </div>
  );
}

function Tip({
  copy,
  icon: Icon,
  title,
}: {
  copy: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="rounded-[1.2rem] border border-[rgba(var(--app-primary-rgb),0.08)] bg-[hsl(var(--muted)/0.45)] p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-[rgba(var(--app-primary-rgb),0.08)] p-2 text-[hsl(var(--foreground))]">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-black text-zinc-900 dark:text-zinc-100">{title}</div>
          <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{copy}</p>
        </div>
      </div>
    </div>
  );
}
