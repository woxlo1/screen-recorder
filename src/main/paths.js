import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
/**
 * 録画完了直後の一時WebMファイルを置くディレクトリ。
 * アプリの userData 配下に作ることで、OSの一時フォルダ掃除等の影響を受けにくくする。
 */
export function getTempRecordingDir() {
    const dir = path.join(app.getPath('userData'), 'temp-recordings');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}
/** デフォルトの保存先（Windowsの「ビデオ」フォルダ配下に専用フォルダを作る） */
export function getDefaultOutputDir() {
    const dir = path.join(app.getPath('videos'), 'ScreenRecorder');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}
/** 一時ファイル用のユニークなファイルパスを生成する */
export function createTempFilePath(extension) {
    const fileName = `rec-${Date.now()}.${extension}`;
    return path.join(getTempRecordingDir(), fileName);
}
/** ファイルサイズ(バイト)を取得する。失敗時はundefinedを返す(履歴表示はベストエフォート) */
export function getFileSizeSafe(filePath) {
    try {
        return fs.statSync(filePath).size;
    }
    catch {
        return undefined;
    }
}
