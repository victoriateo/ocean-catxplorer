// The sound button in the top-right corner. Sound is off until it is pressed (SPEC §6).
import { isSoundOn, setSound, soundSupported } from '../audio/audio';

const ICON_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M15 9a4.2 4.2 0 0 1 0 6M17.6 6.4a8 8 0 0 1 0 11.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const ICON_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M15.5 9.5l5 5M20.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

export function initSoundToggle() {
  const btn = document.getElementById('sound') as HTMLButtonElement | null; if (!btn) return;
  if (!soundSupported()) { btn.hidden = true; return; }
  const render = () => {
    const on = isSoundOn();
    btn.innerHTML = on ? ICON_ON : ICON_OFF;
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
    btn.title = on ? 'Sound on' : 'Sound off';
    btn.classList.toggle('on', on);
  };
  btn.addEventListener('click', () => { void setSound(!isSoundOn()); });
  addEventListener('soundchange', render);
  btn.addEventListener('pointerdown', e => e.stopPropagation());   // pressing it shouldn't steer Catto or poke the creatures
  render();
}
