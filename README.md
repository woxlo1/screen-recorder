# Screen Recorder (Windows / macOS 対応 画面録画ソフト)

## Phase 3 で追加した内容

- **修正: preloadスクリプトが読み込めない不具合 (ENOENT)**
  - `package.json` の `"type": "module"` の影響で、`vite-plugin-electron` がpreloadを
    ESM形式(`index.mjs`)で出力していたが、`main/index.ts` 側は `index.js` を読みにいく設定の
    ままだったため、起動時に `Unable to load preload script ... ENOENT` で失敗していた
    (Phase 1からの既存バグ)。
  - `vite.config.ts` のpreloadビルド設定に `rollupOptions.output` を追加し、
    出力フォーマットをCommonJS・ファイル名を `index.js` に固定して解消。
- **MP4変換の実装 (FFmpeg)**
  - `fluent-ffmpeg` + `ffmpeg-static`（FFmpeg本体を同梱、別途インストール不要）
  - WebM(VP9/Opus) → MP4(H.264/H.265 + AAC) 変換
  - コーデックは設定画面から選択可能（既定: H.264。互換性重視。H.265は高圧縮・高画質だが
    再生環境によっては非対応な場合があるため、選択式にして既定はH.264のまま）
  - 変換進捗をUIにプログレスバー表示（FFmpegの`progress`イベントを `recorder:conversionProgress`
    でmain→renderer通知。`window.electronAPI.onConversionProgress`で購読）
  - エラーハンドリング: FFmpeg未検出 / 入力ファイル破損 / ディスク容量不足 / 書き込み権限なし
    などを判定し、日本語の分かりやすいメッセージに変換
  - 変換成功後、元のWebM一時ファイルは自動削除（ディスクを圧迫しないように）
- **macOS対応の最終仕上げ**
  - `electron-builder.json` に `asarUnpack` を追加し、FFmpegバイナリをasar外に展開
    （asar内のバイナリはexecできないため、Windows/macOS共通でこの設定が必須）
  - FFmpegバイナリの実パス解決を開発時/パッケージ後の両方で行うユーティリティを追加
    (`src/main/ffmpeg-binary.ts`)
  - 起動時にFFmpegの解決済みパスをログ出力（トラブルシュート用）

## Phase 2 で追加した内容

- **クロスプラットフォーム対応 (Windows / macOS M1含む)**
  - macOSではシステム音声ループバック録音をUI上で自動的に無効化（OS制約のため非対応。理由を表示）
  - macOSの「画面録画」権限が未許可の場合、画面上部に許可手順を表示
  - macOSのマイク権限を明示的にリクエストする仕組み (`systemPreferences`)
  - `electron-builder.json` に macOS (arm64 / x64) 向けのビルド設定 (dmg / zip) を追加
- 解像度・FPS設定を実際の映像トラック制約 (`mandatory` constraints) に反映
- 設定の永続化（`userData/store.json`。再起動後も保存先・FPS・解像度等を保持）
- 録画履歴機能（保存日時・再生時間・ファイルサイズの一覧、ファイルの場所を開く、削除）
- エラーハンドリング強化（権限拒否・録画失敗を日本語の分かりやすいメッセージに変換）

## Phase 1 (MVP) の内容

- デスクトップ全体 / 個別ウィンドウのキャプチャソース選択 (`desktopCapturer`)
- 複数モニター対応
- 録画 開始 / 一時停止 / 再開 / 停止
- マイク音声 / システム音声の ON/OFF
- WebM形式での保存（保存先フォルダ・ファイル名指定）
- 設定画面（保存先 / FPS / 解像度 / ビットレート）
- 型安全なIPC、Node Integration無効・Context Isolation有効・Sandbox有効

## セットアップ

```bash
npm install
```

## 開発モードで起動

```bash
npm run dev
```

## 型チェック / Lint / Format

```bash
npm run typecheck
npm run lint
npm run format
```

## 本番ビルド

```bash
npm run build       # 現在のOS向け
npm run build:win   # Windows (.exe / NSIS)
npm run build:mac   # macOS (.dmg / .zip, arm64 + x64)
```

`release/` フォルダに出力されます。

> **注意:** `build/icon.ico` / `build/icon.icns` はまだ用意していません。
> ビルド前にアプリ用アイコンを配置してください（未配置の場合electron-builderの既定アイコンが使われます）。

> **MP4変換について:** `ffmpeg-static` がOS/アーキテクチャごとのFFmpegバイナリを
> `node_modules`内に同梱するため、追加インストールは不要です。
> ただし `electron-builder.json` の `asarUnpack` 設定により、パッケージ後も
> バイナリがasar外に展開されることが必須です（実行ファイルはasar内から直接exec不可なため）。

## macOSで実行する際の注意点

1. 初回起動時、画面共有のためにmacOSの「システム設定 ＞ プライバシーとセキュリティ ＞ 画面録画」で
   本アプリへのアクセスを許可してください（許可後はアプリの再起動が必要です）。
2. マイクを使う場合も同様に「マイク」の許可が必要です（初回はOS標準の許可ダイアログが出ます）。
3. システム音声の録音はOS標準APIの制約上サポートしていません。
   システム音声も録音したい場合は [BlackHole](https://github.com/ExistentialAudio/BlackHole) 等の
   仮想オーディオデバイスを導入し、マイク入力としてBlackHoleを選択してください（将来的にUIから選択可能にする予定）。
4. 配布用にビルドした `.app` を他のMacで実行する場合、Appleの審査を通さない限り
   Gatekeeperの警告が出ます。社内配布等であれば「control+クリック→開く」で起動できますが、
   一般配布する場合は Apple Developer Program でのコード署名 + notarization が推奨されます
   （`electron-builder.json` の `hardenedRuntime` / `entitlements` は署名前提の設定です）。
5. H.265(HEVC)で書き出したMP4は、古いmacOS/QuickTimeや一部のWindows標準プレイヤーで
   再生できない場合があります。互換性を優先する場合はH.264を選択してください。

## ディレクトリ構成

```
src/
  main/
    index.ts             # エントリーポイント(BrowserWindow生成)
    ipc-handlers.ts       # ipcMain.handle 登録
    capture-sources.ts
    recording-state.ts
    permissions.ts         # macOS権限判定・リクエスト(Phase2)
    persistent-store.ts     # 設定・履歴の永続化(Phase2)
    paths.ts
    ffmpeg-binary.ts          # FFmpegバイナリの実パス解決(Phase3)
    ffmpeg-converter.ts        # WebM→MP4変換ロジック(Phase3)
  preload/
    index.ts               # contextBridge で window.electronAPI を公開
  renderer/
    main.tsx / App.tsx
    features/
      recorder/             # 録画ロジック・UI (ConversionProgressBarはPhase3)
      audio/                 # 音声設定UI
      settings/               # 設定画面(保存形式・コーデック選択はPhase3)
      history/                 # 録画履歴パネル(Phase2)
    hooks/
      useAppBootstrap.ts       # 起動時の設定/履歴ロード・変換進捗購読(Phase2/3)
    store/
      recorderStore.ts          # Zustand
    types/
      global.d.ts
  shared/
    types.ts                    # 全プロセス共有の型
    ipc-contract.ts               # IPCチャンネル定義(型安全)
```


