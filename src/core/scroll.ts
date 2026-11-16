// Scroll position → u (screens scrolled), plus the smoothed value `us` that drives everything.
import { U, END_PAD } from './timeline';
import { world } from './state';

/** Smoothing speed: us += (u − us) · min(1, dt · SMOOTH). */
export const SMOOTH = 7;

export const scroll = { u: 0, us: 0 };

export function setPageHeight() {
  document.body.style.height = ((U.END + END_PAD) * 100) + 'vh';
}

export function updateScroll(dt: number) {
  const u = scrollY / world.H;
  scroll.u = u;
  scroll.us += (u - scroll.us) * Math.min(1, dt * SMOOTH);
  if (Math.abs(u - scroll.us) < .001) scroll.us = u;
}
