import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        vite: {
          build: {
            outDir: 'dist-electron/main',
            // Build the main process as CommonJS.
            // With "type": "module" in package.json, vite-plugin-electron automatically
            // forces build.lib.formats to ["es"], so the library-mode formats must be
            // explicitly overridden back to CJS here (rollupOptions.output.format alone
            // doesn't take effect, since it gets overridden by lib mode's formats).
            // Several dependencies (fluent-ffmpeg, ffmpeg-static, electron-updater)
            // internally rely on __dirname under a CJS assumption, and would fail at
            // runtime with "__dirname is not defined" if left as ESM output, so this
            // override is required.
            //
            // In addition, Node.js/Electron decides ESM vs. CJS purely from "file
            // extension + the package.json `type` field", not from the file's actual
            // content. So even though the emitted code is CJS, leaving the extension as
            // `.js` would still trigger "require is not defined in ES module scope"
            // because of the "type": "module" setting in package.json.
            // To avoid that, the output file's extension itself is pinned to `.cjs`
            // (the `.cjs` extension is always treated as CommonJS regardless of the
            // package.json `type` setting).
            lib: {
              entry: 'src/main/index.ts',
              formats: ['cjs'],
              fileName: () => 'index.cjs',
            },
            rollupOptions: {
              // Keep ffmpeg-static / fluent-ffmpeg / electron-updater out of the bundle
              // and let them be require()'d from node_modules at runtime instead.
              // These packages internally use `__dirname` to resolve paths (binaries,
              // preset folders, their own config files) relative to their own package
              // directory under node_modules. If they were bundled, that `__dirname`
              // would end up pointing at the bundle's own output location
              // (dist-electron/main) instead, causing them to resolve the wrong path
              // (e.g. "FFmpeg executable not found").
              external: ['ffmpeg-static', 'fluent-ffmpeg', 'electron-updater'],
            },
          },
        },
      },
      preload: {
        input: path.join(__dirname, 'src/preload/index.ts'),
        vite: {
          build: {
            outDir: 'dist-electron/preload',
            // Pin the preload output to `.cjs` too, for the same reason as above.
            // main/index.ts needs to reference a `.cjs` path, so the output is kept
            // consistent with that here.
            rollupOptions: {
              output: {
                format: 'cjs',
                entryFileNames: 'index.cjs',
              },
            },
          },
        },
      },
      renderer: {},
    }),
  ],
  resolve: {
    alias: {
      '@main': path.resolve(__dirname, 'src/main'),
      '@preload': path.resolve(__dirname, 'src/preload'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  build: {
    outDir: 'dist',
  },
});
