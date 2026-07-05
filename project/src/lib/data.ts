import type { HeatmapBundle, MapConfigDict, MatchData, MatchIndexEntry } from '../types';

const matchCache = new Map<string, MatchData>();
let indexCache: MatchIndexEntry[] | null = null;
let heatmapCache: HeatmapBundle | null = null;
let configCache: MapConfigDict | null = null;

export async function loadIndex(): Promise<MatchIndexEntry[]> {
  if (indexCache) return indexCache;
  const res = await fetch('/data/index.json');
  if (!res.ok) throw new Error('Failed to load match index');
  indexCache = await res.json();
  return indexCache!;
}

export async function loadHeatmaps(): Promise<HeatmapBundle> {
  if (heatmapCache) return heatmapCache;
  const res = await fetch('/data/heatmaps.json');
  if (!res.ok) throw new Error('Failed to load heatmaps');
  heatmapCache = await res.json();
  return heatmapCache!;
}

export async function loadMapConfig(): Promise<MapConfigDict> {
  if (configCache) return configCache;
  const res = await fetch('/data/map_config.json');
  if (!res.ok) throw new Error('Failed to load map config');
  configCache = await res.json();
  return configCache!;
}

export async function loadMatch(matchId: string): Promise<MatchData> {
  const cached = matchCache.get(matchId);
  if (cached) return cached;
  const res = await fetch(`/data/matches/${matchId}.json`);
  if (!res.ok) throw new Error(`Failed to load match ${matchId}`);
  const data: MatchData = await res.json();
  matchCache.set(matchId, data);
  return data;
}
