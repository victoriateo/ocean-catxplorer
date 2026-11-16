// Scene 5 · Abyss → trench → Challenger Deep: narrowing walls, a pale sandy floor and the
// treasure garden around the chest (seeded, so it's the same every load).
import { world } from '../core/state';
import { mulberry } from '../core/math';
import { makeBranch } from './reef';
import { drawSprite, sprite } from '../assets/sprites';
import { CHEST } from '../actors/chest';

export const TRENCH = {
  gardenSeed: 42,
  wallCol: '#18222f',
  floorTop: '#6f8299', floorBottom: '#3c4c62',
  wreckX: .34,          // shipwreck halves sit this far either side of the chest, × W
  wreckSize: 1,         // × cat size (× .62 on mobile)
  wood: '#5a4a44', woodDark: '#3d3233', woodLight: '#7c6a5e', iron: '#55606c',
};

interface Deco { type: string; x: number; y: number; s: number; col: string; ph: number; side: number; segs?: number[][]; blobs?: { dx: number; dy: number; r: number }[] }
let deco: Deco[] = [];
let walls: { y: number; w: number }[][] = [];

export function initTreasureGarden() {
  const { W, G, sc } = world;
  const r2 = mulberry(TRENCH.gardenSeed); deco = [];
  const S = G.s * CHEST.size * .9, cx = G.chestX;   // keep the garden clear of the chest
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
  const pile = !!sprite('pearls-gems');   // painted piles replace the loose pearls and gems (coins stay)
  drawWreck(ctx, fy);
  for (const d of deco) { if (pile && (d.type === 'pearl' || d.type === 'gem')) continue; drawDeco(ctx, d, d.x - camX, d.y - camY); }
  if (pile) for (const side of [-1, 1]) drawSprite(ctx, 'pearls-gems', G.chestX - camX + side * G.s * (CHEST.size * .6 + .5), fy + 26, { flipX: side > 0 });
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

// ─── Shipwreck ───────────────────────────────────────────────────────────────
// Two halves of an old wooden ship either side of the chest, half-sunk in the sand:
// left = the stern's bare ribs and a fallen mast, right = the bow with its anchor.
function drawWreck(ctx: CanvasRenderingContext2D, fy: number) {
  const { W, G, camX, mobile } = world;
  const u = G.s * TRENCH.wreckSize * (mobile ? .62 : 1), cx = G.chestX - camX;
  const { wood, woodDark, woodLight, iron } = TRENCH;
  const edge = 'rgba(150,175,205,.22)';   // faint cold light on top edges
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const line = (pts: number[][], w: number, col: string) => {
    ctx.strokeStyle = col; ctx.lineWidth = w * u; ctx.beginPath();
    pts.forEach(([a, b], i) => i ? ctx.lineTo(a * u, b * u) : ctx.moveTo(a * u, b * u)); ctx.stroke();
  };
  const curve = (a: number[], c: number[], b: number[], w: number, col: string) => {
    ctx.strokeStyle = col; ctx.lineWidth = w * u; ctx.beginPath(); ctx.moveTo(a[0] * u, a[1] * u); ctx.quadraticCurveTo(c[0] * u, c[1] * u, b[0] * u, b[1] * u); ctx.stroke();
  };

  // ── left: stern ribs + fallen mast ──
  ctx.save(); ctx.translate(cx - W * TRENCH.wreckX, fy + 10); ctx.rotate(-.05);
  // far-side ribs (darker, behind)
  for (let i = 0; i < 6; i++) { const x = -1.05 + i * .36, h = .55 + .3 * Math.sin(i * 1.9 + 1); curve([x + .1, .05], [x + .34, -h * .55], [x + .2, -h], .06, woodDark); }
  // fallen mast leaning across, with a yard and a rag of sail
  line([[-.5, .02], [.95, -1.45]], .1, woodDark);
  line([[.5, -1.3], [1.12, -.92]], .06, woodDark);
  ctx.fillStyle = 'rgba(190,185,170,.16)'; ctx.beginPath(); ctx.moveTo(.56 * u, -1.24 * u); ctx.lineTo(1.06 * u, -.93 * u); ctx.quadraticCurveTo(.95 * u, -.6 * u, 1.0 * u, -.42 * u); ctx.lineTo(.84 * u, -.55 * u); ctx.lineTo(.74 * u, -.4 * u); ctx.quadraticCurveTo(.62 * u, -.8 * u, .56 * u, -1.24 * u); ctx.fill();
  curve([.95, -1.45], [.9, -.9], [1.2, -.5], .015, 'rgba(190,185,170,.3)');   // dangling rope
  // keel lying in the sand
  curve([-1.3, .0], [-.2, -.12], [1.0, .06], .13, wood);
  // near-side ribs, a few snapped short
  const ribs = [.95, .78, 1.05, .5, .9, .36, .7];
  ribs.forEach((h, i) => { const x = -1.2 + i * .34; curve([x, .04], [x - .22, -h * .5], [x - .02 + i * .015, -h], .075, i % 2 ? wood : woodLight); });
  // the last planks still nailed across the stern end
  curve([-1.33, -.2], [-1.0, -.27], [-.62, -.2], .1, wood);
  curve([-1.36, -.42], [-1.05, -.5], [-.66, -.44], .1, woodDark);
  curve([-1.3, -.63], [-1.1, -.7], [-.9, -.66], .09, wood);
  curve([-1.33, -.25], [-1.0, -.32], [-.62, -.25], .012, edge);
  ctx.restore();

  // ── right: the bow, tipped over, with its anchor ──
  ctx.save(); ctx.translate(cx + W * TRENCH.wreckX, fy + 12); ctx.rotate(.07);
  const hull = () => {
    ctx.beginPath(); ctx.moveTo(-1.05 * u, .08 * u);
    ctx.lineTo(-1.0 * u, -.5 * u); ctx.lineTo(-.86 * u, -.38 * u); ctx.lineTo(-.76 * u, -.74 * u); ctx.lineTo(-.6 * u, -.6 * u); ctx.lineTo(-.5 * u, -.92 * u);   // broken, jagged end
    ctx.quadraticCurveTo(.4 * u, -1.0 * u, 1.18 * u, -1.22 * u);                                                                                    // deck rail up to the prow
    ctx.quadraticCurveTo(1.0 * u, -.35 * u, .5 * u, .08 * u); ctx.closePath();
  };
  const hg = ctx.createLinearGradient(0, -1.2 * u, 0, .1 * u); hg.addColorStop(0, woodLight); hg.addColorStop(.35, wood); hg.addColorStop(1, woodDark);
  hull(); ctx.fillStyle = hg; ctx.fill();
  ctx.save(); hull(); ctx.clip();
  for (let i = 0; i < 5; i++) curve([-1.1, -.12 - i * .19], [.2, -.2 - i * .2], [1.2, -.42 - i * .2], .018, 'rgba(20,14,16,.5)');   // plank seams
  ctx.fillStyle = 'rgba(15,12,18,.75)'; ctx.beginPath(); ctx.ellipse(-.35 * u, -.28 * u, .2 * u, .13 * u, -.2, 0, 7); ctx.fill();    // hole stove in the side
  ctx.restore();
  for (const [px, py] of [[.1, -.62], [.52, -.74]]) {   // portholes
    ctx.fillStyle = 'rgba(12,14,22,.85)'; ctx.beginPath(); ctx.arc(px * u, py * u, .075 * u, 0, 7); ctx.fill();
    ctx.strokeStyle = '#8a7a5c'; ctx.lineWidth = .028 * u; ctx.stroke();
  }
  curve([-.5, -.92], [.4, -1.0], [1.18, -1.22], .05, woodLight);     // rail
  curve([-.5, -.95], [.4, -1.03], [1.18, -1.25], .012, edge);
  line([[1.1, -1.18], [1.62, -1.5]], .055, wood);                    // bowsprit
  curve([1.6, -1.49], [1.45, -1.0], [1.05, -.75], .012, 'rgba(190,185,170,.3)');
  // anchor leaning against the hull
  ctx.save(); ctx.translate(-1.28 * u, -.02 * u); ctx.rotate(-.35);
  line([[0, -.62], [0, .02]], .05, iron);
  line([[-.16, -.5], [.16, -.5]], .045, iron);
  ctx.strokeStyle = iron; ctx.lineWidth = .04 * u; ctx.beginPath(); ctx.arc(0, -.69 * u, .065 * u, 0, 7); ctx.stroke();
  ctx.lineWidth = .055 * u; ctx.beginPath(); ctx.arc(0, -.22 * u, .26 * u, .12 * Math.PI, .88 * Math.PI); ctx.stroke();
  ctx.fillStyle = iron;
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sgn * .3 * u, -.18 * u); ctx.lineTo(sgn * .2 * u, -.1 * u); ctx.lineTo(sgn * .3 * u, -.02 * u); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  // a barrel half-buried in front
  ctx.save(); ctx.translate(.78 * u, .0); ctx.rotate(.5);
  ctx.fillStyle = wood; ctx.beginPath(); ctx.ellipse(0, 0, .24 * u, .16 * u, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = iron; ctx.lineWidth = .025 * u;
  for (const bx of [-.11, .11]) { ctx.beginPath(); ctx.ellipse(bx * u, 0, .035 * u, .145 * u, 0, 0, 7); ctx.stroke(); }
  ctx.restore();
  ctx.restore();

  // sand drifted over the bottoms, so both halves look sunk in rather than placed on top
  ctx.fillStyle = TRENCH.floorTop;
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + side * W * TRENCH.wreckX, fy + 22 + (side > 0 ? 6 : 0), 1.75 * u, .16 * u, 0, 0, 7); ctx.fill(); }
}
