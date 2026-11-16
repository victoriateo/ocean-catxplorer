// Manta ray: big slow loops, drifts toward Catto out of curiosity, somersaults when he's close.
import { world, cat } from '../core/state';
import { clamp } from '../core/math';
import { drawSprite, sprite } from '../assets/sprites';

export const MANTA = {
  curiousR: 1.4,     // drifts toward Catto when within this × span
  flipR: .55,        // somersaults when within this × span
  flipTime: 2.8,     // seconds per somersault
  flipCool: 5,       // seconds before another
  drift: .2,         // easing speed of the loop centre
  loopSpeed: .3,     // rad/s around the loop
};

export const manta = { ang: 0, cx: 0, cy: 0, span: 0, flip: -1, cool: 0, x: 0, y: 0, hd: 0, spots: [] as [number, number, number, number][] };

export function initManta() {
  const { W, G } = world, ox = G.ox;
  Object.assign(manta, { ang: 0, cx: ox + W * .5, cy: G.mantaY, span: clamp(W * .42, 260, G.s * 3.2), flip: -1, cool: 0, x: 0, y: 0, hd: 0, spots: [] });
  for (let u = -.42; u < .46; u += .045) for (let v = -1; v <= 1; v += .085) manta.spots.push([u + (Math.random() - .5) * .025, v + (Math.random() - .5) * .05, .8 + Math.random() * .6, Math.random() < .3 ? Math.random() * 3 : -1]);
}

export function updateManta(dt: number) {
  const { W, H, G } = world, M = manta, under = cat.under;
  M.cool = Math.max(0, M.cool - dt);
  const md = Math.hypot(cat.wx - M.x, cat.wy - M.y);
  if (under && md < M.span * MANTA.curiousR) { M.cx += (clamp(cat.wx, G.ox + W * .3, G.ox + W * .7) - M.cx) * dt * MANTA.drift; M.cy += (clamp(cat.wy, G.mantaY - H * .25, G.mantaY + H * .25) - M.cy) * dt * MANTA.drift; }
  else { M.cx += (G.ox + W * .5 - M.cx) * dt * MANTA.drift; M.cy += (G.mantaY - M.cy) * dt * MANTA.drift; }
  if (M.flip < 0 && M.cool <= 0 && under && md < M.span * MANTA.flipR) M.flip = 0;
  if (M.flip >= 0) { M.flip += dt / MANTA.flipTime; if (M.flip >= 1) { M.flip = -1; M.cool = MANTA.flipCool; } }
  const tight = M.flip >= 0 ? 1 - .5 * Math.sin(Math.PI * M.flip) : 1;
  M.ang += dt * (MANTA.loopSpeed + (M.flip >= 0 ? 2.2 * Math.sin(Math.PI * M.flip) : 0));
  const rx = W * .28 * tight, ry = H * .16 * tight;
  M.x = M.cx + Math.cos(M.ang) * rx; M.y = M.cy + Math.sin(M.ang) * ry;
  M.hd = Math.atan2(Math.cos(M.ang) * ry, -Math.sin(M.ang) * rx);
}

export function drawManta(ctx: CanvasRenderingContext2D) {
  const { H, t, camX, camY } = world;
  const M = manta, x = M.x - camX, y = M.y - camY, span = M.span;
  if (y < -span || y > H + span) return;
  const belly = M.flip >= 0 ? Math.sin(Math.PI * M.flip) : 0, showBelly = belly > .55;
  const flap = 1 - .22 * Math.abs(Math.sin(t * 1.1)), sp = span * .5 * flap * (1 - .4 * belly), L = span * .55;
  // painted: `span` is 3.2 × cat size unless the screen is narrow, so the image scales with it
  if (drawSprite(ctx, showBelly && sprite('manta-belly') ? 'manta-belly' : 'manta', x, y, { unit: span / 3.2, rot: M.hd, sy: flap * (1 - .4 * belly) })) return;
  const body = showBelly ? '#efe6de' : '#20264a';
  ctx.save(); ctx.translate(x, y); ctx.rotate(M.hd);
  ctx.strokeStyle = '#20264a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-L * .38, 0); ctx.quadraticCurveTo(-L * .8, Math.sin(t * 2) * L * .12, -L * 1.25, Math.sin(t * 2 + 1) * L * .08); ctx.stroke();
  const shape = () => { ctx.beginPath(); ctx.moveTo(L * .44, -sp * .06); ctx.bezierCurveTo(L * .42, -sp * .4, L * .22, -sp * .86, -L * .12, -sp); ctx.bezierCurveTo(-L * .06, -sp * .7, -L * .12, -sp * .3, -L * .4, -sp * .07); ctx.lineTo(-L * .44, 0); ctx.lineTo(-L * .4, sp * .07); ctx.bezierCurveTo(-L * .12, sp * .3, -L * .06, sp * .7, -L * .12, sp); ctx.bezierCurveTo(L * .22, sp * .86, L * .42, sp * .4, L * .44, sp * .06); ctx.closePath(); };
  ctx.fillStyle = body;
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(L * .5, sgn * sp * .1, L * .1, sp * .035, sgn * .25, 0, 7); ctx.fill(); }
  shape(); ctx.fill();
  ctx.save(); shape(); ctx.clip();
  const k = span / 300;
  if (!showBelly) {
    ctx.fillStyle = 'rgba(240,236,228,.88)';
    for (const [u, v, r, dash] of M.spots) {
      const px = u * L, py = v * sp, rr = r * 1.6 * k;
      ctx.beginPath(); ctx.arc(px, py, rr, 0, 7);
      if (dash >= 0) { const a = dash; ctx.arc(px + Math.cos(a) * rr * 2.2, py + Math.sin(a) * rr * 2.2, rr * .9, 0, 7); }
      ctx.fill();
    }
  } else {
    ctx.fillStyle = '#20264a';
    M.spots.forEach(([u, v, r], i) => { if (i % 9 || Math.abs(v) > .35 || u < -.2) return; ctx.beginPath(); ctx.arc(u * L, v * sp, r * 2.6 * k, 0, 7); ctx.fill(); });
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1.5; shape(); ctx.stroke();
  ctx.restore();
}
