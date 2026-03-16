export const FONT_OPTIONS = [
  {
    id: 'inter',
    label: 'Inter',
    description: 'Balanced product UI with clean spacing.',
    fontFamily: 'var(--font-inter), "Segoe UI", system-ui, sans-serif',
    sample: 'Balanced product UI with clean spacing.',
  },
  {
    id: 'system',
    label: 'System UI',
    description: 'Native desktop feel with OS default text rendering.',
    fontFamily: '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    sample: 'Native desktop feel with OS default text rendering.',
  },
  {
    id: 'manrope',
    label: 'Manrope',
    description: 'Soft geometric shapes for polished dashboards.',
    fontFamily: 'var(--font-manrope), "Segoe UI", system-ui, sans-serif',
    sample: 'Soft geometric shapes for polished dashboards.',
  },
  {
    id: 'outfit',
    label: 'Outfit',
    description: 'Rounded contemporary tone with slightly wider forms.',
    fontFamily: 'var(--font-outfit), "Segoe UI", system-ui, sans-serif',
    sample: 'Rounded contemporary tone with slightly wider forms.',
  },
  {
    id: 'dmSans',
    label: 'DM Sans',
    description: 'Friendly and modern without feeling playful.',
    fontFamily: 'var(--font-dm-sans), "Helvetica Neue", Arial, sans-serif',
    sample: 'Friendly and modern without feeling playful.',
  },
  {
    id: 'plusJakarta',
    label: 'Plus Jakarta',
    description: 'Sharp interface rhythm for dense admin screens.',
    fontFamily: 'var(--font-plus-jakarta), "Segoe UI", system-ui, sans-serif',
    sample: 'Sharp interface rhythm for dense admin screens.',
  },
  {
    id: 'spaceGrotesk',
    label: 'Space Grotesk',
    description: 'Tech-forward display styling for a bolder shell.',
    fontFamily: 'var(--font-space-grotesk), "Arial", sans-serif',
    sample: 'Tech-forward display styling for a bolder shell.',
  },
  {
    id: 'sourceSans',
    label: 'Source Sans 3',
    description: 'Neutral readability tuned for long operational views.',
    fontFamily: 'var(--font-source-sans), "Trebuchet MS", sans-serif',
    sample: 'Neutral readability tuned for long operational views.',
  },
  {
    id: 'merriweather',
    label: 'Merriweather',
    description: 'Editorial serif option for a more formal workspace.',
    fontFamily: 'var(--font-merriweather), Georgia, serif',
    sample: 'Editorial serif option for a more formal workspace.',
  },
  {
    id: 'ibmPlexMono',
    label: 'IBM Plex Mono',
    description: 'Structured monospace suited to operational data.',
    fontFamily: 'var(--font-ibm-plex-mono), "Cascadia Code", "Courier New", monospace',
    sample: 'Structured monospace suited to operational data.',
  },
  {
    id: 'jetbrainsMono',
    label: 'JetBrains Mono',
    description: 'Compact coding font with strong character contrast.',
    fontFamily: 'var(--font-jetbrains-mono), "Cascadia Code", "Courier New", monospace',
    sample: 'Compact coding font with strong character contrast.',
  },
  {
    id: 'figtree',
    label: 'Figtree',
    description: 'Readable UI-first family with crisp small text rendering.',
    fontFamily: 'var(--font-figtree), "Segoe UI", system-ui, sans-serif',
    sample: 'Readable UI-first family with crisp small text rendering.',
  },
  {
    id: 'rubik',
    label: 'Rubik',
    description: 'Rounded geometric style that still feels structured.',
    fontFamily: 'var(--font-rubik), "Segoe UI", system-ui, sans-serif',
    sample: 'Rounded geometric style that still feels structured.',
  },
  {
    id: 'poppins',
    label: 'Poppins',
    description: 'Bold contemporary display feel for more visual presence.',
    fontFamily: 'var(--font-poppins), "Segoe UI", system-ui, sans-serif',
    sample: 'Bold contemporary display feel for more visual presence.',
  },
  {
    id: 'publicSans',
    label: 'Public Sans',
    description: 'Neutral high-legibility text tuned for dense admin surfaces.',
    fontFamily: 'var(--font-public-sans), "Segoe UI", system-ui, sans-serif',
    sample: 'Neutral high-legibility text tuned for dense admin surfaces.',
  },
] as const;

export type FontFamilyId = (typeof FONT_OPTIONS)[number]['id'];

export const FONT_FAMILY_TOKENS = FONT_OPTIONS.reduce(
  (tokens, option) => {
    tokens[option.id] = option.fontFamily;
    return tokens;
  },
  {} as Record<FontFamilyId, string>,
);

export const FONT_SCALE_PRESETS = [
  { id: 'xs', label: '75%', scale: 0.75, description: 'Extra compact layout density.' },
  { id: 'sm', label: '85%', scale: 0.85, description: 'Compact text with tighter cards.' },
  { id: 'md', label: '95%', scale: 0.95, description: 'Slightly smaller than default.' },
  { id: 'base', label: '100%', scale: 1, description: 'Default workspace sizing.' },
  { id: 'lg', label: '110%', scale: 1.1, description: 'More comfortable reading size.' },
  { id: 'xl', label: '120%', scale: 1.2, description: 'Large type for dashboards and meetings.' },
  { id: '2xl', label: '130%', scale: 1.3, description: 'Very large text for high-visibility use.' },
  { id: '3xl', label: '145%', scale: 1.45, description: 'Maximum accessibility-oriented scale.' },
] as const;

export type ThemeColorPreset = {
  id: string;
  label: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
};

export const THEME_COLOR_PRESETS: ThemeColorPreset[] = [
  {
    id: 'monochrome',
    label: 'Monochrome',
    description: 'Default black and white foundation.',
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
  },
  {
    id: 'graphite',
    label: 'Graphite',
    description: 'Soft neutral pairing with a darker edge.',
    primaryColor: '#18181b',
    secondaryColor: '#a1a1aa',
  },
  {
    id: 'slate',
    label: 'Slate',
    description: 'Cool industrial gray with quiet contrast.',
    primaryColor: '#334155',
    secondaryColor: '#cbd5e1',
  },
  {
    id: 'stone',
    label: 'Stone',
    description: 'Warm mineral neutrals for softer surfaces.',
    primaryColor: '#292524',
    secondaryColor: '#d6d3d1',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    description: 'Deep navy base with bright coastal contrast.',
    primaryColor: '#0f172a',
    secondaryColor: '#38bdf8',
  },
  {
    id: 'cobalt',
    label: 'Cobalt',
    description: 'Strong blue accent for a crisp command look.',
    primaryColor: '#1d4ed8',
    secondaryColor: '#93c5fd',
  },
  {
    id: 'skyline',
    label: 'Skyline',
    description: 'Airy blue palette that stays high-contrast.',
    primaryColor: '#0369a1',
    secondaryColor: '#7dd3fc',
  },
  {
    id: 'teal',
    label: 'Teal',
    description: 'Controlled cyan tone with sharp highlights.',
    primaryColor: '#0f766e',
    secondaryColor: '#5eead4',
  },
  {
    id: 'mint',
    label: 'Mint',
    description: 'Cool green with clean system-style energy.',
    primaryColor: '#065f46',
    secondaryColor: '#6ee7b7',
  },
  {
    id: 'emerald',
    label: 'Emerald',
    description: 'Bright success-oriented green pairing.',
    primaryColor: '#166534',
    secondaryColor: '#86efac',
  },
  {
    id: 'forest',
    label: 'Forest',
    description: 'Dark green primary with herbal contrast.',
    primaryColor: '#14532d',
    secondaryColor: '#bef264',
  },
  {
    id: 'lime',
    label: 'Lime',
    description: 'Acid green notes for more energetic accents.',
    primaryColor: '#365314',
    secondaryColor: '#d9f99d',
  },
  {
    id: 'amber',
    label: 'Amber',
    description: 'Warm warning-style gold without oversaturation.',
    primaryColor: '#92400e',
    secondaryColor: '#fcd34d',
  },
  {
    id: 'copper',
    label: 'Copper',
    description: 'Burnished orange pair with metallic depth.',
    primaryColor: '#9a3412',
    secondaryColor: '#fdba74',
  },
  {
    id: 'coral',
    label: 'Coral',
    description: 'Brighter orange-red for louder calls to action.',
    primaryColor: '#c2410c',
    secondaryColor: '#fb923c',
  },
  {
    id: 'crimson',
    label: 'Crimson',
    description: 'Serious alert palette with soft rose lift.',
    primaryColor: '#991b1b',
    secondaryColor: '#fca5a5',
  },
  {
    id: 'rose',
    label: 'Rose',
    description: 'Warm pink-red accent with modern contrast.',
    primaryColor: '#be123c',
    secondaryColor: '#fda4af',
  },
  {
    id: 'orchid',
    label: 'Orchid',
    description: 'Vibrant magenta accent for a sharper visual identity.',
    primaryColor: '#a21caf',
    secondaryColor: '#f0abfc',
  },
  {
    id: 'plum',
    label: 'Plum',
    description: 'Muted violet pairing with deeper primary weight.',
    primaryColor: '#6b21a8',
    secondaryColor: '#ddd6fe',
  },
  {
    id: 'indigo',
    label: 'Indigo',
    description: 'Dark blue-violet with clean soft highlights.',
    primaryColor: '#3730a3',
    secondaryColor: '#a5b4fc',
  },
];

function normalizeColorToken(value: string) {
  return value.trim().toLowerCase();
}

export function matchesThemePreset(
  primaryColor: string,
  secondaryColor: string,
  preset: Pick<ThemeColorPreset, 'primaryColor' | 'secondaryColor'>,
) {
  return (
    normalizeColorToken(primaryColor) === normalizeColorToken(preset.primaryColor)
    && normalizeColorToken(secondaryColor) === normalizeColorToken(preset.secondaryColor)
  );
}
