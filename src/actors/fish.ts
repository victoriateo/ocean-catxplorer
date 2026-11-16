// Small red fish in the shallows and along the reef. They scatter away from Catto.
import { world, nearCat } from '../core/state';
import { angLerp, lerp } from '../core/math';

export const FISH = {
  count: 18,
  countMobile: 10,     // fewer on phones
  shallow: 8,          // the first N live near the surface, the rest along the reef
  scatterR: .95,       // flee radius, × cat size
  fleeBoost: 4,        // speed multiplier at point-blank range
  fleeTurn: .18,       // how hard they turn away per frame
};

interface Fish { x: number; y: number; top: number; bot: number; a: number; v: number; s: number; ph: number; c: string }
let fish: Fish[] = [];

export function initFish() {
  const { W, H, G, sc } = world, ox = G.ox;
  fish = [];
  const n = world.mobile ? FISH.countMobile : FISH.count, nShallow = world.mobile ? Math.round(FISH.shallow * FISH.countMobile / FISH.count) : FISH.shallow;
  for (let i = 0; i < n; i++) {
    const shallow = i < nShallow;
    const top = shallow ? G.WL + H * .38 : G.R0 + H * .2, bot = shallow ? G.WL + H * 1.15 : G.R0 + H * 3.2;
    fish.push({ x: ox + Math.random() * W, y: lerp(top, bot, Math.random()), top, bot, a: Math.random() * 6.28,
      v: .6 + Math.random() * .5, s: (.9 + Math.random() * .6) * sc, ph: Math.random() * 6, c: i % 3 ? '#e9545e' : '#f2774f' });
  }
}

export function updateFish(dt: number, step: number) {
  const { W, G, t, camX } = world;
  const R = G.s * FISH.scatterR;
  for (const f of fish) {
    f.a += Math.sin(t * .7 + f.ph) * .5 * dt;
    let sp = f.v; const n = nearCat(f.x, f.y, R);
    if (n) { f.a = angLerp(f.a, Math.atan2(n.dy, n.dx), FISH.fleeTurn); sp = f.v + f.v * FISH.fleeBoost * (1 - n.d / R); }
    if (f.y < f.top) f.a = angLerp(f.a, Math.PI / 2, .05);
    if (f.y > f.bot) f.a = angLerp(f.a, -Math.PI / 2, .05);
    f.x += Math.cos(f.a) * sp * step; f.y += Math.sin(f.a) * sp * step;
    if (f.x - camX < -40) f.x += W + 80; if (f.x - camX > W + 40) f.x -= W + 80;
  }
}

export function eye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.fillStyle = '#16324a'; ctx.beginPath(); ctx.arc(x + r * .25, y, r * .58, 0, 7); ctx.fill();
}

function drawOne(ctx: CanvasRenderingContext2D, f: Fish) {
  const { W, H, t, camX, camY } = world;
  const x = f.x - camX, y = f.y - camY; if (y < -30 || y > H + 30 || x < -40 || x > W + 40) return;
  ctx.save(); ctx.translate(x, y);
  const dir = Math.cos(f.a) < 0 ? -1 : 1;
  ctx.scale(dir * f.s, f.s); ctx.rotate(Math.atan2(Math.sin(f.a), Math.abs(Math.cos(f.a))) * .6);
  ctx.fillStyle = f.c;
  ctx.save(); ctx.translate(-10, 0); ctx.rotate(Math.sin(t * 9 + f.ph) * .35);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-12, -9); ctx.quadraticCurveTo(-7, 0, -12, 9); ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.beginPath(); ctx.ellipse(0, 0, 13, 8.5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,225,205,.35)'; ctx.beginPath(); ctx.ellipse(1, 3.5, 9, 3, 0, 0, 7); ctx.fill();
  eye(ctx, 5, -1.5, 4.3);
  ctx.restore();
}

export function drawFish(ctx: CanvasRenderingContext2D) {
  for (const f of fish) drawOne(ctx, f);
}
