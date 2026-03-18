"use client";

import React, { useCallback, useContext, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ExternalLink, Hash, Link2, Pencil, Pin, PinOff,
  Plus, Search, Trash2, X, FolderOpen, Star,
} from "lucide-react";
import { AppContext } from "./Root";
import { FeatureGate } from "./FeatureGate";
import {
  createLinkWidgetRecord,
  normalizeLinkWidgetRecords,
  type LinkWidgetLayout,
  type LinkWidgetRecord,
} from "../lib/workspaceTools";
import { toast } from "sonner";

const COLOR_OPTIONS = [
  { id: "slate",   label: "Slate",   badge: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black", accent: "from-zinc-500/10",   border: "border-l-zinc-400",   dot: "bg-zinc-400" },
  { id: "emerald", label: "Emerald", badge: "bg-emerald-600 text-white",                                accent: "from-emerald-500/10", border: "border-l-emerald-500", dot: "bg-emerald-500" },
  { id: "blue",    label: "Blue",    badge: "bg-blue-600 text-white",                                   accent: "from-blue-500/10",    border: "border-l-blue-500",    dot: "bg-blue-500" },
  { id: "amber",   label: "Amber",   badge: "bg-amber-500 text-black",                                  accent: "from-amber-500/10",   border: "border-l-amber-500",   dot: "bg-amber-500" },
  { id: "rose",    label: "Rose",    badge: "bg-rose-500 text-white",                                   accent: "from-rose-500/10",    border: "border-l-rose-500",    dot: "bg-rose-500" },
  { id: "violet",  label: "Violet",  badge: "bg-violet-600 text-white",                                 accent: "from-violet-500/10",  border: "border-l-violet-500",  dot: "bg-violet-500" },
] as const;

type ColorId = typeof COLOR_OPTIONS[number]["id"];

const defaultForm = {
  title: "", url: "", description: "", category: "", color: "slate" as ColorId,
  icon: "", layout: "compact" as LinkWidgetLayout, pinned: true, openInNewTab: true,
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
  const rawWidgets = ctx?.linkWidgets || [];
  const setLinkWidgets = ctx?.setLinkWidgets || (() => {});

  // Normalize once on mount and when raw widgets change reference
  const prevRef = useRef<typeof rawWidgets>(rawWidgets);
  const [widgets, setWidgets] = useState<LinkWidgetRecord[]>(() => normalizeLinkWidgetRecords(rawWidgets));

  // Sync external changes (avoid re-normalizing on every render)
  if (prevRef.current !== rawWidgets) {
    prevRef.current = rawWidgets;
    const next = normalizeLinkWidgetRecords(rawWidgets);
    setWidgets(next);
  }

  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Commit changes to context + local state atomically
  const commitWidgets = useCallback((next: LinkWidgetRecord[]) => {
    setWidgets(next);
    setLinkWidgets(next);
  }, [setLinkWidgets]);

  const categories = useMemo(() => {
    const values = new Set<string>();
    widgets.forEach(w => { if (w.category) values.add(w.category); });
    return ["All", ...Array.from(values).sort()];
  }, [widgets]);

  const filteredWidgets = useMemo(() => {
    return widgets
      .filter(w => {
        const q = search.toLowerCase();
        const matchesSearch = !q || [w.title, w.url, w.description, w.category].join(" ").toLowerCase().includes(q);
        const matchesCat = selectedCategory === "All" || w.category === selectedCategory;
        return matchesSearch && matchesCat;
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [widgets, search, selectedCategory]);

  const stats = useMemo(() => ({
    total: widgets.length,
    pinned: widgets.filter(w => w.pinned).length,
    categories: Math.max(categories.length - 1, 0),
  }), [widgets, categories.length]);

  const resetForm = () => { setForm(defaultForm); setEditingId(null); };

  const normalizeUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedUrl = normalizeUrl(form.url);
    try { new URL(normalizedUrl); } catch { toast.error("Invalid URL"); return; }

    const now = new Date().toISOString();
    const nextWidget = createLinkWidgetRecord({
      id: editingId || undefined, title: form.title, url: normalizedUrl,
      description: form.description, category: form.category, color: form.color,
      icon: form.icon, layout: form.layout, pinned: form.pinned,
      openInNewTab: form.openInNewTab, updatedAt: now,
    });

    const next = editingId
      ? widgets.map(w => w.id === editingId ? nextWidget : w)
      : [nextWidget, ...widgets];
    commitWidgets(next);
    toast.success(editingId ? "Widget updated" : "Widget added");
    resetForm();
    if (!editingId) setShowForm(false);
  };

  const handleEdit = (widget: LinkWidgetRecord) => {
    setEditingId(widget.id);
    setForm({
      title: widget.title, url: widget.url, description: widget.description,
      category: widget.category, color: widget.color as ColorId, icon: widget.icon,
      layout: widget.layout, pinned: widget.pinned, openInNewTab: widget.openInNewTab,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id: string) => {
    const next = widgets.filter(w => w.id !== id);
    commitWidgets(next);
    setConfirmDeleteId(null);
    if (editingId === id) { resetForm(); setShowForm(false); }
    toast.success("Widget removed");
  };

  const togglePinned = (id: string) => {
    const next = widgets.map(w =>
      w.id === id
        ? createLinkWidgetRecord({ ...w, pinned: !w.pinned, updatedAt: new Date().toISOString() })
        : w,
    );
    commitWidgets(next);
  };

  const openWidget = (widget: LinkWidgetRecord) => {
    if (typeof window === "undefined") return;
    window.open(widget.url, widget.openInNewTab ? "_blank" : "_self", widget.openInNewTab ? "noopener,noreferrer" : undefined);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="px-4 py-5 md:px-6 max-w-screen-2xl mx-auto space-y-5"
    >
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">Widgets</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Quick-launch links to your most important tools & dashboards</p>
        </div>
        <button
          onClick={() => { if (showForm && !editingId) { setShowForm(false); resetForm(); } else { resetForm(); setShowForm(true); } }}
          className="app-accent-button inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all hover:opacity-90 active:scale-95 shrink-0"
        >
          {showForm && !editingId ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm && !editingId ? "Cancel" : "Add Widget"}
        </button>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Widgets", value: stats.total, icon: <Link2 className="w-4 h-4" /> },
          { label: "Pinned", value: stats.pinned, icon: <Pin className="w-4 h-4" /> },
          { label: "Categories", value: stats.categories, icon: <FolderOpen className="w-4 h-4" /> },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3.5">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{s.label}</div>
              <div className="text-zinc-300 dark:text-zinc-700">{s.icon}</div>
            </div>
            <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tabular-nums">{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Add/Edit Form ── */}
      <AnimatePresence>
        {showForm && (
          <motion.section
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                  {editingId ? "Edit Widget" : "New Widget"}
                </h2>
                {editingId && (
                  <button onClick={() => { resetForm(); setShowForm(false); }}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Title *">
                    <input required value={form.title} onChange={e => setForm(c => ({ ...c, title: e.target.value }))}
                      className={inputCx} placeholder="My Dashboard" autoFocus={!editingId} />
                  </FormField>
                  <FormField label="URL *">
                    <input required value={form.url} onChange={e => setForm(c => ({ ...c, url: e.target.value }))}
                      className={inputCx} placeholder="https://..." />
                  </FormField>
                  <FormField label="Description">
                    <input value={form.description} onChange={e => setForm(c => ({ ...c, description: e.target.value }))}
                      className={inputCx} placeholder="Optional short description" />
                  </FormField>
                  <FormField label="Category">
                    <input value={form.category} onChange={e => setForm(c => ({ ...c, category: e.target.value }))}
                      className={inputCx} placeholder="Tools, Docs, Reports..." list="category-suggestions" />
                    <datalist id="category-suggestions">
                      {categories.filter(c => c !== "All").map(c => <option key={c} value={c} />)}
                    </datalist>
                  </FormField>
                </div>

                <div className="flex flex-wrap items-end gap-4">
                  <FormField label="Icon (1-3 chars)">
                    <input value={form.icon} onChange={e => setForm(c => ({ ...c, icon: e.target.value.slice(0, 3) }))}
                      className={`${inputCx} w-20`} placeholder="GC" />
                  </FormField>

                  <FormField label="Color">
                    <div className="flex gap-1.5">
                      {COLOR_OPTIONS.map(o => (
                        <button key={o.id} type="button" onClick={() => setForm(c => ({ ...c, color: o.id }))}
                          title={o.label}
                          className={`w-7 h-7 rounded-lg ${o.badge} text-[8px] font-black transition-all ${form.color === o.id ? "ring-2 ring-offset-2 ring-zinc-900 dark:ring-zinc-100 scale-110" : "opacity-40 hover:opacity-70"}`}>
                          {o.label.charAt(0)}
                        </button>
                      ))}
                    </div>
                  </FormField>

                  <FormField label="Layout">
                    <div className="flex gap-1">
                      {(["compact", "wide"] as LinkWidgetLayout[]).map(l => (
                        <button key={l} type="button" onClick={() => setForm(c => ({ ...c, layout: l }))}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${form.layout === l ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200"}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </FormField>

                  <div className="flex gap-2 ml-auto">
                    <ToggleChip label="Pinned" active={form.pinned} icon={<Pin className="w-3 h-3" />}
                      onClick={() => setForm(c => ({ ...c, pinned: !c.pinned }))} />
                    <ToggleChip label="New Tab" active={form.openInNewTab} icon={<ExternalLink className="w-3 h-3" />}
                      onClick={() => setForm(c => ({ ...c, openInNewTab: !c.openInNewTab }))} />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button type="submit"
                    className="app-accent-button inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all hover:opacity-90 active:scale-95">
                    {editingId ? "Update Widget" : "Add Widget"}
                  </button>
                  <button type="button" onClick={() => { resetForm(); setShowForm(false); }}
                    className="rounded-xl px-4 py-2.5 text-sm font-bold border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── Search + Category Filters ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex flex-1 items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2.5">
          <Search className="h-4 w-4 text-zinc-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400"
            placeholder="Search widgets, URLs, descriptions..." />
          {search && <button onClick={() => setSearch("")} className="p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"><X className="w-3.5 h-3.5" /></button>}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                selectedCategory === cat
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black"
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}>
              {cat === "All" ? (
                <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> All</span>
              ) : cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Widget Grid ── */}
      {filteredWidgets.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 py-20 text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mx-auto mb-4">
            <Link2 className="h-7 w-7 text-zinc-400" />
          </div>
          <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">No widgets found</h3>
          <p className="mt-1 text-sm text-zinc-500 max-w-xs mx-auto">
            {search || selectedCategory !== "All" ? "Try different search or category." : "Add your first widget to get started."}
          </p>
          {(search || selectedCategory !== "All") ? (
            <button onClick={() => { setSearch(""); setSelectedCategory("All"); }}
              className="mt-3 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline underline-offset-2 transition-colors">
              Clear filters
            </button>
          ) : (
            <button onClick={() => { resetForm(); setShowForm(true); }}
              className="mt-4 app-accent-button inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all hover:opacity-90">
              <Plus className="h-4 w-4" /> Add Widget
            </button>
          )}
        </motion.div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {filteredWidgets.map(widget => {
              const palette = COLOR_OPTIONS.find(o => o.id === widget.color) || COLOR_OPTIONS[0];
              const isConfirmingDelete = confirmDeleteId === widget.id;
              return (
                <motion.article
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={widget.id}
                  className={`relative group rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 overflow-hidden transition-all hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-lg border-l-[3px] ${palette.border} ${widget.layout === "wide" ? "sm:col-span-2" : ""}`}
                >
                  {/* Card body — click to open */}
                  <button
                    onClick={() => openWidget(widget)}
                    className={`w-full text-left p-4 bg-gradient-to-br ${palette.accent} to-transparent transition-all focus:outline-none`}
                    aria-label={`Open ${widget.title}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black uppercase shadow-sm ${palette.badge}`}>
                        {(widget.icon || widget.title.slice(0, 2)).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {widget.pinned && <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />}
                          {widget.category && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">{widget.category}</span>
                          )}
                        </div>
                        <h3 className="font-black text-zinc-900 dark:text-zinc-100 text-sm leading-tight truncate">{widget.title}</h3>
                        <p className="text-[11px] text-zinc-400 truncate mt-0.5 group-hover:text-zinc-500 transition-colors">{widget.url}</p>
                        {widget.description && (
                          <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2 leading-snug">{widget.description}</p>
                        )}
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-700 group-hover:text-zinc-500 dark:group-hover:text-zinc-400 transition-colors shrink-0 mt-0.5" />
                    </div>
                  </button>

                  {/* Action bar */}
                  <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/30">
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => togglePinned(widget.id)}
                        title={widget.pinned ? "Unpin" : "Pin"}
                        className={`p-1.5 rounded-lg transition-all ${widget.pinned ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20" : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600 dark:hover:text-zinc-300"}`}>
                        {widget.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => handleEdit(widget)} title="Edit"
                        className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600 dark:hover:text-zinc-300 transition-all">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1 ml-1">
                          <button onClick={() => handleDelete(widget.id)}
                            className="px-2 py-0.5 rounded-lg bg-rose-500 text-white text-[10px] font-bold hover:bg-rose-600 transition-colors">
                            Delete
                          </button>
                          <button onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] font-bold hover:bg-zinc-200 transition-colors">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(widget.id)} title="Delete"
                          className="p-1.5 rounded-lg text-zinc-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-500 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {widget.openInNewTab && (
                        <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">New tab</span>
                      )}
                      <span className={`w-1.5 h-1.5 rounded-full ${palette.dot}`} />
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

/* ── Helpers ── */
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">{label}</div>
      {children}
    </label>
  );
}

function ToggleChip({ label, active, icon, onClick }: { label: string; active: boolean; icon?: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
        active ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200"
      }`}>
      {icon} {label} {active ? "✓" : "○"}
    </button>
  );
}

const inputCx = "w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 transition-colors focus:border-zinc-400 dark:focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/5 dark:focus:ring-zinc-100/5";
