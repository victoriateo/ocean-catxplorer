// Sound (SPEC §6). Off until the listener turns it on with the corner toggle; nothing is
// created or downloaded before that, which also satisfies the browsers' no-autoplay rule.
//
//   • Ambient: one loop above water, one underwater. The underwater one runs through a low-pass
//     filter whose cutoff falls with depth (bright → muffled → near silence with soft rumbles).
//   • Effects: sfx('splash'), sfx('boop'), … called by the actors. They are no-ops while muted.
//   • Recordings: any file in assets/audio/ named after a sound (splash.mp3, boop.wav, …) replaces
//     the code-made stand-in for it. Missing or broken files are skipped silently.
import { clamp, lerp } from '../core/math';
import { RECIPES, surfaceLoop, deepLoop } from './synth';

export const AUDIO = {
  master: .8,
  surface: .32,          // above-water loop level
  deep: .38,             // underwater loop level just below the surface…
  deepFloor: .12,        // …and at the bottom of the trench (× the level above)
  cutoffTop: 1500,       // underwater low-pass cutoff near the surface, Hz…
  cutoffDeep: 110,       // …and by `cutoffDepth` metres
  cutoffDepth: 4000,
  sfx: .9,
  sfxMuffleTop: 3400,    // effects are muffled underwater too: cutoff near the surface, Hz…
  sfxMuffleDeep: 1100,   // …and in the deep
  bubbleRate: .55,       // quiet random bubble pops per second while underwater
  rumbleFrom: 900,       // soft rumbles start below this depth, m
  rumbleEvery: [7, 15],  // seconds between them
  fade: .35,             // seconds for level changes
  /** Use the code-made sounds when there is no recording. Set false for silence instead. */
  synthFallback: true,
};

/** Per-sound level and the shortest gap between two plays, s. Names are also the file names. */
const SOUNDS: Record<string, { vol: number; gap: number }> = {
  splash: { vol: 1, gap: .4 }, bubble: { vol: .6, gap: .05 }, boop: { vol: .9, gap: .2 }, wheee: { vol: .8, gap: 1 },
  whoosh: { vol: .8, gap: 1 }, snap: { vol: 1, gap: .3 }, ink: { vol: .9, gap: .2 }, shark: { vol: .7, gap: 5 },
  chest: { vol: .9, gap: .5 }, coins: { vol: 1, gap: .55 }, ascend: { vol: .9, gap: 2 }, meow: { vol: .8, gap: .5 },
  rumble: { vol: .8, gap: 2 },
};
const LOOPS = ['ambient-surface', 'ambient-deep'];

let ctx: AudioContext | null = null;
let master: GainNode, sfxBus: BiquadFilterNode, surfGain: GainNode, deepGain: GainNode, deepLP: BiquadFilterNode;
let enabled = false, filesRequested = false;
const buffers = new Map<string, AudioBuffer>();
const lastPlayed = new Map<string, number>();
const stopLoop: Record<string, (() => void) | undefined> = {};
let rumbleIn = 5;

export const isSoundOn = () => enabled;
export const soundSupported = () => typeof AudioContext !== 'undefined' || 'webkitAudioContext' in window;

function build() {
  const AC: typeof AudioContext = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  sfxBus = ctx.createBiquadFilter(); sfxBus.type = 'lowpass'; sfxBus.frequency.value = 18000;
  const sfxG = ctx.createGain(); sfxG.gain.value = AUDIO.sfx; sfxBus.connect(sfxG); sfxG.connect(master);
  surfGain = ctx.createGain(); surfGain.gain.value = 0; surfGain.connect(master);
  deepLP = ctx.createBiquadFilter(); deepLP.type = 'lowpass'; deepLP.frequency.value = AUDIO.cutoffTop; deepLP.Q.value = .4;
  deepGain = ctx.createGain(); deepGain.gain.value = 0; deepLP.connect(deepGain); deepGain.connect(master);
  if (AUDIO.synthFallback) { stopLoop['ambient-surface'] = surfaceLoop(ctx, surfGain); stopLoop['ambient-deep'] = deepLoop(ctx, deepLP); }
}

/** Swaps a code-made loop for a recorded one once it has loaded. */
function useRecordedLoop(name: string) {
  if (!ctx) return;
  const buf = buffers.get(name); if (!buf) return;
  stopLoop[name]?.();
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  src.connect(name === 'ambient-surface' ? surfGain : deepLP); src.start();
  stopLoop[name] = () => { try { src.stop(); } catch { /* already stopped */ } };
}

/** Fetches whatever recordings exist. Anything missing or unreadable is simply left as the stand-in. */
async function loadFiles() {
  if (filesRequested || !ctx) return; filesRequested = true;
  const base = import.meta.env.BASE_URL + 'audio/';
  let index: Record<string, string> = {};
  try { const r = await fetch(base + 'index.json'); if (r.ok) index = await r.json(); } catch { return; }
  await Promise.all(Object.entries(index).map(async ([name, file]) => {
    if (!(name in SOUNDS) && !LOOPS.includes(name)) return;
    try {
      const r = await fetch(base + file); if (!r.ok) return;
      const buf = await ctx!.decodeAudioData(await r.arrayBuffer());
      buffers.set(name, buf);
      if (LOOPS.includes(name)) useRecordedLoop(name);
    } catch { /* fail silently */ }
  }));
}

/** Turn sound on or off. Must be called from a click / tap / key press the first time. */
export async function setSound(on: boolean) {
  if (on && !soundSupported()) return false;
  enabled = on;
  try {
    if (on) {
      if (!ctx) build();
      await ctx!.resume();
      master.gain.setTargetAtTime(AUDIO.master, ctx!.currentTime, AUDIO.fade / 3);
      void loadFiles();
    } else if (ctx) {
      master.gain.setTargetAtTime(0, ctx.currentTime, AUDIO.fade / 3);
      const c = ctx; setTimeout(() => { if (!enabled) void c.suspend(); }, AUDIO.fade * 1000 + 150);
    }
  } catch { enabled = false; }
  window.dispatchEvent(new Event('soundchange'));   // lets the toggle button redraw, whoever changed it
  return enabled;
}

/** Play a one-shot effect. Safe to call any time; does nothing while muted. */
export function sfx(name: string, vol = 1) {
  if (!enabled || !ctx || ctx.state !== 'running') return;
  const def = SOUNDS[name]; if (!def) return;
  const now = ctx.currentTime; if (now - (lastPlayed.get(name) ?? -9) < def.gap) return;
  lastPlayed.set(name, now);
  const v = def.vol * vol, buf = buffers.get(name);
  try {
    if (buf) { const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf; g.gain.value = v; s.connect(g); g.connect(sfxBus); s.start(); }
    else if (AUDIO.synthFallback) RECIPES[name]?.(ctx, sfxBus, now + .005, v);
  } catch { /* a sound failing must never break the dive */ }
}

/** Names of every one-shot sound (for the sound board). */
export const soundNames = () => Object.keys(SOUNDS);

/** Sound board only: pretend to be at this depth in metres (−1 = above water, null = follow the dive). */
export const audition = { depth: null as number | null };

/** Called every frame: sets the ambient mix and muffling from where Catto is. */
export function updateAudio(dt: number, under: boolean, depth: number) {
  if (!enabled || !ctx || ctx.state !== 'running') return;
  if (audition.depth !== null) { under = audition.depth >= 0; depth = Math.max(0, audition.depth); }
  const now = ctx.currentTime, tc = AUDIO.fade;
  const k = clamp(depth / AUDIO.cutoffDepth);
  surfGain.gain.setTargetAtTime(under ? 0 : AUDIO.surface, now, tc);
  deepGain.gain.setTargetAtTime(under ? AUDIO.deep * lerp(1, AUDIO.deepFloor, clamp(depth / 9000)) : 0, now, tc);
  deepLP.frequency.setTargetAtTime(AUDIO.cutoffTop * Math.pow(AUDIO.cutoffDeep / AUDIO.cutoffTop, Math.sqrt(k)), now, tc);
  sfxBus.frequency.setTargetAtTime(under ? lerp(AUDIO.sfxMuffleTop, AUDIO.sfxMuffleDeep, clamp(depth / 3000)) : 18000, now, tc / 2);
  if (!under) return;
  if (Math.random() < AUDIO.bubbleRate * dt) sfx('bubble', .5 + Math.random() * .5);
  if (depth > AUDIO.rumbleFrom) { rumbleIn -= dt; if (rumbleIn <= 0) { rumbleIn = lerp(AUDIO.rumbleEvery[0], AUDIO.rumbleEvery[1], Math.random()); sfx('rumble', .6 + Math.random() * .4); } }
}

// Don't keep making noise in a background tab.
document.addEventListener('visibilitychange', () => {
  if (!ctx || !enabled) return;
  if (document.hidden) void ctx.suspend(); else void ctx.resume();
});
