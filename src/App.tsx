import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleOfFifths } from './CircleOfFifths';
import { RecordingsStrip } from './RecordingsStrip';
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
import {
  type Frame,
  type Recording,
  defaultName,
  formatDuration,
  newId,
  saveRecording,
} from './recordings';
import {
  DEFAULT_THEME_ID,
  THEME_ORDER,
  applyTheme,
  themes,
} from './themes';
import './App.css';

type DetectionState = {
  frequency: number;
  midi: number;
  pitchClass: number;
  cents: number;
};

type Phase = 'idle' | 'live' | 'playback';

const SMOOTHING_WINDOW = 12;
const SILENCE_TIMEOUT_MS = 500;
const MIN_RECORDING_MS = 500;

export default function App() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [detection, setDetection] = useState<DetectionState | null>(null);
  const [recordMode, setRecordMode] = useState(false);
  const [playback, setPlayback] = useState<Recording | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [libraryRefresh, setLibraryRefresh] = useState(0);

  const [mode, setMode] = useState<LayoutMode>(() => {
    const stored = typeof window !== 'undefined' && localStorage.getItem('phifths.mode');
    return stored === 'fifths' || stored === 'chromatic' ? stored : 'chromatic';
  });

  const [themeId, setThemeId] = useState<string>(() => {
    const stored = typeof window !== 'undefined' && localStorage.getItem('phifths.theme');
    return stored && stored in themes ? stored : DEFAULT_THEME_ID;
  });
  const theme = themes[themeId];

  useEffect(() => {
    localStorage.setItem('phifths.mode', mode);
  }, [mode]);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('phifths.theme', themeId);
  }, [theme, themeId]);

  const cycleTheme = useCallback(() => {
    setThemeId((prev) => {
      const idx = THEME_ORDER.indexOf(prev as (typeof THEME_ORDER)[number]);
      return THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    });
  }, []);

  // Audio refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  // Live detection refs
  const recentRef = useRef<{ midi: number; freq: number }[]>([]);
  const lastDetectionAt = useRef<number>(0);
  const displayedMidiRef = useRef<number | null>(null);

  // Recording refs
  const recordingFramesRef = useRef<Frame[]>([]);
  const recordingStartRef = useRef<number>(0);
  const lastFrameAtRef = useRef<number>(0);
  const recordModeAtStartRef = useRef<boolean>(false);

  // Playback refs
  const playbackStartRef = useRef<number>(0);
  const playbackCursorRef = useRef<number>(0);
  const playbackRef = useRef<Recording | null>(null);
  const elapsedRef = useRef<number>(0);

  const cancelRaf = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const teardownAudio = () => {
    cancelRaf();
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
  };

  const pushFrame = (midi: number | null, det: DetectionState | null) => {
    if (!recordModeAtStartRef.current) return;
    const t = performance.now() - recordingStartRef.current;
    if (det && midi !== null) {
      recordingFramesRef.current.push({
        t,
        midi,
        cents: det.cents,
        freq: det.frequency,
        pc: det.pitchClass,
      });
    } else {
      // Avoid duplicating consecutive silence frames.
      const last = recordingFramesRef.current[recordingFramesRef.current.length - 1];
      if (!last || last.midi !== null) {
        recordingFramesRef.current.push({ t, midi: null, cents: 0, freq: 0, pc: 0 });
      }
    }
    lastFrameAtRef.current = t;
  };

  const stopLive = useCallback(async () => {
    teardownAudio();
    setDetection(null);

    const wasRecording = recordModeAtStartRef.current;
    recordModeAtStartRef.current = false;
    setPhase('idle');
    setElapsed(0);

    if (wasRecording) {
      const frames = recordingFramesRef.current;
      const duration = frames.length > 0 ? frames[frames.length - 1].t : 0;
      recordingFramesRef.current = [];
      if (duration >= MIN_RECORDING_MS && frames.length > 1) {
        const createdAt = Date.now();
        await saveRecording({
          id: newId(),
          name: defaultName(createdAt),
          createdAt,
          duration,
          frames,
        });
        setLibraryRefresh((n) => n + 1);
      }
    }
  }, []);

  const startLive = useCallback(async () => {
    if (phase !== 'idle') return;
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

      recordingFramesRef.current = [];
      recordingStartRef.current = performance.now();
      lastFrameAtRef.current = 0;
      recordModeAtStartRef.current = recordMode;
      setPhase('live');
      setElapsed(0);

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
            const det: DetectionState = {
              frequency: avgFreq,
              midi: stableMidi,
              pitchClass,
              cents: centsOff(avgFreq),
            };
            setDetection(det);
            pushFrame(stableMidi, det);
          }
        } else if (
          displayedMidiRef.current !== null &&
          performance.now() - lastDetectionAt.current > SILENCE_TIMEOUT_MS
        ) {
          recentRef.current = [];
          displayedMidiRef.current = null;
          setDetection(null);
          pushFrame(null, null);
        }
      };
      tick();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not access microphone');
      teardownAudio();
      setPhase('idle');
    }
  }, [phase, recordMode]);

  // Tick a clock for the live elapsed display while phase===live.
  useEffect(() => {
    if (phase !== 'live') return;
    const start = recordingStartRef.current;
    const id = setInterval(() => {
      setElapsed(performance.now() - start);
    }, 250);
    return () => clearInterval(id);
  }, [phase]);

  const cancelPlayback = useCallback(() => {
    cancelRaf();
    playbackRef.current = null;
    setPlayback(null);
    setDetection(null);
    setPhase('idle');
    setElapsed(0);
  }, []);

  const playRecording = useCallback((rec: Recording) => {
    if (phase === 'live') return;
    if (phase === 'playback') cancelPlayback();
    setError(null);
    setPlayback(rec);
    playbackRef.current = rec;
    playbackStartRef.current = performance.now();
    playbackCursorRef.current = 0;
    setPhase('playback');
    setElapsed(0);

    const tick = () => {
      const r = playbackRef.current;
      if (!r) return;
      const t = performance.now() - playbackStartRef.current;
      if (t >= r.duration) {
        cancelPlayback();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);

      // Advance cursor to the latest frame whose t <= now.
      while (
        playbackCursorRef.current + 1 < r.frames.length &&
        r.frames[playbackCursorRef.current + 1].t <= t
      ) {
        playbackCursorRef.current++;
      }
      const f = r.frames[playbackCursorRef.current];
      if (f.midi === null) {
        setDetection(null);
      } else {
        setDetection({
          frequency: f.freq,
          midi: f.midi,
          pitchClass: f.pc,
          cents: f.cents,
        });
      }

      // Throttle elapsed updates to once per ~250ms to keep the timer stable.
      const tick250 = Math.floor(t / 250) * 250;
      if (tick250 !== elapsedRef.current) {
        elapsedRef.current = tick250;
        setElapsed(tick250);
      }
    };
    elapsedRef.current = 0;
    tick();
  }, [phase, cancelPlayback]);

  useEffect(
    () => () => {
      cancelRaf();
      teardownAudio();
    },
    [],
  );

  const activePosition = useMemo(
    () => (detection ? pitchClassToPosition(detection.pitchClass, mode) : null),
    [detection, mode],
  );

  const noteName = detection ? midiToNoteName(detection.midi) : '—';
  const octave = detection ? midiToOctave(detection.midi) : null;
  const fifthUp = detection ? CHROMATIC_LABELS[(detection.pitchClass + 7) % 12] : null;
  const fifthDown = detection ? CHROMATIC_LABELS[(detection.pitchClass + 5) % 12] : null;

  const onMainButton = () => {
    if (phase === 'idle') startLive();
    else if (phase === 'live') stopLive();
    else if (phase === 'playback') cancelPlayback();
  };

  const buttonLabel =
    phase === 'live' ? 'Stop' : phase === 'playback' ? 'Cancel' : recordMode ? 'Record' : 'Listen';
  const buttonClass =
    phase === 'live'
      ? 'btn stop'
      : phase === 'playback'
        ? 'btn cancel'
        : recordMode
          ? 'btn record'
          : 'btn start';

  return (
    <div className="app">
      <h1 className="brand">phifths</h1>
      <div className="corner-actions">
        <button
          type="button"
          className="icon-btn"
          onClick={cycleTheme}
          aria-label={`Theme: ${theme.label} (click to change)`}
          title={`Theme: ${theme.label}`}
        >
          <ThemeSwatch
            colors={theme.noteColors}
            coreColor={theme.bg}
            ringColor={theme.border}
          />
        </button>
        <a
          className="icon-btn"
          href="https://github.com/RomneyDa/phifths"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View phifths on GitHub"
        >
          <GitHubIcon />
        </a>
      </div>

      <main className="main">
        <div className="circle-wrap">
          <CircleOfFifths
            activePosition={activePosition}
            cents={detection?.cents ?? null}
            mode={mode}
            theme={theme}
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

            {phase === 'idle' && (
              <div
                className="action-toggle"
                role="radiogroup"
                aria-label="Action"
              >
                <button
                  role="radio"
                  aria-checked={!recordMode}
                  className={`action-btn ${!recordMode ? 'on' : ''}`}
                  onClick={() => setRecordMode(false)}
                >
                  Listen
                </button>
                <button
                  role="radio"
                  aria-checked={recordMode}
                  className={`action-btn record ${recordMode ? 'on' : ''}`}
                  onClick={() => setRecordMode(true)}
                >
                  <span className="action-dot" aria-hidden="true" />
                  Record
                </button>
              </div>
            )}

            <button onClick={onMainButton} className={buttonClass}>
              {phase === 'live' && recordModeAtStartRef.current && (
                <span className="rec-dot" aria-hidden="true" />
              )}
              {buttonLabel}
            </button>

            {phase === 'live' && recordModeAtStartRef.current && (
              <div className="timer">{formatDuration(elapsed)}</div>
            )}
            {phase === 'live' && !recordModeAtStartRef.current && (
              <div className="timer subtle">listening</div>
            )}
            {phase === 'playback' && playback && (
              <div className="timer playback">
                <span className="play-icon" aria-hidden="true" />
                {formatDuration(elapsed)} / {formatDuration(playback.duration)}
              </div>
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

        <RecordingsStrip
          refreshKey={libraryRefresh}
          onRefresh={() => setLibraryRefresh((n) => n + 1)}
          onPlay={playRecording}
          onCancel={cancelPlayback}
          playingId={phase === 'playback' ? playback?.id ?? null : null}
        />

        {error && <div className="error">{error}</div>}
      </main>
    </div>
  );
}

function ThemeSwatch({
  colors,
  coreColor,
  ringColor,
}: {
  colors: readonly string[];
  coreColor: string;
  ringColor: string;
}) {
  const sweep = 360 / colors.length;
  const slices = colors
    .map((c, i) => `${c} ${i * sweep}deg ${(i + 1) * sweep}deg`)
    .join(', ');
  return (
    <span
      className="swatch"
      style={{
        background: `conic-gradient(from -90deg, ${slices})`,
        borderColor: ringColor,
      }}
    >
      <span className="swatch-core" style={{ background: coreColor }} />
    </span>
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

