import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OPS_TEAMS } from '@/types';

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

export function SOPModal({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-black text-xl">SOP & Roles</DialogTitle></DialogHeader>
        <div className="space-y-6">
          <section>
            <h3 className="font-bold text-sm mb-2">Roles</h3>
            <div className="space-y-2 text-sm">
              <div className="p-3 rounded-xl bg-muted"><strong>Owner:</strong> Full access. Cannot be restricted. Manages team and settings.</div>
              <div className="p-3 rounded-xl bg-muted"><strong>Admin:</strong> Campaign management, reporting, analytics, user management.</div>
              <div className="p-3 rounded-xl bg-muted"><strong>Member:</strong> Tasks, community, coverage, handover. Limited campaign access.</div>
            </div>
          </section>
          <section>
            <h3 className="font-bold text-sm mb-2">Operational Teams</h3>
            <div className="grid grid-cols-2 gap-2">
              {OPS_TEAMS.map(t => (
                <div key={t} className="p-2 rounded-lg bg-muted text-sm font-medium">{t}</div>
              ))}
            </div>
          </section>
          <section>
            <h3 className="font-bold text-sm mb-2">Standard Operating Procedures</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>1. All campaigns go through intake → planning → briefing → activation → live → post-campaign → closed.</p>
              <p>2. Tasks must have clear criteria, methodology, and assignment before moving to "In Progress".</p>
              <p>3. Coverage submissions must be QC'd within 24 hours.</p>
              <p>4. Shift handovers must be filed before end of shift.</p>
              <p>5. Mistakes must be logged immediately with severity and resolution plan.</p>
              <p>6. Success logs are encouraged for team morale and reporting.</p>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
