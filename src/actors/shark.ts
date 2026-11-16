// Bluntnose sixgill shark: slow patrol; dislikes light, so it swerves away from the lamp.
// A close pass makes Catto bolt.
import { world, cat, nearCat } from '../core/state';
import { clamp } from '../core/math';
import { isLit } from '../render/night';

export const SHARK = {
  turnR: 1.2,        // turns away if Catto is within this × cat size of its head
  turnCool: 3.5,     // seconds between turns
  scareR: .45,       // Catto bolts if within this × shark length of its centre
  scareCool: 1.4,
  boltSpeed: 500,    // px/s scare impulse
  boltTime: .7,
  speed: 1.2,        // px per frame (× W/1200, clamped .7–1.2)
};

export const shark = { x: 0, y: 0, dir: 1, face: 1, L: 0, cool: 0, vy: 0, startle: 0 };

export function initShark() {
  const { W, G } = world;
  Object.assign(shark, { x: G.ox - W * .3, y: G.sharkY, dir: 1, face: 1, L: clamp(G.s * 3, 260, W * .55), cool: 0, vy: 0, startle: 0 });
}

export function updateShark(dt: number, step: number) {
  const { W, H, G } = world, K = shark;
  K.cool = Math.max(0, K.cool - dt); K.startle = Math.max(0, K.startle - dt);
  const headX = K.x + K.dir * K.L * .4;
  if (K.cool <= 0 && (isLit(headX, K.y) || !!nearCat(headX, K.y, G.s * SHARK.turnR))) { K.dir = -K.dir; K.cool = SHARK.turnCool; K.vy = (K.y < cat.wy ? -1 : 1) * 1.6; }
  if (nearCat(K.x, K.y, K.L * SHARK.scareR) && K.startle <= 0) {
    K.startle = SHARK.scareCool; cat.bang = 1.4;
    const a = Math.atan2(cat.wy - K.y, cat.wx - K.x);
    cat.bolt = { vx: Math.cos(a) * SHARK.boltSpeed, vy: Math.sin(a) * SHARK.boltSpeed, t: SHARK.boltTime };
  }
  K.face += (K.dir - K.face) * Math.min(1, dt * 3);
  K.x += K.dir * SHARK.speed * clamp(W / 1200, .7, 1.2) * step;
  K.vy *= Math.pow(.97, step); K.y += K.vy * step + (G.sharkY - K.y) * .004 * step;
  if (K.dir > 0 && K.x > G.ox + W + K.L) { K.dir = -1; K.face = -1; K.y = G.sharkY + (Math.random() - .5) * H * .3; }
  if (K.dir < 0 && K.x < G.ox - K.L) { K.dir = 1; K.face = 1; K.y = G.sharkY + (Math.random() - .5) * H * .3; }
}

/** glow=true draws only the glowing green eye (after the night layer). */
export function drawShark(ctx: CanvasRenderingContext2D, glow: boolean) {
  const { W, H, t, camX, camY } = world;
  const K = shark, x = K.x - camX, y = K.y - camY, L = K.L;
  if (x < -L || x > W + L || y < -L * .4 || y > H + L * .4) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(K.face, 1);
  if (glow) {   // fluorescent green eyes glint in the dark
    ctx.fillStyle = 'rgba(140,255,180,.95)'; ctx.shadowColor = 'rgba(120,255,170,1)'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.ellipse(L * .39, -L * .035, L * .017, L * .011, 0, 0, 7); ctx.fill(); ctx.shadowBlur = 0; ctx.restore(); return;
  }
  const sw = (u: number) => Math.sin(t * 2.4 - u * 3) * L * .045 * Math.max(0, .15 - u);   // tail sway (u = x / L)
  const P = (u: number, v: number): [number, number] => [u * L, v * L + sw(u)];
  const back = '#5b6158', belly = '#b8bdb2';
  const path = (pts: number[][]) => {   // smooth closed curve through the points
    const q = pts.map(([u, v]) => P(u, v)), n = q.length, mid = (i: number, j: number) => [(q[i][0] + q[j][0]) / 2, (q[i][1] + q[j][1]) / 2];
    ctx.beginPath(); const m0 = mid(n - 1, 0); ctx.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) { const m = mid(i, (i + 1) % n); ctx.quadraticCurveTo(q[i][0], q[i][1], m[0], m[1]); }
    ctx.closePath();
  };
  ctx.fillStyle = back;
  path([[-.46, -.03], [-.56, -.08], [-.66, -.17], [-.6, -.04], [-.54, .08], [-.47, .04]]); ctx.fill();          // tail fin
  path([[-.17, -.08], [-.24, -.15], [-.28, -.07]]); ctx.fill();                                   // single dorsal fin, far back
  path([[.16, .07], [.04, .2], [.08, .07]]); ctx.fill();                                          // pectoral fin
  path([[-.2, .07], [-.27, .12], [-.27, .06]]); ctx.fill();                                       // pelvic fin
  // body
  const top = [[.5, 0], [.47, -.06], [.36, -.1], [.15, -.115], [-.1, -.1], [-.3, -.06], [-.46, -.025]];
  const bot = [[-.46, .02], [-.3, .05], [-.1, .085], [.15, .095], [.36, .08], [.47, .05]];
  path(top.concat(bot)); ctx.fillStyle = back; ctx.fill();
  ctx.save(); path(top.concat(bot)); ctx.clip();
  ctx.fillStyle = belly; ctx.beginPath(); ctx.ellipse(L * .02, L * .1, L * .5, L * .055, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(210,214,200,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(L * .3, -L * .01); ctx.quadraticCurveTo(0, L * .005 + sw(0), -L * .4, sw(-.4)); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(30,32,28,.55)'; ctx.lineWidth = 1.6;          // six gill slits
  for (let k = 0; k < 6; k++) { const gx = L * (.31 - k * .022); ctx.beginPath(); ctx.moveTo(gx, -L * .05); ctx.quadraticCurveTo(gx - L * .01, 0, gx, L * .055); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(L * .47, L * .045); ctx.quadraticCurveTo(L * .41, L * .065, L * .36, L * .055); ctx.stroke();
  ctx.fillStyle = '#1d2a22'; ctx.beginPath(); ctx.ellipse(L * .39, -L * .035, L * .02, L * .014, 0, 0, 7); ctx.fill();
  ctx.restore();
}
