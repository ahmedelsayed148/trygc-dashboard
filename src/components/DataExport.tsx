import React, { useContext, useState } from 'react';
import { AppContext } from './Root';
import { Download, FileDown, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

export function DataExport() {
  const ctx = useContext(AppContext);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');

  const handleExport = async () => {
    setExporting(true);
    setExportStatus('Preparing export...');
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b626472b/export-data`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Export failed');
      }

      const data = await response.json();
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trygc-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportStatus('Export completed successfully!');
    } catch (error) {
      console.error('Export error:', error);
      setExportStatus(`Export failed: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="px-4 py-6 md:px-6 max-w-2xl mx-auto">
      <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-4">
          <div className="w-11 h-11 bg-zinc-900 dark:bg-zinc-100 rounded-2xl flex items-center justify-center">
            <Download className="w-5 h-5 text-white dark:text-black" />
          </div>
          <div>
            <h1 className="text-xl font-black text-zinc-800 dark:text-zinc-100">Data Export</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Export all workspace data for backup or migration</p>
          </div>
        </div>

        <div className="p-8 space-y-5">
          <div className="p-5 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">What's included</p>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              {['All tasks and campaigns', 'Success logs and metrics', 'User configurations', 'Team member data'].map(item => (
                <li key={item} className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-600 rounded-full flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full py-3.5 bg-black dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 text-sm"
          >
            {exporting ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Exporting...</>
            ) : (
              <><FileDown className="w-4 h-4" />Export Data</>
            )}
          </button>

          {exportStatus && (
            <div className="p-4 rounded-xl text-center text-sm font-medium bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
              {exportStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
