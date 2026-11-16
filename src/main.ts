import './style.css';
import './render/grain.css';
import './actors/catto.css';
import { world } from './core/state';
import { clamp } from './core/math';
import { computeGeometry } from './core/timeline';
import { setPageHeight } from './core/scroll';
import { initInput } from './core/input';
import { startLoop } from './core/loop';
import { initLayers, resizeLayers, stableHeight } from './render/layers';
import { resizeNight } from './render/night';
import { initCatto, sizeCatto } from './actors/catto';
import { initScene } from './scenes';
import { initMeter } from './ui/meter';
import { initCards } from './ui/cards';
import { initFactCard } from './ui/factCard';
import { initSoundToggle } from './ui/soundToggle';
import { initSoundBoard } from './ui/soundBoard';
import { loadArt } from './assets/sprites';
import { cat } from './core/state';
import { squid } from './actors/squid';
import { chest } from './actors/chest';

function layout() {
  resizeLayers();
  world.mobile = world.W < 700;
  world.G = computeGeometry(world.W, world.H, world.mobile);
  sizeCatto();
  resizeNight();
  world.sc = clamp(world.G.s / 170, .75, 1.25);
  initScene();
}

initLayers();
initCatto();
initMeter();
initCards();
initFactCard();
initSoundToggle();
initSoundBoard();
initInput();
setPageHeight();
// Re-lay out only when the size really changes (window resize, rotation), and only once the
// dragging stops. A phone's address bar showing/hiding changes neither number, so it is ignored.
let resizeTimer: ReturnType<typeof setTimeout>;
addEventListener('resize', () => {
  if (innerWidth === world.W && stableHeight() === world.H) return;
  clearTimeout(resizeTimer); resizeTimer = setTimeout(layout, 120);
});
layout();
startLoop();
const showCat = () => document.getElementById('cat')!.classList.add('ready');
loadArt().then(showCat, showCat);
setTimeout(showCat, 1500);   // never wait long for a slow image

// Dev only: live state for poking at in the console and for test scripts (window.__cx.squid, …).
if (import.meta.env.DEV) (window as unknown as { __cx: unknown }).__cx = { world, cat, squid, chest };
