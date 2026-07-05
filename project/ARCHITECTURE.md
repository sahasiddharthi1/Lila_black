# Architecture

## What it's built with, and why

**React + TypeScript + Vite**, deployed as a static site on Vercel. No backend, no
database. The task is fundamentally "load some data, render it on a canvas, let
someone filter and scrub through it" — a static SPA is the simplest thing that can
work, and Vite's dev server / build pipeline is fast enough that iteration wasn't a
bottleneck.

Rendering is plain **HTML5 Canvas** rather than a charting/mapping library
(deck.gl, Leaflet, etc.). The "map" here isn't geospatial in the GIS sense — it's a
single static image with a known linear coordinate transform — so a general mapping
library would add weight and abstraction without buying anything. Canvas gives direct
control over draw order (minimap → heatmap → paths → event markers) and redraws
cheaply on every scrub/playback frame.

## Data flow

```
parquet files (1,243 x .nakama-0)
        │
        ▼  preprocess.mjs (Node, run once, not part of the deployed app)
        │  - hyparquet reads each file
        │  - groups rows by match_id into full matches
        │  - bins kill/death/loot/traffic events into a 96x96 grid per map
        ▼
public/data/
  ├── index.json          (796 match summaries — powers sidebar filters)
  ├── matches/{id}.json   (one file per match — full per-player event streams)
  ├── heatmaps.json       (precomputed grids, 4 layers x 3 maps)
  └── map_config.json     (scale/origin per map, copied from the README spec)
        │
        ▼  fetched on demand by the React app at runtime
MapViewport (canvas) ← Sidebar (filters) ← App state ← Timeline (playback)
```

The index is loaded once on startup (~160KB). Individual match files (a few KB to
~100KB each) are fetched lazily, only when selected, and cached in memory for the
session. This keeps the initial load fast regardless of how many of the 796 matches
exist, and avoids ever shipping the full 7.8MB of match data to a browser that only
wants to look at one match at a time.

## Coordinate mapping

Implemented exactly per the dataset README, in `src/lib/coords.ts`:

```
u = (x - originX) / scale
v = (z - originZ) / scale
pixel_x = u * CANVAS_SIZE
pixel_y = (1 - v) * CANVAS_SIZE      // Y flipped: image origin is top-left
```

`CANVAS_SIZE` is a fixed 1024 logical units for the canvas's internal coordinate
space (CSS then scales the canvas element to fit the viewport responsively). Since
the transform is UV-based (0–1 normalized), it's resolution-independent — the
minimap images were downscaled from their multi-thousand-pixel originals to a 1600px
max edge for web delivery, and that has no effect on plotting accuracy; only the
`scale`/`origin` constants from the README matter, not the image's native pixel
dimensions.

I verified this against the worked example in the dataset README (AmbroseValley,
x=-301.45, z=-355.55 → pixel (78, 890)) before trusting it on the full dataset.

The `y` column (elevation) is intentionally unused for 2D plotting, per the README.

## Assumptions made where the data was ambiguous

- **Timestamps are extremely compressed.** Per-match `ts` spans observed in this
  dataset are typically sub-second to a few seconds, not the "several minutes" a
  real match implies. Rather than guess at a "correct" real-time scale, the timeline
  treats `ts` purely as a relative ordering within a match — playback duration is
  whatever the data says it is, even if that's under a second for some matches. This
  is called out in the UI by simply showing the actual computed duration rather than
  a fabricated one.
- **Most "matches" in this slice have partial participant coverage.** The README
  describes matches with many humans and bots, but the average match in this dataset
  has ~1 human and 0.5–0.9 bots worth of *captured files* — i.e., this is a sample of
  individual player journeys, not necessarily every participant in every real match.
  The tool reflects exactly what's in the data (all files sharing a `match_id`) and
  doesn't try to infer or backfill missing participants.
- **Bot/human detection** uses the README's filename convention (UUID vs numeric
  `user_id`), applied identically to the `user_id` column inside each file as a
  cross-check — both agreed on every file in this dataset, so no edge cases needed
  special-casing.
- **Storm deaths** are treated as a distinct marker/event category from regular
  PvP/bot deaths (per the explicit requirement), not folded into a generic "death"
  bucket in the UI, even though they share a heatmap bucket with other deaths for the
  "death zones" overlay (storm deaths are rare enough — 39 of 89k rows — that a
  separate heatmap layer for them wasn't worth the UI real estate).

## Major tradeoffs

| Decision | What I picked | Alternative considered | Why |
|---|---|---|---|
| Data delivery | Pre-flattened JSON, built once via Node script | Parse parquet client-side with hyparquet in the browser | Avoids re-parsing the same files on every visit; smaller, purpose-shaped payloads; no parquet decode cost on low-end machines |
| Heatmaps | Precomputed grid counts at build time | Compute heatmap bins client-side from raw events on every filter change | 96x96 bins across all 796 matches is cheap to precompute once and instant to render forever after; client-side binning would re-scan thousands of events on every toggle |
| Rendering | Canvas, hand-rolled draw loop | A mapping/geo library (deck.gl, Leaflet+CRS.Simple) | The coordinate system is a simple linear transform, not real geodata; a library would add bundle size and an abstraction layer for no real benefit |
| Match granularity | One JSON file per match (all participants combined) | One JSON file per player-file (original granularity) | The product requirement is to watch a *match* unfold, not one player in isolation; combining at build time means the app never needs to fetch N files to render one match |
| Hosting | Static Vercel deploy, no backend | A small API server for on-demand parquet parsing | Nothing in the requirements needs a server — the entire dataset fits comfortably as static JSON (7.8MB total across 796 matches), and a static site is simpler to host, deploy, and reason about |
