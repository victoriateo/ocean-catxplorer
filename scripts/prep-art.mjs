// Turns the paintings in assets/ into small web-ready files in public/art/.
//
//   npm run art            → processes anything new or changed
//   npm run art -- --all   → redoes everything
//
// For each PNG/JPG/WebP in assets/ it:
//   1. cuts away a flat background if the picture has no transparency of its own
//      (the same job as Finder → Quick Actions → Remove Background),
//   2. shrinks it to at most MAX_SIDE pixels on the long side,
//   3. saves public/art/<name>.webp and lists it in public/art/index.json.
// The originals in assets/ are never changed. `npm run dev` runs this automatically
// whenever a file in assets/ is added or changed.
import { chromium } from 'playwright';
import { mkdir, readdir, readFile, writeFile, stat, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'assets');
const OUT = path.join(root, 'public', 'art');

const MAX_SIDE = 1024;      // px, long side of the saved file
const QUALITY = .9;         // WebP quality
const BG_TOLERANCE = 30;    // how far (0–255) a pixel may be from the background colour and still count as background
const BG_FEATHER = 26;      // extra range over which the edge fades out, so there is no grey fringe
const WIDE = /^(bg-)/;      // full-bleed backgrounds: never cut out

const isImage = f => /\.(png|jpe?g|webp)$/i.test(f);
const mime = f => (/\.png$/i.test(f) ? 'image/png' : /\.webp$/i.test(f) ? 'image/webp' : 'image/jpeg');

// Runs inside the browser page.
async function processInPage({ src, maxSide, quality, tol, feather, allowCut }) {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('could not read image')); img.src = src; });
  const w = img.naturalWidth, h = img.naturalHeight;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
  const im = x.getImageData(0, 0, w, h), d = im.data;
  // does it already have transparency?
  let clear = 0; const step = Math.max(1, Math.floor(w * h / 40000));
  for (let p = 0; p < w * h; p += step) if (d[p * 4 + 3] < 250) clear++;
  let cut = false;
  if (!clear && allowCut) {
    // background colour = median of the border pixels
    const br = [], bgc = [], bb = [];
    const take = (px, py) => { const i = (py * w + px) * 4; br.push(d[i]); bgc.push(d[i + 1]); bb.push(d[i + 2]); };
    for (let px = 0; px < w; px += 4) { take(px, 0); take(px, h - 1); }
    for (let py = 0; py < h; py += 4) { take(0, py); take(w - 1, py); }
    const med = a => a.sort((p, q) => p - q)[a.length >> 1];
    const R = med(br), G = med(bgc), B = med(bb);
    const dist = i => Math.max(Math.abs(d[i] - R), Math.abs(d[i + 1] - G), Math.abs(d[i + 2] - B));
    // flood-fill inwards from the border through background-coloured pixels.
    // state: 0 = untouched (subject), 1 = background, 2 = soft edge
    const state = new Uint8Array(w * h), stack = new Int32Array(w * h); let sp = 0;
    const push = p => { if (!state[p] && dist(p * 4) <= tol) { state[p] = 1; stack[sp++] = p; } };
    for (let px = 0; px < w; px++) { push(px); push((h - 1) * w + px); }
    for (let py = 0; py < h; py++) { push(py * w); push(py * w + w - 1); }
    while (sp) {
      const p = stack[--sp], px = p % w;
      if (px > 0) push(p - 1); if (px < w - 1) push(p + 1);
      if (p >= w) push(p - w); if (p < w * (h - 1)) push(p + w);
    }
    // soft edge: walk a few pixels further in through pixels that are still close to the background
    let frontier = [];
    for (let p = 0; p < w * h; p++) if (state[p] === 1) {
      const px = p % w;
      if ((px > 0 && !state[p - 1]) || (px < w - 1 && !state[p + 1]) || (p >= w && !state[p - w]) || (p < w * (h - 1) && !state[p + w])) frontier.push(p);
    }
    for (let ring = 0; ring < 3 && frontier.length; ring++) {
      const next = [];
      for (const p of frontier) {
        const px = p % w;
        for (const q of [px > 0 ? p - 1 : -1, px < w - 1 ? p + 1 : -1, p >= w ? p - w : -1, p < w * (h - 1) ? p + w : -1]) {
          if (q < 0 || state[q]) continue;
          if (dist(q * 4) <= tol + feather) { state[q] = 2; next.push(q); }
        }
      }
      frontier = next;
    }
    for (let p = 0; p < w * h; p++) {
      const i = p * 4;
      if (state[p] === 1) d[i + 3] = 0;
      else if (state[p] === 2) {
        const a = Math.min(1, Math.max(0, (dist(i) - tol * .5) / (feather + tol * .5)));
        // remove the background's share of the colour so the edge doesn't keep a grey halo
        if (a > .02) { d[i] = Math.max(0, Math.min(255, (d[i] - R * (1 - a)) / a)); d[i + 1] = Math.max(0, Math.min(255, (d[i + 1] - G * (1 - a)) / a)); d[i + 2] = Math.max(0, Math.min(255, (d[i + 2] - B * (1 - a)) / a)); }
        d[i + 3] = Math.round(a * 255);
      }
    }
    x.putImageData(im, 0, 0); cut = true;
  }
  const k = Math.min(1, maxSide / Math.max(w, h));
  const ow = Math.round(w * k), oh = Math.round(h * k);
  // step down in halves for a cleaner result than one big shrink
  let cur = c, cw = w, ch = h;
  while (cw / 2 > ow) {
    const n = document.createElement('canvas'); n.width = cw = Math.round(cw / 2); n.height = ch = Math.round(ch / 2);
    const nx = n.getContext('2d'); nx.imageSmoothingQuality = 'high'; nx.drawImage(cur, 0, 0, cw, ch); cur = n;
  }
  const o = document.createElement('canvas'); o.width = ow; o.height = oh;
  const oxx = o.getContext('2d'); oxx.imageSmoothingQuality = 'high'; oxx.drawImage(cur, 0, 0, ow, oh);
  return { url: o.toDataURL('image/webp', quality), w: ow, h: oh, cut, hadAlpha: !!clear };
}

export async function prepArt({ all = false, log = console.log } = {}) {
  await mkdir(OUT, { recursive: true });
  let files = [];
  try { files = (await readdir(SRC)).filter(isImage).sort(); } catch { /* no assets folder yet */ }
  const names = new Map();   // name → source file
  for (const f of files) names.set(path.parse(f).name, f);
  const todo = [];
  for (const [name, f] of names) {
    const out = path.join(OUT, name + '.webp');
    const s = await stat(path.join(SRC, f)), o = await stat(out).catch(() => null);
    if (all || !o || o.mtimeMs < s.mtimeMs) todo.push([name, f]);
  }
  // remove outputs whose source has gone
  let removed = 0;
  for (const f of await readdir(OUT)) if (f.endsWith('.webp') && !names.has(path.parse(f).name)) { await rm(path.join(OUT, f)); removed++; log(`art: removed ${f} (source deleted)`); }
  if (todo.length) {
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      for (const [name, f] of todo) {
        const buf = await readFile(path.join(SRC, f));
        const res = await page.evaluate(processInPage, { src: `data:${mime(f)};base64,${buf.toString('base64')}`, maxSide: MAX_SIDE, quality: QUALITY, tol: BG_TOLERANCE, feather: BG_FEATHER, allowCut: !WIDE.test(name) });
        const data = Buffer.from(res.url.split(',')[1], 'base64');
        await writeFile(path.join(OUT, name + '.webp'), data);
        log(`art: ${f} → public/art/${name}.webp  ${res.w}×${res.h}, ${(data.length / 1024).toFixed(0)} kB${res.cut ? '  (background cut away automatically)' : ''}`);
      }
    } finally { await browser.close(); }
  }
  const list = [...names.keys()];
  const index = JSON.stringify(list, null, 2) + '\n';
  const prev = await readFile(path.join(OUT, 'index.json'), 'utf8').catch(() => '');
  if (prev !== index) await writeFile(path.join(OUT, 'index.json'), index);
  return { processed: todo.map(t => t[0]), list, changed: todo.length > 0 || removed > 0 || prev !== index };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = await prepArt({ all: process.argv.includes('--all') });
  console.log(r.processed.length ? `art: ${r.processed.length} file(s) processed, ${r.list.length} available` : `art: nothing new, ${r.list.length} available`);
}
