import React, { useState, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Upload, X, FileSpreadsheet, AlertTriangle, CheckCircle2,
  ChevronDown, Download, RefreshCw, Table2, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PhaseItem { id: string; text: string; done: boolean; }
interface CampaignPhase { name: string; items: PhaseItem[]; }

export interface BulkCampaign {
  id: string;
  name: string;
  client: string;
  market: string;
  budget: number;
  startDate: string;
  endDate: string;
  currentPhase: string;
  phases: CampaignPhase[];
  notes: string;
  createdAt: string;
}

interface ParsedRow {
  _rowNum: number;
  name: string;
  client: string;
  market: string;
  budget: number;
  startDate: string;
  endDate: string;
  currentPhase: string;
  notes: string;
  errors: string[];
  valid: boolean;
}

const MARKETS = ['EGY', 'KSA', 'KW', 'UAE', 'QAT', 'BH', 'OMAN', 'Multi-Market'];
const PHASE_NAMES = ['Planning', 'Briefing', 'Activation', 'Live', 'Post-Campaign', 'Closed'];
const PHASE_TEMPLATES: Record<string, string[]> = {
  Planning: ['Define campaign objectives & KPIs','Set budget allocation (EGP)','Identify target market(s)','Define influencer criteria (category, size, geo)','Set campaign timeline & milestones','Assign campaign owner & core team'],
  Briefing: ['Prepare detailed campaign brief','Get client approval on brief','Share brief with selected influencers','Collect influencer participation confirmations','Get content approval from client','Brief internal teams (Coverage, Coordination, QA)'],
  Activation: ['Send activation messages to all influencers','Confirm all influencers are active in system','Distribute app credentials to new influencers','Upload campaign content & assets to platform','Brief WhatsApp team on campaign specifics','Run activation completion report (target: 100%)'],
  Live: ['Monitor daily campaign progress vs KPIs','Track daily CON & COV metrics','Handle live complaints & escalations in real time','Send client daily update report','Flag underperforming influencers to Coverage team','Daily team standup on campaign status (≤30 min)'],
  'Post-Campaign': ['Collect final performance data (CON, COV, reach, NPS)','Conduct NPS survey with all influencers','Conduct client satisfaction survey','Prepare comprehensive post-campaign report','Schedule client debrief presentation meeting','Identify upsell opportunity for next campaign'],
  Closed: ['Archive all campaign data in system','Process final billing & invoice reconciliation','Extract key learnings & best practices','Update campaign playbook with findings','Client final handshake & thank you','Log in campaign history tracker'],
};

const genId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

function buildDefaultPhases() {
  return PHASE_NAMES.map(name => ({
    name,
    items: (PHASE_TEMPLATES[name] || []).map(text => ({ id: genId(), text, done: false })),
  }));
}

// ─── Column Aliases ───────────────────────────────────────────────────────────
const COL_ALIASES: Record<string, string[]> = {
  name:         ['name', 'campaign name', 'campaign', 'title', 'campaign_name'],
  client:       ['client', 'brand', 'client/brand', 'client_brand', 'advertiser'],
  market:       ['market', 'geo', 'region', 'country', 'markets'],
  budget:       ['budget', 'budget (egp)', 'budget_egp', 'amount', 'value', 'spend'],
  startDate:    ['start date', 'startdate', 'start', 'from', 'start_date', 'launch date', 'launch_date'],
  endDate:      ['end date', 'enddate', 'end', 'to', 'end_date', 'finish date', 'finish_date'],
  currentPhase: ['phase', 'current phase', 'current_phase', 'status', 'stage', 'lifecycle'],
  notes:        ['notes', 'note', 'description', 'details', 'comments', 'remarks'],
};

function resolveField(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((h, idx) => {
    const norm = h.toLowerCase().trim();
    for (const [field, aliases] of Object.entries(COL_ALIASES)) {
      if (aliases.includes(norm) && !(field in map)) {
        map[field] = idx;
      }
    }
  });
  return map;
}

function excelSerialToDate(serial: number): string {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400 * 1000;
  const dateInfo = new Date(utcValue);

  if (Number.isNaN(dateInfo.getTime())) {
    return '';
  }

  return dateInfo.toISOString().substring(0, 10);
}

function normalizeDate(raw: any): string {
  if (!raw) return '';
  // Excel serial number
  if (typeof raw === 'number') {
    return excelSerialToDate(raw);
  }
  const s = String(raw).trim();
  // Already ISO-like
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  // Try parsing
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().substring(0, 10);
  return s;
}

function normalizeMarket(raw: any): string {
  if (!raw) return 'EGY';
  const s = String(raw).trim().toUpperCase();
  const found = MARKETS.find(m => m.toUpperCase() === s);
  return found || raw || 'EGY';
}

function normalizePhase(raw: any): string {
  if (!raw) return 'Planning';
  const s = String(raw).trim();
  const found = PHASE_NAMES.find(p => p.toLowerCase() === s.toLowerCase());
  return found || 'Planning';
}

function parseRows(data: any[][], headers: string[]): ParsedRow[] {
  const fieldMap = resolveField(headers);

  return data.slice(1).map((row, i) => {
    const get = (field: string) => {
      const idx = fieldMap[field];
      return idx !== undefined ? row[idx] : undefined;
    };

    const errors: string[] = [];
    const rawName = get('name');
    if (!rawName || String(rawName).trim() === '') {
      errors.push('Campaign Name is required');
    }

    const budget = Number(get('budget')) || 0;
    const market = normalizeMarket(get('market'));
    const phase = normalizePhase(get('currentPhase'));

    if (!MARKETS.includes(market)) errors.push(`Unknown market: ${market}`);
    if (!PHASE_NAMES.includes(phase)) errors.push(`Unknown phase: ${phase}`);

    return {
      _rowNum: i + 2,
      name: String(rawName || '').trim(),
      client: String(get('client') || '').trim(),
      market,
      budget,
      startDate: normalizeDate(get('startDate')),
      endDate: normalizeDate(get('endDate')),
      currentPhase: phase,
      notes: String(get('notes') || '').trim(),
      errors,
      valid: errors.length === 0,
    };
  }).filter(r => r.name || r.client); // skip truly empty rows
}

// ─── Download Template ───────────────────────────────────────────────────────���
async function downloadTemplate() {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet([
    ['Campaign Name', 'Client', 'Market', 'Budget (EGP)', 'Start Date', 'End Date', 'Phase', 'Notes'],
    ['Ramadan 2025 - Brand X', 'Brand X', 'EGY', 150000, '2025-03-01', '2025-04-15', 'Planning', 'Focus on stories'],
    ['KSA Launch Q2', 'Brand Y', 'KSA', 80000, '2025-04-01', '2025-05-30', 'Briefing', ''],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Campaigns');
  XLSX.writeFile(wb, 'campaigns_template.xlsx');
}

// ─── Preview Table ─────────────────────────────────────────────────────────────
function PreviewTable({ rows, showErrors }: { rows: ParsedRow[]; showErrors: boolean }) {
  const cols = ['#', 'Name', 'Client', 'Market', 'Budget', 'Start', 'End', 'Phase', 'Notes'];
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-700">
      <table className="w-full text-xs min-w-[700px]">
        <thead className="bg-zinc-50 dark:bg-zinc-800">
          <tr>
            {cols.map(c => (
              <th key={c} className="px-3 py-2.5 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest whitespace-nowrap">
                {c}
              </th>
            ))}
            {showErrors && <th className="px-3 py-2.5 text-left text-[10px] font-black text-red-500 uppercase">Issues</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r._rowNum}
              className={`border-t border-zinc-100 dark:border-zinc-800 ${
                r.valid ? 'hover:bg-zinc-50 dark:hover:bg-zinc-900' : 'bg-red-50 dark:bg-red-950/20'
              }`}>
              <td className="px-3 py-2 font-bold text-zinc-400">{r._rowNum}</td>
              <td className="px-3 py-2 font-bold text-zinc-800 dark:text-zinc-100 max-w-[160px] truncate">{r.name || <span className="text-red-400 italic">missing</span>}</td>
              <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{r.client || '—'}</td>
              <td className="px-3 py-2">
                <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full font-bold text-[10px]">
                  {r.market}
                </span>
              </td>
              <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                {r.budget > 0 ? r.budget.toLocaleString() : '—'}
              </td>
              <td className="px-3 py-2 text-zinc-500 whitespace-nowrap">{r.startDate || '—'}</td>
              <td className="px-3 py-2 text-zinc-500 whitespace-nowrap">{r.endDate || '—'}</td>
              <td className="px-3 py-2">
                <span className="px-2 py-0.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-full font-bold text-[10px]">
                  {r.currentPhase}
                </span>
              </td>
              <td className="px-3 py-2 text-zinc-500 max-w-[140px] truncate">{r.notes || '—'}</td>
              {showErrors && (
                <td className="px-3 py-2">
                  {r.errors.length > 0
                    ? <span className="text-red-500 font-bold">{r.errors.join('; ')}</span>
                    : <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Modal ────────────────────────────────────────────────────────────────
interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImport: (campaigns: BulkCampaign[]) => void;
  existingCount: number;
}

type Step = 'upload' | 'preview' | 'done';

export function CampaignBulkUpload({ isOpen, onClose, onImport, existingCount }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const reset = () => {
    setStep('upload');
    setFileName('');
    setRows([]);
    setHeaders([]);
    setParseError('');
    setShowOnlyErrors(false);
    setImportedCount(0);
  };

  const processFile = useCallback((file: File) => {
    setParseError('');
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setParseError('Unsupported file type. Please upload .xlsx, .xls, or .csv');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const XLSX = await import('xlsx');
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: false });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (raw.length < 2) {
          setParseError('File appears to be empty or has no data rows.');
          return;
        }

        const hdrs = (raw[0] as string[]).map(h => String(h).trim());
        setHeaders(hdrs);

        const fieldMap = resolveField(hdrs);
        if (!('name' in fieldMap)) {
          setParseError(`Could not find a "Campaign Name" column. Found columns: ${hdrs.join(', ')}`);
          return;
        }

        const parsed = parseRows(raw, hdrs);
        if (parsed.length === 0) {
          setParseError('No data rows found after the header.');
          return;
        }

        setRows(parsed);
        setFileName(file.name);
        setStep('preview');
      } catch (err: any) {
        setParseError(`Failed to parse file: ${err.message || err}`);
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const validRows = rows.filter(r => r.valid);
  const invalidRows = rows.filter(r => !r.valid);
  const displayRows = showOnlyErrors ? invalidRows : rows;

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const campaigns: BulkCampaign[] = validRows.map(r => ({
        id: genId(),
        name: r.name,
        client: r.client,
        market: r.market,
        budget: r.budget,
        startDate: r.startDate,
        endDate: r.endDate,
        currentPhase: r.currentPhase,
        phases: buildDefaultPhases(),
        notes: r.notes,
        createdAt: new Date().toISOString(),
      }));
      onImport(campaigns);
      setImportedCount(campaigns.length);
      setStep('done');
      toast.success(`${campaigns.length} campaign${campaigns.length > 1 ? 's' : ''} imported successfully!`);
    } catch (err) {
      toast.error('Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) { reset(); onClose(); } }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 16 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="bg-white dark:bg-zinc-950 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-7 py-5 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center shadow-lg">
                <FileSpreadsheet className="w-5 h-5 text-white dark:text-black" />
              </div>
              <div>
                <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100">Bulk Upload Campaigns</h2>
                <p className="text-xs font-bold text-zinc-400">Import from CSV or Excel (.xlsx / .xls / .csv)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Step indicator */}
              <div className="hidden sm:flex items-center gap-1.5 mr-4">
                {(['upload', 'preview', 'done'] as Step[]).map((s, i) => (
                  <div key={s} className="contents">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                      step === s ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black'
                      : (['upload', 'preview', 'done'].indexOf(step) > i) ? 'bg-zinc-400 dark:bg-zinc-600 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                    }`}>
                      {i + 1}
                    </div>
                    {i < 2 && <div className="w-4 h-px bg-zinc-200 dark:bg-zinc-700" />}
                  </div>
                ))}
              </div>
              <button
                onClick={() => { reset(); onClose(); }}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto p-7">

            {/* ══ STEP 1: Upload ══ */}
            {step === 'upload' && (
              <div className="space-y-6">
                {/* Template download */}
                <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <div>
                    <p className="text-sm font-black text-zinc-700 dark:text-zinc-300">Need a template?</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Download the Excel template with the correct column headers.</p>
                  </div>
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all shadow-sm"
                  >
                    <Download className="w-4 h-4" /> Download Template
                  </button>
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  className={`relative cursor-pointer rounded-3xl border-2 border-dashed transition-all p-12 text-center select-none ${
                    dragging
                      ? 'border-zinc-600 bg-zinc-100 dark:bg-zinc-800'
                      : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="flex flex-col items-center gap-4">
                    <motion.div
                      animate={dragging ? { scale: 1.15 } : { scale: 1 }}
                      className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center"
                    >
                      <Upload className="w-8 h-8 text-zinc-400" />
                    </motion.div>
                    <div>
                      <p className="text-base font-black text-zinc-700 dark:text-zinc-300">
                        {dragging ? 'Drop it here!' : 'Drag & drop your file here'}
                      </p>
                      <p className="text-sm text-zinc-400 mt-1">or click to browse · Supports <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.csv</strong></p>
                    </div>
                  </div>
                </div>

                {parseError && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-black text-red-700 dark:text-red-400">Parse Error</p>
                      <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">{parseError}</p>
                    </div>
                  </motion.div>
                )}

                {/* Column guide */}
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Supported Column Headers</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { field: 'Campaign Name *', aliases: 'name, campaign, title' },
                      { field: 'Client', aliases: 'client, brand, advertiser' },
                      { field: 'Market', aliases: 'market, geo, region' },
                      { field: 'Budget', aliases: 'budget, amount, spend' },
                      { field: 'Start Date', aliases: 'start date, from, launch date' },
                      { field: 'End Date', aliases: 'end date, to, finish date' },
                      { field: 'Phase', aliases: 'phase, status, stage' },
                      { field: 'Notes', aliases: 'notes, description, remarks' },
                    ].map(col => (
                      <div key={col.field} className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
                        <p className="text-xs font-black text-zinc-700 dark:text-zinc-300">{col.field}</p>
                        <p className="text-[9px] text-zinc-400 mt-0.5">{col.aliases}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ══ STEP 2: Preview ══ */}
            {step === 'preview' && (
              <div className="space-y-5">
                {/* Summary bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-zinc-500" />
                      <span className="text-sm font-black text-zinc-700 dark:text-zinc-300 truncate max-w-[200px]">{fileName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-full text-[10px] font-black">
                        {rows.length} rows
                      </span>
                      <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-[10px] font-black">
                        ✓ {validRows.length} valid
                      </span>
                      {invalidRows.length > 0 && (
                        <span className="px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-[10px] font-black">
                          ✗ {invalidRows.length} errors
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {invalidRows.length > 0 && (
                      <button
                        onClick={() => setShowOnlyErrors(!showOnlyErrors)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all text-zinc-600 dark:text-zinc-400"
                      >
                        {showOnlyErrors ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {showOnlyErrors ? 'Show All' : 'Show Errors Only'}
                      </button>
                    )}
                    <button
                      onClick={reset}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all text-zinc-600 dark:text-zinc-400"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Change File
                    </button>
                  </div>
                </div>

                {/* Detected headers */}
                <div className="flex items-start gap-2 flex-wrap">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1 shrink-0">Detected columns:</span>
                  {headers.map(h => (
                    <span key={h} className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg text-[10px] font-bold">
                      {h}
                    </span>
                  ))}
                </div>

                {/* Error warning */}
                {invalidRows.length > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                      {invalidRows.length} row{invalidRows.length > 1 ? 's' : ''} have errors and will be skipped. Only the {validRows.length} valid row{validRows.length > 1 ? 's' : ''} will be imported.
                    </p>
                  </div>
                )}

                {/* Preview table */}
                <PreviewTable rows={displayRows} showErrors={invalidRows.length > 0} />

                {rows.length > 10 && (
                  <p className="text-xs text-zinc-400 text-center">
                    Showing {displayRows.length} of {rows.length} rows
                  </p>
                )}
              </div>
            )}

            {/* ══ STEP 3: Done ══ */}
            {step === 'done' && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 250, damping: 20 }}
                  className="w-20 h-20 bg-zinc-900 dark:bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl"
                >
                  <CheckCircle2 className="w-10 h-10 text-white dark:text-black" />
                </motion.div>
                <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mb-2">
                  {importedCount} Campaign{importedCount > 1 ? 's' : ''} Imported!
                </h3>
                <p className="text-sm text-zinc-500 mb-2">
                  Your campaigns have been added to the Campaign Manager.
                </p>
                <p className="text-xs text-zinc-400">
                  Total campaigns: {existingCount + importedCount}
                </p>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between px-7 py-5 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
            {step === 'upload' && (
              <>
                <p className="text-xs text-zinc-400">Max file size: 10 MB</p>
                <button onClick={() => { reset(); onClose(); }}
                  className="px-5 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all text-sm">
                  Cancel
                </button>
              </>
            )}
            {step === 'preview' && (
              <>
                <button onClick={reset}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all text-sm">
                  ← Back
                </button>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-zinc-400">
                    {validRows.length} campaign{validRows.length !== 1 ? 's' : ''} ready to import
                  </span>
                  <button
                    onClick={handleImport}
                    disabled={validRows.length === 0 || importing}
                    className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black rounded-xl font-black text-sm transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importing ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Importing...</>
                    ) : (
                      <><Table2 className="w-4 h-4" /> Import {validRows.length} Campaign{validRows.length !== 1 ? 's' : ''}</>
                    )}
                  </button>
                </div>
              </>
            )}
            {step === 'done' && (
              <>
                <button
                  onClick={() => { reset(); }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all text-sm">
                  <Upload className="w-4 h-4" /> Upload Another
                </button>
                <button
                  onClick={() => { reset(); onClose(); }}
                  className="px-6 py-2.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black rounded-xl font-black text-sm transition-all shadow-lg"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
