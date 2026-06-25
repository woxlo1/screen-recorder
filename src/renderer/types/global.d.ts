import type { ElectronAPI } from '../../preload/index';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// このファイルをモジュールとして扱うための空export
export {};
