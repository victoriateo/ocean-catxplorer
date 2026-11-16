// The treasure chest on the trench floor. Catto comes close → lid opens, coins burst out,
// a glowing tin of sardines floats up, Catto gets the happy face.
import { world, cat } from '../core/state';
import { clamp, eout, seg } from '../core/math';
import { drawSprite, sprite } from '../assets/sprites';

export const CHEST = {
  size: .62,         // × cat size
  openR: 1.6,        // opens when Catto is within this × cat size
  coins: 40,
  happyTime: 4,      // seconds of happy face
  openSpeed: 3,
};

interface Coin { x: number; y: number; vx: number; vy: number; life: number; r: number }
export const chest = { open: 0, opened: false, coins: [] as Coin[] };

export function initChest() {
  Object.assign(chest, { open: 0, opened: false, coins: [] });
}

export function updateChest(dt: number, step: number) {
  const { G, camY } = world;
  cat.happy = Math.max(0, cat.happy - dt);
  if (camY < G.A0) { chest.opened = false; chest.open = 0; }    // resets once you're back above 4,000 m
  if (cat.under && !chest.opened && Math.hypot(cat.wx - G.chestX, cat.wy - (G.floorY - G.s * .3)) < G.s * CHEST.openR) {
    chest.opened = true; cat.happy = CHEST.happyTime;
    for (let i = 0; i < CHEST.coins; i++) chest.coins.push({ x: G.chestX + (Math.random() - .5) * 30, y: G.floorY - G.s * .35, vx: (Math.random() - .5) * 5, vy: -(3 + Math.random() * 6), life: 1, r: 2 + Math.random() * 3 });
  }
  chest.open += ((chest.opened ? 1 : 0) - chest.open) * Math.min(1, dt * CHEST.openSpeed);
  for (const c of chest.coins) { c.vy += .15 * step; c.x += c.vx * step; c.y += c.vy * step; c.life -= dt * .5; if (c.y > G.floorY - 6) { c.y = G.floorY - 6; c.vy *= -.4; c.vx *= .7; } }
  chest.coins = chest.coins.filter(c => c.life > 0);
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
    const g = ctx.createRadialGradient(x, y - S * .2, 2, x, y - S * .2, S * (1.6 + o * 1.8));
    g.addColorStop(0, `rgba(255,220,130,${a})`); g.addColorStop(1, 'rgba(255,220,130,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - S * .2, S * (1.6 + o * 1.8), 0, 7); ctx.fill();
    return;
  }
  if (layer === 'glow') {
    if (o < .5 && !painted) { ctx.strokeStyle = 'rgba(255,225,140,.95)'; ctx.lineWidth = 2.5; ctx.shadowColor = 'rgba(255,210,110,1)'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.moveTo(x - S * .5, y - S * .3); ctx.lineTo(x + S * .5, y - S * .3); ctx.stroke(); ctx.shadowBlur = 0; }
    if (o > .02) {   // the prize: a glowing tin of sardines floats up out of the chest
      const rise = eout(clamp(o * 1.15));
      const tx = x - S * .1, ty = y - S * .45 - rise * S * 2.1 + Math.sin(t * 2) * 5, k = .6 + rise * .5;
      // sparkles around it
      ctx.fillStyle = '#fff3c4';
      for (let i = 0; i < 6; i++) {
        const a = t * 1.5 + i * 1.05, rr = S * (.75 + .1 * Math.sin(t * 3 + i)), tw = .5 + .5 * Math.sin(t * 4 + i * 2);
        ctx.globalAlpha = rise * tw; ctx.beginPath(); ctx.arc(tx + Math.cos(a) * rr, ty + Math.sin(a) * rr * .6, 2 + tw * 1.5, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(Math.sin(t * 1.6) * .12); ctx.scale(k, k); ctx.globalAlpha = clamp(o * 2);
      ctx.shadowColor = 'rgba(255,230,150,1)'; ctx.shadowBlur = 24;
      if (drawSprite(ctx, 'sardine-tin', 0, 0)) { ctx.restore(); ctx.shadowBlur = 0; }
      else {
      ctx.fillStyle = '#d7e0ea'; ctx.beginPath(); ctx.roundRect(-S * .5, -S * .25, S, S * .5, S * .22); ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = '#8f9cab'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(-S * .43, -S * .18, S * .86, S * .36, S * .16); ctx.stroke();
      ctx.fillStyle = '#5b8fd6'; ctx.beginPath(); ctx.ellipse(-S * .04, 0, S * .22, S * .09, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(S * .16, 0); ctx.lineTo(S * .29, -S * .08); ctx.lineTo(S * .29, S * .08); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-S * .16, -S * .015, S * .022, 0, 7); ctx.fill();
      ctx.strokeStyle = '#b8c3cf'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(S * .36, 0, S * .06, 0, 7); ctx.stroke();   // ring pull
      ctx.restore();
      }
    }
    ctx.fillStyle = '#ffd56a';
    for (const c of chest.coins) { ctx.globalAlpha = clamp(c.life); ctx.beginPath(); ctx.ellipse(c.x - camX, c.y - camY, c.r, c.r * .7, 0, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
    return;
  }
  if (painted) {   // closed painting cross-fades to the open one
    const k = seg(o, .25, .7);
    if (k < 1) drawSprite(ctx, 'chest-closed', x, fy);
    if (k > 0) drawSprite(ctx, 'chest-open', x, fy, { alpha: k });
    return;
  }
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
  // lid: hinged at the back, tips open
  ctx.save(); ctx.translate(x, y - S * .3); ctx.scale(1, 1 - o * 1.75);
  ctx.fillStyle = blue; ctx.beginPath(); ctx.moveTo(-S * .56, 0); ctx.lineTo(-S * .56, -S * .12); ctx.quadraticCurveTo(0, -S * .5, S * .56, -S * .12); ctx.lineTo(S * .56, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = gold; ctx.lineWidth = S * .07; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.fillStyle = gold; ctx.fillRect(-S * .045, -S * .34, S * .09, S * .34);
  ctx.restore();
}
