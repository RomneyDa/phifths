import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleOfFifths } from './CircleOfFifths';
import { autoCorrelate } from './pitchDetector';
import {
  CHROMATIC_LABELS,
  type LayoutMode,
  centsOff,
  frequencyToMidi,
  midiToNoteName,
  midiToOctave,
  pitchClassToPosition,
} from './notes';
import './App.css';

type DetectionState = {
  frequency: number;
  midi: number;
  pitchClass: number;
  cents: number;
};

const SMOOTHING_WINDOW = 12;
const SILENCE_TIMEOUT_MS = 500;

export default function App() {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detection, setDetection] = useState<DetectionState | null>(null);
  const [mode, setMode] = useState<LayoutMode>('chromatic');

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const recentRef = useRef<{ midi: number; freq: number }[]>([]);
  const lastDetectionAt = useRef<number>(0);
  const displayedMidiRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close();
    }
    audioCtxRef.current = null;
    recentRef.current = [];
    displayedMidiRef.current = null;
    setListening(false);
    setDetection(null);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      const ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      source.connect(analyser);

      const buf = new Float32Array(analyser.fftSize);
      setListening(true);

      const tick = () => {
        rafRef.current = requestAnimationFrame(tick);
        const a = analyserRef.current;
        const c = audioCtxRef.current;
        if (!a || !c) return;
        a.getFloatTimeDomainData(buf);
        const freq = autoCorrelate(buf, c.sampleRate);

        if (freq > 0) {
          const midi = Math.round(frequencyToMidi(freq));
          const recent = recentRef.current;
          recent.push({ midi, freq });
          if (recent.length > SMOOTHING_WINDOW) recent.shift();
          lastDetectionAt.current = performance.now();

          const sortedMidi = recent.map((r) => r.midi).sort((a1, b1) => a1 - b1);
          const stableMidi = sortedMidi[Math.floor(sortedMidi.length / 2)];

          const matching = recent.filter((r) => r.midi === stableMidi);
          const avgFreq =
            matching.reduce((s, r) => s + r.freq, 0) / Math.max(1, matching.length);

          if (displayedMidiRef.current !== stableMidi || recent.length % 2 === 0) {
            displayedMidiRef.current = stableMidi;
            const pitchClass = ((stableMidi % 12) + 12) % 12;
            setDetection({
              frequency: avgFreq,
              midi: stableMidi,
              pitchClass,
              cents: centsOff(avgFreq),
            });
          }
        } else if (
          displayedMidiRef.current !== null &&
          performance.now() - lastDetectionAt.current > SILENCE_TIMEOUT_MS
        ) {
          recentRef.current = [];
          displayedMidiRef.current = null;
          setDetection(null);
        }
      };
      tick();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not access microphone');
      stop();
    }
  }, [stop]);

  useEffect(() => () => stop(), [stop]);

  const activePosition = useMemo(
    () => (detection ? pitchClassToPosition(detection.pitchClass, mode) : null),
    [detection, mode],
  );

  const noteName = detection ? midiToNoteName(detection.midi) : '—';
  const octave = detection ? midiToOctave(detection.midi) : null;
  const fifthUp = detection ? CHROMATIC_LABELS[(detection.pitchClass + 7) % 12] : null;
  const fifthDown = detection ? CHROMATIC_LABELS[(detection.pitchClass + 5) % 12] : null;

  return (
    <div className="app">
      <h1 className="brand">phifths</h1>
      <a
        className="gh"
        href="https://github.com/RomneyDa/phifths"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View phifths on GitHub"
      >
        <GitHubIcon />
      </a>

      <main className="main">
        <div className="circle-wrap">
          <CircleOfFifths
            activePosition={activePosition}
            cents={detection?.cents ?? null}
            mode={mode}
          />
          <div className="hub">
            <div className="mode-toggle" role="radiogroup" aria-label="Layout mode">
              <button
                role="radio"
                aria-checked={mode === 'chromatic'}
                className={`mode-btn ${mode === 'chromatic' ? 'on' : ''}`}
                onClick={() => setMode('chromatic')}
              >
                Chromatic
              </button>
              <button
                role="radio"
                aria-checked={mode === 'fifths'}
                className={`mode-btn ${mode === 'fifths' ? 'on' : ''}`}
                onClick={() => setMode('fifths')}
              >
                Fifths
              </button>
            </div>
            {listening ? (
              <button onClick={stop} className="btn stop">
                Stop
              </button>
            ) : (
              <button onClick={start} className="btn start">
                Listen
              </button>
            )}
          </div>
        </div>

        <div className="readout">
            <div className="readout-row">
              <span className="readout-label">note</span>
              <span className="readout-value note">
                {noteName}
                {octave !== null && <small>{octave}</small>}
              </span>
            </div>
            <div className="readout-row">
              <span className="readout-label">freq</span>
              <span className="readout-value">
                {detection ? `${detection.frequency.toFixed(1)} Hz` : '—'}
              </span>
            </div>
            <div className="readout-row">
              <span className="readout-label">cents</span>
              <span className="readout-value">
                {detection
                  ? `${detection.cents > 0 ? '+' : ''}${detection.cents.toFixed(0)}`
                  : '—'}
              </span>
            </div>
            <div className="readout-row">
              <span className="readout-label">+ fifth</span>
              <span className="readout-value">{fifthUp ?? '—'}</span>
            </div>
            <div className="readout-row">
              <span className="readout-label">− fifth</span>
              <span className="readout-value">{fifthDown ?? '—'}</span>
            </div>
        </div>

        {error && <div className="error">{error}</div>}
      </main>
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-1.92c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.16 1.18a10.94 10.94 0 0 1 5.75 0c2.2-1.49 3.16-1.18 3.16-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.41-5.27 5.69.41.36.78 1.07.78 2.16v3.21c0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}
