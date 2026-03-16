"use client";

import React, { useContext, useMemo, useState } from "react";
import {
  ExternalLink,
  Link2,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  SquarePen,
  Trash2,
} from "lucide-react";
import { AppContext } from "./Root";
import { FeatureGate } from "./FeatureGate";
import {
  createLinkWidgetRecord,
  normalizeLinkWidgetRecords,
  type LinkWidgetLayout,
  type LinkWidgetRecord,
} from "../lib/workspaceTools";
import { DateRangeFilter } from "./DateRangeFilter";
import { emptyDateRange, filterByDateRange } from "../lib/dateFilters";

const COLOR_OPTIONS = [
  { id: "slate", label: "Slate", ring: "border-zinc-300", badge: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black" },
  { id: "emerald", label: "Emerald", ring: "border-emerald-300", badge: "bg-emerald-600 text-white" },
  { id: "blue", label: "Blue", ring: "border-blue-300", badge: "bg-blue-600 text-white" },
  { id: "amber", label: "Amber", ring: "border-amber-300", badge: "bg-amber-500 text-black" },
  { id: "rose", label: "Rose", ring: "border-rose-300", badge: "bg-rose-500 text-white" },
] as const;

const defaultForm = {
  title: "",
  url: "",
  description: "",
  category: "",
  color: "slate",
  icon: "",
  layout: "compact" as LinkWidgetLayout,
  pinned: true,
  openInNewTab: true,
};

export function WidgetsBoard() {
  return (
    <FeatureGate featureId="widgets">
      <WidgetsBoardContent />
    </FeatureGate>
  );
}

function WidgetsBoardContent() {
  const ctx = useContext(AppContext);
  const linkWidgets = normalizeLinkWidgetRecords(ctx?.linkWidgets || []);
  const setLinkWidgets = ctx?.setLinkWidgets || (() => {});

  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [dateRange, setDateRange] = useState(emptyDateRange);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const categories = useMemo(() => {
    const values = new Set<string>();
    linkWidgets.forEach((widget) => {
      if (widget.category) {
        values.add(widget.category);
      }
    });
    return ["All", ...Array.from(values).sort((left, right) => left.localeCompare(right))];
  }, [linkWidgets]);

  const filteredWidgets = useMemo(() => {
    const matchingWidgets = linkWidgets
      .filter((widget) => {
        const matchesSearch =
          !search ||
          [widget.title, widget.url, widget.description, widget.category]
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase());
        const matchesCategory =
          selectedCategory === "All" || widget.category === selectedCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((left, right) => {
        if (left.pinned !== right.pinned) {
          return left.pinned ? -1 : 1;
        }
        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      });
    return filterByDateRange(matchingWidgets, dateRange, (widget) => widget.updatedAt || widget.createdAt);
  }, [dateRange, linkWidgets, search, selectedCategory]);

  const stats = useMemo(() => {
    return {
      total: linkWidgets.length,
      pinned: linkWidgets.filter((widget) => widget.pinned).length,
      categories: Math.max(categories.length - 1, 0),
    };
  }, [categories.length, linkWidgets]);

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
  };

  const normalizeUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }

    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }

    return `https://${trimmed}`;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedUrl = normalizeUrl(form.url);

    try {
      new URL(normalizedUrl);
    } catch (_error) {
      setStatusMessage("Enter a valid URL.");
      return;
    }

    const now = new Date().toISOString();
    const nextWidget = createLinkWidgetRecord({
      id: editingId || undefined,
      title: form.title,
      url: normalizedUrl,
      description: form.description,
      category: form.category,
      color: form.color,
      icon: form.icon,
      layout: form.layout,
      pinned: form.pinned,
      openInNewTab: form.openInNewTab,
      updatedAt: now,
    });

    setLinkWidgets((current: LinkWidgetRecord[]) => {
      const normalized = normalizeLinkWidgetRecords(current);
      if (editingId) {
        return normalized.map((widget) => (widget.id === editingId ? nextWidget : widget));
      }
      return [nextWidget, ...normalized];
    });

    setStatusMessage(editingId ? "Widget updated." : "Widget added.");
    resetForm();
  };

  const handleEdit = (widget: LinkWidgetRecord) => {
    setEditingId(widget.id);
    setForm({
      title: widget.title,
      url: widget.url,
      description: widget.description,
      category: widget.category,
      color: widget.color,
      icon: widget.icon,
      layout: widget.layout,
      pinned: widget.pinned,
      openInNewTab: widget.openInNewTab,
    });
    setStatusMessage(`Editing ${widget.title}.`);
  };

  const handleDelete = (id: string) => {
    setLinkWidgets((current: LinkWidgetRecord[]) =>
      normalizeLinkWidgetRecords(current).filter((widget) => widget.id !== id),
    );
    if (editingId === id) {
      resetForm();
    }
    setStatusMessage("Widget removed.");
  };

  const togglePinned = (id: string) => {
    setLinkWidgets((current: LinkWidgetRecord[]) =>
      normalizeLinkWidgetRecords(current).map((widget) =>
        widget.id === id
          ? createLinkWidgetRecord({
              ...widget,
              pinned: !widget.pinned,
              updatedAt: new Date().toISOString(),
            })
          : widget,
      ),
    );
  };

  const openWidget = (widget: LinkWidgetRecord) => {
    if (typeof window === "undefined") {
      return;
    }

    window.open(widget.url, widget.openInNewTab ? "_blank" : "_self", widget.openInNewTab ? "noopener,noreferrer" : undefined);
  };

  return (
    <div className="px-4 py-6 md:px-6 space-y-6 max-w-screen-2xl mx-auto">
        <section className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="grid gap-0 xl:grid-cols-[0.95fr,1.05fr]">
            <div className="border-b border-zinc-200 p-5 dark:border-zinc-800 sm:p-6 xl:border-b-0 xl:border-r">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">
                Widgets Board
              </p>
              <h1 className="mt-3 text-2xl font-black text-zinc-900 dark:text-zinc-100 sm:text-3xl">
                Build your own dashboard of important URLs
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-zinc-500">
                Add link widgets for the sites, sheets, dashboards, docs, and forms you open most. Widgets are shared
                across user accounts, and each widget can be customized with its own title, icon, category, color,
                size, and open behavior.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <StatCard label="Widgets" value={stats.total} />
                <StatCard label="Pinned" value={stats.pinned} />
                <StatCard label="Categories" value={stats.categories} />
              </div>

              <div className="mt-6 rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  Customize Each Widget
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <HintCard title="Visual identity" description="Pick a color, custom icon text, and card size." />
                  <HintCard title="Smart behavior" description="Choose pinned state and whether it opens in a new tab." />
                  <HintCard title="Organization" description="Use categories and search to keep the board useful as it grows." />
                  <HintCard title="Fast updates" description="Edit or remove any widget from the board without rebuilding the page." />
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Widget Title">
                    <input
                      required
                      value={form.title}
                      onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                      className={inputClassName}
                      placeholder="Creator Dashboard"
                    />
                  </Field>
                  <Field label="URL">
                    <input
                      required
                      value={form.url}
                      onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
                      className={inputClassName}
                      placeholder="https://..."
                    />
                  </Field>
                  <Field label="Description">
                    <input
                      value={form.description}
                      onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                      className={inputClassName}
                      placeholder="What this link is for"
                    />
                  </Field>
                  <Field label="Category">
                    <input
                      value={form.category}
                      onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                      className={inputClassName}
                      placeholder="Reports, Tools, Ops, Docs"
                    />
                  </Field>
                  <Field label="Icon Label">
                    <input
                      value={form.icon}
                      onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value.slice(0, 3) }))}
                      className={inputClassName}
                      placeholder="GC"
                    />
                  </Field>
                  <Field label="Card Size">
                    <div className="grid grid-cols-2 gap-2">
                      {(["compact", "wide"] as LinkWidgetLayout[]).map((layout) => (
                        <button
                          key={layout}
                          type="button"
                          onClick={() => setForm((current) => ({ ...current, layout }))}
                          className={`rounded-2xl px-4 py-3 text-sm font-black transition-all ${
                            form.layout === layout
                              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          }`}
                        >
                          {layout === "compact" ? "Compact" : "Wide"}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>

                <Field label="Accent Color">
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                    {COLOR_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, color: option.id }))}
                        className={`rounded-2xl border px-3 py-3 text-sm font-black transition-all ${
                          form.color === option.id
                            ? `${option.ring} bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100`
                            : "border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </Field>

                <div className="grid gap-3 md:grid-cols-2">
                  <ToggleRow
                    label="Pin widget"
                    checked={form.pinned}
                    onToggle={() => setForm((current) => ({ ...current, pinned: !current.pinned }))}
                  />
                  <ToggleRow
                    label="Open in new tab"
                    checked={form.openInNewTab}
                    onToggle={() => setForm((current) => ({ ...current, openInNewTab: !current.openInNewTab }))}
                  />
                </div>

                {statusMessage && (
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                    {statusMessage}
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[1.5rem] bg-zinc-900 px-5 py-4 text-sm font-black text-white transition-all hover:bg-zinc-800 sm:w-auto dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
                  >
                    {editingId ? <SquarePen className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {editingId ? "Update Widget" : "Add Widget"}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="w-full rounded-[1.5rem] border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm font-bold text-zinc-600 transition-all hover:bg-zinc-100 sm:w-auto dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      Cancel Editing
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-xl items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
              <Search className="h-4 w-4 text-zinc-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full bg-transparent text-sm font-medium text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
                placeholder="Search widgets by title, category, description, or URL"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition-all ${
                    selectedCategory === category
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <DateRangeFilter label="Widget Date Range" value={dateRange} onChange={setDateRange} />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {filteredWidgets.length > 0 ? (
              filteredWidgets.map((widget) => {
                const palette = COLOR_OPTIONS.find((option) => option.id === widget.color) || COLOR_OPTIONS[0];

                return (
                  <article
                    key={widget.id}
                    className={`flex min-h-full flex-col rounded-[1.75rem] border ${palette.ring} bg-zinc-50 p-4 shadow-sm transition-all dark:bg-zinc-900 sm:p-5 ${
                      widget.layout === "wide" ? "lg:col-span-2 2xl:col-span-2" : ""
                    }`}
                  >
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),auto] lg:items-start">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black uppercase ${palette.badge}`}>
                          {(widget.icon || widget.title.slice(0, 2)).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 flex-wrap items-start gap-2">
                            {widget.pinned && (
                              <span className="mt-1 inline-flex shrink-0 items-center rounded-full bg-white/80 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500 dark:bg-zinc-950 dark:text-zinc-300">
                                <Pin className="mr-1 h-3.5 w-3.5" />
                                Pinned
                              </span>
                            )}
                            {widget.category && (
                              <span className="max-w-full break-words rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500 dark:bg-zinc-950 dark:text-zinc-300">
                                {widget.category}
                              </span>
                            )}
                          </div>
                          <h3 className="mt-2 break-words text-lg font-black leading-tight text-zinc-900 dark:text-zinc-100 sm:text-xl">
                            {widget.title}
                          </h3>
                          <p className="mt-2 break-all text-sm leading-6 text-zinc-500">
                            {widget.url}
                          </p>
                          <p className="mt-3 break-words text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                            {widget.description || "No description added."}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                        <button
                          onClick={() => togglePinned(widget.id)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition-all hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                        >
                          {widget.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleEdit(widget)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition-all hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(widget.id)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition-all hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-3 pt-2">
                      <button
                        onClick={() => openWidget(widget)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-zinc-800 sm:w-auto dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
                      >
                        Open Link
                        <ExternalLink className="h-4 w-4" />
                      </button>
                      <span className="rounded-full bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500 dark:bg-zinc-950 dark:text-zinc-300">
                        {widget.openInNewTab ? "New Tab" : "Same Tab"}
                      </span>
                      <span className="rounded-full bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500 dark:bg-zinc-950 dark:text-zinc-300">
                        {widget.layout}
                      </span>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-[1.75rem] border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900 sm:p-10 lg:col-span-2 2xl:col-span-3">
                <Link2 className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-700" />
                <h3 className="mt-4 text-lg font-black text-zinc-900 dark:text-zinc-100 sm:text-xl">
                  No widgets match the current filter
                </h3>
                <p className="mt-2 text-sm text-zinc-500">
                  Add your first important URL above, or change the search and category filter.
                </p>
              </div>
            )}
          </div>
        </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">{label}</div>
      {children}
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-bold transition-all ${
        checked
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-black"
          : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      }`}
    >
      <span>{label}</span>
      <span>{checked ? "On" : "Off"}</span>
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
      <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">{label}</div>
      <div className="mt-3 text-2xl font-black text-zinc-900 dark:text-zinc-100 sm:text-3xl">{value}</div>
    </div>
  );
}

function HintCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-sm font-black text-zinc-900 dark:text-zinc-100">{title}</div>
      <div className="mt-2 text-sm text-zinc-500">{description}</div>
    </div>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
