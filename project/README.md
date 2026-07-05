# LILA BLACK — Player Journey Visualizer

A web tool for Level Designers to explore player and bot movement, combat, and loot
behavior across LILA BLACK's three maps, built from 5 days of production telemetry.

**Live deployment:** _add your Vercel URL here after deploying_

## Tech stack

- **React 18 + TypeScript + Vite** — frontend app, statically built and hosted on Vercel
- **HTML5 Canvas** — path/marker/heatmap rendering (no charting library needed; full control over a single 1024x1024 coordinate space)
- **hyparquet** (Node-side only) — parses the Apache Parquet telemetry files during a one-time preprocessing step; not shipped to the browser
- **No backend** — the app is a static site. All data is pre-flattened into JSON at build time and fetched from `/public/data` at runtime.

## Why this architecture

The raw dataset is 1,243 separate parquet files (34MB). Parsing parquet in the browser
on every page load — and re-reading every file in a match to reconstruct it — would be
slow and wasteful for a tool that's opened repeatedly. Instead, `preprocess.mjs` (run
once, ahead of deployment) does the heavy lifting in Node:

1. Reads all `.nakama-0` parquet files with `hyparquet`
2. Groups player files by `match_id` to reconstruct full matches
3. Writes one compact JSON file per match to `public/data/matches/{matchId}.json`
4. Writes `public/data/index.json` — a lightweight summary of all 796 matches (map, date, player counts, kill/death/loot counts, duration) used to drive the sidebar filters without loading full match data
5. Pre-bins kill/death/loot/traffic events into a 96x96 grid per map for instant heatmap rendering, written to `public/data/heatmaps.json`

The deployed app therefore only ever fetches small, purpose-built JSON files — never
raw parquet — keeping it fast on Vercel's static hosting with no server required.

## Setup

```bash
npm install
npm run dev       # http://localhost:5173
```

### Re-running the data pipeline (only needed if the source dataset changes)

Drop the extracted `player_data/` folder (the one containing `February_10..14/`,
`minimaps/`, `README.md`) into the repo root, then:

```bash
npm run preprocess
```

(If it lives somewhere else: `SRC_DATA=/path/to/player_data npm run preprocess`.)

This regenerates everything under `public/data/`. Minimap images live in
`public/minimaps/` (downscaled from the multi-thousand-pixel originals to 1600px
max edge for web delivery — the UV-based coordinate math is resolution-independent,
so this has zero effect on plotting accuracy).

### Build & deploy

```bash
npm run build      # outputs to dist/
```

Deploy to Vercel with the default Vite preset (build command `npm run build`,
output directory `dist`) — no environment variables required.

## No env vars / secrets

This app has no external API calls and no environment variables to configure.
