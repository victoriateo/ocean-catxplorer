// Squid: hovers with a few glowing spots; jets away leaving an ink cloud when Catto sneaks
// up or lights it with the lamp. Drifts home after ~4 s.
import { world, cat } from '../core/state';
import { angLerp, mix } from '../core/math';
import { isLit } from '../render/night';
import { drawSprite } from '../assets/sprites';

export const SQUID = {
  startleR: 1.3,     // startles if Catto is within this × cat size…
  litR: 2.4,         // …or lit by the lamp within this × cat size
  jetSpeed: 15,      // px per frame
  jetTime: 4,        // seconds before drifting home
  boltSpeed: 400,    // Catto's scare impulse, px/s
  boltTime: .6,
  inkPuffs: 28,
  inkFade: .3,       // ink life lost per second
};

interface Ink { x: number; y: number; r: number; vx: number; vy: number; life: number }
export const squid = { x: 0, y: 0, hx: 0, hy: 0, vx: 0, vy: 0, state: 'idle' as 'idle' | 'jet' | 'return', t: 0, flash: 0, ang: -2.6 };
let ink: Ink[] = [];

export function initSquid() {
  const { W, G } = world, ox = G.ox;
  Object.assign(squid, { x: ox + W * .62, y: G.squidY, hx: ox + W * .62, hy: G.squidY, vx: 0, vy: 0, state: 'idle', t: 0, flash: 0, ang: -2.6 });
  ink = [];
}

export function updateSquid(dt: number, step: number) {
  const { G, t } = world, Q = squid, under = cat.under;
  Q.flash = Math.max(0, Q.flash - dt);
  const qd = Math.hypot(cat.wx - Q.x, cat.wy - Q.y);
  if (Q.state === 'idle') {
    Q.x += (Q.hx + Math.sin(t * .6) * 30 - Q.x) * dt * 1.2; Q.y += (Q.hy + Math.sin(t * 1.1) * 14 - Q.y) * dt * 1.2;
    Q.ang = angLerp(Q.ang, -2.6 + Math.sin(t * .7) * .15, .05);
    if (under && (qd < G.s * SQUID.startleR || (isLit(Q.x, Q.y) && qd < G.s * SQUID.litR))) {
      Q.state = 'jet'; Q.t = 0; Q.flash = 1; cat.bang = 1.4;
      { const b = Math.atan2(cat.wy - Q.y, cat.wx - Q.x); cat.bolt = { vx: Math.cos(b) * SQUID.boltSpeed, vy: Math.sin(b) * SQUID.boltSpeed, t: SQUID.boltTime }; }
      const a = Math.atan2(Q.y - cat.wy, Q.x - cat.wx); Q.vx = Math.cos(a) * SQUID.jetSpeed; Q.vy = Math.sin(a) * SQUID.jetSpeed; Q.ang = a;
      for (let i = 0; i < SQUID.inkPuffs; i++) ink.push({ x: Q.x + (Math.random() - .5) * 20, y: Q.y + (Math.random() - .5) * 20, r: 6 + Math.random() * 10, vx: (Math.random() - .5) * 1.2, vy: (Math.random() - .5) * 1.2, life: 1 });
    }
  } else if (Q.state === 'jet') {
    Q.t += dt; const d = Math.pow(.95, step); Q.vx *= d; Q.vy *= d; Q.x += Q.vx * step; Q.y += Q.vy * step;
    if (Q.t > SQUID.jetTime) Q.state = 'return';
  } else {
    Q.x += (Q.hx - Q.x) * dt * .5; Q.y += (Q.hy - Q.y) * dt * .5;
    Q.ang = angLerp(Q.ang, Math.atan2(Q.hy - Q.y, Q.hx - Q.x), .05);
    if (Math.hypot(Q.hx - Q.x, Q.hy - Q.y) < 20) Q.state = 'idle';
  }
  for (const k of ink) { k.x += k.vx * step; k.y += k.vy * step; k.r += .5 * step; k.life -= dt * SQUID.inkFade; }
  ink = ink.filter(k => k.life > 0);
}

export function drawInk(ctx: CanvasRenderingContext2D) {
  const { camX, camY } = world;
  for (const k of ink) { ctx.fillStyle = `rgba(12,10,22,${.55 * k.life})`; ctx.beginPath(); ctx.arc(k.x - camX, k.y - camY, k.r, 0, 7); ctx.fill(); }
}

/** glow=true draws only the glowing spots (after the night layer). */
export function drawSquid(ctx: CanvasRenderingContext2D, glow: boolean) {
  const { H, G, t, camX, camY } = world;
  const Q = squid, x = Q.x - camX, y = Q.y - camY, Ls = G.s * .9; if (y < -Ls * 2 || y > H + Ls * 2) return;
  if (!glow && drawSprite(ctx, 'squid', x, y, { rot: Q.ang, flipY: Math.cos(Q.ang) < 0 })) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(Q.ang);
  if (glow) {
    ctx.fillStyle = `rgba(150,205,255,${.7 + Q.flash * .3})`; ctx.shadowColor = 'rgba(150,205,255,.9)'; ctx.shadowBlur = 10 + Q.flash * 20;
    for (const [u, v] of [[.15, -.06], [.3, .05], [.45, -.04], [.6, .03], [-.1, 0]]) { ctx.beginPath(); ctx.arc(u * Ls, v * Ls, 1.6, 0, 7); ctx.fill(); }
    ctx.shadowBlur = 0; ctx.restore(); return;
  }
  const col = Q.flash > 0 ? mix('#e8737f', '#ffd6dc', Q.flash) : '#e8737f';
  ctx.strokeStyle = col; ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const v = (i - 3.5) * .022 * Ls, len = Ls * (i === 2 || i === 5 ? .95 : .6);
    ctx.lineWidth = i === 2 || i === 5 ? 1.8 : 3; ctx.beginPath(); ctx.moveTo(-Ls * .15, v);
    for (let k = 1; k <= 8; k++) { const u = k / 8; ctx.lineTo(-Ls * .15 - u * len, v * (1 + u * 1.5) + Math.sin(t * 4 - k * .6 + i) * u * 4); }
    ctx.stroke();
  }
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(Ls * .78, 0); ctx.lineTo(Ls * .52, -Ls * .17); ctx.lineTo(Ls * .52, Ls * .17); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.ellipse(Ls * .3, 0, Ls * .45, Ls * .14, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(-Ls * .1, 0, Ls * .12, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(160,60,80,.55)';
  for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(Ls * (.0 + i * .075), Math.sin(i * 2.3) * Ls * .07, 1.6, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-Ls * .1, -Ls * .03, Ls * .055, 0, 7); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-Ls * .11, -Ls * .03, Ls * .032, 0, 7); ctx.fill();
  ctx.restore();
}
