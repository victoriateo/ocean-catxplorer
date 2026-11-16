// Draw order (SPEC §3):
//   back canvas  → sky, sea, reef, pier, turtle, far half of the sardine ring, trench, chest + glow
//   Catto        → DOM/SVG between the canvases
//   front canvas → tint, creatures, near half of the ring, dark overlay, night, glows, vignette
import { world } from '../core/state';
import { layers } from './layers';
import { drawNight } from './night';
import { drawSky, drawPier, drawSunGlint } from '../scenes/pier';
import { deepColour, drawSea, drawWaterTint, drawVignette, seaPath } from '../scenes/shallows';
import { drawTrench } from '../scenes/trench';
import { drawSnow } from '../scenes/midnight';
import { drawFish } from '../actors/fish';
import { drawClownfishScene } from '../actors/clownfish';
import { drawShoal } from '../actors/sardines';
import { drawTurtle } from '../actors/turtle';
import { drawJellies } from '../actors/jellyfish';
import { drawManta } from '../actors/manta';
import { drawShark } from '../actors/shark';
import { drawSquid, drawInk } from '../actors/squid';
import { drawAngler } from '../actors/angler';
import { drawDumbo } from '../actors/dumbo';
import { drawChest } from '../actors/chest';
import { drawBubbles } from '../actors/bubbles';
import { drawRipples, drawDrops } from '../actors/splash';
import { light } from '../core/state';
import { seg } from '../core/math';

export function drawBack(dark: number) {
  const { W, H, G, DPR, camY } = world, ctx = layers.bx;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const wl = G.WL - camY;
  const deep = deepColour();
  ctx.fillStyle = deep; ctx.fillRect(0, 0, W, H);
  if (wl > -30) drawSky(ctx, wl);
  drawSea(ctx, wl, deep);
  drawSunGlint(ctx, wl);
  drawPier(ctx);
  if (dark > 0) { seaPath(ctx, wl); ctx.fillStyle = `rgba(3,18,32,${dark})`; ctx.fill(); }
  drawTurtle(ctx);
  drawShoal(ctx, false);
  drawTrench(ctx);
  drawChest(ctx, 'halo');
  drawChest(ctx, 'box');
  drawChest(ctx, 'glow');
}

export function drawFront(dark: number) {
  const { W, H, DPR } = world, ctx = layers.fx;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H);
  drawWaterTint(ctx);
  drawFish(ctx);
  drawShoal(ctx, true);
  drawClownfishScene(ctx);
  drawJellies(ctx);
  drawBubbles(ctx);
  drawRipples(ctx);
  drawDrops(ctx);
  drawInk(ctx);
  drawManta(ctx);
  drawShark(ctx, false);
  drawSquid(ctx, false);
  drawAngler(ctx, false);
  drawDumbo(ctx, 1);
  if (dark > 0) { ctx.fillStyle = `rgba(3,18,32,${dark * .45})`; ctx.fillRect(0, 0, W, H); }
  drawNight(ctx);
  // glowing things sit on top of the darkness
  drawShark(ctx, true);
  drawSquid(ctx, true);
  drawAngler(ctx, true);
  drawDumbo(ctx, .7 * seg(light.night, .6, .9));     // faint, so you can spot it in the dark
  drawSnow(ctx);
  drawVignette(ctx);
}
