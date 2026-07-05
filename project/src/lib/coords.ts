import type { MapConfig } from '../types';

/** World (x, z) -> normalized UV (0-1), per README formula. */
export function worldToUV(x: number, z: number, cfg: MapConfig): [number, number] {
  const u = (x - cfg.originX) / cfg.scale;
  const v = (z - cfg.originZ) / cfg.scale;
  return [u, v];
}

/** UV (0-1) -> canvas pixel coords for a square canvas of given size. Y is flipped. */
export function uvToCanvas(u: number, v: number, size: number): [number, number] {
  return [u * size, (1 - v) * size];
}
