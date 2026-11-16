// The sardine shoal: a swirling silver ball that wraps into a ring around Catto.
// The far half of the ring is drawn on the back canvas, so he looks surrounded.
import { world, cat } from '../core/state';
import { clamp, lerp } from '../core/math';
import { depthOf } from '../core/depth';

export const SARDINES = {
  count: 130,
  countMobile: 80,
  engageR: .3,         // engages when Catto is within ball radius + this × cat size
  releaseR: 2.6,       // lets go if Catto gets further than this × cat size
  maxDepth: 120,       // …or deeper than this many metres
  cooldown: 2.5,       // seconds before it can engage again
  followSpeed: 1.6,
  homeSpeed: .5,
  ringIn: .8,          // ring inner radius, × cat size
  ringOut: 1.85,       // ring outer radius, × cat size
  backAlpha: .78,      // far half is drawn slightly faded
};

interface Sardine { th: number; rr: number; w: number; layer: number; s: number; x: number; y: number; vx: number; vy: number; back: boolean }
export const shoal = { x: 0, y: 0, engaged: false, cool: 0, e: 0 };
let sfish: Sardine[] = [];

export function initSardines() {
  const { W, G } = world, ox = G.ox;
  Object.assign(shoal, { x: ox + W * .5, y: G.tangY, engaged: false, cool: 0, e: 0 });
  sfish = Array.from({ length: W < 700 ? SARDINES.countMobile : SARDINES.count }, () => {
    const th = Math.random() * 6.28, rr = .1 + .9 * Math.random();
    return { th, rr, w: .45 + Math.random() * .35, layer: (Math.random() - .5) * 2, s: .85 + Math.random() * .4,
      x: shoal.x + Math.cos(th) * 120 * rr, y: shoal.y + Math.sin(th) * 60 * rr, vx: 0, vy: 0, back: false };
  });
}

export function updateSardines(dt: number, step: number) {
  const { W, H, G, t } = world, S = shoal, under = cat.under;
  const ballR = clamp(H * .17, 90, 170);
  const hx = G.ox + W * .5 + Math.sin(t * .18) * W * .2, hy = G.tangY + Math.sin(t * .3) * H * .06;
  const dc = Math.hypot(cat.wx - S.x, cat.wy - S.y);
  S.cool = Math.max(0, S.cool - dt);
  const catDeep = depthOf(cat.wy) > SARDINES.maxDepth;
  if (!S.engaged && under && !catDeep && S.cool <= 0 && dc < ballR + G.s * SARDINES.engageR) S.engaged = true;
  if (S.engaged) {
    const k = Math.min(1, dt * SARDINES.followSpeed); S.x += (cat.wx - S.x) * k; S.y += (cat.wy - S.y) * k;
    if (dc > G.s * SARDINES.releaseR || !under || catDeep) { S.engaged = false; S.cool = SARDINES.cooldown; }
  } else { const k = Math.min(1, dt * SARDINES.homeSpeed); S.x += (hx - S.x) * k; S.y += (hy - S.y) * k; }
  S.e += ((S.engaged ? 1 : 0) - S.e) * Math.min(1, dt * 1.5);
  const rin = G.s * SARDINES.ringIn * S.e, rout = lerp(ballR, G.s * SARDINES.ringOut, S.e), damp = Math.pow(.88, step);
  for (const f of sfish) {
    f.th += f.w * dt * (1 + S.e * .6);
    const rad = lerp(rin, rout, f.rr);
    const tx = S.x + Math.cos(f.th) * rad * 1.2, ty = S.y + Math.sin(f.th) * rad * .55 + f.layer * rad * .42;
    f.vx += (tx - f.x) * .02 * step; f.vy += (ty - f.y) * .02 * step;
    f.vx *= damp; f.vy *= damp; f.x += f.vx * step; f.y += f.vy * step;
    f.back = Math.sin(f.th) < 0;     // far side of the ring is drawn behind Catto
  }
}

function drawSilver(ctx: CanvasRenderingContext2D, f: Sardine, i: number) {
  const { W, H, t, sc, camX, camY } = world;
  const x = f.x - camX, y = f.y - camY; if (y < -20 || y > H + 20 || x < -30 || x > W + 30) return;
  const hd = Math.atan2(f.vy, f.vx);
  ctx.save(); ctx.translate(x, y); ctx.rotate(hd); if (Math.cos(hd) < 0) ctx.scale(1, -1);
  const k = f.s * sc * 1.2 * (f.back ? .82 : 1); ctx.scale(k, k);
  const sh = .5 + .5 * Math.sin(f.th * 2 + t * 2.5 + i);         // flash as they turn
  const c = Math.round(lerp(125, 238, sh));
  ctx.fillStyle = '#9fb3c6'; ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-16, -5); ctx.lineTo(-13, 0); ctx.lineTo(-16, 5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = `rgb(${c},${Math.min(255, c + 8)},${Math.min(255, c + 22)})`;
  ctx.beginPath(); ctx.ellipse(0, 0, 11, 3.6, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#2f4f72'; ctx.beginPath(); ctx.ellipse(.5, -1.9, 9, 1.4, 0, 0, 7); ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${.3 + sh * .55})`; ctx.beginPath(); ctx.ellipse(1, 1.2, 8, 1.2, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(7.6, -.4, 1.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(7.9, -.4, .9, 0, 7); ctx.fill();
  ctx.restore();
}

/** frontHalf=false → far half (back canvas), true → near half (front canvas). */
export function drawShoal(ctx: CanvasRenderingContext2D, frontHalf: boolean) {
  ctx.globalAlpha = frontHalf ? 1 : SARDINES.backAlpha;
  sfish.forEach((f, i) => { if (f.back !== frontHalf) drawSilver(ctx, f, i); });
  ctx.globalAlpha = 1;
}
