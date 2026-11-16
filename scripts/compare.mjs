// Parity check: screenshots reference/prototype.html and the Vite build at the same scroll
// positions, side by side, with a pixel diff.
//
//   npm run compare                  → compare-out/1280x800/index.html (+ PNGs, report.json)
//   W=390 H=844 npm run compare      → compare-out/390x844/…
//
// Both pages run on a fake clock (fixed 60 fps) with a seeded Math.random, and are driven by
// the same scripted scroll, so any difference in the pictures is a real difference in the code.
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VIEW = { width: Number(process.env.W) || 1280, height: Number(process.env.H) || 800 };
const out = path.join(root, 'compare-out', `${VIEW.width}x${VIEW.height}`);
const STOPS = [0, 1.8, 2.6, 4.6, 6.3, 7.6, 8.9, 10.2, 12.45, 14.1, 15.6, 18.95, 20.95, 24.5, 'end', 'ascend-mid', 'ascend-done'];
const SCROLL_PER_FRAME = .02;   // screens per frame (1.2 screens/s)
const SETTLE_FRAMES = 90;

// Runs before any page script: deterministic clock + random.
function fakeEnv() {
  let a = 12345;
  Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let now = 0; let q = [];
  performance.now = () => now;
  window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
  window.__step = n => { for (let i = 0; i < n; i++) { now += 1000 / 60; const cbs = q; q = []; for (const cb of cbs) cb(now); } };
  window.__scrollTo = (u, perFrame) => {
    const H = innerHeight, max = document.documentElement.scrollHeight - H;
    const target = Math.min(max, u * H);
    let y = scrollY;
    while (y < target) { y = Math.min(target, y + perFrame * H); scrollTo(0, y); window.__step(1); }
  };
}

async function shoot(browser, url, name) {
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(fakeEnv);
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => typeof window.__step === 'function' && document.querySelector('#cat svg'));
  const shots = [];
  for (const stop of STOPS) {
    const u = stop === 'end' ? 1e9 : stop;
    if (stop === 'ascend-mid') await page.evaluate(() => { document.getElementById('replay').click(); window.__step(150); });   // "Swim back up", 2.5 s in
    else if (stop === 'ascend-done') await page.evaluate(() => window.__step(240));                                             // back on the pier
    else await page.evaluate(([u, pf, settle]) => { window.__scrollTo(u, pf); window.__step(settle); }, [u, SCROLL_PER_FRAME, SETTLE_FRAMES]);
    if (stop === 'end') {   // swim over to the chest so the treasure opens and the end card shows
      await page.mouse.move(VIEW.width * .62, VIEW.height * .7);
      await page.evaluate(() => window.__step(300));
    }
    const file = path.join(out, `${name}-${stop}.png`);
    await page.screenshot({ path: file, animations: 'disabled' });
    const state = await page.evaluate(() => ({ depth: document.getElementById('depth').textContent, zone: document.getElementById('zone').textContent, fact: document.getElementById('factTitle').textContent, cat: document.getElementById('cat').style.transform }));
    shots.push({ stop, file, state });
  }
  await ctx.close();
  return { shots, errors };
}

async function diff(browser, a, b, outFile) {
  const page = await browser.newPage();
  const [A, B] = await Promise.all([a, b].map(async f => 'data:image/png;base64,' + (await readFile(f)).toString('base64')));
  const res = await page.evaluate(async ([A, B]) => {
    const load = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = s; });
    const [ia, ib] = await Promise.all([load(A), load(B)]);
    const w = ia.width, h = ia.height;
    const get = i => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, w, h); };
    const da = get(ia), db = get(ib);
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    const o = x.createImageData(w, h); let n = 0, maxd = 0;
    for (let p = 0; p < da.data.length; p += 4) {
      const d = Math.max(Math.abs(da.data[p] - db.data[p]), Math.abs(da.data[p + 1] - db.data[p + 1]), Math.abs(da.data[p + 2] - db.data[p + 2]));
      if (d > maxd) maxd = d;
      const g = (da.data[p] + da.data[p + 1] + da.data[p + 2]) / 3 * .25;
      if (d > 8) { n++; o.data[p] = 255; o.data[p + 1] = 0; o.data[p + 2] = 90; } else { o.data[p] = o.data[p + 1] = o.data[p + 2] = g; }
      o.data[p + 3] = 255;
    }
    x.putImageData(o, 0, 0);
    return { png: c.toDataURL('image/png'), differing: n, total: w * h, maxDelta: maxd };
  }, [A, B]);
  await writeFile(outFile, Buffer.from(res.png.split(',')[1], 'base64'));
  await page.close();
  return { differing: res.differing, pct: +(res.differing / res.total * 100).toFixed(3), maxDelta: res.maxDelta };
}

await mkdir(out, { recursive: true });
const server = await createServer({ root, logLevel: 'error', server: { port: 5199, strictPort: false } });
await server.listen();
const devUrl = server.resolvedUrls.local[0];
const browser = await chromium.launch();
try {
  const proto = await shoot(browser, pathToFileURL(path.join(root, 'reference/prototype.html')).href, 'prototype');
  const build = await shoot(browser, devUrl + '?art=off', 'build');   // parity is checked on the code-drawn versions
  const rows = [];
  for (let i = 0; i < STOPS.length; i++) {
    const stop = STOPS[i];
    const d = await diff(browser, proto.shots[i].file, build.shots[i].file, path.join(out, `diff-${stop}.png`));
    const same = JSON.stringify(proto.shots[i].state) === JSON.stringify(build.shots[i].state);
    rows.push({ stop, ...d, stateMatches: same, prototype: proto.shots[i].state, build: build.shots[i].state });
    console.log(`u=${String(stop).padEnd(6)} diff ${String(d.pct).padStart(7)}%  maxΔ ${String(d.maxDelta).padStart(3)}  state ${same ? 'same' : 'DIFFERENT'}  [${build.shots[i].state.depth}, ${build.shots[i].state.fact}]`);
  }
  console.log('console errors — prototype:', proto.errors.length, proto.errors.slice(0, 3), ' build:', build.errors.length, build.errors.slice(0, 3));
  await writeFile(path.join(out, 'report.json'), JSON.stringify({ view: VIEW, rows, errors: { prototype: proto.errors, build: build.errors } }, null, 2));
  const html = `<!doctype html><meta charset="utf-8"><title>Catxplorer parity</title>
<style>body{font:14px system-ui;margin:24px;background:#10202c;color:#e8f0f4}h1{font-size:20px}section{margin:28px 0}.r{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}img{width:100%;display:block;border-radius:6px}h2{font-size:15px;font-weight:600}small{opacity:.7}figcaption{font-size:12px;opacity:.7;margin-bottom:4px}figure{margin:0}</style>
<h1>Catxplorer parity — prototype vs build (${VIEW.width}×${VIEW.height})</h1>
<p><small>Same fake clock, seeded random and scripted scroll on both. Pink in the diff = pixels that differ by more than 8/255.</small></p>
${rows.map(r => `<section><h2>u = ${r.stop} · ${r.build.depth} · ${r.build.fact || '—'} <small>— ${r.pct}% of pixels differ (max Δ ${r.maxDelta}), UI state ${r.stateMatches ? 'identical' : 'DIFFERENT'}</small></h2>
<div class="r"><figure><figcaption>prototype</figcaption><img src="prototype-${r.stop}.png"></figure><figure><figcaption>build</figcaption><img src="build-${r.stop}.png"></figure><figure><figcaption>diff</figcaption><img src="diff-${r.stop}.png"></figure></div></section>`).join('\n')}`;
  await writeFile(path.join(out, 'index.html'), html);
} finally {
  await browser.close();
  await server.close();
}
