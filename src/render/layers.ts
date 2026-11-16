// The two canvases (back = behind Catto, front = in front of him) and their DPR sizing.
import { world } from '../core/state';

/** Device pixel ratio cap (SPEC §8). */
export const DPR_CAP = 2;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export const layers = {
  back: null as unknown as HTMLCanvasElement,
  front: null as unknown as HTMLCanvasElement,
  bx: null as unknown as CanvasRenderingContext2D,
  fx: null as unknown as CanvasRenderingContext2D,
  stage: null as unknown as HTMLElement,
};

export function initLayers() {
  layers.back = $<HTMLCanvasElement>('back');
  layers.front = $<HTMLCanvasElement>('front');
  layers.bx = layers.back.getContext('2d')!;
  layers.fx = layers.front.getContext('2d')!;
  layers.stage = $('stage');
}

/** Reads the viewport size into `world` and resizes the canvases. */
export function resizeLayers() {
  world.DPR = Math.min(window.devicePixelRatio || 1, DPR_CAP);
  world.W = innerWidth; world.H = innerHeight;
  for (const c of [layers.back, layers.front]) { c.width = Math.round(world.W * world.DPR); c.height = Math.round(world.H * world.DPR); }
}
