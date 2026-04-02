import type { AppConfiguration } from './configurationService';

type DensityMode = AppConfiguration['workspace']['desktopDensity'];
type WidthMode = AppConfiguration['workspace']['contentWidth'];
type RadiusMode = AppConfiguration['workspace']['panelRadius'];

const DENSITY_TOKENS: Record<DensityMode, Record<string, string>> = {
  comfortable: {
    '--app-sidebar-width': '236px',
    '--app-sidebar-collapsed-width': '74px',
    '--app-shell-padding-x': '28px',
    '--app-shell-padding-y': '22px',
    '--app-topbar-padding-x': '28px',
    '--app-topbar-padding-y': '16px',
  },
  compact: {
    '--app-sidebar-width': '220px',
    '--app-sidebar-collapsed-width': '68px',
    '--app-shell-padding-x': '22px',
    '--app-shell-padding-y': '18px',
    '--app-topbar-padding-x': '22px',
    '--app-topbar-padding-y': '13px',
  },
  dense: {
    '--app-sidebar-width': '208px',
    '--app-sidebar-collapsed-width': '64px',
    '--app-shell-padding-x': '18px',
    '--app-shell-padding-y': '14px',
    '--app-topbar-padding-x': '18px',
    '--app-topbar-padding-y': '11px',
  },
};

const WIDTH_TOKENS: Record<WidthMode, string> = {
  standard: '1280px',
  wide: '1440px',
  full: '1600px',
};

const RADIUS_TOKENS: Record<RadiusMode, Record<string, string>> = {
  soft: {
    '--app-card-radius': '30px',
    '--app-card-radius-sm': '20px',
  },
  rounded: {
    '--app-card-radius': '24px',
    '--app-card-radius-sm': '16px',
  },
  sharp: {
    '--app-card-radius': '18px',
    '--app-card-radius-sm': '12px',
  },
};

function normalizeHexColor(value: string, fallback: string) {
  const trimmed = value.trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed) ? trimmed : fallback;
}

function expandHex(hex: string) {
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex;
}

function hexToRgbChannels(hex: string) {
  const normalized = expandHex(hex);
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  return `${red} ${green} ${blue}`;
}

function getContrastChannels(hex: string) {
  const normalized = expandHex(hex);
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.62 ? '17 24 39' : '255 255 255';
}

export function applyConfigurationToDocument(configuration: AppConfiguration) {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  const primaryColor = normalizeHexColor(configuration.system.primaryColor, '#000000');
  const secondaryColor = normalizeHexColor(configuration.system.secondaryColor, '#ffffff');
  const densityTokens = DENSITY_TOKENS[configuration.workspace.desktopDensity] || DENSITY_TOKENS.compact;
  const radiusTokens = RADIUS_TOKENS[configuration.workspace.panelRadius] || RADIUS_TOKENS.rounded;

  root.style.setProperty('--app-primary', primaryColor);
  root.style.setProperty('--app-primary-rgb', hexToRgbChannels(primaryColor));
  root.style.setProperty('--app-primary-contrast-rgb', getContrastChannels(primaryColor));
  root.style.setProperty('--app-secondary', secondaryColor);
  root.style.setProperty('--app-secondary-rgb', hexToRgbChannels(secondaryColor));
  root.style.setProperty('--app-shell-max-width', WIDTH_TOKENS[configuration.workspace.contentWidth] || WIDTH_TOKENS.wide);

  Object.entries(densityTokens).forEach(([token, value]) => root.style.setProperty(token, value));
  Object.entries(radiusTokens).forEach(([token, value]) => root.style.setProperty(token, value));

  root.dataset.surfaceStyle = configuration.workspace.surfaceStyle;
  root.dataset.desktopDensity = configuration.workspace.desktopDensity;
}
