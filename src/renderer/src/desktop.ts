/**
 * Tauri implementation of the desktop bridge.
 *
 * The renderer was written against Electron's `window.desktop` preload API.
 * This module provides the exact same surface backed by Tauri commands and
 * events, so the UI layer stays untouched.
 */
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import type { UnlistenFn } from '@tauri-apps/api/event'
import type {
  AppSettings,
  DesktopApi,
  ExportImageOptions,
  ExportPdfOptions,
  OpenFileResult,
  RecentFile,
  SaveFileResult,
  UserConfig
} from '@shared/types'

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/** UTF-8 safe base64 for small metadata carried in IPC headers. */
function encodeMeta(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function rawBytes(body: string | Uint8Array): Uint8Array {
  return typeof body === 'string' ? new TextEncoder().encode(body) : body
}

function toBytes(raw: ArrayBuffer | Uint8Array | number[]): Uint8Array {
  if (raw instanceof Uint8Array) return raw
  if (raw instanceof ArrayBuffer) return new Uint8Array(raw)
  return new Uint8Array(raw)
}

function onEvent<T>(name: string, callback: (payload: T) => void): () => void {
  let disposed = false
  let unlisten: UnlistenFn | undefined
  // Scoped to this window: menu/file events must never leak to other windows.
  void getCurrentWebviewWindow()
    .listen<T>(name, (event) => callback(event.payload))
    .then((stop) => {
      if (disposed) stop()
      else unlisten = stop
    })
    .catch(() => undefined)
  return () => {
    disposed = true
    unlisten?.()
  }
}

const filtersMeta = (filters: { name: string; extensions: string[] }[]): string => encodeMeta(JSON.stringify(filters))

function createApi(): DesktopApi {
  const saveRaw = (command: string, data: Uint8Array, headers: Record<string, string>): Promise<SaveFileResult> =>
    invoke<SaveFileResult>(command, data, { headers })

  return {
    async openWorkbook(): Promise<OpenFileResult> {
      const info = await invoke<{ canceled: boolean; filePath?: string }>('dialog_open_workbook')
      if (info.canceled || !info.filePath) return { canceled: true }
      const data = await invoke<ArrayBuffer>('read_file_raw', { path: info.filePath })
      return { canceled: false, filePath: info.filePath, data: toBytes(data) }
    },

    async pickFile(filters): Promise<OpenFileResult> {
      const info = await invoke<{ canceled: boolean; filePath?: string }>('dialog_pick_file', { filters })
      if (info.canceled || !info.filePath) return { canceled: true }
      const data = await invoke<ArrayBuffer>('read_file_raw', { path: info.filePath })
      return { canceled: false, filePath: info.filePath, data: toBytes(data) }
    },

    async readFile(path): Promise<OpenFileResult> {
      try {
        const data = await invoke<ArrayBuffer>('read_workbook_raw', { path })
        return { canceled: false, filePath: path, data: toBytes(data) }
      } catch {
        return { canceled: true }
      }
    },

    onOpenPath(callback): () => void {
      const stop = onEvent<string>('file:open-path', callback)
      void invoke<string[]>('take_pending_open_paths')
        .then((paths) => paths.forEach(callback))
        .catch(() => undefined)
      return stop
    },

    saveWorkbook(data, currentPath): Promise<SaveFileResult> {
      const headers: Record<string, string> = {}
      if (currentPath) headers['x-target-path'] = encodeMeta(currentPath)
      return saveRaw('save_workbook_raw', data, headers)
    },

    saveWorkbookAs(data, defaultName): Promise<SaveFileResult> {
      return saveRaw('save_workbook_raw', data, { 'x-default-name': encodeMeta(defaultName) })
    },

    exportBinary(data, defaultName, filters): Promise<SaveFileResult> {
      return saveRaw('export_binary_raw', data, {
        'x-default-name': encodeMeta(defaultName),
        'x-filters': filtersMeta(filters)
      })
    },

    exportText(text, defaultName, filters): Promise<SaveFileResult> {
      return saveRaw('export_text_raw', rawBytes(text), {
        'x-default-name': encodeMeta(defaultName),
        'x-filters': filtersMeta(filters)
      })
    },

    exportImage(opts: ExportImageOptions): Promise<SaveFileResult> {
      return saveRaw('export_image_raw', rawBytes(opts.data), {
        'x-format': opts.format,
        'x-default-name': encodeMeta(opts.defaultName)
      })
    },

    exportPdf(opts: ExportPdfOptions): Promise<SaveFileResult> {
      return saveRaw('export_pdf_raw', rawBytes(opts.html), {
        'x-default-name': encodeMeta(opts.defaultName),
        'x-landscape': opts.landscape ? '1' : '0'
      })
    },

    print(html: string): Promise<boolean> {
      return invoke<boolean>('print_html_raw', rawBytes(html))
    },

    onMenuAction(callback): () => void {
      const stop = onEvent<string>('menu:action', callback)
      void invoke<string[]>('take_pending_actions')
        .then((actions) => actions.forEach(callback))
        .catch(() => undefined)
      return stop
    },

    getRecentFiles(): Promise<RecentFile[]> {
      return invoke<RecentFile[]>('recent_get')
    },

    addRecentFile(path): Promise<void> {
      return invoke<void>('recent_add', { path })
    },

    getSettings(): Promise<AppSettings> {
      return invoke<AppSettings>('settings_get')
    },

    saveSettings(settings): Promise<AppSettings> {
      return invoke<AppSettings>('settings_save', { patch: settings })
    },

    getUserConfig(): Promise<UserConfig | null> {
      return invoke<UserConfig | null>('user_config_get')
    },

    saveUserConfig(config: UserConfig): Promise<string> {
      return invoke<string>('user_config_save', { config })
    },

    setLanguage(language): Promise<void> {
      return invoke<void>('set_menu_language', { language })
    },

    newWindow(): Promise<void> {
      return invoke<void>('new_window')
    },

    showItemInFolder(path): Promise<void> {
      return invoke<void>('show_item_in_folder', { path })
    },

    readClipboardImage(): Promise<string | undefined> {
      return invoke<string | null>('read_clipboard_image').then((value) => value ?? undefined)
    },

    getAppInfo(): Promise<{ platform: string; version: string }> {
      return invoke<{ platform: string; version: string }>('app_info')
    },

    listFonts(): Promise<string[]> {
      return invoke<string[]>('list_font_families')
    },

    setDirty(dirty: boolean): void {
      void invoke('set_dirty', { dirty }).catch(() => undefined)
    },

    confirmClose(): void {
      void invoke('confirm_close').catch(() => undefined)
    },

    onRequestClose(callback): () => void {
      return onEvent<null>('app:request-close', () => callback())
    }
  }
}

/** Tell the Rust host that all renderer listeners have been installed. */
export function markReady(): void {
  if (!isTauri()) return
  void invoke('app_ready').catch(() => undefined)
}

if (isTauri()) {
  window.desktop = createApi()
}
