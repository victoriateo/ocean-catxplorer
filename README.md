# Catxplorer

Scroll-driven ocean dive: Catto the scuba kitten goes from the pier to the Challenger Deep.
See `SPEC.md` for the design, `HIGGSFIELD_PROMPTS.md` for the art list.

Inspired by Ocean Elevator: https://www.whoi.edu/ocean-elevator/index.html, but wanted to do something more interactive!

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build in dist/
npm run compare    # screenshots prototype vs build side by side → compare-out/1280x800/index.html
npm run art        # turn the paintings in assets/ into web-ready files (dev does this by itself)
npm run audio      # copy the recordings in assets/audio/ into public/audio/ (dev does this too)
```

## Swapping in desired artwork

1. Save desired artwork into `assets/` using the filename from `HIGGSFIELD_PROMPTS.md`. Change the prompt as desired.
2. With `npm run dev` running, it is picked up within a second or two and the page reloads.
   (Otherwise run `npm run art`.) A web-ready copy is written to `public/art/`: flat background
   cut away if the picture has no transparency, shrunk to 1024 px, saved as WebP. The original is
   never changed.
3. If it sits in the wrong place or at the wrong size, change its `anchor` / `scale` in
   `assets/manifest.json` and save. The notes at the top of that file explain the numbers.

## Sound

Sound is off until the listener presses the speaker button (top right). Every sound has a
code-made stand-in in `src/audio/synth.ts`, so the dive has sound with no files at all. To replace
one with a recording, save a file named after it into `assets/audio/` (the names are listed in
`assets/audio/README.md`); missing or broken files are skipped silently. Levels, the depth
muffling and how often bubbles and rumbles happen are in the `AUDIO` block at the top of
`src/audio/audio.ts`. Commit `public/audio/`.

## Phones, reduced motion, keyboard

- **Phones** (narrower than 700 px): fewer fish, sardines, specks and snow; narrower reef walls;
  tick labels hidden; cards full width. Tap to steer. The scene is sized to the phone's large
  viewport, so the address bar sliding in and out never resets it.
- **Reduced motion** (the visitor's device setting): no screen shake, fewer particles, no looping
  decorative animation, and "Swim back up" jumps straight to the pier.
- **Keyboard**: normal scrolling keys work; Tab reaches the sound button and, once it is showing,
  "Swim back up" and the credit link.
- **Performance**: creatures more than about a screen away are not simulated (`CULL_SCREENS` in
  `src/scenes/index.ts`), the darkness layer is painted at half resolution, and DPR is capped at 2.

## Where things live

- `src/core/timeline.ts`: **all the scroll/timing/geometry numbers** (start here to tweak the feel)
- `src/actors/*.ts`: one file per creature; behaviour numbers are in the config object at the top of each
- `src/scenes/`: scenery (pier, sea, reef, snow, trench) and `index.ts`, which sets init/update order
- `src/render/compose.ts`: draw order for the back and front canvases; `night.ts` is the darkness + lamp
- `assets/manifest.json` + `src/assets/sprites.ts`: painted art (which file, where it is pinned, how big)
- `src/audio/`: `audio.ts` (engine, levels, depth muffling), `synth.ts` (the stand-in sounds)
- `src/ui/`: depth meter, fact card (copy lives in `factCard.ts`), title/end cards
- `reference/prototype.html`: the original single-file prototype, kept untouched for comparison

`npm run compare` runs both pages on a fake 60 fps clock with a seeded `Math.random` and the same
scripted scroll, so the pixel diff only shows real differences in the code.
