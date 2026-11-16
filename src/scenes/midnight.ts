// Scene 4 · Midnight zone: almost total darkness and marine snow drifting down.
// (Anglerfish + dumbo octopus live in actors/.)
import { world, light } from '../core/state';
import { mod, seg } from '../core/math';
import { MID_LEN, ABY_LEN } from '../core/timeline';

export const SNOW = {
  count: 220,
  fall: .35,       // px per frame
  sway: .15,
  parallax: .2,    // horizontal parallax with the camera
};

interface Flake { x: number; y: number; r: number; ph: number }
let snow: Flake[] = [];

export function initSnow() {
  const { W, H, G } = world;
  snow = Array.from({ length: SNOW.count }, () => ({ x: Math.random() * W, y: G.M0 - H * .6 + Math.random() * H * (MID_LEN + ABY_LEN + 1.2), r: .6 + Math.random() * 1.4, ph: Math.random() * 6 }));
}

export function updateSnow(step: number) {
  const { H, G, t } = world;
  for (const f of snow) { f.y += SNOW.fall * step; f.x += Math.sin(t * .4 + f.ph) * SNOW.sway; if (f.y > G.floorY) f.y = G.M0 - H * .6; }
}

/** Drawn after the night layer, so it glimmers in the dark. */
export function drawSnow(ctx: CanvasRenderingContext2D) {
  const { W, H, camX, camY } = world, night = light.night;
  if (snow.length && night > .5) {
    ctx.fillStyle = `rgba(220,235,240,${.35 * seg(night, .5, .9)})`;
    for (const f of snow) { const y = f.y - camY; if (y < -4 || y > H + 4) continue; ctx.beginPath(); ctx.arc(mod(f.x - camX * SNOW.parallax, W), y, f.r, 0, 7); ctx.fill(); }
  }
}
