// Shared mutable state. Actors read the camera, clock and Catto's position from here.
import type { Geometry } from './timeline';

export const world = {
  W: 0, H: 0, DPR: 1,
  mobile: false,
  /** General scale for creatures, from cat size (clamped .75–1.25). */
  sc: 1,
  /** Seconds since start (sim clock). */
  t: 0,
  camX: 0, camY: 0,
  G: {} as Geometry,
  /** The visitor asked their device for less motion (kept up to date if they change it). */
  reduce: false,
};
if (typeof matchMedia !== 'undefined') {
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  world.reduce = mq.matches;
  mq.addEventListener?.('change', e => { world.reduce = e.matches; });
}
/** Fewer particles: on phones (performance) and when reduced motion is on. */
export const lite = () => world.mobile || world.reduce;

/** Catto, as other actors see him. */
export const cat = {
  /** Screen-space centre. */
  x: 0, y: 0,
  /** World-space centre ("cw" in the prototype). */
  wx: 0, wy: 0,
  rot: 0,
  facing: 1,
  under: false,
  /** Free-swim target (screen space). Jellies nudge it. */
  F: { x: 0, y: 0 },
  /** Scare impulse ("bolt"). */
  bolt: { vx: 0, vy: 0, t: 0 } as { vx: number; vy: number; t: number; /** share of speed left after 1 s (default .05 = dies off fast) */ keep?: number },
  /** Shocked-face timer, s. */
  bang: 0,
  /** Happy-face timer, s. */
  happy: 0,
  ascending: false,
  /** Speech bubble: text and seconds left. */
  say: { text: '', t: 0, total: 1 },
};

/** Lamp + darkness. */
export const light = {
  lampK: 0,
  night: 0,
  lamp: { x: 0, y: 0, dir: 1 },
};

/** Is world point (x, y) within R of Catto (only while underwater)? */
export function nearCat(x: number, y: number, R: number) {
  if (!cat.under) return null;
  const dx = x - cat.wx, dy = y - cat.wy, d = Math.hypot(dx, dy);
  return d < R ? { dx, dy, d: Math.max(d, .01) } : null;
}
