// The director: builds every scene and steps the simulation in a fixed order.
//
// ORDER MATTERS. Init and update order are kept identical to the prototype so that, with a
// seeded Math.random (see scripts/compare.mjs), the build reproduces the prototype exactly.
//
//   Pier       → scenes/pier.ts
//   Shallows   → scenes/shallows.ts, actors/fish.ts (+ splash, bubbles)
//   Reef       → scenes/reef.ts, actors/clownfish.ts, sardines.ts, turtle.ts, jellyfish.ts
//   Twilight   → actors/manta.ts, shark.ts, squid.ts (+ the lamp in render/night.ts)
//   Midnight   → scenes/midnight.ts (marine snow), actors/angler.ts, dumbo.ts
//   Trench     → scenes/trench.ts, actors/chest.ts
import { cat, world } from '../core/state';
import { shoal } from '../actors/sardines';
import { isTowing } from '../actors/catto';
import { squid } from '../actors/squid';
import { dumbo } from '../actors/dumbo';
import { initReef } from './reef';
import { initMotes } from './shallows';
import { initSnow, updateSnow } from './midnight';
import { initTreasureGarden, initTrenchWalls } from './trench';
import { initFish, updateFish } from '../actors/fish';
import { initClowns, updateClowns } from '../actors/clownfish';
import { initSardines, updateSardines } from '../actors/sardines';
import { initTurtle, updateTurtle } from '../actors/turtle';
import { initJellies, initJellyTentacles, updateJellies } from '../actors/jellyfish';
import { initManta, updateManta } from '../actors/manta';
import { initShark, updateShark } from '../actors/shark';
import { initSquid, updateSquid } from '../actors/squid';
import { initAngler, updateAngler } from '../actors/angler';
import { initDumbo, updateDumbo } from '../actors/dumbo';
import { initChest, updateChest } from '../actors/chest';
import { updateSplash } from '../actors/splash';
import { updateBubbles } from '../actors/bubbles';

export function initScene() {
  initReef();
  initFish();
  initMotes();
  initClowns();
  initSardines();
  initTurtle();
  initJellies();
  initManta();
  initShark();
  initSquid();
  initAngler();
  initDumbo();
  initChest();
  initTreasureGarden();
  initTrenchWalls();
  initSnow();
  initJellyTentacles();
}

/** How far off-screen (in screens) a creature may be before we stop simulating it (SPEC §8). */
export const CULL_SCREENS = 1.1;

/** Is world-y `wy` (give or take `pad` px) on screen or within CULL_SCREENS of it? */
function near(wy: number, pad = 0) {
  const { H, camY } = world;
  return wy + pad > camY - H * CULL_SCREENS && wy - pad < camY + H * (1 + CULL_SCREENS);
}

export function simulate(dt: number) {
  const step = dt * 60;   // most motion constants are "per 60 fps frame"
  const { H, G } = world;
  updateSplash(dt, step);
  updateBubbles(step);
  if (near(G.WL + H * .4) || near(G.R0 + H * 1.7, H * 1.6)) updateFish(dt, step);
  if (near(G.aY, 200)) updateClowns(dt);
  if (shoal.engaged || near(shoal.y, H * .3)) updateSardines(dt, step);
  if (isTowing() || near(G.turtY, 120)) updateTurtle(step);
  if (near(G.jellyY, H * .5)) updateJellies(dt, step);
  if (near(G.mantaY, H * .4)) updateManta(dt);
  if (near(G.sharkY, H * .3)) updateShark(dt, step);
  if (squid.state !== 'idle' || near(G.squidY, H * .2)) updateSquid(dt, step);
  cat.bang = Math.max(0, cat.bang - dt);
  if (near(G.anglerY, H * .3)) updateAngler(dt);
  if (dumbo.follow > 0 || near(G.dumboY, H * .3)) updateDumbo(dt);
  if (world.camY > G.M0 - H * 2) updateSnow(step);
  updateChest(dt, step);   // always: it also runs Catto's happy-face and speech timers
}
