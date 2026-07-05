import { useEffect, useMemo, useRef, useState } from 'react';
import type { HeatLayer, MapConfig, MapId, MatchData, PlayerEvent } from '../types';
import { DEATH_EVENTS, KILL_EVENTS, LOOT_EVENTS, MAP_IMAGES, STORM_EVENTS } from '../types';
import { worldToUV, uvToCanvas } from '../lib/coords';

interface Props {
  mapId: MapId;
  mapConfig: MapConfig;
  match: MatchData | null;
  currentOffsetMs: number;
  matchStartTs: number;
  showHumans: boolean;
  showBots: boolean;
  heatLayer: HeatLayer;
  heatGrid: number[] | null;
  heatBins: number;
  selectedPlayerId: string | null;
  onSelectPlayer: (userId: string | null) => void;
}

const CANVAS_SIZE = 1024;
const HIT_RADIUS = 9; // px, in canvas space

const imageCache = new Map<string, HTMLImageElement>();
function getImage(src: string): HTMLImageElement {
  let img = imageCache.get(src);
  if (!img) {
    img = new Image();
    img.src = src;
    imageCache.set(src, img);
  }
  return img;
}

function eventColor(ev: string): string {
  if (KILL_EVENTS.has(ev)) return '#e5484d';
  if (DEATH_EVENTS.has(ev)) return '#ff6b6b';
  if (STORM_EVENTS.has(ev)) return '#b66bff';
  if (LOOT_EVENTS.has(ev)) return '#6fcf73';
  return '#ffffff';
}

function eventLabel(ev: string): string {
  if (KILL_EVENTS.has(ev)) return 'Kill';
  if (DEATH_EVENTS.has(ev)) return 'Death';
  if (STORM_EVENTS.has(ev)) return 'Storm death';
  if (LOOT_EVENTS.has(ev)) return 'Loot';
  return ev;
}

interface HitTarget {
  kind: 'event' | 'player';
  px: number;
  py: number;
  userId: string;
  isBot: boolean;
  event?: PlayerEvent;
}

interface HoverInfo {
  target: HitTarget;
  clientX: number;
  clientY: number;
}

export default function MapViewport({
  mapId,
  mapConfig,
  match,
  currentOffsetMs,
  matchStartTs,
  showHumans,
  showBots,
  heatLayer,
  heatGrid,
  heatBins,
  selectedPlayerId,
  onSelectPlayer,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const hitTargetsRef = useRef<HitTarget[]>([]);
  const [hover, setHover] = useState<HoverInfo | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    const img = getImage(MAP_IMAGES[mapId]);
    const onImgLoad = () => draw();
    img.addEventListener('load', onImgLoad);

    function draw() {
      const hitTargets: HitTarget[] = [];

      ctx!.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx!.fillStyle = '#05070a';
      ctx!.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      if (img.complete && img.naturalWidth > 0) {
        ctx!.globalAlpha = 0.9;
        ctx!.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx!.globalAlpha = 1;
      }

      // subtle tactical grid
      ctx!.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx!.lineWidth = 1;
      for (let i = 1; i < 8; i++) {
        const p = (i / 8) * CANVAS_SIZE;
        ctx!.beginPath();
        ctx!.moveTo(p, 0);
        ctx!.lineTo(p, CANVAS_SIZE);
        ctx!.stroke();
        ctx!.beginPath();
        ctx!.moveTo(0, p);
        ctx!.lineTo(CANVAS_SIZE, p);
        ctx!.stroke();
      }

      // heatmap overlay
      if (heatLayer !== 'none' && heatGrid) {
        const cell = CANVAS_SIZE / heatBins;
        const max = Math.max(1, ...heatGrid);
        const color =
          heatLayer === 'kills'
            ? [229, 72, 77]
            : heatLayer === 'deaths'
            ? [255, 107, 107]
            : heatLayer === 'loot'
            ? [111, 207, 115]
            : [63, 208, 224];
        for (let by = 0; by < heatBins; by++) {
          for (let bx = 0; bx < heatBins; bx++) {
            const v = heatGrid[by * heatBins + bx];
            if (v === 0) continue;
            const intensity = Math.min(1, v / (max * 0.35));
            ctx!.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${0.08 + intensity * 0.55})`;
            ctx!.fillRect(bx * cell, by * cell, cell + 1, cell + 1);
          }
        }
      }

      // player paths + events
      if (match) {
        const nowTs = matchStartTs + currentOffsetMs;
        const hasSelection = !!selectedPlayerId;

        // draw dimmed/unselected players first, selected player last so it's on top
        const players = [...match.players].sort((a, b) => {
          if (a.userId === selectedPlayerId) return 1;
          if (b.userId === selectedPlayerId) return -1;
          return 0;
        });

        for (const player of players) {
          if (player.isBot && !showBots) continue;
          if (!player.isBot && !showHumans) continue;

          const pts = player.events.filter((e) => e.ts <= nowTs);
          if (pts.length === 0) continue;

          const isSelected = player.userId === selectedPlayerId;
          const isDimmed = hasSelection && !isSelected;
          const fade = isDimmed ? 0.12 : 1;

          // path line
          ctx!.beginPath();
          ctx!.lineWidth = (player.isBot ? 1.2 : 1.8) * (isSelected ? 1.4 : 1);
          const baseStroke = player.isBot
            ? [63, 208, 224]
            : [255, 159, 28];
          ctx!.strokeStyle = `rgba(${baseStroke[0]},${baseStroke[1]},${baseStroke[2]},${(player.isBot ? 0.55 : 0.85) * fade})`;
          if (player.isBot) ctx!.setLineDash([3, 3]);
          else ctx!.setLineDash([]);

          let started = false;
          for (const e of pts) {
            const [u, v] = worldToUV(e.x, e.z, mapConfig);
            const [px, py] = uvToCanvas(u, v, CANVAS_SIZE);
            if (!started) {
              ctx!.moveTo(px, py);
              started = true;
            } else {
              ctx!.lineTo(px, py);
            }
          }
          ctx!.stroke();
          ctx!.setLineDash([]);

          // current position dot
          const last = pts[pts.length - 1];
          const [lu, lv] = worldToUV(last.x, last.z, mapConfig);
          const [lpx, lpy] = uvToCanvas(lu, lv, CANVAS_SIZE);

          if (isSelected) {
            // selection ring
            ctx!.beginPath();
            ctx!.arc(lpx, lpy, 7, 0, Math.PI * 2);
            ctx!.strokeStyle = '#ffe27a';
            ctx!.lineWidth = 1.5;
            ctx!.stroke();
          }

          ctx!.beginPath();
          ctx!.globalAlpha = fade;
          ctx!.arc(lpx, lpy, player.isBot ? 2.5 : 3.5, 0, Math.PI * 2);
          ctx!.fillStyle = player.isBot ? '#3fd0e0' : '#ff9f1c';
          ctx!.fill();
          ctx!.globalAlpha = 1;

          hitTargets.push({
            kind: 'player',
            px: lpx,
            py: lpy,
            userId: player.userId,
            isBot: player.isBot,
          });

          // discrete event markers
          for (const e of pts) {
            if (
              !KILL_EVENTS.has(e.ev) &&
              !DEATH_EVENTS.has(e.ev) &&
              !STORM_EVENTS.has(e.ev) &&
              !LOOT_EVENTS.has(e.ev)
            )
              continue;
            const [u, v] = worldToUV(e.x, e.z, mapConfig);
            const [px, py] = uvToCanvas(u, v, CANVAS_SIZE);
            const color = eventColor(e.ev);
            ctx!.globalAlpha = fade;
            ctx!.beginPath();
            if (KILL_EVENTS.has(e.ev)) {
              // X marker for a kill
              ctx!.strokeStyle = color;
              ctx!.lineWidth = 2;
              ctx!.moveTo(px - 5, py - 5);
              ctx!.lineTo(px + 5, py + 5);
              ctx!.moveTo(px + 5, py - 5);
              ctx!.lineTo(px - 5, py + 5);
              ctx!.stroke();
            } else if (LOOT_EVENTS.has(e.ev)) {
              // small square for loot
              ctx!.fillStyle = color;
              ctx!.fillRect(px - 3, py - 3, 6, 6);
            } else {
              // triangle for death / storm death
              ctx!.fillStyle = color;
              ctx!.moveTo(px, py - 6);
              ctx!.lineTo(px + 5, py + 4);
              ctx!.lineTo(px - 5, py + 4);
              ctx!.closePath();
              ctx!.fill();
            }
            ctx!.globalAlpha = 1;

            hitTargets.push({
              kind: 'event',
              px,
              py,
              userId: player.userId,
              isBot: player.isBot,
              event: e,
            });
          }
        }
      }

      hitTargetsRef.current = hitTargets;
    }

    draw();
    return () => img.removeEventListener('load', onImgLoad);
  }, [
    mapId,
    mapConfig,
    match,
    currentOffsetMs,
    matchStartTs,
    showHumans,
    showBots,
    heatLayer,
    heatGrid,
    heatBins,
    selectedPlayerId,
  ]);

  function findHit(clientX: number, clientY: number): { target: HitTarget; clientX: number; clientY: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scale = CANVAS_SIZE / rect.width;
    const cx = (clientX - rect.left) * scale;
    const cy = (clientY - rect.top) * scale;

    let best: HitTarget | null = null;
    let bestDist = HIT_RADIUS;
    // prefer event markers over player dots when overlapping
    for (const t of hitTargetsRef.current) {
      const d = Math.hypot(t.px - cx, t.py - cy);
      if (d <= bestDist) {
        bestDist = d;
        best = t;
      }
    }
    if (!best) return null;
    return { target: best, clientX, clientY };
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const hit = findHit(e.clientX, e.clientY);
    setHover(hit);
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = hit ? 'pointer' : 'default';
  }

  function handleMouseLeave() {
    setHover(null);
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const hit = findHit(e.clientX, e.clientY);
    if (hit) {
      onSelectPlayer(hit.target.userId === selectedPlayerId ? null : hit.target.userId);
    } else {
      onSelectPlayer(null);
    }
  }

  const tooltipStyle = useMemo(() => {
    if (!hover || !frameRef.current) return null;
    const frameRect = frameRef.current.getBoundingClientRect();
    let left = hover.clientX - frameRect.left + 14;
    let top = hover.clientY - frameRect.top + 14;
    // keep inside frame roughly
    if (left > frameRect.width - 170) left = hover.clientX - frameRect.left - 184;
    if (top > frameRect.height - 90) top = hover.clientY - frameRect.top - 96;
    return { left, top };
  }, [hover]);

  return (
    <div ref={frameRef} style={{ position: 'absolute', inset: 0 }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />
      {hover && tooltipStyle && (
        <div className="map-tooltip" style={{ left: tooltipStyle.left, top: tooltipStyle.top }}>
          <div className="map-tooltip-row primary">
            {hover.target.isBot ? 'BOT' : 'PLAYER'} · {hover.target.userId.slice(0, 8)}
          </div>
          {hover.target.kind === 'event' && hover.target.event && (
            <>
              <div className="map-tooltip-row">{eventLabel(hover.target.event.ev)}</div>
              <div className="map-tooltip-row dim">
                {new Date(hover.target.event.ts).toLocaleTimeString()}
              </div>
            </>
          )}
          <div className="map-tooltip-row dim">Click to {hover.target.userId === selectedPlayerId ? 'deselect' : 'isolate path'}</div>
        </div>
      )}
    </div>
  );
}
