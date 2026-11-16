# Catxplorer

Scroll-driven ocean dive: Catto the scuba kitten goes from the pier to the Challenger Deep.
See `SPEC.md` for the design, `HIGGSFIELD_PROMPTS.md` for the art list.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build in dist/
npm run compare    # screenshots prototype vs build side by side → compare-out/1280x800/index.html
npm run art        # turn the paintings in assets/ into web-ready files (dev does this by itself)
npm run audio      # copy the recordings in assets/audio/ into public/audio/ (dev does this too)
```

## Swapping in painted art

1. Save a painting into `assets/` using the filename from `HIGGSFIELD_PROMPTS.md`.
2. With `npm run dev` running, it is picked up within a second or two and the page reloads.
   (Otherwise run `npm run art`.) A web-ready copy is written to `public/art/`: flat background
   cut away if the picture has no transparency, shrunk to 1024 px, saved as WebP. The original is
   never changed.
3. If it sits in the wrong place or at the wrong size, change its `anchor` / `scale` in
   `assets/manifest.json` and save. The notes at the top of that file explain the numbers.

Anything without a painting keeps its code-drawn version, so pieces can be swapped one at a time.
Delete a painting from `assets/` and that piece goes back to code-drawn. Add `?art=off` to the URL
to see everything code-drawn. Commit `public/art/` (the originals in `assets/` are git-ignored
because of their size).

## Sound

Sound is off until the listener presses the speaker button (top right). Every sound has a
code-made stand-in in `src/audio/synth.ts`, so the dive has sound with no files at all. To replace
one with a recording, save a file named after it into `assets/audio/` (the names are listed in
`assets/audio/README.md`); missing or broken files are skipped silently. Levels, the depth
muffling and how often bubbles and rumbles happen are in the `AUDIO` block at the top of
`src/audio/audio.ts`. Commit `public/audio/`.

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
