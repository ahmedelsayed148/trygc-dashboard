import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

export function XLSXUploader({ open, onOpenChange }: Props) {
  const [data, setData] = useState<Record<string, string>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws);
      if (json.length > 0) {
        setColumns(Object.keys(json[0]));
        setData(json.slice(0, 50));
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const handleImport = () => {
    toast.success(`Imported ${data.length} rows from ${fileName}`);
    onOpenChange(false);
    setData([]); setColumns([]); setFileName('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-black">Upload XLSX</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="text-sm" />
          {data.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground">{fileName} — {data.length} rows, {columns.length} columns</p>
              <div className="overflow-x-auto border rounded-xl max-h-60">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>{columns.map(c => <th key={c} className="p-2 text-left font-bold">{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {data.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t">
                        {columns.map(c => <td key={c} className="p-2 truncate max-w-[200px]">{row[c]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button onClick={handleImport} className="w-full font-bold rounded-xl">Import Data</Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
