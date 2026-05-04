# phifths

A live circle of fifths in the browser. Sing or play a note into your microphone — phifths detects the dominant pitch and lights it up on the circle, with every other note labeled by its signed distance in fifths from yours.

Live: [dallinromney.com/phifths](https://dallinromney.com/phifths)

## Features

- **Live pitch detection** — autocorrelation on the mic stream, smoothed across a sliding window so the highlight doesn't flicker.
- **Two layouts** — *Chromatic* (notes in semitone order, perfect fifth highlighted across the circle) and *Fifths* (the classic circle of fifths with fifth-distance gradient).
- **Tuner needle** — a thin radial line lands in the center of a sector when you're exactly in tune, sliding ±50¢ toward the edges as you go sharp or flat.
- **Themes** — pluggable theme system. Default is **Scriabin**, the chromesthesia mapping (C-red, G-orange, D-yellow, … wraps to F-crimson) which forms a smooth rainbow around the circle of fifths. Light and Mono variants ship too.
- **Record and replay** — toggle Record, capture a sequence, save it locally to IndexedDB, and play it back through the same circle. Manage recordings (rename / delete) from the library sheet.

## How it works

1. **Capture** — `getUserMedia` opens the mic.
2. **Detect** — a time-domain autocorrelation finds the pitch each animation frame.
3. **Smooth** — a 12-frame median filter picks the stable note; matching frames' frequencies are averaged for the cents readout.
4. **Map** — the frequency rounds to the nearest equal-tempered note, then the layout maps it to its sector. The needle's angle is the sector center plus `(cents / 100) × sector_width`.
5. **Persist** — recordings store an array of `{t, midi, cents, freq, pc}` frames in IndexedDB.

## Run locally

```sh
npm install
npm run dev
```

Open the printed URL and click **Listen**. Microphone access requires a secure context — `localhost` and HTTPS both qualify.

## Stack

- React + TypeScript + Vite
- Web Audio API (`AnalyserNode.getFloatTimeDomainData`)
- Pitch detection via autocorrelation (no third-party DSP libraries)
- Hand-drawn SVG for the circle and tuner needle
- IndexedDB for recording storage
- CSS variables for themes, applied to `:root` from typed theme objects in `src/themes.ts`
