// The treasure chest on the trench floor. Catto comes close → lid opens, coins burst out,
// a glowing tin of sardines floats up, Catto gets the happy face.
import { world, cat } from '../core/state';
import { clamp, eio, mix, seg } from '../core/math';
import { drawSprite, sprite } from '../assets/sprites';
import { mouse, onTap, pointerFresh, setHover } from '../core/input';

export const CHEST = {
  size: 1.55,        // chest width, × cat size (prototype: .62)
  openR: 2,          // opens when Catto is within this × cat size
  coins: 40,         // coins in the burst when it first opens
  happyTime: 4,      // seconds of happy face
  openSpeed: 3,
  haloR: 1.6,        // warm light around it, × cat size (grows as it opens)
  tinSize: .8,       // sardine tin width, × cat size
  tinDelay: .35,     // seconds after the lid starts opening before the tin appears
  tinTime: 3.2,      // seconds the tin takes to float up (prototype: under 1 s)
  tinRise: .12,      // how far the tin floats above the chest, × chest size
  // click / tap the chest → coins pour out
  flowTime: 2.6,     // seconds of coins per click
  flowRate: 26,      // coins per second
  pileClicks: 5,     // the first this-many clicks leave their coins on the sand; later ones fade away
  // click / tap the sardine tin → Catto says this
  tinSay: 'Meow! Delicious Best sardine ever!!',
  sayTime: 3.4,      // seconds the speech bubble stays
};

interface Coin { x: number; y: number; vx: number; vy: number; life: number; r: number; /** stays on the sand once it lands */ keep: boolean; /** how far "toward the viewer" it lands, px */ gy: number; spin: number }
interface Resting { x: number; y: number; r: number; tilt: number }
export const chest = {
  open: 0, opened: false, coins: [] as Coin[],
  /** tin's float-up progress, 0→1 (starts below 0 for the delay) */
  tin: 0,
  /** coins lying on the sand */
  pile: [] as Resting[],
  clicks: 0, flow: 0, flowKeep: false, flowAcc: 0,
  /** where the tin was last drawn (screen px), for click tests */
  tinAt: { x: 0, y: 0, r: 0 },
};

export function initChest() {
  Object.assign(chest, { open: 0, opened: false, coins: [], tin: 0, pile: [], clicks: 0, flow: 0, flowKeep: false, flowAcc: 0 });
  hookTap();
}

const size = () => world.G.s * CHEST.size;
const overTin = (sx: number, sy: number) => chest.tin > .25 && Math.hypot(sx - chest.tinAt.x, sy - chest.tinAt.y) < chest.tinAt.r;
function overChest(sx: number, sy: number) {
  const { G, camX, camY } = world, S = size(), x = G.chestX - camX, fy = G.floorY - camY;
  return Math.abs(sx - x) < S * .6 && sy < fy + 4 && sy > fy - S * 1.15;
}

function openUp() {
  const S = size();
  chest.opened = true; cat.happy = CHEST.happyTime; chest.tin = -CHEST.tinDelay / CHEST.tinTime;
  for (let i = 0; i < CHEST.coins; i++) spawnCoin(false, (Math.random() - .5) * S * .5, (Math.random() - .5) * 5, -(3 + Math.random() * 6));
}

function spawnCoin(keep: boolean, dx: number, vx: number, vy: number) {
  const { G, sc } = world, S = size();
  chest.coins.push({ x: G.chestX + dx, y: G.floorY - S * .66, vx, vy, life: keep ? 1 : 1.5, r: (3 + Math.random() * 3) * sc, keep, gy: Math.random() * 26 - 2, spin: Math.random() * 6 });
}

let tapHooked = false;
function hookTap() {
  if (tapHooked) return; tapHooked = true;
  onTap((sx, sy) => {
    if (!cat.under) return;
    if (overTin(sx, sy)) { cat.say = { text: CHEST.tinSay, t: CHEST.sayTime, total: CHEST.sayTime }; cat.happy = Math.max(cat.happy, CHEST.sayTime); return; }
    if (!overChest(sx, sy)) return;
    if (!chest.opened) openUp();
    chest.clicks++; chest.flow = CHEST.flowTime; chest.flowKeep = chest.clicks <= CHEST.pileClicks;
  });
}

export function updateChest(dt: number, step: number) {
  const { G, camY, sc } = world, S = size();
  cat.happy = Math.max(0, cat.happy - dt); cat.say.t = Math.max(0, cat.say.t - dt);
  if (camY < G.A0) Object.assign(chest, { opened: false, open: 0, tin: 0, pile: [], clicks: 0, flow: 0 });    // resets once you're back above 4,000 m
  if (cat.under && !chest.opened && Math.hypot(cat.wx - G.chestX, cat.wy - (G.floorY - S * .45)) < G.s * CHEST.openR) openUp();
  chest.open += ((chest.opened ? 1 : 0) - chest.open) * Math.min(1, dt * CHEST.openSpeed);
  if (chest.opened) chest.tin = Math.min(1, chest.tin + dt / CHEST.tinTime);
  // coins pouring out after a click
  if (chest.flow > 0) {
    chest.flow -= dt; chest.flowAcc += CHEST.flowRate * dt;
    while (chest.flowAcc >= 1) { chest.flowAcc--; spawnCoin(chest.flowKeep, (Math.random() - .5) * S * .7, (Math.random() - .5) * 7.5 * sc, -(4 + Math.random() * 5)); }
  }
  for (const c of chest.coins) {
    c.vy += .15 * step; c.x += c.vx * step; c.y += c.vy * step; c.spin += .25 * step;
    const ground = G.floorY - 4 + c.gy;
    if (!c.keep) c.life -= dt * .5;
    if (c.y > ground) {
      c.y = ground; c.vx *= .7;
      if (c.keep && Math.abs(c.vy) < 2.2) { chest.pile.push({ x: c.x, y: c.y, r: c.r, tilt: (Math.random() - .5) * .5 }); c.life = 0; }
      c.vy *= -.4;
    }
  }
  chest.coins = chest.coins.filter(c => c.life > 0);
  const sx = mouse.x, sy = mouse.y;
  setHover('chest', cat.under && pointerFresh() && (overTin(sx, sy) || overChest(sx, sy)));
}

/** The prize: an enamelled sardine tin with a gold rim, a ring-pull and a slow glint of light. Centred on 0,0; S wide. */
function drawTin(ctx: CanvasRenderingContext2D, S: number, t: number) {
  const w = S, h = S * .56, r = h * .42, x0 = -w / 2, y0 = -h / 2;
  const box = (inset: number, dy = 0) => { ctx.beginPath(); ctx.roundRect(x0 + inset, y0 + inset + dy, w - inset * 2, h - inset * 2, Math.max(1, r - inset)); };
  // side wall (gives it thickness); this is the part that carries the glow
  const side = ctx.createLinearGradient(0, y0, 0, y0 + h + S * .08);
  side.addColorStop(0, '#9aa7b5'); side.addColorStop(1, '#5f6b79');
  ctx.fillStyle = side; box(0, S * .075); ctx.fill(); ctx.shadowBlur = 0;
  // brushed-metal lid
  const metal = ctx.createLinearGradient(0, y0, 0, y0 + h);
  metal.addColorStop(0, '#fbfdff'); metal.addColorStop(.45, '#d5dee8'); metal.addColorStop(1, '#a9b5c3');
  ctx.fillStyle = metal; box(0); ctx.fill();
  const gold = ctx.createLinearGradient(0, y0, 0, y0 + h);
  gold.addColorStop(0, '#fbe7a1'); gold.addColorStop(.5, '#e3b448'); gold.addColorStop(1, '#b8862c');
  ctx.strokeStyle = gold; ctx.lineWidth = S * .035; box(S * .017); ctx.stroke();
  // enamel label
  const enamel = ctx.createLinearGradient(0, y0, 0, y0 + h);
  enamel.addColorStop(0, '#2a559f'); enamel.addColorStop(1, '#152c5c');
  ctx.fillStyle = enamel; box(S * .075); ctx.fill();
  ctx.strokeStyle = 'rgba(251,231,161,.85)'; ctx.lineWidth = Math.max(1, S * .012); box(S * .105); ctx.stroke();
  // the sardine: cream-gold, facing left
  const fx = -S * .09;
  const fish = ctx.createLinearGradient(0, -S * .08, 0, S * .08);
  fish.addColorStop(0, '#fff6d6'); fish.addColorStop(1, '#e9c25c');
  ctx.fillStyle = fish;
  ctx.beginPath(); ctx.moveTo(fx - S * .2, 0); ctx.bezierCurveTo(fx - S * .12, -S * .095, fx + S * .08, -S * .085, fx + S * .17, -S * .012);
  ctx.lineTo(fx + S * .27, -S * .075); ctx.quadraticCurveTo(fx + S * .235, 0, fx + S * .27, S * .075); ctx.lineTo(fx + S * .17, S * .012);
  ctx.bezierCurveTo(fx + S * .08, S * .085, fx - S * .12, S * .095, fx - S * .2, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(150,105,30,.55)'; ctx.lineWidth = Math.max(1, S * .011); ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) { const sx = fx - S * .05 + i * S * .05; ctx.beginPath(); ctx.arc(sx, 0, S * .04, -.9, .9); ctx.stroke(); }   // scales
  ctx.beginPath(); ctx.arc(fx - S * .1, 0, S * .05, -1.1, 1.1); ctx.stroke();                                                            // gill
  ctx.fillStyle = '#152c5c'; ctx.beginPath(); ctx.arc(fx - S * .15, -S * .015, S * .014, 0, 7); ctx.fill();
  // little four-point stars
  ctx.fillStyle = '#fbe7a1';
  for (const [sx, sy, sr] of [[-.33, -.12, .028], [.2, .13, .022], [.12, -.14, .018]]) {
    ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = (i % 2 ? .35 : 1) * sr * S; ctx.lineTo(sx * S + Math.cos(a) * rr, sy * S + Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
  }
  // ring-pull
  ctx.strokeStyle = gold; ctx.lineWidth = S * .026; ctx.beginPath(); ctx.arc(S * .345, 0, S * .058, 0, 7); ctx.stroke();
  ctx.fillStyle = '#e3b448'; ctx.beginPath(); ctx.roundRect(S * .255, -S * .022, S * .05, S * .044, S * .012); ctx.fill();
  // soft top-light and a glint that sweeps across every few seconds
  ctx.save(); box(0); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.beginPath(); ctx.ellipse(0, y0, w * .55, h * .42, 0, 0, 7); ctx.fill();
  const sweep = ((t * .3) % 1) * 2.4 - .7, gx = sweep * w;
  const glint = ctx.createLinearGradient(gx - S * .14, 0, gx + S * .14, 0);
  glint.addColorStop(0, 'rgba(255,255,255,0)'); glint.addColorStop(.5, 'rgba(255,255,255,.55)'); glint.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glint; ctx.transform(1, 0, -.5, 1, 0, 0); ctx.fillRect(gx - S * .14, y0 - 2, S * .28, h + 4);
  ctx.restore();
}

/** 'halo' = warm pool of light, 'box' = chest + lid, 'glow' = seam light, sardine tin, coins. */
export function drawChest(ctx: CanvasRenderingContext2D, layer: 'halo' | 'box' | 'glow') {
  const { H, G, t, camX, camY } = world;
  const x = G.chestX - camX, fy = G.floorY - camY, S = G.s * CHEST.size, o = chest.open;
  if (fy < -S * 3 || fy > H + S * 3) return;
  const y = fy - S * .4;
  const painted = !!sprite('chest-closed') && !!sprite('chest-open');   // needs both, or the lid could never open

  if (layer === 'halo') {   // warm pool of light, drawn behind the chest
    const a = .3 + o * .45 + .08 * Math.sin(t * 2);
    const R = G.s * CHEST.haloR * (1 + o * .9);
    const g = ctx.createRadialGradient(x, y - S * .2, 2, x, y - S * .2, R);
    g.addColorStop(0, `rgba(255,220,130,${a})`); g.addColorStop(1, 'rgba(255,220,130,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - S * .2, R, 0, 7); ctx.fill();
    return;
  }
  if (layer === 'glow') {
    if (o < .5 && !painted) { ctx.strokeStyle = 'rgba(255,225,140,.95)'; ctx.lineWidth = 2.5; ctx.shadowColor = 'rgba(255,210,110,1)'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.moveTo(x - S * .5, y - S * .3); ctx.lineTo(x + S * .5, y - S * .3); ctx.stroke(); ctx.shadowBlur = 0; }
    if (chest.tin > 0) {   // the prize: a glowing tin of sardines floats slowly up out of the chest
      const rise = eio(chest.tin), TS = G.s * CHEST.tinSize;
      const tx = x, ty = y - S * .35 - rise * (S * CHEST.tinRise + TS * .6) + Math.sin(t * 2) * 5, k = .6 + rise * .4;
      chest.tinAt.x = tx; chest.tinAt.y = ty; chest.tinAt.r = TS * k * .6;
      // sparkles around it
      ctx.fillStyle = '#fff3c4';
      for (let i = 0; i < 6; i++) {
        const a = t * 1.5 + i * 1.05, rr = TS * (.75 + .1 * Math.sin(t * 3 + i)), tw = .5 + .5 * Math.sin(t * 4 + i * 2);
        ctx.globalAlpha = rise * tw; ctx.beginPath(); ctx.arc(tx + Math.cos(a) * rr, ty + Math.sin(a) * rr * .6, 2 + tw * 1.5, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(Math.sin(t * 1.6) * .12); ctx.scale(k, k); ctx.globalAlpha = clamp(chest.tin * 6);
      ctx.shadowColor = 'rgba(255,230,150,1)'; ctx.shadowBlur = 24;
      if (!drawSprite(ctx, 'sardine-tin', 0, 0)) drawTin(ctx, TS, t);
      ctx.restore();
    }
    // coins resting on the sand (each with a darker edge so it reads as a disc), then the ones in the air
    for (const c of chest.pile) {
      const cx = c.x - camX, cy = c.y - camY;
      ctx.fillStyle = '#b8862c'; ctx.beginPath(); ctx.ellipse(cx, cy + c.r * .28, c.r, c.r * .5, c.tilt, 0, 7); ctx.fill();
      ctx.fillStyle = '#f2c654'; ctx.beginPath(); ctx.ellipse(cx, cy, c.r, c.r * .5, c.tilt, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,244,200,.55)'; ctx.beginPath(); ctx.ellipse(cx - c.r * .2, cy - c.r * .1, c.r * .45, c.r * .18, c.tilt, 0, 7); ctx.fill();
    }
    for (const c of chest.coins) {
      const flat = .35 + .65 * Math.abs(Math.cos(c.spin));   // tumbling
      ctx.globalAlpha = clamp(c.life * 2);
      ctx.fillStyle = '#c9962e'; ctx.beginPath(); ctx.ellipse(c.x - camX, c.y - camY + 1.2, c.r, c.r * flat, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffd56a'; ctx.beginPath(); ctx.ellipse(c.x - camX, c.y - camY, c.r, c.r * flat, 0, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    return;
  }
  if (painted) {   // closed painting cross-fades to the open one
    const k = seg(o, .25, .7);
    if (k < 1) drawSprite(ctx, 'chest-closed', x, fy);
    if (k > 0) drawSprite(ctx, 'chest-open', x, fy, { alpha: k });
    return;
  }
  // ── code-drawn chest: weathered wood, iron bands with rivets, barnacles; gold and pearls inside ──
  const W_ = { a: '#a9713f', b: '#97612f', seam: '#5e3a1f', inner: '#4b2e19', iron: '#5a636f', ironL: '#8d97a3', ironD: '#3c434c', rivet: '#c7ced6' };
  const hw = S * .55, top = y - S * .3, bot = y + S * .36, bh = bot - top;
  const rivets = (pts: number[][]) => { for (const [rx, ry] of pts) { ctx.fillStyle = W_.ironD; ctx.beginPath(); ctx.arc(rx, ry + S * .004, S * .017, 0, 7); ctx.fill(); ctx.fillStyle = W_.rivet; ctx.beginPath(); ctx.arc(rx, ry, S * .014, 0, 7); ctx.fill(); } };
  const band = (bx: number, by: number, bw: number, bhh: number) => { ctx.fillStyle = W_.iron; ctx.fillRect(bx, by, bw, bhh); ctx.fillStyle = W_.ironL; ctx.fillRect(bx, by, bw, Math.max(1.5, S * .012)); ctx.fillStyle = W_.ironD; ctx.fillRect(bx, by + bhh - Math.max(1.5, S * .012), bw, Math.max(1.5, S * .012)); };

  // lid: hinged at the back. Closed it is a banded wooden dome; open it swings up behind and shows its dark inside.
  ctx.save(); ctx.translate(x, top - o * S * .1); ctx.scale(1, 1 + o * .45);
  const lid = () => { ctx.beginPath(); ctx.moveTo(-hw, 0); ctx.lineTo(-hw, -S * .12); ctx.quadraticCurveTo(0, -S * .5, hw, -S * .12); ctx.lineTo(hw, 0); ctx.closePath(); };
  lid(); ctx.fillStyle = mix(W_.a, W_.inner, o); ctx.fill();
  ctx.save(); lid(); ctx.clip();
  ctx.strokeStyle = W_.seam; ctx.lineWidth = Math.max(1.2, S * .012); ctx.globalAlpha = .55;                 // plank seams follow the dome
  for (const k of [.36, .68]) { ctx.beginPath(); ctx.moveTo(-hw, -S * .12 * k); ctx.quadraticCurveTo(0, -S * .5 * k - S * .02, hw, -S * .12 * k); ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.fillStyle = mix(W_.iron, W_.ironD, o);
  for (const sx of [-.62, 0, .62]) ctx.fillRect(sx * hw - S * .045, -S * .5, S * .09, S * .5);               // iron straps
  ctx.restore();
  lid(); ctx.strokeStyle = mix(W_.iron, W_.ironD, o * .6); ctx.lineWidth = S * .06; ctx.lineJoin = 'round'; ctx.stroke();
  if (o < .5) { ctx.globalAlpha = 1 - o * 2; rivets([[-.62 * hw, -S * .2], [0, -S * .27], [.62 * hw, -S * .2], [-.62 * hw, -S * .07], [.62 * hw, -S * .07]]); ctx.globalAlpha = 1; }
  ctx.restore();

  // treasure heaped inside, rising into view as the lid opens
  if (o > .05) {
    ctx.save(); ctx.globalAlpha = clamp(o * 1.5);
    const heapH = S * .2 * o;
    const gg = ctx.createLinearGradient(0, top - heapH, 0, top + S * .05); gg.addColorStop(0, '#ffe07a'); gg.addColorStop(1, '#c98f24');
    ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(x, top + S * .02, hw * .9, heapH + S * .03, 0, Math.PI, 0); ctx.fill();
    for (let i = 0; i < 26; i++) {   // individual coins scattered over the heap (fixed pattern)
      const u = ((i * .381966) % 1) * 2 - 1, v = (i * .6180339) % 1;
      const px = x + u * hw * .8, py = top + S * .01 - v * heapH * Math.sqrt(Math.max(0, 1 - u * u)) * .95, cr = S * (.05 + (i % 3) * .008);
      ctx.fillStyle = '#b8862c'; ctx.beginPath(); ctx.ellipse(px, py + cr * .22, cr, cr * .42, (i % 5 - 2) * .12, 0, 7); ctx.fill();
      ctx.fillStyle = i % 4 ? '#f6cb52' : '#ffe07a'; ctx.beginPath(); ctx.ellipse(px, py, cr, cr * .42, (i % 5 - 2) * .12, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(160,110,30,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(px, py, cr * .6, cr * .24, (i % 5 - 2) * .12, 0, 7); ctx.stroke();
    }
    ctx.fillStyle = '#fffbe0';       // glints
    for (const [gx, gy, ph] of [[-.3, .7, 0], [.22, .9, 2.1], [.02, .45, 4.2]]) {
      const tw = Math.max(0, Math.sin(t * 2.2 + ph)) ** 3, gr = S * .07 * tw; if (gr < 1) continue;
      const px = x + gx * hw, py = top - gy * heapH;
      ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? gr * .22 : gr; ctx.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // box front: four planks
  const ph_ = bh / 4;
  for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? W_.b : W_.a; ctx.fillRect(x - hw, top + i * ph_, hw * 2, ph_ + .5); }
  ctx.strokeStyle = W_.seam; ctx.lineWidth = Math.max(1.2, S * .012);
  for (let i = 1; i < 4; i++) { ctx.globalAlpha = .6; ctx.beginPath(); ctx.moveTo(x - hw, top + i * ph_); ctx.lineTo(x + hw, top + i * ph_); ctx.stroke(); }
  ctx.globalAlpha = .28; ctx.lineWidth = Math.max(1, S * .008);                                                // wood grain
  for (let i = 0; i < 14; i++) { const gx = x - hw * .85 + ((i * 53) % 100) / 100 * hw * 1.6, gy = top + (((i * 37) % 100) / 100) * bh, gl = S * (.06 + (i % 4) * .03); ctx.beginPath(); ctx.moveTo(gx, gy); ctx.quadraticCurveTo(gx + gl / 2, gy + (i % 2 ? 2 : -2), gx + gl, gy); ctx.stroke(); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(40,20,10,.18)'; ctx.fillRect(x - hw, bot - bh * .22, hw * 2, bh * .22);              // shade toward the sand
  // iron: top and bottom bands, corner straps, rivets
  const t_ = S * .075;
  band(x - hw - S * .02, top - S * .015, hw * 2 + S * .04, t_); band(x - hw - S * .02, bot - t_, hw * 2 + S * .04, t_);
  ctx.fillStyle = W_.iron; ctx.fillRect(x - hw - S * .02, top, S * .085, bh); ctx.fillRect(x + hw - S * .065, top, S * .085, bh);
  ctx.fillStyle = W_.ironL; ctx.fillRect(x - hw - S * .02, top, Math.max(1.5, S * .012), bh); ctx.fillRect(x + hw - S * .065, top, Math.max(1.5, S * .012), bh);
  const rv: number[][] = [];
  for (let i = 0; i <= 8; i++) { const rx = x - hw + S * .02 + i * (hw * 2 - S * .04) / 8; rv.push([rx, top + t_ * .45], [rx, bot - t_ * .5]); }
  for (const k of [.3, .5, .7]) rv.push([x - hw + S * .022, top + bh * k], [x + hw - S * .022, top + bh * k]);
  rivets(rv);
  // lock plate with a keyhole
  ctx.fillStyle = W_.ironL; ctx.beginPath(); ctx.moveTo(x - S * .085, top + S * .02); ctx.lineTo(x + S * .085, top + S * .02); ctx.lineTo(x + S * .085, top + S * .17); ctx.quadraticCurveTo(x, top + S * .27, x - S * .085, top + S * .17); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = W_.ironD; ctx.lineWidth = Math.max(1.2, S * .012); ctx.stroke();
  ctx.fillStyle = W_.ironD; ctx.beginPath(); ctx.arc(x, top + S * .1, S * .026, 0, 7); ctx.fill(); ctx.fillRect(x - S * .011, top + S * .1, S * .022, S * .07);
  // barnacles
  for (const [bx, by, br] of [[-.36, .42, .034], [.3, .2, .03], [.38, .5, .026], [-.2, .13, .024]]) {
    const px = x + bx * S, py = top + by * S, rr = br * S;
    ctx.fillStyle = '#c4b3a7'; ctx.beginPath(); ctx.moveTo(px - rr, py + rr * .7); ctx.lineTo(px - rr * .5, py - rr * .7); ctx.lineTo(px + rr * .5, py - rr * .7); ctx.lineTo(px + rr, py + rr * .7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6f5f58'; ctx.beginPath(); ctx.ellipse(px, py - rr * .55, rr * .42, rr * .2, 0, 0, 7); ctx.fill();
  }
  // pearl strands spilling over the front once it is open
  if (o > .3) {
    ctx.save(); ctx.globalAlpha = clamp((o - .3) * 3);
    for (const [xa, xb, depth] of [[-.4, -.14, .34], [.08, .34, .22], [-.02, .12, .44]]) {
      const n = Math.round(10 + depth * 22);
      for (let i = 0; i <= n; i++) {
        const u = i / n, px = x + (xa + (xb - xa) * u) * S, py = top - S * .01 + Math.sin(u * Math.PI) * depth * S, pr = S * .021;
        ctx.fillStyle = '#d9d2c6'; ctx.beginPath(); ctx.arc(px, py + pr * .25, pr, 0, 7); ctx.fill();
        ctx.fillStyle = '#fbf8f1'; ctx.beginPath(); ctx.arc(px, py, pr, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px - pr * .3, py - pr * .3, pr * .3, 0, 7); ctx.fill();
      }
    }
    ctx.restore();
  }
  // a couple of coin stacks on the sand beside it
  for (const [sx, n] of [[-.72, 5], [-.86, 3], [.74, 4]]) for (let i = 0; i < n; i++) {
    const px = x + sx * S, py = bot - S * .02 - i * S * .028, cr = S * .062;
    ctx.fillStyle = '#b8862c'; ctx.beginPath(); ctx.ellipse(px, py + cr * .22, cr, cr * .4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#f6cb52'; ctx.beginPath(); ctx.ellipse(px, py, cr, cr * .4, 0, 0, 7); ctx.fill();
  }
}
