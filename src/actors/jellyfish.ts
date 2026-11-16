// Moon jellies: pulse up, sink slowly. A boop pushes the jelly away, flashes its glow
// and nudges Catto back. (Stays code-drawn — SPEC §7.)
import { world, cat, nearCat } from '../core/state';
import { clamp } from '../core/math';

export const JELLY = {
  count: 5,
  boopR: .38,        // touch distance = jelly radius + this × cat size
  boopPush: 3,       // impulse given to the jelly
  boopNudge: 22,     // px Catto is nudged back
  boopCool: .6,      // seconds between boops
  glowFade: .7,      // glow lost per second
  pulseRate: 1.7,
};

interface Tentacle { u: number; len: number; w: number; col: string; ph: number }
interface Jelly { x: number; y: number; vx: number; vy: number; ph: number; seed: number; glow: number; cool: number; r: number; tents: Tentacle[] }
let jellies: Jelly[] = [];

export function initJellies() {
  const { W, H, G } = world, ox = G.ox;
  jellies = Array.from({ length: JELLY.count }, (_, i) => ({ x: ox + W * (.22 + i * .14), y: G.jellyY + (Math.random() - .5) * H * .6, vx: 0, vy: 0,
    ph: Math.random() * 6, seed: Math.random() * 6, glow: 0, cool: 0, r: G.s * (.2 + Math.random() * .12), tents: [] as Tentacle[] }));
}

/** Tentacles are generated last in the prototype's init order. */
export function initJellyTentacles() {
  for (const j of jellies) j.tents = Array.from({ length: 9 }, (_, k) => ({ u: (k + .5) / 9, len: j.r * (1.6 + Math.random() * 3.4), w: .9 + Math.random() * 1.2,
    col: ['255,170,215', '240,235,255', '215,180,255'][k % 3], ph: Math.random() * 6 }));
}

export function updateJellies(dt: number, step: number) {
  const { W, H, G, t } = world, F = cat.F;
  for (const j of jellies) {
    j.ph += dt * JELLY.pulseRate;
    j.vy += (-Math.max(0, Math.cos(j.ph)) * .045 + .012) * step;
    j.vx += Math.sin(t * .3 + j.seed) * .002 * step;
    const c = nearCat(j.x, j.y, j.r + G.s * JELLY.boopR);
    if (c && j.cool <= 0) { j.vx += c.dx / c.d * JELLY.boopPush; j.vy += c.dy / c.d * JELLY.boopPush; j.glow = 1; j.cool = JELLY.boopCool; F.x -= c.dx / c.d * JELLY.boopNudge; F.y -= c.dy / c.d * JELLY.boopNudge; }
    j.cool -= dt; j.glow = Math.max(0, j.glow - dt * JELLY.glowFade);
    j.vx *= .97; j.vy *= .97; j.x += j.vx * step; j.y += j.vy * step;
    if (j.y < G.jellyY - H * .45) j.vy += .05; if (j.y > G.jellyY + H * .45) j.vy -= .05;
    if (j.x < G.ox + W * .15) j.vx += .05; if (j.x > G.ox + W * .85) j.vx -= .05;
  }
}

function drawJelly(ctx: CanvasRenderingContext2D, j: Jelly) {
  const { H, t, camX, camY } = world;
  const x = j.x - camX, y = j.y - camY; if (y < -j.r * 6 || y > H + j.r * 2) return;
  const p = (Math.sin(j.ph) + 1) / 2, rw = j.r * (1 + p * .12), rh = j.r * (.8 - p * .16), g = j.glow;
  ctx.lineCap = 'round';
  // soft halo
  const halo = ctx.createRadialGradient(x, y - rh * .3, 2, x, y - rh * .3, rw * 2.2);
  halo.addColorStop(0, `rgba(255,190,235,${.22 + g * .3})`); halo.addColorStop(1, 'rgba(255,190,235,0)');
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y - rh * .3, rw * 2.2, 0, 7); ctx.fill();
  // long trailing tentacles of different lengths, drifting behind the motion
  const drift = clamp(-j.vx * 4, -12, 12);
  for (const tn of j.tents) {
    const bx_ = x - rw * .9 + tn.u * rw * 1.8;
    ctx.strokeStyle = `rgba(${tn.col},${.5 + g * .3})`; ctx.lineWidth = tn.w;
    ctx.beginPath(); ctx.moveTo(bx_, y);
    for (let k = 1; k <= 14; k++) { const u = k / 14; ctx.lineTo(bx_ + Math.sin(t * 1.8 - k * .45 + tn.ph) * (2 + u * 9) + drift * u, y + u * tn.len); }
    ctx.stroke();
  }
  // frilly oral arms
  for (const ox_ of [-.22, 0, .22]) {
    const len = j.r * (1.3 + Math.abs(ox_) * -1.5 + .4);
    ctx.strokeStyle = `rgba(225,245,255,${.42 + g * .3})`; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x + ox_ * rw, y);
    for (let k = 1; k <= 18; k++) { const u = k / 18; ctx.lineTo(x + ox_ * rw + Math.sin(t * 1.4 - k * .3 + ox_ * 9) * (3 + u * 5) + Math.sin(k * 2.3) * 2.2 + drift * u * .6, y + u * len); }
    ctx.stroke();
  }
  // bell: translucent outer dome with a pink glowing core
  ctx.shadowColor = `rgba(255,200,240,${.7 + g * .3})`; ctx.shadowBlur = 14 + g * 30;
  const bell = ctx.createLinearGradient(0, y - rh, 0, y);
  bell.addColorStop(0, `rgba(240,232,255,${.42 + g * .25})`); bell.addColorStop(1, `rgba(220,215,255,${.16 + g * .2})`);
  ctx.fillStyle = bell; ctx.beginPath(); ctx.ellipse(x, y, rw, rh, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  const core = ctx.createRadialGradient(x, y - rh * .35, 1, x, y - rh * .35, rw * .7);
  core.addColorStop(0, `rgba(255,150,210,${.65 + g * .3})`); core.addColorStop(1, 'rgba(255,150,210,0)');
  ctx.fillStyle = core; ctx.beginPath(); ctx.ellipse(x, y - rh * .3, rw * .7, rh * .55, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1;
  for (let k = 1; k < 8; k++) { const a = Math.PI + k / 8 * Math.PI; ctx.beginPath(); ctx.moveTo(x, y - rh * .15); ctx.lineTo(x + Math.cos(a) * rw * .95, y + Math.sin(a) * rh * .95); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(x - rw * .1, y - rh * .1, rw * .78, rh * .75, 0, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
  // glowing rim with a scalloped frill
  ctx.shadowColor = 'rgba(255,255,255,.9)'; ctx.shadowBlur = 8 + g * 16;
  ctx.strokeStyle = `rgba(255,255,255,${.75 + g * .25})`; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y, rw, rh, 0, Math.PI, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - rw, y);
  for (let k = 1; k <= 16; k++) { const xx = x - rw + k / 16 * rw * 2; ctx.quadraticCurveTo(xx - rw / 16, y + 4 + Math.sin(t * 3 + k) * 1.5, xx, y); }
  ctx.stroke(); ctx.shadowBlur = 0;
}

export function drawJellies(ctx: CanvasRenderingContext2D) {
  for (const j of jellies) drawJelly(ctx, j);
}
