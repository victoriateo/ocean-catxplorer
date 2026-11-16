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
  const blue = '#2f4f9a', blueD = '#243d78', gold = '#e3b448', goldD = '#b8862c';
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
  // lid: hinged at the back. As it opens it swings up behind the box, so we see its darker inside.
  ctx.save(); ctx.translate(x, y - S * .3 - o * S * .1); ctx.scale(1, 1 + o * .45);
  ctx.fillStyle = mix(blue, '#172a55', o); ctx.beginPath(); ctx.moveTo(-S * .56, 0); ctx.lineTo(-S * .56, -S * .12); ctx.quadraticCurveTo(0, -S * .5, S * .56, -S * .12); ctx.lineTo(S * .56, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = gold; ctx.lineWidth = S * .07; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.globalAlpha = 1 - o; ctx.fillStyle = gold; ctx.fillRect(-S * .045, -S * .34, S * .09, S * .34);   // clasp strap, on the outside only
  ctx.restore();
  // box: navy with gold trim, stars and a keyhole
  ctx.fillStyle = blue; ctx.beginPath(); ctx.roundRect(x - S * .55, y - S * .3, S * 1.1, S * .66, S * .06); ctx.fill();
  ctx.fillStyle = blueD; ctx.fillRect(x - S * .55, y + S * .2, S * 1.1, S * .16);
  ctx.fillStyle = gold;
  ctx.fillRect(x - S * .58, y - S * .32, S * 1.16, S * .07); ctx.fillRect(x - S * .58, y + S * .3, S * 1.16, S * .07);
  ctx.fillRect(x - S * .58, y - S * .32, S * .08, S * .69); ctx.fillRect(x + S * .5, y - S * .32, S * .08, S * .69);
  ctx.beginPath(); ctx.roundRect(x - S * .1, y - S * .2, S * .2, S * .24, S * .04); ctx.fill();
  ctx.fillStyle = goldD; ctx.beginPath(); ctx.arc(x, y - S * .1, S * .035, 0, 7); ctx.fill(); ctx.fillRect(x - S * .012, y - S * .1, S * .024, S * .08);
  ctx.fillStyle = gold;
  for (const sx of [-.33, .33]) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = (i % 2 ? .035 : .085) * S, a = i * Math.PI / 5 - Math.PI / 2; ctx.lineTo(x + sx * S + Math.cos(a) * r, y - S * .02 + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); }
  // treasure inside, revealed as the lid opens
  if (o > .05) {
    ctx.save(); ctx.globalAlpha = clamp(o * 1.5);
    for (const [px, pr, col] of [[-.32, .1, '#f6efe4'], [-.12, .12, '#3fcf7a'], [.08, .11, '#f6efe4'], [.28, .1, '#5ab8f0'], [-.22, .08, '#e3b448'], [.18, .08, '#e3b448']] as [number, number, string][]) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + px * S, y - S * .32, pr * S, Math.PI, 0); ctx.fill();
    }
    ctx.restore();
  }
}
