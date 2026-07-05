import type { HeatLayer, MatchIndexEntry } from '../types';

interface SelectedPlayerSummary {
  userId: string;
  isBot: boolean;
  kills: number;
  deaths: number;
  stormDeaths: number;
  loot: number;
  events: number;
}

interface Props {
  match: MatchIndexEntry | null;
  showHumans: boolean;
  showBots: boolean;
  onToggleHumans: () => void;
  onToggleBots: () => void;
  heatLayer: HeatLayer;
  onHeatLayer: (h: HeatLayer) => void;
  heatMax: number;
  selectedPlayer: SelectedPlayerSummary | null;
  onClearSelection: () => void;
}

const HEAT_OPTIONS: { id: HeatLayer; label: string }[] = [
  { id: 'none', label: 'Off' },
  { id: 'traffic', label: 'Traffic' },
  { id: 'kills', label: 'Kill zones' },
  { id: 'deaths', label: 'Death zones' },
  { id: 'loot', label: 'Loot pickups' },
];

const HEAT_COLORS: Record<Exclude<HeatLayer, 'none'>, string> = {
  traffic: '#3fd0e0',
  kills: '#e5484d',
  deaths: '#ff6b6b',
  loot: '#6fcf73',
};

function KillIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11">
      <line x1="1.5" y1="1.5" x2="9.5" y2="9.5" stroke="#e5484d" strokeWidth="2" />
      <line x1="9.5" y1="1.5" x2="1.5" y2="9.5" stroke="#e5484d" strokeWidth="2" />
    </svg>
  );
}

function DeathIcon({ color = '#ff6b6b' }: { color?: string }) {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11">
      <polygon points="5.5,1 10,9.5 1,9.5" fill={color} />
    </svg>
  );
}

function LootIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11">
      <rect x="1.5" y="1.5" width="8" height="8" fill="#6fcf73" />
    </svg>
  );
}

function HumanLineIcon() {
  return (
    <svg width="18" height="8" viewBox="0 0 18 8">
      <line x1="1" y1="4" x2="17" y2="4" stroke="#ff9f1c" strokeWidth="2" />
      <circle cx="17" cy="4" r="2.6" fill="#ff9f1c" />
    </svg>
  );
}

function BotLineIcon() {
  return (
    <svg width="18" height="8" viewBox="0 0 18 8">
      <line x1="1" y1="4" x2="17" y2="4" stroke="#3fd0e0" strokeWidth="1.4" strokeDasharray="2.5 2.5" />
      <circle cx="17" cy="4" r="2" fill="#3fd0e0" />
    </svg>
  );
}

export default function RightPanel({
  match,
  showHumans,
  showBots,
  onToggleHumans,
  onToggleBots,
  heatLayer,
  onHeatLayer,
  heatMax,
  selectedPlayer,
  onClearSelection,
}: Props) {
  return (
    <aside className="right-panel">
      <div>
        <div className="panel-title">Layers</div>
        <div className="toggle-row" onClick={onToggleHumans} style={{ cursor: 'pointer' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HumanLineIcon />
            Humans
          </span>
          <span className={`checkbox ${showHumans ? 'checked' : ''}`} />
        </div>
        <div className="toggle-row" onClick={onToggleBots} style={{ cursor: 'pointer' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BotLineIcon />
            Bots
          </span>
          <span className={`checkbox ${showBots ? 'checked' : ''}`} />
        </div>
      </div>

      <div>
        <div className="panel-title">Heatmap</div>
        <div className="heat-options">
          {HEAT_OPTIONS.map((o) => (
            <button
              key={o.id}
              className={`heat-option ${heatLayer === o.id ? 'active' : ''}`}
              onClick={() => onHeatLayer(o.id)}
            >
              {o.label}
            </button>
          ))}
        </div>

        {heatLayer !== 'none' && (
          <div className="heat-gradient-legend">
            <div
              className="heat-gradient-bar"
              style={{
                background: `linear-gradient(90deg, rgba(0,0,0,0) 0%, ${HEAT_COLORS[heatLayer]} 100%)`,
              }}
            />
            <div className="heat-gradient-labels">
              <span>0</span>
              <span>{heatMax.toLocaleString()} events / cell</span>
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="panel-title">Event Legend</div>
        <div className="legend-row">
          <KillIcon />
          Kill
        </div>
        <div className="legend-row">
          <DeathIcon color="#ff6b6b" />
          Death
        </div>
        <div className="legend-row">
          <DeathIcon color="#b66bff" />
          Storm death
        </div>
        <div className="legend-row">
          <LootIcon />
          Loot
        </div>
      </div>

      {selectedPlayer && (
        <div>
          <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Selected Player</span>
            <button className="clear-selection-btn" onClick={onClearSelection}>
              Clear ✕
            </button>
          </div>
          <div className="selected-player-id">
            {selectedPlayer.isBot ? 'BOT' : 'PLAYER'} · {selectedPlayer.userId.slice(0, 12)}
          </div>
          <div className="stat-grid">
            <div className="stat-box kills">
              <div className="val">{selectedPlayer.kills}</div>
              <div className="lbl">Kills</div>
            </div>
            <div className="stat-box">
              <div className="val">{selectedPlayer.deaths + selectedPlayer.stormDeaths}</div>
              <div className="lbl">Deaths</div>
            </div>
            <div className="stat-box loot">
              <div className="val">{selectedPlayer.loot}</div>
              <div className="lbl">Loot</div>
            </div>
            <div className="stat-box">
              <div className="val">{selectedPlayer.events}</div>
              <div className="lbl">Events</div>
            </div>
          </div>
        </div>
      )}

      {match && (
        <div>
          <div className="panel-title">Match Readout</div>
          <div className="stat-grid">
            <div className="stat-box">
              <div className="val">{match.humanCount}</div>
              <div className="lbl">Humans</div>
            </div>
            <div className="stat-box">
              <div className="val">{match.botCount}</div>
              <div className="lbl">Bots</div>
            </div>
            <div className="stat-box kills">
              <div className="val">{match.killCount}</div>
              <div className="lbl">Kills</div>
            </div>
            <div className="stat-box loot">
              <div className="val">{match.lootCount}</div>
              <div className="lbl">Loot</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
