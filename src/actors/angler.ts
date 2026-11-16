// Anglerfish: dangles a glowing lure; it leans toward Catto. Touch it and her jaws snap,
// Catto bolts with the shocked face, and she resets after 4 s.
import { world, cat } from '../core/state';
import { clamp, lerp } from '../core/math';
import { drawSprite, sprite, spritePoint } from '../assets/sprites';

export const ANGLER = {
  leanR: 1.4,        // lure leans toward Catto within this × body length
  lean: .18,         // max lean fraction
  snapR: .6,         // touching the lure = within this × cat size
  cool: 4,           // seconds before she can snap again
  boltX: 900, boltY: 600, boltTime: 1.1,
};

export const angler = { hx: 0, hy: 0, x: 0, y: 0, L: 0, jaw: .1, state: 'idle' as 'idle' | 'snap', t: 0, cool: 0, lx: 0, ly: 0, lunge: 0 };

export function initAngler() {
  const { W, G } = world, ox = G.ox;
  const AL = clamp(G.s * 1.5, 170, 300);
  Object.assign(angler, { hx: ox + W * .7, hy: G.anglerY, x: ox + W * .7, y: G.anglerY, L: AL, jaw: .1, state: 'idle', t: 0, cool: 0, lx: 0, ly: 0, lunge: 0 });
}

export function updateAngler(dt: number) {
  const { G, t } = world, A = angler, AL = A.L, under = cat.under;
  A.cool = Math.max(0, A.cool - dt);
  if (A.state === 'snap') {
    A.t += dt;
    A.jaw = A.t < .22 ? lerp(.1, 1, A.t / .22) : A.t < .5 ? 1 : lerp(1, .1, clamp((A.t - .5) / .3));
    A.lunge = Math.sin(Math.PI * clamp(A.t / .7)) * AL * .2;
    if (A.t > 1.1) { A.state = 'idle'; A.cool = ANGLER.cool; }
  } else { A.jaw = .1 + .05 * Math.sin(t * 1.3); A.lunge = 0; }
  A.x = A.hx + Math.sin(t * .4) * 20 - A.lunge; A.y = A.hy + Math.sin(t * .7) * 12;
  let lx = A.x - AL * .82 + Math.sin(t * 1.3) * AL * .05, ly = A.y - AL * .32 + Math.cos(t * 1.1) * AL * .04;
  const ld = Math.hypot(cat.wx - lx, cat.wy - ly);
  if (under && ld < AL * ANGLER.leanR) { const k = (1 - ld / (AL * ANGLER.leanR)) * ANGLER.lean; lx += (cat.wx - lx) * k; ly += (cat.wy - ly) * k; }   // lure leans toward Catto
  A.lx = lx; A.ly = ly;
  if (under && A.state === 'idle' && A.cool <= 0 && ld < G.s * ANGLER.snapR) {
    A.state = 'snap'; A.t = 0; cat.bang = 1.5;
    const a = Math.atan2(cat.wy - A.y, cat.wx - (A.x - AL * .4));
    cat.bolt = { vx: Math.cos(a) * ANGLER.boltX, vy: Math.sin(a) * ANGLER.boltY, t: ANGLER.boltTime };
  }
}

/** glow=true draws only the lure (after the night layer). */
export function drawAngler(ctx: CanvasRenderingContext2D, glow: boolean) {
  const { H, t, camX, camY } = world;
  const A = angler, L = A.L, x = A.x - camX, y = A.y - camY;
  if (y < -L * 1.5 || y > H + L * 1.5) return;
  const lx = A.lx - camX, ly = A.ly - camY;
  if (glow) {   // the lure: light made by bacteria living inside it
    const pulse = .85 + .15 * Math.sin(t * 3);
    const hg = ctx.createRadialGradient(lx, ly, 2, lx, ly, L * .45);
    hg.addColorStop(0, `rgba(255,225,140,${.5 * pulse})`); hg.addColorStop(1, 'rgba(255,225,140,0)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(lx, ly, L * .45, 0, 7); ctx.fill();
    const r = L * .035 + 2;
    ctx.fillStyle = '#fff1b8'; ctx.shadowColor = 'rgba(255,220,120,1)'; ctx.shadowBlur = 22;
    ctx.beginPath(); ctx.moveTo(lx, ly - r * 1.6); ctx.quadraticCurveTo(lx + r * 1.2, ly, lx, ly + r); ctx.quadraticCurveTo(lx - r * 1.2, ly, lx, ly - r * 1.6); ctx.fill();
    ctx.shadowBlur = 0; return;
  }
  if (sprite('angler-closed')) {   // painted body; the stalk's last stretch and the lure stay in code
    const name = A.jaw > .55 && sprite('angler-open') ? 'angler-open' : 'angler-closed', art = { unit: L / 1.5 };
    const tip = spritePoint(name, 'stalkTip', art);
    if (tip) { ctx.strokeStyle = '#6f8f88'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + tip[0], y + tip[1]); ctx.quadraticCurveTo((x + tip[0] + lx) / 2, Math.min(y + tip[1], ly) - L * .04, lx, ly); ctx.stroke(); }
    drawSprite(ctx, name, x, y, art); return;
  }
  ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1);          // drawn facing right, flipped to face left
  const P = (u: number, v: number): [number, number] => [u * L, v * L];
  const bodyC = '#55736e', finC = '#a9cfa9', finS = '#7fa889', open = A.jaw;
  const ribbed = (pts: number[][], base: number[], tip: number[][], n: number) => {                  // fin with stripes
    ctx.fillStyle = finC; ctx.beginPath(); pts.forEach(([u, v], k) => { const [a, b] = P(u, v); k ? ctx.lineTo(a, b) : ctx.moveTo(a, b); }); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip(); ctx.strokeStyle = finS; ctx.lineWidth = 2.5;
    for (let i = 1; i < n; i++) { const k = i / n; ctx.beginPath(); ctx.moveTo(...P(base[0], base[1])); ctx.lineTo(...P(lerp(tip[0][0], tip[1][0], k), lerp(tip[0][1], tip[1][1], k))); ctx.stroke(); }
    ctx.restore();
  };
  const sw = Math.sin(t * 2) * .03;
  // stalk
  ctx.strokeStyle = '#6f8f88'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(L * .26, -L * .36); ctx.quadraticCurveTo(L * .55, -L * .8, -(lx - x), ly - y); ctx.stroke();
  // tail + dorsal fins (behind the body)
  ribbed([[-.36, -.05], [-.66, -.26 + sw], [-.6, 0], [-.66, .24 + sw], [-.36, .07]], [-.36, 0], [[-.66, -.26 + sw], [-.66, .24 + sw]], 6);
  ribbed([[-.2, -.3], [-.12, -.44], [.08, -.43], [.06, -.36]], [-.06, -.32], [[-.12, -.44], [.08, -.43]], 5);
  const corner: [number, number] = [.1, .06], upTip: [number, number] = [.5, -.02 - open * .1], loTip: [number, number] = [.53, .12 + open * .2];
  // one body silhouette with the mouth cut into it
  ctx.fillStyle = bodyC; ctx.beginPath();
  ctx.moveTo(...P(-.4, -.03));
  ctx.bezierCurveTo(...P(-.3, -.3), ...P(0, -.42), ...P(.2, -.4));
  ctx.bezierCurveTo(...P(.38, -.38), ...P(.5, -.25), ...P(...upTip));
  ctx.quadraticCurveTo(...P(.3, .02 - open * .04), ...P(...corner));
  ctx.quadraticCurveTo(...P(.32, .1 + open * .06), ...P(...loTip));
  ctx.bezierCurveTo(...P(.5, .32), ...P(.3, .44), ...P(.08, .4));
  ctx.bezierCurveTo(...P(-.12, .36), ...P(-.3, .2), ...P(-.4, .05));
  ctx.closePath(); ctx.fill();
  // teeth along both lips
  ctx.fillStyle = '#f4f7f8';
  const teeth = (a: number[], b: number[], dir: number, n: number) => {
    for (let i = 1; i <= n; i++) {
      const k = i / (n + .6), tx = lerp(a[0], b[0], k) * L, ty = lerp(a[1], b[1], k) * L, len = (i === n ? .1 : i % 2 ? .07 : .05) * L, w = L * .022;
      ctx.beginPath(); ctx.moveTo(tx - w, ty); ctx.lineTo(tx + w, ty); ctx.lineTo(tx + w * .2, ty + dir * len); ctx.closePath(); ctx.fill();
    }
  };
  teeth(corner, upTip, 1, 4); teeth(corner, loTip, -1, 4);
  // gill marks + pectoral fin
  ctx.strokeStyle = '#3f5a56'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(L * (-.04 + i * .05), -L * .06); ctx.quadraticCurveTo(L * (-.07 + i * .05), L * .04, L * (-.04 + i * .05), L * .12); ctx.stroke(); }
  ctx.save(); ctx.translate(-L * .12, L * .16); ctx.rotate(.3 + Math.sin(t * 3) * .15);
  ribbed([[0, -.04], [-.2, -.09], [-.22, .06], [0, .04]], [0, 0], [[-.2, -.09], [-.22, .06]], 4);
  ctx.restore();
  // eye
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(L * .24, -L * .2, L * .06, 0, 7); ctx.fill();
  ctx.strokeStyle = '#2b3550'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#2b3550'; ctx.beginPath(); ctx.arc(L * .25, -L * .2, L * .025, 0, 7); ctx.fill();
  ctx.restore();
}
