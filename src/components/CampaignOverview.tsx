import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import {
  TrendingUp, Search, ChevronUp, ChevronDown, AlertTriangle,
  CheckCircle2, Download, FileText, X, Filter,
  BarChart3, Activity, CalendarRange, Clock, Globe, Layers, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CAMPAIGN_DATA_EVENT, CampaignRow, loadCampaigns, saveCampaigns } from "../lib/campaignOverviewData";

const TODAY = "2026-03-16";

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
const fmt = (n: number) => n.toLocaleString();
const daysUntil = (dateStr: string) => {
  const d = new Date(dateStr).getTime() - new Date(TODAY).getTime();
  return Math.ceil(d / 86400000);
};

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

function exportCSV(rows: CampaignRow[]) {
  const h = ["Campaign", "Country", "Type", "List", "Confirmations", "Conf%", "Target", "Visited", "Visit%", "Coverage", "Cov%", "Start", "End"];
  const lines = [
    h.join(","),
    ...rows.map(r =>
      [`"${r.name.replace(/"/g, '""')}"`, r.country, r.type, r.list, r.confirmations,
        pct(r.confirmations, r.list), r.target, r.visited, pct(r.visited, r.target),
        r.coverage, pct(r.coverage, r.target), r.startDate, r.endDate].join(",")
    ),
  ];
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
  a.download = "campaign-overview.csv";
  a.click();
}

function exportExcel(rows: CampaignRow[]) {
  const data = rows.map(r => ({
    Campaign: r.name, Country: r.country, Type: r.type,
    List: r.list, Confirmations: r.confirmations, "Conf%": pct(r.confirmations, r.list),
    Target: r.target, Visited: r.visited, "Visit%": pct(r.visited, r.target),
    Coverage: r.coverage, "Cov%": pct(r.coverage, r.target),
    Start: r.startDate, End: r.endDate,
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Overview");
  XLSX.writeFile(wb, "campaign-overview.xlsx");
}

function exportPDF(
  rows: CampaignRow[],
  totals: { list: number; conf: number; target: number; visited: number; coverage: number },
  statusCounts: { onTrack: number; progress: number; behind: number },
  urgentCount: number,
  countryData: { country: string; covPct: number; campaigns: number }[],
) {
  const win = window.open("", "_blank");
  if (!win) return;

  const covColor = (p: number) => p >= 100 ? "#10b981" : p >= 60 ? "#f59e0b" : "#f43f5e";
  const statusLabel = (v: number, t: number) => {
    const p = pct(v, t);
    return p >= 100 ? "On Track" : p >= 60 ? "Progress" : "Behind";
  };

  const maxCountryCov = Math.max(...countryData.map(d => d.covPct), 100);

  const kpiCards = [
    { label: "Total List", value: fmt(totals.list), sub: `${rows.length} campaigns` },
    { label: "Confirmations", value: fmt(totals.conf), pctVal: pct(totals.conf, totals.list), color: covColor(pct(totals.conf, totals.list)) },
    { label: "Total Target", value: fmt(totals.target), sub: "across all campaigns" },
    { label: "Visited", value: fmt(totals.visited), pctVal: pct(totals.visited, totals.target), color: covColor(pct(totals.visited, totals.target)) },
    { label: "Coverage", value: fmt(totals.coverage), pctVal: pct(totals.coverage, totals.target), color: covColor(pct(totals.coverage, totals.target)) },
  ];

  const kpiHtml = kpiCards.map(k => `
    <div class="kpi-card">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value">${k.value}</div>
      ${k.sub ? `<div class="kpi-sub">${k.sub}</div>` : ""}
      ${k.pctVal !== undefined ? `
        <div class="progress-bar">
          <div class="progress-fill" style="width:${Math.min(k.pctVal, 100)}%;background:${k.color}"></div>
        </div>
        <div class="kpi-sub" style="color:${k.color};font-weight:700">${k.pctVal}%</div>
      ` : ""}
    </div>
  `).join("");

  const statusHtml = `
    <div class="status-card on-track">
      <div class="status-label" style="color:#059669">&#10003; On Track</div>
      <div class="status-count">${statusCounts.onTrack}</div>
      <div class="status-desc">Cov% &ge; 100%</div>
    </div>
    <div class="status-card progress">
      <div class="status-label" style="color:#d97706">&#8599; Progress</div>
      <div class="status-count">${statusCounts.progress}</div>
      <div class="status-desc">Cov% 60&ndash;99%</div>
    </div>
    <div class="status-card behind">
      <div class="status-label" style="color:#e11d48">&#9650; Behind</div>
      <div class="status-count">${statusCounts.behind}</div>
      <div class="status-desc">Cov% &lt; 60%</div>
    </div>
    <div class="status-card urgent">
      <div class="status-label" style="color:#ea580c">&#9201; Ending Soon</div>
      <div class="status-count">${urgentCount}</div>
      <div class="status-desc">Within 7 days</div>
    </div>
  `;

  const countryHtml = countryData.map(d => `
    <div class="country-row">
      <div class="country-name">${d.country}</div>
      <div class="country-bar-wrap">
        <div class="country-bar" style="width:${Math.round((d.covPct / maxCountryCov) * 100)}%;background:${covColor(d.covPct)}"></div>
      </div>
      <div class="country-pct" style="color:${covColor(d.covPct)}">${d.covPct}%</div>
      <div class="country-camps">${d.campaigns}</div>
    </div>
  `).join("");

  const tableRows = rows.map((r, i) => {
    const covP = pct(r.coverage, r.target);
    const confP = pct(r.confirmations, r.list);
    const visitP = pct(r.visited, r.target);
    const color = covColor(covP);
    const sl = statusLabel(r.coverage, r.target);
    const days = daysUntil(r.endDate);
    const endingTag = days >= 0 && days <= 7 ? `<span style="font-size:8px;color:#ea580c;font-weight:700"> &bull; ${days}d left</span>` : "";
    return `
      <tr${i % 2 === 1 ? ' class="even"' : ""}>
        <td class="campaign-name">${r.name}${endingTag}<br><span style="font-size:8px;color:#71717a">${r.country} &middot; ${r.type}</span></td>
        <td class="num">${fmt(r.list)}</td>
        <td class="num">${fmt(r.confirmations)}</td>
        <td class="num"><span style="color:${covColor(confP)};font-weight:700">${confP}%</span></td>
        <td class="num">${fmt(r.target)}</td>
        <td class="num">${fmt(r.visited)}</td>
        <td class="num"><span style="color:${covColor(visitP)};font-weight:700">${visitP}%</span></td>
        <td class="num">${fmt(r.coverage)}</td>
        <td>
          <div class="bar-wrap">
            <div class="bar-track"><div class="bar-fill" style="width:${Math.min(covP, 100)}%;background:${color}"></div></div>
            <span class="bar-pct" style="color:${color}">${covP}%</span>
          </div>
        </td>
        <td><span class="badge" style="background:${color}20;color:${color};border:1px solid ${color}40">${sl}</span></td>
      </tr>
    `;
  }).join("");

  const totalCovP = pct(totals.coverage, totals.target);
  const totalColor = covColor(totalCovP);
  const totalsRow = `
    <tr class="total-row">
      <td class="campaign-name" style="font-weight:900;font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#71717a">Totals (${rows.length})</td>
      <td class="num">${fmt(totals.list)}</td>
      <td class="num">${fmt(totals.conf)}</td>
      <td class="num"><span style="color:${covColor(pct(totals.conf, totals.list))};font-weight:900">${pct(totals.conf, totals.list)}%</span></td>
      <td class="num">${fmt(totals.target)}</td>
      <td class="num">${fmt(totals.visited)}</td>
      <td class="num"><span style="color:${covColor(pct(totals.visited, totals.target))};font-weight:900">${pct(totals.visited, totals.target)}%</span></td>
      <td class="num">${fmt(totals.coverage)}</td>
      <td>
        <div class="bar-wrap">
          <div class="bar-track"><div class="bar-fill" style="width:${Math.min(totalCovP, 100)}%;background:${totalColor}"></div></div>
          <span class="bar-pct" style="color:${totalColor};font-weight:900">${totalCovP}%</span>
        </div>
      </td>
      <td></td>
    </tr>
  `;

  win.document.write(`<!DOCTYPE html><html><head><title>Campaign Overview</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,Arial,sans-serif;font-size:10px;color:#18181b;padding:24px;background:#fff}
    h1{font-size:20px;font-weight:900;letter-spacing:-.02em}
    .meta{color:#71717a;font-size:9px;margin-top:3px;margin-bottom:16px}
    .section-title{font-size:11px;font-weight:800;margin:14px 0 8px;padding-bottom:5px;border-bottom:2px solid #e4e4e7;text-transform:uppercase;letter-spacing:.05em;color:#52525b}
    /* KPI */
    .kpi-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:14px}
    .kpi-card{background:#f4f4f5;border-radius:8px;padding:10px}
    .kpi-label{font-size:7.5px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:#71717a}
    .kpi-value{font-size:17px;font-weight:900;margin-top:4px;font-variant-numeric:tabular-nums}
    .kpi-sub{font-size:8px;color:#71717a;margin-top:2px}
    .progress-bar{height:4px;background:#e4e4e7;border-radius:2px;margin-top:5px;overflow:hidden}
    .progress-fill{height:100%;border-radius:2px}
    /* Status */
    .status-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}
    .status-card{border-radius:8px;padding:9px 11px}
    .status-card.on-track{background:#ecfdf5;border:1px solid #6ee7b7}
    .status-card.progress{background:#fffbeb;border:1px solid #fcd34d}
    .status-card.behind{background:#fff1f2;border:1px solid #fda4af}
    .status-card.urgent{background:#fff7ed;border:1px solid #fdba74}
    .status-label{font-size:8px;font-weight:800;text-transform:uppercase}
    .status-count{font-size:16px;font-weight:900;margin-top:2px}
    .status-desc{font-size:8px;color:#71717a;margin-top:1px}
    /* Country */
    .country-grid{margin-bottom:14px}
    .country-row{display:flex;align-items:center;gap:6px;margin-bottom:5px}
    .country-name{width:56px;font-size:9px;font-weight:600;flex-shrink:0}
    .country-bar-wrap{flex:1;height:6px;background:#e4e4e7;border-radius:3px;overflow:hidden}
    .country-bar{height:100%;border-radius:3px}
    .country-pct{width:32px;text-align:right;font-size:9px;font-weight:800;flex-shrink:0}
    .country-camps{width:36px;text-align:right;font-size:8px;color:#71717a;flex-shrink:0}
    /* Legend */
    .legend{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:10px}
    .legend-item{display:flex;align-items:center;gap:4px;font-size:8.5px;color:#71717a}
    .legend-dot{width:10px;height:6px;border-radius:2px;flex-shrink:0}
    /* Table */
    table{width:100%;border-collapse:collapse;font-size:8.5px}
    thead th{background:#18181b;color:#fff;padding:5px 6px;text-align:left;font-size:7.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em}
    thead th.num{text-align:right}
    td{padding:4px 6px;border-bottom:1px solid #f4f4f5;vertical-align:middle}
    td.num{text-align:right;font-variant-numeric:tabular-nums}
    tr.even td{background:#fafafa}
    tr.total-row td{background:#f4f4f5!important;font-weight:900;border-top:2px solid #e4e4e7}
    .campaign-name{max-width:185px;word-break:break-word;font-weight:600;line-height:1.3}
    .bar-wrap{display:flex;align-items:center;gap:4px}
    .bar-track{flex:1;height:4px;background:#e4e4e7;border-radius:2px;min-width:30px;overflow:hidden}
    .bar-fill{height:100%;border-radius:2px}
    .bar-pct{font-weight:800;white-space:nowrap;font-size:9px}
    .badge{display:inline-block;padding:2px 6px;border-radius:99px;font-weight:700;font-size:8px}
    @media print{
      body{padding:10px}
      .kpi-grid{grid-template-columns:repeat(5,1fr)}
      .status-grid{grid-template-columns:repeat(4,1fr)}
    }
  </style>
  </head><body>
    <h1>Campaign Overview</h1>
    <div class="meta">Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} &nbsp;&middot;&nbsp; ${rows.length} campaigns</div>

    <div class="section-title">Key Metrics</div>
    <div class="kpi-grid">${kpiHtml}</div>

    <div class="section-title">Status Breakdown</div>
    <div class="status-grid">${statusHtml}</div>

    <div class="section-title">Performance by Country</div>
    <div class="country-grid">${countryHtml || "<p style='color:#71717a;font-size:9px'>No data</p>"}</div>

    <div class="section-title">Campaign Details</div>
    <div class="legend">
      <div class="legend-item"><div class="legend-dot" style="background:#10b981"></div>On Track (Cov% &ge;100)</div>
      <div class="legend-item"><div class="legend-dot" style="background:#f59e0b"></div>Progress (60&ndash;99%)</div>
      <div class="legend-item"><div class="legend-dot" style="background:#f43f5e"></div>Behind (&lt;60%)</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Campaign</th>
          <th class="num">List</th><th class="num">Conf</th><th class="num">Conf%</th>
          <th class="num">Target</th><th class="num">Visited</th><th class="num">Visit%</th>
          <th class="num">Coverage</th><th>Cov%</th><th>Status</th>
        </tr>
      </thead>
      <tbody>${tableRows}${totalsRow}</tbody>
    </table>
  <script>window.onload=()=>{window.print()}<\/script>
  </body></html>`);
  win.document.close();
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-[var(--app-radius)] border border-border bg-card p-3 shadow-xl text-xs space-y-1.5 max-w-[220px]">
      <p className="font-bold text-foreground leading-snug">{d?.fullName || d?.name}</p>
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

type SortKey = "name" | "list" | "confirmations" | "confPct" | "target" | "visited" | "visitPct" | "coverage" | "covPct";
type StatusFilter = "all" | "on-track" | "progress" | "behind";
type DateMode = "all" | "active" | "ending-soon" | "ended";

export function CampaignOverview() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>(() => loadCampaigns());
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateMode, setDateMode] = useState<DateMode>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("covPct");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [resetConfirm, setResetConfirm] = useState(false);

  // Sync in real-time whenever the config page saves campaign data
  useEffect(() => {
    const reload = () => setCampaigns(loadCampaigns());
    window.addEventListener(CAMPAIGN_DATA_EVENT, reload);
    // Also reload when the user navigates back to this tab
    const onVisible = () => { if (document.visibilityState === "visible") reload(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(CAMPAIGN_DATA_EVENT, reload);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const countries = useMemo(() => ["all", ...Array.from(new Set(campaigns.map(c => c.country))).sort()], [campaigns]);
  const types = useMemo(() => ["all", ...Array.from(new Set(campaigns.map(c => c.type))).sort()], [campaigns]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const rows = campaigns.filter(c => {
      if (countryFilter !== "all" && c.country !== countryFilter) return false;
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (statusFilter !== "all" && statusOf(c.coverage, c.target) !== statusFilter) return false;
      if (dateFrom && c.startDate && c.startDate < dateFrom) return false;
      if (dateTo && c.endDate && c.endDate > dateTo) return false;
      if (dateMode === "active" && !(c.startDate <= TODAY && c.endDate >= TODAY)) return false;
      if (dateMode === "ending-soon") {
        const d = daysUntil(c.endDate);
        if (d < 0 || d > 7) return false;
      }
      if (dateMode === "ended" && c.endDate >= TODAY) return false;
      if (q && !c.name.toLowerCase().includes(q) && !c.country.toLowerCase().includes(q) && !c.type.toLowerCase().includes(q)) return false;
      return true;
    });
    return [...rows].sort((a, b) => {
      if (sortKey === "name") return sortDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      const val = (r: CampaignRow) =>
        sortKey === "confPct" ? pct(r.confirmations, r.list)
        : sortKey === "visitPct" ? pct(r.visited, r.target)
        : sortKey === "covPct" ? pct(r.coverage, r.target)
        : (r[sortKey as keyof CampaignRow] as number);
      return sortDir === "asc" ? val(a) - val(b) : val(b) - val(a);
    });
  }, [campaigns, search, countryFilter, typeFilter, statusFilter, dateMode, dateFrom, dateTo, sortKey, sortDir]);

  const totals = useMemo(() => ({
    list: filtered.reduce((s, c) => s + c.list, 0),
    conf: filtered.reduce((s, c) => s + c.confirmations, 0),
    target: filtered.reduce((s, c) => s + c.target, 0),
    visited: filtered.reduce((s, c) => s + c.visited, 0),
    coverage: filtered.reduce((s, c) => s + c.coverage, 0),
  }), [filtered]);

  const statusCounts = useMemo(() => ({
    onTrack: filtered.filter(c => statusOf(c.coverage, c.target) === "on-track").length,
    progress: filtered.filter(c => statusOf(c.coverage, c.target) === "progress").length,
    behind: filtered.filter(c => statusOf(c.coverage, c.target) === "behind").length,
  }), [filtered]);

  // Top 20 by cov% for main chart
  const chartData = useMemo(() =>
    [...filtered]
      .sort((a, b) => pct(b.coverage, b.target) - pct(a.coverage, a.target))
      .slice(0, 20)
      .map(c => ({
        name: c.name.split(" - ")[0].slice(0, 16),
        fullName: c.name,
        "Conf%": pct(c.confirmations, c.list),
        "Visit%": pct(c.visited, c.target),
        "Cov%": pct(c.coverage, c.target),
        covPct: pct(c.coverage, c.target),
      })),
    [filtered]);

  // Country breakdown
  const countryData = useMemo(() => {
    const map = new Map<string, { campaigns: number; cov: number; target: number; conf: number; list: number }>();
    filtered.forEach(c => {
      const e = map.get(c.country) || { campaigns: 0, cov: 0, target: 0, conf: 0, list: 0 };
      map.set(c.country, { campaigns: e.campaigns + 1, cov: e.cov + c.coverage, target: e.target + c.target, conf: e.conf + c.confirmations, list: e.list + c.list });
    });
    return Array.from(map.entries())
      .map(([country, d]) => ({ country: country.replace("United Arab Emirates", "UAE").replace("Saudi Arabia", "KSA"), campaigns: d.campaigns, covPct: pct(d.cov, d.target), confPct: pct(d.conf, d.list) }))
      .sort((a, b) => b.covPct - a.covPct)
      .slice(0, 8);
  }, [filtered]);

  // Coverage distribution
  const covDistribution = useMemo(() => {
    const buckets = [
      { label: "0%", min: 0, max: 0 },
      { label: "1–25%", min: 1, max: 25 },
      { label: "26–50%", min: 26, max: 50 },
      { label: "51–75%", min: 51, max: 75 },
      { label: "76–99%", min: 76, max: 99 },
      { label: "≥100%", min: 100, max: 9999 },
    ].map(b => ({ ...b, count: 0 }));
    filtered.filter(c => c.target > 0).forEach(c => {
      const p = pct(c.coverage, c.target);
      const bucket = buckets.find(b => p >= b.min && p <= b.max);
      if (bucket) bucket.count++;
    });
    return buckets;
  }, [filtered]);

  // Type breakdown
  const typeBreakdown = useMemo(() => {
    const map = new Map<string, { list: number; conf: number; target: number; visited: number; coverage: number; count: number }>();
    filtered.forEach(c => {
      const e = map.get(c.type) || { list: 0, conf: 0, target: 0, visited: 0, coverage: 0, count: 0 };
      map.set(c.type, { list: e.list + c.list, conf: e.conf + c.confirmations, target: e.target + c.target, visited: e.visited + c.visited, coverage: e.coverage + c.coverage, count: e.count + 1 });
    });
    return Array.from(map.entries()).map(([type, d]) => ({ type, ...d, covPct: pct(d.coverage, d.target), confPct: pct(d.conf, d.list), visitPct: pct(d.visited, d.target) }));
  }, [filtered]);

  // Top performers
  const topPerformers = useMemo(() =>
    [...filtered].filter(c => c.target > 0).sort((a, b) => pct(b.coverage, b.target) - pct(a.coverage, a.target)).slice(0, 5),
    [filtered]);

  // Needs attention (behind, with target > 0)
  const needsAttention = useMemo(() =>
    [...filtered].filter(c => c.target > 0 && statusOf(c.coverage, c.target) === "behind")
      .sort((a, b) => pct(b.target - b.coverage, b.target) - pct(a.target - a.coverage, a.target))
      .slice(0, 5),
    [filtered]);

  // Ending soon & behind
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

  const activeFilters = [countryFilter !== "all", typeFilter !== "all", statusFilter !== "all", dateMode !== "all", !!dateFrom, !!dateTo].filter(Boolean).length;

  function clearFilters() {
    setSearch(""); setCountryFilter("all"); setTypeFilter("all");
    setStatusFilter("all"); setDateMode("all"); setDateFrom(""); setDateTo("");
  }

  function handleReset() {
    if (!resetConfirm) { setResetConfirm(true); return; }
    saveCampaigns([]);   // clears everything — manage data from Configuration page
    clearFilters();
    setResetConfirm(false);
    toast.success("All campaign data cleared.");
  }

  const CARD = "rounded-[var(--app-card-radius)] border border-border bg-card";
  const CARD_SM = "rounded-[var(--app-radius)] border border-border bg-card";

  const colDefs: [SortKey, string][] = [
    ["list", "List"], ["confirmations", "Conf"], ["confPct", "Conf%"],
    ["target", "Target"], ["visited", "Visited"], ["visitPct", "Visit%"],
    ["coverage", "Coverage"], ["covPct", "Cov%"],
  ];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1600px] mx-auto">

      {/* ── Header ─────────────────────────────────── */}
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
            variant="outline"
            size="sm"
            onClick={handleReset}
            onBlur={() => setResetConfirm(false)}
            className={resetConfirm ? "border-rose-500 text-rose-500 hover:bg-rose-500/10" : ""}
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            {resetConfirm ? "Confirm Reset?" : "Reset Data"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportCSV(filtered)}>
            <Download className="w-4 h-4 mr-1.5" />CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportExcel(filtered)}>
            <BarChart3 className="w-4 h-4 mr-1.5" />Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportPDF(filtered, totals, statusCounts, urgentCampaigns.length, countryData)}>
            <FileText className="w-4 h-4 mr-1.5" />PDF
          </Button>
        </div>
      </div>

      {/* ── KPI Strip ───────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className={`${CARD} p-4`}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total List</p>
          <p className="text-2xl font-black text-foreground tabular-nums mt-1">{fmt(totals.list)}</p>
          <p className="text-xs text-muted-foreground mt-1">{filtered.length} campaigns</p>
        </div>
        <div className={`${CARD} p-4`}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Confirmations</p>
          <p className="text-2xl font-black text-foreground tabular-nums mt-1">{fmt(totals.conf)}</p>
          <div className="mt-1.5">
            <MiniBar value={pct(totals.conf, totals.list)} max={100} color={pct(totals.conf, totals.list) >= 100 ? "#10b981" : pct(totals.conf, totals.list) >= 60 ? "#f59e0b" : "#f43f5e"} />
          </div>
        </div>
        <div className={`${CARD} p-4`}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Target</p>
          <p className="text-2xl font-black text-foreground tabular-nums mt-1">{fmt(totals.target)}</p>
          <p className="text-xs text-muted-foreground mt-1">across all campaigns</p>
        </div>
        <div className={`${CARD} p-4`}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Visited</p>
          <p className="text-2xl font-black text-foreground tabular-nums mt-1">{fmt(totals.visited)}</p>
          <div className="mt-1.5">
            <MiniBar value={pct(totals.visited, totals.target)} max={100} color={pct(totals.visited, totals.target) >= 100 ? "#10b981" : pct(totals.visited, totals.target) >= 60 ? "#f59e0b" : "#f43f5e"} />
          </div>
        </div>
        <div className={`${CARD} p-4`}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Coverage</p>
          <p className="text-2xl font-black text-foreground tabular-nums mt-1">{fmt(totals.coverage)}</p>
          <div className="mt-1.5">
            <MiniBar value={pct(totals.coverage, totals.target)} max={100} color={pct(totals.coverage, totals.target) >= 100 ? "#10b981" : pct(totals.coverage, totals.target) >= 60 ? "#f59e0b" : "#f43f5e"} />
          </div>
        </div>
      </div>

      {/* ── Status Tiles ────────────────────────────── */}
      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter(s => s === "on-track" ? "all" : "on-track")}
          className={`${CARD} p-3 text-left transition-all hover:border-emerald-500/40 ${statusFilter === "on-track" ? "border-emerald-500/50 bg-emerald-500/5" : ""}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">On Track</span>
          </div>
          <p className="text-xl font-black text-foreground tabular-nums">{statusCounts.onTrack}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Cov% ≥ 100%</p>
        </button>
        <button
          onClick={() => setStatusFilter(s => s === "progress" ? "all" : "progress")}
          className={`${CARD} p-3 text-left transition-all hover:border-amber-500/40 ${statusFilter === "progress" ? "border-amber-500/50 bg-amber-500/5" : ""}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Progress</span>
          </div>
          <p className="text-xl font-black text-foreground tabular-nums">{statusCounts.progress}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Cov% 60–99%</p>
        </button>
        <button
          onClick={() => setStatusFilter(s => s === "behind" ? "all" : "behind")}
          className={`${CARD} p-3 text-left transition-all hover:border-rose-500/40 ${statusFilter === "behind" ? "border-rose-500/50 bg-rose-500/5" : ""}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Behind</span>
          </div>
          <p className="text-xl font-black text-foreground tabular-nums">{statusCounts.behind}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Cov% &lt; 60%</p>
        </button>
        <button
          onClick={() => setDateMode(m => m === "ending-soon" ? "all" : "ending-soon")}
          className={`${CARD} p-3 text-left transition-all hover:border-orange-500/40 ${dateMode === "ending-soon" ? "border-orange-500/50 bg-orange-500/5" : ""}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Ending Soon</span>
          </div>
          <p className="text-xl font-black text-foreground tabular-nums">{urgentCampaigns.length}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Within 7 days</p>
        </button>
      </div>

      {/* ── Main Chart ──────────────────────────────── */}
      <div className={`${CARD} p-5`}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <p className="text-sm font-bold text-foreground">Confirmations vs List · Visits vs Target · Coverage vs Target</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Top 20 by Cov% &nbsp;·&nbsp; <span className="font-medium">Conf%</span> = conf ÷ list &nbsp;·&nbsp; <span className="font-medium">Visit%</span> = visits ÷ target &nbsp;·&nbsp; <span className="font-medium">Cov%</span> = coverage ÷ target
            </p>
          </div>
          <Activity className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -24, bottom: 72 }} barCategoryGap="18%">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} angle={-40} textAnchor="end" interval={0} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} unit="%" tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} />
            <ReferenceLine y={100} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeOpacity={0.4} />
            <Bar dataKey="Conf%" fill="hsl(var(--muted-foreground))" radius={[3, 3, 0, 0]} maxBarSize={24} />
            <Bar dataKey="Visit%" fill="hsl(var(--foreground))" fillOpacity={0.5} radius={[3, 3, 0, 0]} maxBarSize={24} />
            <Bar dataKey="Cov%" radius={[3, 3, 0, 0]} maxBarSize={24}>
              {chartData.map((e, i) => <Cell key={i} fill={e.covPct >= 100 ? "#10b981" : e.covPct >= 60 ? "#f59e0b" : "#f43f5e"} />)}
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

      {/* ── Insight Row ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Country Performance */}
        <div className={`${CARD} p-4 lg:col-span-1`}>
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-bold text-foreground">By Country</p>
            <span className="text-xs text-muted-foreground ml-auto">Avg Cov%</span>
          </div>
          <div className="space-y-3">
            {countryData.length === 0 && <p className="text-xs text-muted-foreground">No data</p>}
            {countryData.map(d => (
              <div key={d.country}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground">{d.country}</span>
                  <span className="text-[10px] text-muted-foreground">{d.campaigns} camp.</span>
                </div>
                <MiniBar value={d.covPct} max={Math.max(...countryData.map(x => x.covPct), 100)} color={d.covPct >= 100 ? "#10b981" : d.covPct >= 60 ? "#f59e0b" : "#f43f5e"} />
              </div>
            ))}
          </div>
        </div>

        {/* Coverage Distribution */}
        <div className={`${CARD} p-4 lg:col-span-1`}>
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
              <Bar dataKey="count" name="Campaigns" radius={[4, 4, 0, 0]} maxBarSize={36}>
                {covDistribution.map((b, i) => (
                  <Cell key={i} fill={
                    b.label === "≥100%" ? "#10b981"
                    : b.label === "76–99%" ? "#34d399"
                    : b.label === "51–75%" ? "#f59e0b"
                    : b.label === "26–50%" ? "#fb923c"
                    : "#f43f5e"
                  } />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {covDistribution.filter(b => b.count > 0).map(b => (
              <span key={b.label} className="text-[10px] text-muted-foreground">{b.label}: <span className="font-bold text-foreground">{b.count}</span></span>
            ))}
          </div>
        </div>

        {/* Type Breakdown */}
        <div className={`${CARD} p-4 lg:col-span-1`}>
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-bold text-foreground">By Campaign Type</p>
          </div>
          <div className="space-y-4">
            {typeBreakdown.map(t => (
              <div key={t.type} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">{t.type}</span>
                  <span className="text-xs text-muted-foreground">{t.count} campaigns</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-12 text-muted-foreground shrink-0">Conf%</span>
                    <MiniBar value={t.confPct} max={100} color="hsl(var(--muted-foreground))" />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-12 text-muted-foreground shrink-0">Visit%</span>
                    <MiniBar value={t.visitPct} max={100} color="hsl(var(--foreground))" />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-12 text-muted-foreground shrink-0">Cov%</span>
                    <MiniBar value={t.covPct} max={100} color={t.covPct >= 100 ? "#10b981" : t.covPct >= 60 ? "#f59e0b" : "#f43f5e"} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 pt-1">
                  {[["List", fmt(t.list)], ["Target", fmt(t.target)], ["Coverage", fmt(t.coverage)]].map(([label, val]) => (
                    <div key={label} className={`${CARD_SM} p-2 text-center`}>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</p>
                      <p className="text-xs font-bold text-foreground tabular-nums">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {typeBreakdown.length === 0 && <p className="text-xs text-muted-foreground">No data</p>}
          </div>
        </div>
      </div>

      {/* ── Attention Row ───────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Top Performers */}
        <div className={`${CARD} p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <p className="text-sm font-bold text-foreground">Top Performers</p>
            <span className="text-[10px] text-muted-foreground ml-auto">by Coverage%</span>
          </div>
          <div className="space-y-2">
            {topPerformers.map((c, i) => {
              const covP = pct(c.coverage, c.target);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-black text-muted-foreground w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.country} · {c.type}</p>
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
          <div className="space-y-2">
            {needsAttention.map((c, i) => {
              const covP = pct(c.coverage, c.target);
              const days = daysUntil(c.endDate);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-black text-muted-foreground w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.country} · {days >= 0 ? `${days}d left` : "Ended"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-rose-500">{covP}%</span>
                    <p className="text-[10px] text-muted-foreground">{fmt(c.coverage)}/{fmt(c.target)}</p>
                  </div>
                </div>
              );
            })}
            {needsAttention.length === 0 && <p className="text-xs text-muted-foreground text-emerald-500 font-medium">No campaigns behind schedule!</p>}
          </div>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────── */}
      <div className={`${CARD} p-4`}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search campaigns, countries, types…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="All Countries" />
              </SelectTrigger>
              <SelectContent>
                {countries.map(c => <SelectItem key={c} value={c}>{c === "all" ? "All Countries" : c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                {types.map(t => <SelectItem key={t} value={t}>{t === "all" ? "All Types" : t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="on-track">On Track</SelectItem>
                <SelectItem value="progress">In Progress</SelectItem>
                <SelectItem value="behind">Behind</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateMode} onValueChange={v => setDateMode(v as DateMode)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All Dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="active">Active Now</SelectItem>
                <SelectItem value="ending-soon">Ending Soon</SelectItem>
                <SelectItem value="ended">Ended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarRange className="w-4 h-4 shrink-0" />
              <span className="font-medium whitespace-nowrap">Date range:</span>
            </div>
            <div className="flex gap-2 flex-1">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="flex-1 min-w-0 h-9 rounded-[var(--app-radius)] border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              <span className="text-muted-foreground text-xs self-center">→</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="flex-1 min-w-0 h-9 rounded-[var(--app-radius)] border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            {(activeFilters > 0 || search) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0 h-9 px-3 text-xs">
                <X className="w-3.5 h-3.5 mr-1" />Clear all
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────── */}
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
                return (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold leading-tight max-w-[240px] truncate text-foreground text-sm" title={c.name}>{c.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        {c.country} · {c.type}
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
                  <td />
                </tr>
              )}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
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
