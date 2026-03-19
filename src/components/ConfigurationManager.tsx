import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Archive,
  BarChart3,
  Bell,
  ChevronRight,
  Database,
  Download,
  FileText,
  Flag,
  History,
  Layers,
  Loader2,
  Lock,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Server,
  Settings,
  Target,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { CampaignRow, loadCampaigns, saveCampaigns } from '../lib/campaignOverviewData';
import { AppContext } from './Root';
import { useConfiguration } from '../context/ConfigurationContext';
import {
  AppConfiguration,
  ConfigAuditLog,
  ConfigBackup,
  ConfigCategory,
  UpdateOrganizerConfig,
  normalizeConfiguration,
} from '../lib/configurationService';
import { matchesThemePreset, THEME_COLOR_PRESETS } from '../lib/appearanceOptions';
import { OPERATIONS_TEAMS } from '../lib/operations';

type StatusMessage = { tone: 'success' | 'error'; text: string } | null;

// ─── Sidebar nav items ────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'system',       label: 'System',        icon: Server,    desc: 'Core app settings, branding, maintenance' },
  { id: 'campaign',     label: 'Campaigns',     icon: Target,    desc: 'Phases, SLA, required fields' },
  { id: 'team',         label: 'Team',          icon: Users,     desc: 'Teams, assignment, escalation' },
  { id: 'notification', label: 'Notifications', icon: Bell,      desc: 'Channels, triggers, quiet hours' },
  { id: 'workspace',    label: 'Workspace',     icon: Layers,    desc: 'Timezone, language, permissions' },
  { id: 'task',         label: 'Tasks',         icon: Settings,  desc: 'Statuses, priorities, SLAs' },
  { id: 'analytics',    label: 'Analytics',     icon: BarChart3, desc: 'Layout, KPIs, data retention' },
  { id: 'data',         label: 'Data',          icon: Database,  desc: 'File limits, formats, templates' },
  { id: 'feature',      label: 'Feature Flags', icon: Flag,      desc: 'Enable/disable platform features' },
  { id: 'audit',        label: 'Audit Log',     icon: History,   desc: 'Configuration change history' },
  { id: 'backups',      label: 'Backups',       icon: Archive,   desc: 'Create and restore config backups' },
  { id: 'overview-data', label: 'Campaign Overview Data', icon: BarChart3, desc: 'Add · edit · delete campaign rows' },
  { id: 'updateOrganizer', label: 'Update & Handover', icon: MessageSquare, desc: 'Templates, shift windows, history limits' },
] as const;

type NavId = (typeof NAV_ITEMS)[number]['id'];
const CONFIG_SECTIONS: ConfigCategory[] = ['system', 'campaign', 'team', 'notification', 'workspace', 'task', 'analytics', 'data', 'feature', 'updateOrganizer'];
const CONFIG_AUTOSAVE_DELAY_MS = 500;

// ─── Small helpers ────────────────────────────────────────────────────────────

function findThemePreset(config: AppConfiguration['system']) {
  return THEME_COLOR_PRESETS.find((preset) => (
    matchesThemePreset(config.primaryColor, config.secondaryColor, preset)
  ));
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-5 border-b border-zinc-200 pb-4 dark:border-zinc-800">
      <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100">{title}</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
    </div>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-zinc-100 py-3.5 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-5 dark:border-zinc-800/60">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{label}</div>
        {description && <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{description}</div>}
      </div>
      <div className="w-full min-w-0 sm:w-auto sm:max-w-[min(100%,32rem)] sm:shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 ${
        checked ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-300 dark:bg-zinc-700'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform dark:bg-zinc-900 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function TagList({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setDraft('');
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span key={tag} className="flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {tag}
            <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))} className="hover:text-zinc-900 dark:hover:text-zinc-100">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="Add item…"
          className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-medium text-zinc-800 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
        />
        <button type="button" onClick={add} className="flex items-center justify-center gap-1 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-bold text-white dark:bg-zinc-100 dark:text-black sm:py-1.5">
          <Plus className="h-3 w-3" />Add
        </button>
      </div>
    </div>
  );
}

function NumberInput({ value, onChange, min, max, suffix }: { value: number; onChange: (v: number) => void; min?: number; max?: number; suffix?: string }) {
  return (
    <div className="flex w-full items-center gap-1.5 sm:w-auto">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-bold text-zinc-800 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 sm:w-24 sm:py-1.5"
      />
      {suffix && <span className="text-xs text-zinc-500">{suffix}</span>}
    </div>
  );
}

function SelectInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-bold text-zinc-800 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 sm:min-w-[12rem] sm:py-1.5"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function SegmentedInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; hint?: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-2xl border px-3 py-2 text-left transition-all ${
              active
                ? 'app-accent-button border-transparent shadow-sm'
                : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700'
            }`}
          >
            <div className="text-xs font-black uppercase tracking-[0.16em]">{option.label}</div>
            {option.hint && <div className={`mt-1 text-[11px] font-medium ${active ? 'opacity-80' : 'text-zinc-500 dark:text-zinc-400'}`}>{option.hint}</div>}
          </button>
        );
      })}
    </div>
  );
}

// ─── Section views ────────────────────────────────────────────────────────────

function SystemSection({ config, onChange }: { config: AppConfiguration['system']; onChange: (k: keyof AppConfiguration['system'], v: unknown) => void }) {
  const activePreset = findThemePreset(config);

  return (
    <>
      <SectionHeader title="System Settings" description="Core application settings, branding, and operational controls." />
      <SettingRow label="App Name" description="Display name shown across the platform.">
        <input value={config.appName} onChange={(e) => onChange('appName', e.target.value)} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-bold text-zinc-800 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200" />
      </SettingRow>
      <SettingRow label="Session Timeout" description="Minutes of inactivity before logout.">
        <NumberInput value={config.sessionTimeout} onChange={(v) => onChange('sessionTimeout', v)} min={5} max={480} suffix="min" />
      </SettingRow>
      <SettingRow label="Auto Save" description="Automatically save changes as you work.">
        <Toggle checked={config.autoSave} onChange={(v) => onChange('autoSave', v)} />
      </SettingRow>
      <SettingRow label="Cache Duration" description="How long to cache workspace data locally.">
        <NumberInput value={config.cacheDuration} onChange={(v) => onChange('cacheDuration', v)} min={0} suffix="sec" />
      </SettingRow>
      <SettingRow label="File Upload Limit" description="Maximum file size for uploads.">
        <NumberInput value={config.fileUploadLimit} onChange={(v) => onChange('fileUploadLimit', v)} min={1} max={500} suffix="MB" />
      </SettingRow>
      <SettingRow label="API Rate Limit" description="Maximum API requests per minute.">
        <NumberInput value={config.apiRateLimit} onChange={(v) => onChange('apiRateLimit', v)} min={10} suffix="req/min" />
      </SettingRow>
      <SettingRow label="Theme Presets" description="Curated global palette pairs. Monochrome is the new default.">
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {THEME_COLOR_PRESETS.map((preset) => {
              const active = matchesThemePreset(config.primaryColor, config.secondaryColor, preset);

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    onChange('primaryColor', preset.primaryColor);
                    onChange('secondaryColor', preset.secondaryColor);
                  }}
                  className={`rounded-2xl border p-3 text-left transition-all ${
                    active
                      ? 'border-transparent app-accent-button'
                      : 'border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full border border-black/10 dark:border-white/10" style={{ backgroundColor: preset.primaryColor }} />
                    <span className="h-5 w-5 rounded-full border border-black/10 dark:border-white/10" style={{ backgroundColor: preset.secondaryColor }} />
                  </div>
                  <div className="mt-3 text-xs font-black uppercase tracking-[0.16em]">{preset.label}</div>
                  <div className={`mt-1 text-[11px] font-medium ${active ? 'text-[rgba(var(--app-primary-contrast-rgb),0.78)]' : 'text-zinc-500 dark:text-zinc-400'}`}>
                    {preset.description}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Active palette</div>
            <div className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {activePreset ? activePreset.label : 'Custom colors'}
            </div>
            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {activePreset
                ? activePreset.description
                : `Primary ${config.primaryColor} with secondary ${config.secondaryColor}.`}
            </div>
          </div>
        </div>
      </SettingRow>
      <SettingRow label="Primary Color" description="Custom primary token used in app accents and active states.">
        <div className="flex items-center gap-2">
          <input type="color" value={config.primaryColor} onChange={(e) => onChange('primaryColor', e.target.value)} className="h-8 w-12 cursor-pointer rounded border border-zinc-200" />
          <span className="font-mono text-xs text-zinc-500">{config.primaryColor}</span>
        </div>
      </SettingRow>
      <SettingRow label="Secondary Color" description="Companion tone used in gradients, tint cards, and shell atmosphere.">
        <div className="flex items-center gap-2">
          <input type="color" value={config.secondaryColor} onChange={(e) => onChange('secondaryColor', e.target.value)} className="h-8 w-12 cursor-pointer rounded border border-zinc-200" />
          <span className="font-mono text-xs text-zinc-500">{config.secondaryColor}</span>
        </div>
      </SettingRow>
      <SettingRow label="Maintenance Mode" description="Display a maintenance banner to all users.">
        <Toggle checked={config.maintenanceMode} onChange={(v) => onChange('maintenanceMode', v)} />
      </SettingRow>
      {config.maintenanceMode && (
        <SettingRow label="Maintenance Message" description="Message shown during maintenance.">
          <textarea
            value={config.maintenanceMessage}
            onChange={(e) => onChange('maintenanceMessage', e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 sm:w-72"
          />
        </SettingRow>
      )}
    </>
  );
}

function CampaignSection({ config, onChange }: { config: AppConfiguration['campaign']; onChange: (k: keyof AppConfiguration['campaign'], v: unknown) => void }) {
  return (
    <>
      <SectionHeader title="Campaign Settings" description="Configure phases, SLA timelines, display behaviour, and required intake fields." />
      <SettingRow label="Campaign Phases" description="Ordered lifecycle phases for all campaigns.">
        <TagList tags={config.phases} onChange={(v) => onChange('phases', v)} />
      </SettingRow>
      <SettingRow label="SLA Timelines (days)" description="Max days per phase before escalation.">
        <div className="space-y-2">
          {config.phases.map((phase) => (
            <div key={phase} className="flex items-center gap-3">
              <span className="w-24 text-xs font-bold text-zinc-600 dark:text-zinc-400">{phase}</span>
              <NumberInput value={config.slaTimelines[phase] ?? 7} onChange={(v) => onChange('slaTimelines', { ...config.slaTimelines, [phase]: v })} min={1} suffix="days" />
            </div>
          ))}
        </div>
      </SettingRow>
      <SettingRow label="Required Fields" description="Fields that must be filled on campaign creation.">
        <TagList tags={config.requiredFields} onChange={(v) => onChange('requiredFields', v)} />
      </SettingRow>
      <SettingRow label="Auto-Archive After" description="Days since last update before auto-archiving.">
        <NumberInput value={config.autoArchiveDays} onChange={(v) => onChange('autoArchiveDays', v)} min={1} suffix="days" />
      </SettingRow>
      <SettingRow label="Default View" description="How campaigns are displayed by default on the Campaigns page.">
        <SegmentedInput
          value={config.defaultView ?? 'cards'}
          onChange={(v) => onChange('defaultView', v)}
          options={[
            { value: 'cards', label: 'Cards', hint: 'Expandable rows' },
            { value: 'list', label: 'List', hint: 'Compact table' },
          ]}
        />
      </SettingRow>
      <SettingRow label="Color-coded Progress Bars" description="Show green/amber/red progress bars based on completion rate.">
        <Toggle checked={config.progressBarColors ?? true} onChange={(v) => onChange('progressBarColors', v)} />
      </SettingRow>
      <SettingRow label="Show Criteria & Methodology" description="Display the criteria and methodology fields on each campaign card.">
        <Toggle checked={config.showCriteriaMethodology ?? true} onChange={(v) => onChange('showCriteriaMethodology', v)} />
      </SettingRow>
      <SettingRow label="Auto-Expand New Campaigns" description="Automatically expand a campaign card when it is first created.">
        <Toggle checked={config.autoExpandNew ?? false} onChange={(v) => onChange('autoExpandNew', v)} />
      </SettingRow>
    </>
  );
}

function UpdateOrganizerSection({ config, onChange }: { config: UpdateOrganizerConfig; onChange: (k: keyof UpdateOrganizerConfig, v: unknown) => void }) {
  return (
    <>
      <SectionHeader title="Update & Handover Settings" description="Set defaults for templates, output style, shift windows, teams, and history display." />
      <SettingRow label="Default Template" description="The output template pre-selected when the Update Organizer loads.">
        <SegmentedInput
          value={config.defaultTemplate}
          onChange={(v) => onChange('defaultTemplate', v)}
          options={[
            { value: 'leadership', label: 'Leadership', hint: 'Management brief' },
            { value: 'daily', label: 'Daily Ops', hint: 'Team handoff' },
            { value: 'client', label: 'Client', hint: 'External-facing' },
          ]}
        />
      </SettingRow>
      <SettingRow label="Default Detail Level" description="How many bullet points are shown per section by default.">
        <SegmentedInput
          value={config.defaultDetailLevel}
          onChange={(v) => onChange('defaultDetailLevel', v)}
          options={[
            { value: 'concise', label: 'Concise', hint: 'Up to 2 items' },
            { value: 'standard', label: 'Standard', hint: 'Up to 4 items' },
            { value: 'detailed', label: 'Detailed', hint: 'Up to 8 items' },
          ]}
        />
      </SettingRow>
      <SettingRow label="Default Output Style" description="Whether outputs are plain text or rich emoji format (for Slack/Teams/WhatsApp).">
        <SegmentedInput
          value={config.defaultOutputStyle}
          onChange={(v) => onChange('defaultOutputStyle', v)}
          options={[
            { value: 'plain', label: 'Plain Text', hint: 'Minimal formatting' },
            { value: 'rich', label: 'Rich Emoji', hint: 'Slack / Teams / WhatsApp' },
          ]}
        />
      </SettingRow>
      <SettingRow label="Shift Windows" description="The shift windows available in the Handover composer.">
        <TagList tags={config.shiftWindows} onChange={(v) => onChange('shiftWindows', v)} />
      </SettingRow>
      <SettingRow label="Handover Teams" description="Team names available in the Handover composer.">
        <TagList tags={config.handoverTeams} onChange={(v) => onChange('handoverTeams', v)} />
      </SettingRow>
      <SettingRow label="Max History Items" description="Maximum number of saved updates and handovers shown in the history panels.">
        <NumberInput value={config.maxHistoryItems} onChange={(v) => onChange('maxHistoryItems', v)} min={10} max={500} suffix="items" />
      </SettingRow>
    </>
  );
}

function TeamSection({ config, onChange }: { config: AppConfiguration['team']; onChange: (k: keyof AppConfiguration['team'], v: unknown) => void }) {
  return (
    <>
      <SectionHeader title="Team Settings" description="Define teams, auto-assignment behaviour, and escalation rules." />
      <SettingRow label="Teams" description="Team labels used across the platform.">
        <TagList tags={config.teams} onChange={(v) => onChange('teams', v)} />
      </SettingRow>
      <SettingRow label="Auto Assignment" description="Automatically assign tasks to team members.">
        <Toggle checked={config.autoAssignment} onChange={(v) => onChange('autoAssignment', v)} />
      </SettingRow>
      <SettingRow label="Capacity Threshold" description="% utilisation that triggers a capacity warning.">
        <NumberInput value={config.capacityThreshold} onChange={(v) => onChange('capacityThreshold', v)} min={10} max={100} suffix="%" />
      </SettingRow>
      <SettingRow label="Workload Threshold" description="% utilisation that blocks new assignments.">
        <NumberInput value={config.workloadThreshold} onChange={(v) => onChange('workloadThreshold', v)} min={10} max={100} suffix="%" />
      </SettingRow>
      <SettingRow label="Escalation Rules" description="Escalate a team's tasks to another team after N hours.">
        <div className="space-y-2">
          {config.escalationRules.map((rule, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center">
              <SelectInput
                value={rule.team}
                onChange={(v) => { const r = [...config.escalationRules]; r[i] = { ...r[i], team: v }; onChange('escalationRules', r); }}
                options={config.teams.map((t) => ({ value: t, label: t }))}
              />
              <span className="hidden text-xs text-zinc-500 sm:inline">→</span>
              <SelectInput
                value={rule.escalateTo}
                onChange={(v) => { const r = [...config.escalationRules]; r[i] = { ...r[i], escalateTo: v }; onChange('escalationRules', r); }}
                options={config.teams.map((t) => ({ value: t, label: t }))}
              />
              <NumberInput
                value={rule.afterHours}
                onChange={(v) => { const r = [...config.escalationRules]; r[i] = { ...r[i], afterHours: v }; onChange('escalationRules', r); }}
                min={1}
                suffix="hrs"
              />
              <button type="button" onClick={() => onChange('escalationRules', config.escalationRules.filter((_, j) => j !== i))} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-zinc-100">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => onChange('escalationRules', [...config.escalationRules, { team: config.teams[0] || '', escalateTo: config.teams[1] || '', afterHours: 24 }])} className="flex items-center gap-1.5 rounded-xl border border-dashed border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400">
            <Plus className="h-3.5 w-3.5" />Add rule
          </button>
        </div>
      </SettingRow>
    </>
  );
}

function NotificationSection({ config, onChange }: { config: AppConfiguration['notification']; onChange: (k: keyof AppConfiguration['notification'], v: unknown) => void }) {
  return (
    <>
      <SectionHeader title="Notification Settings" description="Configure channels, triggers, and delivery preferences." />
      <SettingRow label="Email Notifications"><Toggle checked={config.channels.email} onChange={(v) => onChange('channels', { ...config.channels, email: v })} /></SettingRow>
      <SettingRow label="In-App Notifications"><Toggle checked={config.channels.inApp} onChange={(v) => onChange('channels', { ...config.channels, inApp: v })} /></SettingRow>
      <SettingRow label="Slack Notifications"><Toggle checked={config.channels.slack} onChange={(v) => onChange('channels', { ...config.channels, slack: v })} /></SettingRow>
      <SettingRow label="Frequency" description="How often notifications are delivered.">
        <SelectInput value={config.frequency} onChange={(v) => onChange('frequency', v)} options={[{ value: 'immediate', label: 'Immediate' }, { value: 'hourly', label: 'Hourly digest' }, { value: 'daily', label: 'Daily digest' }, { value: 'digest', label: 'Manual digest' }]} />
      </SettingRow>
      <SettingRow label="Batch Notifications" description="Group multiple notifications together.">
        <Toggle checked={config.batchNotifications} onChange={(v) => onChange('batchNotifications', v)} />
      </SettingRow>
      <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-500">Triggers</div>
        {(Object.entries(config.triggers) as [keyof typeof config.triggers, boolean][]).map(([key, val]) => (
          <SettingRow key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}>
            <Toggle checked={val} onChange={(v) => onChange('triggers', { ...config.triggers, [key]: v })} />
          </SettingRow>
        ))}
      </div>
      <SettingRow label="Quiet Hours" description="Suppress notifications during specific hours.">
        <Toggle checked={config.quietHours.enabled} onChange={(v) => onChange('quietHours', { ...config.quietHours, enabled: v })} />
      </SettingRow>
      {config.quietHours.enabled && (
        <SettingRow label="Quiet Period" description="Start and end times for the quiet window.">
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <input type="time" value={config.quietHours.start} onChange={(e) => onChange('quietHours', { ...config.quietHours, start: e.target.value })} className="rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-sm font-bold text-zinc-800 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200" />
            <span className="text-xs text-zinc-500">to</span>
            <input type="time" value={config.quietHours.end} onChange={(e) => onChange('quietHours', { ...config.quietHours, end: e.target.value })} className="rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-sm font-bold text-zinc-800 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200" />
          </div>
        </SettingRow>
      )}
    </>
  );
}

function WorkspaceSection({ config, onChange }: { config: AppConfiguration['workspace']; onChange: (k: keyof AppConfiguration['workspace'], v: unknown) => void }) {
  const roles = Object.keys(config.permissions);
  const permKeys = Object.keys(config.permissions[roles[0]] || {});
  return (
    <>
      <SectionHeader title="Workspace Settings" description="Regional preferences, desktop density, layout sizing, and role-based access permissions." />
      <SettingRow label="Timezone">
        <SelectInput value={config.timezone} onChange={(v) => onChange('timezone', v)} options={['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Dubai', 'Asia/Singapore', 'Australia/Sydney'].map((tz) => ({ value: tz, label: tz }))} />
      </SettingRow>
      <SettingRow label="Language">
        <SelectInput value={config.language} onChange={(v) => onChange('language', v)} options={[{ value: 'en', label: 'English' }, { value: 'ar', label: 'Arabic' }, { value: 'fr', label: 'French' }, { value: 'es', label: 'Spanish' }]} />
      </SettingRow>
      <SettingRow label="Date Format">
        <SelectInput value={config.dateFormat} onChange={(v) => onChange('dateFormat', v)} options={[{ value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' }, { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' }, { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }]} />
      </SettingRow>
      <SettingRow label="Currency">
        <SelectInput value={config.currency} onChange={(v) => onChange('currency', v)} options={['USD', 'EUR', 'GBP', 'AED', 'SAR'].map((c) => ({ value: c, label: c }))} />
      </SettingRow>
      <SettingRow label="Desktop Density" description="Tighten or relax shared spacing across the desktop shell.">
        <SegmentedInput
          value={config.desktopDensity}
          onChange={(v) => onChange('desktopDensity', v)}
          options={[
            { value: 'comfortable', label: 'Comfortable', hint: 'More spacing' },
            { value: 'compact', label: 'Compact', hint: 'Balanced default' },
            { value: 'dense', label: 'Dense', hint: 'Maximum density' },
          ]}
        />
      </SettingRow>
      <SettingRow label="Content Width" description="Set the maximum desktop width for headers and admin pages.">
        <SegmentedInput
          value={config.contentWidth}
          onChange={(v) => onChange('contentWidth', v)}
          options={[
            { value: 'standard', label: 'Standard', hint: 'Focused' },
            { value: 'wide', label: 'Wide', hint: 'More breathing room' },
            { value: 'full', label: 'Full', hint: 'Largest canvas' },
          ]}
        />
      </SettingRow>
      <SettingRow label="Panel Radius" description="Change how sharp or soft cards and admin surfaces feel.">
        <SegmentedInput
          value={config.panelRadius}
          onChange={(v) => onChange('panelRadius', v)}
          options={[
            { value: 'soft', label: 'Soft', hint: 'Large curves' },
            { value: 'rounded', label: 'Rounded', hint: 'Moderate curves' },
            { value: 'sharp', label: 'Sharp', hint: 'Tighter edges' },
          ]}
        />
      </SettingRow>
      <SettingRow label="Surface Style" description="Choose how much contrast and elevation desktop panels should use.">
        <SegmentedInput
          value={config.surfaceStyle}
          onChange={(v) => onChange('surfaceStyle', v)}
          options={[
            { value: 'flat', label: 'Flat', hint: 'Minimal shadows' },
            { value: 'tinted', label: 'Tinted', hint: 'Subtle color wash' },
            { value: 'elevated', label: 'Elevated', hint: 'More depth' },
          ]}
        />
      </SettingRow>
      <div className="app-tint-card app-surface-card mb-5 rounded-[var(--app-card-radius)] border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">Desktop Preview</div>
            <div className="mt-1 text-sm font-bold text-zinc-800 dark:text-zinc-100">
              {config.desktopDensity} density, {config.contentWidth} canvas, {config.panelRadius} radius
            </div>
            <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
              Surface style: {config.surfaceStyle}. Changes apply globally after save.
            </div>
          </div>
          <div className="grid w-full grid-cols-3 gap-2 sm:max-w-[280px]">
            {[0, 1, 2].map((index) => (
              <div key={index} className="rounded-[calc(var(--app-card-radius-sm)-2px)] border border-zinc-200 bg-white/80 p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70">
                <div className="mb-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                <div className="space-y-1.5">
                  <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                  <div className="h-2 w-4/5 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {permKeys.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <div className="mb-2 text-xs font-black uppercase tracking-widest text-zinc-500">Role Permissions Matrix</div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="py-2 pr-4 text-left text-xs font-bold text-zinc-500">Permission</th>
                {roles.map((r) => <th key={r} className="px-4 py-2 text-center text-xs font-bold capitalize text-zinc-700 dark:text-zinc-300">{r}</th>)}
              </tr>
            </thead>
            <tbody>
              {permKeys.map((perm) => (
                <tr key={perm} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="py-2 pr-4 text-xs font-medium text-zinc-600 dark:text-zinc-400">{perm.replace(/([A-Z])/g, ' $1')}</td>
                  {roles.map((role) => (
                    <td key={role} className="px-4 py-2 text-center">
                      <input type="checkbox" checked={!!config.permissions[role]?.[perm]} onChange={(e) => onChange('permissions', { ...config.permissions, [role]: { ...config.permissions[role], [perm]: e.target.checked } })} className="h-4 w-4 accent-zinc-900 dark:accent-zinc-100" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function TaskSection({ config, onChange, disabledTeams, onToggleTeam }: { config: AppConfiguration['task']; onChange: (k: keyof AppConfiguration['task'], v: unknown) => void; disabledTeams: string[]; onToggleTeam: (teamId: string) => void }) {
  return (
    <>
      <SectionHeader title="Task Settings" description="Statuses, priorities, SLAs, and custom fields." />
      <SettingRow label="Teams & Task Visibility" description="Enable or disable which teams and their default tasks appear across the platform.">
        <div className="space-y-2">
          {OPERATIONS_TEAMS.map((team) => {
            const isEnabled = !disabledTeams.includes(team.id);
            return (
              <div key={team.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <button
                  type="button"
                  onClick={() => onToggleTeam(team.id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${isEnabled ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'}`}>
                      {team.shortLabel}
                    </div>
                    <div>
                      <div className={`text-sm font-black ${isEnabled ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-600 line-through'}`}>{team.name}</div>
                      <div className="text-[11px] text-zinc-400">{team.description}</div>
                    </div>
                  </div>
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${isEnabled ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white dark:bg-zinc-900 shadow transition-all ${isEnabled ? 'left-5' : 'left-0.5'}`} />
                  </div>
                </button>
                {isEnabled && team.defaultTasks.length > 0 && (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border-t border-zinc-200 dark:border-zinc-800">
                    {team.defaultTasks.map((task, idx) => (
                      <div key={idx} className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-zinc-950">
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 ml-2" />
                        <span className="text-xs text-zinc-600 dark:text-zinc-400 flex-1">{task.title}</span>
                        {task.priority && (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">{task.priority}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SettingRow>
      <SettingRow label="Statuses"><TagList tags={config.statuses} onChange={(v) => onChange('statuses', v)} /></SettingRow>
      <SettingRow label="Priorities"><TagList tags={config.priorities} onChange={(v) => onChange('priorities', v)} /></SettingRow>
      <SettingRow label="SLA Timelines (hours)" description="Hours per priority before SLA breach.">
        <div className="space-y-2">
          {config.priorities.map((p) => (
            <div key={p} className="flex items-center gap-3">
              <span className="w-20 text-xs font-bold text-zinc-600 dark:text-zinc-400">{p}</span>
              <NumberInput value={config.slaTimelines[p] ?? 24} onChange={(v) => onChange('slaTimelines', { ...config.slaTimelines, [p]: v })} min={1} suffix="hrs" />
            </div>
          ))}
        </div>
      </SettingRow>
      <SettingRow label="Escalation Timelines (hours)" description="Hours per priority before escalation.">
        <div className="space-y-2">
          {config.priorities.map((p) => (
            <div key={p} className="flex items-center gap-3">
              <span className="w-20 text-xs font-bold text-zinc-600 dark:text-zinc-400">{p}</span>
              <NumberInput value={config.escalationTimelines[p] ?? 48} onChange={(v) => onChange('escalationTimelines', { ...config.escalationTimelines, [p]: v })} min={1} suffix="hrs" />
            </div>
          ))}
        </div>
      </SettingRow>
      <SettingRow label="Assignment Strategy" description="How tasks are auto-assigned.">
        <SelectInput value={config.autoAssignmentStrategy} onChange={(v) => onChange('autoAssignmentStrategy', v)} options={[{ value: 'manual', label: 'Manual' }, { value: 'round-robin', label: 'Round Robin' }, { value: 'least-loaded', label: 'Least Loaded' }]} />
      </SettingRow>
      <SettingRow label="Reminder Schedule (hours before)" description="When reminders fire before due date.">
        <TagList tags={config.reminderSchedule.map(String)} onChange={(v) => onChange('reminderSchedule', v.map(Number))} />
      </SettingRow>
    </>
  );
}

function AnalyticsSection({ config, onChange }: { config: AppConfiguration['analytics']; onChange: (k: keyof AppConfiguration['analytics'], v: unknown) => void }) {
  return (
    <>
      <SectionHeader title="Analytics Settings" description="Dashboard layout, KPI thresholds, and data retention." />
      <SettingRow label="Dashboard Layout">
        <SelectInput value={config.dashboardLayout} onChange={(v) => onChange('dashboardLayout', v)} options={[{ value: 'grid', label: 'Grid' }, { value: 'list', label: 'List' }, { value: 'compact', label: 'Compact' }]} />
      </SettingRow>
      <SettingRow label="Default Date Range">
        <SelectInput value={config.defaultDateRange} onChange={(v) => onChange('defaultDateRange', v)} options={[{ value: '7d', label: 'Last 7 days' }, { value: '30d', label: 'Last 30 days' }, { value: '90d', label: 'Last 90 days' }, { value: 'custom', label: 'Custom' }]} />
      </SettingRow>
      <SettingRow label="KPI Thresholds" description="Warning and critical levels per KPI.">
        <div className="space-y-3">
          {Object.entries(config.kpiThresholds).map(([kpi, { warning, critical }]) => (
            <div key={kpi} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-2 text-xs font-black capitalize text-zinc-700 dark:text-zinc-300">{kpi.replace(/([A-Z])/g, ' $1')}</div>
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                <div>
                  <div className="mb-1 text-[10px] font-bold text-amber-600">Warning</div>
                  <NumberInput value={warning} onChange={(v) => onChange('kpiThresholds', { ...config.kpiThresholds, [kpi]: { warning: v, critical } })} min={0} max={100} suffix="%" />
                </div>
                <div>
                  <div className="mb-1 text-[10px] font-bold text-red-600">Critical</div>
                  <NumberInput value={critical} onChange={(v) => onChange('kpiThresholds', { ...config.kpiThresholds, [kpi]: { warning, critical: v } })} min={0} max={100} suffix="%" />
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => { const key = `kpi_${Date.now()}`; onChange('kpiThresholds', { ...config.kpiThresholds, [key]: { warning: 70, critical: 50 } }); }} className="flex items-center gap-1.5 rounded-xl border border-dashed border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400">
            <Plus className="h-3.5 w-3.5" />Add KPI
          </button>
        </div>
      </SettingRow>
      <SettingRow label="Data Retention (days)" description="How long to retain each data type.">
        <div className="space-y-2">
          {Object.entries(config.dataRetention).map(([key, days]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-24 text-xs font-bold capitalize text-zinc-600 dark:text-zinc-400">{key}</span>
              <NumberInput value={days} onChange={(v) => onChange('dataRetention', { ...config.dataRetention, [key]: v })} min={1} suffix="days" />
            </div>
          ))}
        </div>
      </SettingRow>
    </>
  );
}

function DataSection({ config, onChange }: { config: AppConfiguration['data']; onChange: (k: keyof AppConfiguration['data'], v: unknown) => void }) {
  const ALL_FORMATS = ['xlsx', 'csv', 'json', 'pdf', 'docx', 'png', 'zip'];
  return (
    <>
      <SectionHeader title="Data Settings" description="File size limits, supported formats, and export templates." />
      <SettingRow label="Max File Size" description="Upper limit for individual file uploads.">
        <NumberInput value={config.maxFileSize} onChange={(v) => onChange('maxFileSize', v)} min={1} max={1000} suffix="MB" />
      </SettingRow>
      <SettingRow label="Supported Formats" description="File types allowed for upload and import.">
        <div className="flex flex-wrap gap-2">
          {ALL_FORMATS.map((fmt) => (
            <label key={fmt} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold dark:border-zinc-800">
              <input type="checkbox" checked={config.supportedFormats.includes(fmt)} onChange={(e) => onChange('supportedFormats', e.target.checked ? [...config.supportedFormats, fmt] : config.supportedFormats.filter((f) => f !== fmt))} className="accent-zinc-900 dark:accent-zinc-100" />
              .{fmt}
            </label>
          ))}
        </div>
      </SettingRow>
      <SettingRow label="Export Templates" description="Named export configurations for quick access.">
        <TagList tags={config.exportTemplates} onChange={(v) => onChange('exportTemplates', v)} />
      </SettingRow>
    </>
  );
}

function FeatureSection({ config, onChange }: { config: AppConfiguration['feature']; onChange: (k: keyof AppConfiguration['feature'], v: boolean) => void }) {
  const descriptions: Record<keyof AppConfiguration['feature'], string> = {
    advancedAnalytics: 'Unlock detailed analytics charts and custom reports.',
    aiAssistant: 'AI-powered task suggestions and workspace insights.',
    bulkOperations: 'Mass edit, delete, and assign tasks in one action.',
    customReports: 'Build and schedule custom report templates.',
    apiIntegrations: 'Connect to external services via REST API.',
    multiWorkspace: 'Switch between multiple workspace environments.',
    slaEnforcement: 'Automatically flag and escalate SLA breaches.',
    automationRules: 'Trigger automated actions based on workspace events.',
  };
  return (
    <>
      <SectionHeader title="Feature Flags" description="Enable or disable platform features without redeployment." />
      {(Object.entries(config) as [keyof AppConfiguration['feature'], boolean][]).map(([flag, enabled]) => (
        <SettingRow key={flag} label={flag.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())} description={descriptions[flag]}>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${enabled ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black' : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
              {enabled ? 'ON' : 'OFF'}
            </span>
            <Toggle checked={enabled} onChange={(v) => onChange(flag, v)} />
          </div>
        </SettingRow>
      ))}
    </>
  );
}

// ─── Campaign Overview Data Section ──────────────────────────────────────────

const COUNTRIES = [
  'Saudi Arabia', 'United Arab Emirates', 'Kuwait', 'Oman', 'Qatar',
  'Bahrain', 'Egypt', 'Jordan', 'Lebanon', 'Iraq', 'Other',
];
const TYPES = ['Visit', 'Delivery', 'Story', 'Reel'];

const EMPTY_FORM: Omit<CampaignRow, 'id'> = {
  name: '', country: 'Saudi Arabia', type: 'Visit',
  list: 0, confirmations: 0, target: 0, visited: 0, coverage: 0,
  startDate: '', endDate: '',
};

function CampaignFormFields({
  draft,
  onChange,
  compact,
}: {
  draft: Omit<CampaignRow, 'id'>;
  onChange: (k: keyof Omit<CampaignRow, 'id'>, v: string | number) => void;
  compact?: boolean;
}) {
  const inputCls = `w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200${compact ? ' py-1.5 text-xs' : ''}`;
  const selectCls = `${inputCls} cursor-pointer`;
  const numInput = (k: keyof typeof draft, label: string) => (
    <div>
      <label className={`block mb-1 text-xs font-bold text-zinc-500 uppercase tracking-wider${compact ? ' text-[10px]' : ''}`}>{label}</label>
      <input type="number" min={0} value={draft[k] as number} onChange={e => onChange(k, Number(e.target.value))} className={inputCls} />
    </div>
  );

  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-6' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
      <div className={compact ? 'col-span-2 sm:col-span-4 lg:col-span-2' : 'sm:col-span-2 lg:col-span-3'}>
        <label className={`block mb-1 text-xs font-bold text-zinc-500 uppercase tracking-wider${compact ? ' text-[10px]' : ''}`}>Campaign Name</label>
        <input value={draft.name} onChange={e => onChange('name', e.target.value)} placeholder="Brand - Type - Platform - Country - Month Year" className={inputCls} />
      </div>
      <div>
        <label className={`block mb-1 text-xs font-bold text-zinc-500 uppercase tracking-wider${compact ? ' text-[10px]' : ''}`}>Country</label>
        <select value={draft.country} onChange={e => onChange('country', e.target.value)} className={selectCls}>
          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className={`block mb-1 text-xs font-bold text-zinc-500 uppercase tracking-wider${compact ? ' text-[10px]' : ''}`}>Type</label>
        <select value={draft.type} onChange={e => onChange('type', e.target.value)} className={selectCls}>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      {numInput('list', 'List')}
      {numInput('confirmations', 'Conf')}
      {numInput('target', 'Target')}
      {numInput('visited', 'Visited')}
      {numInput('coverage', 'Coverage')}
      <div>
        <label className={`block mb-1 text-xs font-bold text-zinc-500 uppercase tracking-wider${compact ? ' text-[10px]' : ''}`}>Start Date</label>
        <input type="date" value={draft.startDate} onChange={e => onChange('startDate', e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className={`block mb-1 text-xs font-bold text-zinc-500 uppercase tracking-wider${compact ? ' text-[10px]' : ''}`}>End Date</label>
        <input type="date" value={draft.endDate} onChange={e => onChange('endDate', e.target.value)} className={inputCls} />
      </div>
    </div>
  );
}

function parseCampaignFile(file: File): Promise<Omit<CampaignRow, 'id'>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary' });
        const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(
          wb.Sheets[wb.SheetNames[0]], { defval: '' }
        );
        resolve(
          raw.map(r => ({
            name: String(r['Campaign'] ?? r['name'] ?? r['campaign'] ?? r['Title'] ?? ''),
            country: String(r['Country'] ?? r['country'] ?? ''),
            type: String(r['Type'] ?? r['type'] ?? 'Visit'),
            list: Number(r['List'] ?? r['list'] ?? 0),
            confirmations: Number(r['Confirmations'] ?? r['confirmations'] ?? r['Conf'] ?? r['conf'] ?? 0),
            target: Number(r['Target'] ?? r['target'] ?? 0),
            visited: Number(r['Visited'] ?? r['visited'] ?? r['Visits'] ?? r['visits'] ?? 0),
            coverage: Number(r['Coverage'] ?? r['coverage'] ?? r['Cov'] ?? r['cov'] ?? 0),
            startDate: String(r['Start'] ?? r['startDate'] ?? r['Start Date'] ?? ''),
            endDate: String(r['End'] ?? r['endDate'] ?? r['End Date'] ?? ''),
          })).filter(r => r.name.trim() !== '')
        );
      } catch { reject(new Error('Could not parse file — check column names match the template.')); }
    };
    reader.readAsBinaryString(file);
  });
}

function downloadBulkTemplate() {
  const data = [
    { Campaign: 'Example Brand - Visit - KSA - Jan 2026', Country: 'Saudi Arabia', Type: 'Visit', List: 100, Confirmations: 45, Target: 50, Visited: 40, Coverage: 38, Start: '2026-01-01', End: '2026-01-31' },
    { Campaign: 'Example Brand - Delivery - UAE - Feb 2026', Country: 'United Arab Emirates', Type: 'Delivery', List: 200, Confirmations: 80, Target: 100, Visited: 75, Coverage: 70, Start: '2026-02-01', End: '2026-02-28' },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Template');
  XLSX.writeFile(wb, 'campaign-overview-template.xlsx');
}

function CampaignOverviewDataSection() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>(() => loadCampaigns());
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addDraft, setAddDraft] = useState<Omit<CampaignRow, 'id'>>({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Omit<CampaignRow, 'id'>>({ ...EMPTY_FORM });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [toast, setToast] = useState('');

  // Bulk upload state
  const [bulkMode, setBulkMode] = useState<'idle' | 'picking' | 'preview'>('idle');
  const [bulkParsed, setBulkParsed] = useState<Omit<CampaignRow, 'id'>[]>([]);
  const [bulkDragOver, setBulkDragOver] = useState(false);
  const [bulkParsing, setBulkParsing] = useState(false);
  const bulkFileRef = useRef<HTMLInputElement>(null);

  const showMsg = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const persist = (rows: CampaignRow[]) => { saveCampaigns(rows); setCampaigns(rows); };

  const handleAdd = () => {
    if (!addDraft.name.trim()) { showMsg('Campaign name is required.'); return; }
    const newRow: CampaignRow = { ...addDraft, id: `c-${Date.now()}` };
    persist([...campaigns, newRow]);
    setAddDraft({ ...EMPTY_FORM });
    setShowAdd(false);
    showMsg(`"${newRow.name}" added.`);
  };

  const startEdit = (c: CampaignRow) => {
    setEditingId(c.id);
    const { id: _id, ...rest } = c;
    setEditDraft({ ...rest });
  };

  const handleUpdate = () => {
    if (!editDraft.name.trim()) { showMsg('Campaign name is required.'); return; }
    persist(campaigns.map(c => c.id === editingId ? { ...editDraft, id: c.id } : c));
    setEditingId(null);
    showMsg('Campaign updated.');
  };

  const handleDelete = (id: string) => {
    if (deleteConfirmId !== id) { setDeleteConfirmId(id); return; }
    const name = campaigns.find(c => c.id === id)?.name ?? '';
    persist(campaigns.filter(c => c.id !== id));
    setDeleteConfirmId(null);
    showMsg(`"${name}" deleted.`);
  };

  const handleReset = () => {
    if (!resetConfirm) { setResetConfirm(true); return; }
    persist([]);
    setResetConfirm(false);
    showMsg('All campaign data cleared.');
  };

  // Bulk upload handlers
  const processBulkFile = async (file: File) => {
    setBulkParsing(true);
    try {
      const rows = await parseCampaignFile(file);
      setBulkParsed(rows);
      setBulkMode('preview');
    } catch (err) {
      showMsg(err instanceof Error ? err.message : 'Failed to parse file.');
      setBulkMode('picking');
    } finally {
      setBulkParsing(false);
      if (bulkFileRef.current) bulkFileRef.current.value = '';
    }
  };

  const handleBulkDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setBulkDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processBulkFile(file);
  };

  const handleBulkImport = () => {
    const existingNames = new Set(campaigns.map(c => c.name.trim().toLowerCase()));
    const newRows = bulkParsed
      .filter(r => !existingNames.has(r.name.trim().toLowerCase()))
      .map((r, i) => ({ ...r, id: `bulk-${Date.now()}-${i}` }));
    const skipped = bulkParsed.length - newRows.length;
    persist([...campaigns, ...newRows]);
    setBulkMode('idle');
    setBulkParsed([]);
    showMsg(`Imported ${newRows.length} campaign${newRows.length !== 1 ? 's' : ''}${skipped > 0 ? ` · ${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped` : ''}.`);
  };

  const cancelBulk = () => { setBulkMode('idle'); setBulkParsed([]); setBulkDragOver(false); };

  const visible = search
    ? campaigns.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.country.toLowerCase().includes(search.toLowerCase()) ||
        c.type.toLowerCase().includes(search.toLowerCase())
      )
    : campaigns;

  const existingNames = new Set(campaigns.map(c => c.name.trim().toLowerCase()));
  const bulkNew = bulkParsed.filter(r => !existingNames.has(r.name.trim().toLowerCase())).length;
  const bulkDupes = bulkParsed.length - bulkNew;

  return (
    <>
      <SectionHeader
        title="Campaign Overview Data"
        description="Manage every row displayed on the Campaign Overview page. Changes are saved instantly and reflected when you visit the overview."
      />

      {toast && (
        <div className="mb-4 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-bold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">{toast}</div>
      )}

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search campaigns…"
          className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
        />
        <span className="text-xs font-bold text-zinc-500">{visible.length} / {campaigns.length}</span>
        <button
          onClick={() => { setShowAdd(s => !s); setAddDraft({ ...EMPTY_FORM }); cancelBulk(); }}
          className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
        >
          <Plus className="h-4 w-4" />Add Campaign
        </button>
        <button
          onClick={() => { setBulkMode(m => m === 'idle' ? 'picking' : 'idle'); setShowAdd(false); }}
          className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
            bulkMode !== 'idle'
              ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-black'
              : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'
          }`}
        >
          <Upload className="h-4 w-4" />Bulk Upload
        </button>
        <button
          onClick={handleReset}
          onBlur={() => setResetConfirm(false)}
          className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
            resetConfirm
              ? 'border-red-400 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-700 dark:bg-red-950/30 dark:text-red-400'
              : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400'
          }`}
        >
          {resetConfirm ? 'Confirm Clear?' : 'Clear All'}
        </button>
      </div>

      {/* ── Bulk Upload Panel ── */}
      {bulkMode === 'picking' && (
        <div className="mb-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200">Bulk Upload Campaigns</h3>
              <p className="mt-0.5 text-xs text-zinc-500">Upload an Excel (.xlsx / .xls) or CSV file. Duplicates by campaign name are skipped.</p>
            </div>
            <button onClick={cancelBulk} className="rounded-lg p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800"><X className="h-4 w-4 text-zinc-500" /></button>
          </div>

          {/* Required columns hint */}
          <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-3 text-xs font-mono leading-relaxed text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
            <span className="font-black text-zinc-800 dark:text-zinc-200">Campaign</span>, Country, Type, List, Confirmations, Target, Visited, Coverage, Start, End
          </div>

          {/* Drop zone */}
          <div
            onClick={() => bulkFileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setBulkDragOver(true); }}
            onDragLeave={() => setBulkDragOver(false)}
            onDrop={handleBulkDrop}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-10 transition-all ${
              bulkDragOver
                ? 'border-zinc-800 bg-zinc-100 dark:border-zinc-300 dark:bg-zinc-800'
                : 'border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-zinc-600'
            }`}
          >
            {bulkParsing ? (
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            ) : (
              <Upload className={`h-8 w-8 ${bulkDragOver ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-400'}`} />
            )}
            <div className="text-center">
              <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                {bulkParsing ? 'Parsing file…' : bulkDragOver ? 'Drop to upload' : 'Click or drag & drop'}
              </p>
              <p className="mt-0.5 text-xs text-zinc-400">.xlsx · .xls · .csv</p>
            </div>
          </div>
          <input
            ref={bulkFileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) processBulkFile(f); }}
          />

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              onClick={downloadBulkTemplate}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <FileText className="h-4 w-4" />Download Template
            </button>
            <button onClick={cancelBulk} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-400">Cancel</button>
          </div>
        </div>
      )}

      {/* ── Bulk Preview Panel ── */}
      {bulkMode === 'preview' && (
        <div className="mb-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200">Preview — {bulkParsed.length} rows parsed</h3>
              <div className="mt-1 flex flex-wrap gap-3 text-xs">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">✓ {bulkNew} new</span>
                {bulkDupes > 0 && <span className="font-bold text-amber-600 dark:text-amber-400">⚠ {bulkDupes} duplicate{bulkDupes !== 1 ? 's' : ''} will be skipped</span>}
              </div>
            </div>
            <button onClick={cancelBulk} className="rounded-lg p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800"><X className="h-4 w-4 text-zinc-500" /></button>
          </div>

          {/* Preview table */}
          <div className="max-h-72 overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-900">
                <tr>
                  {['', 'Campaign', 'Country', 'Type', 'List', 'Conf', 'Target', 'Visited', 'Cov', 'Start', 'End'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-zinc-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {bulkParsed.map((r, i) => {
                  const isDupe = existingNames.has(r.name.trim().toLowerCase());
                  return (
                    <tr key={i} className={isDupe ? 'bg-amber-50/60 dark:bg-amber-950/20' : 'bg-white dark:bg-zinc-950'}>
                      <td className="px-3 py-1.5">
                        {isDupe
                          ? <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">DUPE</span>
                          : <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">NEW</span>
                        }
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-1.5 font-medium text-zinc-800 dark:text-zinc-200" title={r.name}>{r.name}</td>
                      <td className="px-3 py-1.5 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{r.country}</td>
                      <td className="px-3 py-1.5 text-zinc-600 dark:text-zinc-400">{r.type}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">{r.list}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">{r.confirmations}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">{r.target}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">{r.visited}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">{r.coverage}</td>
                      <td className="px-3 py-1.5 text-zinc-500 whitespace-nowrap">{r.startDate}</td>
                      <td className="px-3 py-1.5 text-zinc-500 whitespace-nowrap">{r.endDate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              onClick={() => { setBulkMode('picking'); setBulkParsed([]); }}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-400"
            >
              ← Back
            </button>
            <div className="flex gap-2">
              <button onClick={cancelBulk} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-400">Cancel</button>
              <button
                onClick={handleBulkImport}
                disabled={bulkNew === 0}
                className="rounded-xl bg-zinc-900 px-5 py-2 text-sm font-bold text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-black"
              >
                Import {bulkNew} Campaign{bulkNew !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Form */}
      {showAdd && (
        <div className="mb-5 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-900/60">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200">New Campaign</h3>
            <button onClick={() => setShowAdd(false)} className="rounded-lg p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800"><X className="h-4 w-4 text-zinc-500" /></button>
          </div>
          <CampaignFormFields
            draft={addDraft}
            onChange={(k, v) => setAddDraft(prev => ({ ...prev, [k]: v }))}
          />
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800">Cancel</button>
            <button onClick={handleAdd} className="rounded-xl bg-zinc-900 px-5 py-2 text-sm font-bold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-black">
              <Plus className="mr-1 inline h-4 w-4" />Add Campaign
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              {['Campaign', 'Country', 'Type', 'List', 'Conf', 'Target', 'Visited', 'Cov', 'Start', 'End', ''].map(h => (
                <th key={h} className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-widest text-zinc-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {visible.length === 0 && (
              <tr><td colSpan={11} className="px-4 py-10 text-center text-sm text-zinc-400">No campaigns yet. Add one above or use Bulk Upload.</td></tr>
            )}
            {visible.map(c => {
              if (editingId === c.id) {
                return (
                  <tr key={c.id} className="bg-amber-50 dark:bg-amber-950/20">
                    <td colSpan={11} className="px-3 py-4">
                      <CampaignFormFields
                        draft={editDraft}
                        onChange={(k, v) => setEditDraft(prev => ({ ...prev, [k]: v }))}
                        compact
                      />
                      <div className="mt-3 flex gap-2">
                        <button onClick={handleUpdate} className="flex items-center gap-1 rounded-xl bg-zinc-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-black">
                          <Save className="h-3 w-3" />Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="rounded-xl border border-zinc-300 px-4 py-1.5 text-xs font-bold text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400">Cancel</button>
                      </div>
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                  <td className="px-3 py-2.5 max-w-[220px]">
                    <div className="truncate font-semibold text-zinc-800 dark:text-zinc-200 text-xs" title={c.name}>{c.name}</div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{c.country}</td>
                  <td className="px-3 py-2.5 text-xs text-zinc-600 dark:text-zinc-400">{c.type}</td>
                  <td className="px-3 py-2.5 text-xs tabular-nums text-zinc-700 dark:text-zinc-300 text-right">{c.list.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-xs tabular-nums text-zinc-700 dark:text-zinc-300 text-right">{c.confirmations.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-xs tabular-nums text-zinc-700 dark:text-zinc-300 text-right">{c.target.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-xs tabular-nums text-zinc-700 dark:text-zinc-300 text-right">{c.visited.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-xs tabular-nums text-zinc-700 dark:text-zinc-300 text-right">{c.coverage.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-xs text-zinc-500 whitespace-nowrap">{c.startDate}</td>
                  <td className="px-3 py-2.5 text-xs text-zinc-500 whitespace-nowrap">{c.endDate}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => startEdit(c)}
                        title="Edit"
                        className="rounded-lg bg-zinc-100 p-1.5 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        onBlur={() => setDeleteConfirmId(null)}
                        title={deleteConfirmId === c.id ? 'Click again to confirm' : 'Delete'}
                        className={`rounded-lg p-1.5 text-xs font-bold transition-colors ${
                          deleteConfirmId === c.id
                            ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-400'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                        }`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AuditSection({ getAuditLogs }: { getAuditLogs: (limit?: number) => Promise<ConfigAuditLog[]> }) {
  const [logs, setLogs] = useState<ConfigAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<ConfigAuditLog | null>(null);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setLogs(await getAuditLogs(100));
    } catch (error) {
      setLogs([]);
      setLoadError(error instanceof Error ? error.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [getAuditLogs]);

  useEffect(() => { load(); }, [load]);

  const categories = ['all', ...Array.from(new Set(logs.map((l) => l.category)))];
  const visible = filter === 'all' ? logs : logs.filter((l) => l.category === filter);

  return (
    <>
      <SectionHeader title="Audit Log" description="Track every configuration change with before/after diffs." />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SelectInput value={filter} onChange={setFilter} options={categories.map((c) => ({ value: c, label: c === 'all' ? 'All categories' : c }))} />
        <button onClick={load} className="flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
        </button>
      </div>
      {loadError && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 dark:border-red-950/60 dark:bg-red-950/30 dark:text-red-400">{loadError}</div>}
      {loading ? (
        <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-400" /></div>
      ) : visible.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center gap-2 text-zinc-400">
          <History className="h-8 w-8 opacity-40" />
          <span className="text-sm font-medium">No audit logs yet</span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>{['Category', 'Action', 'Changed By', 'Date', ''].map((h) => <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-zinc-500">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {visible.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="px-4 py-3"><span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-bold dark:bg-zinc-800">{log.category}</span></td>
                  <td className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">{log.action.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{log.changedBy}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{new Date(log.changedAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelected(log)} className="rounded-lg bg-zinc-100 px-2 py-1 text-xs font-bold text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700">Diff</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-950" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">Change Diff — {selected.action.replace(/_/g, ' ')}</h3>
              <button onClick={() => setSelected(null)} className="rounded-lg p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-black text-red-600">BEFORE</div>
                <pre className="scrollbar-thin max-h-80 overflow-auto rounded-xl bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">{JSON.stringify(selected.before, null, 2)}</pre>
              </div>
              <div>
                <div className="mb-2 text-xs font-black text-green-600">AFTER</div>
                <pre className="scrollbar-thin max-h-80 overflow-auto rounded-xl bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">{JSON.stringify(selected.after, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function BackupsSection({ getBackups, createManualBackup, restoreBackup }: { getBackups: (limit?: number) => Promise<ConfigBackup[]>; createManualBackup: (desc: string) => Promise<void>; restoreBackup: (id: string) => Promise<void> }) {
  const [backups, setBackups] = useState<ConfigBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [desc, setDesc] = useState('');
  const [preview, setPreview] = useState<ConfigBackup | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBackups(await getBackups());
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to load backups');
      setBackups([]);
    } finally {
      setLoading(false);
    }
  }, [getBackups]);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleCreate = async () => {
    if (!desc.trim()) return;
    setCreating(true);
    try {
      await createManualBackup(desc.trim());
      setDesc('');
      await load();
      showToast('Backup created successfully');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to create backup');
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (id: string) => {
    if (!confirm('Restore this backup? Current configuration will be overwritten.')) return;
    setRestoring(id);
    try {
      await restoreBackup(id);
      await load();
      showToast('Configuration restored');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to restore backup');
    } finally {
      setRestoring(null);
    }
  };

  return (
    <>
      <SectionHeader title="Configuration Backups" description="Create snapshots and restore previous configuration states." />
      {toast && <div className="mb-4 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-bold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">{toast}</div>}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row">
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Backup description…" className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200" />
        <button onClick={handleCreate} disabled={creating || !desc.trim()} className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-black">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}Create Backup
        </button>
      </div>
      {loading ? (
        <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-400" /></div>
      ) : backups.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center gap-2 text-zinc-400">
          <Archive className="h-8 w-8 opacity-40" />
          <span className="text-sm font-medium">No backups yet</span>
        </div>
      ) : (
        <div className="space-y-2">
          {backups.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-bold text-zinc-800 dark:text-zinc-200">{b.description || 'Untitled backup'}</span>
                  {b.automatic && <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-black uppercase dark:bg-zinc-700">Auto</span>}
                </div>
                <div className="mt-0.5 text-xs text-zinc-500">{new Date(b.createdAt).toLocaleString()} · by {b.createdBy}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setPreview(b)} className="rounded-xl bg-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600">Preview</button>
                <button onClick={() => handleRestore(b.id)} disabled={restoring === b.id} className="flex items-center gap-1 rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-black">
                  {restoring === b.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}Restore
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPreview(null)}>
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-950" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">Backup Preview</h3>
              <button onClick={() => setPreview(null)} className="rounded-lg p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-4 w-4" /></button>
            </div>
            <pre className="scrollbar-thin max-h-96 overflow-auto rounded-xl bg-zinc-50 p-4 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">{JSON.stringify(preview.configuration, null, 2)}</pre>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Inner page (reads from ConfigurationContext + Root AppContext) ────────────

function ConfigurationPage() {
  const {
    configuration, isLoading, isSaving, error,
    updateConfig, replaceConfiguration, reloadConfig,
    getAuditLogs, getBackups, createManualBackup, restoreBackup,
  } = useConfiguration();

  // Pull admin flag from Root's real auth context
  const ctx = useContext(AppContext);
  const isAdmin = ctx?.isAdmin || false;
  const disabledTeams: string[] = ctx?.disabledTeams || [];
  const setDisabledTeams = ctx?.setDisabledTeams || (() => {});

  const [activeSection, setActiveSection] = useState<NavId>('system');
  const [localChanges, setLocalChanges] = useState<Record<string, unknown>>({});
  const [saveError, setSaveError] = useState('');
  const [statusMessage, setStatusMessage] = useState<StatusMessage>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasChanges = Object.keys(localChanges).length > 0;

  const switchSection = (id: NavId) => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    setActiveSection(id);
    setLocalChanges({});
    setSaveError('');
  };

  const handleChange = (key: string, value: unknown) => setLocalChanges((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!hasChanges) return;
    if (!CONFIG_SECTIONS.includes(activeSection as ConfigCategory)) return;
    setSaveError('');
    setStatusMessage(null);
    try {
      await updateConfig(activeSection as ConfigCategory, localChanges as Partial<AppConfiguration[ConfigCategory]>);
      setLocalChanges({});
      setStatusMessage({ tone: 'success', text: `${activeItem.label} saved successfully` });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setSaveError(message);
      setStatusMessage({ tone: 'error', text: message });
    }
  };

  const handleDiscard = () => { setLocalChanges({}); setSaveError(''); };

  useEffect(() => {
    if (!hasChanges || !CONFIG_SECTIONS.includes(activeSection as ConfigCategory)) {
      return;
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(async () => {
      try {
        await updateConfig(activeSection as ConfigCategory, localChanges as Partial<AppConfiguration[ConfigCategory]>);
        setLocalChanges({});
        setSaveError('');
        setStatusMessage({ tone: 'success', text: `${activeSection} changes auto-saved` });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Auto-save failed';
        setSaveError(message);
        setStatusMessage({ tone: 'error', text: message });
      } finally {
        autosaveTimerRef.current = null;
      }
    }, CONFIG_AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [activeSection, hasChanges, localChanges, updateConfig]);

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <Lock className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />
        <h2 className="text-xl font-black text-zinc-700 dark:text-zinc-300">Admin Access Required</h2>
        <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
          Configuration management is restricted to administrators. Contact your workspace admin for access.
        </p>
      </div>
    );
  }

  const isConfigSection = !['audit', 'backups', 'overview-data'].includes(activeSection);
  const activeItem = NAV_ITEMS.find((item) => item.id === activeSection) || NAV_ITEMS[0];

  // Merged view: local overrides on top of saved config
  const mergedSection = <T extends keyof AppConfiguration>(section: T): AppConfiguration[T] =>
    ({
      ...(configuration[section] as unknown as Record<string, unknown>),
      ...localChanges,
    } as unknown as AppConfiguration[T]);

  return (
    <div className="px-4 py-4 lg:px-5 lg:py-5 xl:px-6">
      <div className="mx-auto space-y-5" style={{ maxWidth: 'var(--app-shell-max-width)' }}>
        <section className="app-surface-card app-tint-card rounded-[var(--app-card-radius)] border px-5 py-5 shadow-sm dark:bg-zinc-950/90 lg:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">Admin Workspace</div>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 lg:text-[2rem]">Configuration Manager</h1>
              <p className="mt-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-300">
                Centralized system, team, workflow, and desktop presentation controls. Changes are saved automatically.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {error && <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 dark:bg-red-950/40 dark:text-red-400">{error}</span>}
              {statusMessage && (
                <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusMessage.tone === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'}`}>
                  {statusMessage.text}
                </span>
              )}
              <button onClick={reloadConfig} className="flex items-center gap-1.5 rounded-[var(--app-card-radius-sm)] border border-zinc-200 bg-white/80 px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />Reload
              </button>
              {isSaving && (
                <div className="flex items-center gap-1.5 rounded-[var(--app-card-radius-sm)] border border-zinc-200 bg-white/80 px-3 py-2 text-xs font-bold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="app-surface-card rounded-[var(--app-card-radius-sm)] border border-white/60 bg-white/75 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/75">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Active Section</div>
              <div className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">{activeItem.label}</div>
              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{activeItem.desc}</div>
            </div>
            <div className="app-surface-card rounded-[var(--app-card-radius-sm)] border border-white/60 bg-white/75 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/75">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Pending Changes</div>
              <div className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">{hasChanges ? `${Object.keys(localChanges).length} unsaved` : 'No pending edits'}</div>
              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Current desktop density: {configuration.workspace.desktopDensity}</div>
            </div>
            <div className="app-surface-card rounded-[var(--app-card-radius-sm)] border border-white/60 bg-white/75 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/75">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Visual Tokens</div>
              <div className="mt-2 flex items-center gap-2">
                <span className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: configuration.system.primaryColor }} />
                <span className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: configuration.system.secondaryColor }} />
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{configuration.workspace.contentWidth} width</span>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <div className="app-surface-card rounded-[var(--app-card-radius)] border border-zinc-200 bg-white px-3 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => switchSection(item.id as NavId)}
                      className={`flex w-full items-center gap-3 rounded-[var(--app-card-radius-sm)] px-3 py-2.5 text-left transition-all ${
                        active
                          ? 'app-accent-button shadow-sm'
                          : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold">{item.label}</div>
                        <div className={`truncate text-[11px] ${active ? 'opacity-80' : 'text-zinc-500 dark:text-zinc-500'}`}>{item.desc}</div>
                      </div>
                      {active && <ChevronRight className="h-3 w-3 shrink-0" />}
                    </button>
                  );
                })}
              </nav>
            </div>
            <div className="app-surface-card rounded-[var(--app-card-radius)] border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <button
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(configuration, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'trygc-config.json';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex w-full items-center gap-2 rounded-[var(--app-card-radius-sm)] px-3 py-2 text-left text-xs font-bold text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
              >
                <Download className="h-3.5 w-3.5" />Export Config
              </button>
              <label className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded-[var(--app-card-radius-sm)] px-3 py-2 text-left text-xs font-bold text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900">
                <Upload className="h-3.5 w-3.5" />Import Config
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={async (e) => {
                    const input = e.currentTarget;
                    const file = input.files?.[0];
                    if (!file) return;
                    try {
                      const text = await file.text();
                      const parsed = JSON.parse(text);
                      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                        throw new Error('Configuration file must contain a JSON object');
                      }

                      await replaceConfiguration(normalizeConfiguration(parsed as Partial<AppConfiguration>));
                      setLocalChanges({});
                      setSaveError('');
                      setStatusMessage({ tone: 'success', text: 'Configuration imported successfully' });
                    } catch (error) {
                      setStatusMessage({
                        tone: 'error',
                        text: error instanceof Error ? error.message : 'Invalid configuration file',
                      });
                    } finally {
                      input.value = '';
                    }
                  }}
                />
              </label>
            </div>
          </aside>

          <div className="space-y-4">
            {isConfigSection && hasChanges && (
              <div className="app-surface-card sticky top-24 z-10 flex flex-wrap items-center justify-between gap-3 rounded-[var(--app-card-radius)] border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/30">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  Unsaved changes in <strong>{activeSection}</strong>
                  {saveError && <span className="ml-2 text-red-600 dark:text-red-400">- {saveError}</span>}
                </span>
                <div className="flex gap-2">
                  <button onClick={handleDiscard} className="rounded-[var(--app-card-radius-sm)] border border-amber-300 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-400">Discard</button>
                  <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-1.5 rounded-[var(--app-card-radius-sm)] bg-amber-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-60">
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Save
                  </button>
                </div>
              </div>
            )}

            <section className="app-surface-card rounded-[var(--app-card-radius)] border border-zinc-200 bg-white px-5 py-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:px-6">
              {isLoading ? (
                <div className="flex min-h-[50vh] items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                </div>
              ) : (
                <>
                  <div className="mb-5 block lg:hidden">
                    <SelectInput value={activeSection} onChange={(v) => switchSection(v as NavId)} options={NAV_ITEMS.map((n) => ({ value: n.id, label: n.label }))} />
                  </div>

                  {activeSection === 'system' && (
                    <SystemSection config={mergedSection('system') as AppConfiguration['system']} onChange={handleChange} />
                  )}
                  {activeSection === 'campaign' && (
                    <CampaignSection config={mergedSection('campaign') as AppConfiguration['campaign']} onChange={handleChange} />
                  )}
                  {activeSection === 'team' && (
                    <TeamSection config={mergedSection('team') as AppConfiguration['team']} onChange={handleChange} />
                  )}
                  {activeSection === 'notification' && (
                    <NotificationSection config={mergedSection('notification') as AppConfiguration['notification']} onChange={handleChange} />
                  )}
                  {activeSection === 'workspace' && (
                    <WorkspaceSection config={mergedSection('workspace') as AppConfiguration['workspace']} onChange={handleChange} />
                  )}
                  {activeSection === 'task' && (
                    <TaskSection
                      config={mergedSection('task') as AppConfiguration['task']}
                      onChange={handleChange}
                      disabledTeams={disabledTeams}
                      onToggleTeam={(teamId) => {
                        setDisabledTeams((prev: string[]) =>
                          prev.includes(teamId) ? prev.filter((id: string) => id !== teamId) : [...prev, teamId]
                        );
                      }}
                    />
                  )}
                  {activeSection === 'analytics' && (
                    <AnalyticsSection config={mergedSection('analytics') as AppConfiguration['analytics']} onChange={handleChange} />
                  )}
                  {activeSection === 'data' && (
                    <DataSection config={mergedSection('data') as AppConfiguration['data']} onChange={handleChange} />
                  )}
                  {activeSection === 'feature' && (
                    <FeatureSection config={mergedSection('feature') as AppConfiguration['feature']} onChange={(k, v) => handleChange(k, v)} />
                  )}
                  {activeSection === 'audit' && <AuditSection getAuditLogs={getAuditLogs} />}
                  {activeSection === 'backups' && (
                    <BackupsSection getBackups={getBackups} createManualBackup={createManualBackup} restoreBackup={restoreBackup} />
                  )}
                  {activeSection === 'overview-data' && <CampaignOverviewDataSection />}
                  {activeSection === 'updateOrganizer' && (
                    <UpdateOrganizerSection
                      config={mergedSection('updateOrganizer') as UpdateOrganizerConfig}
                      onChange={(k, v) => handleChange(k as string, v)}
                    />
                  )}
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConfigurationManager() {
  return <ConfigurationPage />;
}
