# Catxplorer — Spec

A scroll-driven ocean dive for Victoria's portfolio. Catto, an orange tabby kitten in a goldfish-bowl diving helmet, jumps off a pier and dives from the surface to the bottom of the Challenger Deep. Each depth zone has a few animals that **react to Catto**. That's the whole point: the page reads as a little world, not a list of facts.

Inspired by WHOI's *Ocean Elevator*, but character-led. There are fewer stops, each with an interaction.

> **Reference prototype:** `reference/prototype.html` (originally `index.html`). It is the source of truth for **timing, motion, interactions, copy and colour**. Its art is code-drawn stand-ins, which will be replaced by painted assets (see `HIGGSFIELD_PROMPTS.md`). When this spec and the prototype disagree, ask.

---

## 1. Look & feel

- **Style:** children's picture book. Flat rounded shapes with gentle shading, soft gouache / coloured-pencil texture, and a light paper-grain overlay on everything (SVG `feTurbulence`, `mix-blend-mode: overlay`, ~0.22 opacity).
- **Font:** Fredoka (Google Fonts), falling back to `ui-rounded`.
- **UI colours:** ink `#16324a`, cream `#fff6ea`, accent orange `#d9822b`.
- **Water darkens with depth.** Sea colour goes from `#5ec2ca` at the surface, through `#1f8399` and `#0a2f42` by 200 m, to `#04131f` in the twilight zone. On top of that sit a dark overlay, an edge vignette, and (from 200 m) a "night" layer that only the helmet lamp and glowing animals cut through.

### Catto
- Chibi orange tabby (`#f6b45a` face, `#f2a54a` ears/tail, `#d9822b` stripes): big head, big dark glossy eyes with white highlights, pink heart nose, little "w" mouth, blush.
- **Suit:** dark navy wetsuit `#2c3e5a` with a dashed zip and an orange paw badge, a dark neck seal, **silver-grey air tank** `#a9b3bd`, and teal flippers.
- **Helmet:** a clear goldfish bowl. Glass with a pale rim, white highlight arcs, and a soft rim at the neck. **No brass collar.** It glows softly cyan underwater. A small lamp on top appears from 200 m.
- **Faces:** normal; **shocked** (huge round eyes with tiny pupils, small "o" mouth, blush lines, sweat drop, quick head "pop"), shown about 1.4 s after a scare; **happy** (^ ^ eyes, open smile, strong blush), shown after finding the treasure and during the ride back up.
- **Idle motion:** tail sway, slow blink, gentle flipper kicks (±5°, 1.1 s; keep these subtle), bobbing and tilt underwater.

---

## 2. Scroll model

All timing uses **u = scrollY / viewportHeight**, smoothed with `us += (u − us) · min(1, dt·7)`. The camera has a world position (`camX`, `camY`); actors live in world space.

| u | What happens |
|---|---|
| 0 – 0.18 | Title "Catxplorer / Catto is going for a dive." plus a "scroll to dive ↓" hint |
| 0.18 – 0.78 | Catto picks his helmet up off the deck; it arcs onto his head |
| 0.84 – 1.32 | Crouch (squash to 0.88) |
| 1.32 – 2.40 | Jump: arc **out to the right** (+0.30 W; 0.34 W on mobile), rotating to dive head-first |
| 2.40 | **Splash:** ~80 droplets, 3 ripples, a burst of bubbles, a 0.4 s screen shake |
| 2.04 – 4.32 | Camera pans **right** (until the pier is fully off-screen) and **down** below the surface. Catto rights himself and settles mid-screen |
| 4.32 – 4.80 | Hands over to free swim (Catto follows the cursor) |
| 5.20 → end | Steady descent at **0.8 screens of depth per screen scrolled** |

**Descent lengths, in screens:** reef 4.6 · twilight 5 · midnight 4.5 · abyss/trench 4.
**Depth readout** (piecewise linear on world y): 0→200 m over the reef, 200→1,000 m over the twilight zone, 1,000→4,000 m over the midnight zone, then 4,000→10,935 m over the abyss/trench (capped at 10,935).

**World landmarks** (H = viewport height, WL = waterline = 0.66 H):
- Reef top `R0 = WL + 1.2H`: clownfish +0.45H, sardines +1.4H, turtle +2.35H, moon jellies +3.5H
- `T0` = 200 m: manta +1.2H, sixgill shark +2.5H, squid +3.7H
- `M0` = 1,000 m (`T0 + 5H`): anglerfish +1.4H, dumbo octopus +3H
- `A0` = 4,000 m (`M0 + 4.5H`): trench floor at `A0 + 4.3H`, chest at x = 0.62 W

---

## 3. Shared systems

- **Free swim:** Catto eases toward the cursor (or the last tap on touch) at about 1.8/s, kept inside the viewport. With no input for 5 s, he wanders on a slow figure-of-eight. He flips to face his direction of travel and tilts with speed (±14°).
- **Scare reaction ("bolt"):** an impulse away from the threat (fades over 0.6–1.1 s) that overrides cursor-follow, plus the shocked face and a "!" above his head. Used by the anglerfish, squid and shark.
- **Helmet bubbles:** a few small bubbles every 0.18–0.48 s (faster during the ride back up). They rise, wobble, and pop with a tiny ripple at the surface.
- **Darkness and the lamp:**
  - `lampK` fades in from 200 m.
  - `night` builds in steps: about 0.38 by early twilight, about 0.92 by the shark, about 0.97 in the midnight zone.
  - The night layer is drawn off-screen, then cut out with `destination-out` for: a soft circle around the helmet, a soft cone in the facing direction (length 3.4 × cat size, three stacked wedges ±0.3/0.42/0.55 rad), the anglerfish's lure, and the treasure chest.
  - A faint warm tint (`lighter`) fills the cone.
  - Glowing things are drawn **after** the night layer: lure, shark eyes, squid spots, jelly glow, chest light, marine snow.
- **Draw order:** back canvas (sky, sea, reef, pier, turtle, far half of the sardine ring, trench floor, chest and its glow) → Catto (DOM/SVG) → front canvas (tint, creatures, near half of the sardine ring, dark overlay, night layer, glows, vignette).
- **Fact card** (bottom-left): shows the creature or zone whose landmark is closest to the middle of the screen (within 0.6 H), with an eyebrow, title and body. It hides when the end card shows.
- **Depth meter** (right): label, value, zone name, and a track with ticks for SUNLIT, TWILIGHT (20%), MIDNIGHT (42%), ABYSS (66%) and TRENCH (88%). A paw-print marker moves down the track.

---

## 4. Scenes

### 0 · Pier (surface)
Warm sky gradient, sun glow, drifting clouds, gulls and distant hills, with parallax as the camera moves. A wooden pier with posts, a bollard and rope, and a bucket of fish. Catto sits at the end of the pier.

### 1 · Splash → shallows
The splash moment described above. Under the waterline there's a wavy highlight, a translucent tint, swaying light rays and drifting specks. Small red fish **scatter away from Catto** as he swims near them. A card appears: "Ooh, fishies".

### 2 · Sunlit reef (0–200 m)
- **Reef walls:** stacked **rounded boulders** in deep indigo (`#2b3486`, `#33399a`…) with lighter tops and speckles. **No jagged edges.** Corals grow on top of the boulders, layered in front of and behind them: magenta fronds, pale branching coral, teal tube sponges, turquoise soft coral, lilac fan shells, blue coral and black sea urchins.
- **Clownfish ×3 + anemone:** clownfish are drawn in a flat style (chunky orange body, white bands edged in navy, a navy rim on the fins, a small dark eye). The anemone has layered, tapered purple tentacles. When Catto comes within 1.5 × his size, the fish dive in **behind the front row of tentacles**. Once he's gone, they peek out again one at a time, 0.6 s apart.
- **Sardine shoal (~130; 80 on mobile):** a swirling, flashing silver ball. When Catto swims in, it **wraps into a ring around him**. The far half of the ring is drawn behind him, so he looks surrounded. If he swims off fast (more than 2.6 × his size), it lets go and drifts home. **Once Catto is deeper than 120 m, it lets go and won't follow him down.**
- **Green sea turtle (side view):** domed orange-brown shell with outlined plates and a pale rim, a pale scaly body, a patterned head, and a big paddling front flipper. It cruises from right to left. **If Catto bumps into it, he gets a ride** on its shell for up to 4.5 s ("wheee!").
- **Moon jellies ×5:** translucent bells with a pink glowing core and a bright scalloped rim, trailing tentacles of **different lengths**, and frilly oral arms. They pulse up and sink slowly. **A boop** pushes the jelly away, flashes its glow, and nudges Catto back.

### 3 · Twilight zone (200–1,000 m)
- **Helmet lamp switches on.** The darkness builds as described in section 3.
- **Manta ray:** crescent-winged, with a dark back covered in white dots and short dashes (a spotted, eagle-ray-style print, not shoulder ovals). It glides in big slow loops and drifts toward Catto out of curiosity. When he's close, it **does a somersault**, briefly showing its pale, spotted belly.
- **Bluntnose sixgill shark:** side view with six gill slits, a single dorsal fin set far back, and **glowing green eyes** that you can see in the dark. It patrols slowly. **It dislikes light:** if the lamp hits it, or Catto gets close, it turns and swims away. A close pass makes Catto bolt.
- **Squid:** hovers with a few glowing spots. If Catto sneaks up on it or catches it in the lamp, it **jets away and leaves an ink cloud**. Catto backs off with the shocked face. The squid drifts home after about 4 s.

### 4 · Midnight zone (1,000–4,000 m)
- Almost total darkness, with **marine snow** drifting down.
- **Anglerfish:** **one silhouette with the mouth cut in** (no separate jaw shape, no dark fill behind the teeth). It has an underbite with fangs on both lips, ribbed green tail, dorsal and side fins, gill marks, and a round white eye. The **warm yellow teardrop lure** lights up a small patch around her face. When Catto gets near, the lure leans toward him. If he touches it, her jaws snap open, he **bolts with the shocked face**, and she resets after 4 s.
- **Dumbo octopus:** **one continuous shape**: a bell head flowing into a frilly webbed skirt, big translucent peach ear-fins, small glossy black eyes, and tiny suckers along the frill. She glows faintly. Render her off-screen first, then fade her as one image, so overlapping parts don't show through. **Say hi and she swims alongside Catto for about 6 s**, then goes home. She never leaves her own depth band.

### 5 · Abyss → trench → Challenger Deep (4,000–10,935 m)
- Trench walls narrow on both sides. A pale sandy floor appears at the bottom.
- **Treasure garden** around the chest: big peach, pink and teal corals framing the scene, plus scallop shells, pearls, twinkling gems (green, blue, amber) and scattered gold coins. A wide pool of light around the chest reveals it.
- A **navy-blue treasure chest with gold trim**, gold stars and a keyhole sits on the floor, with gold light leaking from its seam.
- **Catto can't go below the floor.** When he touches it, he bounces up a little (with a small puff of bubbles), at most once every 1.4 s.
- The chest, its glow, the coins and the sardine tin are drawn **behind Catto** (on the back canvas). Catto always stays in the foreground.
- **When Catto comes within 1.6 × his size**, the lid swings open to show pearls and gems, about 40 gold coins burst out and bounce, and a **glowing tin of sardines** floats well up out of the chest, twinkling with sparkles. Catto gets the happy face.
- **End card:** "Treasure found! 🐟" with a **Swim back up ↑** button. The button eases the scroll to the top over about 4.2 s: Catto heads to the middle of the screen with a stream of bubbles, splashes out, and lands back on the pier with his helmet off. The chest resets once you're back above 4,000 m.

---

## 5. Copy (final, checked)

| Where | Eyebrow | Title | Body |
|---|---|---|---|
| Shallows | ☀ SUNLIT ZONE · 0–200 m | Ooh, fishies. | Move your cursor (or tap) and Catto swims after it. Get too close and the fish scatter. Keep scrolling to head down to the reef. |
| Clownfish | MEET THE LOCALS | Clownfish | They live among stinging anemone tentacles. A slimy coat keeps them from getting stung. Swim close and watch them hide. |
| Sardines | MEET THE LOCALS | Sardines | Sardines swim in schools of thousands to confuse predators. Sometimes it backfires: a tightly packed ball of sardines becomes an all-you-can-eat buffet for big hunters like humpback whales. Swim in and they'll circle Catto. |
| Turtle | MEET THE LOCALS | Green sea turtle | Some migrate thousands of kilometres between feeding and nesting grounds. Bump into one to hitch a ride. |
| Jellies | MEET THE LOCALS | Moon jellyfish | No brain, no heart, just a pulsing bell. Give one a gentle boop. |
| 200 m | TWILIGHT ZONE · 200–1,000 m | Lights on | Sunlight barely reaches this far down, so Catto switches on his helmet light. Many animals here make their own light. |
| Manta | MEET THE LOCALS | Manta ray | Manta rays have the largest brains of any fish! 🧠 They're curious, social animals, and each has a unique pattern of spots on its belly, like a fingerprint. Swim close and it might do a somersault. |
| Shark | MEET THE LOCALS | Bluntnose sixgill shark | An ancient shark: its teeth closely match fossils from more than 200 million years ago. Its glowing green eyes are made for the dark, and it dislikes bright light. Shine your lamp on it and watch it swerve away. |
| Squid | MEET THE LOCALS | Squid | When startled, a squid shoots off by jet propulsion and leaves a cloud of ink to cover its escape. Sneak up on it, if you can. |
| 1,000 m | MIDNIGHT ZONE · 1,000–4,000 m | No sunlight at all | Not a single ray of sunlight reaches this deep. The "snow" drifting past is marine snow: bits of dead plankton and waste sinking from above, and dinner for lots of animals down here. |
| Angler | MEET THE LOCALS | Anglerfish | She dangles a glowing lure in front of her mouth. The light comes from bacteria living inside it. Curious little fish swim up for a closer look… and get gobbled. Go on, check out the light. |
| Dumbo | MEET THE LOCALS | Dumbo octopus | Named after a certain flying elephant, it flaps its ear-like fins to "fly" through the water. Dumbos live deeper than any other known octopus. Say hi and it might tag along. |
| 4,000 m | ABYSS · 4,000–6,000 m | Cold, dark and crushing | The water is just above freezing, and the pressure is hundreds of times what it is at the surface. Life down here is sparse, slow and very patient. |
| 6,000 m | HADAL ZONE · 6,000 m + | Into the trench | Below 6,000 m the ocean only continues inside deep trenches. This zone is named after Hades, the Greek god of the underworld. |
| Bottom | CHALLENGER DEEP · ~10,935 m | The bottom of the ocean | The deepest known point on Earth, where the pressure is over 1,000 times stronger than at the surface. Something is glowing down here… swim over and take a look. |
| End card | CHALLENGER DEEP · ~10,935 m | Treasure found! 🐟 | At the very bottom of the ocean, Catto found a glowing tin of sardines. Worth every metre. Button: **Swim back up ↑** |

Fact sources (checked Nov 2026):
- Manta brain size and depth: Manta Pacific, Oceana, and Frontiers in Marine Science (via Mongabay).
- Sixgill shark depth, green eyes and light sensitivity: Wikipedia, FishBase, FSU Deep-C, Sharksider.
- Dumbo octopus depth: Aquarium of the Pacific and the Marine Biology record at 6,957 m.
- Challenger Deep depth and pressure, and the Hades naming: WHOI and Royal Museums Greenwich.
- Clownfish mucus and jellyfish having no brain or heart: aquarium and museum sources.

**Don't change the copy without asking.**

---

## 6. Audio (to build; off by default)

- A **sound toggle** in the corner, muted to start. Audio starts only after the first click or tap, because browsers block autoplay.
- **Ambient:** one ocean loop above water. Underwater, a muffled ambience whose low-pass cutoff drops with depth (bright → muffled → near silence with soft rumbles).
- **Sound effects:** splash, bubble pops (quiet, random), jelly boop, turtle "wheee", sardine whoosh, anglerfish snap, squid ink squirt, shark pass (low swell), chest open chime with coin jingle, and a rising whoosh for the ride back up.
- Put the files in `assets/audio/`. Missing files must fail silently.

---

## 7. Assets & fallbacks

- The image assets live in `assets/` and are listed in `assets/manifest.json` (name → file, anchor point, size relative to the cat).
- Every drawable keeps its **code-drawn stand-in as a fallback**: if an image is missing, it draws the prototype version. That way the art can be swapped in one piece at a time.
- **Stays code-drawn** (images won't look better): water, light rays, bubbles, particles, moon jellies, the helmet glass and glow, the lamp cone, all glows, marine snow, coins, ink.

---

## 8. Quality bar

- 60 fps on a mid-range laptop. Cap DPR at 2. Skip simulating and drawing actors more than a screen away.
- **Mobile:** tap to steer, fewer fish, smaller reef walls, the meter's tick labels hidden, the cards full width.
- **Reduced motion:** no screen shake, fewer particles, and the ride back up jumps instantly.
- The cards and the button are keyboard-reachable. Normal keyboard scrolling works.
- No console errors. Good Lighthouse performance and accessibility scores.

## 9. Later / nice-to-have
- A hidden seahorse in the reef fronds that uncurls its tail and bobs away when Catto finds it.
- Sea pigs and amphipods on the trench floor.
