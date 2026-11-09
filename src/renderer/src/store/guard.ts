import { useMapStore } from './mapStore'
import { useUiStore } from './uiStore'

/**
 * Run a document-replacing action, first asking to save when the current
 * document has unsaved changes. Prevents silent data loss when creating a new
 * map, opening a file, applying a template or importing content.
 */
export function runOrConfirm(action: () => void): void {
  if (!useMapStore.getState().dirty) {
    action()
    return
  }
  const ui = useUiStore.getState()
  ui.setPendingReplace(action)
  ui.openDialog('unsaved-switch')
}
