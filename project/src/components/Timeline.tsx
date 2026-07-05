interface Props {
  durationMs: number;
  currentOffsetMs: number;
  isPlaying: boolean;
  speed: number;
  onSeek: (ms: number) => void;
  onTogglePlay: () => void;
  onSpeedChange: (s: number) => void;
  disabled: boolean;
}

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

export default function Timeline({
  durationMs,
  currentOffsetMs,
  isPlaying,
  speed,
  onSeek,
  onTogglePlay,
  onSpeedChange,
  disabled,
}: Props) {
  return (
    <div className="timeline-bar">
      <div className="timeline-controls">
        <button className="play-btn" onClick={onTogglePlay} disabled={disabled}>
          {isPlaying ? '❚❚' : '▶'}
        </button>
        <div className="timeline-track">
          <input
            type="range"
            min={0}
            max={Math.max(1, durationMs)}
            value={Math.min(currentOffsetMs, durationMs)}
            onChange={(e) => onSeek(Number(e.target.value))}
            disabled={disabled}
          />
        </div>
        <select
          className="speed-select"
          value={speed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          disabled={disabled}
        >
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={4}>4x</option>
          <option value={8}>8x</option>
        </select>
        <div className="timeline-readout">
          <b>{fmt(currentOffsetMs)}</b> / {fmt(durationMs)}
        </div>
      </div>
    </div>
  );
}
