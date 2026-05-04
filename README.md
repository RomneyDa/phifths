# phifths

A live circle of fifths in the browser. Sing or play a note into your microphone — phifths detects the dominant pitch and lights it up on the circle, with every position labeled by how many fifths it sits from your note.

## How it works

1. **Capture** — `getUserMedia` opens the microphone.
2. **Detect** — a time-domain autocorrelation finds the pitch each animation frame.
3. **Map** — the frequency is rounded to the nearest equal-tempered note, then mapped to its position on the circle of fifths.
4. **Render** — the SVG circle highlights the active note and labels every other position with its signed distance in fifths (`+1` clockwise = perfect fifth above; `−1` counterclockwise = perfect fourth above).

## Run locally

```sh
npm install
npm run dev
```

Then open the printed URL and click **Start listening**. Microphone access requires a secure context — `localhost` and HTTPS both qualify.

## Stack

- React + TypeScript + Vite
- Web Audio API (`AnalyserNode.getFloatTimeDomainData`)
- Pitch detection via autocorrelation (no third-party DSP libraries)
- Hand-drawn SVG for the circle, no chart libs
