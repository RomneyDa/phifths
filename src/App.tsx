import { useCallback, useEffect, useRef, useState } from 'react';
import { CircleOfFifths } from './CircleOfFifths';
import { autoCorrelate } from './pitchDetector';
import {
  CIRCLE_LABELS,
  centsOff,
  frequencyToMidi,
  midiToNoteName,
  midiToOctave,
  pitchClassToCirclePosition,
} from './notes';
import './App.css';

type DetectionState = {
  frequency: number;
  midi: number;
  pitchClass: number;
  circlePosition: number;
  cents: number;
};

export default function App() {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detection, setDetection] = useState<DetectionState | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  // Persist the most recent detection across silent frames so the highlight
  // doesn't flicker between every short pause.
  const lastDetectionAt = useRef<number>(0);

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
          const midi = frequencyToMidi(freq);
          const rounded = Math.round(midi);
          const pitchClass = ((rounded % 12) + 12) % 12;
          const circlePosition = pitchClassToCirclePosition(pitchClass);
          setDetection({
            frequency: freq,
            midi: rounded,
            pitchClass,
            circlePosition,
            cents: centsOff(freq),
          });
          lastDetectionAt.current = performance.now();
        } else if (performance.now() - lastDetectionAt.current > 600) {
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

  const noteName = detection ? midiToNoteName(detection.midi) : '—';
  const octave = detection ? midiToOctave(detection.midi) : null;
  const fifthUp =
    detection !== null ? CIRCLE_LABELS[(detection.circlePosition + 1) % 12] : null;
  const fifthDown =
    detection !== null ? CIRCLE_LABELS[(detection.circlePosition + 11) % 12] : null;

  return (
    <div className="app">
      <header>
        <h1>phifths</h1>
        <p className="tagline">
          Sing or play a note. The circle of fifths lights up live, with every
          position labeled by how many fifths it sits from your note.
        </p>
      </header>

      <div className="circle-wrap">
        <CircleOfFifths activePosition={detection?.circlePosition ?? null} />
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
          <span className="readout-label">+1 fifth</span>
          <span className="readout-value">{fifthUp ?? '—'}</span>
        </div>
        <div className="readout-row">
          <span className="readout-label">−1 fifth</span>
          <span className="readout-value">{fifthDown ?? '—'}</span>
        </div>
      </div>

      <div className="controls">
        {listening ? (
          <button onClick={stop} className="btn stop">
            Stop listening
          </button>
        ) : (
          <button onClick={start} className="btn start">
            Start listening
          </button>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      <footer>
        <p>
          Position numbers (+1, −1, …) show signed distance in fifths. A perfect
          fifth above your note sits one step clockwise; a perfect fourth above
          (a fifth below) sits one step counterclockwise.
        </p>
      </footer>
    </div>
  );
}
