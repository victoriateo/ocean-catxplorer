// Scene 1 · Shallows: the sea itself — colour by depth, waves, light rays, drifting specks,
// the waterline highlight, the translucent front tint and the edge vignette.
import { world, lite } from '../core/state';
import { mix, mod, seg } from '../core/math';
import { REEF_LEN } from '../core/timeline';
import { drawReef } from './reef';

export const SEA = {
  surface: '#5ec2ca',
  shallow: '#2f93a6',
  deep0: '#1f8399', deep1: '#0a2f42', deep2: '#071a36',
  motes: 170,
  motesLite: 90,        // on phones / reduced motion
  rays: 7,
};

interface Mote { x: number; y: number; r: number; ph: number }
let motes: Mote[] = [];

export function initMotes() {
  const { W, H, G } = world;
  motes = [];
  for (let i = 0, n = lite() ? SEA.motesLite : SEA.motes; i < n; i++) motes.push({ x: Math.random() * W, y: G.WL + Math.random() * H * 6.2, r: .6 + Math.random() * 1.6, ph: Math.random() * 6 });
}

export const wave = (x: number, t: number) => Math.sin(x * .018 + t * 1.7) * 3.5 + Math.sin(x * .0065 - t * 1.1) * 5;

export function seaPath(ctx: CanvasRenderingContext2D, wl: number) {
  const { W, H, t, camX } = world;
  ctx.beginPath(); ctx.moveTo(0, H + 10); ctx.lineTo(0, wl + wave(camX, t));
  for (let x = 12; x <= W + 12; x += 12) ctx.lineTo(x, wl + wave(x + camX, t));
  ctx.lineTo(W, H + 10); ctx.closePath();
}

/** Background water colour for the current camera depth. */
export function deepColour() {
  const { H, G, camY } = world;
  const dk = seg(camY, G.camEnd, G.camEnd + H * REEF_LEN);
  return dk < 1 ? mix(SEA.deep0, SEA.deep1, dk * dk) : mix(SEA.deep1, SEA.deep2, seg(camY, G.camEnd + H * REEF_LEN, G.camEnd + H * (REEF_LEN + 2)));
}

/** Sea body + (clipped to it) light rays, specks and the reef. */
export function drawSea(ctx: CanvasRenderingContext2D, wl: number, deep: string) {
  const { W, H, G, t, camX, camY } = world;
  seaPath(ctx, wl);
  const sea = ctx.createLinearGradient(0, wl, 0, wl + H * 1.35);
  sea.addColorStop(0, SEA.surface); sea.addColorStop(.3, SEA.shallow); sea.addColorStop(1, deep);
  ctx.fillStyle = sea; ctx.fill();

  ctx.save(); seaPath(ctx, wl); ctx.clip();
  // light rays fade with depth
  ctx.globalAlpha = 1 - .85 * seg(camY, G.camEnd + H, G.camEnd + H * REEF_LEN);
  const rg = ctx.createLinearGradient(0, wl, 0, wl + H * 1.4);
  rg.addColorStop(0, 'rgba(255,255,240,.16)'); rg.addColorStop(1, 'rgba(255,255,240,0)');
  ctx.fillStyle = rg;
  for (let i = 0; i < SEA.rays; i++) {
    const x0 = mod(W * (i / 6) + Math.sin(t * .3 + i * 1.7) * 40 - camX * .5, W + 200) - 100;
    const wdt = 18 + (i % 3) * 14;
    ctx.beginPath(); ctx.moveTo(x0 - wdt, wl); ctx.lineTo(x0 + wdt, wl);
    ctx.lineTo(x0 + wdt * 3 + 90, wl + H * 1.4); ctx.lineTo(x0 + 40, wl + H * 1.4); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(230,255,250,.35)';
  for (const m of motes) {
    const y = m.y - camY + Math.sin(t * .5 + m.ph) * 6; if (y < -5 || y > H + 5) continue;
    ctx.beginPath(); ctx.arc(mod(m.x + Math.sin(t * .3 + m.ph) * 10 - camX * .6, W), y, m.r, 0, 7); ctx.fill();
  }
  drawReef(ctx);
  ctx.restore();
}

/** Translucent tint over everything underwater + the wavy surface highlight (front canvas). */
export function drawWaterTint(ctx: CanvasRenderingContext2D) {
  const { W, H, G, t, camX, camY } = world;
  const wl = G.WL - camY;
  seaPath(ctx, wl); ctx.fillStyle = 'rgba(18,96,128,.16)'; ctx.fill();
  if (wl > -12 && wl < H + 12) {
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, wl + wave(camX, t));
    for (let x = 12; x <= W + 12; x += 12) ctx.lineTo(x, wl + wave(x + camX, t)); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, wl + 9 + wave(40 + camX, t) * .6);
    for (let x = 12; x <= W + 12; x += 12) ctx.lineTo(x, wl + 9 + wave(x + 40 + camX, t) * .6); ctx.stroke();
  }
}

/** Edge vignette, building as you go under. */
export function drawVignette(ctx: CanvasRenderingContext2D) {
  const { W, H, G, camY } = world;
  const dk = seg(camY, G.WL * .6, G.camEnd);
  if (dk > 0) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .75);
    vg.addColorStop(0, 'rgba(3,18,32,0)'); vg.addColorStop(1, `rgba(3,18,32,${(.3 + .3 * seg(camY, G.camEnd, G.camEnd + H * REEF_LEN)) * dk})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }
}
