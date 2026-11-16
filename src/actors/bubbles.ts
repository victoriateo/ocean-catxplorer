// Bubbles: from the helmet, the splash and floor bumps. They rise, wobble and pop at the surface.
import { world } from '../core/state';
import { addRipple } from './splash';

export const BUBBLES = {
  interval: [.18, .3],   // helmet bubble every interval[0] + rand·interval[1] seconds
  ascendInterval: .03,   // …much faster on the ride back up
  wobble: .35,           // sideways wobble per frame
  popRipple: .3,         // chance a bubble leaves a tiny ripple when it pops at the surface
};

export interface Bubble { x: number; y: number; r: number; vy: number; ph: number }

let bubbles: Bubble[] = [];
let bubbleT = 0;

export const addBubble = (b: Bubble) => { bubbles.push(b); };

/** Emits helmet bubbles. Offsets are relative to the cat rig (SVG units). */
export function emitHelmetBubbles(dt: number, wx: number, wy: number, rot: number, facing: number, ascending: boolean) {
  const { s, h } = world.G;
  bubbleT -= dt;
  if (bubbleT < 0) {
    bubbleT = ascending ? BUBBLES.ascendInterval : BUBBLES.interval[0] + Math.random() * BUBBLES.interval[1];
    const ox = (118 - 100) / 200 * s * facing, oy = (12 - 110) / 220 * h, a = rot * Math.PI / 180;
    bubbles.push({ x: wx + ox * Math.cos(a) - oy * Math.sin(a), y: wy + ox * Math.sin(a) + oy * Math.cos(a), r: 2 + Math.random() * 4, vy: .8 + Math.random() * .8, ph: Math.random() * 6 });
  }
}

export function updateBubbles(step: number) {
  const { G, t, camY } = world;
  for (const b of bubbles) { b.y -= b.vy * step; b.x += Math.sin(t * 3 + b.ph) * BUBBLES.wobble; }
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    if (b.y < G.WL + 3) { if (Math.random() < BUBBLES.popRipple) addRipple({ x: b.x, r: 1, a: .35 }); bubbles.splice(i, 1); }
    else if (b.y < camY - 60) bubbles.splice(i, 1);
  }
}

export function drawBubbles(ctx: CanvasRenderingContext2D) {
  const { H, camX, camY } = world;
  for (const b of bubbles) {
    const x = b.x - camX, y = b.y - camY; if (y < -10 || y > H + 10) continue;
    ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.strokeStyle = 'rgba(225,252,255,.85)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y, b.r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(x - b.r * .35, y - b.r * .35, b.r * .25, 0, 7); ctx.fill();
  }
}
