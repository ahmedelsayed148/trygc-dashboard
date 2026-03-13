import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

export function AddUpdateModal({ open, onOpenChange }: Props) {
  const { dispatch } = useApp();
  const [rawText, setRawText] = useState('');
  const [category, setCategory] = useState('General');

  const handleSubmit = () => {
    if (!rawText.trim()) return;
    const formatted = rawText.split('\n').filter(Boolean).map(line => `• ${line.trim()}`).join('\n');
    dispatch({
      type: 'ADD_UPDATE',
      payload: {
        id: `u-${Date.now()}`, rawText, formattedText: formatted, category, createdAt: new Date().toISOString(),
      },
    });
    toast.success('Update added');
    setRawText(''); setCategory('General');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-lg">
        <DialogHeader><DialogTitle className="font-black">Add Update</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Category" value={category} onChange={e => setCategory(e.target.value)} />
          <Textarea placeholder="Paste your update here..." value={rawText} onChange={e => setRawText(e.target.value)} rows={6} />
          <Button onClick={handleSubmit} className="w-full font-bold rounded-xl">Submit Update</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
