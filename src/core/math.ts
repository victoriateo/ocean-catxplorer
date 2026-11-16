// Small maths helpers shared by everything. Copied verbatim from the prototype.

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0→1 progress of p between a and b, clamped. */
export const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
/** ease-in-out (cubic) */
export const eio = (t: number) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** ease-out (cubic) */
export const eout = (t: number) => 1 - Math.pow(1 - t, 3);
/** ease-in (quadratic) */
export const ein = (t: number) => t * t;
export const angLerp = (a: number, b: number, t: number) => {
  const d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + d * t;
};
/** Mix two #rrggbb colours → "rgb(r,g,b)". */
export const mix = (a: string, b: string, k: number) => {
  const p = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], k))).join(',')})`;
};
export const mod = (a: number, n: number) => ((a % n) + n) % n;
/** Seeded PRNG (used for the reef layout and treasure garden so they look the same every load). */
export function mulberry(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export type Rnd = () => number;
