// Autocorrelation-based pitch detector. Adapted from the well-known
// Chris Wilson PitchDetect example, with light cleanup.
// Returns frequency in Hz, or -1 if no confident pitch was found.
export function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  let size = buf.length;
  let rms = 0;
  for (let i = 0; i < size; i++) {
    const v = buf[i];
    rms += v * v;
  }
  rms = Math.sqrt(rms / size);
  if (rms < 0.01) return -1; // too quiet

  // Trim leading/trailing silence below threshold.
  const threshold = 0.2;
  let r1 = 0;
  let r2 = size - 1;
  for (let i = 0; i < size / 2; i++) {
    if (Math.abs(buf[i]) < threshold) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < size / 2; i++) {
    if (Math.abs(buf[size - i]) < threshold) {
      r2 = size - i;
      break;
    }
  }

  const trimmed = buf.slice(r1, r2);
  size = trimmed.length;
  if (size < 2) return -1;

  // Autocorrelation.
  const c = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    let sum = 0;
    for (let j = 0; j < size - i; j++) {
      sum += trimmed[j] * trimmed[j + i];
    }
    c[i] = sum;
  }

  // Find the first decline, then the next maximum.
  let d = 0;
  while (d + 1 < size && c[d] > c[d + 1]) d++;

  let maxVal = -1;
  let maxPos = -1;
  for (let i = d; i < size; i++) {
    if (c[i] > maxVal) {
      maxVal = c[i];
      maxPos = i;
    }
  }
  if (maxPos <= 0) return -1;

  // Parabolic interpolation around the peak for sub-sample accuracy.
  let t0 = maxPos;
  if (maxPos > 0 && maxPos < size - 1) {
    const x1 = c[maxPos - 1];
    const x2 = c[maxPos];
    const x3 = c[maxPos + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a !== 0) t0 = maxPos - b / (2 * a);
  }

  const freq = sampleRate / t0;
  if (freq < 50 || freq > 2000) return -1; // out of vocal/instrument range
  return freq;
}
