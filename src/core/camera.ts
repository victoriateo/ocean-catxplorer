// Camera: pans right + down after the jump, then descends at DESC_RATE.
import { clamp, eio, seg } from './math';
import { U, DESC_RATE } from './timeline';
import { world } from './state';

export function updateCamera(us: number) {
  const { G, H } = world;
  const pan = eio(seg(us, U.CAM_A, U.SETTLE));
  world.camX = G.camXEnd * pan;
  world.camY = G.camEnd * pan + clamp(us - U.DESC_A, 0, U.END - U.DESC_A) * H * DESC_RATE;
}
