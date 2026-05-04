export type Theme = {
  id: string;
  label: string;
  bg: string;
  surface: string;
  surfaceBlur: string;
  border: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  brand: string;
  brandText: string;
  record: string;
  recordText: string;
  needle: string;
  sectorIdle: string;
  sectorIdleStroke: string;
  activeStroke: string;
  noteColors: readonly [
    string, string, string, string, string, string,
    string, string, string, string, string, string,
  ];
};

const SCRIABIN: Theme['noteColors'] = [
  '#e83a3a', // C   — red
  '#7e3ad6', // C♯  — violet
  '#f5d930', // D   — yellow
  '#7a7780', // D♯  — steel
  '#7ec8e3', // E   — sky blue
  '#a02929', // F   — crimson
  '#3f6dff', // F♯  — bright blue
  '#ff8a3d', // G   — orange
  '#5e2ea3', // G♯  — purple
  '#3ad34f', // A   — green
  '#c79b9b', // A♯  — rose
  '#a3c2dc', // B   — pearly blue
];

const MONOCHROME: Theme['noteColors'] = [
  '#d9a484', '#d9a484', '#d9a484', '#d9a484', '#d9a484', '#d9a484',
  '#d9a484', '#d9a484', '#d9a484', '#d9a484', '#d9a484', '#d9a484',
];

export const themes: Record<string, Theme> = {
  'scriabin-dark': {
    id: 'scriabin-dark',
    label: 'Scriabin',
    bg: '#0a0b14',
    surface: '#15182a',
    surfaceBlur: 'rgba(21, 24, 42, 0.9)',
    border: '#2a2f47',
    text: '#e6e8ff',
    textMuted: '#9aa0c8',
    textSubtle: '#6b7099',
    brand: '#e8a87c',
    brandText: '#1a1206',
    record: '#d97a86',
    recordText: '#1c0710',
    needle: '#ffffff',
    sectorIdle: '#15182a',
    sectorIdleStroke: '#2a2f47',
    activeStroke: '#ffffff',
    noteColors: SCRIABIN,
  },
  'scriabin-light': {
    id: 'scriabin-light',
    label: 'Light',
    bg: '#faf6f0',
    surface: '#ffffff',
    surfaceBlur: 'rgba(255, 255, 255, 0.88)',
    border: '#e6dfd2',
    text: '#1f1c18',
    textMuted: '#6b6357',
    textSubtle: '#9c9489',
    brand: '#b87a5c',
    brandText: '#fdf6ee',
    record: '#a85e6c',
    recordText: '#fdf2f4',
    needle: '#1f1c18',
    sectorIdle: '#f0ebe0',
    sectorIdleStroke: '#e6dfd2',
    activeStroke: '#1f1c18',
    noteColors: SCRIABIN,
  },
  'mono-dark': {
    id: 'mono-dark',
    label: 'Mono',
    bg: '#0a0b14',
    surface: '#15182a',
    surfaceBlur: 'rgba(21, 24, 42, 0.9)',
    border: '#2a2f47',
    text: '#e6e8ff',
    textMuted: '#9aa0c8',
    textSubtle: '#6b7099',
    brand: '#e8a87c',
    brandText: '#1a1206',
    record: '#d97a86',
    recordText: '#1c0710',
    needle: '#ffffff',
    sectorIdle: '#15182a',
    sectorIdleStroke: '#2a2f47',
    activeStroke: '#ffffff',
    noteColors: MONOCHROME,
  },
};

export const THEME_ORDER = ['scriabin-dark', 'scriabin-light', 'mono-dark'] as const;
export const DEFAULT_THEME_ID = 'scriabin-light';

const VAR_NAME: Partial<Record<keyof Theme, string>> = {
  bg: '--bg',
  surface: '--surface',
  surfaceBlur: '--surface-blur',
  border: '--border',
  text: '--text',
  textMuted: '--text-muted',
  textSubtle: '--text-subtle',
  brand: '--brand',
  brandText: '--brand-text',
  record: '--record',
  recordText: '--record-text',
  needle: '--needle',
  sectorIdle: '--sector-idle',
  sectorIdleStroke: '--sector-idle-stroke',
};

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  for (const key of Object.keys(VAR_NAME) as (keyof Theme)[]) {
    const cssVar = VAR_NAME[key];
    if (!cssVar) continue;
    root.style.setProperty(cssVar, theme[key] as string);
  }
  root.dataset.theme = theme.id;
}

export function contrastText(hex: string): string {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return '#0a0b14';
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma > 150 ? '#0a0b14' : '#ffffff';
}
