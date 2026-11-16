# Catxplorer

Scroll-driven ocean dive: Catto the scuba kitten goes from the pier to the Challenger Deep.
See `SPEC.md` for the design, `HIGGSFIELD_PROMPTS.md` for the art list.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build in dist/
npm run compare    # screenshots prototype vs build side by side → compare-out/1280x800/index.html
```

## Where things live

- `src/core/timeline.ts`: **all the scroll/timing/geometry numbers** (start here to tweak the feel)
- `src/actors/*.ts`: one file per creature; behaviour numbers are in the config object at the top of each
- `src/scenes/`: scenery (pier, sea, reef, snow, trench) and `index.ts`, which sets init/update order
- `src/render/compose.ts`: draw order for the back and front canvases; `night.ts` is the darkness + lamp
- `src/ui/`: depth meter, fact card (copy lives in `factCard.ts`), title/end cards
- `reference/prototype.html`: the original single-file prototype, kept untouched for comparison

`npm run compare` runs both pages on a fake 60 fps clock with a seeded `Math.random` and the same
scripted scroll, so the pixel diff only shows real differences in the code.
