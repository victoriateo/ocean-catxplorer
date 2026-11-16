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
  reduce: typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
};

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
  bolt: { vx: 0, vy: 0, t: 0 },
  /** Shocked-face timer, s. */
  bang: 0,
  /** Happy-face timer, s. */
  happy: 0,
  ascending: false,
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
