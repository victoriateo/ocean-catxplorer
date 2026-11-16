// Scene 0 · Pier: warm sky, sun, clouds, gulls, distant hills (with parallax) and the wooden pier.
import { world } from '../core/state';
import { clamp, mod } from '../core/math';
import { drawSprite } from '../assets/sprites';

/** Parallax factors (how much each layer moves with the camera). */
export const SKY = {
  sunX: .25, sunY: .6,
  cloudX: .3, cloudY: .7,
  hillsX: .5,
  gullX: .3, gullY: .8,
};

const clouds = [
  { x0: .05, y: .52, sc: 1.1, sp: 6 }, { x0: .45, y: .62, sc: .8, sp: 4 },
  { x0: .75, y: .48, sc: 1.3, sp: 7 }, { x0: .25, y: .38, sc: .7, sp: 3 },
];

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const blobs = [[0, 0, 34], [36, -14, 40], [76, 0, 32], [40, 10, 34], [-26, 8, 22], [104, 10, 20]];
  ctx.fillStyle = 'rgba(255,214,190,.7)';
  for (const [a, b, r] of blobs) { ctx.beginPath(); ctx.arc(a, b + 7, r, 0, 7); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  for (const [a, b, r] of blobs) { ctx.beginPath(); ctx.arc(a, b, r, 0, 7); ctx.fill(); }
  ctx.restore();
}

/** Sky, sun, clouds, hills and gulls (only drawn while the waterline is on screen). */
export function drawSky(ctx: CanvasRenderingContext2D, wl: number) {
  const { W, H, G, t, camX, camY } = world;
  const g = ctx.createLinearGradient(0, wl - H * .75, 0, wl);
  g.addColorStop(0, '#7cc6df'); g.addColorStop(.55, '#c4e6e6'); g.addColorStop(1, '#ffe0bf');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, Math.max(0, wl + 30));
  // painted sky replaces the sun, clouds and hills; the gulls stay
  const painted = drawSprite(ctx, 'bg-sky', -camX * SKY.cloudX, wl + 2, { unit: W });
  if (!painted) {
  const sx = W * .8 - camX * SKY.sunX, sy = (G.WL - H * .46) - camY * SKY.sunY;
  const sg = ctx.createRadialGradient(sx, sy, 10, sx, sy, 150);
  sg.addColorStop(0, 'rgba(255,246,214,.95)'); sg.addColorStop(.25, 'rgba(255,236,190,.6)'); sg.addColorStop(1, 'rgba(255,236,190,0)');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, 150, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff4d8'; ctx.beginPath(); ctx.arc(sx, sy, 34, 0, 7); ctx.fill();
  for (const cl of clouds) {
    const span = W + 320;
    cloud(ctx, mod(cl.x0 * span + t * cl.sp - camX * SKY.cloudX, span) - 160, G.WL - H * cl.y - camY * SKY.cloudY, cl.sc * clamp(W / 1200, .6, 1.2));
  }
  const hx = -camX * SKY.hillsX;
  ctx.fillStyle = '#9cc8bf';
  ctx.beginPath(); ctx.moveTo(hx + W * .5, wl);
  ctx.quadraticCurveTo(hx + W * .6, wl - H * .07, hx + W * .7, wl - H * .03);
  ctx.quadraticCurveTo(hx + W * .82, wl - H * .1, hx + W * .95, wl - H * .02);
  ctx.quadraticCurveTo(hx + W * 1.1, wl - H * .08, hx + W * 1.3, wl - H * .03);
  ctx.lineTo(hx + W * 1.4, wl + 4); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = '#4b5d6e'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const gx = mod(t * (22 + i * 6) + i * 260 - camX * SKY.gullX, W + 100) - 50;
    const gy = G.WL - H * (.4 + i * .07) - camY * SKY.gullY + Math.sin(t * 1.3 + i) * 8;
    const f = Math.sin(t * 6 + i * 2) * 4;
    ctx.beginPath(); ctx.moveTo(gx - 10, gy - f); ctx.quadraticCurveTo(gx - 5, gy - 6, gx, gy);
    ctx.quadraticCurveTo(gx + 5, gy - 6, gx + 10, gy - f); ctx.stroke();
  }
}

export function drawPier(ctx: CanvasRenderingContext2D) {
  const { H, G, camX, camY } = world;
  const d = G.deckY - camY, end = G.pierEnd - camX, wl = G.WL - camY;
  if (end < -60 || d > H + 40) return;
  if (drawSprite(ctx, 'pier', end, d)) return;
  const bottom = wl + H * .5;
  const post = (x: number) => {
    const g = ctx.createLinearGradient(0, d, 0, bottom);
    g.addColorStop(0, '#6a4529'); g.addColorStop(.7, '#5a3b24'); g.addColorStop(1, 'rgba(60,40,25,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 8, d + 10, 16, bottom - d - 10);
  };
  for (let x = 26; x < G.pierEnd - 30; x += 90) post(x - camX);
  post(end - 16);
  ctx.fillStyle = '#a8703f'; ctx.fillRect(-10 - camX, d - 4, G.pierEnd + 10, 18);
  ctx.fillStyle = '#c98d55'; ctx.fillRect(-10 - camX, d - 4, G.pierEnd + 10, 5);
  ctx.strokeStyle = 'rgba(80,45,20,.35)'; ctx.lineWidth = 2;
  for (let x = 30; x < G.pierEnd; x += 36) { ctx.beginPath(); ctx.moveTo(x - camX, d + 1); ctx.lineTo(x - camX, d + 14); ctx.stroke(); }
  ctx.fillStyle = '#5a3a22'; ctx.fillRect(end - 26, d - 18, 14, 16);
  ctx.fillStyle = '#7a5232'; ctx.fillRect(end - 29, d - 21, 20, 5);
  ctx.strokeStyle = '#d8c39a'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(end - 19, d - 10); ctx.quadraticCurveTo(end + 6, d + 30, end - 4, wl + 6); ctx.stroke();
  const bxp = G.sitX - G.s * 1.15 - camX;
  if (bxp + camX > 10) {   // bucket of fish
    ctx.fillStyle = '#e9545e';
    ctx.beginPath(); ctx.moveTo(bxp + 4, d - 30); ctx.lineTo(bxp - 6, d - 44); ctx.lineTo(bxp + 8, d - 40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7fb3c2';
    ctx.beginPath(); ctx.moveTo(bxp - 18, d - 32); ctx.lineTo(bxp + 18, d - 32); ctx.lineTo(bxp + 13, d - 4); ctx.lineTo(bxp - 13, d - 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9fcbd7'; ctx.fillRect(bxp - 19, d - 34, 38, 5);
  }
}
