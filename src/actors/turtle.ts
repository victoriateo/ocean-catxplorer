// Green sea turtle, cruising right → left. Bump into it to hitch a ride (handled in catto.ts).
import { world } from '../core/state';
import { clamp, lerp } from '../core/math';
import { drawSprite } from '../assets/sprites';

export const TURTLE = {
  size: .62,       // shell radius, × cat size
  speed: .8,       // px per frame (× W/1200, clamped .7–1.2)
  bobPx: 18,       // vertical bob
  bumpR: 1.05,     // Catto within this × radius → ride
  rideMax: 4.5,    // seconds
  rideCool: 3,     // seconds before another ride
};

export const turtle = { x: 0, y: 0, r: 0 };

export function initTurtle() {
  const { W, G } = world;
  Object.assign(turtle, { x: G.ox + W * .8, y: G.turtY, r: G.s * TURTLE.size });
}

export function updateTurtle(step: number) {
  const { W, G, t } = world;
  turtle.x -= TURTLE.speed * clamp(W / 1200, .7, 1.2) * step;
  if (turtle.x < G.ox - turtle.r * 3) turtle.x = G.ox + W + turtle.r * 3;
  turtle.y = G.turtY + Math.sin(t * .5) * TURTLE.bobPx;
}

function hexPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 4, y - h / 2); ctx.lineTo(x + w / 4, y - h / 2);
  ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w / 4, y + h / 2); ctx.lineTo(x - w / 4, y + h / 2); ctx.closePath();
}

export function drawTurtle(ctx: CanvasRenderingContext2D) {
  const { W, H, t, camX, camY } = world;
  const T = turtle, x = T.x - camX, y = T.y - camY, r = T.r;
  if (y < -r * 2 || y > H + r * 2 || x < -r * 3 || x > W + r * 3) return;
  if (drawSprite(ctx, 'turtle', x, y, { rot: Math.sin(t * .5) * .04 })) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * .5) * .04);
  const fl = Math.sin(t * 1.8), skin = '#ece6d8', skinD = '#cfc6b4', spot = '#a0937c', line = '#7a3a15';
  const flipper = (px: number, py: number, ang: number, len: number, wid: number, col: string) => {
    ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, -wid * .5);
    ctx.quadraticCurveTo(len * .55, -wid * .9, len, -wid * .05); ctx.quadraticCurveTo(len * .6, wid * .55, 0, wid * .5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#9c917e'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = spot;
    for (let i = 0; i < 9; i++) { const u = .12 + (i % 5) * .17, v = i < 5 ? -.15 : .12; ctx.beginPath(); ctx.ellipse(len * u, wid * v, len * .045, wid * .12, 0, 0, 7); ctx.fill(); }
    ctx.restore();
  };
  // far-side flippers (behind the body, slightly darker)
  flipper(-r * .3, -r * .02, -2.5 - fl * .35, r * .8, r * .26, skinD);
  flipper(r * .65, r * .1, .2 + fl * .15, r * .38, r * .17, skinD);
  // belly / plastron
  ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(r * .02, r * .2, r * .9, r * .24, 0, 0, 7); ctx.fill();
  // neck + head
  ctx.beginPath(); ctx.moveTo(-r * .62, -r * .02); ctx.quadraticCurveTo(-r * .9, -r * .2, -r * 1.02, -r * .18); ctx.lineTo(-r * 1.0, r * .12); ctx.quadraticCurveTo(-r * .8, r * .2, -r * .6, r * .22); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.translate(-r * 1.13, -r * .12); ctx.rotate(-.12);
  ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(0, 0, r * .3, r * .2, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#9c917e'; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.fillStyle = '#8a5a35';
  for (const [hx, hy, hr] of [[-.02, -.11, .09], [.12, -.1, .08], [-.14, -.08, .07], [.06, -.02, .06], [.2, -.01, .06]]) { ctx.beginPath(); ctx.ellipse(hx * r, hy * r, hr * r, hr * r * .7, 0, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#1b1b1b'; ctx.beginPath(); ctx.arc(-r * .14, -r * .02, r * .042, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-r * .15, -r * .035, r * .013, 0, 7); ctx.fill();
  ctx.strokeStyle = '#6d6455'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-r * .29, r * .04); ctx.quadraticCurveTo(-r * .2, r * .09, -r * .1, r * .07); ctx.stroke();
  ctx.restore();
  // domed shell
  const shell = () => { ctx.beginPath(); ctx.moveTo(-r * .8, r * .12); ctx.bezierCurveTo(-r * .72, -r * .45, -r * .2, -r * .66, r * .2, -r * .6); ctx.bezierCurveTo(r * .62, -r * .52, r * .92, -r * .12, r * .95, r * .14); ctx.quadraticCurveTo(r * .1, r * .26, -r * .8, r * .12); ctx.closePath(); };
  shell(); ctx.fillStyle = '#c8692e'; ctx.fill();
  ctx.save(); shell(); ctx.clip();
  const plate = (px: number, py: number, w: number, h: number) => {
    hexPath(ctx, px, py, w, h); ctx.fillStyle = '#cf7638'; ctx.fill(); ctx.strokeStyle = line; ctx.lineWidth = 2.5; ctx.stroke();
    hexPath(ctx, px - w * .05, py - h * .08, w * .55, h * .5); ctx.fillStyle = 'rgba(255,200,140,.28)'; ctx.fill();
  };
  for (const px of [-.5, -.12, .26, .62]) plate(px * r, -r * .46 + Math.abs(px - .05) * r * .2, r * .4, r * .3);
  for (const px of [-.66, -.3, .07, .44, .8]) plate(px * r, -r * .13, r * .38, r * .3);
  // marginal rim along the bottom edge
  ctx.fillStyle = '#e09a5c'; ctx.beginPath(); ctx.moveTo(-r * .85, r * .14); ctx.quadraticCurveTo(r * .1, r * .3, r * 1, r * .16); ctx.lineTo(r * 1, r * .03); ctx.quadraticCurveTo(r * .1, r * .16, -r * .85, r * .02); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = line; ctx.lineWidth = 1.6;
  for (let i = 0; i <= 12; i++) { const u = i / 12, bx_ = lerp(-r * .8, r * .95, u), by = lerp(r * .1, r * .14, u) + Math.sin(u * Math.PI) * r * .09; ctx.beginPath(); ctx.moveTo(bx_, by - r * .07); ctx.lineTo(bx_, by + r * .05); ctx.stroke(); }
  ctx.restore();
  shell(); ctx.strokeStyle = '#8f4a1f'; ctx.lineWidth = 2.5; ctx.stroke();
  // near-side flippers on top
  flipper(r * .62, r * .22, .55 + fl * .2, r * .42, r * .19, skin);
  flipper(-r * .42, r * .18, .95 + fl * .5, r * 1.05, r * .32, skin);
  ctx.restore();
}
