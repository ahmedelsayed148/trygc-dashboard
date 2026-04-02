import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  AppConfiguration,
  ConfigAuditLog,
  ConfigBackup,
  ConfigCategory,
  configurationService,
  DEFAULT_CONFIGURATION,
} from '../lib/configurationService';
import { applyConfigurationToDocument } from '../lib/configurationAppearance';

interface ConfigurationContextType {
  configuration: AppConfiguration;
  isLoading: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  error: string | null;
  updateConfig: (
    category: ConfigCategory,
    changes: Partial<AppConfiguration[ConfigCategory]>,
  ) => Promise<void>;
  replaceConfiguration: (configuration: Partial<AppConfiguration>) => Promise<void>;
  reloadConfig: () => Promise<void>;
  getAuditLogs: (limit?: number) => Promise<ConfigAuditLog[]>;
  getBackups: (limit?: number) => Promise<ConfigBackup[]>;
  createManualBackup: (description: string) => Promise<void>;
  restoreBackup: (backupId: string) => Promise<void>;
}

const ConfigurationContext = createContext<ConfigurationContextType | undefined>(undefined);

interface ConfigurationProviderProps {
  children: React.ReactNode;
  /** The authenticated user's ID (e.g. their email) */
  userId: string;
  /** The authenticated user's display name */
  userName: string;
}

export function ConfigurationProvider({
  children,
  userId,
  userName,
}: ConfigurationProviderProps) {
  const [configuration, setConfiguration] = useState<AppConfiguration>(DEFAULT_CONFIGURATION);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Load ────────────────────────────────────────────────────────────────────
  const loadConfiguration = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const config = await configurationService.getConfiguration();
      setConfiguration(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      setError(null);
      setConfiguration(DEFAULT_CONFIGURATION);
      return;
    }

    loadConfiguration();
  }, [userId, loadConfiguration]);
  useEffect(() => { applyConfigurationToDocument(configuration); }, [configuration]);

  // ── Update ──────────────────────────────────────────────────────────────────
  const updateConfig = useCallback(
    async (category: ConfigCategory, changes: Partial<AppConfiguration[ConfigCategory]>) => {
      if (!userId) throw new Error('User not authenticated');
      setIsSaving(true);
      setError(null);
      try {
        const updated = await configurationService.updateConfiguration(
          category,
          changes,
          userId,
          userName,
        );
        setConfiguration(updated);
        setLastSaved(new Date());
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to save configuration';
        setError(msg);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [userId, userName],
  );

  const replaceConfiguration = useCallback(
    async (nextConfiguration: Partial<AppConfiguration>) => {
      if (!userId) throw new Error('User not authenticated');
      setIsSaving(true);
      setError(null);
      try {
        const updated = await configurationService.replaceConfiguration(
          nextConfiguration,
          userId,
          userName,
        );
        setConfiguration(updated);
        setLastSaved(new Date());
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to replace configuration';
        setError(msg);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [userId, userName],
  );

  const reloadConfig = useCallback(async () => { await loadConfiguration(); }, [loadConfiguration]);

  // ── Audit / Backup ──────────────────────────────────────────────────────────
  const getAuditLogs = useCallback(
    async (limit = 50) => configurationService.getAuditLogs(limit),
    [],
  );

  const getBackups = useCallback(
    async (limit = 20) => configurationService.getBackups(limit),
    [],
  );

  const createManualBackup = useCallback(
    async (description: string) => {
      if (!userId) throw new Error('User not authenticated');
      const config = await configurationService.getConfiguration();
      await configurationService.createBackup(config, userId, description, false);
    },
    [userId],
  );

  const restoreBackup = useCallback(
    async (backupId: string) => {
      if (!userId) throw new Error('User not authenticated');
      await configurationService.restoreFromBackup(backupId, userId, userName);
      await loadConfiguration();
    },
    [userId, userName, loadConfiguration],
  );

  return (
    <ConfigurationContext.Provider
      value={{
        configuration,
        isLoading,
        isSaving,
        lastSaved,
        error,
        updateConfig,
        replaceConfiguration,
        reloadConfig,
        getAuditLogs,
        getBackups,
        createManualBackup,
        restoreBackup,
      }}
    >
      {children}
    </ConfigurationContext.Provider>
  );
}

export function useConfiguration() {
  const ctx = useContext(ConfigurationContext);
  if (!ctx) throw new Error('useConfiguration must be used within ConfigurationProvider');
  return ctx;
}
