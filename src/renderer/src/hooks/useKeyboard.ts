import { useEffect } from 'react'
import { setEditingShortcuts } from '../desktop'
import { layoutSheet } from '../layout'
import { activeSheet } from '../model/tree'
import { runAction } from '../actions'
import { useMapStore } from '../store/mapStore'
import { useUiStore } from '../store/uiStore'

type Direction = 'left' | 'right' | 'up' | 'down'

function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable
}

function navigateSpatial(direction: Direction): void {
  const store = useMapStore.getState()
  const sheet = activeSheet(store.workbook)
  const layout = layoutSheet(sheet)
  const activeId = store.activeTopicId ?? sheet.rootTopic.id
  const current = layout.nodes.get(activeId)
  if (!current) return
  const cx = current.x + current.width / 2
  const cy = current.y + current.height / 2
  let best: { id: string; score: number } | undefined
  for (const node of layout.nodes.values()) {
    if (node.id === activeId) continue
    const nx = node.x + node.width / 2
    const ny = node.y + node.height / 2
    const dx = nx - cx
    const dy = ny - cy
    const inDirection =
      direction === 'left' ? dx < -1 : direction === 'right' ? dx > 1 : direction === 'up' ? dy < -1 : dy > 1
    if (!inDirection) continue
    const primary = direction === 'left' || direction === 'right' ? Math.abs(dx) : Math.abs(dy)
    const perpendicular = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx)
    const score = primary + perpendicular * 1.8
    if (!best || score < best.score) best = { id: node.id, score }
  }
  if (best) {
    store.select([best.id], false)
  } else if (direction === 'left') {
    store.selectParent()
  } else if (direction === 'right') {
    store.selectFirstChild()
  } else if (direction === 'up') {
    store.selectPreviousSibling()
  } else {
    store.selectNextSibling()
  }
}

export function useKeyboard(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey
      const ui = useUiStore.getState()

      if (event.key === 'Escape') {
        if (ui.commandOpen) {
          ui.setCommandOpen(false)
          return
        }
        if (ui.pitch) {
          ui.setPitch(false)
          return
        }
        if (ui.zen) {
          ui.setZen(false)
          return
        }
        if (ui.dialog) {
          ui.closeDialog()
          return
        }
        if (!isTextField(event.target) && ui.relationshipFrom) {
          ui.setRelationshipFrom(undefined)
          return
        }
        if (!isTextField(event.target) && ui.outlineMode) {
          ui.setOutlineMode(false)
          return
        }
      }

      if (ui.pitch) {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault()
          window.dispatchEvent(new CustomEvent('xmind:pitch-next'))
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault()
          window.dispatchEvent(new CustomEvent('xmind:pitch-prev'))
        }
        return
      }

      if (isTextField(event.target)) return

      if (mod) {
        switch (event.key.toLowerCase()) {
          case 'z':
            event.preventDefault()
            runAction(event.shiftKey ? 'redo' : 'undo')
            return
          case 'y':
            event.preventDefault()
            runAction('redo')
            return
          case 'c':
            event.preventDefault()
            runAction('copy')
            return
          case 'x':
            event.preventDefault()
            runAction('cut')
            return
          case 'v':
            event.preventDefault()
            runAction('paste')
            return
          case 'a':
            event.preventDefault()
            runAction('select-all')
            return
          case 's':
            event.preventDefault()
            runAction(event.shiftKey ? 'save-as' : 'save')
            return
          case 'o':
            event.preventDefault()
            runAction(event.shiftKey ? 'outline-panel' : 'open')
            return
          case 'n':
            event.preventDefault()
            runAction(event.shiftKey ? 'new-starter' : 'new-map')
            return
          case 'f':
            event.preventDefault()
            runAction(event.shiftKey ? 'format-panel' : 'search-panel')
            return
          case 't':
            event.preventDefault()
            runAction(event.shiftKey ? 'theme-panel' : 'new-template')
            return
          case 'k':
            event.preventDefault()
            runAction(event.shiftKey ? 'notes-panel' : 'command')
            return
          case 'e':
            if (event.shiftKey) {
              event.preventDefault()
              runAction('export-png')
            }
            return
          case 'p':
            event.preventDefault()
            runAction(event.shiftKey ? 'pitch' : 'print')
            return
          case 'h':
            if (event.shiftKey) {
              event.preventDefault()
              runAction('fit')
            }
            return
          case 'm':
            if (event.shiftKey) {
              event.preventDefault()
              runAction('new-window')
            }
            return
          case '=':
          case '+':
            event.preventDefault()
            runAction('zoom-in')
            return
          case '-':
            event.preventDefault()
            runAction('zoom-out')
            return
          case '0':
            event.preventDefault()
            runAction('zoom-reset')
            return
          case 'arrowup':
            if (event.shiftKey) {
              event.preventDefault()
              runAction('move-up')
            }
            return
          case 'arrowdown':
            if (event.shiftKey) {
              event.preventDefault()
              runAction('move-down')
            }
            return
          default:
            return
        }
      }

      if (ui.outlineMode) return

      if (event.key === 'Tab') {
        event.preventDefault()
        runAction('insert-topic')
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        runAction('insert-sibling')
        return
      }
      if (event.key === 'F2') {
        event.preventDefault()
        runAction('edit-topic')
        return
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        runAction('delete')
        return
      }
      if (event.key.startsWith('Arrow')) {
        event.preventDefault()
        const direction = event.key.replace('Arrow', '').toLowerCase() as Direction
        navigateSpatial(direction)
        return
      }
      if (event.key === '/') {
        event.preventDefault()
        runAction('shortcuts')
        return
      }
    }

    window.addEventListener('keydown', onKeyDown)

    // macOS 会在按键到达 WebView 之前先匹配菜单快捷键，因此文本输入时
    // 需要临时摘掉菜单上的 ⌘C/⌘V/⌘X/⌘Z/⌘A，失焦后再恢复。
    let editing = false
    const syncEditing = () => {
      const next = isTextField(document.activeElement)
      if (next === editing) return
      editing = next
      setEditingShortcuts(next)
    }
    const onFocusOut = () => {
      // focusout 早于下一个 focusin，等一拍再读取真实焦点。
      window.setTimeout(syncEditing, 0)
    }

    document.addEventListener('focusin', syncEditing)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('focusin', syncEditing)
      document.removeEventListener('focusout', onFocusOut)
      if (editing) setEditingShortcuts(false)
    }
  }, [])
}
