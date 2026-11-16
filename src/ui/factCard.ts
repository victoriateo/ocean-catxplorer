// Fact card (bottom-left): shows the creature or zone whose landmark is closest to the middle
// of the screen (within 0.6 H). COPY IS FINAL — don't edit without checking with Victoria (SPEC §5).
import { world } from '../core/state';
import { clamp } from '../core/math';
import { ABY_LEN } from '../core/timeline';

interface Fact { y: () => number; eyebrow: string; title: string; body: string }

export const FACT_RANGE = .6;      // × H from screen centre
export const FACT_MIN = .15;       // closeness needed before the card switches / shows

const G = () => world.G, H = () => world.H;
export const facts: Fact[] = [
  { y: () => G().aY, eyebrow: 'MEET THE LOCALS', title: 'Clownfish', body: 'They live among stinging anemone tentacles. A slimy coat keeps them from getting stung. Swim close and watch them hide.' },
  { y: () => G().tangY, eyebrow: 'MEET THE LOCALS', title: 'Sardines', body: 'Sardines swim in schools of thousands to confuse predators. Sometimes it backfires: a tightly packed ball of sardines becomes an all-you-can-eat buffet for big hunters like humpback whales. Swim in and they\'ll circle Catto.' },
  { y: () => G().turtY, eyebrow: 'MEET THE LOCALS', title: 'Green sea turtle', body: 'Unlike most sea turtles, adult green sea turtles are herbivorous and eat mostly seagrass and algae.\n\nSea turtles have existed for over 120 million years – their ancestors swam alongside the dinosaurs.' },
  { y: () => G().jellyY, eyebrow: 'MEET THE LOCALS', title: 'Moon jellyfish', body: 'No brain, no heart, just a pulsing bell. Give one a gentle boop.' },
  { y: () => G().T0 + H() * .35, eyebrow: 'TWILIGHT ZONE · 200–1,000 m', title: 'Lights on', body: 'Sunlight barely reaches this far down, so Catto switches on his helmet light. Many animals here make their own light.' },
  { y: () => G().mantaY, eyebrow: 'MEET THE LOCALS', title: 'Manta ray', body: 'Manta rays have the largest brains of any fish! 🧠 They\'re curious, social animals, and each has a unique pattern of spots on its belly, like a fingerprint. Swim close and it might do a somersault.' },
  { y: () => G().sharkY, eyebrow: 'MEET THE LOCALS', title: 'Bluntnose sixgill shark', body: 'An ancient shark: its teeth closely match fossils from more than 200 million years ago. Its glowing green eyes are made for the dark, and it dislikes bright light. Shine your lamp on it and watch it swerve away.' },
  { y: () => G().M0 + H() * .35, eyebrow: 'MIDNIGHT ZONE · 1,000–4,000 m', title: 'No sunlight at all', body: 'Not a single ray of sunlight reaches this deep. The "snow" drifting past is marine snow: bits of dead plankton and waste sinking from above, and dinner for lots of animals down here.' },
  { y: () => G().anglerY, eyebrow: 'MEET THE LOCALS', title: 'Anglerfish', body: 'She dangles a glowing lure in front of her mouth. The light comes from bacteria living inside it. Curious little fish swim up for a closer look… and get gobbled. Go on, check out the light.' },
  { y: () => G().dumboY, eyebrow: 'MEET THE LOCALS', title: 'Dumbo octopus', body: 'Named after a certain flying elephant, it flaps its ear-like fins to "fly" through the water. Dumbos live deeper than any other known octopus. Say hi and it might tag along.' },
  { y: () => G().A0 + H() * .35, eyebrow: 'ABYSS · 4,000–6,000 m', title: 'Cold, dark and crushing', body: 'The water is just above freezing, and the pressure is hundreds of times what it is at the surface. Life down here is sparse, slow and very patient.' },
  { y: () => G().A0 + H() * 1.5, eyebrow: 'HADAL ZONE · 6,000 m +', title: 'Into the trench', body: 'Below 6,000 m the ocean only continues inside deep trenches. This zone is named after Hades, the Greek god of the underworld.' },
  { y: () => G().A0 + H() * ABY_LEN, eyebrow: 'CHALLENGER DEEP · ~10,935 m', title: 'The bottom of the ocean', body: 'The deepest known point on Earth, where the pressure is over 1,000 times stronger than at the surface. Something is glowing down here… swim over and take a look.' },
  { y: () => G().squidY, eyebrow: 'MEET THE LOCALS', title: 'Squid', body: 'When startled, a squid shoots off by jet propulsion and leaves a cloud of ink to cover its escape. Sneak up on it, if you can.' },
];

let el: { fact: HTMLElement; eyebrow: HTMLElement; title: HTMLElement; body: HTMLElement };
let factIdx = -1;

export function initFactCard() {
  const $ = (id: string) => document.getElementById(id)!;
  el = { fact: $('fact'), eyebrow: $('factEyebrow'), title: $('factTitle'), body: $('factBody') };
}

/** endCard = opacity of the end card (the fact card hides as it appears). */
export function updateFactCard(endCard: number) {
  const { H, camY } = world;
  let best = -1, bestK = 0;
  facts.forEach((f, i) => { const k = 1 - clamp(Math.abs(f.y() - (camY + H * .5)) / (H * FACT_RANGE)); if (k > bestK) { bestK = k; best = i; } });
  if (best !== factIdx && best >= 0 && bestK > FACT_MIN) {
    factIdx = best; el.eyebrow.textContent = facts[best].eyebrow; el.title.textContent = facts[best].title; el.body.textContent = facts[best].body;
  }
  el.fact.style.opacity = String(clamp((bestK - FACT_MIN) * 3) * (1 - endCard));
}
