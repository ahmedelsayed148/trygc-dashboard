import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertTriangle, ArrowRight, Loader2, Settings2 } from 'lucide-react';

// Function/department mapping rules
const FUNCTION_RULES: Record<string, { keywords: string[]; defaultAssignee: string; color: string }> = {
  'Operations': {
    keywords: ['execution', 'send', 'deliver', 'dispatch', 'process', 'batch', 'approve', 'approved', 'sent', 'ops'],
    defaultAssignee: 'Ops Team',
    color: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
  },
  'Follow-up': {
    keywords: ['follow', 'reminder', 'rem', 'call', 'callback', 'reach', 'contact', 'chase'],
    defaultAssignee: 'Follow-up Team',
    color: 'bg-zinc-200 text-zinc-800 border-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:border-zinc-600'
  },
  'Quality & Audit': {
    keywords: ['audit', 'quality', 'check', 'verify', 'sync', 'review', 'qa', 'validate', 'duplicate'],
    defaultAssignee: 'QA Team',
    color: 'bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700'
  },
  'Creative & Content': {
    keywords: ['design', 'creative', 'content', 'copy', 'visual', 'banner', 'video', 'media', 'artwork'],
    defaultAssignee: 'Creative Team',
    color: 'bg-zinc-150 text-zinc-700 border-zinc-250 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-600'
  },
  'Client Management': {
    keywords: ['client', 'approval', 'feedback', 'brief', 'requirement', 'meeting', 'presentation'],
    defaultAssignee: 'Account Manager',
    color: 'bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-600'
  },
  'Reporting & Analytics': {
    keywords: ['report', 'analytics', 'data', 'dashboard', 'metric', 'kpi', 'performance', 'insight', 'tracking'],
    defaultAssignee: 'Analytics Team',
    color: 'bg-zinc-200 text-zinc-700 border-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-600'
  },
  'Tech & System': {
    keywords: ['system', 'api', 'integration', 'platform', 'bug', 'fix', 'deploy', 'server', 'database', 'tech'],
    defaultAssignee: 'Tech Team',
    color: 'bg-zinc-300 text-zinc-800 border-zinc-400 dark:bg-zinc-600 dark:text-zinc-200 dark:border-zinc-500'
  }
};

function detectFunction(text: string): string {
  const lower = (text || '').toLowerCase();
  let bestMatch = 'Operations';
  let bestScore = 0;
  
  for (const [func, config] of Object.entries(FUNCTION_RULES)) {
    const score = config.keywords.filter(kw => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = func;
    }
  }
  return bestMatch;
}

function detectPriority(text: string): string {
  const lower = (text || '').toLowerCase();
  if (lower.includes('urgent') || lower.includes('critical') || lower.includes('asap') || lower.includes('high')) return 'High';
  if (lower.includes('low') || lower.includes('minor')) return 'Low';
  return 'Medium';
}

interface ParsedRow {
  campaign: string;
  description: string;
  assignedTo: string;
  priority: string;
  status: string;
  location: string;
  category: string;
  channel: string;
  deliverable: string;
  slaHrs: number;
  detectedFunction: string;
  metricTarget?: number;
  metricCON?: number;
  metricCOV?: number;
  metricMissingDate?: number;
  metricWithDate?: number;
  metricMissingCOV?: number;
  metricConfirmationToday?: number;
}

interface ColumnMapping {
  campaign: string;
  description: string;
  assignedTo: string;
  priority: string;
  status: string;
  location: string;
  category: string;
  channel: string;
  deliverable: string;
  slaHrs: string;
  target: string;
  con: string;
  cov: string;
  missingDate: string;
  withDate: string;
  missingCov: string;
  todayCon: string;
}

interface XlsxUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (tasks: any[]) => void;
}

export function XlsxUploader({ isOpen, onClose, onImport }: XlsxUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'split'>('upload');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Column mapping state
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    campaign: '',
    description: '',
    assignedTo: '',
    priority: '',
    status: '',
    location: '',
    category: '',
    channel: '',
    deliverable: '',
    slaHrs: '',
    target: '',
    con: '',
    cov: '',
    missingDate: '',
    withDate: '',
    missingCov: '',
    todayCon: '',
  });

  const reset = () => {
    setParsedData([]);
    setRawData([]);
    setRawHeaders([]);
    setStep('upload');
    setFileName('');
    setError('');
    setIsProcessing(false);
    setColumnMapping({
      campaign: '',
      description: '',
      assignedTo: '',
      priority: '',
      status: '',
      location: '',
      category: '',
      channel: '',
      deliverable: '',
      slaHrs: '',
      target: '',
      con: '',
      cov: '',
      missingDate: '',
      withDate: '',
      missingCov: '',
      todayCon: '',
    });
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Auto-detect column mapping
  const autoDetectMapping = (headers: string[]): ColumnMapping => {
    const findCol = (hints: string[]) => {
      return headers.find(h => hints.some(hint => h.toLowerCase().includes(hint))) || '';
    };

    return {
      campaign: findCol(['campaign', 'brand', 'project', 'client']),
      description: findCol(['description', 'task', 'detail', 'action', 'activity', 'name']),
      assignedTo: findCol(['assign', 'owner', 'responsible', 'team', 'person', 'member']),
      priority: findCol(['priority', 'urgency', 'importance']),
      status: findCol(['status', 'state', 'progress']),
      location: findCol(['location', 'region', 'country', 'city', 'area']),
      category: findCol(['category', 'type', 'function', 'department', 'dept']),
      channel: findCol(['channel', 'medium', 'platform', 'source']),
      deliverable: findCol(['deliverable', 'output', 'result', 'target']),
      slaHrs: findCol(['sla', 'hours', 'deadline', 'duration', 'time']),
      target: findCol(['target', 'goal']),
      con: findCol(['con', 'confirmation']),
      cov: findCol(['cov', 'coverage']),
      missingDate: findCol(['missing date', 'missingdate', 'no date']),
      withDate: findCol(['with date', 'withdate', 'dated']),
      missingCov: findCol(['missing cov', 'missingcov']),
      todayCon: findCol(['today', 'confirmation today', 'today con']),
    };
  };

  const processFile = useCallback((file: File) => {
    setError('');
    setIsProcessing(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const XLSX = await import('xlsx');
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' }) as Record<string, any>[];

        if (jsonData.length === 0) {
          setError('The file appears to be empty. Please check your spreadsheet.');
          setIsProcessing(false);
          return;
        }

        const headers = Object.keys(jsonData[0]);
        setRawHeaders(headers);
        setRawData(jsonData);

        // Auto-detect column mapping
        const detected = autoDetectMapping(headers);
        setColumnMapping(detected);

        setStep('mapping');
        setIsProcessing(false);
      } catch (err) {
        setError('Failed to parse the file. Please ensure it\'s a valid .xlsx file.');
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleApplyMapping = () => {
    const parsed: ParsedRow[] = rawData.map((row: any) => {
      const desc = String(row[columnMapping.description] || row[rawHeaders[1]] || row[rawHeaders[0]] || '');
      const cat = String(row[columnMapping.category] || '');
      const combined = `${desc} ${cat}`;
      const detectedFunc = detectFunction(combined);

      return {
        campaign: String(row[columnMapping.campaign] || row[rawHeaders[0]] || 'Imported Campaign'),
        description: desc || 'Untitled Task',
        assignedTo: String(row[columnMapping.assignedTo] || FUNCTION_RULES[detectedFunc]?.defaultAssignee || 'Unassigned'),
        priority: row[columnMapping.priority] ? String(row[columnMapping.priority]) : detectPriority(desc),
        status: String(row[columnMapping.status] || 'Pending'),
        location: String(row[columnMapping.location] || ''),
        category: cat || detectedFunc,
        channel: String(row[columnMapping.channel] || 'Direct'),
        deliverable: String(row[columnMapping.deliverable] || ''),
        slaHrs: parseInt(row[columnMapping.slaHrs]) || 8,
        detectedFunction: detectedFunc,
        // Performance metrics
        metricTarget: parseInt(row[columnMapping.target]) || 0,
        metricCON: parseInt(row[columnMapping.con]) || 0,
        metricCOV: parseInt(row[columnMapping.cov]) || 0,
        metricMissingDate: parseInt(row[columnMapping.missingDate]) || 0,
        metricWithDate: parseInt(row[columnMapping.withDate]) || 0,
        metricMissingCOV: parseInt(row[columnMapping.missingCov]) || 0,
        metricConfirmationToday: parseInt(row[columnMapping.todayCon]) || 0
      };
    });

    setParsedData(parsed);
    setStep('preview');
  };

  const SUBTASK_TEMPLATES = [
    { label: 'Send Inv', category: 'Operations', defaultSla: 4 },
    { label: 'Reminder', category: 'Follow-up', defaultSla: 4 },
    { label: 'Follow Up', category: 'Follow-up', defaultSla: 8 },
    { label: 'Audit Sheet', category: 'Quality & Audit', defaultSla: 8 },
    { label: 'Need Conf', category: 'Operations', defaultSla: 8 },
    { label: 'Call No Response & Pending Users', category: 'Follow-up', defaultSla: 8 },
    { label: 'Call Missing Coverage', category: 'Follow-up', defaultSla: 8 },
  ];

  const handleImport = () => {
    const now = new Date().toISOString().slice(0, 16);
    const baseId = Date.now();
    let idCounter = 0;

    // Group parsed rows by campaign name
    const campaignMap = new Map<string, ParsedRow[]>();
    parsedData.forEach(row => {
      const key = (row.campaign || 'Imported Campaign').trim();
      if (!campaignMap.has(key)) campaignMap.set(key, []);
      campaignMap.get(key)!.push(row);
    });

    const allTasks: any[] = [];

    campaignMap.forEach((rows, campaignName) => {
      // Aggregate metrics from all rows in this campaign
      const totalTarget = rows.reduce((a, r) => a + (r.metricTarget || 0), 0);
      const totalCON = rows.reduce((a, r) => a + (r.metricCON || 0), 0);
      const totalCOV = rows.reduce((a, r) => a + (r.metricCOV || 0), 0);
      const totalMissingDate = rows.reduce((a, r) => a + (r.metricMissingDate || 0), 0);
      const totalWithDate = rows.reduce((a, r) => a + (r.metricWithDate || 0), 0);
      const totalMissingCOV = rows.reduce((a, r) => a + (r.metricMissingCOV || 0), 0);
      const totalTodayCon = rows.reduce((a, r) => a + (r.metricConfirmationToday || 0), 0);

      // Use the first row for common fields
      const firstRow = rows[0];
      const masterId = baseId + idCounter++;

      // Create master task
      const masterTask = {
        id: masterId,
        campaign: campaignName,
        description: `Master Task — ${campaignName}`,
        assignedTo: firstRow.assignedTo,
        priority: firstRow.priority,
        status: 'In Progress',
        location: firstRow.location,
        category: firstRow.category || firstRow.detectedFunction,
        channel: firstRow.channel,
        deliverable: firstRow.deliverable,
        slaHrs: firstRow.slaHrs,
        startDateTime: now,
        resultSummary: '',
        finalOutput: '',
        blocker: '',
        nextStep: '',
        isMaster: true,
        subtaskIds: [] as number[],
        metricTarget: totalTarget,
        metricCON: totalCON,
        metricCOV: totalCOV,
        metricMissingDate: totalMissingDate,
        metricWithDate: totalWithDate,
        metricMissingCOV: totalMissingCOV,
        metricConfirmationToday: totalTodayCon,
      };

      // Create the predefined subtasks for each imported campaign
      const subtaskIds: number[] = [];
      SUBTASK_TEMPLATES.forEach(template => {
        const subId = baseId + idCounter++;
        subtaskIds.push(subId);

        allTasks.push({
          id: subId,
          campaign: campaignName,
          description: template.label,
          assignedTo: firstRow.assignedTo,
          priority: firstRow.priority,
          status: 'Pending',
          location: firstRow.location,
          category: template.category,
          channel: firstRow.channel,
          deliverable: '',
          slaHrs: template.defaultSla,
          startDateTime: now,
          resultSummary: '',
          finalOutput: '',
          blocker: '',
          nextStep: '',
          isSubtask: true,
          parentId: masterId,
          parentCampaign: campaignName,
          metricTarget: 0,
          metricCON: 0,
          metricCOV: 0,
          metricMissingDate: 0,
          metricWithDate: 0,
          metricMissingCOV: 0,
          metricConfirmationToday: 0,
        });
      });

      masterTask.subtaskIds = subtaskIds;
      // Insert master task before its subtasks
      allTasks.splice(allTasks.length - SUBTASK_TEMPLATES.length, 0, masterTask);
    });

    onImport(allTasks);
    handleClose();
  };

  // Group by detected function for the split view
  const groupedByFunction = parsedData.reduce((acc, row) => {
    const func = row.detectedFunction;
    if (!acc[func]) acc[func] = [];
    acc[func].push(row);
    return acc;
  }, {} as Record<string, ParsedRow[]>);

  if (!isOpen) return null;

  const fieldLabels: Record<keyof ColumnMapping, string> = {
    campaign: 'Campaign/Brand',
    description: 'Task Description *',
    assignedTo: 'Assigned To',
    priority: 'Priority',
    status: 'Status',
    location: 'Location',
    category: 'Category/Function',
    channel: 'Channel',
    deliverable: 'Deliverable',
    slaHrs: 'SLA Hours',
    target: 'Target',
    con: 'CON (Confirmation)',
    cov: 'COV (Coverage)',
    missingDate: 'Missing Date',
    withDate: 'With Date',
    missingCov: 'Missing COV',
    todayCon: 'Today CON',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-950 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden transition-colors border border-zinc-200 dark:border-zinc-800">
        {/* Header */}
        <div className="app-hero-panel p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl app-hero-stat border flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 app-hero-title" />
            </div>
            <div>
              <h2 className="text-lg font-black app-hero-title">Import Campaign Tasks</h2>
              <p className="text-xs app-hero-copy font-medium">
                {step === 'upload' && 'Upload your .xlsx file with campaign tasks'}
                {step === 'mapping' && `Map columns from ${fileName}`}
                {step === 'preview' && `Preview: ${parsedData.length} tasks detected from ${fileName}`}
                {step === 'split' && 'Tasks automatically split by function'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full border border-zinc-200 dark:border-zinc-800">
            <X className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
          {['Upload', 'Map Columns', 'Preview', 'Function Split'].map((label, i) => {
            const stepIdx = ['upload', 'mapping', 'preview', 'split'][i];
            const isActive = step === stepIdx;
            const isDone = (step === 'mapping' && i === 0) || (step === 'preview' && i <= 1) || (step === 'split' && i <= 2);
            return (
              <div key={label} className="flex items-center gap-2">
                {i > 0 && <ArrowRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />}
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${isActive ? 'app-accent-button' : isDone ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'}`}>
                  {isDone && !isActive ? '✓ ' : ''}{label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${isDragOver ? 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-900' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900'}`}
              >
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-zinc-600 animate-spin" />
                    <p className="text-sm font-bold text-zinc-600 dark:text-zinc-300">Processing file...</p>
                  </div>
                ) : (
                  <>
                    <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragOver ? 'text-black dark:text-white' : 'text-zinc-300 dark:text-zinc-600'}`} />
                    <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">Drag & drop your .xlsx file here</p>
                    <p className="text-xs text-zinc-400">or click to browse</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {error && (
                <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 p-4 rounded-xl border border-zinc-300 dark:border-zinc-700">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-5 border border-zinc-200 dark:border-zinc-700">
                <h3 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-3">Expected Column Format</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">The system will auto-detect columns (you can adjust manually). Common headers:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {['Campaign / Brand', 'Task Description', 'Assigned To', 'Priority', 'Status', 'Location', 'Category / Function', 'Channel', 'Deliverable', 'SLA Hours', 'Target', 'CON', 'COV', 'Today CON'].map(col => (
                    <span key={col} className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700">{col}</span>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-400 mt-3 font-medium">
                  Tasks will be <strong>automatically classified</strong> by function (Operations, Follow-up, QA, Creative, Client Mgmt, Reporting, Tech) based on keywords.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Column Mapping */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <Settings2 className="w-5 h-5 text-zinc-600 dark:text-zinc-400 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                    Auto-detected columns from your file. Review and adjust if needed.
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Fields marked with * are recommended for best results
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
                {(Object.keys(fieldLabels) as Array<keyof ColumnMapping>).map((field) => (
                  <div key={field} className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      {fieldLabels[field]}
                    </label>
                    <select
                      value={columnMapping[field]}
                      onChange={(e) => setColumnMapping({ ...columnMapping, [field]: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-200 focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
                    >
                      <option value="">-- Skip this field --</option>
                      {rawHeaders.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700">
                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  💡 <strong>Tip:</strong> At minimum, map the "Task Description" field. All other fields are optional and will use intelligent defaults.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Preview */}
          {step === 'preview' && (() => {
            // Group by campaign for preview
            const campaignGroups = new Map<string, ParsedRow[]>();
            parsedData.forEach(row => {
              const key = (row.campaign || 'Imported Campaign').trim();
              if (!campaignGroups.has(key)) campaignGroups.set(key, []);
              campaignGroups.get(key)!.push(row);
            });
            const campaignCount = campaignGroups.size;
            const totalTaskCount = campaignCount * (1 + SUBTASK_TEMPLATES.length);

            return (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <CheckCircle2 className="w-5 h-5 text-zinc-600 dark:text-zinc-400 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                    {parsedData.length} rows parsed from <span className="font-black">{fileName}</span>
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Will create <span className="font-black text-zinc-800 dark:text-zinc-200">{campaignCount} master campaigns</span> with <span className="font-black text-zinc-800 dark:text-zinc-200">7 subtasks each</span> = <span className="font-black text-zinc-800 dark:text-zinc-200">{totalTaskCount} total tasks</span>
                  </p>
                </div>
              </div>

              {/* Campaign breakdown with subtasks preview */}
              <div className="space-y-3">
                {[...campaignGroups.entries()].map(([campaignName, rows], idx) => (
                  <div key={idx} className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 app-accent-button rounded-xl flex items-center justify-center text-[10px] font-black">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-black text-zinc-800 dark:text-zinc-100">{campaignName}</p>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                            {rows.length} source row{rows.length > 1 ? 's' : ''} — Assigned to: {rows[0].assignedTo} — Priority: {rows[0].priority}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-zinc-500 bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded">
                          CON: {rows.reduce((a, r) => a + (r.metricCON || 0), 0)}
                        </span>
                        <span className="text-[10px] font-black text-zinc-500 bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded">
                          TGT: {rows.reduce((a, r) => a + (r.metricTarget || 0), 0)}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-white dark:bg-zinc-950">
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2 px-1">Auto-generated subtasks</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {SUBTASK_TEMPLATES.map((sub, si) => (
                          <div key={si} className="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-800">
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600 shrink-0" />
                            <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300 truncate">{sub.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            );
          })()}

          {/* STEP 4: Split View */}
          {step === 'split' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(groupedByFunction).map(([func, rows]) => (
                  <div key={func} className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                    <div className={`p-4 border-b border-zinc-200 dark:border-zinc-800 ${FUNCTION_RULES[func]?.color || 'bg-zinc-100'}`}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black">{func}</h3>
                        <span className="text-xs font-black px-2 py-0.5 bg-white/60 dark:bg-zinc-900/30 rounded-full">{rows.length}</span>
                      </div>
                      <p className="text-[10px] font-bold opacity-70 mt-0.5">Default: {FUNCTION_RULES[func]?.defaultAssignee}</p>
                    </div>
                    <div className="p-3 space-y-2 max-h-60 overflow-y-auto bg-white dark:bg-zinc-950">
                      {rows.map((row, i) => (
                        <div key={i} className="p-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-800">
                          <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 leading-snug">{row.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] text-zinc-400 font-bold">{row.campaign}</span>
                            <span className="text-[9px] text-zinc-300 dark:text-zinc-600">&bull;</span>
                            <span className="text-[9px] text-zinc-400 font-bold">{row.assignedTo}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700">
                <h4 className="text-xs font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-widest mb-2">Split Summary</h4>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(groupedByFunction).map(([func, rows]) => (
                    <div key={func} className="flex items-center gap-2 bg-white dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                      <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">{func}</span>
                      <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">{rows.length}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-between">
          <div>
            {step !== 'upload' && (
              <button
                onClick={() => setStep(step === 'split' ? 'preview' : step === 'preview' ? 'mapping' : 'upload')}
                className="px-4 py-2 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-all"
              >
                ← Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleClose} className="px-5 py-2.5 text-sm font-bold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-all">
              Cancel
            </button>
            {step === 'mapping' && (
              <button
                onClick={handleApplyMapping}
                className="px-5 py-2.5 app-accent-button rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg"
              >
                Apply Mapping <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {step === 'preview' && (
              <button
                onClick={() => setStep('split')}
                className="px-5 py-2.5 app-accent-button rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg"
              >
                View Function Split <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {(step === 'preview' || step === 'split') && (() => {
              const campSet = new Set(parsedData.map(r => (r.campaign || 'Imported Campaign').trim()));
              const totalCount = campSet.size * (1 + SUBTASK_TEMPLATES.length);
              return (
              <button
                onClick={handleImport}
                className="px-5 py-2.5 app-accent-button rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg"
              >
                <CheckCircle2 className="w-4 h-4" /> Import {campSet.size} Campaigns ({totalCount} Tasks)
              </button>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

export { FUNCTION_RULES, detectFunction };
