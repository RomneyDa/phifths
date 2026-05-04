export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

// Circle of Fifths order (clockwise from top, starting at C).
// Each entry is the pitch class (0-11) at that position.
export const CIRCLE_PITCH_CLASSES = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5] as const;

// Display labels (sharp/flat conventions for the circle).
export const CIRCLE_LABELS = [
  'C', 'G', 'D', 'A', 'E', 'B', 'F♯/G♭', 'C♯/D♭', 'A♭', 'E♭', 'B♭', 'F',
] as const;

export function pitchClassToCirclePosition(pc: number): number {
  return CIRCLE_PITCH_CLASSES.indexOf(pc as (typeof CIRCLE_PITCH_CLASSES)[number]);
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

// How far each circle position is from `fromPos`, expressed as signed fifths
// in the range [-6, 6]. Positive = clockwise (sharper), negative = counterclockwise (flatter).
export function signedFifthsDistance(fromPos: number, toPos: number): number {
  let diff = (toPos - fromPos) % 12;
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
