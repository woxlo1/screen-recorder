# Screen Recorder (Screen recording app for Windows / macOS)

## Added in the i18n update

- **UI language switcher (English / Japanese)**
  - Added a renderer-side i18n system (`src/renderer/i18n`) with English and
    Japanese dictionaries, a `useTranslation()` hook for components, and a
    `translate()` helper for plain TS modules (recorder controllers) that
    throw user-facing errors.
  - The selected language is stored as `AppSettings.language` and persisted
    via the existing settings save/load flow, so it's remembered across
    restarts. Default language is English.
  - A language toggle button is available in the app header, and a dedicated
    language section is available on the Settings screen.
  - Main-process user-facing strings (IPC error messages, the folder-select
    dialog title, FFmpeg error translations, capture-source fallback names)
    are also localized via `src/main/messages.ts`, which reads the current
    language directly from the persisted settings store.
  - Recording-history date formatting now follows the selected language's
    locale instead of being hardcoded to `ja-JP`.
- All source comments and internal/log-only strings across `main`, `preload`,
  `renderer`, and `shared` were translated from Japanese to English.

## Added in Phase 3

- **Fix: preload script failed to load (ENOENT)**
  - Because of `"type": "module"` in `package.json`, `vite-plugin-electron`
    was emitting the preload script in ESM format (`index.mjs`), while
    `main/index.ts` was still configured to load `index.js` — causing
    `Unable to load preload script ... ENOENT` on startup (a pre-existing
    bug from Phase 1).
  - Fixed by adding `rollupOptions.output` to the preload build config in
    `vite.config.ts`, pinning the output format to CommonJS and the file
    name to `index.js`.
- **MP4 conversion (FFmpeg)**
  - `fluent-ffmpeg` + `ffmpeg-static` (bundles the FFmpeg binary itself, no
    separate installation required).
  - Converts WebM (VP9/Opus) → MP4 (H.264/H.265 + AAC).
  - Codec is selectable from the settings screen (default: H.264, for
    compatibility. H.265 offers higher compression and quality but isn't
    supported by every playback environment, so it's left selectable with
    H.264 as the default).
  - Conversion progress is shown in the UI as a progress bar (FFmpeg's
    `progress` event is forwarded from main to renderer via
    `recorder:conversionProgress`, subscribed to with
    `window.electronAPI.onConversionProgress`).
  - Error handling: detects cases such as FFmpeg not found, corrupted input
    file, insufficient disk space, or missing write permission, and converts
    them into clear, localized messages.
  - The original temporary WebM file is automatically deleted after a
    successful conversion (to avoid using up disk space).
- **macOS support finalization**
  - Added `asarUnpack` to `electron-builder.json` so the FFmpeg binary is
    extracted outside of the asar archive (binaries inside asar can't be
    executed, so this setting is required on both Windows and macOS).
  - Added a utility that resolves the real path of the FFmpeg binary both in
    development and after packaging (`src/main/ffmpeg-binary.ts`).
  - Logs the resolved FFmpeg path on startup (for troubleshooting).

## Added in Phase 2

- **Cross-platform support (Windows / macOS, including Apple Silicon)**
  - On macOS, system-audio loopback recording is automatically disabled in
    the UI (unsupported due to OS constraints; the reason is shown).
  - If macOS's "Screen Recording" permission hasn't been granted, the
    permission steps are shown at the top of the screen.
  - Explicitly requests macOS microphone permission (`systemPreferences`).
  - Added macOS (arm64 / x64) build configuration (dmg / zip) to
    `electron-builder.json`.
- Resolution/FPS settings are now reflected in the actual video track
  constraints (`mandatory` constraints).
- Settings are now persisted (`userData/store.json`); output folder, FPS,
  resolution, etc. are retained across restarts.
- Recording history feature (list of saved date/time, duration, and file
  size; open file location; delete).
- Improved error handling (permission denial and recording failures are
  converted into clear, localized messages).

## Phase 1 (MVP) contents

- Choose a capture source: the entire desktop or an individual window
  (`desktopCapturer`).
- Multi-monitor support.
- Start / pause / resume / stop recording.
- Microphone audio / system audio ON/OFF.
- Save as WebM (configurable output folder and file name).
- Settings screen (output folder / FPS / resolution / bitrate).
- Type-safe IPC, with Node Integration disabled, Context Isolation enabled,
  and Sandbox enabled.

## Setup

```bash
npm install
```

## Run in development mode

```bash
npm run dev
```

## Typecheck / Lint / Format

```bash
npm run typecheck
npm run lint
npm run format
```

## Production build

```bash
npm run build       # for the current OS
npm run build:win   # Windows (.exe / NSIS)
npm run build:mac   # macOS (.dmg / .zip, arm64 + x64)
```

Output is written to the `release/` folder.

> **Note:** `build/icon.ico` / `build/icon.icns` are not provided yet.
> Place your app icon before building (electron-builder's default icon will
> be used otherwise).

> **About MP4 conversion:** `ffmpeg-static` bundles the FFmpeg binary for
> each OS/architecture inside `node_modules`, so no separate installation is
> required. However, the `asarUnpack` setting in `electron-builder.json` is
> required to ensure the binary is extracted outside of asar even after
> packaging (executables inside asar can't be exec'd directly).

## Notes for running on macOS

1. On first launch, grant this app access under macOS's
   "System Settings > Privacy & Security > Screen Recording" so it can
   share the screen (you'll need to restart the app after granting access).
2. Using the microphone likewise requires "Microphone" permission (the OS's
   standard permission dialog will appear the first time).
3. Recording system audio is not supported, due to OS API constraints.
   If you also want to record system audio, install a virtual audio device
   such as [BlackHole](https://github.com/ExistentialAudio/BlackHole) and
   select it as the microphone input (selecting it from the UI directly is
   planned for the future).
4. If you distribute a built `.app` to other Macs without going through
   Apple's review process, Gatekeeper will show a warning. For internal
   distribution, it can still be launched via "control+click > Open", but
   for general distribution, code signing + notarization through the Apple
   Developer Program is recommended (the `hardenedRuntime` / `entitlements`
   settings in `electron-builder.json` assume signing will be done).
5. MP4 files exported with H.265 (HEVC) may not play back on older
   macOS/QuickTime versions or on some standard Windows players. Choose
   H.264 if compatibility is a priority.

## Directory structure

```
src/
  main/
    index.ts                  # Entry point (creates the BrowserWindow)
    ipc-handlers.ts            # Registers ipcMain.handle handlers
    capture-sources.ts
    recording-state.ts
    permissions.ts              # macOS permission checks/requests (Phase 2)
    persistent-store.ts          # Settings/history persistence (Phase 2)
    paths.ts
    ffmpeg-binary.ts               # Resolves the real FFmpeg binary path (Phase 3)
    ffmpeg-converter.ts             # WebM -> MP4 conversion logic (Phase 3)
    messages.ts                      # Localized main-process strings (i18n update)
  preload/
    index.ts                     # Exposes window.electronAPI via contextBridge
  renderer/
    main.tsx / App.tsx
    features/
      recorder/                  # Recording logic/UI (ConversionProgressBar is Phase 3)
      audio/                      # Audio settings UI
      settings/                    # Settings screen (format/codec selection is Phase 3;
                                     # LanguageSwitcher is the i18n update)
      history/                      # Recording history panel (Phase 2)
    i18n/                           # Translation dictionaries, useTranslation()/translate() (i18n update)
    hooks/
      useAppBootstrap.ts            # Loads settings/history on startup, subscribes to
                                      # conversion progress (Phase 2/3)
    store/
      recorderStore.ts               # Zustand
    types/
      global.d.ts
  shared/
    types.ts                         # Types shared across all processes
    ipc-contract.ts                    # IPC channel definitions (type-safe)
```