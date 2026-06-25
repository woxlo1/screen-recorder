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
        entry: 'src/main/index.ts',
        vite: {
          build: {
            outDir: 'dist-electron/main',
          },
        },
      },
      preload: {
        input: path.join(__dirname, 'src/preload/index.ts'),
        vite: {
          build: {
            outDir: 'dist-electron/preload',
            // preloadはElectronのsandboxプロセスでCommonJSとして読み込まれる前提のため、
            // package.jsonの "type": "module" の影響で .mjs(ESM) 出力にならないよう明示的にCJS固定する。
            // main/index.ts側で `.js` 拡張子のパスを指定しているため、出力もここで `.js` に揃える。
            rollupOptions: {
              output: {
                format: 'cjs',
                entryFileNames: 'index.js',
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
