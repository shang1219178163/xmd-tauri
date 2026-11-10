import { useMapStore } from './store/mapStore'
import { useUiStore } from './store/uiStore'
import { runTextCommand } from './editing'
import { attachedOf, findParent } from './model/tree'

export type FileAction =
  | 'new-map'
  | 'new-starter'
  | 'new-template'
  | 'open'
  | 'save'
  | 'save-as'
  | 'import-markdown'
  | 'import-opml'
  | 'import-word'
  | 'export-png'
  | 'export-svg'
  | 'export-pdf'
  | 'export-markdown'
  | 'export-text'
  | 'export-docx'
  | 'export-xlsx'
  | 'export-pptx'
  | 'export-opml'
  | 'print'

const FILE_ACTIONS = new Set<string>([
  'new-map',
  'new-starter',
  'new-template',
  'open',
  'save',
  'save-as',
  'import-markdown',
  'import-opml',
  'import-word',
  'export-png',
  'export-svg',
  'export-pdf',
  'export-markdown',
  'export-text',
  'export-docx',
  'export-xlsx',
  'export-pptx',
  'export-opml',
  'print'
])

export function dispatchFileAction(action: FileAction): void {
  window.dispatchEvent(new CustomEvent('xmind:file', { detail: action }))
}

export function runAction(action: string): void {
  const store = useMapStore.getState()
  const ui = useUiStore.getState()
  const sheet = store.getActiveSheet()

  if (FILE_ACTIONS.has(action)) {
    dispatchFileAction(action as FileAction)
    return
  }

  // 输入框有焦点时，⌘C/⌘V/⌘X/⌘A/⌘Z 作用于文本而不是画布。
  if (runTextCommand(action)) return

  switch (action) {
    case 'undo':
      store.undo()
      break
    case 'redo':
      store.redo()
      break
    case 'cut':
      store.cutSelection()
      break
    case 'copy':
      store.copySelection()
      break
    case 'paste':
      store.paste()
      break
    case 'delete':
      if (ui.activeRelationId) {
        store.removeRelationship(ui.activeRelationId)
        ui.setActiveRelation(undefined)
        break
      }
      store.deleteSelection()
      break
    case 'select-all':
      store.selectAll()
      break
    case 'copy-style':
      store.copyStyle()
      break
    case 'paste-style':
      store.pasteStyle()
      break
    case 'insert-topic':
      store.addChild()
      break
    case 'insert-sibling':
      store.addSibling()
      break
    case 'insert-floating':
      store.addFloatingTopic()
      break
    case 'insert-note':
      ui.setPopover('notes')
      break
    case 'insert-label':
      ui.openDialog('label')
      break
    case 'insert-marker':
      ui.setPopover('markers')
      break
    case 'insert-relationship':
      if (store.activeTopicId) {
        ui.setRelationshipFrom(store.activeTopicId)
      } else {
        ui.toast('请先选择一个主题', 'error')
      }
      break
    case 'insert-boundary': {
      const selection = store.selection
      if (!selection.length) {
        ui.toast('请先选择主题', 'error')
        break
      }
      const last = selection[selection.length - 1]
      if (findParent(sheet.rootTopic, last)) {
        store.addBoundary(selection)
        break
      }
      // 选中的是中心主题：没有父级可挂，改为包围它的全部子主题。
      const children = attachedOf(sheet.rootTopic).map((topic) => topic.id)
      if (!children.length) {
        ui.toast('中心主题下没有可包围的子主题', 'error')
        break
      }
      store.addBoundary(children)
      break
    }
    case 'insert-summary': {
      const selection = store.selection
      if (!selection.length) {
        ui.toast('请先选择主题', 'error')
        break
      }
      const last = selection[selection.length - 1]
      if (findParent(sheet.rootTopic, last)) {
        store.addSummary(selection)
        break
      }
      // 选中的是中心主题：没有父级可挂，改为汇总它的全部子主题。
      const children = attachedOf(sheet.rootTopic).map((topic) => topic.id)
      if (!children.length) {
        ui.toast('中心主题下没有可汇总的子主题', 'error')
        break
      }
      store.addSummary(children)
      break
    }
    case 'insert-image':
      ui.openDialog('image')
      break
    case 'insert-attachment':
      ui.openDialog('attachment')
      break
    case 'zoom-in':
      store.zoomBy(1.2)
      break
    case 'zoom-out':
      store.zoomBy(1 / 1.2)
      break
    case 'zoom-reset':
      window.dispatchEvent(new CustomEvent('xmind:actual-size'))
      break
    case 'fit':
      window.dispatchEvent(new CustomEvent('xmind:fit'))
      break
    case 'theme-panel':
      store.setActivePanel('canvas')
      break
    case 'format-panel':
      store.setActivePanel('style')
      break
    case 'outline-panel':
      ui.setOutlineMode(!ui.outlineMode)
      break
    case 'outline-tree':
      ui.setPopover('outline')
      break
    case 'search-panel':
      ui.setPopover('search')
      window.dispatchEvent(new CustomEvent('xmind:focus-search'))
      break
    case 'notes-panel':
      ui.setPopover('notes')
      break
    case 'markers-panel':
      ui.setPopover('markers')
      break
    case 'navigator-panel':
      ui.setPopover('navigator')
      break
    case 'zen':
      ui.setZen(!ui.zen)
      break
    case 'pitch':
      ui.setPitch(!ui.pitch)
      break
    case 'toggle-dark': {
      const next = store.settings.theme === 'dark' ? 'light' : 'dark'
      store.setSettings({ theme: next })
      void window.desktop?.saveSettings({ theme: next })
      document.documentElement.dataset.theme = next
      break
    }
    case 'new-window':
      void window.desktop?.newWindow()
      break
    case 'about':
      ui.openDialog('about')
      break
    case 'export-dialog':
      ui.openDialog('export')
      break
    case 'shortcuts':
      ui.openDialog('shortcuts')
      break
    case 'command':
      ui.setCommandOpen(true)
      break
    case 'edit-topic':
      if (store.activeTopicId) store.beginEdit(store.activeTopicId)
      break
    case 'move-up':
      store.moveSelectionUp()
      break
    case 'move-down':
      store.moveSelectionDown()
      break
    case 'select-parent':
      store.selectParent()
      break
    case 'select-first-child':
      store.selectFirstChild()
      break
    case 'escape':
      if (ui.relationshipFrom) ui.setRelationshipFrom(undefined)
      else if (ui.outlineMode) ui.setOutlineMode(false)
      else if (store.editingTopicId) store.cancelEdit()
      else store.clearSelection()
      break
    case 'rename-sheet':
      void sheet
      break
    default:
      break
  }
}

export function applyTheme(): void {
  const theme = useMapStore.getState().settings.theme
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}
