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
            // mainプロセスはCommonJSとしてビルドする。
            // package.jsonの "type": "module" の場合、vite-plugin-electronは
            // build.lib.formats を自動的に ["es"] にしてしまうため、Library Mode の
            // formats を明示的に上書きしてCJSに固定する必要がある
            // (rollupOptions.output.format だけではlib modeのformatsに上書きされて効かない)。
            // 依存パッケージ(fluent-ffmpeg, ffmpeg-static)がCJS前提で内部的に __dirname を
            // 参照している箇所があり、ESM出力のままだと「__dirname is not defined」で
            // 実行時エラーになるため、この対処が必須。
            //
            // さらに、Node.js/Electronは「ファイルの中身」ではなく「拡張子 + package.jsonの
            // type フィールド」だけでESM/CJSを判定するため、中身がCJSコードでも拡張子が
            // `.js` のままだと package.json の "type": "module" の影響で
            // 「require is not defined in ES module scope」になる。
            // これを避けるため出力ファイル自体の拡張子を `.cjs` に固定する
            // (拡張子 `.cjs` は package.json の type 設定に関わらず常にCommonJSとして扱われる)。
            lib: {
              entry: 'src/main/index.ts',
              formats: ['cjs'],
              fileName: () => 'index.cjs',
            },
          },
        },
      },
      preload: {
        input: path.join(__dirname, 'src/preload/index.ts'),
        vite: {
          build: {
            outDir: 'dist-electron/preload',
            // preloadも同じ理由で `.cjs` に固定する。
            // main/index.ts側で `.cjs` 拡張子のパスを指定する必要があるため、出力もここで揃える。
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
