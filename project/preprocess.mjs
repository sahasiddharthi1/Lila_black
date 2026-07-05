// Preprocess LILA BLACK parquet telemetry into compact JSON bundles
// consumed by the React visualization app. Run with: node preprocess.mjs
import { parquetReadObjects } from 'hyparquet';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Point SRC_DATA at the extracted player_data folder (the one containing
// February_10..14/, minimaps/, README.md). Override with an env var if it
// lives somewhere else, e.g.: SRC_DATA=/path/to/player_data npm run preprocess
const SRC_ROOT = process.env.SRC_DATA || path.join(__dirname, 'player_data');
const OUT_ROOT = path.join(__dirname, 'public', 'data');
const MATCHES_DIR = path.join(OUT_ROOT, 'matches');

const MAP_CONFIG = {
  AmbroseValley: { scale: 900, originX: -370, originZ: -473 },
  GrandRift: { scale: 581, originX: -290, originZ: -290 },
  Lockdown: { scale: 1000, originX: -500, originZ: -500 },
};

const HEAT_BINS = 96; // grid resolution for precomputed heatmaps

fs.mkdirSync(MATCHES_DIR, { recursive: true });

const dayFolders = fs
  .readdirSync(SRC_ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith('February_'))
  .map((d) => d.name)
  .sort();

const isBot = (userId) => /^\d+$/.test(userId);

// matchId (sanitized) -> { mapId, date, players: { userId: { isBot, events:[...] } } }
const matches = new Map();

function worldToUV(x, z, cfg) {
  const u = (x - cfg.originX) / cfg.scale;
  const v = (z - cfg.originZ) / cfg.scale;
  return [u, v];
}

let fileCount = 0;
let rowCount = 0;
let badFiles = 0;

for (const day of dayFolders) {
  const dirPath = path.join(SRC_ROOT, day);
  const files = fs.readdirSync(dirPath);
  for (const f of files) {
    if (!f.endsWith('.nakama-0')) continue;
    const filePath = path.join(dirPath, f);
    let rows;
    try {
      const buf = fs.readFileSync(filePath);
      const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      rows = await parquetReadObjects({ file: arrayBuffer });
    } catch (e) {
      badFiles++;
      continue;
    }
    if (!rows || rows.length === 0) continue;
    fileCount++;

    const first = rows[0];
    const matchIdRaw = first.match_id; // e.g. "xxxx.nakama-0"
    const matchId = matchIdRaw.replace(/\.nakama-0$/, '');
    const mapId = first.map_id;
    const userId = first.user_id;
    const human = !isBot(userId);

    if (!matches.has(matchId)) {
      matches.set(matchId, { mapId, date: day, players: new Map() });
    }
    const match = matches.get(matchId);
    if (!match.players.has(userId)) {
      match.players.set(userId, { isBot: !human, events: [] });
    }
    const player = match.players.get(userId);

    for (const r of rows) {
      rowCount++;
      const tsMs = r.ts instanceof Date ? r.ts.getTime() : Number(r.ts);
      player.events.push({
        x: Math.round(r.x * 100) / 100,
        z: Math.round(r.z * 100) / 100,
        y: Math.round(r.y * 100) / 100,
        ts: tsMs,
        ev: r.event,
      });
    }
  }
  console.log(`[${day}] processed. files so far: ${fileCount}, rows so far: ${rowCount}`);
}

console.log(`Done reading. files=${fileCount} rows=${rowCount} badFiles=${badFiles} matches=${matches.size}`);

// ---- Write per-match JSON + build index + heatmaps ----
const index = [];
const heatmaps = {}; // mapId -> { kills: grid, deaths: grid, loot: grid, traffic: grid }

for (const mapId of Object.keys(MAP_CONFIG)) {
  heatmaps[mapId] = {
    kills: new Array(HEAT_BINS * HEAT_BINS).fill(0),
    deaths: new Array(HEAT_BINS * HEAT_BINS).fill(0),
    loot: new Array(HEAT_BINS * HEAT_BINS).fill(0),
    traffic: new Array(HEAT_BINS * HEAT_BINS).fill(0),
  };
}

const KILL_EVENTS = new Set(['Kill', 'BotKill']);
const DEATH_EVENTS = new Set(['Killed', 'BotKilled', 'KilledByStorm']);
const LOOT_EVENTS = new Set(['Loot']);
const POSITION_EVENTS = new Set(['Position', 'BotPosition']);

function addToHeat(grid, u, v) {
  if (u < 0 || u >= 1 || v < 0 || v >= 1) return;
  const bx = Math.min(HEAT_BINS - 1, Math.floor(u * HEAT_BINS));
  const by = Math.min(HEAT_BINS - 1, Math.floor(v * HEAT_BINS));
  grid[by * HEAT_BINS + bx]++;
}

for (const [matchId, m] of matches.entries()) {
  const cfg = MAP_CONFIG[m.mapId];
  let minTs = Infinity;
  let maxTs = -Infinity;
  let humanCount = 0;
  let botCount = 0;
  let killCount = 0;
  let deathCount = 0;
  let lootCount = 0;

  const playersOut = [];
  for (const [userId, p] of m.players.entries()) {
    p.isBot ? botCount++ : humanCount++;
    p.events.sort((a, b) => a.ts - b.ts);
    for (const e of p.events) {
      if (e.ts < minTs) minTs = e.ts;
      if (e.ts > maxTs) maxTs = e.ts;
      const [u, v] = worldToUV(e.x, e.z, cfg);
      if (POSITION_EVENTS.has(e.ev)) {
        addToHeat(heatmaps[m.mapId].traffic, u, v);
      } else if (KILL_EVENTS.has(e.ev)) {
        addToHeat(heatmaps[m.mapId].kills, u, v);
        killCount++;
      } else if (DEATH_EVENTS.has(e.ev)) {
        addToHeat(heatmaps[m.mapId].deaths, u, v);
        deathCount++;
      } else if (LOOT_EVENTS.has(e.ev)) {
        addToHeat(heatmaps[m.mapId].loot, u, v);
        lootCount++;
      }
    }
    playersOut.push({
      userId,
      isBot: p.isBot,
      events: p.events,
    });
  }

  const safeId = matchId; // already a uuid-ish string, safe as filename
  fs.writeFileSync(
    path.join(MATCHES_DIR, `${safeId}.json`),
    JSON.stringify({ matchId, mapId: m.mapId, date: m.date, players: playersOut })
  );

  index.push({
    matchId,
    mapId: m.mapId,
    date: m.date,
    humanCount,
    botCount,
    durationMs: isFinite(maxTs - minTs) ? maxTs - minTs : 0,
    startTs: isFinite(minTs) ? minTs : 0,
    killCount,
    deathCount,
    lootCount,
  });
}

index.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.startTs - b.startTs));

fs.writeFileSync(path.join(OUT_ROOT, 'index.json'), JSON.stringify(index));
fs.writeFileSync(
  path.join(OUT_ROOT, 'heatmaps.json'),
  JSON.stringify({ bins: HEAT_BINS, maps: heatmaps })
);
fs.writeFileSync(path.join(OUT_ROOT, 'map_config.json'), JSON.stringify(MAP_CONFIG));

console.log(`Wrote ${index.length} match files, index.json, heatmaps.json, map_config.json`);
