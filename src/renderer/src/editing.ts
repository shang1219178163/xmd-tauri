/**
 * Text-field counterparts of the Edit menu commands.
 *
 * macOS delivers ⌘C/⌘V/⌘X/⌘A/⌘Z to the native menu before the webview, so the
 * renderer never sees those keys. The menu handler therefore has to decide
 * whether the command belongs to a focused text field or to the canvas.
 */
import { readClipboardText, writeClipboardText } from './desktop'

const TEXT_COMMANDS = new Set(['undo', 'redo', 'cut', 'copy', 'paste', 'select-all'])

type TextField = HTMLInputElement | HTMLTextAreaElement

function isTextField(el: Element | null): el is TextField {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
}

function isEditable(el: Element | null): el is HTMLElement {
  return isTextField(el) || (el instanceof HTMLElement && el.isContentEditable)
}

function selectedText(el: HTMLElement): string {
  if (isTextField(el)) {
    const start = el.selectionStart ?? 0
    const end = el.selectionEnd ?? start
    return end > start ? el.value.slice(start, end) : ''
  }
  return window.getSelection()?.toString() ?? ''
}

function replaceSelection(el: HTMLElement, text: string): void {
  if (isTextField(el)) {
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? start
    el.setRangeText(text, start, end, 'end')
    // React 的受控组件靠 input 事件回写状态。
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }))
    return
  }
  if (el.isContentEditable) document.execCommand('insertText', false, text)
}

function selectAllIn(el: HTMLElement): void {
  if (isTextField(el)) {
    el.select()
    return
  }
  if (!el.isContentEditable) return
  const range = document.createRange()
  range.selectNodeContents(el)
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
}

/**
 * Apply an Edit command to the focused text field.
 * Returns `false` when no text field owns the command, so the caller can fall
 * through to the canvas behaviour.
 */
export function runTextCommand(action: string): boolean {
  if (!TEXT_COMMANDS.has(action)) return false
  const active = document.activeElement
  if (!isEditable(active)) return false

  switch (action) {
    case 'copy': {
      const text = selectedText(active)
      if (text) void writeClipboardText(text)
      break
    }
    case 'cut': {
      const text = selectedText(active)
      if (text) {
        void writeClipboardText(text)
        replaceSelection(active, '')
      }
      break
    }
    case 'paste':
      void readClipboardText().then((text) => {
        if (text && document.activeElement === active) replaceSelection(active, text)
      })
      break
    case 'select-all':
      selectAllIn(active)
      break
    case 'undo':
    case 'redo':
      document.execCommand(action)
      break
  }

  return true
}
