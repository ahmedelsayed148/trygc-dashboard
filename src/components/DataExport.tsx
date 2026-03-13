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
    <div className="p-8 max-w-4xl mx-auto">
      <div className="bg-white dark:bg-zinc-950 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-2xl">
            <Download className="w-8 h-8 text-zinc-800 dark:text-zinc-200" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-zinc-800 dark:text-zinc-100">Data Export</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              Export all your data for backup or migration
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-2">
              What will be exported?
            </h2>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-600 rounded-full" />
                All tasks and campaigns
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-600 rounded-full" />
                Success logs and metrics
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-600 rounded-full" />
                User configurations
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-600 rounded-full" />
                Team member data
              </li>
            </ul>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full py-4 bg-black dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black rounded-2xl font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {exporting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FileDown className="w-5 h-5" />
                Export Data
              </>
            )}
          </button>

          {exportStatus && (
            <div className={`p-4 rounded-xl text-center font-medium ${
              exportStatus.includes('failed')
                ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200'
                : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200'
            }`}>
              {exportStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
