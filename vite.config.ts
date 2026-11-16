import { defineConfig, type Plugin } from 'vite';
import path from 'node:path';

/**
 * While `npm run dev` is running: any picture added to, changed in or removed from assets/ is
 * converted into public/art/ (see scripts/prep-art.mjs), any recording in assets/audio/ is copied
 * to public/audio/ (scripts/prep-audio.mjs), and the page reloads.
 */
function artPlugin(): Plugin {
  return {
    name: 'catxplorer-art',
    apply: 'serve',
    async configureServer(server) {
      const dir = path.resolve(server.config.root, 'assets') + path.sep;
      // @ts-ignore plain .mjs script, shared with `npm run art`
      const { prepArt } = await import('./scripts/prep-art.mjs');
      // @ts-ignore
      const { prepAudio } = await import('./scripts/prep-audio.mjs');
      let busy: Promise<void> = Promise.resolve();
      const run = () => (busy = busy.then(async () => {
        try {
          const r = await prepArt({ log: (m: string) => server.config.logger.info(m) });
          const a = await prepAudio({ log: (m: string) => server.config.logger.info(m) });
          if (r.changed || a.changed) server.ws.send({ type: 'full-reload' });
        } catch (e) { server.config.logger.warn('art: could not process assets/ — ' + (e as Error).message); }
      }));
      run();
      let timer: ReturnType<typeof setTimeout>;
      const kick = (f: string) => {
        if (!f.startsWith(dir) || !/\.(png|jpe?g|webp|mp3|m4a|ogg|wav)$/i.test(f)) return;
        clearTimeout(timer); timer = setTimeout(run, 500);
      };
      server.watcher.add(dir);
      server.watcher.on('add', kick).on('change', kick).on('unlink', kick);
    },
  };
}

export default defineConfig({
  server: { port: 5173, strictPort: true },
  plugins: [artPlugin()],
});
