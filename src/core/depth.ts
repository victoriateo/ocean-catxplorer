// World y → metres (piecewise linear per scene, SPEC §2), zone names and meter position.
import { TWI_LEN, MID_LEN, ABY_LEN, MAX_DEPTH } from './timeline';
import { world } from './state';

export function depthOf(wy: number) {
  const { G, H } = world;
  const d = (wy - G.WL) / H;
  if (d <= G.D1) return d / G.D1 * 200;
  if (d <= G.D1 + TWI_LEN) return 200 + (d - G.D1) / TWI_LEN * 800;
  if (d <= G.D1 + TWI_LEN + MID_LEN) return 1000 + (d - G.D1 - TWI_LEN) / MID_LEN * 3000;
  return Math.min(MAX_DEPTH, 4000 + (d - G.D1 - TWI_LEN - MID_LEN) / ABY_LEN * 6935);
}

export function zoneName(depth: number, under: boolean) {
  return !under ? 'Surface' : depth < 200 ? 'Sunlit zone' : depth < 1000 ? 'Twilight zone' : depth < 4000 ? 'Midnight zone' : depth < 6000 ? 'Abyss' : 'Trench';
}

/** Paw marker position on the meter track, in % (ticks: 0 / 20 / 42 / 66 / 88). */
export function pawPercent(depth: number) {
  return depth <= 200 ? depth / 200 * 20
    : depth <= 1000 ? 20 + (depth - 200) / 800 * 22
    : depth <= 4000 ? 42 + (depth - 1000) / 3000 * 24
    : depth <= 6000 ? 66 + (depth - 4000) / 2000 * 22
    : Math.min(99, 88 + (depth - 6000) / 4935 * 11);
}
