// The splash: droplets, surface ripples and screen shake.
import { world } from '../core/state';
import { sfx } from '../audio/audio';
import { layers } from '../render/layers';
import { addBubble } from './bubbles';

export const SPLASH = {
  drops: 80,          // droplets per splash
  crown: 24,          // of which this many form the tall crown
  bubbles: 45,        // burst of bubbles under the surface
  reduceScale: .35,   // reduced motion: this share of the droplets and bubbles
  gravity: .38,       // droplet gravity (per 60 fps frame, × H/800)
  rippleGrow: 2.4,    // ripple radius growth per frame
  rippleFade: .7,     // ripple alpha lost per second
  dropRipple: .25,    // chance a landing droplet makes a ripple
  shakePx: 12,        // screen-shake amplitude
  shakeDecay: 2.6,    // shake fades over 1 / this seconds (~0.4 s)
};

interface Drop { x: number; y: number; vx: number; vy: number; r: number }
interface Ripple { x: number; r: number; a: number }

let drops: Drop[] = [];
let ripples: Ripple[] = [];
let shake = 0;

export const addRipple = (r: Ripple) => { ripples.push(r); };

export function doSplash(x: number) {
  sfx('splash');
  const { H, G } = world;
  const k = H / 800, q = world.reduce ? SPLASH.reduceScale : 1;
  for (let i = 0; i < SPLASH.drops * q; i++) {
    const crown = i < SPLASH.crown * q;
    drops.push({ x: x + (Math.random() - .5) * (crown ? 30 : 60), y: G.WL - 2,
      vx: (Math.random() - .5) * (crown ? 3 : 8), vy: -(crown ? 9 + Math.random() * 6 : 3 + Math.random() * 8) * k,
      r: crown ? 3 + Math.random() * 4 : 1.5 + Math.random() * 3 });
  }
  ripples.push({ x, r: 4, a: .9 }, { x, r: -24, a: .8 }, { x, r: -52, a: .7 });
  for (let i = 0; i < SPLASH.bubbles * q; i++) addBubble({ x: x + (Math.random() - .5) * 90, y: G.WL + 20 + Math.random() * G.h, r: 2 + Math.random() * 6, vy: 1 + Math.random() * 1.6, ph: Math.random() * 6 });
  if (!world.reduce) shake = 1;
}

/** Screen shake; applied to the whole stage. */
export function updateShake(dt: number) {
  const stage = layers.stage;
  if (shake > 0) {
    shake = Math.max(0, shake - dt * SPLASH.shakeDecay);
    stage.style.transform = `translate(${(Math.random() - .5) * SPLASH.shakePx * shake}px,${(Math.random() - .5) * SPLASH.shakePx * shake}px)`;
  } else stage.style.transform = '';
}

export function updateSplash(dt: number, step: number) {
  const { H, G } = world;
  const g = SPLASH.gravity * (H / 800);
  for (const d of drops) { d.vy += g * step; d.x += d.vx * step; d.y += d.vy * step; }
  for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; if (d.vy > 0 && d.y > G.WL) { if (Math.random() < SPLASH.dropRipple) ripples.push({ x: d.x, r: 2, a: .5 }); drops.splice(i, 1); } }
  for (const r of ripples) { r.r += SPLASH.rippleGrow * step; if (r.r > 0) r.a -= dt * SPLASH.rippleFade; }
  ripples = ripples.filter(r => r.a > 0);
}

export function drawRipples(ctx: CanvasRenderingContext2D) {
  const { G, camX, camY } = world, wl = G.WL - camY;
  for (const r of ripples) {
    ctx.strokeStyle = `rgba(255,255,255,${r.a})`; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(r.x - camX, wl + 2, Math.max(1, r.r), Math.max(1, r.r * .22), 0, 0, 7); ctx.stroke();
  }
}

export function drawDrops(ctx: CanvasRenderingContext2D) {
  const { camX, camY } = world;
  for (const d of drops) {
    ctx.fillStyle = 'rgba(240,253,255,.95)'; ctx.strokeStyle = 'rgba(90,180,200,.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(d.x - camX, d.y - camY, d.r, 0, 7); ctx.fill(); ctx.stroke();
  }
}
