// Pointer input: Catto swims toward the last cursor / tap position.

/** After this long with no input, Catto wanders on a figure-of-eight. */
export const IDLE_MS = 5000;

export const mouse = { x: 0, y: 0, tm: -1e9 };

export function initInput() {
  const setMouse = (e: PointerEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.tm = performance.now(); };
  addEventListener('pointermove', setMouse, { passive: true });
  addEventListener('pointerdown', setMouse, { passive: true });
}
