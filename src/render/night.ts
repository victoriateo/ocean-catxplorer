// Darkness: the night layer is painted off-screen, then the lamp, lure and chest
// are cut out of it with destination-out (SPEC §3).
import { world, light } from '../core/state';
import { angler } from '../actors/angler';
import { chest } from '../actors/chest';

export const NIGHT = {
  colour: '9,24,58',                          // r,g,b of the darkness: deep navy (prototype: near-black 2,8,20)
  coneLen: 3.4,                               // lamp cone length, × cat size
  coneTilt: .22,                              // cone points this many rad below horizontal
  haloR: 1.05,                                // soft circle around the helmet, × cat size
  wedges: [[.55, .35], [.42, .35], [.3, .4]], // [half-angle rad, strength] stacked cone wedges
  warmSpread: .5,                             // half-angle of the warm 'lighter' tint
  warmAlpha: .12,
  litMinLamp: .5,                             // lamp must be at least this strong to "light" things
  litSpread: .5,                              // half-angle used for "is this lit?" checks
};

const nightC = document.createElement('canvas');
const nx = nightC.getContext('2d')!;

export function resizeNight() {
  nightC.width = Math.round(world.W * world.DPR); nightC.height = Math.round(world.H * world.DPR);
}

const coneAngle = () => (light.lamp.dir > 0 ? NIGHT.coneTilt : Math.PI - NIGHT.coneTilt);

/** Is this world point lit by the lamp? Used by the shark and squid. */
export function isLit(wx: number, wy: number) {
  const { G, camX, camY } = world, lamp = light.lamp;
  const L = G.s * NIGHT.coneLen, lampAng = coneAngle();
  if (light.lampK < NIGHT.litMinLamp) return false;
  const dx = wx - camX - lamp.x, dy = wy - camY - lamp.y, d = Math.hypot(dx, dy);
  if (d < G.s) return true;
  const da = Math.abs(((Math.atan2(dy, dx) - lampAng + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
  return d < L && da < NIGHT.litSpread;
}

export function drawNight(ctx: CanvasRenderingContext2D) {
  const { W, H, G, DPR, camX, camY } = world, { lampK, night, lamp } = light;
  if (night <= .01) return;
  nx.setTransform(DPR, 0, 0, DPR, 0, 0); nx.globalCompositeOperation = 'source-over'; nx.clearRect(0, 0, W, H);
  nx.fillStyle = `rgba(${NIGHT.colour},${night})`; nx.fillRect(0, 0, W, H);
  const L = G.s * NIGHT.coneLen, ang = coneAngle();
  if (lampK > 0) {
    nx.globalCompositeOperation = 'destination-out';
    const g = nx.createRadialGradient(lamp.x, lamp.y, 0, lamp.x, lamp.y, G.s * NIGHT.haloR);
    g.addColorStop(0, `rgba(0,0,0,${lampK})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    nx.fillStyle = g; nx.beginPath(); nx.arc(lamp.x, lamp.y, G.s * NIGHT.haloR, 0, 7); nx.fill();
    for (const [sp, a] of NIGHT.wedges) {
      const lg = nx.createRadialGradient(lamp.x, lamp.y, G.s * .2, lamp.x, lamp.y, L);
      lg.addColorStop(0, `rgba(0,0,0,${a * lampK})`); lg.addColorStop(1, 'rgba(0,0,0,0)');
      nx.fillStyle = lg; nx.beginPath(); nx.moveTo(lamp.x, lamp.y); nx.arc(lamp.x, lamp.y, L, ang - sp, ang + sp); nx.closePath(); nx.fill();
    }
  }
  {
    const lx = angler.lx - camX, ly = angler.ly - camY;
    if (ly > -200 && ly < H + 200) {
      nx.globalCompositeOperation = 'destination-out';
      const ag = nx.createRadialGradient(lx, ly, 0, lx, ly, angler.L * .75);
      ag.addColorStop(0, 'rgba(0,0,0,.9)'); ag.addColorStop(1, 'rgba(0,0,0,0)');
      nx.fillStyle = ag; nx.beginPath(); nx.arc(lx, ly, angler.L * .75, 0, 7); nx.fill();
    }
  }
  {
    const cx_ = G.chestX - camX, cy_ = G.floorY - camY - G.s * .3;
    if (cy_ > -300 && cy_ < H + 300) {
      const R = Math.max(G.s * (2.6 + chest.open * 1.8), W * .32);
      nx.globalCompositeOperation = 'destination-out';
      const cg = nx.createRadialGradient(cx_, cy_, 0, cx_, cy_, R);
      cg.addColorStop(0, 'rgba(0,0,0,1)'); cg.addColorStop(.55, `rgba(0,0,0,${.8 + chest.open * .15})`); cg.addColorStop(1, 'rgba(0,0,0,0)');
      nx.fillStyle = cg; nx.beginPath(); nx.arc(cx_, cy_, R, 0, 7); nx.fill();
    }
  }
  ctx.drawImage(nightC, 0, 0, W, H);
  if (lampK > 0) {
    ctx.globalCompositeOperation = 'lighter';
    const wg = ctx.createRadialGradient(lamp.x, lamp.y, G.s * .2, lamp.x, lamp.y, L);
    wg.addColorStop(0, `rgba(255,240,190,${NIGHT.warmAlpha * lampK})`); wg.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(lamp.x, lamp.y); ctx.arc(lamp.x, lamp.y, L, ang - NIGHT.warmSpread, ang + NIGHT.warmSpread); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
}
