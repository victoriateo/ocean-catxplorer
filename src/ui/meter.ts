// Depth meter (right): value, zone name and the paw marker on the track.
import { world } from '../core/state';
import { depthOf, zoneName, pawPercent } from '../core/depth';

let el: { meter: HTMLElement; depth: HTMLElement; zone: HTMLElement; paw: SVGElement };

export function initMeter() {
  const $ = (id: string) => document.getElementById(id)!;
  el = { meter: $('meter'), depth: $('depth'), zone: $('zone'), paw: $('paw') as unknown as SVGElement };
}

export function updateMeter(opacity: number, under: boolean) {
  const { H, camY } = world;
  el.meter.style.opacity = String(opacity);
  const depth = under ? Math.max(0, Math.round(depthOf(camY + H * .5))) : 0;
  el.depth.textContent = depth + ' m';
  el.zone.textContent = zoneName(depth, under);
  el.paw.style.top = pawPercent(depth) + '%';
}
