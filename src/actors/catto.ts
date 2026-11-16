// Catto: the scripted pier → jump → splash path, then free swim (follow the cursor, wander,
// bolt after a scare, ride the turtle, bump off the trench floor). Rendered as DOM/SVG.
import svgMarkup from './catto.svg?raw';
import { world, cat, light } from '../core/state';
import { clamp, eio, ein, eout, lerp, seg } from '../core/math';
import { U, PATH } from '../core/timeline';
import { mouse, IDLE_MS } from '../core/input';
import { doSplash } from './splash';
import { addBubble } from './bubbles';
import { turtle, TURTLE } from './turtle';
import { sfx } from '../audio/audio';
import { onArtLoaded, sprite, spriteDef } from '../assets/sprites';

export const SWIM = {
  follow: 1.8,         // easing speed toward the cursor, per second
  wanderX: .22,        // figure-of-eight wander size (× W, × H)
  wanderY: .13,
  wanderSpeed: [.35, .6],
  maxTilt: 14,         // degrees of tilt with speed
  tiltPerPx: .04,      // degrees per px/s
  flipSpeed: 25,       // px/s needed to flip facing
  rideFollow: 8,       // easing speed onto the turtle's shell
  floorBounceV: -260,  // px/s kick off the trench floor
  floorBounceT: .45,
  floorCool: 1.4,      // at most one bounce every this many seconds
  ascendFollow: 3,     // easing to mid-screen on the ride back up
};

let catEl: HTMLElement, helmet: SVGGElement, lampEl: SVGGElement;
let prevU = 0, prevFinal: { x: number; y: number } | null = null;
let tow: { t: number } | null = null, towCool = 0;
let floorBounce = { vy: 0, t: 0, cool: 0 };
/** Output of updateCatto, consumed by applyCattoDom / helmet bubbles. */
const out = { rot: 0, sy: 1, ht: 0, sitting: true };

// ─── Painted Catto ───────────────────────────────────────────────────────────
// The paintings sit inside #cat underneath the SVG; the SVG then shows only the helmet and lamp.
// Each picture's anchor (the middle of his head, see assets/manifest.json) is pinned to the
// centre of the helmet glass. Needs at least the sit and swim pictures; without the shocked or
// happy one he keeps the plain swim pose.
const POSES = ['catto-sit', 'catto-swim', 'catto-swim-shocked', 'catto-swim-happy'] as const;
/** Centre of the helmet glass in the SVG's 200 × 220 box. */
const HELMET_AT = [110 / 200, 80 / 220];
const artEls = new Map<string, HTMLImageElement>();
let painted = false, shownPose = '';

function layoutArt() {
  const { s, h } = world.G;
  for (const name of POSES) {
    const img = sprite(name), def = spriteDef(name); if (!img || !def) continue;
    let el = artEls.get(name);
    if (!el) { el = new Image(); el.src = img.src; el.alt = ''; el.className = 'art'; el.dataset.pose = name; catEl.insertBefore(el, catEl.firstChild); artEls.set(name, el); }
    const w = def.scale * s, ht = w * img.naturalHeight / img.naturalWidth;
    el.style.width = w + 'px'; el.style.height = ht + 'px';
    el.style.left = HELMET_AT[0] * s - def.anchor[0] * w + 'px'; el.style.top = HELMET_AT[1] * h - def.anchor[1] * ht + 'px';
    el.style.transformOrigin = `${def.anchor[0] * 100}% ${def.anchor[1] * 100}%`;
    el.style.transform = def.rotate ? `rotate(${def.rotate}deg)` : '';
  }
  painted = artEls.has('catto-sit') && artEls.has('catto-swim');
  catEl.classList.toggle('painted', painted);
}

function showPose() {
  if (!painted) return;
  let pose: string = out.sitting ? 'catto-sit' : cat.bang > 0 ? 'catto-swim-shocked' : cat.happy > 0 ? 'catto-swim-happy' : 'catto-swim';
  if (!artEls.has(pose)) pose = 'catto-swim';
  if (pose === shownPose) return;
  shownPose = pose;
  for (const [name, el] of artEls) el.classList.toggle('on', name === pose);
}

export function initCatto() {
  catEl = document.getElementById('cat')!;
  catEl.innerHTML = svgMarkup;
  helmet = catEl.querySelector('#helmet')!;
  lampEl = catEl.querySelector('#lamp')!;
  onArtLoaded(name => { if (name.startsWith('catto-') && world.G.s) layoutArt(); });
}

export function sizeCatto() {
  const { s, h } = world.G;
  catEl.style.width = s + 'px'; catEl.style.height = h + 'px';
  layoutArt();
}

export const isTowing = () => !!tow;

export function updateCatto(dt: number, now: number, us: number) {
  const { W, H, G, t, camX, camY } = world;
  const { s, h } = G;

  // scripted path (world coords, centre of Catto)
  const sit = { x: G.sitX, y: G.deckY - h * .48 };
  const E = { x: G.sitX + G.jumpDX, y: G.WL + h * .25 };
  const Tg = { x: G.camXEnd + W * .5, y: G.camEnd + H * .52 };
  let x: number, y: number, rot = 0, sy = 1;
  if (us < U.JUMP_A) {
    sy = 1 - PATH.CROUCH_SQUASH * eio(seg(us, U.CROUCH_A, U.JUMP_A)); x = sit.x; y = sit.y + h * .5 * (1 - sy);
  } else if (us < U.SPLASH) {
    const j = seg(us, U.JUMP_A, U.SPLASH);
    x = lerp(sit.x, E.x, j); y = lerp(sit.y, E.y, j) - Math.sin(Math.PI * j) * H * PATH.JUMP_ARC;
    rot = lerp(0, PATH.JUMP_ROT, ein(j));
    sy = j < .15 ? lerp(.88, 1.08, j / .15) : lerp(1.08, 1, (j - .15) / .85);
  } else {
    const k = eout(seg(us, U.SPLASH, U.SETTLE));
    x = lerp(E.x, Tg.x, k); y = lerp(E.y, Tg.y, k); rot = lerp(PATH.JUMP_ROT, PATH.SETTLE_ROT, eout(seg(us, U.SPLASH, PATH.RIGHT_ROT_U)));
  }
  if (prevU < U.SPLASH && us >= U.SPLASH) doSplash(E.x);
  if (prevU >= U.SPLASH && us < U.SPLASH && cat.ascending) doSplash(E.x);
  prevU = us;

  const under = us >= U.SPLASH;
  cat.under = under;
  let sx = x - camX, sy2 = y - camY;
  if (under) { const bk = seg(us, U.SPLASH + PATH.BOB_IN[0], U.SPLASH + PATH.BOB_IN[1]); sy2 += Math.sin(t * 2.2) * 5 * bk; rot += Math.sin(t * 1.6) * 4 * bk; }

  // free swim
  const F = cat.F;
  const freeK = eio(seg(us, U.FREE_A, U.FREE_B));
  towCool = Math.max(0, towCool - dt);
  if (freeK <= 0) { F.x = sx; F.y = sy2; tow = null; }
  else if (tow) {
    tow.t += dt;
    const tx = turtle.x - camX - turtle.r * .05, ty = turtle.y - camY - turtle.r * .5 - h * .38;
    const k = Math.min(1, dt * SWIM.rideFollow); F.x += (tx - F.x) * k; F.y += (ty - F.y) * k;
    if (tow.t > TURTLE.rideMax || tx < s * .5 || ty < h * .4 || ty > H - h * .3) { tow = null; towCool = TURTLE.rideCool; }
  } else if (cat.ascending) {
    const k = Math.min(1, dt * SWIM.ascendFollow); F.x += (W * .5 - F.x) * k; F.y += (H * .58 - F.y) * k;
  } else if (cat.bolt.t > 0) {   // Catto bolts away after a scare
    const bolt = cat.bolt;
    bolt.t -= dt; F.x += bolt.vx * dt; F.y += bolt.vy * dt; const d = Math.pow(bolt.keep ?? .05, dt); bolt.vx *= d; bolt.vy *= d;
    F.x = clamp(F.x, s * .6, W - s * .6); F.y = clamp(F.y, h * .6 + 40, H - h * .55);
  } else {
    let tx: number, ty: number;
    if (now - mouse.tm < IDLE_MS) { tx = mouse.x; ty = mouse.y; }
    else { tx = W * .5 + Math.sin(t * SWIM.wanderSpeed[0]) * W * SWIM.wanderX; ty = H * .55 + Math.sin(t * SWIM.wanderSpeed[1]) * H * SWIM.wanderY; }
    tx = clamp(tx, s * .6, W - s * .6); ty = clamp(ty, h * .6 + 40, H - h * .55);
    const k = Math.min(1, dt * SWIM.follow); F.x += (tx - F.x) * k; F.y += (ty - F.y) * k;
    // bump into the turtle → hitch a ride
    const ddx = F.x - (turtle.x - camX), ddy = F.y - (turtle.y - camY);
    if (freeK >= 1 && towCool <= 0 && Math.hypot(ddx, ddy) < turtle.r * TURTLE.bumpR) { tow = { t: 0 }; sfx('wheee'); }
  }
  // Catto can't go through the trench floor; he bumps it and bounces up a little
  floorBounce.cool = Math.max(0, floorBounce.cool - dt);
  if (floorBounce.t > 0) { floorBounce.t -= dt; F.y += floorBounce.vy * dt; floorBounce.vy *= Math.pow(.02, dt); }
  const floorLim = G.floorY - camY - h * .42;
  if (freeK > 0 && F.y > floorLim) {
    F.y = floorLim;
    if (floorBounce.cool <= 0) {
      floorBounce = { vy: SWIM.floorBounceV, t: SWIM.floorBounceT, cool: SWIM.floorCool };
      for (let i = 0; i < 8; i++) addBubble({ x: F.x + camX + (Math.random() - .5) * s * .6, y: floorLim + camY + h * .4, r: 1.5 + Math.random() * 3, vy: .6 + Math.random() * .8, ph: Math.random() * 6 });
    }
  }
  const cx = lerp(sx, F.x, freeK), cy = lerp(sy2, F.y, freeK);
  const vx = prevFinal ? (cx - prevFinal.x) / Math.max(dt, .001) : 0;
  prevFinal = { x: cx, y: cy };
  if (tow) cat.facing = -1;
  else if (freeK > .5) { if (vx < -SWIM.flipSpeed) cat.facing = -1; else if (vx > SWIM.flipSpeed) cat.facing = 1; } else cat.facing = 1;
  rot += freeK * clamp(vx * SWIM.tiltPerPx, -SWIM.maxTilt, SWIM.maxTilt) * (tow ? .3 : 1);

  cat.x = cx; cat.y = cy; cat.rot = rot;
  out.rot = rot; out.sy = sy;
  out.ht = eio(seg(us, U.HELMET_A, U.HELMET_B));
  out.sitting = us < U.JUMP_A;
}

export function applyCattoDom() {
  const { s, h } = world.G;
  catEl.style.transform = `translate(${cat.x - s / 2}px,${cat.y - h / 2}px) rotate(${out.rot}deg) scale(${cat.facing},${out.sy})`;
  catEl.classList.toggle('swimming', cat.under);
  catEl.classList.toggle('shocked', cat.bang > 0);
  catEl.classList.toggle('happy', cat.happy > 0);
  showPose();
  const ht = out.ht;
  helmet.setAttribute('transform', `translate(${lerp(-140, 0, ht)} ${lerp(70, 0, ht) - Math.sin(Math.PI * ht) * 110}) rotate(${lerp(-25, 0, ht)} 110 80)`);
  cat.wx = cat.x + world.camX; cat.wy = cat.y + world.camY;
}

/** Lamp on top of the helmet: opacity + screen position (SVG offset rotated with Catto). */
export function placeLamp() {
  const { s, h } = world.G;
  lampEl.setAttribute('opacity', light.lampK.toFixed(2));
  const ox = (110 - 100) / 200 * s * cat.facing, oy = (40 - 110) / 220 * h, a = cat.rot * Math.PI / 180;
  light.lamp.x = cat.x + ox * Math.cos(a) - oy * Math.sin(a); light.lamp.y = cat.y + ox * Math.sin(a) + oy * Math.cos(a); light.lamp.dir = cat.facing;
}

/** "!" after a scare and "wheee!" on the turtle, drawn on the front canvas. */
export function drawCattoCallouts(fx: CanvasRenderingContext2D) {
  const { s, h } = world.G;
  if (cat.bang > .3) {
    fx.font = '600 26px Fredoka, ui-rounded, sans-serif'; fx.textAlign = 'center';
    fx.fillStyle = 'rgba(255,246,234,.95)'; fx.fillText('!', cat.x + s * .35, cat.y - h * .6);
  }
  if (cat.say.t > 0) drawSpeech(fx);
  if (tow) {
    fx.font = '600 18px Fredoka, ui-rounded, sans-serif'; fx.textAlign = 'center';
    fx.fillStyle = 'rgba(255,246,234,.95)'; fx.fillText('wheee!', cat.x, cat.y - h * .62);
  }
}

/** How long the speech bubble takes to pop in / fade out, s. */
const SAY_IN = .18, SAY_OUT = .35;

/** Speech bubble above Catto (text and timer live in cat.say). */
function drawSpeech(fx: CanvasRenderingContext2D) {
  const { W, G } = world, { text, t, total } = cat.say;
  fx.save();
  fx.font = '600 18px Fredoka, ui-rounded, sans-serif'; fx.textAlign = 'center'; fx.textBaseline = 'middle';
  // wrap to a comfortable width
  const maxW = Math.min(250, W - 60), words = text.split(' '), lines: string[] = [];
  let line = '';
  for (const w of words) { const next = line ? line + ' ' + w : w; if (line && fx.measureText(next).width > maxW) { lines.push(line); line = w; } else line = next; }
  lines.push(line);
  const lh = 24, bw = Math.max(...lines.map(l => fx.measureText(l).width)) + 34, bh = lines.length * lh + 22;
  // sits beside Catto, on whichever side has more room, and stays clear of the end card
  const side = cat.x < W / 2 ? 1 : -1;
  const card = document.getElementById('card2')!, cardBottom = +card.style.opacity > .05 ? card.getBoundingClientRect().bottom + 12 : 10;
  const cx = clamp(cat.x + side * (G.s * .5 + bw / 2 + 8), bw / 2 + 12, W - bw / 2 - 12);
  const cy = clamp(cat.y - G.h * .22, cardBottom + bh / 2, world.H - bh / 2 - 12);
  const k = eout(Math.min(1, (total - t) / SAY_IN));
  fx.globalAlpha = Math.min(1, t / SAY_OUT);
  fx.translate(cx, cy + (1 - k) * 10); fx.scale(.7 + .3 * k, .7 + .3 * k);
  fx.shadowColor = 'rgba(0,0,0,.25)'; fx.shadowBlur = 14; fx.shadowOffsetY = 3;
  fx.fillStyle = '#fffaf0'; fx.beginPath(); fx.roundRect(-bw / 2, -bh / 2, bw, bh, 18); fx.fill();
  fx.shadowColor = 'transparent';
  const ty = clamp(cat.y - G.h * .22 - cy, -bh / 2 + 16, bh / 2 - 16);   // tail points sideways at Catto's head
  fx.beginPath(); fx.moveTo(-side * (bw / 2 - 2), ty - 10); fx.lineTo(-side * (bw / 2 - 2), ty + 10); fx.lineTo(-side * (bw / 2 + 14), ty + 3); fx.closePath(); fx.fill();
  fx.fillStyle = '#1d3550';
  lines.forEach((l, i) => fx.fillText(l, 0, (i - (lines.length - 1) / 2) * lh + 1));
  fx.restore();
}
