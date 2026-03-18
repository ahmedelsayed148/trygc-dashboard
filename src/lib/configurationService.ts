import { supabase } from '../components/supabaseClient';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

// Types

export interface SystemConfig {
  appName: string;
  sessionTimeout: number;
  autoSave: boolean;
  cacheDuration: number;
  fileUploadLimit: number;
  primaryColor: string;
  secondaryColor: string;
  apiRateLimit: number;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

export interface CampaignConfig {
  phases: string[];
  slaTimelines: Record<string, number>;
  requiredFields: string[];
  autoArchiveDays: number;
}

export interface TeamConfig {
  teams: string[];
  autoAssignment: boolean;
  capacityThreshold: number;
  workloadThreshold: number;
  escalationRules: { team: string; escalateTo: string; afterHours: number }[];
}

export interface NotificationConfig {
  channels: { email: boolean; inApp: boolean; slack: boolean };
  triggers: {
    taskAssigned: boolean;
    taskOverdue: boolean;
    campaignStatusChange: boolean;
    teamCapacityAlert: boolean;
    systemAlert: boolean;
  };
  frequency: 'immediate' | 'hourly' | 'daily' | 'digest';
  batchNotifications: boolean;
  quietHours: { enabled: boolean; start: string; end: string };
}

export interface WorkspaceConfig {
  timezone: string;
  language: string;
  dateFormat: string;
  currency: string;
  permissions: Record<string, Record<string, boolean>>;
  desktopDensity: 'comfortable' | 'compact' | 'dense';
  contentWidth: 'standard' | 'wide' | 'full';
  panelRadius: 'soft' | 'rounded' | 'sharp';
  surfaceStyle: 'flat' | 'tinted' | 'elevated';
}

export interface TaskConfig {
  statuses: string[];
  priorities: string[];
  slaTimelines: Record<string, number>;
  escalationTimelines: Record<string, number>;
  autoAssignmentStrategy: 'round-robin' | 'least-loaded' | 'manual';
  reminderSchedule: number[];
  customFields: { name: string; type: string; required: boolean }[];
}

export interface AnalyticsConfig {
  dashboardLayout: 'grid' | 'list' | 'compact';
  defaultDateRange: '7d' | '30d' | '90d' | 'custom';
  kpiThresholds: Record<string, { warning: number; critical: number }>;
  dataRetention: Record<string, number>;
}

export interface DataConfig {
  maxFileSize: number;
  supportedFormats: string[];
  exportTemplates: string[];
}

export interface FeatureFlags {
  advancedAnalytics: boolean;
  aiAssistant: boolean;
  bulkOperations: boolean;
  customReports: boolean;
  apiIntegrations: boolean;
  multiWorkspace: boolean;
  slaEnforcement: boolean;
  automationRules: boolean;
}

export type ConfigCategory =
  | 'system'
  | 'campaign'
  | 'team'
  | 'notification'
  | 'workspace'
  | 'task'
  | 'analytics'
  | 'data'
  | 'feature';

export interface AppConfiguration {
  system: SystemConfig;
  campaign: CampaignConfig;
  team: TeamConfig;
  notification: NotificationConfig;
  workspace: WorkspaceConfig;
  task: TaskConfig;
  analytics: AnalyticsConfig;
  data: DataConfig;
  feature: FeatureFlags;
}

export interface ConfigAuditLog {
  id: string;
  category: ConfigCategory;
  action: string;
  changedBy: string;
  changedAt: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

export interface ConfigBackup {
  id: string;
  configuration: AppConfiguration;
  createdBy: string;
  createdAt: string;
  description: string;
  automatic: boolean;
}

interface FallbackEnvelope {
  configuration: AppConfiguration;
  auditLogs: ConfigAuditLog[];
  backups: ConfigBackup[];
}

interface AdminConfigPayload {
  config?: Record<string, unknown>;
}

// Defaults

export const DEFAULT_CONFIGURATION: AppConfiguration = {
  system: {
    appName: 'Trygc OPS',
    sessionTimeout: 60,
    autoSave: true,
    cacheDuration: 300,
    fileUploadLimit: 50,
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    apiRateLimit: 1000,
    maintenanceMode: false,
    maintenanceMessage: '',
  },
  campaign: {
    phases: ['Discovery', 'Planning', 'Execution', 'Review', 'Closed'],
    slaTimelines: { Discovery: 7, Planning: 14, Execution: 30, Review: 7 },
    requiredFields: ['name', 'phase', 'assignee', 'dueDate'],
    autoArchiveDays: 30,
  },
  team: {
    teams: ['Operations', 'Community', 'Analytics', 'Growth'],
    autoAssignment: false,
    capacityThreshold: 80,
    workloadThreshold: 90,
    escalationRules: [],
  },
  notification: {
    channels: { email: true, inApp: true, slack: false },
    triggers: {
      taskAssigned: true,
      taskOverdue: true,
      campaignStatusChange: true,
      teamCapacityAlert: false,
      systemAlert: true,
    },
    frequency: 'immediate',
    batchNotifications: false,
    quietHours: { enabled: false, start: '22:00', end: '08:00' },
  },
  workspace: {
    timezone: 'UTC',
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
    permissions: {
      admin: { createCampaign: true, deleteCampaign: true, manageUsers: true, viewReports: true, exportData: true },
      member: { createCampaign: true, deleteCampaign: false, manageUsers: false, viewReports: true, exportData: false },
    },
    desktopDensity: 'compact',
    contentWidth: 'wide',
    panelRadius: 'rounded',
    surfaceStyle: 'tinted',
  },
  task: {
    statuses: ['Pending', 'In Progress', 'Blocked', 'Done'],
    priorities: ['Low', 'Medium', 'High', 'Critical'],
    slaTimelines: { Low: 72, Medium: 48, High: 24, Critical: 4 },
    escalationTimelines: { Low: 96, Medium: 72, High: 48, Critical: 8 },
    autoAssignmentStrategy: 'manual',
    reminderSchedule: [24, 4, 1],
    customFields: [],
  },
  analytics: {
    dashboardLayout: 'grid',
    defaultDateRange: '30d',
    kpiThresholds: {
      completionRate: { warning: 70, critical: 50 },
      slaCompliance: { warning: 85, critical: 70 },
      teamCapacity: { warning: 80, critical: 90 },
    },
    dataRetention: { tasks: 365, campaigns: 730, analytics: 180, logs: 90 },
  },
  data: {
    maxFileSize: 50,
    supportedFormats: ['xlsx', 'csv', 'json', 'pdf'],
    exportTemplates: ['Weekly Report', 'Campaign Summary', 'Team Performance'],
  },
  feature: {
    advancedAnalytics: true,
    aiAssistant: false,
    bulkOperations: true,
    customReports: true,
    apiIntegrations: false,
    multiWorkspace: false,
    slaEnforcement: true,
    automationRules: false,
  },
};

const CONFIG_FUNCTION_URL = `https://${projectId}.supabase.co/functions/v1/make-server-b626472b/admin-config`;

export function normalizeConfiguration(input?: Partial<AppConfiguration> | null): AppConfiguration {
  return {
    system: { ...DEFAULT_CONFIGURATION.system, ...(input?.system || {}) },
    campaign: { ...DEFAULT_CONFIGURATION.campaign, ...(input?.campaign || {}) },
    team: { ...DEFAULT_CONFIGURATION.team, ...(input?.team || {}) },
    notification: { ...DEFAULT_CONFIGURATION.notification, ...(input?.notification || {}) },
    workspace: { ...DEFAULT_CONFIGURATION.workspace, ...(input?.workspace || {}) },
    task: { ...DEFAULT_CONFIGURATION.task, ...(input?.task || {}) },
    analytics: { ...DEFAULT_CONFIGURATION.analytics, ...(input?.analytics || {}) },
    data: { ...DEFAULT_CONFIGURATION.data, ...(input?.data || {}) },
    feature: { ...DEFAULT_CONFIGURATION.feature, ...(input?.feature || {}) },
  };
}

const mergeConfiguration = normalizeConfiguration;

function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isMissingTableError(error: unknown) {
  return isRecord(error) && (error.code === 'PGRST205' || String(error.message || '').includes('schema cache'));
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `cfg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeAuditLogs(value: unknown): ConfigAuditLog[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => ({
      id: String(item.id || createId()),
      category: String(item.category || 'system') as ConfigCategory,
      action: String(item.action || 'update'),
      changedBy: String(item.changedBy || item.changed_by || 'unknown'),
      changedAt: String(item.changedAt || item.changed_at || new Date().toISOString()),
      before: isRecord(item.before) ? item.before : {},
      after: isRecord(item.after) ? item.after : {},
    }));
}

function sanitizeBackups(value: unknown): ConfigBackup[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => ({
      id: String(item.id || createId()),
      configuration: mergeConfiguration(item.configuration as Partial<AppConfiguration> | undefined),
      createdBy: String(item.createdBy || item.created_by || 'unknown'),
      createdAt: String(item.createdAt || item.created_at || new Date().toISOString()),
      description: String(item.description || ''),
      automatic: item.automatic === true,
    }));
}

export class ConfigurationService {
  private static TABLE = 'app_configuration';
  private static AUDIT_TABLE = 'config_audit_logs';
  private static BACKUP_TABLE = 'config_backups';
  private static CONFIG_ID = 'singleton';
  private static STORAGE_KEY = 'trygc-configuration';
  private static AUDIT_STORAGE_KEY = 'trygc-configuration-audit';
  private static BACKUP_STORAGE_KEY = 'trygc-configuration-backups';
  private tableMode: 'unknown' | 'available' | 'missing' = 'unknown';

  async getConfiguration(): Promise<AppConfiguration> {
    const tableConfig = await this.getTableConfiguration();
    if (tableConfig) {
      this.saveLocalConfiguration(tableConfig);
      return tableConfig;
    }

    const fallback = await this.getFallbackEnvelope();
    this.saveFallbackToLocal(fallback);
    return fallback.configuration;
  }

  async updateConfiguration(
    category: ConfigCategory,
    changes: Partial<AppConfiguration[ConfigCategory]>,
    _userId: string,
    userName: string,
  ): Promise<AppConfiguration> {
    const current = await this.getConfiguration();
    const before = { ...current[category] };
    const updated = mergeConfiguration({
      ...current,
      [category]: { ...current[category], ...changes },
    });

    const auditLog: ConfigAuditLog = {
      id: createId(),
      category,
      action: `update_${category}`,
      changedBy: userName,
      changedAt: new Date().toISOString(),
      before: before as Record<string, unknown>,
      after: changes as Record<string, unknown>,
    };

    const tableSaved = await this.saveConfigurationToTables(updated, auditLog);
    if (!tableSaved) {
      const fallback = await this.getFallbackEnvelope();
      await this.saveFallbackEnvelope({
        configuration: updated,
        auditLogs: [auditLog, ...fallback.auditLogs].slice(0, 150),
        backups: fallback.backups,
      });
    }

    this.saveLocalConfiguration(updated);
    return updated;
  }

  async replaceConfiguration(
    configuration: Partial<AppConfiguration>,
    _userId: string,
    userName: string,
  ): Promise<AppConfiguration> {
    const current = await this.getConfiguration();
    const nextConfiguration = normalizeConfiguration(configuration);

    const auditLog: ConfigAuditLog = {
      id: createId(),
      category: 'system',
      action: 'replace_configuration',
      changedBy: userName,
      changedAt: new Date().toISOString(),
      before: current as unknown as Record<string, unknown>,
      after: nextConfiguration as unknown as Record<string, unknown>,
    };

    const tableSaved = await this.saveConfigurationToTables(nextConfiguration, auditLog);
    if (!tableSaved) {
      const fallback = await this.getFallbackEnvelope();
      await this.saveFallbackEnvelope({
        configuration: nextConfiguration,
        auditLogs: [auditLog, ...fallback.auditLogs].slice(0, 150),
        backups: fallback.backups,
      });
    }

    this.saveLocalConfiguration(nextConfiguration);
    return nextConfiguration;
  }

  async createBackup(config: AppConfiguration, userId: string, description: string, automatic: boolean): Promise<void> {
    const backup: ConfigBackup = {
      id: createId(),
      configuration: mergeConfiguration(config),
      createdBy: userId,
      createdAt: new Date().toISOString(),
      description,
      automatic,
    };

    const tableSaved = await this.saveBackupToTables(backup);
    if (!tableSaved) {
      const fallback = await this.getFallbackEnvelope();
      await this.saveFallbackEnvelope({
        configuration: fallback.configuration,
        auditLogs: fallback.auditLogs,
        backups: [backup, ...fallback.backups].slice(0, 50),
      });
    }
  }

  async getBackups(limit = 20): Promise<ConfigBackup[]> {
    const tableBackups = await this.getTableBackups(limit);
    if (tableBackups) {
      return tableBackups;
    }

    const fallback = await this.getFallbackEnvelope();
    return fallback.backups.slice(0, limit);
  }

  async restoreFromBackup(backupId: string, _userId: string, userName: string): Promise<void> {
    const backups = (await this.getTableBackups(100)) || (await this.getFallbackEnvelope()).backups;
    const backup = backups.find((item) => item.id === backupId);

    if (!backup) {
      throw new Error('Backup not found');
    }

    const current = await this.getConfiguration();
    const auditLog: ConfigAuditLog = {
      id: createId(),
      category: 'system',
      action: 'restore_backup',
      changedBy: userName,
      changedAt: new Date().toISOString(),
      before: current as unknown as Record<string, unknown>,
      after: backup.configuration as unknown as Record<string, unknown>,
    };

    const tableSaved = await this.saveConfigurationToTables(backup.configuration, auditLog);
    if (!tableSaved) {
      const fallback = await this.getFallbackEnvelope();
      await this.saveFallbackEnvelope({
        configuration: backup.configuration,
        auditLogs: [auditLog, ...fallback.auditLogs].slice(0, 150),
        backups: fallback.backups,
      });
    }

    this.saveLocalConfiguration(backup.configuration);
  }

  async getAuditLogs(limit = 50): Promise<ConfigAuditLog[]> {
    const tableLogs = await this.getTableAuditLogs(limit);
    if (tableLogs) {
      return tableLogs;
    }

    const fallback = await this.getFallbackEnvelope();
    return fallback.auditLogs.slice(0, limit);
  }

  private async getTableConfiguration(): Promise<AppConfiguration | null> {
    if (this.tableMode === 'missing') {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from(ConfigurationService.TABLE)
        .select('*')
        .eq('id', ConfigurationService.CONFIG_ID)
        .single();

      if (error) {
        if (isMissingTableError(error)) {
          this.tableMode = 'missing';
        }
        return null;
      }

      this.tableMode = 'available';
      return mergeConfiguration(data.configuration as Partial<AppConfiguration>);
    } catch {
      return null;
    }
  }

  private async saveConfigurationToTables(configuration: AppConfiguration, auditLog: ConfigAuditLog) {
    if (this.tableMode === 'missing') {
      return false;
    }

    try {
      const { error } = await supabase
        .from(ConfigurationService.TABLE)
        .upsert({
          id: ConfigurationService.CONFIG_ID,
          configuration,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        if (isMissingTableError(error)) {
          this.tableMode = 'missing';
        }
        return false;
      }

      this.tableMode = 'available';
      await this.createAuditLogInTable(auditLog);
      return true;
    } catch {
      return false;
    }
  }

  private async getTableAuditLogs(limit: number): Promise<ConfigAuditLog[] | null> {
    if (this.tableMode === 'missing') {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from(ConfigurationService.AUDIT_TABLE)
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(limit);

      if (error) {
        if (isMissingTableError(error)) {
          this.tableMode = 'missing';
        }
        return null;
      }

      this.tableMode = 'available';
      return sanitizeAuditLogs(data);
    } catch {
      return null;
    }
  }

  private async createAuditLogInTable(log: ConfigAuditLog) {
    if (this.tableMode === 'missing') {
      return false;
    }

    try {
      const { error } = await supabase.from(ConfigurationService.AUDIT_TABLE).insert({
        id: log.id,
        category: log.category,
        action: log.action,
        changed_by: log.changedBy,
        changed_at: log.changedAt,
        before: log.before,
        after: log.after,
      });

      if (error && isMissingTableError(error)) {
        this.tableMode = 'missing';
      }

      return !error;
    } catch {
      return false;
    }
  }

  private async getTableBackups(limit: number): Promise<ConfigBackup[] | null> {
    if (this.tableMode === 'missing') {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from(ConfigurationService.BACKUP_TABLE)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        if (isMissingTableError(error)) {
          this.tableMode = 'missing';
        }
        return null;
      }

      this.tableMode = 'available';
      return sanitizeBackups(data);
    } catch {
      return null;
    }
  }

  private async saveBackupToTables(backup: ConfigBackup) {
    if (this.tableMode === 'missing') {
      return false;
    }

    try {
      const { error } = await supabase.from(ConfigurationService.BACKUP_TABLE).insert({
        id: backup.id,
        configuration: backup.configuration,
        created_by: backup.createdBy,
        created_at: backup.createdAt,
        description: backup.description,
        automatic: backup.automatic,
      });

      if (error) {
        if (isMissingTableError(error)) {
          this.tableMode = 'missing';
        }
        return false;
      }

      this.tableMode = 'available';
      return true;
    } catch {
      return false;
    }
  }

  private async getFallbackEnvelope(): Promise<FallbackEnvelope> {
    const remoteConfig = await this.readAdminConfig();
    const localFallback = this.readLocalFallbackEnvelope();

    return {
      configuration: mergeConfiguration(
        (remoteConfig?.appConfiguration || remoteConfig?.configuration || localFallback.configuration) as Partial<AppConfiguration> | undefined,
      ),
      auditLogs: sanitizeAuditLogs(remoteConfig?.configurationAuditLogs || localFallback.auditLogs),
      backups: sanitizeBackups(remoteConfig?.configurationBackups || localFallback.backups),
    };
  }

  private async saveFallbackEnvelope(envelope: FallbackEnvelope) {
    const existingConfig = (await this.readAdminConfig()) || {};
    const nextConfig = {
      ...existingConfig,
      appConfiguration: envelope.configuration,
      configurationAuditLogs: envelope.auditLogs,
      configurationBackups: envelope.backups,
    };

    const savedRemotely = await this.writeAdminConfig(nextConfig);
    this.saveFallbackToLocal(envelope);
    return savedRemotely;
  }

  private async readAdminConfig(): Promise<Record<string, unknown> | null> {
    try {
      const response = await fetch(CONFIG_FUNCTION_URL, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as AdminConfigPayload;
      return isRecord(payload.config) ? payload.config : null;
    } catch {
      return null;
    }
  }

  private async writeAdminConfig(config: Record<string, unknown>) {
    try {
      const response = await fetch(CONFIG_FUNCTION_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  private readLocalFallbackEnvelope(): FallbackEnvelope {
    return {
      configuration: this.getLocalConfiguration(),
      auditLogs: this.getLocalAuditLogs(),
      backups: this.getLocalBackups(),
    };
  }

  private saveFallbackToLocal(envelope: FallbackEnvelope) {
    this.saveLocalConfiguration(envelope.configuration);
    this.saveLocalAuditLogs(envelope.auditLogs);
    this.saveLocalBackups(envelope.backups);
  }

  private getLocalConfiguration(): AppConfiguration {
    try {
      const raw = localStorage.getItem(ConfigurationService.STORAGE_KEY);
      if (raw) {
        return mergeConfiguration(JSON.parse(raw) as Partial<AppConfiguration>);
      }
    } catch {
      // fall through
    }

    return mergeConfiguration();
  }

  private saveLocalConfiguration(config: AppConfiguration) {
    try {
      localStorage.setItem(ConfigurationService.STORAGE_KEY, JSON.stringify(config));
    } catch {
      // ignore
    }
  }

  private getLocalAuditLogs() {
    try {
      const raw = localStorage.getItem(ConfigurationService.AUDIT_STORAGE_KEY);
      return raw ? sanitizeAuditLogs(JSON.parse(raw)) : [];
    } catch {
      return [];
    }
  }

  private saveLocalAuditLogs(logs: ConfigAuditLog[]) {
    try {
      localStorage.setItem(ConfigurationService.AUDIT_STORAGE_KEY, JSON.stringify(logs));
    } catch {
      // ignore
    }
  }

  private getLocalBackups() {
    try {
      const raw = localStorage.getItem(ConfigurationService.BACKUP_STORAGE_KEY);
      return raw ? sanitizeBackups(JSON.parse(raw)) : [];
    } catch {
      return [];
    }
  }

  private saveLocalBackups(backups: ConfigBackup[]) {
    try {
      localStorage.setItem(ConfigurationService.BACKUP_STORAGE_KEY, JSON.stringify(backups));
    } catch {
      // ignore
    }
  }
}

export const configurationService = new ConfigurationService();
