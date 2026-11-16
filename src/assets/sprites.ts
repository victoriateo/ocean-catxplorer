// Painted art. Every piece is optional: actors call drawSprite() first and fall back to their
// code-drawn stand-in when it returns false (image missing, still loading, or ?art=off).
//
//   assets/manifest.json   name → file, anchor, scale (see the notes at the top of that file)
//   public/art/*.webp      web-ready copies made from assets/ by `npm run art`
//   public/art/index.json  which of them exist, so we never request a missing file
import manifest from '../../assets/manifest.json';
import { world } from '../core/state';

export interface SpriteDef {
  /** Filename in assets/ without the extension. */
  file: string;
  /** Point in the image pinned to the actor's position, as fractions [across, down]. */
  anchor: number[];
  /** Drawn width as a multiple of the cat size (unless the caller passes another unit). */
  scale: number;
  /** Degrees clockwise. */
  rotate?: number;
  /** Extra named points, same units as anchor. */
  points?: Record<string, number[]>;
  note?: string;
}

const defs = manifest.sprites as Record<string, SpriteDef>;
const images = new Map<string, HTMLImageElement>();
const listeners: ((name: string) => void)[] = [];

/** `?art=off` forces the code-drawn version of everything (used by `npm run compare`). */
export const artOff = new URLSearchParams(location.search).get('art') === 'off';

/** Called once per image as it finishes loading. */
export function onArtLoaded(fn: (name: string) => void) { listeners.push(fn); }

/** Resolves once every available image has loaded (or failed); immediately if there is no art. */
export async function loadArt() {
  if (artOff) return;
  const base = import.meta.env.BASE_URL + 'art/';
  let have: string[] = [];
  try { const r = await fetch(base + 'index.json'); if (r.ok) have = await r.json(); } catch { /* no art yet */ }
  await Promise.all(Object.entries(defs).filter(([, def]) => have.includes(def.file)).map(([name, def]) => new Promise<void>(done => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { images.set(name, img); for (const fn of listeners) fn(name); done(); };
    img.onerror = () => done();   // stays code-drawn
    img.src = `${base}${def.file}.webp`;
  })));
}

export const sprite = (name: string) => images.get(name) ?? null;
export const spriteDef = (name: string): SpriteDef | undefined => defs[name];

export interface DrawOpts {
  /** What `scale` multiplies, px. Default: the cat size. */
  unit?: number;
  /** Extra size multiplier for this one instance. */
  k?: number;
  /** Radians, on top of the manifest's `rotate`. */
  rot?: number;
  flipX?: boolean; flipY?: boolean;
  /** Stretch (after flipping); used for flapping, squashing, turning round. */
  sx?: number; sy?: number;
  alpha?: number;
}

const widthOf = (def: SpriteDef, o: DrawOpts) => def.scale * (o.unit ?? world.G.s) * (o.k ?? 1);

/** Draws the image with its anchor at (x, y). Returns false if there is no image to draw. */
export function drawSprite(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, o: DrawOpts = {}) {
  const img = images.get(name); if (!img) return false;
  const def = defs[name], w = widthOf(def, o), h = w * img.naturalHeight / img.naturalWidth;
  ctx.save(); ctx.translate(x, y);
  const rot = (o.rot ?? 0) + (def.rotate ?? 0) * Math.PI / 180; if (rot) ctx.rotate(rot);
  ctx.scale((o.flipX ? -1 : 1) * (o.sx ?? 1), (o.flipY ? -1 : 1) * (o.sy ?? 1));
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  ctx.drawImage(img, -def.anchor[0] * w, -def.anchor[1] * h, w, h);
  ctx.restore();
  return true;
}

/** Offset of a named point from the anchor, in px, in the sprite's own (unrotated, unflipped) frame. */
export function spritePoint(name: string, point: string, o: DrawOpts = {}): [number, number] | null {
  const img = images.get(name), def = defs[name], p = def?.points?.[point]; if (!img || !p) return null;
  const w = widthOf(def, o), h = w * img.naturalHeight / img.naturalWidth;
  return [(p[0] - def.anchor[0]) * w, (p[1] - def.anchor[1]) * h];
}
