// Code-made stand-in sounds (Web Audio). Each one is used until a recording with the same name
// is dropped into assets/audio/, exactly like the code-drawn stand-ins for the paintings.
//
// Every recipe takes (ctx, out, t, vol): the audio context, the node to play into, the start
// time and a volume multiplier. They only use BaseAudioContext, so they can also be rendered
// offline (scripts use that to check each one actually makes sound).
type Ctx = BaseAudioContext;
export type Recipe = (ctx: Ctx, out: AudioNode, t: number, vol: number) => void;

const noiseCache = new WeakMap<Ctx, Record<string, AudioBuffer>>();

/** A few seconds of white or brown (deep, rumbly) noise, made once per context. */
export function noise(ctx: Ctx, kind: 'white' | 'brown' = 'white') {
  let c = noiseCache.get(ctx); if (!c) noiseCache.set(ctx, c = {});
  if (c[kind]) return c[kind];
  const len = Math.floor(ctx.sampleRate * 4), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'white') d[i] = w; else { last = (last + .02 * w) / 1.02; d[i] = last * 3.5; }
  }
  if (kind === 'brown') { const f = Math.floor(ctx.sampleRate * .05); for (let i = 0; i < f; i++) { const k = i / f; d[i] = d[i] * k + d[len - f + i] * (1 - k); } }   // smooth the loop point
  return (c[kind] = buf);
}

/** Gain node with a quick attack and a smooth fall to silence. */
function env(ctx: Ctx, out: AudioNode, t: number, peak: number, attack: number, decay: number) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  g.connect(out); return g;
}

function tone(ctx: Ctx, out: AudioNode, t: number, type: OscillatorType, f0: number, f1: number, dur: number, peak: number, attack = .01) {
  const o = ctx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  o.connect(env(ctx, out, t, peak, attack, dur)); o.start(t); o.stop(t + dur + attack + .05);
  return o;
}

function hiss(ctx: Ctx, out: AudioNode, t: number, type: BiquadFilterType, f0: number, f1: number, q: number, dur: number, peak: number, attack = .01) {
  const s = ctx.createBufferSource(); s.buffer = noise(ctx); s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  s.connect(f); f.connect(env(ctx, out, t, peak, attack, dur)); s.start(t, Math.random() * 3); s.stop(t + dur + attack + .05);
  return f;
}

export const RECIPES: Record<string, Recipe> = {
  /** Catto hits the water: one big "PSSSHT". A hard, full burst of spray that darkens as it falls, with the weight of the water under it. */
  splash(ctx, out, t, v) {
    // the hit: everything at once, then the brightness drops away fast (that fall is what reads as water, not a sizzle)
    const hit = hiss(ctx, out, t, 'lowpass', 11000, 900, .3, .6, .62 * v, .003);
    hit.frequency.setValueAtTime(11000, t); hit.frequency.exponentialRampToValueAtTime(3200, t + .12); hit.frequency.exponentialRampToValueAtTime(700, t + .65);
    hiss(ctx, out, t, 'lowpass', 300, 80, .7, .32, 1.5 * v, .004);                 // the "whump" of water being shoved aside (noise, so no drum note)
    hiss(ctx, out, t + .05, 'bandpass', 1400, 450, .6, .8, .2 * v, .1);            // water closing back over him
    for (let i = 0; i < 5; i++) {                                                  // a few bubbles after
      const tt = t + .3 + Math.random() * .6, f = 300 + Math.random() * 500;
      tone(ctx, out, tt, 'sine', f, f * 2, .06, .05 * v, .004);
    }
  },
  /** One small bubble pop: a quick rising blip. */
  bubble(ctx, out, t, v) {
    const f = 380 + Math.random() * 520;
    tone(ctx, out, t, 'sine', f, f * 2.1, .07, .12 * v, .004);
  },
  /** Bouncing off a jellyfish: a soft, rubbery "boing". */
  boop(ctx, out, t, v) {
    const o = tone(ctx, out, t, 'sine', 300, 150, .45, .4 * v, .008);
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 13; lg.gain.setValueAtTime(70, t); lg.gain.exponentialRampToValueAtTime(1, t + .45);
    lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + .55);
    tone(ctx, out, t, 'triangle', 620, 300, .12, .12 * v, .004);
  },
  /** Hitching a ride on the turtle: a happy rising whistle with a wobble. */
  wheee(ctx, out, t, v) {
    const o = ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(1150, t + .35); o.frequency.exponentialRampToValueAtTime(880, t + .8);
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 7; lg.gain.value = 22; lfo.connect(lg); lg.connect(o.frequency);
    o.connect(env(ctx, out, t, .22 * v, .05, .8)); o.start(t); lfo.start(t); o.stop(t + .95); lfo.stop(t + .95);
  },
  /** The sardine shoal wrapping round Catto: a soft rush of water. */
  whoosh(ctx, out, t, v) {
    const f = hiss(ctx, out, t, 'bandpass', 300, 600, 1.1, 1.0, .4 * v, .3);
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(1500, t + .4); f.frequency.exponentialRampToValueAtTime(450, t + 1.2);
  },
  /** Anglerfish jaws: a sharp clack and a low thud. */
  snap(ctx, out, t, v) {
    hiss(ctx, out, t, 'highpass', 2200, 1800, .5, .06, .6 * v, .002);
    tone(ctx, out, t, 'square', 180, 60, .09, .3 * v, .002);
    tone(ctx, out, t + .01, 'sine', 95, 40, .25, .55 * v, .004);
  },
  /** Squid ink: a swirling, gurgling flush of water that drains away. */
  ink(ctx, out, t, v) {
    const dur = 1.5;
    const src = ctx.createBufferSource(); src.buffer = noise(ctx); src.loop = true;
    const swirl = ctx.createBiquadFilter(); swirl.type = 'bandpass'; swirl.Q.value = 1.6;
    swirl.frequency.setValueAtTime(380, t); swirl.frequency.exponentialRampToValueAtTime(1500, t + .28); swirl.frequency.exponentialRampToValueAtTime(700, t + .8); swirl.frequency.exponentialRampToValueAtTime(190, t + dur);
    const gurgle = ctx.createGain(); gurgle.gain.value = .6;                      // the wobble that makes it sound like draining water
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.type = 'sine';
    lfo.frequency.setValueAtTime(7, t); lfo.frequency.linearRampToValueAtTime(15, t + dur); lg.gain.value = .4; lfo.connect(lg); lg.connect(gurgle.gain);
    src.connect(swirl); swirl.connect(gurgle); gurgle.connect(env(ctx, out, t, 2.2 * v, .09, dur));
    src.start(t, Math.random() * 2); src.stop(t + dur + .2); lfo.start(t); lfo.stop(t + dur + .2);
    hiss(ctx, out, t, 'lowpass', 420, 110, .7, dur * .9, .9 * v, .12);              // the rush underneath
    hiss(ctx, out, t, 'highpass', 3000, 2200, .4, .3, .2 * v, .01);                 // the first spurt
    for (let i = 0; i < 10; i++) {                                                 // glugs as it drains
      const tt = t + .35 + Math.random() * 1.0, f = 150 + Math.random() * 260;
      tone(ctx, out, tt, 'sine', f, f * 1.9, .07, .16 * v, .006);
    }
  },
  /** The shark going by: a slow, low swell. */
  shark(ctx, out, t, v) {
    for (const [f, a] of [[52, .5], [78, .28], [104, .12]]) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * .9, t + 2.6);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(a * v, t + 1.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 3);
    }
    hiss(ctx, out, t, 'lowpass', 160, 90, .5, 2.4, .25 * v, .9);
  },
  /** The chest opening: a little rising chime. */
  chest(ctx, out, t, v) {
    [1046.5, 1318.5, 1568, 2093].forEach((f, i) => {
      tone(ctx, out, t + i * .09, 'sine', f, f, 1.1, .2 * v, .006);
      tone(ctx, out, t + i * .09, 'sine', f * 2.01, f * 2.01, .5, .05 * v, .006);
    });
  },
  /** A payout of coins, casino-style: lots of bright, ringing clinks tumbling over each other. */
  coins(ctx, out, t, v) {
    for (let i = 0; i < 16; i++) {
      const tt = t + i * .05 + Math.random() * .035, f = 3300 + Math.random() * 2400, ring = .16 + Math.random() * .16, a = (.16 + Math.random() * .08) * v;
      tone(ctx, out, tt, 'sine', f, f * .995, ring, a, .001);                       // the ring of the coin…
      tone(ctx, out, tt, 'sine', f * 1.47, f * 1.465, ring * .8, a * .55, .001);    // …and its brighter overtones
      tone(ctx, out, tt, 'sine', f * 2.09, f * 2.08, ring * .5, a * .3, .001);
      hiss(ctx, out, tt, 'highpass', 6000, 5000, .5, .018, a * .9, .001);           // the click as it lands
    }
  },
  /** The ride back up: a long rising rush. */
  ascend(ctx, out, t, v) {
    const f = hiss(ctx, out, t, 'bandpass', 200, 3200, 1.2, 3.6, .32 * v, .6); void f;
    tone(ctx, out, t, 'sine', 140, 720, 3.6, .1 * v, .5);
  },
  /** Catto, delighted: a short "meow" (pitch up then down through a vowel-like filter). */
  meow(ctx, out, t, v) {
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(820, t + .16); o.frequency.exponentialRampToValueAtTime(430, t + .55);
    const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 5;
    f1.frequency.setValueAtTime(900, t); f1.frequency.linearRampToValueAtTime(1900, t + .18); f1.frequency.linearRampToValueAtTime(800, t + .55);
    const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.value = 6; f2.frequency.value = 2900;
    const mix = ctx.createGain(); mix.gain.value = 1;
    o.connect(f1); o.connect(f2); f1.connect(mix); const g2 = ctx.createGain(); g2.gain.value = .35; f2.connect(g2); g2.connect(mix);
    mix.connect(env(ctx, out, t, .5 * v, .05, .55)); o.start(t); o.stop(t + .7);
  },
  /** A soft, distant rumble in the deep. */
  rumble(ctx, out, t, v) {
    const f = 34 + Math.random() * 22;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * .8, t + 3);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.35 * v, t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.4);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 3.6);
  },
};

/** Stand-in for the above-water loop: slow waves of soft noise with a little foam on top. Returns a stop function. */
export function surfaceLoop(ctx: Ctx, out: AudioNode) {
  const src = ctx.createBufferSource(); src.buffer = noise(ctx); src.loop = true;
  const body = ctx.createBiquadFilter(); body.type = 'lowpass'; body.frequency.value = 650;
  const bodyG = ctx.createGain(); bodyG.gain.value = .55;
  const foam = ctx.createBiquadFilter(); foam.type = 'bandpass'; foam.frequency.value = 2600; foam.Q.value = .6;
  const foamG = ctx.createGain(); foamG.gain.value = .1;
  const swell = (rate: number, depth: number, target: AudioParam) => { const l = ctx.createOscillator(), g = ctx.createGain(); l.frequency.value = rate; g.gain.value = depth; l.connect(g); g.connect(target); l.start(); return l; };
  const l1 = swell(.11, .32, bodyG.gain), l2 = swell(.17, .07, foamG.gain);
  src.connect(body); body.connect(bodyG); bodyG.connect(out); src.connect(foam); foam.connect(foamG); foamG.connect(out); src.start();
  return () => { for (const n of [src, l1, l2]) try { n.stop(); } catch { /* already stopped */ } };
}

/** Stand-in for the underwater loop: deep steady noise (the engine's low-pass does the muffling). */
export function deepLoop(ctx: Ctx, out: AudioNode) {
  const src = ctx.createBufferSource(); src.buffer = noise(ctx, 'brown'); src.loop = true;
  const g = ctx.createGain(); g.gain.value = 1.1;
  src.connect(g); g.connect(out); src.start();
  return () => { try { src.stop(); } catch { /* already stopped */ } };
}
