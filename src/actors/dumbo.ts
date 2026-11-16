// Dumbo octopus: one continuous shape, rendered off-screen and faded as one image.
// Say hi and she swims alongside Catto for ~6 s, then goes home. Never leaves her depth band.
import { world, cat } from '../core/state';
import { lerp } from '../core/math';
import { drawSprite } from '../assets/sprites';

export const DUMBO = {
  size: .42,         // body radius, × cat size
  hiR: 1.5,          // "say hi" distance, × cat size
  followTime: 6,     // seconds alongside Catto
  cool: 5,           // seconds before she'll tag along again
  bandH: .9,         // stops following if Catto is more than this × H from her home depth
  followSpeed: 1.6,
};

export const dumbo = { hx: 0, hy: 0, x: 0, y: 0, follow: 0, cool: 0, ph: 0, R: 0 };

export function initDumbo() {
  const { W, G } = world, ox = G.ox;
  Object.assign(dumbo, { hx: ox + W * .32, hy: G.dumboY, x: ox + W * .32, y: G.dumboY, follow: 0, cool: 0, ph: 0, R: G.s * DUMBO.size });
}

export function updateDumbo(dt: number) {
  const { H, G, t } = world, D = dumbo, under = cat.under;
  D.cool = Math.max(0, D.cool - dt); D.ph += dt * (D.follow > 0 ? 7 : 3);
  if (under && D.follow <= 0 && D.cool <= 0 && Math.hypot(cat.wx - D.x, cat.wy - D.y) < G.s * DUMBO.hiR) D.follow = DUMBO.followTime;
  if (cat.ascending || Math.abs(cat.wy - G.dumboY) > H * DUMBO.bandH) D.follow = Math.min(D.follow, 0);   // stays in her own neighbourhood
  if (D.follow > 0) {
    D.follow -= dt; if (D.follow <= 0) D.cool = DUMBO.cool;
    const tx = cat.wx - cat.facing * G.s * 1.3, ty = cat.wy - G.s * .35 + Math.sin(t * 2) * 10, k = Math.min(1, dt * DUMBO.followSpeed);
    D.x += (tx - D.x) * k; D.y += (ty - D.y) * k;
  } else {
    const k = Math.min(1, dt * .5); D.x += (D.hx + Math.sin(t * .5) * 40 - D.x) * k; D.y += (D.hy + Math.sin(t * .9) * 25 - D.y) * k;
  }
}

const dumboC = document.createElement('canvas');

export function drawDumbo(outer: CanvasRenderingContext2D, alpha: number) {
  const { H, DPR, t, camX, camY } = world;
  const D = dumbo, R = D.R, x = D.x - camX, y = D.y - camY;
  if (y < -R * 3 || y > H + R * 3) return;
  if (drawSprite(outer, 'dumbo', x, y, { rot: Math.sin(t * 1.2) * .08, alpha, sy: 1 + Math.sin(D.ph * .6) * .03 })) return;
  // draw at full opacity off-screen first, so overlapping parts read as one shape when faded
  const S = Math.ceil(R * 3.4);
  if (dumboC.width !== Math.round(S * DPR)) { dumboC.width = dumboC.height = Math.round(S * DPR); }
  const ctx = dumboC.getContext('2d')!; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, S, S);
  ctx.save(); ctx.translate(S / 2, S * .55); ctx.rotate(Math.sin(t * 1.2) * .08);
  const wob = (i: number) => Math.sin(D.ph * .6 + i * 1.3) * R * .05;
  // ears (fins), translucent with a warm centre
  for (const sgn of [-1, 1]) {
    ctx.save(); ctx.translate(sgn * R * .42, -R * .95); ctx.rotate(sgn * (.35 + Math.sin(D.ph) * .35));
    const eg = ctx.createRadialGradient(sgn * R * .12, 0, 1, sgn * R * .12, 0, R * .42);
    eg.addColorStop(0, '#f2a184'); eg.addColorStop(1, '#f6bfab');
    ctx.fillStyle = eg; ctx.beginPath(); ctx.ellipse(sgn * R * .24, -R * .06, R * .44, R * .34, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  // head flowing into the webbed arms
  const bg = ctx.createLinearGradient(0, -R * 1.3, 0, R * 1);
  bg.addColorStop(0, '#f8c6b4'); bg.addColorStop(.5, '#f2ad98'); bg.addColorStop(1, '#e8907a');
  ctx.fillStyle = bg; ctx.beginPath();
  ctx.moveTo(0, -R * 1.32);
  ctx.bezierCurveTo(R * .62, -R * 1.3, R * .7, -R * .5, R * .55, -R * .2);
  ctx.bezierCurveTo(R * .75, R * .15, R * .95, R * .4, R * .98, R * .62);
  const lobes = 5;
  for (let i = 0; i < lobes; i++) {
    const x0 = lerp(R * .98, -R * .98, i / lobes), x1 = lerp(R * .98, -R * .98, (i + 1) / lobes), mid = (x0 + x1) / 2;
    const yy = R * (.75 + (2 - Math.abs(i - 2)) * .08);
    ctx.quadraticCurveTo(mid, yy + R * .3 + wob(i), x1, R * .62 + wob(i + 1));
  }
  ctx.bezierCurveTo(-R * .95, R * .4, -R * .75, R * .15, -R * .55, -R * .2);
  ctx.bezierCurveTo(-R * .7, -R * .5, -R * .62, -R * 1.3, 0, -R * 1.32);
  ctx.fill();
  // arm creases
  ctx.strokeStyle = 'rgba(205,115,95,.22)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let i = 1; i < lobes; i++) { const ex = lerp(R * .98, -R * .98, i / lobes); ctx.beginPath(); ctx.moveTo(ex * .25, -R * .05); ctx.quadraticCurveTo(ex * .55, R * .3, ex, R * .66 + wob(i)); ctx.stroke(); }
  // frilly edge with little suckers
  ctx.strokeStyle = 'rgba(214,120,90,.55)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(R * .98, R * .62);
  for (let i = 0; i < lobes; i++) {
    const x0 = lerp(R * .98, -R * .98, i / lobes), x1 = lerp(R * .98, -R * .98, (i + 1) / lobes), mid = (x0 + x1) / 2, yy = R * (.75 + (2 - Math.abs(i - 2)) * .08);
    ctx.quadraticCurveTo(mid, yy + R * .3 + wob(i), x1, R * .62 + wob(i + 1));
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,225,205,.85)';
  for (let i = 0; i < lobes; i++) {
    const x0 = lerp(R * .98, -R * .98, i / lobes), x1 = lerp(R * .98, -R * .98, (i + 1) / lobes);
    for (let k = 1; k < 4; k++) { const u = k / 4, px = lerp(x0, x1, u), py = R * .62 + Math.sin(u * Math.PI) * R * (.24 + (2 - Math.abs(i - 2)) * .06) + wob(i); ctx.beginPath(); ctx.arc(px, py - R * .04, 1.6, 0, 7); ctx.fill(); }
  }
  // soft highlight + eyes
  ctx.fillStyle = 'rgba(255,240,232,.4)'; ctx.beginPath(); ctx.ellipse(-R * .15, -R * 1.0, R * .25, R * .13, -.3, 0, 7); ctx.fill();
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = 'rgba(255,220,205,.3)'; ctx.beginPath(); ctx.arc(sgn * R * .32, -R * .55, R * .13, 0, 7); ctx.fill();
    ctx.fillStyle = '#141826'; ctx.beginPath(); ctx.arc(sgn * R * .32, -R * .55, R * .1, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sgn * R * .32 - R * .03, -R * .59, R * .03, 0, 7); ctx.fill();
  }
  ctx.restore();
  outer.save(); outer.globalAlpha = alpha; outer.drawImage(dumboC, x - S / 2, y - S * .55, S, S); outer.restore();
}
