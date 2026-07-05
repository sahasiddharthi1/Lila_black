import { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from './components/Sidebar';
import MapViewport from './components/MapViewport';
import Timeline from './components/Timeline';
import RightPanel from './components/RightPanel';
import { loadHeatmaps, loadIndex, loadMapConfig, loadMatch } from './lib/data';
import type { HeatLayer, HeatmapBundle, MapConfigDict, MapId, MatchData, MatchIndexEntry } from './types';
import { MAP_LABELS } from './types';

export default function App() {
  const [index, setIndex] = useState<MatchIndexEntry[]>([]);
  const [mapConfig, setMapConfig] = useState<MapConfigDict | null>(null);
  const [heatmaps, setHeatmaps] = useState<HeatmapBundle | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedMap, setSelectedMap] = useState<MapId>('AmbroseValley');
  const [selectedDate, setSelectedDate] = useState<string | 'all'>('all');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [matchData, setMatchData] = useState<MatchData | null>(null);

  const [showHumans, setShowHumans] = useState(true);
  const [showBots, setShowBots] = useState(true);
  const [heatLayer, setHeatLayer] = useState<HeatLayer>('none');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const [currentOffsetMs, setCurrentOffsetMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);

  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);

  useEffect(() => {
    (async () => {
      const [idx, cfg, heat] = await Promise.all([loadIndex(), loadMapConfig(), loadHeatmaps()]);
      setIndex(idx);
      setMapConfig(cfg);
      setHeatmaps(heat);
      setLoading(false);
      // auto-select first match on the default map
      const first = idx.find((m) => m.mapId === 'AmbroseValley');
      if (first) setSelectedMatchId(first.matchId);
    })();
  }, []);

  useEffect(() => {
    if (!selectedMatchId) {
      setMatchData(null);
      return;
    }
    setIsPlaying(false);
    setCurrentOffsetMs(0);
    setSelectedPlayerId(null);
    loadMatch(selectedMatchId).then(setMatchData);
  }, [selectedMatchId]);

  const selectedEntry = useMemo(
    () => index.find((m) => m.matchId === selectedMatchId) ?? null,
    [index, selectedMatchId]
  );

  const matchStartTs = selectedEntry?.startTs ?? 0;
  const durationMs = selectedEntry?.durationMs ?? 0;

  // playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    lastFrameRef.current = performance.now();
    const tick = (now: number) => {
      const dt = now - lastFrameRef.current;
      lastFrameRef.current = now;
      setCurrentOffsetMs((prev) => {
        const next = prev + dt * speed;
        if (next >= durationMs) {
          setIsPlaying(false);
          return durationMs;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, speed, durationMs]);

  function handleSelectMap(m: MapId) {
    setSelectedMap(m);
    setSelectedDate('all');
    const firstForMap = index.find((e) => e.mapId === m);
    setSelectedMatchId(firstForMap ? firstForMap.matchId : null);
  }

  function handleSelectDate(d: string | 'all') {
    setSelectedDate(d);
    const candidates = index.filter((e) => e.mapId === selectedMap && (d === 'all' || e.date === d));
    if (candidates.length > 0 && !candidates.some((c) => c.matchId === selectedMatchId)) {
      setSelectedMatchId(candidates[0].matchId);
    }
  }

  const heatGrid =
    heatmaps && heatLayer !== 'none' ? heatmaps.maps[selectedMap][heatLayer] : null;
  const heatMax = useMemo(() => (heatGrid ? Math.max(1, ...heatGrid) : 0), [heatGrid]);

  const selectedPlayer = useMemo(() => {
    if (!matchData || !selectedPlayerId) return null;
    const p = matchData.players.find((pl) => pl.userId === selectedPlayerId);
    if (!p) return null;
    const kills = p.events.filter((e) => e.ev === 'Kill' || e.ev === 'BotKill').length;
    const deaths = p.events.filter((e) => e.ev === 'Killed' || e.ev === 'BotKilled').length;
    const stormDeaths = p.events.filter((e) => e.ev === 'KilledByStorm').length;
    const loot = p.events.filter((e) => e.ev === 'Loot').length;
    return { userId: p.userId, isBot: p.isBot, kills, deaths, stormDeaths, loot, events: p.events.length };
  }, [matchData, selectedPlayerId]);

  const totalMatches = index.length;
  const totalKills = useMemo(() => index.reduce((s, m) => s + m.killCount, 0), [index]);

  if (loading || !mapConfig) {
    return (
      <div className="app">
        <div className="loading-state">LOADING TELEMETRY…</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-brand">
          <span className="mark">LILA BLACK</span>
          <span className="sub">Player Journey Visualizer</span>
        </div>
        <div className="topbar-stats">
          <span>
            <b>{totalMatches}</b> matches
          </span>
          <span>
            <b>{totalKills}</b> kills logged
          </span>
          <span>
            Viewing <b>{MAP_LABELS[selectedMap]}</b>
          </span>
        </div>
      </header>

      <div className="layout">
        <Sidebar
          index={index}
          selectedMap={selectedMap}
          onSelectMap={handleSelectMap}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          selectedMatchId={selectedMatchId}
          onSelectMatch={(id) => setSelectedMatchId(id)}
        />

        <div className="viewport">
          <div className="map-stage">
            {selectedMatchId ? (
              <div className="map-frame">
                <MapViewport
                  mapId={selectedMap}
                  mapConfig={mapConfig[selectedMap]}
                  match={matchData}
                  currentOffsetMs={currentOffsetMs}
                  matchStartTs={matchStartTs}
                  showHumans={showHumans}
                  showBots={showBots}
                  heatLayer={heatLayer}
                  heatGrid={heatGrid}
                  heatBins={heatmaps?.bins ?? 96}
                  selectedPlayerId={selectedPlayerId}
                  onSelectPlayer={setSelectedPlayerId}
                />
                <span className="bracket tl" />
                <span className="bracket tr" />
                <span className="bracket bl" />
                <span className="bracket br" />
                <div className="map-caption">{MAP_LABELS[selectedMap]}</div>
              </div>
            ) : (
              <div className="no-match-state">SELECT A MATCH TO BEGIN PLAYBACK</div>
            )}
          </div>

          <Timeline
            durationMs={durationMs}
            currentOffsetMs={currentOffsetMs}
            isPlaying={isPlaying}
            speed={speed}
            onSeek={(ms) => setCurrentOffsetMs(ms)}
            onTogglePlay={() => setIsPlaying((p) => !p)}
            onSpeedChange={setSpeed}
            disabled={!matchData}
          />
        </div>

        <RightPanel
          match={selectedEntry}
          showHumans={showHumans}
          showBots={showBots}
          onToggleHumans={() => setShowHumans((s) => !s)}
          onToggleBots={() => setShowBots((s) => !s)}
          heatLayer={heatLayer}
          onHeatLayer={setHeatLayer}
          heatMax={heatMax}
          selectedPlayer={selectedPlayer}
          onClearSelection={() => setSelectedPlayerId(null)}
        />
      </div>
    </div>
  );
}
