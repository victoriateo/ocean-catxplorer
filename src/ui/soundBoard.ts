// A little panel for auditioning every sound on its own. Open the site with ?soundboard on the
// end of the address (http://localhost:5173/?soundboard). Not shown to normal visitors.
import { audition, setSound, sfx, soundNames } from '../audio/audio';

const LABELS: Record<string, string> = {
  splash: 'Splash', bubble: 'Bubble pop', boop: 'Jellyfish boop', wheee: 'Turtle wheee', whoosh: 'Sardine whoosh', snap: 'Anglerfish snap',
  ink: 'Squid ink', shark: 'Shark swell', chest: 'Chest chime', coins: 'Coin jingle', ascend: 'Ride back up', meow: 'Meow', rumble: 'Deep rumble',
};

export function initSoundBoard() {
  if (!new URLSearchParams(location.search).has('soundboard')) return;
  const box = document.createElement('div'); box.id = 'soundboard';
  box.innerHTML = `<strong>Sound board</strong><div class="grid"></div>
    <label>Ambient at: <span id="sbDepth">follows the dive</span>
      <input id="sbSlider" type="range" min="-2" max="10935" step="1" value="-2"></label>
    <small>Far left = follow the dive. Next notch = above water. Then depth in metres.</small>`;
  const grid = box.querySelector('.grid')!;
  for (const name of soundNames()) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = LABELS[name] ?? name;
    b.addEventListener('click', async () => { await setSound(true); sfx(name); });
    grid.appendChild(b);
  }
  box.addEventListener('pointerdown', e => e.stopPropagation());
  document.body.appendChild(box);
  const slider = box.querySelector<HTMLInputElement>('#sbSlider')!, out = box.querySelector('#sbDepth')!;
  slider.addEventListener('input', async () => {
    const v = +slider.value;
    if (v <= -2) { audition.depth = null; out.textContent = 'follows the dive'; return; }
    await setSound(true);
    audition.depth = v < 0 ? -1 : v; out.textContent = v < 0 ? 'above water' : `${v} m`;
  });
}
