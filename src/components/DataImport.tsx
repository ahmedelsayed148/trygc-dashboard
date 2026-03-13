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
    <div className="p-8 max-w-4xl mx-auto">
      <div className="bg-white dark:bg-zinc-950 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-2xl">
            <Upload className="w-8 h-8 text-zinc-800 dark:text-zinc-200" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-zinc-800 dark:text-zinc-100">Data Import</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              Import data from a previous export
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-300 dark:border-zinc-700">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-zinc-700 dark:text-zinc-300 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-zinc-800 dark:text-zinc-100 mb-1">
                  Warning
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Importing data will replace all existing data in the system. This action cannot be undone.
                  Make sure to export your current data before importing.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-2">
              File Requirements
            </h2>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-600 rounded-full" />
                Must be a JSON file exported from this system
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-600 rounded-full" />
                File should contain valid task and configuration data
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-600 rounded-full" />
                Maximum file size: 10MB
              </li>
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
            className={`w-full py-4 bg-black dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer ${
              importing ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
            }`}
          >
            {importing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <FileUp className="w-5 h-5" />
                Select File to Import
              </>
            )}
          </label>

          {importStatus && (
            <div className={`p-4 rounded-xl text-center font-medium ${
              importStatus.includes('failed')
                ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200'
                : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200'
            }`}>
              {importStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
