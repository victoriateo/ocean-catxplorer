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
import { cat } from '../core/state';
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

export function simulate(dt: number) {
  const step = dt * 60;   // most motion constants are "per 60 fps frame"
  updateSplash(dt, step);
  updateBubbles(step);
  updateFish(dt, step);
  updateClowns(dt);
  updateSardines(dt, step);
  updateTurtle(step);
  updateJellies(dt, step);
  updateManta(dt);
  updateShark(dt, step);
  updateSquid(dt, step);
  cat.bang = Math.max(0, cat.bang - dt);
  updateAngler(dt);
  updateDumbo(dt);
  updateSnow(step);
  updateChest(dt, step);
}
