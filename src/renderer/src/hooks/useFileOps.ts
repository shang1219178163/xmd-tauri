import { useEffect } from 'react'
import mammoth from 'mammoth'
import { createEmptyWorkbook, createStarterWorkbook } from '@shared/defaults'
import type { Workbook } from '@shared/types'
import type { FileAction } from '../actions'
import { applyTheme } from '../actions'
import { readXmind, writeXmind } from '../file/xmind'
import { markdownToWorkbook, workbookToMarkdown } from '../file/markdown'
import { opmlToWorkbook, workbookToOpml } from '../file/opml'
import { htmlToOutline } from '../file/word'
import {
  exportPdf,
  sheetToSvg,
  svgToPngDataUrl,
  workbookToDocx,
  workbookToPlainText,
  workbookToPptx,
  workbookToXlsx
} from '../export'
import { useMapStore } from '../store/mapStore'
import { useUiStore } from '../store/uiStore'
import { runOrConfirm } from '../store/guard'

function safeName(name: string, extension: string): string {
  return `${name.replace(/[\\/:*?"<>|]/g, '-').trim() || 'Untitled'}.${extension}`
}

function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return `data:${mime};base64,${btoa(binary)}`
}

async function writeExport(bytes: Uint8Array, name: string, filters: { name: string; extensions: string[] }[]) {
  if (!window.desktop) return
  const result = await window.desktop.exportBinary(bytes, name, filters)
  if (!result.canceled) useUiStore.getState().toast(`已导出到 ${result.filePath}`, 'success')
}

async function writeTextExport(text: string, name: string, filters: { name: string; extensions: string[] }[]) {
  if (!window.desktop) return
  const result = await window.desktop.exportText(text, name, filters)
  if (!result.canceled) useUiStore.getState().toast(`已导出到 ${result.filePath}`, 'success')
}

export async function saveCurrentWorkbook(saveAs = false): Promise<boolean> {
  const store = useMapStore.getState()
  const ui = useUiStore.getState()
  if (!window.desktop) return false
  try {
    store.setStatus('正在保存…')
    const bytes = await writeXmind(store.workbook)
    const sheetName = store.getActiveSheet().title || store.fileName.replace(/\.xmind$/i, '') || 'Mind Map'
    const result =
      saveAs || !store.filePath
        ? await window.desktop.saveWorkbookAs(bytes, safeName(sheetName, 'xmind'))
        : await window.desktop.saveWorkbook(bytes, store.filePath)
    if (result.canceled) {
      store.setStatus('')
      return false
    }
    store.markSaved(result.filePath)
    return true
  } catch (error) {
    ui.toast(`保存失败：${(error as Error).message}`, 'error')
    console.error(error)
    return false
  }
}

export function useFileOps(): void {
  const settings = useMapStore((s) => s.settings)

  useEffect(() => {
    const getSheetName = () => {
      const store = useMapStore.getState()
      return store.getActiveSheet().title || store.fileName.replace(/\.xmind$/i, '') || 'Mind Map'
    }

    const save = async (saveAs = false): Promise<void> => {
      const ok = await saveCurrentWorkbook(saveAs)
      if (ok) useUiStore.getState().toast('已保存', 'success')
    }

    const open = async (path?: string): Promise<void> => {
      const store = useMapStore.getState()
      const ui = useUiStore.getState()
      if (!window.desktop) return
      try {
        const result = path ? await window.desktop.readFile(path) : await window.desktop.openWorkbook()
        if (result.canceled || !result.data) return
        const workbook = await readXmind(result.data)
        runOrConfirm(() => {
          store.loadWorkbook(workbook, result.filePath)
          window.setTimeout(() => window.dispatchEvent(new CustomEvent('xmind:fit')), 40)
          ui.toast('已打开文件', 'success')
        })
      } catch (error) {
        ui.toast(`打开失败：${(error as Error).message}`, 'error')
        console.error(error)
      }
    }

    const newWorkbook = (workbook: Workbook) => {
      const store = useMapStore.getState()
      store.reset(workbook)
      window.setTimeout(() => window.dispatchEvent(new CustomEvent('xmind:fit')), 40)
    }

    const applyTemplate = (workbook: Workbook) => {
      newWorkbook(workbook)
      applyTheme()
    }

    const exportPng = async () => {
      const ui = useUiStore.getState()
      if (!window.desktop) return
      try {
        const store = useMapStore.getState()
        const { svg, width, height } = sheetToSvg(store.workbook)
        const data = await svgToPngDataUrl(svg, width, height, 2)
        const result = await window.desktop.exportImage({
          format: 'png',
          data,
          defaultName: safeName(getSheetName(), 'png')
        })
        if (!result.canceled) ui.toast('PNG 已导出', 'success')
      } catch (error) {
        ui.toast(`导出失败：${(error as Error).message}`, 'error')
      }
    }

    const exportSvg = async () => {
      const ui = useUiStore.getState()
      if (!window.desktop) return
      try {
        const store = useMapStore.getState()
        const { svg } = sheetToSvg(store.workbook)
        const result = await window.desktop.exportImage({ format: 'svg', data: svg, defaultName: safeName(getSheetName(), 'svg') })
        if (!result.canceled) ui.toast('SVG 已导出', 'success')
      } catch (error) {
        ui.toast(`导出失败：${(error as Error).message}`, 'error')
      }
    }

    const print = async () => {
      const ui = useUiStore.getState()
      if (!window.desktop) return
      try {
        const store = useMapStore.getState()
        const { svg } = sheetToSvg(store.workbook)
        const html = `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:auto;margin:12mm}body{margin:0;display:flex;align-items:center;justify-content:center}svg{max-width:100%;height:auto}</style></head><body>${svg}</body></html>`
        const ok = await window.desktop.print(html)
        if (ok) ui.toast('打印任务已发送', 'success')
      } catch (error) {
        ui.toast(`打印失败：${(error as Error).message}`, 'error')
      }
    }

    const importMarkdownFile = async () => {
      const ui = useUiStore.getState()
      if (!window.desktop) return
      const result = await window.desktop.pickFile([
        { name: 'Markdown', extensions: ['md', 'markdown', 'txt'] },
        { name: 'All Files', extensions: ['*'] }
      ])
      if (result.canceled || !result.data) return
      const text = new TextDecoder().decode(result.data)
      const workbook = markdownToWorkbook(text)
      runOrConfirm(() => {
        applyTemplate(workbook)
        ui.toast('Markdown 已导入', 'success')
      })
    }

    const importOpmlFile = async () => {
      const ui = useUiStore.getState()
      if (!window.desktop) return
      const result = await window.desktop.pickFile([{ name: 'OPML', extensions: ['opml', 'xml'] }])
      if (result.canceled || !result.data) return
      const text = new TextDecoder().decode(result.data)
      const workbook = opmlToWorkbook(text)
      runOrConfirm(() => {
        applyTemplate(workbook)
        ui.toast('OPML 已导入', 'success')
      })
    }

    const importWordFile = async () => {
      const ui = useUiStore.getState()
      if (!window.desktop) return
      const result = await window.desktop.pickFile([{ name: 'Word Document', extensions: ['docx'] }])
      if (result.canceled || !result.data) return
      const arrayBuffer = result.data.buffer.slice(result.data.byteOffset, result.data.byteOffset + result.data.byteLength)
      const converted = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer as ArrayBuffer })
      const workbook = markdownToWorkbook(htmlToOutline(converted.value))
      runOrConfirm(() => {
        applyTemplate(workbook)
        ui.toast('Word 文档已导入', 'success')
      })
    }

    const run = async (action: FileAction) => {
      const ui = useUiStore.getState()
      const store = useMapStore.getState()
      switch (action) {
        case 'new-map':
          runOrConfirm(() => {
            newWorkbook(createEmptyWorkbook())
            ui.toast('已新建空白图')
          })
          break
        case 'new-starter':
          runOrConfirm(() => newWorkbook(createStarterWorkbook()))
          break
        case 'new-template':
          ui.openDialog('template')
          break
        case 'open':
          await open()
          break
        case 'save':
          await save(false)
          break
        case 'save-as':
          await save(true)
          break
        case 'export-png':
          await exportPng()
          break
        case 'export-svg':
          await exportSvg()
          break
        case 'export-pdf':
          try {
            ui.setExporting(true)
            await exportPdf(store.workbook, safeName(getSheetName(), 'pdf'))
          } catch (error) {
            ui.toast(`导出失败：${(error as Error).message}`, 'error')
          } finally {
            ui.setExporting(false)
          }
          break
        case 'export-markdown':
          await writeTextExport(workbookToMarkdown(store.workbook), safeName(getSheetName(), 'md'), [
            { name: 'Markdown', extensions: ['md'] }
          ])
          break
        case 'export-text':
          await writeTextExport(workbookToPlainText(store.workbook), safeName(getSheetName(), 'txt'), [
            { name: 'Plain Text', extensions: ['txt'] }
          ])
          break
        case 'export-docx':
          await writeExport(await workbookToDocx(store.workbook), safeName(getSheetName(), 'docx'), [
            { name: 'Word Document', extensions: ['docx'] }
          ])
          break
        case 'export-xlsx':
          await writeExport(await workbookToXlsx(store.workbook), safeName(getSheetName(), 'xlsx'), [
            { name: 'Excel Workbook', extensions: ['xlsx'] }
          ])
          break
        case 'export-pptx':
          await writeExport(await workbookToPptx(store.workbook), safeName(getSheetName(), 'pptx'), [
            { name: 'PowerPoint Presentation', extensions: ['pptx'] }
          ])
          break
        case 'export-opml':
          await writeTextExport(workbookToOpml(store.workbook), safeName(getSheetName(), 'opml'), [
            { name: 'OPML', extensions: ['opml'] }
          ])
          break
        case 'import-markdown':
          await importMarkdownFile()
          break
        case 'import-opml':
          await importOpmlFile()
          break
        case 'import-word':
          await importWordFile()
          break
        case 'print':
          await print()
          break
        default:
          break
      }
    }

    const onFileAction = (event: Event) => {
      const action = (event as CustomEvent<FileAction>).detail
      void run(action)
    }

    const onOpenPathEvent = (event: Event) => {
      const path = (event as CustomEvent<string>).detail
      if (path) void open(path)
    }

    const cleanupOpenPath = window.desktop?.onOpenPath((path) => {
      void open(path)
    })

    window.addEventListener('xmind:file', onFileAction)
    window.addEventListener('xmind:open-path', onOpenPathEvent)
    return () => {
      window.removeEventListener('xmind:file', onFileAction)
      window.removeEventListener('xmind:open-path', onOpenPathEvent)
      cleanupOpenPath?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!settings.autoSave) return
    const timer = window.setInterval(() => {
      const store = useMapStore.getState()
      if (!store.dirty || !store.filePath || !window.desktop) return
      void (async () => {
        try {
          const bytes = await writeXmind(store.workbook)
          const result = await window.desktop.saveWorkbook(bytes, store.filePath)
          if (!result.canceled) store.markSaved(result.filePath)
        } catch {
          /* autosave is best-effort */
        }
      })()
    }, Math.max(5000, settings.autoSaveIntervalMs))
    return () => window.clearInterval(timer)
  }, [settings.autoSave, settings.autoSaveIntervalMs])
}

export function openWorkbookPath(path: string): void {
  window.dispatchEvent(new CustomEvent('xmind:open-path', { detail: path }))
}

export async function insertImageFromDisk(): Promise<void> {
  if (!window.desktop) return
  const store = useMapStore.getState()
  const ui = useUiStore.getState()
  const target = store.activeTopicId ?? store.getActiveSheet().rootTopic.id
  const result = await window.desktop.pickFile([
    { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] }
  ])
  if (result.canceled || !result.data) return
  const mime = result.filePath?.toLowerCase().endsWith('.svg') ? 'image/svg+xml' : 'image/png'
  store.setImage(target, { src: bytesToDataUrl(result.data, mime) })
  ui.toast('图片已插入', 'success')
}

export async function insertImageFromClipboard(): Promise<void> {
  if (!window.desktop) return
  const store = useMapStore.getState()
  const ui = useUiStore.getState()
  const target = store.activeTopicId ?? store.getActiveSheet().rootTopic.id
  const dataUrl = await window.desktop.readClipboardImage()
  if (!dataUrl) {
    ui.toast('剪贴板中没有图片', 'error')
    return
  }
  store.setImage(target, { src: dataUrl })
  ui.toast('已从剪贴板插入图片', 'success')
}

export async function addAttachmentFromDisk(): Promise<void> {
  if (!window.desktop) return
  const store = useMapStore.getState()
  const ui = useUiStore.getState()
  const target = store.activeTopicId ?? store.getActiveSheet().rootTopic.id
  const result = await window.desktop.pickFile([{ name: 'All Files', extensions: ['*'] }])
  if (result.canceled || !result.filePath) return
  const topic = store.getTopic(target)
  const name = result.filePath.split(/[\\/]/).pop() ?? 'attachment'
  const attachments = [...(topic?.attachments ?? []), { name, path: result.filePath }]
  store.setAttachments(target, attachments)
  ui.toast('附件已添加', 'success')
}
