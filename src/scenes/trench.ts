// Scene 5 · Abyss → trench → Challenger Deep: narrowing walls, a pale sandy floor and the
// treasure garden around the chest (seeded, so it's the same every load).
import { world } from '../core/state';
import { mulberry } from '../core/math';
import { makeBranch } from './reef';

export const TRENCH = {
  gardenSeed: 42,
  wallCol: '#18222f',
  floorTop: '#6f8299', floorBottom: '#3c4c62',
};

interface Deco { type: string; x: number; y: number; s: number; col: string; ph: number; side: number; segs?: number[][]; blobs?: { dx: number; dy: number; r: number }[] }
let deco: Deco[] = [];
let walls: { y: number; w: number }[][] = [];

export function initTreasureGarden() {
  const { W, G, sc } = world;
  const r2 = mulberry(TRENCH.gardenSeed); deco = [];
  const S = G.s * .55, cx = G.chestX;
  const add = (type: string, x: number, dy: number, sz: number, col: string) => {
    const it: Deco = { type, x, y: G.floorY + dy, s: sz * sc, col, ph: r2() * 6, side: x < cx ? -1 : 1 };
    if (type === 'branch') it.segs = makeBranch(r2, it.s * 1.2, (x < cx ? .25 : -.25), 3, 1.25);
    if (type === 'soft') it.blobs = Array.from({ length: 9 }, () => ({ dx: (r2() - .5) * 46 * it.s, dy: -r2() * 34 * it.s, r: (9 + r2() * 9) * it.s }));
    deco.push(it);
  };
  // big corals framing the scene
  for (const [fx, sz, col] of [[-.42, 1.6, '#f2b48a'], [-.33, 1.1, '#5fc9c0'], [-.24, .9, '#f39ab0'], [.22, 1.0, '#5fc9c0'], [.3, 1.5, '#f39ab0'], [.38, 1.2, '#f2b48a']] as [number, number, string][])
    add(sz > 1.05 && col !== '#5fc9c0' ? 'branch' : 'soft', cx + fx * W, 6 + r2() * 10, sz, col);
  for (let i = 0; i < 5; i++) add('shell', cx + (r2() < .5 ? -1 : 1) * (S * 1.4 + r2() * W * .3), 14 + r2() * 30, .7 + r2() * .5, '#f3dcc4');
  for (let i = 0; i < 14; i++) add('pearl', cx + (r2() - .5) * W * .55, 10 + r2() * 40, .6 + r2() * .6, '#f6efe4');
  const gems = ['#3fcf7a', '#5ab8f0', '#f2b23a'];
  for (let i = 0; i < 10; i++) add('gem', cx + (r2() - .5) * W * .5, 12 + r2() * 40, .7 + r2() * .6, gems[i % 3]);
  for (let i = 0; i < 12; i++) add('coin', cx + (r2() - .5) * W * .45, 14 + r2() * 36, .8, '#e3b448');
  deco = deco.filter(d => Math.abs(d.x - cx) > S * .75 || d.y > G.floorY + 30);
  deco.sort((a, b) => a.y - b.y);
}

export function initTrenchWalls() {
  const { W, H, G } = world;
  walls = Array.from({ length: 2 }, () => Array.from({ length: 14 }, (_, i) => ({ y: G.A0 + H * (1 + i * .25), w: W * (.04 + i * .012 + Math.random() * .03) * (W < 700 ? .7 : 1) })));
}

export function drawTrench(ctx: CanvasRenderingContext2D) {
  const { W, H, G, camX, camY } = world;
  const fy = G.floorY - camY;
  if (G.A0 + H - camY > H + 50) return;
  walls.forEach((pts, k) => {
    const side = k ? 1 : -1, edge = side < 0 ? -20 : W + 20;
    ctx.fillStyle = TRENCH.wallCol; ctx.beginPath(); ctx.moveTo(edge, pts[0].y - camY - H * .3);
    for (const p of pts) ctx.lineTo(side < 0 ? p.w : W - p.w, p.y - camY);
    ctx.lineTo(side < 0 ? W * .2 : W * .8, fy + 10); ctx.lineTo(edge, fy + 10); ctx.closePath(); ctx.fill();
  });
  if (fy > H + 120) return;
  // pale sandy floor
  const sg = ctx.createLinearGradient(0, fy - 10, 0, fy + H * .3);
  sg.addColorStop(0, TRENCH.floorTop); sg.addColorStop(1, TRENCH.floorBottom);
  ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(-10, fy);
  for (let x = 0; x <= W + 40; x += 40) ctx.lineTo(x, fy + Math.sin(x * .013) * 8 - Math.sin(x * .004) * 14);
  ctx.lineTo(W + 10, H + 10); ctx.lineTo(-10, H + 10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(225,235,245,.25)';
  for (let i = 0; i < 60; i++) { const x = (i * 97) % W, y = fy + 8 + (i * 37) % 80; ctx.beginPath(); ctx.arc(x, y, 1 + i % 3 * .6, 0, 7); ctx.fill(); }
  for (const d of deco) drawDeco(ctx, d, d.x - camX, d.y - camY);
}

function drawDeco(ctx: CanvasRenderingContext2D, d: Deco, x: number, y: number) {
  const { H, t } = world;
  if (y < -150 || y > H + 60) return;
  const s = d.s;
  switch (d.type) {
    case 'branch': ctx.lineCap = 'round'; ctx.strokeStyle = d.col;
      for (const [x1, y1, x2, y2, w] of d.segs!) { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x + x1, y + y1); ctx.lineTo(x + x2, y + y2); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      for (const [, , x2, y2] of d.segs!) { ctx.beginPath(); ctx.arc(x + x2, y + y2, 1.6, 0, 7); ctx.fill(); }
      break;
    case 'soft': ctx.fillStyle = d.col;
      for (const b of d.blobs!) { ctx.beginPath(); ctx.arc(x + b.dx, y + b.dy, b.r, 0, 7); ctx.fill(); }
      ctx.fillStyle = 'rgba(220,255,250,.55)';
      d.blobs!.forEach((b, k) => { for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.arc(x + b.dx + Math.cos(k + j * 1.6) * b.r * .55, y + b.dy + Math.sin(k + j * 1.6) * b.r * .55, 1.4, 0, 7); ctx.fill(); } });
      break;
    case 'shell':
      ctx.fillStyle = d.col; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, 16 * s, -Math.PI * .92, -Math.PI * .08); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(160,110,80,.45)'; ctx.lineWidth = 1.4;
      for (let k = 0; k < 6; k++) { const a = -Math.PI * .88 + k * Math.PI * .152; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 15 * s, y + Math.sin(a) * 15 * s); ctx.stroke(); }
      break;
    case 'pearl': {
      const r = 6 * s, g = ctx.createRadialGradient(x - r * .35, y - r * 1.35, 1, x, y - r, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#d9cfc2');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - r, r, 0, 7); ctx.fill(); break;
    }
    case 'gem': {
      const r = 8 * s;
      ctx.fillStyle = d.col; ctx.beginPath(); ctx.moveTo(x - r, y - r * .6); ctx.lineTo(x - r * .5, y - r * 1.2); ctx.lineTo(x + r * .5, y - r * 1.2); ctx.lineTo(x + r, y - r * .6); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.moveTo(x - r * .5, y - r * 1.2); ctx.lineTo(x, y - r * .6); ctx.lineTo(x - r, y - r * .6); ctx.closePath(); ctx.fill();
      const tw = Math.max(0, Math.sin(t * 2 + d.ph * 3)) ** 8;          // occasional twinkle
      if (tw > .05) { ctx.strokeStyle = `rgba(255,255,255,${tw})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + r * .3, y - r * 1.6); ctx.lineTo(x + r * .3, y - r * .8); ctx.moveTo(x - r * .1, y - r * 1.2); ctx.lineTo(x + r * .7, y - r * 1.2); ctx.stroke(); }
      break;
    }
    case 'coin':
      ctx.fillStyle = d.col; ctx.beginPath(); ctx.ellipse(x, y - 2, 7 * s, 3.5 * s, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#b8862c'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(x, y - 2, 4.5 * s, 2.2 * s, 0, 0, 7); ctx.stroke();
      break;
  }
}
