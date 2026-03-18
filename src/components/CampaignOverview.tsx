import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import {
  TrendingUp, Search, ChevronUp, ChevronDown, AlertTriangle,
  CheckCircle2, Download, FileText, X, Filter,
  BarChart3, Activity, CalendarRange, Clock, Layers, RotateCcw,
  Target, Award, Zap, TrendingDown, Building2, Smartphone,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CAMPAIGN_DATA_EVENT, CampaignRow, loadCampaigns, saveCampaigns } from "../lib/campaignOverviewData";

const TODAY = "2026-03-17";

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
const fmt = (n: number) => n.toLocaleString();
const daysUntil = (dateStr: string) => {
  const d = new Date(dateStr).getTime() - new Date(TODAY).getTime();
  return Math.ceil(d / 86400000);
};
const daysActive = (start: string) => {
  const d = new Date(TODAY).getTime() - new Date(start).getTime();
  return Math.max(1, Math.ceil(d / 86400000));
};

function extractBrand(name: string): string {
  return name.split(" - ")[0].trim();
}

function extractPlatform(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("tiktok") && n.includes("snap")) return "TikTok/Snap";
  if (n.includes("tiktok")) return "TikTok";
  if (n.includes("snap")) return "Snapchat";
  if (n.includes("reel")) return "Reels";
  if (n.includes("solitaire")) return "Solitaire";
  if (n.includes("story")) return "Story";
  if (n.includes("highest platform")) return "Highest Platform";
  return "Standard";
}

type CovStatus = "on-track" | "progress" | "behind";
const statusOf = (v: number, t: number): CovStatus => {
  const r = pct(v, t);
  return r >= 100 ? "on-track" : r >= 60 ? "progress" : "behind";
};
const statusColor = (v: number, t: number) => {
  const s = statusOf(v, t);
  return s === "on-track" ? "text-emerald-500" : s === "progress" ? "text-amber-500" : "text-rose-500";
};
const statusBg = (v: number, t: number) => {
  const s = statusOf(v, t);
  return s === "on-track"
    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
    : s === "progress"
    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
    : "bg-rose-500/10 text-rose-500 border-rose-500/20";
};
const covColor = (p: number) => p >= 100 ? "#10b981" : p >= 60 ? "#f59e0b" : "#f43f5e";

// ── Exports ────────────────────────────────────────────────────────────────────
function exportCSV(rows: CampaignRow[]) {
  const h = ["Campaign", "Brand", "Platform", "Country", "Type", "List", "Confirmations", "Conf%", "Target", "Visited", "Visit%", "Coverage", "Cov%", "Gap", "Vel/day", "Start", "End"];
  const lines = [
    h.join(","),
    ...rows.map(r => {
      const da = daysActive(r.startDate);
      return [
        `"${r.name.replace(/"/g, '""')}"`,
        `"${extractBrand(r.name)}"`,
        extractPlatform(r.name),
        r.country, r.type,
        r.list, r.confirmations, pct(r.confirmations, r.list),
        r.target, r.visited, pct(r.visited, r.target),
        r.coverage, pct(r.coverage, r.target),
        Math.max(0, r.target - r.coverage),
        (r.coverage / da).toFixed(2),
        r.startDate, r.endDate,
      ].join(",");
    }),
  ];
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
  a.download = "campaign-overview.csv";
  a.click();
}

function exportExcel(rows: CampaignRow[]) {
  const data = rows.map(r => {
    const da = daysActive(r.startDate);
    return {
      Campaign: r.name, Brand: extractBrand(r.name), Platform: extractPlatform(r.name),
      Country: r.country, Type: r.type,
      List: r.list, Confirmations: r.confirmations, "Conf%": pct(r.confirmations, r.list),
      Target: r.target, Visited: r.visited, "Visit%": pct(r.visited, r.target),
      Coverage: r.coverage, "Cov%": pct(r.coverage, r.target),
      Gap: Math.max(0, r.target - r.coverage),
      "Vel/day": +(r.coverage / da).toFixed(2),
      Start: r.startDate, End: r.endDate,
    };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Overview");
  XLSX.writeFile(wb, "campaign-overview.xlsx");
}

function exportPDF(
  rows: CampaignRow[],
  totals: { list: number; conf: number; target: number; visited: number; coverage: number; gap: number },
  statusCounts: { onTrack: number; progress: number; behind: number },
  urgentCount: number,
  brandData: { brand: string; covPct: number; campaigns: number }[],
) {
  const win = window.open("", "_blank");
  if (!win) return;
  const cc = (p: number) => p >= 100 ? "#10b981" : p >= 60 ? "#f59e0b" : "#f43f5e";
  const sl = (v: number, t: number) => { const p = pct(v, t); return p >= 100 ? "On Track" : p >= 60 ? "Progress" : "Behind"; };
  const maxBrand = Math.max(...brandData.map(d => d.covPct), 100);

  const kpiHtml = [
    { label: "Total List", value: fmt(totals.list), sub: `${rows.length} campaigns` },
    { label: "Confirmations", value: fmt(totals.conf), pctVal: pct(totals.conf, totals.list) },
    { label: "Total Target", value: fmt(totals.target) },
    { label: "Visited", value: fmt(totals.visited), pctVal: pct(totals.visited, totals.target) },
    { label: "Coverage", value: fmt(totals.coverage), pctVal: pct(totals.coverage, totals.target) },
    { label: "Total Gap", value: fmt(totals.gap), sub: "target deficit" },
  ].map(k => `
    <div class="kpi-card">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value">${k.value}</div>
      ${k.sub ? `<div class="kpi-sub">${k.sub}</div>` : ""}
      ${k.pctVal !== undefined ? `
        <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(k.pctVal, 100)}%;background:${cc(k.pctVal)}"></div></div>
        <div class="kpi-sub" style="color:${cc(k.pctVal)};font-weight:700">${k.pctVal}%</div>
      ` : ""}
    </div>
  `).join("");

  const brandHtml = brandData.map(d => `
    <div class="country-row">
      <div class="country-name">${d.brand.slice(0, 18)}</div>
      <div class="country-bar-wrap"><div class="country-bar" style="width:${Math.round((d.covPct / maxBrand) * 100)}%;background:${cc(d.covPct)}"></div></div>
      <div class="country-pct" style="color:${cc(d.covPct)}">${d.covPct}%</div>
      <div class="country-camps">${d.campaigns}c</div>
    </div>
  `).join("");

  const tableRows = rows.map((r, i) => {
    const covP = pct(r.coverage, r.target);
    const confP = pct(r.confirmations, r.list);
    const visitP = pct(r.visited, r.target);
    const color = cc(covP);
    const days = daysUntil(r.endDate);
    const endTag = days >= 0 && days <= 7 ? `<span style="font-size:8px;color:#ea580c;font-weight:700"> &bull; ${days}d</span>` : "";
    const gap = Math.max(0, r.target - r.coverage);
    return `<tr${i % 2 === 1 ? ' class="even"' : ""}>
      <td class="campaign-name">${r.name}${endTag}<br><span style="font-size:8px;color:#71717a">${extractBrand(r.name)} &middot; ${extractPlatform(r.name)} &middot; ${r.country}</span></td>
      <td class="num">${fmt(r.list)}</td>
      <td class="num">${fmt(r.confirmations)}</td>
      <td class="num"><span style="color:${cc(confP)};font-weight:700">${confP}%</span></td>
      <td class="num">${fmt(r.target)}</td>
      <td class="num">${fmt(r.visited)}</td>
      <td class="num"><span style="color:${cc(visitP)};font-weight:700">${visitP}%</span></td>
      <td class="num">${fmt(r.coverage)}</td>
      <td><div class="bar-wrap"><div class="bar-track"><div class="bar-fill" style="width:${Math.min(covP,100)}%;background:${color}"></div></div><span class="bar-pct" style="color:${color}">${covP}%</span></div></td>
      <td class="num" style="color:#f43f5e">${gap > 0 ? `-${fmt(gap)}` : "✓"}</td>
      <td><span class="badge" style="background:${color}20;color:${color};border:1px solid ${color}40">${sl(r.coverage, r.target)}</span></td>
    </tr>`;
  }).join("");

  const totalCovP = pct(totals.coverage, totals.target);
  win.document.write(`<!DOCTYPE html><html><head><title>Campaign Overview</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,Arial,sans-serif;font-size:10px;color:#18181b;padding:24px}
    h1{font-size:20px;font-weight:900}
    .meta{color:#71717a;font-size:9px;margin-top:3px;margin-bottom:16px}
    .section-title{font-size:11px;font-weight:800;margin:14px 0 8px;padding-bottom:5px;border-bottom:2px solid #e4e4e7;text-transform:uppercase;letter-spacing:.05em;color:#52525b}
    .kpi-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:14px}
    .kpi-card{background:#f4f4f5;border-radius:8px;padding:10px}
    .kpi-label{font-size:7.5px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:#71717a}
    .kpi-value{font-size:16px;font-weight:900;margin-top:4px}
    .kpi-sub{font-size:8px;color:#71717a;margin-top:2px}
    .progress-bar{height:4px;background:#e4e4e7;border-radius:2px;margin-top:5px;overflow:hidden}
    .progress-fill{height:100%;border-radius:2px}
    .status-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}
    .status-card{border-radius:8px;padding:9px 11px}
    .status-card.on-track{background:#ecfdf5;border:1px solid #6ee7b7}
    .status-card.progress{background:#fffbeb;border:1px solid #fcd34d}
    .status-card.behind{background:#fff1f2;border:1px solid #fda4af}
    .status-card.urgent{background:#fff7ed;border:1px solid #fdba74}
    .status-label{font-size:8px;font-weight:800;text-transform:uppercase}
    .status-count{font-size:16px;font-weight:900;margin-top:2px}
    .status-desc{font-size:8px;color:#71717a;margin-top:1px}
    .country-grid{margin-bottom:14px}
    .country-row{display:flex;align-items:center;gap:6px;margin-bottom:5px}
    .country-name{width:70px;font-size:9px;font-weight:600;flex-shrink:0}
    .country-bar-wrap{flex:1;height:6px;background:#e4e4e7;border-radius:3px;overflow:hidden}
    .country-bar{height:100%;border-radius:3px}
    .country-pct{width:32px;text-align:right;font-size:9px;font-weight:800;flex-shrink:0}
    .country-camps{width:28px;text-align:right;font-size:8px;color:#71717a;flex-shrink:0}
    table{width:100%;border-collapse:collapse;font-size:8.5px}
    thead th{background:#18181b;color:#fff;padding:5px 6px;text-align:left;font-size:7.5px;font-weight:800;text-transform:uppercase}
    thead th.num{text-align:right}
    td{padding:4px 6px;border-bottom:1px solid #f4f4f5;vertical-align:middle}
    td.num{text-align:right;font-variant-numeric:tabular-nums}
    tr.even td{background:#fafafa}
    .campaign-name{max-width:180px;word-break:break-word;font-weight:600;line-height:1.3}
    .bar-wrap{display:flex;align-items:center;gap:4px}
    .bar-track{flex:1;height:4px;background:#e4e4e7;border-radius:2px;min-width:28px;overflow:hidden}
    .bar-fill{height:100%;border-radius:2px}
    .bar-pct{font-weight:800;font-size:9px;white-space:nowrap}
    .badge{display:inline-block;padding:2px 6px;border-radius:99px;font-weight:700;font-size:8px}
  </style></head><body>
    <h1>Campaign Overview</h1>
    <div class="meta">Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} &nbsp;&middot;&nbsp; ${rows.length} campaigns</div>
    <div class="section-title">Key Metrics</div>
    <div class="kpi-grid">${kpiHtml}</div>
    <div class="section-title">Status Breakdown</div>
    <div class="status-grid">
      <div class="status-card on-track"><div class="status-label" style="color:#059669">&#10003; On Track</div><div class="status-count">${statusCounts.onTrack}</div><div class="status-desc">Cov% &ge; 100%</div></div>
      <div class="status-card progress"><div class="status-label" style="color:#d97706">&#8599; Progress</div><div class="status-count">${statusCounts.progress}</div><div class="status-desc">Cov% 60&ndash;99%</div></div>
      <div class="status-card behind"><div class="status-label" style="color:#e11d48">&#9650; Behind</div><div class="status-count">${statusCounts.behind}</div><div class="status-desc">Cov% &lt; 60%</div></div>
      <div class="status-card urgent"><div class="status-label" style="color:#ea580c">&#9201; Ending Soon</div><div class="status-count">${urgentCount}</div><div class="status-desc">Within 7 days</div></div>
    </div>
    <div class="section-title">Brand Leaderboard</div>
    <div class="country-grid">${brandHtml || "<p style='color:#71717a;font-size:9px'>No data</p>"}</div>
    <div class="section-title">Campaign Details</div>
    <table>
      <thead><tr>
        <th>Campaign</th>
        <th class="num">List</th><th class="num">Conf</th><th class="num">Conf%</th>
        <th class="num">Target</th><th class="num">Visited</th><th class="num">Visit%</th>
        <th class="num">Coverage</th><th>Cov%</th><th class="num">Gap</th><th>Status</th>
      </tr></thead>
      <tbody>
        ${tableRows}
        <tr style="background:#f4f4f5;font-weight:900;border-top:2px solid #e4e4e7">
          <td class="campaign-name" style="font-size:9px;text-transform:uppercase;color:#71717a">Totals (${rows.length})</td>
          <td class="num">${fmt(totals.list)}</td>
          <td class="num">${fmt(totals.conf)}</td>
          <td class="num"><span style="color:${cc(pct(totals.conf,totals.list))};font-weight:900">${pct(totals.conf,totals.list)}%</span></td>
          <td class="num">${fmt(totals.target)}</td>
          <td class="num">${fmt(totals.visited)}</td>
          <td class="num"><span style="color:${cc(pct(totals.visited,totals.target))};font-weight:900">${pct(totals.visited,totals.target)}%</span></td>
          <td class="num">${fmt(totals.coverage)}</td>
          <td><div class="bar-wrap"><div class="bar-track"><div class="bar-fill" style="width:${Math.min(totalCovP,100)}%;background:${cc(totalCovP)}"></div></div><span class="bar-pct" style="color:${cc(totalCovP)}">${totalCovP}%</span></div></td>
          <td class="num" style="color:#f43f5e">-${fmt(totals.gap)}</td>
          <td></td>
        </tr>
      </tbody>
    </table>
  <script>window.onload=()=>{window.print()}</script>
  </body></html>`);
  win.document.close();
}

// ── Shared UI helpers ──────────────────────────────────────────────────────────
function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-[var(--app-radius)] border border-border bg-card p-3 shadow-xl text-xs space-y-1.5 max-w-[240px]">
      <p className="font-bold text-foreground leading-snug">{d?.fullName || d?.name || d?.label || d?.brand || d?.platform}</p>
      <div className="space-y-1 pt-0.5">
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2 h-2 rounded-sm inline-block shrink-0" style={{ background: p.fill || p.color }} />
              {p.name}
            </span>
            <span className="font-bold tabular-nums text-foreground">{p.value}{p.unit || "%"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((value / Math.max(max, 1)) * 100, 100)}%`, background: color }} />
      </div>
      <span className="text-xs font-bold tabular-nums w-8 text-right text-foreground">{value}%</span>
    </div>
  );
}

function FunnelViz({ stages }: { stages: { label: string; value: number; sub: string; color: string }[] }) {
  const max = stages[0]?.value || 1;
  return (
    <div className="space-y-2.5">
      {stages.map((s, i) => (
        <div key={s.label}>
          {i > 0 && (
            <div className="flex justify-center py-0.5">
              <ChevronRight className="w-3 h-3 text-muted-foreground/40 rotate-90" />
            </div>
          )}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">{s.label}</span>
              <div className="text-right">
                <span className="font-black text-foreground tabular-nums">{fmt(s.value)}</span>
                {s.sub && <span className="text-muted-foreground ml-1.5">{s.sub}</span>}
              </div>
            </div>
            <div className="h-6 bg-muted/40 rounded overflow-hidden">
              <div
                className="h-full rounded transition-all duration-500"
                style={{ width: `${Math.max((s.value / max) * 100, 2)}%`, background: s.color, opacity: 0.85 }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────────
type SortKey = "name" | "brand" | "platform" | "list" | "confirmations" | "confPct" | "target" | "visited" | "visitPct" | "coverage" | "covPct" | "gap" | "velocity";
type StatusFilter = "all" | "on-track" | "progress" | "behind";
type DateMode = "all" | "active" | "ending-soon" | "ended";

// ── Component ──────────────────────────────────────────────────────────────────
export function CampaignOverview() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>(() => loadCampaigns());

  // Filters
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateMode, setDateMode] = useState<DateMode>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [covMin, setCovMin] = useState("");
  const [covMax, setCovMax] = useState("");
  const [hasConf, setHasConf] = useState<"all" | "yes" | "no">("all");
  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("covPct");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [resetConfirm, setResetConfirm] = useState(false);

  useEffect(() => {
    const reload = () => setCampaigns(loadCampaigns());
    window.addEventListener(CAMPAIGN_DATA_EVENT, reload);
    const onVisible = () => { if (document.visibilityState === "visible") reload(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(CAMPAIGN_DATA_EVENT, reload);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const brands = useMemo(() => ["all", ...Array.from(new Set(campaigns.map(c => extractBrand(c.name)))).sort()], [campaigns]);
  const countries = useMemo(() => ["all", ...Array.from(new Set(campaigns.map(c => c.country))).sort()], [campaigns]);
  const types = useMemo(() => ["all", ...Array.from(new Set(campaigns.map(c => c.type))).sort()], [campaigns]);
  const platforms = useMemo(() => ["all", ...Array.from(new Set(campaigns.map(c => extractPlatform(c.name)))).sort()], [campaigns]);
  const months = useMemo(() => ["all", ...Array.from(new Set(campaigns.map(c => c.startDate.slice(0, 7)))).sort().reverse()], [campaigns]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const rows = campaigns.filter(c => {
      const brand = extractBrand(c.name);
      const platform = extractPlatform(c.name);
      const covP = pct(c.coverage, c.target);
      if (brandFilter !== "all" && brand !== brandFilter) return false;
      if (countryFilter !== "all" && c.country !== countryFilter) return false;
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (platformFilter !== "all" && platform !== platformFilter) return false;
      if (statusFilter !== "all" && statusOf(c.coverage, c.target) !== statusFilter) return false;
      if (monthFilter !== "all" && !c.startDate.startsWith(monthFilter)) return false;
      if (dateFrom && c.startDate < dateFrom) return false;
      if (dateTo && c.endDate > dateTo) return false;
      if (dateMode === "active" && !(c.startDate <= TODAY && c.endDate >= TODAY)) return false;
      if (dateMode === "ending-soon") { const d = daysUntil(c.endDate); if (d < 0 || d > 7) return false; }
      if (dateMode === "ended" && c.endDate >= TODAY) return false;
      if (covMin !== "" && covP < Number(covMin)) return false;
      if (covMax !== "" && covP > Number(covMax)) return false;
      if (hasConf === "yes" && c.confirmations === 0) return false;
      if (hasConf === "no" && c.confirmations > 0) return false;
      if (q && !c.name.toLowerCase().includes(q) && !brand.toLowerCase().includes(q) && !c.country.toLowerCase().includes(q) && !c.type.toLowerCase().includes(q)) return false;
      return true;
    });
    return [...rows].sort((a, b) => {
      if (sortKey === "name") return sortDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      if (sortKey === "brand") { const ba = extractBrand(a.name), bb = extractBrand(b.name); return sortDir === "asc" ? ba.localeCompare(bb) : bb.localeCompare(ba); }
      if (sortKey === "platform") { const pa = extractPlatform(a.name), pb = extractPlatform(b.name); return sortDir === "asc" ? pa.localeCompare(pb) : pb.localeCompare(pa); }
      const val = (r: CampaignRow): number => {
        const da = daysActive(r.startDate);
        switch (sortKey) {
          case "confPct": return pct(r.confirmations, r.list);
          case "visitPct": return pct(r.visited, r.target);
          case "covPct": return pct(r.coverage, r.target);
          case "gap": return Math.max(0, r.target - r.coverage);
          case "velocity": return r.coverage / da;
          default: return (r[sortKey as keyof CampaignRow] as number) || 0;
        }
      };
      return sortDir === "asc" ? val(a) - val(b) : val(b) - val(a);
    });
  }, [campaigns, search, brandFilter, countryFilter, typeFilter, platformFilter, statusFilter, dateMode, dateFrom, dateTo, monthFilter, covMin, covMax, hasConf, sortKey, sortDir]);

  const totals = useMemo(() => ({
    list: filtered.reduce((s, c) => s + c.list, 0),
    conf: filtered.reduce((s, c) => s + c.confirmations, 0),
    target: filtered.reduce((s, c) => s + c.target, 0),
    visited: filtered.reduce((s, c) => s + c.visited, 0),
    coverage: filtered.reduce((s, c) => s + c.coverage, 0),
    gap: filtered.reduce((s, c) => s + Math.max(0, c.target - c.coverage), 0),
  }), [filtered]);

  const statusCounts = useMemo(() => ({
    onTrack: filtered.filter(c => statusOf(c.coverage, c.target) === "on-track").length,
    progress: filtered.filter(c => statusOf(c.coverage, c.target) === "progress").length,
    behind: filtered.filter(c => statusOf(c.coverage, c.target) === "behind").length,
  }), [filtered]);

  const avgCovPct = useMemo(() => {
    const wt = filtered.filter(c => c.target > 0);
    return wt.length ? Math.round(wt.reduce((s, c) => s + pct(c.coverage, c.target), 0) / wt.length) : 0;
  }, [filtered]);

  const chartData = useMemo(() =>
    [...filtered]
      .sort((a, b) => pct(b.coverage, b.target) - pct(a.coverage, a.target))
      .slice(0, 20)
      .map(c => ({
        name: extractBrand(c.name).slice(0, 14),
        fullName: c.name,
        "Conf%": pct(c.confirmations, c.list),
        "Visit%": pct(c.visited, c.target),
        "Cov%": pct(c.coverage, c.target),
        covPct: pct(c.coverage, c.target),
      })),
    [filtered]);

  const funnelStages = useMemo(() => [
    { label: "List (Influencers)", value: totals.list, sub: "100%", color: "#6366f1" },
    { label: "Confirmations", value: totals.conf, sub: `${pct(totals.conf, totals.list)}% of list`, color: "#3b82f6" },
    { label: "Visited", value: totals.visited, sub: `${pct(totals.visited, totals.target)}% of target`, color: "#f59e0b" },
    { label: "Coverage", value: totals.coverage, sub: `${pct(totals.coverage, totals.target)}% of target`, color: covColor(pct(totals.coverage, totals.target)) },
  ], [totals]);

  const brandData = useMemo(() => {
    const map = new Map<string, { campaigns: number; cov: number; target: number; conf: number; list: number; visited: number }>();
    filtered.forEach(c => {
      const b = extractBrand(c.name);
      const e = map.get(b) || { campaigns: 0, cov: 0, target: 0, conf: 0, list: 0, visited: 0 };
      map.set(b, { campaigns: e.campaigns + 1, cov: e.cov + c.coverage, target: e.target + c.target, conf: e.conf + c.confirmations, list: e.list + c.list, visited: e.visited + c.visited });
    });
    return Array.from(map.entries())
      .map(([brand, d]) => ({ brand, campaigns: d.campaigns, covPct: pct(d.cov, d.target), confPct: pct(d.conf, d.list), visitPct: pct(d.visited, d.target), coverage: d.cov, target: d.target }))
      .filter(b => b.target > 0)
      .sort((a, b) => b.covPct - a.covPct)
      .slice(0, 12);
  }, [filtered]);

  const platformData = useMemo(() => {
    const map = new Map<string, { campaigns: number; cov: number; target: number; conf: number; list: number; visited: number }>();
    filtered.forEach(c => {
      const p = extractPlatform(c.name);
      const e = map.get(p) || { campaigns: 0, cov: 0, target: 0, conf: 0, list: 0, visited: 0 };
      map.set(p, { campaigns: e.campaigns + 1, cov: e.cov + c.coverage, target: e.target + c.target, conf: e.conf + c.confirmations, list: e.list + c.list, visited: e.visited + c.visited });
    });
    return Array.from(map.entries())
      .map(([platform, d]) => ({ platform, campaigns: d.campaigns, covPct: pct(d.cov, d.target), confPct: pct(d.conf, d.list), visitPct: pct(d.visited, d.target) }))
      .sort((a, b) => b.campaigns - a.campaigns);
  }, [filtered]);

  const covDistribution = useMemo(() => {
    const buckets = [
      { label: "0%", min: 0, max: 0, color: "#f43f5e" },
      { label: "1–25%", min: 1, max: 25, color: "#f43f5e" },
      { label: "26–50%", min: 26, max: 50, color: "#fb923c" },
      { label: "51–75%", min: 51, max: 75, color: "#f59e0b" },
      { label: "76–99%", min: 76, max: 99, color: "#34d399" },
      { label: "≥100%", min: 100, max: 9999, color: "#10b981" },
    ].map(b => ({ ...b, count: 0 }));
    filtered.filter(c => c.target > 0).forEach(c => {
      const p = pct(c.coverage, c.target);
      const bucket = buckets.find(b => p >= b.min && p <= b.max);
      if (bucket) bucket.count++;
    });
    return buckets;
  }, [filtered]);

  const typeBreakdown = useMemo(() => {
    const map = new Map<string, { list: number; conf: number; target: number; visited: number; coverage: number; count: number }>();
    filtered.forEach(c => {
      const e = map.get(c.type) || { list: 0, conf: 0, target: 0, visited: 0, coverage: 0, count: 0 };
      map.set(c.type, { list: e.list + c.list, conf: e.conf + c.confirmations, target: e.target + c.target, visited: e.visited + c.visited, coverage: e.coverage + c.coverage, count: e.count + 1 });
    });
    return Array.from(map.entries()).map(([type, d]) => ({ type, ...d, covPct: pct(d.coverage, d.target), confPct: pct(d.conf, d.list), visitPct: pct(d.visited, d.target) }));
  }, [filtered]);

  const gapAnalysis = useMemo(() =>
    [...filtered]
      .filter(c => c.target > 0 && c.coverage < c.target)
      .sort((a, b) => (b.target - b.coverage) - (a.target - a.coverage))
      .slice(0, 8)
      .map(c => ({ ...c, gap: c.target - c.coverage, covPct: pct(c.coverage, c.target) })),
    [filtered]);

  const velocityData = useMemo(() =>
    [...filtered]
      .filter(c => c.target > 0 && c.coverage > 0)
      .map(c => {
        const da = daysActive(c.startDate);
        return { ...c, velocity: +(c.coverage / da).toFixed(2), covPct: pct(c.coverage, c.target), da };
      })
      .sort((a, b) => b.velocity - a.velocity)
      .slice(0, 8),
    [filtered]);

  const topPerformers = useMemo(() =>
    [...filtered].filter(c => c.target > 0).sort((a, b) => pct(b.coverage, b.target) - pct(a.coverage, a.target)).slice(0, 8),
    [filtered]);

  const needsAttention = useMemo(() =>
    [...filtered].filter(c => c.target > 0 && statusOf(c.coverage, c.target) === "behind")
      .sort((a, b) => (b.target - b.coverage) - (a.target - a.coverage)).slice(0, 8),
    [filtered]);

  const urgentCampaigns = useMemo(() =>
    filtered.filter(c => {
      const d = daysUntil(c.endDate);
      return d >= 0 && d <= 7 && c.target > 0 && statusOf(c.coverage, c.target) !== "on-track";
    }).sort((a, b) => daysUntil(a.endDate) - daysUntil(b.endDate)),
    [filtered]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronUp className="w-3 h-3 opacity-20" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  }

  const activeFilters = [
    brandFilter !== "all", countryFilter !== "all", typeFilter !== "all",
    platformFilter !== "all", statusFilter !== "all", dateMode !== "all",
    !!dateFrom, !!dateTo, monthFilter !== "all", covMin !== "", covMax !== "", hasConf !== "all",
  ].filter(Boolean).length;

  function clearFilters() {
    setSearch(""); setBrandFilter("all"); setCountryFilter("all"); setTypeFilter("all");
    setPlatformFilter("all"); setStatusFilter("all"); setDateMode("all");
    setDateFrom(""); setDateTo(""); setMonthFilter("all");
    setCovMin(""); setCovMax(""); setHasConf("all");
  }

  function handleReset() {
    if (!resetConfirm) { setResetConfirm(true); return; }
    saveCampaigns([]); clearFilters(); setResetConfirm(false);
    toast.success("All campaign data cleared.");
  }

  const CARD = "rounded-[var(--app-card-radius)] border border-border bg-card";
  const CARD_SM = "rounded-[var(--app-radius)] border border-border bg-card";

  const colDefs: [SortKey, string][] = [
    ["list", "List"], ["confirmations", "Conf"], ["confPct", "Conf%"],
    ["target", "Target"], ["visited", "Visited"], ["visitPct", "Visit%"],
    ["coverage", "Coverage"], ["covPct", "Cov%"], ["gap", "Gap"], ["velocity", "Vel/d"],
  ];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1600px] mx-auto">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Campaign Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} of {campaigns.length} campaigns
            {activeFilters > 0 && <span className="ml-1.5 text-xs font-bold text-foreground">· {activeFilters} filter{activeFilters > 1 ? "s" : ""} active</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline" size="sm"
            onClick={handleReset} onBlur={() => setResetConfirm(false)}
            className={resetConfirm ? "border-rose-500 text-rose-500 hover:bg-rose-500/10" : ""}
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            {resetConfirm ? "Confirm Reset?" : "Reset Data"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportCSV(filtered)}><Download className="w-4 h-4 mr-1.5" />CSV</Button>
          <Button variant="outline" size="sm" onClick={() => exportExcel(filtered)}><BarChart3 className="w-4 h-4 mr-1.5" />Excel</Button>
          <Button variant="outline" size="sm" onClick={() => exportPDF(filtered, totals, statusCounts, urgentCampaigns.length, brandData)}><FileText className="w-4 h-4 mr-1.5" />PDF</Button>
        </div>
      </div>

      {/* ── KPI Strip — 8 cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {([
          { label: "Total List", value: fmt(totals.list), sub: `${filtered.length} campaigns`, icon: <Activity className="w-3.5 h-3.5 text-muted-foreground" /> },
          { label: "Confirmations", value: fmt(totals.conf), pctVal: pct(totals.conf, totals.list), icon: <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" /> },
          { label: "Conf Rate", value: `${pct(totals.conf, totals.list)}%`, sub: "of list", icon: <TrendingUp className="w-3.5 h-3.5 text-blue-400" />, color: covColor(pct(totals.conf, totals.list)) },
          { label: "Total Target", value: fmt(totals.target), sub: "visits/deliveries", icon: <Target className="w-3.5 h-3.5 text-muted-foreground" /> },
          { label: "Visited", value: fmt(totals.visited), pctVal: pct(totals.visited, totals.target), icon: <Zap className="w-3.5 h-3.5 text-amber-500" /> },
          { label: "Coverage", value: fmt(totals.coverage), pctVal: pct(totals.coverage, totals.target), icon: <Award className="w-3.5 h-3.5 text-emerald-500" /> },
          { label: "Avg Cov%", value: `${avgCovPct}%`, sub: "per campaign", icon: <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />, color: covColor(avgCovPct) },
          { label: "Total Gap", value: fmt(totals.gap), sub: "target deficit", icon: <TrendingDown className="w-3.5 h-3.5 text-rose-400" /> },
        ] as const).map((kpi, i) => (
          <div key={i} className={`${CARD} p-3`}>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-none">{kpi.label}</p>
              {kpi.icon}
            </div>
            <p className="text-xl font-black text-foreground tabular-nums" style={"color" in kpi && kpi.color ? { color: kpi.color } : {}}>{kpi.value}</p>
            {"sub" in kpi && kpi.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.sub}</p>}
            {"pctVal" in kpi && kpi.pctVal !== undefined && (
              <div className="mt-1.5"><MiniBar value={kpi.pctVal} max={100} color={covColor(kpi.pctVal)} /></div>
            )}
          </div>
        ))}
      </div>

      {/* ── Status Tiles ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onClick={() => setStatusFilter(s => s === "on-track" ? "all" : "on-track")} className={`${CARD} p-3 text-left transition-all hover:border-emerald-500/40 ${statusFilter === "on-track" ? "border-emerald-500/50 bg-emerald-500/5" : ""}`}>
          <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /><span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">On Track</span></div>
          <p className="text-2xl font-black text-foreground tabular-nums">{statusCounts.onTrack}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Cov% ≥ 100%</p>
        </button>
        <button onClick={() => setStatusFilter(s => s === "progress" ? "all" : "progress")} className={`${CARD} p-3 text-left transition-all hover:border-amber-500/40 ${statusFilter === "progress" ? "border-amber-500/50 bg-amber-500/5" : ""}`}>
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-3.5 h-3.5 text-amber-500" /><span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">In Progress</span></div>
          <p className="text-2xl font-black text-foreground tabular-nums">{statusCounts.progress}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Cov% 60–99%</p>
        </button>
        <button onClick={() => setStatusFilter(s => s === "behind" ? "all" : "behind")} className={`${CARD} p-3 text-left transition-all hover:border-rose-500/40 ${statusFilter === "behind" ? "border-rose-500/50 bg-rose-500/5" : ""}`}>
          <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-3.5 h-3.5 text-rose-500" /><span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Behind</span></div>
          <p className="text-2xl font-black text-foreground tabular-nums">{statusCounts.behind}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Cov% &lt; 60%</p>
        </button>
        <button onClick={() => setDateMode(m => m === "ending-soon" ? "all" : "ending-soon")} className={`${CARD} p-3 text-left transition-all hover:border-orange-500/40 ${dateMode === "ending-soon" ? "border-orange-500/50 bg-orange-500/5" : ""}`}>
          <div className="flex items-center gap-2 mb-1"><Clock className="w-3.5 h-3.5 text-orange-500" /><span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Ending Soon</span></div>
          <p className="text-2xl font-black text-foreground tabular-nums">{urgentCampaigns.length}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Within 7 days</p>
        </button>
      </div>

      {/* ── Funnel + Main Chart ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Funnel */}
        <div className={`${CARD} p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-bold text-foreground">Campaign Funnel</p>
            <span className="text-xs text-muted-foreground ml-auto">all filtered</span>
          </div>
          <FunnelViz stages={funnelStages} />
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-2">
            {[
              { label: "Conf Rate", value: `${pct(totals.conf, totals.list)}%`, sub: "conf / list" },
              { label: "Visit Rate", value: `${pct(totals.visited, totals.target)}%`, sub: "visited / target" },
              { label: "Coverage Rate", value: `${pct(totals.coverage, totals.target)}%`, sub: "coverage / target", highlight: true },
              { label: "Completion", value: `${pct(statusCounts.onTrack, filtered.length)}%`, sub: "on-track / total" },
            ].map(m => (
              <div key={m.label} className={`${CARD_SM} p-2.5`}>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{m.label}</p>
                <p className="text-sm font-black tabular-nums" style={m.highlight ? { color: covColor(pct(totals.coverage, totals.target)) } : { color: "hsl(var(--foreground))" }}>{m.value}</p>
                <p className="text-[9px] text-muted-foreground">{m.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Main Performance Chart */}
        <div className={`${CARD} p-5 lg:col-span-2`}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <p className="text-sm font-bold text-foreground">Campaign Performance — Top 20 by Coverage%</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-medium">Conf%</span> = conf ÷ list &nbsp;·&nbsp;
                <span className="font-medium">Visit%</span> = visits ÷ target &nbsp;·&nbsp;
                <span className="font-medium">Cov%</span> = coverage ÷ target
              </p>
            </div>
            <Activity className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -24, bottom: 80 }} barCategoryGap="18%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} angle={-40} textAnchor="end" interval={0} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} unit="%" tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} />
              <ReferenceLine y={100} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeOpacity={0.4} />
              <Bar dataKey="Conf%" fill="hsl(var(--muted-foreground))" radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Bar dataKey="Visit%" fill="hsl(var(--foreground))" fillOpacity={0.5} radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Bar dataKey="Cov%" radius={[3, 3, 0, 0]} maxBarSize={22}>
                {chartData.map((e, i) => <Cell key={i} fill={covColor(e.covPct)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap items-center gap-4 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-muted-foreground inline-block" />Conf%</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-foreground/50 inline-block" />Visit%</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-emerald-500 inline-block" />Cov% ≥100</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-amber-500 inline-block" />60–99%</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-rose-500 inline-block" />&lt;60%</span>
          </div>
        </div>
      </div>

      {/* ── Analytics Row 1: Brand + Platform + Distribution ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Brand Leaderboard */}
        <div className={`${CARD} p-4`}>
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-bold text-foreground">Brand Leaderboard</p>
            <span className="text-xs text-muted-foreground ml-auto">by Cov%</span>
          </div>
          <div className="space-y-2.5">
            {brandData.length === 0 && <p className="text-xs text-muted-foreground">No data</p>}
            {brandData.map((b, i) => (
              <div key={b.brand}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-black text-muted-foreground w-4 shrink-0">{i + 1}</span>
                    <span className="text-xs font-semibold text-foreground truncate">{b.brand}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="text-[10px] text-muted-foreground">{b.campaigns}c</span>
                    <span className="text-xs font-black" style={{ color: covColor(b.covPct) }}>{b.covPct}%</span>
                  </div>
                </div>
                <MiniBar value={b.covPct} max={Math.max(...brandData.map(x => x.covPct), 100)} color={covColor(b.covPct)} />
              </div>
            ))}
          </div>
        </div>

        {/* Platform Performance */}
        <div className={`${CARD} p-4`}>
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-bold text-foreground">Platform Performance</p>
          </div>
          <div className="space-y-4">
            {platformData.length === 0 && <p className="text-xs text-muted-foreground">No data</p>}
            {platformData.map(p => (
              <div key={p.platform} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{p.platform}</span>
                  <span className="text-[10px] text-muted-foreground">{p.campaigns} campaigns</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-10 text-[10px] text-muted-foreground shrink-0">Conf%</span>
                    <MiniBar value={p.confPct} max={100} color="#6366f1" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-10 text-[10px] text-muted-foreground shrink-0">Visit%</span>
                    <MiniBar value={p.visitPct} max={100} color="#f59e0b" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-10 text-[10px] text-muted-foreground shrink-0">Cov%</span>
                    <MiniBar value={p.covPct} max={100} color={covColor(p.covPct)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coverage Distribution + Type Breakdown */}
        <div className={`${CARD} p-4`}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-bold text-foreground">Coverage Distribution</p>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={covDistribution} margin={{ top: 0, right: 0, left: -28, bottom: 0 }} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} />
              <Bar dataKey="count" name="Campaigns" unit="" radius={[4, 4, 0, 0]} maxBarSize={36}>
                {covDistribution.map((b, i) => <Cell key={i} fill={b.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {covDistribution.filter(b => b.count > 0).map(b => (
              <span key={b.label} className="text-[10px] text-muted-foreground">{b.label}: <span className="font-bold text-foreground">{b.count}</span></span>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-border space-y-2">
            <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-muted-foreground" />By Type</p>
            {typeBreakdown.map(t => (
              <div key={t.type} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">{t.type}</span>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{t.count}c</span>
                    <span className="font-black" style={{ color: covColor(t.covPct) }}>{t.covPct}% cov</span>
                  </div>
                </div>
                <MiniBar value={t.covPct} max={100} color={covColor(t.covPct)} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Analytics Row 2: Gap + Velocity ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Gap Analysis */}
        <div className={`${CARD} p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-rose-400" />
            <p className="text-sm font-bold text-foreground">Gap Analysis</p>
            <span className="text-[10px] text-muted-foreground ml-auto">biggest target deficit</span>
          </div>
          <div className="space-y-2.5">
            {gapAnalysis.length === 0 && <p className="text-xs font-medium text-emerald-500">All campaigns are on or above target!</p>}
            {gapAnalysis.map((c, i) => {
              const maxGap = gapAnalysis[0]?.gap || 1;
              return (
                <div key={c.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-muted-foreground w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">{extractBrand(c.name)} · {extractPlatform(c.name)} · {daysUntil(c.endDate) >= 0 ? `${daysUntil(c.endDate)}d left` : "ended"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-rose-500">-{fmt(c.gap)}</span>
                      <p className="text-[10px] text-muted-foreground">{c.covPct}% done</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-6">
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-rose-400/70 transition-all" style={{ width: `${Math.min((c.gap / maxGap) * 100, 100)}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{fmt(c.coverage)}/{fmt(c.target)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Campaign Velocity */}
        <div className={`${CARD} p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-amber-500" />
            <p className="text-sm font-bold text-foreground">Campaign Velocity</p>
            <span className="text-[10px] text-muted-foreground ml-auto">coverage / active day</span>
          </div>
          <div className="space-y-2.5">
            {velocityData.length === 0 && <p className="text-xs text-muted-foreground">No campaigns with coverage data yet.</p>}
            {velocityData.map((c, i) => {
              const maxV = velocityData[0]?.velocity || 1;
              return (
                <div key={c.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-muted-foreground w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">{c.da}d active · {c.covPct}% of target done</p>
                    </div>
                    <span className="text-xs font-black text-amber-500 shrink-0">{c.velocity}/d</span>
                  </div>
                  <div className="flex items-center gap-2 pl-6">
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-amber-400/70 transition-all" style={{ width: `${Math.min((c.velocity / maxV) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Attention Row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Top Performers */}
        <div className={`${CARD} p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-emerald-500" />
            <p className="text-sm font-bold text-foreground">Top Performers</p>
            <span className="text-[10px] text-muted-foreground ml-auto">by Cov%</span>
          </div>
          <div className="space-y-2.5">
            {topPerformers.map((c, i) => {
              const covP = pct(c.coverage, c.target);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-black text-muted-foreground w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{extractBrand(c.name)} · {c.type}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-xs font-black ${statusColor(c.coverage, c.target)}`}>{covP}%</span>
                    <p className="text-[10px] text-muted-foreground">{fmt(c.coverage)}/{fmt(c.target)}</p>
                  </div>
                </div>
              );
            })}
            {topPerformers.length === 0 && <p className="text-xs text-muted-foreground">No campaigns with targets found.</p>}
          </div>
        </div>

        {/* Needs Attention */}
        <div className={`${CARD} p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <p className="text-sm font-bold text-foreground">Needs Attention</p>
            <span className="text-[10px] text-muted-foreground ml-auto">behind schedule</span>
          </div>
          <div className="space-y-2.5">
            {needsAttention.map((c, i) => {
              const covP = pct(c.coverage, c.target);
              const days = daysUntil(c.endDate);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-black text-muted-foreground w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.country} · {days >= 0 ? `${days}d left` : "ended"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-rose-500">{covP}%</span>
                    <p className="text-[10px] text-muted-foreground">{fmt(c.coverage)}/{fmt(c.target)}</p>
                  </div>
                </div>
              );
            })}
            {needsAttention.length === 0 && <p className="text-xs font-medium text-emerald-500">No campaigns behind schedule!</p>}
          </div>
        </div>

        {/* Ending Soon */}
        <div className={`${CARD} p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-orange-500" />
            <p className="text-sm font-bold text-foreground">Ending Soon</p>
            <span className="text-[10px] text-muted-foreground ml-auto">not on-track</span>
          </div>
          <div className="space-y-2.5">
            {urgentCampaigns.map((c, i) => {
              const covP = pct(c.coverage, c.target);
              const days = daysUntil(c.endDate);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-black text-orange-500 w-8 shrink-0">{days}d</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{extractBrand(c.name)} · {c.country}</p>
                  </div>
                  <span className={`text-xs font-black shrink-0 ${statusColor(c.coverage, c.target)}`}>{covP}%</span>
                </div>
              );
            })}
            {urgentCampaigns.length === 0 && <p className="text-xs font-medium text-emerald-500">No urgent campaigns!</p>}
          </div>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className={`${CARD} p-4 space-y-4`}>

        {/* Search + clear */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search campaigns, brands, countries, platforms…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          {(activeFilters > 0 || search) && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="shrink-0 border-rose-500/40 text-rose-500 hover:bg-rose-500/10">
              <X className="w-3.5 h-3.5 mr-1" />Clear All
            </Button>
          )}
        </div>

        {/* Status */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-20 shrink-0">Status</span>
          {([
            { value: "all", label: "All" },
            { value: "on-track", label: "On Track", activeClass: "bg-emerald-500 text-white border-emerald-500" },
            { value: "progress", label: "In Progress", activeClass: "bg-amber-500 text-white border-amber-500" },
            { value: "behind", label: "Behind", activeClass: "bg-rose-500 text-white border-rose-500" },
          ] as const).map(opt => (
            <button key={opt.value} onClick={() => setStatusFilter(opt.value as StatusFilter)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${statusFilter === opt.value ? ("activeClass" in opt ? opt.activeClass : "bg-foreground text-background border-foreground") : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"}`}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Campaign Type */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-20 shrink-0">Type</span>
          {types.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${typeFilter === t ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"}`}>
              {t === "all" ? "All Types" : t}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-20 shrink-0">Timeline</span>
          {([
            { value: "all", label: "All" },
            { value: "active", label: "Active Now", activeClass: "bg-blue-500 text-white border-blue-500" },
            { value: "ending-soon", label: "Ending Soon", activeClass: "bg-orange-500 text-white border-orange-500" },
            { value: "ended", label: "Ended", activeClass: "bg-zinc-500 text-white border-zinc-500" },
          ] as const).map(opt => (
            <button key={opt.value} onClick={() => setDateMode(opt.value as DateMode)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${dateMode === opt.value ? ("activeClass" in opt ? opt.activeClass : "bg-foreground text-background border-foreground") : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"}`}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Platform */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-20 shrink-0">Platform</span>
          {platforms.map(p => (
            <button key={p} onClick={() => setPlatformFilter(p)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${platformFilter === p ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"}`}>
              {p === "all" ? "All Platforms" : p}
            </button>
          ))}
        </div>

        {/* Confirmations */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-20 shrink-0">Confirmed</span>
          {([
            { value: "all", label: "Any" },
            { value: "yes", label: "Has Confirmations", activeClass: "bg-blue-500 text-white border-blue-500" },
            { value: "no", label: "No Confirmations", activeClass: "bg-zinc-500 text-white border-zinc-500" },
          ] as const).map(opt => (
            <button key={opt.value} onClick={() => setHasConf(opt.value as "all" | "yes" | "no")}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${hasConf === opt.value ? ("activeClass" in opt ? opt.activeClass : "bg-foreground text-background border-foreground") : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"}`}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Country · Brand · Month — dropdowns for high-cardinality */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-20 shrink-0">Refine</span>
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className={`w-[150px] h-8 text-xs ${countryFilter !== "all" ? "border-foreground/60 font-semibold" : ""}`}>
              <Filter className="w-3 h-3 mr-1.5 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>{countries.map(c => <SelectItem key={c} value={c}>{c === "all" ? "All Countries" : c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className={`w-[160px] h-8 text-xs ${brandFilter !== "all" ? "border-foreground/60 font-semibold" : ""}`}>
              <Building2 className="w-3 h-3 mr-1.5 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Brand" />
            </SelectTrigger>
            <SelectContent>{brands.map(b => <SelectItem key={b} value={b}>{b === "all" ? "All Brands" : b}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className={`w-[140px] h-8 text-xs ${monthFilter !== "all" ? "border-foreground/60 font-semibold" : ""}`}>
              <CalendarRange className="w-3 h-3 mr-1.5 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>{months.map(m => <SelectItem key={m} value={m}>{m === "all" ? "All Months" : m}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {/* Cov% range + Date range */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="text-[10px] font-black uppercase tracking-widest w-20 shrink-0">Cov% Range</span>
            <Input type="number" min={0} max={500} placeholder="Min %" value={covMin} onChange={e => setCovMin(e.target.value)} className={`w-20 h-8 text-xs ${covMin ? "border-foreground/60" : ""}`} />
            <span className="text-muted-foreground/60">–</span>
            <Input type="number" min={0} max={500} placeholder="Max %" value={covMax} onChange={e => setCovMax(e.target.value)} className={`w-20 h-8 text-xs ${covMax ? "border-foreground/60" : ""}`} />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="text-[10px] font-black uppercase tracking-widest w-20 shrink-0">Date Range</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className={`h-8 rounded-[var(--app-radius)] border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring ${dateFrom ? "border-foreground/60" : "border-input"}`} />
            <span className="text-muted-foreground/60">–</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className={`h-8 rounded-[var(--app-radius)] border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring ${dateTo ? "border-foreground/60" : "border-input"}`} />
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilters > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border">
            <span className="text-[10px] text-muted-foreground self-center mr-1">Active:</span>
            {statusFilter !== "all" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-foreground/10 border border-border">{statusFilter}<button onClick={() => setStatusFilter("all")}><X className="w-2.5 h-2.5 ml-0.5" /></button></span>}
            {typeFilter !== "all" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-foreground/10 border border-border">{typeFilter}<button onClick={() => setTypeFilter("all")}><X className="w-2.5 h-2.5 ml-0.5" /></button></span>}
            {dateMode !== "all" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-foreground/10 border border-border">{dateMode}<button onClick={() => setDateMode("all")}><X className="w-2.5 h-2.5 ml-0.5" /></button></span>}
            {platformFilter !== "all" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-foreground/10 border border-border">{platformFilter}<button onClick={() => setPlatformFilter("all")}><X className="w-2.5 h-2.5 ml-0.5" /></button></span>}
            {hasConf !== "all" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-foreground/10 border border-border">{hasConf === "yes" ? "Has Confirmations" : "No Confirmations"}<button onClick={() => setHasConf("all")}><X className="w-2.5 h-2.5 ml-0.5" /></button></span>}
            {countryFilter !== "all" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-foreground/10 border border-border">{countryFilter}<button onClick={() => setCountryFilter("all")}><X className="w-2.5 h-2.5 ml-0.5" /></button></span>}
            {brandFilter !== "all" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-foreground/10 border border-border">{brandFilter}<button onClick={() => setBrandFilter("all")}><X className="w-2.5 h-2.5 ml-0.5" /></button></span>}
            {monthFilter !== "all" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-foreground/10 border border-border">{monthFilter}<button onClick={() => setMonthFilter("all")}><X className="w-2.5 h-2.5 ml-0.5" /></button></span>}
            {covMin !== "" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-foreground/10 border border-border">Cov ≥{covMin}%<button onClick={() => setCovMin("")}><X className="w-2.5 h-2.5 ml-0.5" /></button></span>}
            {covMax !== "" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-foreground/10 border border-border">Cov ≤{covMax}%<button onClick={() => setCovMax("")}><X className="w-2.5 h-2.5 ml-0.5" /></button></span>}
            {dateFrom !== "" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-foreground/10 border border-border">From {dateFrom}<button onClick={() => setDateFrom("")}><X className="w-2.5 h-2.5 ml-0.5" /></button></span>}
            {dateTo !== "" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-foreground/10 border border-border">To {dateTo}<button onClick={() => setDateTo("")}><X className="w-2.5 h-2.5 ml-0.5" /></button></span>}
          </div>
        )}
      </div>

      {/* ── Data Table ───────────────────────────────────────────────────── */}
      <div className="rounded-[var(--app-card-radius)] border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("name")}>
                  <span className="flex items-center gap-1">Campaign <SortIcon k="name" /></span>
                </th>
                {colDefs.map(([k, label]) => (
                  <th key={k} className={`text-center px-3 py-3 font-bold text-[10px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none${["confirmations","confPct","visited","visitPct"].includes(k) ? " bg-muted/30" : ""}`} onClick={() => toggleSort(k)}>
                    <span className="flex items-center justify-center gap-1">{label} <SortIcon k={k} /></span>
                  </th>
                ))}
                <th className="text-center px-3 py-3 font-bold text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c, i) => {
                const confP = pct(c.confirmations, c.list);
                const visitP = pct(c.visited, c.target);
                const covP = pct(c.coverage, c.target);
                const days = daysUntil(c.endDate);
                const gap = Math.max(0, c.target - c.coverage);
                const da = daysActive(c.startDate);
                const vel = c.coverage > 0 ? (c.coverage / da).toFixed(1) : "–";
                return (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold leading-tight max-w-[240px] truncate text-foreground text-sm" title={c.name}>{c.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-foreground/70">{extractBrand(c.name)}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span>{extractPlatform(c.name)}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span>{c.country}</span>
                        {days >= 0 && days <= 7 && <span className="text-[9px] font-bold text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded-full">{days}d left</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums text-sm text-foreground">{fmt(c.list)}</td>
                    <td className="px-3 py-3 text-center tabular-nums font-semibold text-sm bg-muted/10">{fmt(c.confirmations)}</td>
                    <td className="px-3 py-3 text-center bg-muted/10">
                      <span className={`text-xs font-bold ${statusColor(c.confirmations, c.list)}`}>{confP}%</span>
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums text-sm text-foreground">{fmt(c.target)}</td>
                    <td className="px-3 py-3 text-center tabular-nums font-semibold text-sm bg-muted/10">{fmt(c.visited)}</td>
                    <td className="px-3 py-3 text-center bg-muted/10">
                      <span className={`text-xs font-bold ${statusColor(c.visited, c.target)}`}>{visitP}%</span>
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums font-semibold text-sm">{fmt(c.coverage)}</td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-xs font-bold ${statusColor(c.coverage, c.target)}`}>{covP}%</span>
                        <div className="w-12 h-1 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${covP >= 100 ? "bg-emerald-500" : covP >= 60 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${Math.min(covP, 100)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums text-sm">
                      {gap > 0 ? <span className="text-rose-400 font-semibold">-{fmt(gap)}</span> : <span className="text-emerald-500 font-bold">✓</span>}
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums text-xs text-amber-500 font-semibold">{vel}</td>
                    <td className="px-3 py-3 text-center">
                      <Badge variant="outline" className={`text-xs whitespace-nowrap ${statusBg(c.coverage, c.target)}`}>
                        {covP >= 100 ? <><CheckCircle2 className="w-3 h-3 mr-1" />On Track</> : covP >= 60 ? <><TrendingUp className="w-3 h-3 mr-1" />Progress</> : <><AlertTriangle className="w-3 h-3 mr-1" />Behind</>}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              {filtered.length > 0 && (
                <tr className="bg-muted/30 border-t-2 border-border">
                  <td className="px-4 py-3 text-xs font-black uppercase tracking-wider text-muted-foreground">Totals ({filtered.length})</td>
                  <td className="px-3 py-3 text-center tabular-nums text-sm font-black text-foreground">{fmt(totals.list)}</td>
                  <td className="px-3 py-3 text-center tabular-nums text-sm font-black bg-muted/10">{fmt(totals.conf)}</td>
                  <td className="px-3 py-3 text-center bg-muted/10"><span className={`text-xs font-black ${statusColor(totals.conf, totals.list)}`}>{pct(totals.conf, totals.list)}%</span></td>
                  <td className="px-3 py-3 text-center tabular-nums text-sm font-black">{fmt(totals.target)}</td>
                  <td className="px-3 py-3 text-center tabular-nums text-sm font-black bg-muted/10">{fmt(totals.visited)}</td>
                  <td className="px-3 py-3 text-center bg-muted/10"><span className={`text-xs font-black ${statusColor(totals.visited, totals.target)}`}>{pct(totals.visited, totals.target)}%</span></td>
                  <td className="px-3 py-3 text-center tabular-nums text-sm font-black">{fmt(totals.coverage)}</td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`text-xs font-black ${statusColor(totals.coverage, totals.target)}`}>{pct(totals.coverage, totals.target)}%</span>
                      <div className="w-12 h-1 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${pct(totals.coverage, totals.target) >= 100 ? "bg-emerald-500" : pct(totals.coverage, totals.target) >= 60 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${Math.min(pct(totals.coverage, totals.target), 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums text-sm font-black text-rose-400">-{fmt(totals.gap)}</td>
                  <td />
                  <td />
                </tr>
              )}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Search className="w-8 h-8 opacity-30" />
                      <p className="text-sm font-semibold">No campaigns match your filters</p>
                      <button onClick={clearFilters} className="text-xs underline underline-offset-2 hover:text-foreground transition-colors">Clear all filters</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default CampaignOverview;
