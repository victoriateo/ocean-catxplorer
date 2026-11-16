// Pointer input: Catto swims toward the last cursor / tap position.

/** After this long with no input, Catto wanders on a figure-of-eight. */
export const IDLE_MS = 5000;

export const mouse = { x: 0, y: 0, tm: -1e9 };

const hovers = new Set<string>();
/** Actors call this each frame; the cursor becomes a pointer while anything clickable is under it. */
export function setHover(key: string, on: boolean) {
  if (on === hovers.has(key)) return;
  if (on) hovers.add(key); else hovers.delete(key);
  document.getElementById('stage')!.style.cursor = hovers.size ? 'pointer' : '';
}
/** Has the pointer moved or pressed recently? (Touch screens leave a stale position behind.) */
export const pointerFresh = () => performance.now() - mouse.tm < 4000;

const taps: ((x: number, y: number) => void)[] = [];
/** Calls fn with the screen position of every click / tap. */
export function onTap(fn: (x: number, y: number) => void) { taps.push(fn); }

export function initInput() {
  const setMouse = (e: PointerEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.tm = performance.now(); };
  addEventListener('pointermove', setMouse, { passive: true });
  addEventListener('pointerdown', e => { setMouse(e); for (const fn of taps) fn(e.clientX, e.clientY); }, { passive: true });
}
