// The frame loop. Steps are in the same order as the prototype's frame().
import { world, cat, light } from './state';
import { scroll, updateScroll } from './scroll';
import { updateCamera } from './camera';
import { U, UI_FADE, darkAt, lampAt, nightAt } from './timeline';
import { seg } from './math';
import { updateCatto, applyCattoDom, placeLamp, drawCattoCallouts } from '../actors/catto';
import { updateShake } from '../actors/splash';
import { emitHelmetBubbles } from '../actors/bubbles';
import { simulate } from '../scenes';
import { drawBack, drawFront } from '../render/compose';
import { layers } from '../render/layers';
import { updateMeter } from '../ui/meter';
import { updateCards } from '../ui/cards';
import { updateFactCard } from '../ui/factCard';

/** Longest step the sim will take (s); protects against tab-switch jumps. */
export const MAX_DT = .05;

let last = 0;

function frame(now: number) {
  const dt = Math.min(MAX_DT, (now - last) / 1000); last = now; world.t += dt;
  updateScroll(dt);
  const us = scroll.us;
  updateCamera(us);

  updateCatto(dt, now, us);
  updateShake(dt);
  applyCattoDom();
  if (cat.under && us > U.SPLASH + .06) emitHelmetBubbles(dt, cat.wx, cat.wy, cat.rot, cat.facing, cat.ascending);

  // helmet light + darkness for the twilight zone
  const { G, H, camY } = world;
  const centreY = camY + H * .5;
  light.lampK = lampAt(centreY, G, H);
  light.night = nightAt(centreY, G, H);
  placeLamp();

  simulate(dt);
  const dark = darkAt(camY, G, H);
  drawBack(dark);
  drawFront(dark);
  drawCattoCallouts(layers.fx);

  // UI
  const endCard = updateCards(us);
  updateMeter(seg(us, UI_FADE.meter[0], UI_FADE.meter[1]), cat.under);
  updateFactCard(endCard);

  requestAnimationFrame(frame);
}

export function startLoop() {
  last = performance.now();
  requestAnimationFrame(frame);
}
