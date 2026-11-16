// Green sea turtle, cruising right → left. Bump into it to hitch a ride (handled in catto.ts).
import { world } from '../core/state';
import { clamp } from '../core/math';
import { drawSprite } from '../assets/sprites';

export const TURTLE = {
  size: .62,       // shell radius, × cat size
  speed: .8,       // px per frame (× W/1200, clamped .7–1.2)
  bobPx: 18,       // vertical bob
  bumpR: 1.05,     // Catto within this × radius → ride
  rideMax: 4.5,    // seconds
  rideCool: 3,     // seconds before another ride
  strokeRate: 2.1,  // flipper strokes: radians per second (one full stroke every ~3 s)
  strokeSwing: .75, // how far the front flippers sweep, radians either side of rest
  // colours
  shell: '#96472c', seam: '#f4dfb4', rim: '#7d3a23',
  skin: '#aed766', skinFar: '#86b34f', belly: '#c9e38c', patch: '#76a544',
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

/** A paddle-shaped flipper drawn along +x from its joint, with scale patches toward the tip. */
function flipper(ctx: CanvasRenderingContext2D, px: number, py: number, ang: number, len: number, wid: number, col: string, patch: string, flat = 1) {
  ctx.save(); ctx.translate(px, py); ctx.rotate(ang); ctx.scale(1, flat);
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, -wid * .42);
  ctx.quadraticCurveTo(len * .5, -wid * .8, len * .96, -wid * .12);
  ctx.quadraticCurveTo(len * 1.04, wid * .22, len * .82, wid * .4);
  ctx.quadraticCurveTo(len * .4, wid * .62, 0, wid * .46); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = patch;
  for (let i = 0; i < 11; i++) {   // rounded scale patches, bigger toward the trailing edge
    const u = .42 + (i % 4) * .15 + (i > 7 ? .07 : 0), v = i < 4 ? .3 : i < 8 ? .05 : -.2, k = 1 - (i > 7 ? .35 : 0);
    ctx.beginPath(); ctx.ellipse(len * u, wid * v, len * .058 * k, wid * .13 * k, .3, 0, 7); ctx.fill();
  }
  ctx.restore(); ctx.restore();
}

function hexPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 4, y - h / 2); ctx.lineTo(x + w / 4, y - h / 2);
  ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w / 4, y + h / 2); ctx.lineTo(x - w / 4, y + h / 2); ctx.closePath();
}

/** Flat shapes, no outlines: green body, reddish-brown shell. Faces left. */
export function drawTurtle(ctx: CanvasRenderingContext2D) {
  const { W, H, t, camX, camY } = world;
  const T = turtle, x = T.x - camX, y = T.y - camY, r = T.r;
  if (y < -r * 2 || y > H + r * 2 || x < -r * 3 || x > W + r * 3) return;
  // Swimming stroke. Sea turtles "fly": both front flippers sweep down and back together (the
  // power stroke), then lift forward more slowly. `s` runs +1 (reaching forward) → −1 (swept back).
  const ph = t * TURTLE.strokeRate, s = Math.sin(ph + .55 * Math.sin(ph)), power = Math.max(0, -Math.cos(ph));
  const surge = Math.sin(ph - .9);                       // the body lifts and noses up a little after each stroke
  if (drawSprite(ctx, 'turtle', x, y - surge * r * .035, { rot: Math.sin(t * .5) * .04 - surge * .03 })) return;
  const C = TURTLE;
  ctx.save(); ctx.translate(x, y - surge * r * .035); ctx.rotate(Math.sin(t * .5) * .04 - surge * .03);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const front = 1.2 + s * C.strokeSwing, rear = Math.sin(ph + 1.2) * .16;
  // Everything that is skin shares one colour and overlaps, so head, neck, body and flippers read
  // as a single shape; only the far-side flippers are a shade darker.
  flipper(ctx, -r * .3, r * .08, front + .3, r * .92, r * .3, C.skinFar, C.skinFar, .8 + .2 * power);
  flipper(ctx, r * .74, r * .12, .15 + rear, r * .42, r * .2, C.skinFar, C.skinFar);
  // tail tip
  ctx.fillStyle = C.skin; ctx.beginPath(); ctx.moveTo(r * .86, r * .1); ctx.quadraticCurveTo(r * 1.12, r * .14, r * 1.16, r * .22); ctx.quadraticCurveTo(r * 1.0, r * .26, r * .84, r * .22); ctx.closePath(); ctx.fill();
  // near-side flippers: their roots tuck under the body and shell
  flipper(ctx, r * .58, r * .16, .55 + rear, r * .5, r * .24, C.skin, C.patch);
  flipper(ctx, -r * .4, r * .14, front, r * 1.12, r * .38, C.skin, C.patch, .82 + .18 * power);
  // body under the shell
  ctx.fillStyle = C.skin; ctx.beginPath(); ctx.ellipse(r * .04, r * .15, r * .92, r * .23, .02, 0, 7); ctx.fill();
  ctx.fillStyle = C.belly; ctx.beginPath(); ctx.ellipse(r * .12, r * .24, r * .7, r * .1, .02, 0, 7); ctx.fill();
  // neck + big round head (nods slightly with the stroke)
  ctx.save(); ctx.translate(-r * .6, r * .02); ctx.rotate(surge * .05); ctx.translate(r * .6, -r * .02);
  ctx.strokeStyle = C.skin; ctx.lineWidth = r * .36; ctx.beginPath(); ctx.moveTo(-r * .5, r * .08); ctx.quadraticCurveTo(-r * .72, -r * .02, -r * .86, -r * .2); ctx.stroke();
  ctx.fillStyle = C.skin; ctx.beginPath(); ctx.ellipse(-r * 1.04, -r * .37, r * .45, r * .41, -.12, 0, 7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.ellipse(-r * 1.04, -r * .37, r * .45, r * .41, -.12, 0, 7); ctx.clip();
  ctx.fillStyle = C.patch;                                                                              // freckle patches over the back of the crown
  for (const [hx, hy, hr] of [[-.98, -.72, .07], [-.82, -.68, .075], [-.7, -.58, .07], [-.64, -.44, .065], [-.88, -.57, .05], [-.78, -.47, .045], [-.64, -.3, .05], [-1.1, -.7, .04], [-.72, -.74, .04]])
    { ctx.beginPath(); ctx.ellipse(hx * r, hy * r, hr * r, hr * r * .75, .4, 0, 7); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,128,128,.42)'; ctx.beginPath(); ctx.ellipse(-r * 1.08, -r * .2, r * .085, r * .055, 0, 0, 7); ctx.fill();     // blush
  ctx.fillStyle = '#1d3327'; ctx.beginPath(); ctx.ellipse(-r * 1.22, -r * .37, r * .058, r * .07, 0, 0, 7); ctx.fill();                  // eye
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-r * 1.24, -r * .4, r * .022, 0, 7); ctx.fill();
  ctx.strokeStyle = '#557f33'; ctx.lineWidth = Math.max(1.3, r * .024); ctx.beginPath(); ctx.moveTo(-r * 1.4, -r * .22); ctx.quadraticCurveTo(-r * 1.32, -r * .13, -r * 1.2, -r * .16); ctx.stroke();   // smile
  ctx.restore();
  // domed shell: brown plates with pale seams between them
  const shell = () => { ctx.beginPath(); ctx.moveTo(-r * .8, r * .12); ctx.bezierCurveTo(-r * .72, -r * .45, -r * .2, -r * .66, r * .2, -r * .6); ctx.bezierCurveTo(r * .62, -r * .52, r * .92, -r * .12, r * .95, r * .14); ctx.quadraticCurveTo(r * .1, r * .26, -r * .8, r * .12); ctx.closePath(); };
  shell(); ctx.fillStyle = C.shell; ctx.fill();
  ctx.save(); shell(); ctx.clip();
  ctx.fillStyle = 'rgba(255,205,160,.14)'; ctx.beginPath(); ctx.ellipse(-r * .1, -r * .5, r * .6, r * .17, -.1, 0, 7); ctx.fill();   // soft top light
  ctx.strokeStyle = C.seam; ctx.lineWidth = Math.max(1.6, r * .034);
  const hw = r * .5, hh = r * .36;                                                                       // honeycomb of seams
  for (let i = -3; i <= 3; i++) for (let j = -2; j <= 1; j++) { hexPath(ctx, r * .06 + i * hw * .75, -r * .22 + j * hh + (i & 1 ? hh / 2 : 0), hw, hh); ctx.stroke(); }
  // rim: a band of small plates along the bottom edge
  const rimTop = (u: number) => r * (.0 + u * .02) + Math.sin(u * Math.PI) * r * .13, rimX = (u: number) => -r * .86 + u * r * 1.86;
  ctx.fillStyle = C.rim; ctx.beginPath(); ctx.moveTo(rimX(0), rimTop(0));
  for (let i = 1; i <= 16; i++) ctx.lineTo(rimX(i / 16), rimTop(i / 16));
  ctx.lineTo(r * 1.05, r * .4); ctx.lineTo(-r * .9, r * .4); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(rimX(0), rimTop(0)); for (let i = 1; i <= 16; i++) ctx.lineTo(rimX(i / 16), rimTop(i / 16)); ctx.stroke();
  for (let i = 1; i < 11; i++) { const u = i / 11; ctx.beginPath(); ctx.moveTo(rimX(u), rimTop(u)); ctx.lineTo(rimX(u) + r * .01, rimTop(u) + r * .2); ctx.stroke(); }
  ctx.restore();
  ctx.restore();
}
