// ─────────────────────────────────────────────────────────────────────────────
//  THE TIMELINE — every scroll-driven number lives here.
//
//  All timing uses u = scrollY / viewportHeight ("screens scrolled").
//  World geometry is in CSS pixels; H = viewport height, W = viewport width.
// ─────────────────────────────────────────────────────────────────────────────
import { clamp, ein, seg } from './math';

/** Key moments, in screens scrolled. */
export const U = {
  HELMET_A: .18,  // Catto starts lifting the helmet off the deck
  HELMET_B: .78,  // …and it has landed on his head
  CROUCH_A: .84,  // crouch (squash to CROUCH_SQUASH) runs from here to JUMP_A
  JUMP_A: 1.32,   // take-off
  SPLASH: 2.4,    // hits the water
  CAM_A: 2.04,    // camera starts panning right + down
  SETTLE: 4.32,   // camera pan done; Catto settled mid-screen
  FREE_A: 4.32,   // hand-over to free swim starts…
  FREE_B: 4.8,    // …and is complete
  DESC_A: 5.2,    // steady descent starts
  END: 0,         // computed below: where the descent reaches the trench floor
};

/** Screens of depth per screen scrolled during the descent. */
export const DESC_RATE = .8;

/** Descent length of each scene, in screens. */
export const REEF_LEN = 4.6, TWI_LEN = 5, MID_LEN = 4.5, ABY_LEN = 4;
export const DESC_LEN = REEF_LEN + TWI_LEN + MID_LEN + ABY_LEN;
U.END = U.DESC_A + DESC_LEN / DESC_RATE;

/** Extra scroll after the end, in screens (page height = END + this). */
export const END_PAD = 2.2;

/** Max depth readout (Challenger Deep), metres. */
export const MAX_DEPTH = 10935;

/** Jump and path shaping. */
export const PATH = {
  CROUCH_SQUASH: .12,   // squash amount during the crouch (1 → .88)
  JUMP_ARC: .19,        // jump apex height, × H
  JUMP_ROT: 115,        // degrees of rotation by splash-down (head-first)
  SETTLE_ROT: -6,       // final resting tilt underwater, degrees
  RIGHT_ROT_U: 3.3,     // u at which he has finished righting himself
  BOB_IN: [.12, .6],    // underwater bob fades in over SPLASH + these u
};

/** UI fades, in u. */
export const UI_FADE = {
  title: [.36, .84],      // fades out
  hint: [.12, .42],       // fades out
  meter: [2.52, 3],       // fades in
  card1In: [4.5, 4.9],    // "Ooh, fishies." in…
  card1Out: [5.5, 5.9],   // …and out
};

/** Ride back up (end-card button). */
export const ASCEND_MS = 4200;

// ─── World geometry ──────────────────────────────────────────────────────────

export interface Geometry {
  WL: number; camEnd: number; pierEnd: number; deckY: number; s: number; h: number; sitX: number; jumpDX: number;
  camXEnd: number; ox: number; R0: number; reefLen: number; T0: number; D1: number;
  mantaY: number; sharkY: number; squidY: number; M0: number; anglerY: number; dumboY: number; A0: number;
  floorY: number; chestX: number; aY: number; tangY: number; turtY: number; jellyY: number; wallMax: number; anX: number;
}

/** Lays out the world for a W × H viewport. Landmarks per SPEC §2. */
export function computeGeometry(W: number, H: number, mob: boolean): Geometry {
  const G = {} as Geometry;
  G.WL = H * .66;                                // waterline
  G.camEnd = G.WL + H * .25;                     // camY once the pan has finished
  G.pierEnd = W * (mob ? .55 : .42);
  G.deckY = G.WL - H * .075;
  G.s = clamp(Math.min(W, H) * .24, 110, 210);   // cat size (width), px
  G.h = G.s * 1.1;                               // cat height
  G.sitX = G.pierEnd - G.s * .42;
  G.jumpDX = W * (mob ? .34 : .3);               // jump arcs out to the right
  G.camXEnd = G.pierEnd + 40;                    // pan right until the pier is off screen
  G.ox = G.camXEnd;                              // world x of the left screen edge after the pan
  G.R0 = G.WL + H * 1.2;                         // top of the reef
  G.reefLen = H * 4.2;
  G.T0 = G.camEnd + H * REEF_LEN + H * .5;       // world y at 200 m
  G.D1 = (G.T0 - G.WL) / H;
  G.mantaY = G.T0 + H * 1.2; G.sharkY = G.T0 + H * 2.5; G.squidY = G.T0 + H * 3.7;
  G.M0 = G.T0 + H * TWI_LEN;                     // world y at 1,000 m
  G.anglerY = G.M0 + H * 1.4; G.dumboY = G.M0 + H * 3;
  G.A0 = G.M0 + H * MID_LEN;                     // world y at 4,000 m
  G.floorY = G.A0 + H * ABY_LEN + H * .3;        // trench floor
  G.chestX = G.ox + W * .62;
  G.aY = G.R0 + H * .45; G.tangY = G.R0 + H * 1.4; G.turtY = G.R0 + H * 2.35; G.jellyY = G.R0 + H * 3.5;
  G.wallMax = W * (mob ? .13 : .17);             // how far reef walls reach in from each side
  G.anX = G.ox + W * (mob ? .3 : .27);           // anemone x
  return G;
}

// ─── Darkness curves ─────────────────────────────────────────────────────────

/** Dark overlay over the sea (back canvas; front gets ×.45). Driven by camY. */
export const darkAt = (camY: number, G: Geometry, H: number) =>
  .08 * seg(camY, G.WL * .2, G.camEnd) + .42 * ein(seg(camY, G.camEnd, G.camEnd + H * REEF_LEN));

/** Helmet lamp strength 0→1, driven by the world y of the screen centre. */
export const lampAt = (centreY: number, G: Geometry, H: number) => seg(centreY, G.T0 - H * .1, G.T0 + H * .3);

/** Night layer opacity: ~.38 early twilight, ~.92 by the shark, ~.97 in the midnight zone. */
export const nightAt = (centreY: number, G: Geometry, H: number) =>
  .38 * seg(centreY, G.T0 + H * .05, G.T0 + H * .8) + .54 * seg(centreY, G.T0 + H * 1.7, G.T0 + H * 2.6) + .05 * seg(centreY, G.M0, G.M0 + H);
