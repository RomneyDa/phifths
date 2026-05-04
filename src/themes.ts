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
  brand1: string;
  brand2: string;
  needle: string;
  sectorIdle: string;
  sectorIdleStroke: string;
  activeStroke: string;
  noteColors: readonly [
    string, string, string, string, string, string,
    string, string, string, string, string, string,
  ];
  // Whether labels over an active note swatch should be light or dark.
  // Auto-computed per-color when not specified.
  noteContrast?: 'light' | 'dark';
};

// Scriabin's chromesthesia mapping. Pitch class index = chromatic semitone (C=0).
// Going around the circle of fifths these form a smooth rainbow:
// C → G → D → A → E → B → F♯ → C♯ → G♯ → D♯ → A♯ → F → C
// red → orange → yellow → green → sky → pearly → bright blue → violet → purple → steel → rose → crimson
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
  '#7aa2ff', '#7aa2ff', '#7aa2ff', '#7aa2ff', '#7aa2ff', '#7aa2ff',
  '#7aa2ff', '#7aa2ff', '#7aa2ff', '#7aa2ff', '#7aa2ff', '#7aa2ff',
];

export const themes: Record<string, Theme> = {
  'scriabin-dark': {
    id: 'scriabin-dark',
    label: 'Scriabin',
    bg: '#0a0b14',
    surface: '#0f1224',
    surfaceBlur: 'rgba(15, 18, 36, 0.9)',
    border: '#22263a',
    text: '#e6e8ff',
    textMuted: '#9aa0c8',
    textSubtle: '#6b7099',
    brand1: '#7aa2ff',
    brand2: '#b58dff',
    needle: '#ffffff',
    sectorIdle: '#15182a',
    sectorIdleStroke: '#22263a',
    activeStroke: '#ffffff',
    noteColors: SCRIABIN,
  },
  'scriabin-light': {
    id: 'scriabin-light',
    label: 'Light',
    bg: '#f6f6fb',
    surface: '#ffffff',
    surfaceBlur: 'rgba(255, 255, 255, 0.85)',
    border: '#dde0eb',
    text: '#1a1d2e',
    textMuted: '#5b6079',
    textSubtle: '#8a8fa8',
    brand1: '#3f5fb8',
    brand2: '#7e3ad6',
    needle: '#1a1d2e',
    sectorIdle: '#eceef5',
    sectorIdleStroke: '#dde0eb',
    activeStroke: '#1a1d2e',
    noteColors: SCRIABIN,
  },
  'mono-dark': {
    id: 'mono-dark',
    label: 'Mono',
    bg: '#0a0b14',
    surface: '#0f1224',
    surfaceBlur: 'rgba(15, 18, 36, 0.9)',
    border: '#22263a',
    text: '#e6e8ff',
    textMuted: '#9aa0c8',
    textSubtle: '#6b7099',
    brand1: '#7aa2ff',
    brand2: '#b58dff',
    needle: '#ffffff',
    sectorIdle: '#15182a',
    sectorIdleStroke: '#22263a',
    activeStroke: '#ffffff',
    noteColors: MONOCHROME,
  },
};

export const THEME_ORDER = ['scriabin-dark', 'scriabin-light', 'mono-dark'] as const;
export const DEFAULT_THEME_ID = 'scriabin-dark';

const ROOT_VAR_KEYS: (keyof Theme)[] = [
  'bg',
  'surface',
  'surfaceBlur',
  'border',
  'text',
  'textMuted',
  'textSubtle',
  'brand1',
  'brand2',
  'needle',
  'sectorIdle',
  'sectorIdleStroke',
];

const VAR_NAME: Partial<Record<keyof Theme, string>> = {
  bg: '--bg',
  surface: '--surface',
  surfaceBlur: '--surface-blur',
  border: '--border',
  text: '--text',
  textMuted: '--text-muted',
  textSubtle: '--text-subtle',
  brand1: '--brand-1',
  brand2: '--brand-2',
  needle: '--needle',
  sectorIdle: '--sector-idle',
  sectorIdleStroke: '--sector-idle-stroke',
};

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  for (const key of ROOT_VAR_KEYS) {
    const cssVar = VAR_NAME[key];
    if (!cssVar) continue;
    root.style.setProperty(cssVar, theme[key] as string);
  }
  root.dataset.theme = theme.id;
}

// Pick a contrasting label color for an active sector, given its swatch color.
export function contrastText(hex: string): string {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return '#0a0b14';
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma > 150 ? '#0a0b14' : '#ffffff';
}
