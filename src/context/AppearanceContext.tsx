import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { FONT_FAMILY_TOKENS, type FontFamilyId } from "../lib/appearanceOptions";

export type { FontFamilyId } from "../lib/appearanceOptions";

type AppearanceState = {
  fontFamily: FontFamilyId;
  fontScale: number;
};

type AppearanceContextType = AppearanceState & {
  resetAppearance: () => void;
  setFontFamily: (fontFamily: FontFamilyId) => void;
  setFontScale: (fontScale: number) => void;
};

const STORAGE_KEY = "trygc-appearance-settings";
const DEFAULT_APPEARANCE: AppearanceState = {
  fontFamily: "inter",
  fontScale: 1,
};

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

function normalizeFontScale(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_APPEARANCE.fontScale;
  }

  return Math.min(1.45, Math.max(0.75, Math.round(value * 100) / 100));
}

function normalizeAppearance(input: unknown): AppearanceState {
  if (!input || typeof input !== "object") {
    return DEFAULT_APPEARANCE;
  }

  const candidate = input as Partial<AppearanceState>;
  const fontFamily = candidate.fontFamily && candidate.fontFamily in FONT_FAMILY_TOKENS
    ? candidate.fontFamily
    : DEFAULT_APPEARANCE.fontFamily;

  return {
    fontFamily,
    fontScale: normalizeFontScale(candidate.fontScale ?? DEFAULT_APPEARANCE.fontScale),
  };
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearance] = useState<AppearanceState>(DEFAULT_APPEARANCE);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return;
      }

      setAppearance(normalizeAppearance(JSON.parse(stored)));
    } catch (_error) {
      setAppearance(DEFAULT_APPEARANCE);
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    root.style.setProperty("--app-font-family", FONT_FAMILY_TOKENS[appearance.fontFamily]);
    root.style.setProperty("--app-font-scale", String(appearance.fontScale));
    root.dataset.fontFamily = appearance.fontFamily;

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance));
    }
  }, [appearance]);

  const value = useMemo<AppearanceContextType>(() => ({
    ...appearance,
    resetAppearance: () => setAppearance(DEFAULT_APPEARANCE),
    setFontFamily: (fontFamily) => setAppearance((current) => ({ ...current, fontFamily })),
    setFontScale: (fontScale) =>
      setAppearance((current) => ({ ...current, fontScale: normalizeFontScale(fontScale) })),
  }), [appearance]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error("useAppearance must be used within AppearanceProvider");
  }

  return context;
}
