export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

// Circle of Fifths order (clockwise from top, starting at C).
// Each entry is the pitch class (0-11) at that position.
export const CIRCLE_PITCH_CLASSES = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5] as const;

// Display labels for each layout mode.
export const FIFTHS_LABELS = [
  'C', 'G', 'D', 'A', 'E', 'B', 'F♯/G♭', 'C♯/D♭', 'A♭', 'E♭', 'B♭', 'F',
] as const;

export const CHROMATIC_LABELS = [
  'C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B',
] as const;

export type LayoutMode = 'fifths' | 'chromatic';

export function pitchClassToPosition(pc: number, mode: LayoutMode): number {
  if (mode === 'chromatic') return pc;
  return CIRCLE_PITCH_CLASSES.indexOf(pc as (typeof CIRCLE_PITCH_CLASSES)[number]);
}

export function positionToPitchClass(pos: number, mode: LayoutMode): number {
  if (mode === 'chromatic') return pos;
  return CIRCLE_PITCH_CLASSES[pos];
}

export function labelsForMode(mode: LayoutMode): readonly string[] {
  return mode === 'chromatic' ? CHROMATIC_LABELS : FIFTHS_LABELS;
}

export function frequencyToMidi(frequency: number): number {
  return 12 * Math.log2(frequency / 440) + 69;
}

export function midiToNoteName(midi: number): string {
  return NOTE_NAMES[((Math.round(midi) % 12) + 12) % 12];
}

export function midiToOctave(midi: number): number {
  return Math.floor(Math.round(midi) / 12) - 1;
}

// Signed distance in fifths (range [-6, 6]) between two pitch classes.
// Positive = clockwise on the circle of fifths (sharper); negative = counterclockwise.
export function signedFifthsBetweenPitchClasses(fromPc: number, toPc: number): number {
  const fromCircle = CIRCLE_PITCH_CLASSES.indexOf(fromPc as (typeof CIRCLE_PITCH_CLASSES)[number]);
  const toCircle = CIRCLE_PITCH_CLASSES.indexOf(toPc as (typeof CIRCLE_PITCH_CLASSES)[number]);
  let diff = (toCircle - fromCircle) % 12;
  if (diff > 6) diff -= 12;
  if (diff <= -6) diff += 12;
  return diff;
}

// Cents off from the nearest equal-tempered note, in [-50, 50].
export function centsOff(frequency: number): number {
  const midi = frequencyToMidi(frequency);
  const nearest = Math.round(midi);
  return (midi - nearest) * 100;
}
