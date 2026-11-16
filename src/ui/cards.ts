// Title, scroll hint, the "Ooh, fishies" card and the end card with its "Swim back up" button.
import { cat } from '../core/state';
import { clamp, eio, seg } from '../core/math';
import { UI_FADE, ASCEND_MS } from '../core/timeline';
import { chest } from '../actors/chest';

let el: { title: HTMLElement; hint: HTMLElement; card1: HTMLElement; card2: HTMLElement };

export function initCards() {
  const $ = (id: string) => document.getElementById(id)!;
  el = { title: $('title'), hint: $('hint'), card1: $('card1'), card2: $('card2') };
  $('replay').addEventListener('click', ascend);
}

/** Eases the scroll back to the top; Catto rides up with a stream of bubbles. */
export function ascend() {
  if (cat.ascending) return;
  cat.ascending = true; cat.happy = 99;
  const from = scrollY, t0 = performance.now();
  const stepUp = (now: number) => {
    const k = clamp((now - t0) / ASCEND_MS);
    scrollTo(0, from * (1 - eio(k)));
    if (k < 1) requestAnimationFrame(stepUp); else { cat.ascending = false; cat.happy = 2; }
  };
  requestAnimationFrame(stepUp);
}

/** Returns the end card's opacity (the fact card uses it). */
export function updateCards(us: number) {
  el.title.style.opacity = String(1 - seg(us, UI_FADE.title[0], UI_FADE.title[1]));
  el.hint.style.opacity = String(1 - seg(us, UI_FADE.hint[0], UI_FADE.hint[1]));
  const c1 = seg(us, UI_FADE.card1In[0], UI_FADE.card1In[1]) * (1 - seg(us, UI_FADE.card1Out[0], UI_FADE.card1Out[1]));
  el.card1.style.opacity = String(c1);
  const c2 = cat.ascending ? 0 : seg(chest.open, .6, .95);
  el.card2.style.opacity = String(c2); el.card2.style.pointerEvents = c2 > .5 ? 'auto' : 'none';
  return c2;
}
