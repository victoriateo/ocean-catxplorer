// Three clownfish and their anemone. They hide behind the front row of tentacles when Catto
// comes close, then peek out again one at a time.
import { world, nearCat } from '../core/state';
import { lerp } from '../core/math';

export const CLOWN = {
  hideR: 1.5,       // Catto within this × cat size → hide
  peekBase: 1,      // seconds of calm before the first one peeks out…
  peekStagger: .6,  // …and the gap between each of the others
  hideSpeed: 6,     // easing speed into the anemone
  swimSpeed: 1.4,   // easing speed while out
};

interface Clown { x: number; y: number; ph: number; rad: number; dir: number; vx: number }
let clowns: Clown[] = [];
let clownCalm = 10;

export function initClowns() {
  const { G } = world;
  clowns = [0, 1, 2].map(i => ({ x: G.anX + (i - 1) * 30, y: G.aY - 60, ph: i * 2.1, rad: 40 + i * 18, dir: 1, vx: 0 }));
}

export function updateClowns(dt: number) {
  const { G, t, sc } = world;
  const near = !!nearCat(G.anX, G.aY - 30 * sc, G.s * CLOWN.hideR);
  clownCalm = near ? 0 : clownCalm + dt;
  clowns.forEach((f, i) => {
    const hide = near || clownCalm < CLOWN.peekBase + i * CLOWN.peekStagger;
    const tx = hide ? G.anX + (i - 1) * 12 * sc : G.anX + Math.cos(t * .9 + f.ph) * f.rad * sc;
    const ty = hide ? G.aY - 16 * sc : G.aY - (62 + Math.sin(t * 1.3 + f.ph) * 22) * sc;
    const k = Math.min(1, dt * (hide ? CLOWN.hideSpeed : CLOWN.swimSpeed));
    const nx = f.x + (tx - f.x) * k; f.vx = nx - f.x; f.x = nx; f.y += (ty - f.y) * k;
    if (Math.abs(f.vx) > .05) f.dir = f.vx < 0 ? -1 : 1;
  });
}

function drawClown(ctx: CanvasRenderingContext2D, f: Clown) {
  const { H, t, sc, camX, camY } = world;
  const x = f.x - camX, y = f.y - camY; if (y < -40 || y > H + 40) return;
  ctx.save(); ctx.translate(x, y); const k = sc * 1.15; ctx.scale(f.dir * k, k);
  const O = '#ff7b1c', Od = '#e2560b', N = '#1f2a5c', Wt = '#fff8ef';
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.save(); ctx.translate(-13, 0); ctx.rotate(Math.sin(t * 11 + f.ph) * .25);
  ctx.fillStyle = O; ctx.beginPath(); ctx.moveTo(0, -3); ctx.quadraticCurveTo(-8, -12, -13, -9); ctx.quadraticCurveTo(-10, 0, -13, 9); ctx.quadraticCurveTo(-8, 12, 0, 3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = N; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-13, -9); ctx.quadraticCurveTo(-10, 0, -13, 9); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = O; ctx.beginPath(); ctx.moveTo(-9, -8); ctx.quadraticCurveTo(-4, -16, 3, -13); ctx.quadraticCurveTo(8, -12, 9, -8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = N; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-9, -9); ctx.quadraticCurveTo(-4, -16.5, 3, -13.5); ctx.quadraticCurveTo(8, -12.5, 9, -9); ctx.stroke();
  ctx.fillStyle = O; ctx.beginPath(); ctx.moveTo(-7, 8); ctx.quadraticCurveTo(-4, 15, 2, 13.5); ctx.lineTo(3, 8); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-7, 9); ctx.quadraticCurveTo(-4, 15.5, 2, 14); ctx.stroke();
  const body = () => { ctx.beginPath(); ctx.moveTo(17, 1); ctx.bezierCurveTo(16, -9, 6, -11.5, -4, -10); ctx.bezierCurveTo(-11, -9, -15, -5, -15, 0); ctx.bezierCurveTo(-15, 5, -11, 9, -4, 10); ctx.bezierCurveTo(6, 11.5, 16, 9, 17, 1); ctx.closePath(); };
  body(); ctx.fillStyle = O; ctx.fill();
  ctx.save(); body(); ctx.clip();
  ctx.fillStyle = Od; ctx.beginPath(); ctx.ellipse(0, 10, 20, 6, 0, 0, 7); ctx.fill();
  ctx.fillStyle = Wt; ctx.strokeStyle = N; ctx.lineWidth = 1.9;
  for (const [bx_, rw] of [[8.5, 3], [-3.5, 3.6], [-13.5, 2]]) { ctx.beginPath(); ctx.ellipse(bx_, 0, rw, 14, 0, 0, 7); ctx.fill(); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = O; ctx.beginPath(); ctx.ellipse(3.5, 3.5, 4.8, 2.6, .5 + Math.sin(t * 8 + f.ph) * .3, 0, 7); ctx.fill(); ctx.strokeStyle = N; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#16182e'; ctx.beginPath(); ctx.arc(12.5, -2.5, 2.1, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(13.1, -3.1, .7, 0, 7); ctx.fill();
  ctx.restore();
}

/** layer 0 = base + back tentacles, 1 = front row (drawn over the fish). */
function drawAnemone(ctx: CanvasRenderingContext2D, layer: 0 | 1) {
  const { H, G, t, sc, camX, camY } = world;
  const x = G.anX - camX, y = G.aY - camY; if (y < -170 || y > H + 120) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.lineCap = 'round';
  if (layer === 0) { ctx.fillStyle = '#5a2f96'; ctx.beginPath(); ctx.ellipse(0, 10, 44, 15, 0, 0, 7); ctx.fill(); }
  const sets: [number, number, string, string, number, number][] = layer === 0
    ? [[14, 1.0, '#6c3fb0', '#8b5fd0', 58, 0], [13, .92, '#8a5bd0', '#a77fe6', 50, .6]]
    : [[11, .8, '#a678ea', '#cfaeff', 40, 1.3]];
  for (const [n, spread, col, hi, len0, off] of sets) {
    for (let i = 0; i < n; i++) {
      const u = (i + .5) / n, bx_ = lerp(-34, 34, u) * spread, tilt = (bx_ / 34) * .55 + Math.sin(t * 1.5 + i * .7 + off) * .1;
      const len = len0 * (.85 + .25 * Math.cos(i * 1.7 + off));
      const ex = bx_ + Math.sin(tilt) * len, ey = 8 - Math.cos(tilt) * len;
      const cx_ = bx_ + Math.sin(tilt * .5) * len * .5, cy_ = 8 - len * .55;
      ctx.strokeStyle = col; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(bx_, 8); ctx.quadraticCurveTo(cx_, cy_, ex, ey); ctx.stroke();
      ctx.strokeStyle = hi; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(bx_ - 2, 4); ctx.quadraticCurveTo(cx_ - 2.5, cy_, ex - 2, ey + 3); ctx.stroke();
    }
  }
  ctx.restore();
}

/** Anemone back → clownfish → anemone front row. */
export function drawClownfishScene(ctx: CanvasRenderingContext2D) {
  drawAnemone(ctx, 0);
  for (const f of clowns) drawClown(ctx, f);
  drawAnemone(ctx, 1);
}
