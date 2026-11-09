import { create } from 'zustand'
import type {
  AppSettings,
  Boundary,
  Marker,
  Relationship,
  Sheet,
  StructureKey,
  Summary,
  Theme,
  Topic,
  UserConfig,
  Workbook
} from '@shared/types'
import { structureClassOf } from '@shared/structures'
import { createEmptyWorkbook, createSheet, createStarterWorkbook, createTopic, newId } from '@shared/defaults'
import {
  recordCanvasBackground,
  recordCanvasSettings,
  recordCanvasTheme,
  recordStructure,
  recordStyleChange,
  recordTopicWidth
} from '../data/userConfig'
import {
  activeSheet as selectActiveSheet,
  allChildren,
  attachedOf,
  cloneSheet,
  cloneTopic,
  detachedOf,
  emptyChildren,
  findParent,
  findSheet,
  findTopic,
  findTopicPath,
  flattenTopics,
  generateId,
  insertChild,
  insertSibling,
  isDescendant,
  moveTopic as moveTopicInTree,
  nextSibling,
  previousSibling,
  removeTopics,
  selectionRoots,
  updateSheet,
  updateTopic as updateTopicInTree
} from '../model/tree'

export type PanelKey =
  | 'theme'
  | 'format'
  | 'outline'
  | 'search'
  | 'notes'
  | 'markers'
  | 'navigator'
  | 'style'
  | 'present'
  | 'canvas'

export interface ClipData {
  topics: Topic[]
  cut: boolean
  sourceSheetId: string
}

export interface TopicPositionEntry {
  id: string
  position: { x: number; y: number }
}

export interface MapState {
  workbook: Workbook
  filePath?: string
  fileName: string
  dirty: boolean
  past: Workbook[]
  future: Workbook[]
  selection: string[]
  activeTopicId?: string
  editingTopicId?: string
  editingDraft: string
  editSnapshot?: Workbook
  transactionSnapshot?: Workbook
  viewport: { x: number; y: number; zoom: number }
  panels: Record<PanelKey, boolean>
  activePanel: PanelKey
  searchQuery: string
  searchResults: string[]
  clipboard?: ClipData
  styleClipboard?: Record<string, string | number | boolean>
  settings: AppSettings
  statusMessage: string
  lastSavedAt?: number

  reset(workbook?: Workbook, filePath?: string): void
  loadWorkbook(workbook: Workbook, filePath?: string): void
  applyUserDefaults(config: UserConfig): void
  markSaved(filePath?: string): void
  setDirty(dirty: boolean): void
  setStatus(message: string): void

  getActiveSheet(): Sheet
  getTopic(id: string): Topic | undefined
  getSelectedTopics(): Topic[]

  setActiveSheet(id: string): void
  addSheet(): void
  duplicateSheet(id: string): void
  deleteSheet(id: string): void
  renameSheet(id: string, title: string): void

  select(ids: string[], additive?: boolean): void
  selectAll(): void
  clearSelection(): void
  setActiveTopic(id: string): void
  selectParent(): void
  selectPreviousSibling(): void
  selectNextSibling(): void
  selectFirstChild(): void

  addChild(parentId?: string): string | undefined
  addSibling(referenceId?: string): string | undefined
  addFloatingTopic(position?: { x: number; y: number }): string | undefined
  deleteSelection(): void
  deleteTopic(id: string): void

  beginEdit(id: string): void
  updateEditDraft(text: string): void
  commitEdit(history?: boolean): void
  cancelEdit(): void
  setTopicTitle(id: string, title: string): void

  updateTopic(id: string, patch: Partial<Topic>, history?: boolean): void
  updateTopicStyle(id: string, properties: Record<string, string | number | boolean>): void
  resetTopicStyle(id: string): void
  setTopicStyleForSelection(properties: Record<string, string | number | boolean>): void
  copyStyle(): void
  pasteStyle(): void

  toggleCollapse(id: string): void
  setCollapsed(id: string, collapsed: boolean): void
  /** Sheet-level skeleton: always stored on the root topic, which drives layout. */
  setStructure(key: StructureKey): void
  setTheme(theme: Theme): void
  setSheetBackground(color: string): void
  setSheetSetting(key: string, value: unknown): void

  addMarker(id: string, markerId: string): void
  removeMarker(id: string, markerId: string): void
  toggleMarker(id: string, markerId: string): void
  setLabels(id: string, labels: string[]): void
  setNotes(id: string, plain: string): void
  setHyperlink(id: string, url: string | undefined): void
  setImage(id: string, image: Topic['image']): void
  setAttachments(id: string, attachments: Topic['attachments']): void

  addBoundary(ids: string[], title?: string): void
  removeBoundary(id: string): void
  addSummary(ids: string[], title?: string): void
  removeSummary(id: string): void
  addRelationship(fromId: string, toId: string): string | undefined
  removeRelationship(id: string): void

  moveTopic(id: string, newParentId: string, index?: number, history?: boolean): void
  detachTopic(id: string, position?: { x: number; y: number }, history?: boolean): void
  /** Batch drag actions: call inside beginTransaction/endTransaction with history=false. */
  moveTopics(ids: string[], newParentId: string, history?: boolean): void
  detachTopics(entries: TopicPositionEntry[], history?: boolean): void
  updateTopicPositions(entries: TopicPositionEntry[], history?: boolean): void
  indentTopic(id: string): void
  outdentTopic(id: string): void
  moveSelectionUp(): void
  moveSelectionDown(): void

  undo(): void
  redo(): void
  beginTransaction(): void
  endTransaction(): void

  setViewport(viewport: { x: number; y: number; zoom: number }): void
  zoomBy(factor: number, anchor?: { x: number; y: number }): void
  resetZoom(): void

  setSearchQuery(query: string): void
  togglePanel(panel: PanelKey): void
  setPanel(panel: PanelKey, open: boolean): void
  setActivePanel(panel: PanelKey): void

  copySelection(): void
  cutSelection(): void
  paste(targetId?: string): void
  duplicateSelection(): void

  setSettings(settings: Partial<AppSettings>): void
}

const defaultSettings: AppSettings = {
  theme: 'light',
  language: 'zh-CN',
  autoSave: true,
  autoSaveIntervalMs: 30_000,
  handDrawnMode: false,
  showGrid: false,
  recentFiles: []
}

const defaultPanels: Record<PanelKey, boolean> = {
  theme: false,
  format: false,
  outline: false,
  search: false,
  notes: false,
  markers: false,
  navigator: false,
  style: false,
  present: false,
  canvas: false
}

const MAX_HISTORY = 120

export function createMapStore() {
  return create<MapState>((set, get) => {
    const pushHistory = (snapshot: Workbook) => {
      const { past } = get()
      return [...past, snapshot].slice(-MAX_HISTORY)
    }

    const apply = (mutator: (workbook: Workbook) => Workbook, history = true) => {
      const state = get()
      const snapshot = history ? structuredClone(state.workbook) : state.workbook
      const workbook = mutator(state.workbook)
      if (workbook === state.workbook) return
      set({
        workbook,
        past: history ? pushHistory(snapshot) : state.past,
        future: history ? [] : state.future,
        dirty: true
      })
    }

    const initialWorkbook = createStarterWorkbook()
    const initialRootId = initialWorkbook.sheets[0]?.rootTopic.id

    const currentSheet = () => selectActiveSheet(get().workbook)

    const mutateSheet = (mutator: (sheet: Sheet) => Sheet, history = true) => {
      const sheetId = get().workbook.activeSheetId
      apply((wb) => updateSheet(wb, sheetId, mutator), history)
    }

    const mutateRoot = (mutator: (root: Topic) => Topic, history = true) => {
      mutateSheet((sheet) => ({ ...sheet, rootTopic: mutator(sheet.rootTopic) }), history)
    }

    const selectIds = (ids: string[]) => {
      set({ selection: ids, activeTopicId: ids[ids.length - 1] })
    }

    return {
      workbook: initialWorkbook,
      fileName: '未命名.xmind',
      dirty: false,
      past: [],
      future: [],
      selection: initialRootId ? [initialRootId] : [],
      activeTopicId: initialRootId,
      editingTopicId: undefined,
      editingDraft: '',
      viewport: { x: 0, y: 0, zoom: 1 },
      panels: { ...defaultPanels },
      activePanel: 'canvas',
      searchQuery: '',
      searchResults: [],
      settings: { ...defaultSettings },
      statusMessage: '',

      reset(workbook, filePath) {
        const wb = workbook ?? createEmptyWorkbook()
        const rootId = selectActiveSheet(wb).rootTopic.id
        set({
          workbook: wb,
          filePath,
          fileName: filePath?.split(/[\\/]/).pop() ?? '未命名.xmind',
          dirty: false,
          past: [],
          future: [],
          transactionSnapshot: undefined,
          selection: [rootId],
          activeTopicId: rootId,
          editingTopicId: undefined,
          editingDraft: '',
          viewport: { x: 0, y: 0, zoom: 1 },
          searchQuery: '',
          searchResults: [],
          statusMessage: '',
          lastSavedAt: undefined
        })
      },

      loadWorkbook(workbook, filePath) {
        const rootId = selectActiveSheet(workbook).rootTopic.id
        set({
          workbook,
          filePath,
          fileName: filePath?.split(/[\\/]/).pop() ?? '未命名.xmind',
          dirty: false,
          past: [],
          future: [],
          transactionSnapshot: undefined,
          selection: [rootId],
          activeTopicId: rootId,
          editingTopicId: undefined,
          editingDraft: '',
          viewport: { x: 0, y: 0, zoom: 1 },
          searchQuery: '',
          searchResults: [],
          lastSavedAt: undefined
        })
      },

      applyUserDefaults(config) {
        const workbook = structuredClone(get().workbook)
        const sheet = selectActiveSheet(workbook)
        if (!sheet) return

        if (config.canvas.theme) {
          sheet.theme = structuredClone(config.canvas.theme)
        }

        // Style: null means "follow the theme", so only concrete values are applied.
        const styleProperties: Record<string, string | number | boolean> = {}
        for (const [key, value] of Object.entries(config.style.properties)) {
          if (value !== null && value !== undefined) styleProperties[key] = value
        }
        if (Object.keys(styleProperties).length) {
          sheet.rootTopic.style = {
            ...(sheet.rootTopic.style ?? {}),
            properties: {
              ...(sheet.rootTopic.style?.properties ?? {}),
              ...styleProperties
            }
          }
        }
        if (typeof config.style.customWidth === 'number') {
          sheet.rootTopic.customWidth = config.style.customWidth
        } else {
          delete sheet.rootTopic.customWidth
        }

        // Canvas settings: the config always has every key. null entries follow
        // the theme / application default instead of overriding it.
        const settings = config.canvas.settings
        const nextSettings: Record<string, unknown> = { ...(sheet.settings ?? {}) }
        nextSettings.handDrawn = settings.handDrawn
        nextSettings.globalFont = settings.globalFont
        nextSettings.branchWidth = settings.branchWidth
        nextSettings.rainbow = settings.rainbow
        nextSettings.rainbowPalette = settings.rainbowPalette
        nextSettings.cjkFont = settings.cjkFont
        nextSettings.autoBalance = settings.autoBalance
        nextSettings.compactLayout = settings.compactLayout
        nextSettings.alignSiblings = settings.alignSiblings
        nextSettings.freeBranch = settings.freeBranch
        nextSettings.flexibleFloating = settings.flexibleFloating
        nextSettings.topicOverlap = settings.topicOverlap
        sheet.settings = nextSettings

        if (typeof config.canvas.background === 'string') {
          sheet.background = config.canvas.background
        } else {
          delete sheet.background
        }

        if (config.canvas.structureClass) {
          sheet.rootTopic.structureClass = config.canvas.structureClass
        }

        const rootId = sheet.rootTopic.id
        set({
          workbook,
          dirty: false,
          past: [],
          future: [],
          transactionSnapshot: undefined,
          selection: [rootId],
          activeTopicId: rootId,
          editingTopicId: undefined,
          editingDraft: '',
          statusMessage: '',
          lastSavedAt: undefined
        })
      },

      markSaved(filePath) {
        set({
          filePath: filePath ?? get().filePath,
          fileName: (filePath ?? get().filePath)?.split(/[\\/]/).pop() ?? get().fileName,
          dirty: false,
          lastSavedAt: Date.now(),
          statusMessage: ''
        })
      },

      setDirty(dirty) {
        set({ dirty })
      },

      setStatus(message) {
        set({ statusMessage: message })
      },

      getActiveSheet() {
        return currentSheet()
      },

      getTopic(id) {
        return findTopic(currentSheet().rootTopic, id)
      },

      getSelectedTopics() {
        const root = currentSheet().rootTopic
        return get()
          .selection.map((id) => findTopic(root, id))
          .filter((t): t is Topic => Boolean(t))
      },

      setActiveSheet(id) {
        if (!findSheet(get().workbook, id)) return
        set({ workbook: { ...get().workbook, activeSheetId: id }, selection: [], activeTopicId: undefined, editingTopicId: undefined })
      },

      addSheet() {
        const wb = get().workbook
        const sheet = createSheet(`Map ${wb.sheets.length + 1}`)
        apply((current) => ({ sheets: [...current.sheets, sheet], activeSheetId: sheet.id }))
        set({ selection: [sheet.rootTopic.id], activeTopicId: sheet.rootTopic.id })
      },

      duplicateSheet(id) {
        const wb = get().workbook
        const source = findSheet(wb, id)
        if (!source) return
        const sheet = cloneSheet(source)
        apply((current) => ({ sheets: [...current.sheets, sheet], activeSheetId: sheet.id }))
        set({ selection: [sheet.rootTopic.id], activeTopicId: sheet.rootTopic.id })
      },

      deleteSheet(id) {
        const wb = get().workbook
        if (wb.sheets.length <= 1) {
          get().setStatus('至少保留一个画布')
          return
        }
        const index = wb.sheets.findIndex((s) => s.id === id)
        const sheets = wb.sheets.filter((s) => s.id !== id)
        const nextActive = wb.activeSheetId === id ? sheets[Math.max(0, index - 1)]?.id ?? sheets[0].id : wb.activeSheetId
        apply(() => ({ sheets, activeSheetId: nextActive }))
      },

      renameSheet(id, title) {
        apply((wb) => updateSheet(wb, id, (sheet) => ({ ...sheet, title })))
      },

      select(ids, additive = false) {
        const state = get()
        const unique = Array.from(new Set(ids))
        if (additive) {
          const merged = Array.from(new Set([...state.selection, ...unique]))
          selectIds(merged)
        } else {
          selectIds(unique)
        }
      },

      selectAll() {
        const root = currentSheet().rootTopic
        selectIds(flattenTopics(root).map((t) => t.id))
      },

      clearSelection() {
        set({ selection: [], activeTopicId: undefined, editingTopicId: undefined })
      },

      setActiveTopic(id) {
        if (get().activeTopicId === id) return
        set({ activeTopicId: id, selection: get().selection.includes(id) ? get().selection : [id] })
      },

      selectParent() {
        const active = get().activeTopicId
        if (!active) return
        const parent = findParent(currentSheet().rootTopic, active)
        if (parent) selectIds([parent.id])
      },

      selectPreviousSibling() {
        const active = get().activeTopicId
        if (!active) return
        const prev = previousSibling(currentSheet().rootTopic, active)
        if (prev) selectIds([prev.id])
      },

      selectNextSibling() {
        const active = get().activeTopicId
        if (!active) return
        const next = nextSibling(currentSheet().rootTopic, active)
        if (next) selectIds([next.id])
      },

      selectFirstChild() {
        const active = get().activeTopicId
        if (!active) return
        const topic = get().getTopic(active)
        const children = topic ? attachedOf(topic) : []
        if (children[0]) selectIds([children[0].id])
      },

      addChild(parentId) {
        const state = get()
        const parent = parentId ?? state.activeTopicId ?? currentSheet().rootTopic.id
        const topic = createTopic('新主题')
        mutateRoot((root) => insertChild(root, parent, topic))
        set({ selection: [topic.id], activeTopicId: topic.id, editingTopicId: topic.id, editingDraft: topic.title })
        return topic.id
      },

      addSibling(referenceId) {
        const state = get()
        const reference = referenceId ?? state.activeTopicId
        if (!reference) return get().addChild()
        const root = currentSheet().rootTopic
        if (reference === root.id) return get().addChild(root.id)
        const topic = createTopic('新主题')
        mutateRoot((r) => insertSibling(r, reference, topic))
        set({ selection: [topic.id], activeTopicId: topic.id, editingTopicId: topic.id, editingDraft: topic.title })
        return topic.id
      },

      addFloatingTopic(position) {
        const topic = createTopic('自由主题')
        topic.position = position ?? { x: 40, y: 40 }
        const sheetId = get().workbook.activeSheetId
        apply((wb) =>
          updateSheet(wb, sheetId, (sheet) => ({
            ...sheet,
            rootTopic: {
              ...sheet.rootTopic,
              children: {
                ...(sheet.rootTopic.children ?? emptyChildren()),
                detached: [...(sheet.rootTopic.children?.detached ?? []), topic]
              }
            }
          }))
        )
        set({ selection: [topic.id], activeTopicId: topic.id, editingTopicId: topic.id, editingDraft: topic.title })
        return topic.id
      },

      deleteSelection() {
        const state = get()
        if (!state.selection.length) return
        const root = currentSheet().rootTopic
        const ids = new Set(state.selection.filter((id) => id !== root.id))
        if (!ids.size) return
        mutateRoot((r) => removeTopics(r, ids) ?? r)
        set({ selection: [], activeTopicId: undefined })
      },

      deleteTopic(id) {
        get().select([id])
        get().deleteSelection()
      },

      beginEdit(id) {
        const topic = get().getTopic(id)
        if (!topic) return
        set({
          editingTopicId: id,
          editingDraft: topic.title,
          editSnapshot: structuredClone(get().workbook),
          selection: [id],
          activeTopicId: id
        })
      },

      updateEditDraft(text) {
        set({ editingDraft: text })
      },

      commitEdit(history = true) {
        const state = get()
        const id = state.editingTopicId
        if (!id) return
        const title = state.editingDraft.trim() || 'Topic'
        const changed = title !== state.getTopic(id)?.title
        const snapshot = state.editSnapshot
        mutateRoot((root) => updateTopicInTree(root, id, (topic) => ({ ...topic, title, titleUnedited: false })), false)
        set({
          editingTopicId: undefined,
          editingDraft: '',
          editSnapshot: undefined,
          past: history && changed && snapshot ? pushHistory(snapshot) : get().past,
          future: history && changed ? [] : get().future,
          dirty: true
        })
      },

      cancelEdit() {
        const state = get()
        if (state.editSnapshot) {
          set({ workbook: state.editSnapshot, editingTopicId: undefined, editingDraft: '', editSnapshot: undefined })
        } else {
          set({ editingTopicId: undefined, editingDraft: '', editSnapshot: undefined })
        }
      },

      setTopicTitle(id, title) {
        mutateRoot((root) => updateTopicInTree(root, id, (topic) => ({ ...topic, title, titleUnedited: false })))
      },

      updateTopic(id, patch, history = true) {
        if ('customWidth' in patch) recordTopicWidth(patch.customWidth)
        mutateRoot((root) => updateTopicInTree(root, id, (topic) => ({ ...topic, ...patch })), history)
      },

      updateTopicStyle(id, properties) {
        mutateRoot((root) =>
          updateTopicInTree(root, id, (topic) => ({
            ...topic,
            style: {
              id: topic.style?.id ?? newId('style'),
              properties: { ...(topic.style?.properties ?? {}), ...properties }
            }
          }))
        )
        recordStyleChange(properties)
      },

      resetTopicStyle(id) {
        mutateRoot((root) => updateTopicInTree(root, id, (topic) => ({ ...topic, style: undefined })))
      },

      setTopicStyleForSelection(properties) {
        const { selection } = get()
        if (!selection.length) return
        const snapshot = structuredClone(get().workbook)
        let sheet = currentSheet()
        let root = sheet.rootTopic
        for (const id of selection) {
          root = updateTopicInTree(root, id, (topic) => ({
            ...topic,
            style: {
              id: topic.style?.id ?? newId('style'),
              properties: { ...(topic.style?.properties ?? {}), ...properties }
            }
          }))
        }
        sheet = { ...sheet, rootTopic: root }
        apply((wb) => updateSheet(wb, wb.activeSheetId, () => sheet), false)
        set({ past: pushHistory(snapshot), future: [] })
        recordStyleChange(properties)
      },

      copyStyle() {
        const active = get().activeTopicId ?? get().selection[0]
        const topic = active ? get().getTopic(active) : undefined
        set({
          styleClipboard: structuredClone(topic?.style?.properties ?? {}),
          statusMessage: '已复制样式'
        })
      },

      pasteStyle() {
        const properties = get().styleClipboard
        if (!properties || !Object.keys(properties).length) return
        get().setTopicStyleForSelection(properties)
        set({ statusMessage: '已粘贴样式' })
      },

      toggleCollapse(id) {
        const topic = get().getTopic(id)
        if (!topic) return
        get().updateTopic(id, { collapsed: !topic.collapsed })
      },

      setCollapsed(id, collapsed) {
        get().updateTopic(id, { collapsed })
      },

      setStructure(key) {
        mutateRoot((root) => ({ ...root, structureClass: structureClassOf(key) }))
        recordStructure(structureClassOf(key))
      },

      setTheme(theme) {
        mutateSheet((sheet) => ({
          ...sheet,
          theme: structuredClone(theme),
          settings: { ...sheet.settings, rainbow: (theme as { rainbow?: boolean }).rainbow ?? false }
        }))
        recordCanvasTheme(theme)
        const sheet = selectActiveSheet(get().workbook)
        if (sheet?.settings) recordCanvasSettings(sheet.settings)
      },

      setSheetBackground(color) {
        mutateSheet((sheet) => ({ ...sheet, background: color }))
        recordCanvasBackground(color)
      },

      setSheetSetting(key, value) {
        mutateSheet((sheet) => ({ ...sheet, settings: { ...sheet.settings, [key]: value } }))
        const sheet = selectActiveSheet(get().workbook)
        if (sheet?.settings) recordCanvasSettings(sheet.settings)
      },

      addMarker(id, markerId) {
        const topic = get().getTopic(id)
        if (!topic) return
        const markers = [...(topic.markers ?? [])]
        if (markers.some((m) => m.markerId === markerId)) return
        markers.push({ markerId })
        get().updateTopic(id, { markers })
      },

      removeMarker(id, markerId) {
        const topic = get().getTopic(id)
        if (!topic) return
        get().updateTopic(id, { markers: (topic.markers ?? []).filter((m) => m.markerId !== markerId) })
      },

      toggleMarker(id, markerId) {
        const topic = get().getTopic(id)
        if (!topic) return
        const has = (topic.markers ?? []).some((m) => m.markerId === markerId)
        if (has) get().removeMarker(id, markerId)
        else get().addMarker(id, markerId)
      },

      setLabels(id, labels) {
        get().updateTopic(id, { labels: labels.map((l) => l.trim()).filter(Boolean) })
      },

      setNotes(id, plain) {
        get().updateTopic(
          id,
          plain.trim()
            ? { notes: { plain: { content: plain }, realHTML: { content: plain.replace(/\n/g, '<br>') } } }
            : { notes: undefined }
        )
      },

      setHyperlink(id, url) {
        get().updateTopic(id, { hyperlink: url })
      },

      setImage(id, image) {
        get().updateTopic(id, { image })
      },

      setAttachments(id, attachments) {
        get().updateTopic(id, { attachments })
      },

      addBoundary(ids, title) {
        if (!ids.length) return
        const root = currentSheet().rootTopic
        const parent = findParent(root, ids[ids.length - 1])
        if (!parent) return
        const idList = new Set(ids)
        const boundary: Boundary = { id: generateId('boundary'), range: `(${ids.join(',')})`, title }
        mutateRoot((r) =>
          updateTopicInTree(r, parent.id, (topic) => ({
            ...topic,
            boundaries: [...(topic.boundaries ?? []), boundary],
            extensions: [
              ...(topic.extensions ?? []),
              { provider: 'org.xmind.ui.boundary', content: [...idList] }
            ]
          }))
        )
      },

      removeBoundary(id) {
        mutateRoot((root) => {
          const strip = (topic: Topic): Topic => ({
            ...topic,
            boundaries: topic.boundaries?.filter((b) => b.id !== id),
            children: topic.children
              ? {
                  attached: topic.children.attached?.map(strip),
                  detached: topic.children.detached?.map(strip)
                }
              : topic.children
          })
          return strip(root)
        })
      },

      addSummary(ids, title) {
        if (!ids.length) return
        const root = currentSheet().rootTopic
        const parent = findParent(root, ids[ids.length - 1])
        if (!parent) return
        const summary: Summary = {
          id: generateId('summary'),
          range: `(${ids.join(',')})`,
          title: title ?? 'Summary',
          style: undefined
        }
        mutateRoot((r) =>
          updateTopicInTree(r, parent.id, (topic) => ({
            ...topic,
            summaries: [...(topic.summaries ?? []), summary]
          }))
        )
      },

      removeSummary(id) {
        mutateRoot((root) => {
          const strip = (topic: Topic): Topic => {
            const next = {
              ...topic,
              summaries: topic.summaries?.filter((s) => s.id !== id),
              children: topic.children
                ? {
                    attached: topic.children.attached?.map(strip),
                    detached: topic.children.detached?.map(strip)
                  }
                : topic.children
            }
            return next
          }
          return strip(root)
        })
      },

      addRelationship(fromId, toId) {
        const relation: Relationship = { id: generateId('relation'), end1Id: fromId, end2Id: toId, title: '' }
        mutateSheet((sheet) => ({ ...sheet, relationships: [...(sheet.relationships ?? []), relation] }))
        return relation.id
      },

      removeRelationship(id) {
        mutateSheet((sheet) => ({
          ...sheet,
          relationships: (sheet.relationships ?? []).filter((r) => r.id !== id)
        }))
      },

      moveTopic(id, newParentId, index = 0, history = true) {
        mutateRoot((root) => moveTopicInTree(root, id, newParentId, index), history)
        selectIds([id])
      },

      detachTopic(id, position, history = true) {
        mutateRoot((root) => {
          if (id === root.id) return root
          const topic = findTopic(root, id)
          if (!topic) return root
          const moved: Topic = { ...topic, position: position ?? topic.position ?? { x: 40, y: 40 } }
          const removed = removeTopics(root, new Set([id]))
          if (!removed) return root
          return {
            ...removed,
            children: {
              ...removed.children,
              detached: [...(removed.children?.detached ?? []), moved]
            }
          }
        }, history)
        selectIds([id])
      },

      moveTopics(ids, newParentId, history = false) {
        const root = currentSheet().rootTopic
        const top = selectionRoots(root, ids)
        if (!top.length || !findTopic(root, newParentId)) return
        if (top.some((id) => id === newParentId || isDescendant(root, id, newParentId))) return
        mutateRoot((current) => {
          let next = current
          for (const id of top) {
            const target = findTopic(next, newParentId)
            if (!target) continue
            if (attachedOf(target).some((topic) => topic.id === id)) continue
            next = moveTopicInTree(next, id, newParentId, attachedOf(target).length)
            next = updateTopicInTree(next, id, (topic) => {
              if (topic.position === undefined) return topic
              const copy = { ...topic }
              delete copy.position
              return copy
            })
          }
          return next
        }, history)
        selectIds(top)
      },

      detachTopics(entries, history = false) {
        if (!entries.length) return
        const positions = new Map(entries.map((entry) => [entry.id, entry.position]))
        const top = selectionRoots(currentSheet().rootTopic, entries.map((entry) => entry.id))
        if (!top.length) return
        mutateRoot((root) => {
          let next = root
          for (const id of top) {
            const position = positions.get(id)
            if (!position) continue
            const topic = findTopic(next, id)
            if (!topic) continue
            const moved: Topic = { ...topic, position: { ...position } }
            const removed = removeTopics(next, new Set([id]))
            if (!removed) continue
            next = {
              ...removed,
              children: {
                ...removed.children,
                detached: [...detachedOf(removed), moved]
              }
            }
          }
          return next
        }, history)
        selectIds(top)
      },

      updateTopicPositions(entries, history = false) {
        if (!entries.length) return
        const root = currentSheet().rootTopic
        const positions = new Map(entries.map((entry) => [entry.id, entry.position]))
        const top = selectionRoots(root, entries.map((entry) => entry.id)).filter((id) => {
          const parent = findParent(root, id)
          return Boolean(parent && detachedOf(parent).some((topic) => topic.id === id))
        })
        if (!top.length) return
        mutateRoot((rootTopic) => {
          let next = rootTopic
          for (const id of top) {
            const position = positions.get(id)
            if (!position) continue
            next = updateTopicInTree(next, id, (topic) => ({ ...topic, position: { ...position } }))
          }
          return next
        }, history)
        selectIds(top)
      },

      indentTopic(id) {
        const root = currentSheet().rootTopic
        if (id === root.id) return
        const previous = previousSibling(root, id)
        if (!previous) return
        const target = findTopic(root, previous.id)
        get().moveTopic(id, previous.id, target ? attachedOf(target).length : 0)
      },

      outdentTopic(id) {
        const root = currentSheet().rootTopic
        if (id === root.id) return
        const parent = findParent(root, id)
        if (!parent || parent.id === root.id) return
        const grandparent = findParent(root, parent.id)
        if (!grandparent) return
        const index = attachedOf(grandparent).findIndex((topic) => topic.id === parent.id)
        get().moveTopic(id, grandparent.id, index + 1)
      },

      moveSelectionUp() {
        const active = get().activeTopicId
        if (!active) return
        const root = currentSheet().rootTopic
        const parent = findParent(root, active)
        if (!parent) return
        const list = attachedOf(parent)
        const index = list.findIndex((t) => t.id === active)
        if (index <= 0) return
        get().moveTopic(active, parent.id, index - 1)
      },

      moveSelectionDown() {
        const active = get().activeTopicId
        if (!active) return
        const root = currentSheet().rootTopic
        const parent = findParent(root, active)
        if (!parent) return
        const list = attachedOf(parent)
        const index = list.findIndex((t) => t.id === active)
        if (index < 0 || index >= list.length - 1) return
        get().moveTopic(active, parent.id, index + 1)
      },

      undo() {
        const state = get()
        const previous = state.past[state.past.length - 1]
        if (!previous) return
        set({
          workbook: previous,
          past: state.past.slice(0, -1),
          future: [structuredClone(state.workbook), ...state.future].slice(0, MAX_HISTORY),
          dirty: true,
          editingTopicId: undefined,
          selection: state.selection.filter((id) => findTopic(previous.sheets.find((s) => s.id === previous.activeSheetId)?.rootTopic ?? previous.sheets[0].rootTopic, id)),
          activeTopicId: undefined
        })
      },

      redo() {
        const state = get()
        const next = state.future[0]
        if (!next) return
        set({
          workbook: next,
          past: pushHistory(structuredClone(state.workbook)),
          future: state.future.slice(1),
          dirty: true,
          editingTopicId: undefined
        })
      },

      beginTransaction() {
        if (get().transactionSnapshot) return
        set({ transactionSnapshot: structuredClone(get().workbook) })
      },

      endTransaction() {
        const state = get()
        const snapshot = state.transactionSnapshot
        if (!snapshot) return
        const changed = JSON.stringify(snapshot) !== JSON.stringify(state.workbook)
        set({
          transactionSnapshot: undefined,
          past: changed ? pushHistory(snapshot) : state.past,
          future: changed ? [] : state.future
        })
      },

      setViewport(viewport) {
        set({ viewport })
      },

      zoomBy(factor, anchor) {
        const { viewport } = get()
        const nextZoom = Math.max(0.2, Math.min(3, viewport.zoom * factor))
        if (anchor) {
          const wx = (anchor.x - viewport.x) / viewport.zoom
          const wy = (anchor.y - viewport.y) / viewport.zoom
          set({ viewport: { zoom: nextZoom, x: anchor.x - wx * nextZoom, y: anchor.y - wy * nextZoom } })
        } else {
          set({ viewport: { ...viewport, zoom: nextZoom } })
        }
      },

      resetZoom() {
        set({ viewport: { x: 0, y: 0, zoom: 1 } })
      },

      setSearchQuery(query) {
        const root = currentSheet().rootTopic
        const q = query.trim().toLowerCase()
        const results = q
          ? flattenTopics(root)
              .filter((t) => t.title.toLowerCase().includes(q) || (t.labels ?? []).some((l) => l.toLowerCase().includes(q)))
              .map((t) => t.id)
          : []
        set({ searchQuery: query, searchResults: results, panels: { ...get().panels, search: query.length > 0 || get().panels.search } })
      },

      togglePanel(panel) {
        const open = !get().panels[panel]
        set({
          panels: { ...get().panels, [panel]: open },
          activePanel: open ? panel : get().activePanel
        })
      },

      setPanel(panel, open) {
        set({
          panels: { ...get().panels, [panel]: open },
          activePanel: open ? panel : get().activePanel
        })
      },

      setActivePanel(panel) {
        set({ activePanel: panel })
      },

      copySelection() {
        const { selection } = get()
        if (!selection.length) return
        const root = currentSheet().rootTopic
        const topics = selection
          .map((id) => findTopic(root, id))
          .filter((t): t is Topic => Boolean(t))
          .map((t) => structuredClone(t))
        set({ clipboard: { topics, cut: false, sourceSheetId: get().workbook.activeSheetId }, statusMessage: `已复制 ${topics.length} 个主题` })
      },

      cutSelection() {
        get().copySelection()
        const clip = get().clipboard
        if (!clip) return
        set({ clipboard: { ...clip, cut: true } })
        get().deleteSelection()
      },

      paste(targetId) {
        const state = get()
        const clip = state.clipboard
        if (!clip?.topics.length) return
        const target = targetId ?? state.activeTopicId ?? currentSheet().rootTopic.id
        const inserted: string[] = []
        mutateRoot((root) => {
          let next = root
          for (const topic of clip.topics) {
            const copy = cloneTopic(topic)
            next = insertChild(next, target, copy)
            inserted.push(copy.id)
          }
          return next
        })
        set({ selection: inserted, activeTopicId: inserted[inserted.length - 1] })
        if (clip.cut) set({ clipboard: { ...clip, cut: false } })
      },

      duplicateSelection() {
        get().copySelection()
        get().paste()
      },

      setSettings(settings) {
        set({ settings: { ...get().settings, ...settings } })
      }
    }
  })
}

export const useMapStore = createMapStore()

export function selectSheet(state: MapState): Sheet {
  return selectActiveSheet(state.workbook)
}

export function selectedTopicIds(state: MapState): string[] {
  return state.selection
}

export function pathForTopic(root: Topic, id: string): Topic[] {
  return findTopicPath(root, id) ?? []
}

export function countAll(root: Topic): number {
  return flattenTopics(root).length
}

export function childCount(topic: Topic): number {
  return attachedOf(topic).length + (topic.children?.detached?.length ?? 0)
}

export function isTopicEmpty(topic: Topic): boolean {
  return !(topic.title ?? '').trim() && !allChildren(topic).length
}

export function markersOf(topic: Topic): Marker[] {
  return topic.markers ?? []
}
