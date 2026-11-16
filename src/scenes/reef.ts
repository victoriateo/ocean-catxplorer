// Scene 2 · Sunlit reef: walls of stacked rounded boulders with corals growing on top.
// Laid out with a seeded PRNG so the reef looks the same on every load.
import { world } from '../core/state';
import { lerp, mulberry, seg, type Rnd } from '../core/math';
import { drawSprite } from '../assets/sprites';

export const REEF = {
  seed: 7,
  rockCols: ['#2b3486', '#33399a', '#272f78', '#3a3ea3'],
  backing: '#232a6e',
  coralTypes: ['frond', 'white', 'sponge', 'soft', 'fan', 'urchin', 'blue', 'frond', 'sponge', 'white', 'soft'],
};

type Seg = [number, number, number, number, number];
export interface Coral {
  type: string; x: number; y: number; s: number; ph: number; side: number; col?: string;
  strands?: { a: number; l: number; ph: number }[]; segs?: Seg[];
  tubes?: { dx: number; h: number; w: number }[]; blobs?: { dx: number; dy: number; r: number }[];
}
interface Boulder { side: number; y: number; r: number; ry: number; x: number; col: string; dots: number[][]; items: Coral[] }
let boulders: Boulder[] = [];

/** Coral type → painted image ('blue' has no painting and stays code-drawn). */
const CORAL_ART: Record<string, string> = { frond: 'coral-frond', white: 'coral-white', sponge: 'coral-sponge', soft: 'coral-soft', fan: 'coral-fan', urchin: 'urchin' };
const CORAL_SWAY: Record<string, [number, number]> = { frond: [1.3, .06], fan: [.8, .05] };   // [speed, radians]

export function makeBranch(rnd: Rnd, size: number, tilt: number, depth = 3, wmul = 1) {
  const segs: Seg[] = [];
  (function br(x: number, y: number, len: number, ang: number, w: number, d: number) {
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    segs.push([x, y, x2, y2, w]);
    if (d > 0) for (const sgn of [-1, 1]) br(x2, y2, len * (.62 + rnd() * .2), ang + sgn * (.3 + rnd() * .35), w * .72, d - 1);
  })(0, 0, size * 24, -Math.PI / 2 + tilt, size * 7 * wmul, depth);
  return segs;
}

function decorate(it: Coral, rnd: Rnd) {
  const s = it.s, pick = (a: string[]) => a[Math.floor(rnd() * a.length)];
  if (it.type === 'frond') { it.col = pick(['#d63fa0', '#ee5fbf']); it.strands = Array.from({ length: 3 + Math.floor(rnd() * 3) }, () => ({ a: (rnd() - .5) * 1, l: (40 + rnd() * 50) * s, ph: rnd() * 6 })); }
  if (it.type === 'white') it.segs = makeBranch(rnd, s * .9, -it.side * .2, 4, .4);
  if (it.type === 'blue') it.segs = makeBranch(rnd, s * .7, -it.side * .2, 3, 1);
  if (it.type === 'sponge') { it.col = pick(['#38c6c6', '#2aa9b5']); const n = 3 + Math.floor(rnd() * 3); it.tubes = Array.from({ length: n }, (_, i) => ({ dx: (i - (n - 1) / 2) * 10 * s + (rnd() - .5) * 4, h: (18 + rnd() * 30) * s, w: (7 + rnd() * 3) * s })); }
  if (it.type === 'soft') { it.col = pick(['#4fd1c5', '#7fdcd2']); it.blobs = Array.from({ length: 7 }, () => ({ dx: (rnd() - .5) * 34 * s, dy: -rnd() * 26 * s, r: (8 + rnd() * 8) * s })); }
}

export function initReef() {
  const { W, H, G, sc } = world;
  const rnd = mulberry(REEF.seed), ox = G.ox;
  const y0 = G.R0 - H * .25, y1 = G.R0 + G.reefLen;
  boulders = [];
  const rockCols = REEF.rockCols, types = REEF.coralTypes;
  for (const side of [-1, 1]) {
    for (let y = y0; y < y1; y += (42 + rnd() * 34) * sc) {
      const taper = Math.min(seg(y, y0, y0 + H * .35), 1 - seg(y, y1 - H * .5, y1));
      if (taper < .08) continue;
      const r = (55 + rnd() * 60) * sc * (.5 + .5 * taper);
      const inset = G.wallMax * taper * (.45 + rnd() * .55);
      const b: Boulder = { side, y, r, ry: r * (.72 + rnd() * .18), x: side < 0 ? ox + inset - r * .55 : ox + W - inset + r * .55,
        col: rockCols[Math.floor(rnd() * 4)], dots: [], items: [] };
      for (let k = 0; k < 12; k++) { const a = rnd() * 6.28, d = Math.sqrt(rnd()) * .85; b.dots.push([Math.cos(a) * d, Math.sin(a) * d, .8 + rnd() * 1.6]); }
      const n = 2 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) {
        const a = side < 0 ? -Math.PI * (.12 + rnd() * .5) : -Math.PI * (.38 + rnd() * .5);
        const it: Coral = { type: types[Math.floor(rnd() * types.length)], x: b.x + Math.cos(a) * b.r * .82, y: b.y + Math.sin(a) * b.ry * .82,
          s: (1 + rnd() * .7) * sc, ph: rnd() * 6, side };
        decorate(it, rnd); b.items.push(it);
      }
      boulders.push(b);
    }
  }
  boulders.sort((a, b) => a.y - b.y);
}

export function drawReef(ctx: CanvasRenderingContext2D) {
  const { W, H, G, sc, camX, camY } = world;
  const top = camY - 200, bot = camY + H + 200;
  if (G.R0 + G.reefLen < top || G.R0 - H * .4 > bot) return;
  const vis = (b: Boulder) => !(b.y + b.ry + 140 < top || b.y - b.ry - 160 > bot);
  // backing strip to the screen edge so the wall has no gaps
  ctx.fillStyle = REEF.backing;
  for (const b of boulders) {
    if (!vis(b)) continue;
    const x = b.x - camX, y = b.y - camY;
    if (b.side < 0) ctx.fillRect(G.ox - camX - 20, y - b.ry * .75, x - (G.ox - camX - 20), b.ry * 1.5);
    else ctx.fillRect(x, y - b.ry * .75, G.ox + W - camX + 20 - x, b.ry * 1.5);
  }
  // ledge for the anemone
  const ly = G.aY + 24 * sc - camY;
  if (ly > -120 && ly < H + 120) {
    const lx = G.ox - camX + (G.anX - G.ox) * .5, lr = (G.anX - G.ox) * .5 + 75 * sc;
    ctx.fillStyle = '#2b3486'; ctx.beginPath(); ctx.ellipse(lx, ly, lr, 38 * sc, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(120,130,235,.3)'; ctx.beginPath(); ctx.ellipse(lx, ly - 18 * sc, lr * .85, 12 * sc, 0, 0, 7); ctx.fill();
  }
  for (const b of boulders) {
    if (!vis(b)) continue;
    const x = b.x - camX, y = b.y - camY;
    for (const it of b.items) drawCoral(ctx, it, it.x - camX, it.y - camY);
    if (drawSprite(ctx, 'boulder', x, y, { unit: b.r * 2, sy: b.ry / b.r, flipX: b.side > 0 })) continue;
    ctx.fillStyle = b.col; ctx.beginPath(); ctx.ellipse(x, y, b.r, b.ry, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(120,130,235,.32)'; ctx.beginPath(); ctx.ellipse(x - b.r * .12, y - b.ry * .45, b.r * .85, b.ry * .5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(12,15,55,.28)'; ctx.beginPath(); ctx.ellipse(x + b.r * .1, y + b.ry * .6, b.r * .95, b.ry * .45, 0, 0, 7); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(185,195,255,.35)';
    for (const [dx, dy, r] of b.dots) { ctx.beginPath(); ctx.arc(x + dx * b.r, y + dy * b.ry, r, 0, 7); ctx.fill(); }
  }
}

export function drawCoral(ctx: CanvasRenderingContext2D, it: Coral, x: number, y: number) {
  const { t } = world;
  const s = it.s;
  const art = CORAL_ART[it.type], sway = CORAL_SWAY[it.type];
  if (art && drawSprite(ctx, art, x, y, { k: s / world.sc, flipX: it.side > 0, rot: sway ? Math.sin(t * sway[0] + it.ph) * sway[1] : 0 })) return;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  switch (it.type) {
    case 'frond':
      ctx.strokeStyle = it.col!;
      for (const st of it.strands!) {
        const sw = Math.sin(t * 1.3 + st.ph) * 12 * s;
        const ex = x + Math.sin(st.a) * st.l + sw, ey = y - Math.cos(st.a) * st.l;
        const mx = x + Math.sin(st.a) * st.l * .5 - sw * .5, my = y - Math.cos(st.a) * st.l * .55;
        let px = x, py = y;
        for (let k = 1; k <= 8; k++) {
          const u = k / 8, qx = (1 - u) * (1 - u) * x + 2 * (1 - u) * u * mx + u * u * ex, qy = (1 - u) * (1 - u) * y + 2 * (1 - u) * u * my + u * u * ey;
          ctx.lineWidth = lerp(5.5, 1.5, u) * s; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(qx, qy); ctx.stroke(); px = qx; py = qy;
        }
      }
      break;
    case 'white': case 'blue':
      ctx.strokeStyle = it.type === 'white' ? '#d6f3ff' : '#5b7cfa';
      for (const [x1, y1, x2, y2, w] of it.segs!) { ctx.lineWidth = Math.max(1.2, w); ctx.beginPath(); ctx.moveTo(x + x1, y + y1); ctx.lineTo(x + x2, y + y2); ctx.stroke(); }
      break;
    case 'sponge':
      for (const tb of it.tubes!) {
        const tx = x + tb.dx;
        ctx.fillStyle = it.col!; ctx.beginPath(); ctx.moveTo(tx - tb.w / 2, y); ctx.lineTo(tx - tb.w * .62, y - tb.h); ctx.lineTo(tx + tb.w * .62, y - tb.h); ctx.lineTo(tx + tb.w / 2, y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(tx - tb.w * .45, y - tb.h, tb.w * .25, tb.h);
        ctx.fillStyle = '#9ff0ea'; ctx.beginPath(); ctx.ellipse(tx, y - tb.h, tb.w * .64, tb.w * .28, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#145e6e'; ctx.beginPath(); ctx.ellipse(tx, y - tb.h, tb.w * .42, tb.w * .16, 0, 0, 7); ctx.fill();
      }
      break;
    case 'soft':
      ctx.fillStyle = it.col!;
      for (const b of it.blobs!) { ctx.beginPath(); ctx.arc(x + b.dx, y + b.dy, b.r, 0, 7); ctx.fill(); }
      ctx.fillStyle = 'rgba(225,255,250,.6)';
      it.blobs!.forEach((b, k) => { for (let d = 0; d < 3; d++) { ctx.beginPath(); ctx.arc(x + b.dx + Math.cos(k + d * 2.1) * b.r * .5, y + b.dy + Math.sin(k + d * 2.1) * b.r * .5, 1.3, 0, 7); ctx.fill(); } });
      break;
    case 'fan':
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * .8 + it.ph) * .05);
      ctx.fillStyle = '#a99be8'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 28 * s, -Math.PI * .85, -Math.PI * .15); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(60,50,140,.35)'; ctx.lineWidth = 1.5;
      for (let k = 0; k < 7; k++) { const a = -Math.PI * .82 + k * Math.PI * .107; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 27 * s, Math.sin(a) * 27 * s); ctx.stroke(); }
      ctx.restore(); break;
    case 'urchin': {
      const cy = y - 5 * s;
      ctx.strokeStyle = '#141633'; ctx.lineWidth = 1.5;
      for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2 + Math.sin(t + it.ph + k) * .05; ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + Math.cos(a) * 14 * s, cy + Math.sin(a) * 14 * s); ctx.stroke(); }
      ctx.fillStyle = '#141633'; ctx.beginPath(); ctx.arc(x, cy, 6.5 * s, 0, 7); ctx.fill();
      ctx.fillStyle = '#7be0a0'; for (let k = 0; k < 5; k++) { const a = k * 1.3 + it.ph; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 3 * s, cy + Math.sin(a) * 3 * s, 1, 0, 7); ctx.fill(); }
      break;
    }
  }
}
