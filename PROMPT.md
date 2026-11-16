# Prompt for Claude Code

Paste everything below the line into Claude Code, opened in the `catxplorer` folder.

---

You're building **Catxplorer**, an interactive, scroll-driven ocean dive for my design portfolio. A kitten called Catto in a goldfish-bowl diving helmet jumps off a pier and dives to the bottom of the Challenger Deep. The animals at each depth react to him.

**Read these first:**
1. `SPEC.md`: the full spec covering scroll timeline, scenes, interactions, copy, audio, assets and quality bar.
2. `index.html`: a working single-file prototype. **It is the source of truth for how everything should feel**: timing, motion, physics constants, colours and copy. Move it to `reference/prototype.html` and keep it untouched for comparison.
3. `HIGGSFIELD_PROMPTS.md`: the list of painted assets I'll be generating, with filenames.

**What I want:** a proper project that looks and behaves **the same as the prototype**, but is structured so I can keep improving it, swap in painted art one piece at a time, add sound, and put it online.

**Stack:** Vite + TypeScript, Canvas 2D (keep the prototype's two-canvas + SVG approach), no UI framework, no game engine. Fredoka font.

**Suggested structure** (adjust if you have a good reason):
```
src/
  core/      loop.ts, scroll.ts (u + smoothing), camera.ts, input.ts, depth.ts, timeline.ts (all the numbers)
  render/    layers.ts (back/front canvas, DPR), night.ts (darkness + lamp cone + light holes), grain.css
  actors/    catto.ts (SVG + faces), bubbles.ts, splash.ts, fish.ts, clownfish.ts, sardines.ts, turtle.ts,
             jellyfish.ts, manta.ts, shark.ts, squid.ts, angler.ts, dumbo.ts, chest.ts
  scenes/    pier.ts, shallows.ts, reef.ts, twilight.ts, midnight.ts, trench.ts  (landmarks + which actors)
  ui/        meter.ts, factCard.ts, cards.ts, soundToggle.ts
  audio/     audio.ts (Web Audio, depth-based low-pass, SFX)
  assets/    loader.ts + manifest.json (image if present, otherwise the code-drawn stand-in)
```
Keep all tunable numbers in one place (`timeline.ts` and per-actor config), with comments, so I can tweak the feel.

**Work in phases, and commit after each one:**
1. **Parity port.** Rebuild the prototype in the new structure with the same behaviour. Then run the dev server and use Playwright to take screenshots of both `reference/prototype.html` and the new build at u = 0, 1.8, 2.6, 4.6, 6.3, 7.6, 8.9, 10.2, 12.45, 14.1, 15.6, 18.95, 20.95, 24.5 and the end. Compare them side by side and fix any differences. Show me the comparison before moving on.
2. **Asset pipeline.** Load images from `assets/manifest.json`, falling back to the stand-in drawers when an image is missing. Support an anchor point and a scale relative to the cat size. Keep every code-drawn piece listed in SPEC §7 as code.
3. **Audio,** as in SPEC §6: muted by default, a toggle, starts on first interaction, missing files fail silently.
4. **Polish:** mobile (tap to steer, fewer fish), reduced motion, keyboard access, performance (cull off-screen actors, DPR cap), Lighthouse pass.
5. **Deploy** to Vercel (or Netlify) and give me the URL.

**Rules:**
- Don't change the fact-card copy or the creature behaviours without asking me first.
- Don't copy any copyrighted characters. Clownfish and blue tang stay generic species, not Nemo or Dory, and the anglerfish isn't the Finding Nemo one.
- If something in the prototype looks like a bug, flag it to me rather than silently "fixing" the feel.
- At the end of each phase, tell me what changed, what to look at, and anything you weren't sure about.
