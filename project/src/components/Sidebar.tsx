import type { MapId, MatchIndexEntry } from '../types';
import { MAP_LABELS } from '../types';

interface Props {
  index: MatchIndexEntry[];
  selectedMap: MapId;
  onSelectMap: (m: MapId) => void;
  selectedDate: string | 'all';
  onSelectDate: (d: string | 'all') => void;
  selectedMatchId: string | null;
  onSelectMatch: (id: string) => void;
}

const MAPS: MapId[] = ['AmbroseValley', 'GrandRift', 'Lockdown'];

export default function Sidebar({
  index,
  selectedMap,
  onSelectMap,
  selectedDate,
  onSelectDate,
  selectedMatchId,
  onSelectMatch,
}: Props) {
  const mapCounts: Record<string, number> = {};
  for (const m of index) mapCounts[m.mapId] = (mapCounts[m.mapId] ?? 0) + 1;

  const matchesForMap = index.filter((m) => m.mapId === selectedMap);
  const dates = Array.from(new Set(matchesForMap.map((m) => m.date))).sort();

  const filtered = matchesForMap.filter((m) => selectedDate === 'all' || m.date === selectedDate);

  return (
    <aside className="sidebar">
      <div>
        <div className="panel-title">Map</div>
        <div className="map-tabs">
          {MAPS.map((m) => (
            <button
              key={m}
              className={`map-tab ${selectedMap === m ? 'active' : ''}`}
              onClick={() => onSelectMap(m)}
            >
              <span>{MAP_LABELS[m]}</span>
              <span className="count">{mapCounts[m] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="panel-title">Date</div>
        <div className="date-chips">
          <button
            className={`chip ${selectedDate === 'all' ? 'active' : ''}`}
            onClick={() => onSelectDate('all')}
          >
            All days
          </button>
          {dates.map((d) => (
            <button
              key={d}
              className={`chip ${selectedDate === d ? 'active' : ''}`}
              onClick={() => onSelectDate(d)}
            >
              {d.replace('February_', 'Feb ')}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="panel-title">
          Matches <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>({filtered.length})</span>
        </div>
        {filtered.length === 0 ? (
          <div className="empty-note">No matches for this filter.</div>
        ) : (
          <div className="match-list">
            {filtered.map((m) => (
              <button
                key={m.matchId}
                className={`match-row ${selectedMatchId === m.matchId ? 'active' : ''}`}
                onClick={() => onSelectMatch(m.matchId)}
              >
                <div className="match-row-top">
                  <span className="match-row-id">{m.matchId.slice(0, 8)}</span>
                  <span>{m.date.replace('February_', 'Feb ')}</span>
                </div>
                <div className="match-row-meta">
                  <span>{m.humanCount}H / {m.botCount}B</span>
                  <span>{(m.durationMs / 1000).toFixed(0)}s</span>
                  <span style={{ color: 'var(--danger)' }}>{m.killCount}K</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
