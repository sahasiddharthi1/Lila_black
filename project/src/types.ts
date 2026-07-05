export type MapId = 'AmbroseValley' | 'GrandRift' | 'Lockdown';

export interface MapConfig {
  scale: number;
  originX: number;
  originZ: number;
}

export type MapConfigDict = Record<MapId, MapConfig>;

export interface MatchIndexEntry {
  matchId: string;
  mapId: MapId;
  date: string;
  humanCount: number;
  botCount: number;
  durationMs: number;
  startTs: number;
  killCount: number;
  deathCount: number;
  lootCount: number;
}

export interface PlayerEvent {
  x: number;
  z: number;
  y: number;
  ts: number;
  ev: string;
}

export interface PlayerJourney {
  userId: string;
  isBot: boolean;
  events: PlayerEvent[];
}

export interface MatchData {
  matchId: string;
  mapId: MapId;
  date: string;
  players: PlayerJourney[];
}

export interface HeatmapBundle {
  bins: number;
  maps: Record<
    MapId,
    {
      kills: number[];
      deaths: number[];
      loot: number[];
      traffic: number[];
    }
  >;
}

export type HeatLayer = 'none' | 'kills' | 'deaths' | 'loot' | 'traffic';

export const KILL_EVENTS = new Set(['Kill', 'BotKill']);
export const DEATH_EVENTS = new Set(['Killed', 'BotKilled']);
export const STORM_EVENTS = new Set(['KilledByStorm']);
export const LOOT_EVENTS = new Set(['Loot']);
export const POSITION_EVENTS = new Set(['Position', 'BotPosition']);

export const MAP_LABELS: Record<MapId, string> = {
  AmbroseValley: 'Ambrose Valley',
  GrandRift: 'Grand Rift',
  Lockdown: 'Lockdown',
};

export const MAP_IMAGES: Record<MapId, string> = {
  AmbroseValley: '/minimaps/AmbroseValley_Minimap.jpg',
  GrandRift: '/minimaps/GrandRift_Minimap.jpg',
  Lockdown: '/minimaps/Lockdown_Minimap.jpg',
};
