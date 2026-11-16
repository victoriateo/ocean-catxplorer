// Copies the recordings in assets/audio/ to public/audio/ and lists them in public/audio/index.json
// (sound name → file), so the site only ever asks for files that exist.
//
//   npm run audio      (`npm run dev` also does this whenever a file in assets/audio/ changes)
//
// A file is matched to a sound by its name without the extension: splash.mp3 → "splash".
// Names the site knows: ambient-surface, ambient-deep, splash, bubble, boop, wheee, whoosh, snap,
// ink, shark, chest, coins, ascend, meow, rumble. Use .mp3, .m4a, .ogg or .wav.
import { mkdir, readdir, copyFile, readFile, writeFile, stat, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'assets', 'audio');
const OUT = path.join(root, 'public', 'audio');
const isAudio = f => /\.(mp3|m4a|ogg|wav)$/i.test(f);

export async function prepAudio({ log = console.log } = {}) {
  await mkdir(OUT, { recursive: true });
  let files = [];
  try { files = (await readdir(SRC)).filter(isAudio).sort(); } catch { /* no assets/audio folder yet */ }
  const index = {}; let changed = false;
  for (const f of files) {
    index[path.parse(f).name] = f;
    const s = await stat(path.join(SRC, f)), o = await stat(path.join(OUT, f)).catch(() => null);
    if (!o || o.mtimeMs < s.mtimeMs || o.size !== s.size) { await copyFile(path.join(SRC, f), path.join(OUT, f)); log(`audio: ${f} → public/audio/${f}  ${(s.size / 1024).toFixed(0)} kB`); changed = true; }
  }
  for (const f of await readdir(OUT)) if (isAudio(f) && !files.includes(f)) { await rm(path.join(OUT, f)); log(`audio: removed ${f} (source deleted)`); changed = true; }
  const json = JSON.stringify(index, null, 2) + '\n';
  const prev = await readFile(path.join(OUT, 'index.json'), 'utf8').catch(() => '');
  if (prev !== json) { await writeFile(path.join(OUT, 'index.json'), json); changed = true; }
  return { list: Object.keys(index), changed };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = await prepAudio();
  console.log(`audio: ${r.list.length} recording(s) available${r.list.length ? ': ' + r.list.join(', ') : ''}`);
}
