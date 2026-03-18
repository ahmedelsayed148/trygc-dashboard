import React, { useContext, useState, useRef } from 'react';
import { AppContext } from './Root';
import { Upload, FileUp, Loader2, AlertCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

export function DataImport() {
  const ctx = useContext(AppContext);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportStatus('Reading file...');

    try {
      const fileContent = await file.text();
      const data = JSON.parse(fileContent);

      setImportStatus('Uploading data...');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b626472b/import-data`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();
      setImportStatus(`Import completed successfully! Imported ${result.count || 0} records.`);

      // Refresh the page data
      window.location.reload();
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus('Import failed. Please check your file and try again.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="px-4 py-6 md:px-6 max-w-2xl mx-auto">
      <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-4">
          <div className="w-11 h-11 bg-zinc-900 dark:bg-zinc-100 rounded-2xl flex items-center justify-center">
            <Upload className="w-5 h-5 text-white dark:text-black" />
          </div>
          <div>
            <h1 className="text-xl font-black text-zinc-800 dark:text-zinc-100">Data Import</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Import data from a previous export</p>
          </div>
        </div>

        <div className="p-8 space-y-5">
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex gap-3">
            <AlertCircle className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Importing will replace all existing data. Export your current data first — this cannot be undone.
            </p>
          </div>

          <div className="p-5 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">File requirements</p>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              {['JSON file exported from this system', 'Valid task and configuration data', 'Maximum file size: 10MB'].map(item => (
                <li key={item} className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-600 rounded-full flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            disabled={importing}
            className="hidden"
            id="import-file"
          />

          <label
            htmlFor="import-file"
            className={`w-full py-3.5 bg-black dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black rounded-2xl font-bold transition-all flex items-center justify-center gap-2.5 text-sm cursor-pointer ${
              importing ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
            }`}
          >
            {importing ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Importing...</>
            ) : (
              <><FileUp className="w-4 h-4" />Select File to Import</>
            )}
          </label>

          {importStatus && (
            <div className="p-4 rounded-xl text-center text-sm font-medium bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
              {importStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
