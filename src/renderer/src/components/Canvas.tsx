import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Boundary, LayoutNode, Point, Relationship, Summary, Topic } from '@shared/types'
import { rainbowPalette } from '@shared/defaults'
import { layoutSheet, measureTopic } from '../layout'
import { LINK_TEXT_INSET } from '../layout/measure'
import { layoutSettingsOf } from '../layout/settings'
import { useMapStore } from '../store/mapStore'
import { useUiStore } from '../store/uiStore'
import {
  activeSheet,
  attachedOf,
  excludedTopicIds,
  findParent,
  findTopic,
  flattenTopics,
  isDescendant,
  selectionRoots
} from '../model/tree'
import { resolveRectCollision, type Rect } from '../model/geometry'
import { computeDragState, planDragDrop, type DragMember, type DragMemberSource } from '../model/drag'
import {
  mixWithBlack,
  mixWithWhite,
  resolveTopicStyle,
  shapeOf,
  wrapText,
  type ResolvedStyle
} from '../model/style'
import { braceVerticalPath, edgeToPath } from '../model/edge-path'
import { markerById } from '../data/markers'
import { openExternal } from '../desktop'

interface Interaction {
  mode: 'none' | 'pan' | 'drag' | 'marquee'
  startScreen: Point
  startWorld: Point
  startViewport: { x: number; y: number; zoom: number }
  topicId?: string
  members?: DragMemberSource[]
  excludedIds?: Set<string>
  moved: boolean
  transaction: boolean
  collapseSelection?: boolean
}

interface DragPreview {
  anchorId: string
  members: DragMember[]
  memberIds: Set<string>
  bbox: Rect
  targetId?: string
  willDetachIds: Set<string>
  hint?: string
}

interface ContextMenuState {
  x: number
  y: number
  topicId?: string
  world: Point
}

interface NodeStyleEntry {
  node: LayoutNode
  style: ResolvedStyle
}

const CLICK_THRESHOLD = 4
const SNAP_DISTANCE = 72
const DETACH_DISTANCE = 112
const COLLISION_PADDING = 12

function parseRange(range?: string): string[] {
  if (!range) return []
  return range
    .replace(/[()]/g, '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function boundingBox(nodes: LayoutNode[], ids: string[], pad: number) {
  const selected = ids.map((id) => nodes.find((n) => n.id === id)).filter((n): n is LayoutNode => Boolean(n))
  if (!selected.length) return undefined
  const minX = Math.min(...selected.map((n) => n.x))
  const minY = Math.min(...selected.map((n) => n.y))
  const maxX = Math.max(...selected.map((n) => n.x + n.width))
  const maxY = Math.max(...selected.map((n) => n.y + n.height))
  return { x: minX - pad, y: minY - pad, width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 }
}

function curvePath(a: Point, b: Point, kind: string): string {
  if (kind === 'straight') return `M ${a.x} ${a.y} L ${b.x} ${b.y}`
  if (kind === 'elbow') {
    const horizontal = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y)
    if (horizontal) {
      const mid = (a.x + b.x) / 2
      return `M ${a.x} ${a.y} L ${mid} ${a.y} L ${mid} ${b.y} L ${b.x} ${b.y}`
    }
    const mid = (a.y + b.y) / 2
    return `M ${a.x} ${a.y} L ${a.x} ${mid} L ${b.x} ${mid} L ${b.x} ${b.y}`
  }
  const dx = Math.abs(b.x - a.x)
  const dy = Math.abs(b.y - a.y)
  if (dx >= dy) {
    const c = Math.max(24, dx * 0.45)
    return `M ${a.x} ${a.y} C ${a.x + c} ${a.y}, ${b.x - c} ${b.y}, ${b.x} ${b.y}`
  }
  const c = Math.max(24, dy * 0.45)
  return `M ${a.x} ${a.y} C ${a.x} ${a.y + c}, ${b.x} ${b.y - c}, ${b.x} ${b.y}`
}

function topicShape(style: ResolvedStyle, w: number, h: number) {
  const kind = shapeOf(style.shapeClass)
  if (kind === 'ellipse') return { element: 'ellipse' as const, rx: w / 2, ry: h / 2 }
  if (kind === 'capsule') return { element: 'rect' as const, rx: h / 2 }
  if (kind === 'rounded') return { element: 'rect' as const, rx: Math.min(10, h / 3) }
  if (kind === 'underline') return { element: 'underline' as const }
  if (kind === 'diamond') return { element: 'diamond' as const }
  return { element: 'rect' as const, rx: 0 }
}

export default function Canvas() {
  const workbook = useMapStore((s) => s.workbook)
  const selection = useMapStore((s) => s.selection)
  const activeTopicId = useMapStore((s) => s.activeTopicId)
  const editingTopicId = useMapStore((s) => s.editingTopicId)
  const editingDraft = useMapStore((s) => s.editingDraft)
  const viewport = useMapStore((s) => s.viewport)
  const searchResults = useMapStore((s) => s.searchResults)
  const settings = useMapStore((s) => s.settings)
  const relationshipFrom = useUiStore((s) => s.relationshipFrom)
  const setRelationshipFrom = useUiStore((s) => s.setRelationshipFrom)
  const toast = useUiStore((s) => s.toast)

  const sheet = useMemo(() => activeSheet(workbook), [workbook])
  const layout = useMemo(() => layoutSheet(sheet), [sheet])
  const nodes = useMemo(() => Array.from(layout.nodes.values()), [layout])
  const layoutSettings = useMemo(() => layoutSettingsOf(sheet), [sheet])
  const nodeMap = layout.nodes

  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const interaction = useRef<Interaction>({
    mode: 'none',
    startScreen: { x: 0, y: 0 },
    startWorld: { x: 0, y: 0 },
    startViewport: { x: 0, y: 0, zoom: 1 },
    moved: false,
    transaction: false
  })

  const [size, setSize] = useState({ width: 0, height: 0 })
  const [spaceDown, setSpaceDown] = useState(false)
  const [marquee, setMarquee] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [dropTarget, setDropTarget] = useState<string | undefined>(undefined)
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null)
  const dragPreviewRef = useRef<DragPreview | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const fittedSheets = useRef<Set<string>>(new Set())

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (rect) setSize({ width: rect.width, height: rect.height })
    })
    observer.observe(el)
    setSize({ width: el.clientWidth, height: el.clientHeight })
    return () => observer.disconnect()
  }, [])

  const toWorld = useCallback(
    (screen: Point): Point => ({
      x: (screen.x - viewport.x) / viewport.zoom,
      y: (screen.y - viewport.y) / viewport.zoom
    }),
    [viewport]
  )

  const screenOf = useCallback(
    (world: Point): Point => ({
      x: world.x * viewport.zoom + viewport.x,
      y: world.y * viewport.zoom + viewport.y
    }),
    [viewport]
  )

  const localPoint = useCallback((event: { clientX: number; clientY: number }): Point => {
    const rect = svgRef.current?.getBoundingClientRect()
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) }
  }, [])

  const fitToView = useCallback(() => {
    if (!size.width || !size.height || !layout.bounds.width || !layout.bounds.height) return
    const pad = 110
    const zoom = Math.max(0.2, Math.min(1, Math.min((size.width - pad * 2) / layout.bounds.width, (size.height - pad * 2) / layout.bounds.height)))
    const x = size.width / 2 - (layout.bounds.x + layout.bounds.width / 2) * zoom
    const y = size.height / 2 - (layout.bounds.y + layout.bounds.height / 2) * zoom
    useMapStore.getState().setViewport({ x, y, zoom })
  }, [size.width, size.height, layout.bounds])

  useEffect(() => {
    const handler = () => fitToView()
    window.addEventListener('xmind:fit', handler)
    return () => window.removeEventListener('xmind:fit', handler)
  }, [fitToView])

  // 实际大小：恢复到 100%，保持当前视野中心不跳动。
  useEffect(() => {
    const handler = () => {
      if (!size.width || !size.height) return
      const vp = useMapStore.getState().viewport
      const centerX = (size.width / 2 - vp.x) / vp.zoom
      const centerY = (size.height / 2 - vp.y) / vp.zoom
      useMapStore.getState().setViewport({
        zoom: 1,
        x: size.width / 2 - centerX,
        y: size.height / 2 - centerY
      })
    }
    window.addEventListener('xmind:actual-size', handler)
    return () => window.removeEventListener('xmind:actual-size', handler)
  }, [size.width, size.height])

  const centerTopic = useCallback(
    (id: string) => {
      const node = nodeMap.get(id)
      if (!node) return
      useMapStore.getState().setViewport({
        zoom: viewport.zoom,
        x: size.width / 2 - (node.x + node.width / 2) * viewport.zoom,
        y: size.height / 2 - (node.y + node.height / 2) * viewport.zoom
      })
    },
    [nodeMap, size.width, size.height, viewport.zoom]
  )

  useEffect(() => {
    const handler = (event: Event) => {
      const id = (event as CustomEvent<string>).detail
      if (id) centerTopic(id)
    }
    window.addEventListener('xmind:center-topic', handler)
    return () => window.removeEventListener('xmind:center-topic', handler)
  }, [centerTopic])

  useEffect(() => {
    if (!size.width || fittedSheets.current.has(sheet.id)) return
    fittedSheets.current.add(sheet.id)
    fitToView()
  }, [sheet.id, size.width, fitToView])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !isTextField(event.target)) {
        setSpaceDown(true)
      }
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') setSpaceDown(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useEffect(() => {
    if (!editingTopicId) return
    const textarea = editorRef.current
    if (!textarea) return
    textarea.focus()
    textarea.select()
  }, [editingTopicId])

  useEffect(
    () => () => {
      if (interaction.current.transaction) useMapStore.getState().endTransaction()
    },
    []
  )

  const rainbowEnabled =
    sheet.settings?.rainbow === true ||
    (sheet.settings?.rainbow !== false && (sheet.theme as { rainbow?: boolean }).rainbow === true)
  const palette = useMemo(() => rainbowPalette(sheet.settings?.rainbowPalette), [sheet.settings?.rainbowPalette])

  const mainColorIndex = useMemo(() => {
    const rootChildren = attachedOf(sheet.rootTopic)
    const indexById = new Map(rootChildren.map((topic, index) => [topic.id, index] as const))
    const result = new Map<string, number>()
    for (const node of nodes) {
      let current: LayoutNode | undefined = node
      while (current && current.depth > 1 && current.parentId) current = nodeMap.get(current.parentId)
      if (current && indexById.has(current.id)) result.set(node.id, indexById.get(current.id)!)
    }
    return result
  }, [nodes, nodeMap, sheet.rootTopic])

  const resolveStyle = useCallback(
    (node: LayoutNode): ResolvedStyle => {
      const floating = node.parentId === sheet.rootTopic.id && (sheet.rootTopic.children?.detached ?? []).some((t) => t.id === node.id)
      const base = resolveTopicStyle(node.topic, sheet, node.depth, floating)
      const index = mainColorIndex.get(node.id)
      if (!rainbowEnabled || index === undefined) return base
      const color = palette[index % palette.length]
      const custom = node.topic.style?.properties ?? {}
      if (node.depth === 1) {
        return {
          ...base,
          fill: typeof custom['svg:fill'] === 'string' ? base.fill : color,
          color: typeof custom['fo:color'] === 'string' ? base.color : '#FFFFFF',
          borderColor: typeof custom['border-line-color'] === 'string' ? base.borderColor : 'transparent',
          borderWidth: typeof custom['border-line-width'] === 'string' ? base.borderWidth : 0,
          lineColor: color,
          lineWidth: Math.max(base.lineWidth, 2.5),
          handDrawn: true
        }
      }
      return {
        ...base,
        fill: typeof custom['svg:fill'] === 'string' ? base.fill : mixWithWhite(color, 0.9),
        color: typeof custom['fo:color'] === 'string' ? base.color : mixWithBlack(color, 0.42),
        borderColor: typeof custom['border-line-color'] === 'string' ? base.borderColor : mixWithWhite(color, 0.32),
        lineColor: color,
        fillPattern: undefined,
        handDrawn: true
      }
    },
    [sheet, mainColorIndex, rainbowEnabled, palette]
  )

  const styles = useMemo(() => {
    const map = new Map<string, ResolvedStyle>()
    for (const node of nodes) map.set(node.id, resolveStyle(node))
    return map
  }, [nodes, resolveStyle])

  const hatchDefs = useMemo(() => {
    const byKey = new Map<
      string,
      { id: string; fill: string; patternColor: string; pattern: 'diagonal' | 'cross' }
    >()
    for (const style of styles.values()) {
      if (!style.fillPattern) continue
      const key = `${style.fill}|${style.patternColor ?? ''}|${style.fillPattern}`
      if (!byKey.has(key)) {
        byKey.set(key, {
          id: `hatch-${byKey.size}`,
          fill: style.fill,
          patternColor: style.patternColor ?? 'rgba(255,255,255,0.25)',
          pattern: style.fillPattern
        })
      }
    }
    return { byKey, list: Array.from(byKey.values()) }
  }, [styles])

  const fillFor = useCallback(
    (style: ResolvedStyle): string => {
      if (!style.fillPattern) return style.fill
      const def = hatchDefs.byKey.get(`${style.fill}|${style.patternColor ?? ''}|${style.fillPattern}`)
      return def ? `url(#${def.id})` : style.fill
    },
    [hatchDefs]
  )

  const rootNode = nodeMap.get(sheet.rootTopic.id)

  const selectNode = useCallback(
    (id: string, additive: boolean) => {
      const store = useMapStore.getState()
      if (additive) {
        const next = store.selection.includes(id) ? store.selection.filter((x) => x !== id) : [...store.selection, id]
        store.select(next.length ? next : [], false)
      } else {
        store.select([id], false)
      }
    },
    []
  )

  const hitTest = useCallback(
    (world: Point, excludeId?: string): string | undefined => {
      for (let i = nodes.length - 1; i >= 0; i -= 1) {
        const node = nodes[i]
        if (excludeId && node.id === excludeId) continue
        if (excludeId && isDescendant(sheet.rootTopic, excludeId, node.id)) continue
        if (world.x >= node.x && world.x <= node.x + node.width && world.y >= node.y && world.y <= node.y + node.height) {
          return node.id
        }
      }
      return undefined
    },
    [nodes, sheet.rootTopic]
  )

  const buildDragSources = useCallback(
    (ids: string[]): DragMemberSource[] => {
      const memberIds = selectionRoots(sheet.rootTopic, ids)
      return memberIds.flatMap((id) => {
        const node = nodeMap.get(id)
        if (!node) return []
        const parent = findParent(sheet.rootTopic, id)
        const parentNode = parent ? nodeMap.get(parent.id) : undefined
        const floating = parent ? (parent.children?.detached ?? []).some((topic) => topic.id === id) : false
        return [
          {
            id,
            rect: { x: node.x, y: node.y, width: node.width, height: node.height },
            parentId: parent?.id,
            parentRect: parentNode
              ? { x: parentNode.x, y: parentNode.y, width: parentNode.width, height: parentNode.height }
              : undefined,
            floating
          }
        ]
      })
    },
    [nodeMap, sheet.rootTopic]
  )

  const startEditing = useCallback((id: string) => {
    useMapStore.getState().beginEdit(id)
  }, [])

  const onPointerDown = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (event.button === 2) return
      setContextMenu(null)
      dragPreviewRef.current = null
      setDragPreview(null)
      setDropTarget(undefined)
      const screen = localPoint(event)
      const world = toWorld(screen)
      const nodeId = hitTest(world)

      if (relationshipFrom) {
        if (nodeId && nodeId !== relationshipFrom) {
          useMapStore.getState().addRelationship(relationshipFrom, nodeId)
          setRelationshipFrom(undefined)
          toast('已创建关系线', 'success')
        } else if (!nodeId) {
          setRelationshipFrom(undefined)
        }
        return
      }

      if (spaceDown || event.button === 1) {
        interaction.current = {
          mode: 'pan',
          startScreen: screen,
          startWorld: world,
          startViewport: viewport,
          moved: false,
          transaction: false
        }
        svgRef.current?.setPointerCapture(event.pointerId)
        return
      }

      if (nodeId) {
        const store = useMapStore.getState()
        const additive = event.shiftKey || event.metaKey || event.ctrlKey
        const alreadySelected = store.selection.includes(nodeId)
        let dragIds = store.selection
        let collapseSelection = false

        if (additive) {
          selectNode(nodeId, true)
          dragIds = useMapStore.getState().selection
          if (!dragIds.includes(nodeId)) {
            interaction.current = {
              mode: 'none',
              startScreen: screen,
              startWorld: world,
              startViewport: viewport,
              moved: false,
              transaction: false
            }
            return
          }
        } else if (!alreadySelected) {
          store.select([nodeId], false)
          dragIds = [nodeId]
        } else {
          collapseSelection = store.selection.length > 1
        }

        if (nodeId === sheet.rootTopic.id) {
          if (collapseSelection) store.select([nodeId], false)
          interaction.current = {
            mode: 'none',
            startScreen: screen,
            startWorld: world,
            startViewport: viewport,
            moved: false,
            transaction: false
          }
          return
        }

        const members = buildDragSources(dragIds)
        if (!members.length) {
          interaction.current = {
            mode: 'none',
            startScreen: screen,
            startWorld: world,
            startViewport: viewport,
            moved: false,
            transaction: false
          }
          return
        }

        interaction.current = {
          mode: 'drag',
          startScreen: screen,
          startWorld: world,
          startViewport: viewport,
          topicId: nodeId,
          members,
          excludedIds: excludedTopicIds(sheet.rootTopic, members.map((member) => member.id)),
          moved: false,
          transaction: false,
          collapseSelection
        }
        svgRef.current?.setPointerCapture(event.pointerId)
      } else {
        interaction.current = {
          mode: 'marquee',
          startScreen: screen,
          startWorld: world,
          startViewport: viewport,
          moved: false,
          transaction: false
        }
        setMarquee({ x: screen.x, y: screen.y, width: 0, height: 0 })
        if (!event.shiftKey) useMapStore.getState().clearSelection()
        svgRef.current?.setPointerCapture(event.pointerId)
      }
    },
    [
      buildDragSources,
      hitTest,
      localPoint,
      relationshipFrom,
      selectNode,
      setRelationshipFrom,
      sheet.rootTopic.id,
      spaceDown,
      toWorld,
      toast,
      viewport
    ]
  )

  const onPointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const current = interaction.current
      if (current.mode === 'none') return
      const screen = localPoint(event)
      const dx = screen.x - current.startScreen.x
      const dy = screen.y - current.startScreen.y
      if (!current.moved && Math.hypot(dx, dy) < CLICK_THRESHOLD) return
      current.moved = true

      if (current.mode === 'pan') {
        useMapStore.getState().setViewport({
          x: current.startViewport.x + dx,
          y: current.startViewport.y + dy,
          zoom: current.startViewport.zoom
        })
        return
      }

      if (current.mode === 'marquee') {
        setMarquee({
          x: Math.min(current.startScreen.x, screen.x),
          y: Math.min(current.startScreen.y, screen.y),
          width: Math.abs(dx),
          height: Math.abs(dy)
        })
        return
      }

      if (current.mode === 'drag' && current.topicId && current.members?.length) {
        const members = current.members
        if (!current.transaction) {
          useMapStore.getState().beginTransaction()
          current.transaction = true
        }
        const world = toWorld(screen)
        const delta = { x: world.x - current.startWorld.x, y: world.y - current.startWorld.y }
        const excludedIds =
          current.excludedIds ?? excludedTopicIds(sheet.rootTopic, members.map((member) => member.id))
        const free = nodes.filter((node) => !excludedIds.has(node.id))
        const obstacles = free.map((node) => ({ x: node.x, y: node.y, width: node.width, height: node.height }))
        const candidates = free.map((node) => ({
          id: node.id,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          depth: node.depth
        }))
        const freeBranch = layoutSettings.freeBranch
        const result = computeDragState(
          members,
          delta,
          obstacles,
          freeBranch ? [] : candidates,
          {
            snapDistance: freeBranch ? 0 : SNAP_DISTANCE,
            detachDistance: freeBranch ? 1 : DETACH_DISTANCE,
            collisionPadding: COLLISION_PADDING,
            avoidCollisions: !layoutSettings.topicOverlap
          }
        )
        if (!result) return

        const targetTopic = result.targetId ? findTopic(sheet.rootTopic, result.targetId) : undefined
        const attachedCount = result.members.filter(
          (member) => !member.floating && member.willDetach
        ).length
        const floatingCount = result.members.filter((member) => member.floating).length
        const movableCount = targetTopic
          ? result.members.filter(
              (member) => !attachedOf(targetTopic).some((topic) => topic.id === member.id)
            ).length
          : 0
        const hint = targetTopic
          ? movableCount
            ? `松开挂到「${targetTopic.title || '未命名'}」下（${movableCount} 个主题）`
            : `已在「${targetTopic.title || '未命名'}」下`
          : attachedCount
            ? `松开断开 ${attachedCount} 个连接`
            : floatingCount
              ? `松开移动 ${floatingCount} 个主题`
              : undefined
        const preview: DragPreview = {
          anchorId: current.topicId,
          members: result.members,
          memberIds: new Set(result.members.map((member) => member.id)),
          bbox: result.bbox,
          targetId: result.targetId,
          willDetachIds: result.willDetachIds,
          hint
        }
        dragPreviewRef.current = preview
        setDragPreview(preview)
        setDropTarget(result.targetId)
      }
    },
    [layoutSettings, localPoint, nodes, sheet.rootTopic, toWorld]
  )

  const cancelDrag = useCallback(() => {
    const current = interaction.current
    interaction.current = { ...current, mode: 'none' }
    if (current.transaction) useMapStore.getState().endTransaction()
    dragPreviewRef.current = null
    setDragPreview(null)
    setDropTarget(undefined)
    setMarquee(null)
  }, [])

  const onPointerCancel = useCallback(() => {
    cancelDrag()
  }, [cancelDrag])

  const onLostPointerCapture = useCallback(() => {
    if (interaction.current.mode === 'drag' || interaction.current.mode === 'marquee') cancelDrag()
  }, [cancelDrag])

  const onPointerUp = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const current = interaction.current
      interaction.current = { ...current, mode: 'none' }
      setDropTarget(undefined)
      try {
        svgRef.current?.releasePointerCapture(event.pointerId)
      } catch {
        /* noop */
      }

      if (current.mode === 'marquee' && current.moved) {
        const end = localPoint(event)
        const a = toWorld({ x: Math.min(current.startScreen.x, end.x), y: Math.min(current.startScreen.y, end.y) })
        const b = toWorld({ x: Math.max(current.startScreen.x, end.x), y: Math.max(current.startScreen.y, end.y) })
        const hits = nodes
          .filter((n) => n.x + n.width >= a.x && n.x <= b.x && n.y + n.height >= a.y && n.y <= b.y)
          .map((n) => n.id)
        if (hits.length) useMapStore.getState().select(hits, event.shiftKey)
      }

      if (current.mode === 'drag' && current.topicId && current.members?.length) {
        const store = useMapStore.getState()
        if (!current.moved && current.collapseSelection) {
          store.select([current.topicId], false)
        }
        const preview = dragPreviewRef.current
        if (current.moved && preview) {
          const rootCenter = rootNode
            ? { x: rootNode.x + rootNode.width / 2, y: rootNode.y + rootNode.height / 2 }
            : { x: 0, y: 0 }
          const plan = planDragDrop(preview.members, preview.targetId, rootCenter)
          if (preview.targetId && plan.targetIds) {
            store.moveTopics(plan.targetIds, preview.targetId, false)
          } else {
            if (plan.detachEntries.length) store.detachTopics(plan.detachEntries, false)
            if (plan.positionEntries.length) store.updateTopicPositions(plan.positionEntries, false)
            if (plan.detachEntries.length || plan.positionEntries.length) {
              store.select(preview.members.map((member) => member.id), false)
            }
          }
        }
        if (current.transaction) store.endTransaction()
      }

      dragPreviewRef.current = null
      setDragPreview(null)
      setMarquee(null)
    },
    [localPoint, nodes, rootNode, toWorld]
  )

  const onDoubleClick = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      const screen = localPoint(event)
      const world = toWorld(screen)
      const nodeId = hitTest(world)
      if (nodeId) {
        startEditing(nodeId)
      } else {
        const rootCenter = rootNode ? { x: rootNode.x + rootNode.width / 2, y: rootNode.y + rootNode.height / 2 } : { x: 0, y: 0 }
        const tempTopic: Topic = {
          id: 'measure-floating',
          title: '自由主题',
          children: { attached: [], detached: [] }
        }
        const measured = measureTopic(tempTopic, {
          theme: sheet.theme,
          depth: 1,
          isFloating: true
        })
        const resolved = layoutSettings.topicOverlap
          ? { x: world.x, y: world.y }
          : resolveRectCollision(
              { x: world.x, y: world.y, width: measured.width, height: measured.height },
              nodes.map((node) => ({ x: node.x, y: node.y, width: node.width, height: node.height })),
              COLLISION_PADDING
            )
        useMapStore.getState().addFloatingTopic({ x: resolved.x - rootCenter.x, y: resolved.y - rootCenter.y })
      }
    },
    [hitTest, layoutSettings, localPoint, nodes, rootNode, sheet.theme, startEditing, toWorld]
  )

  const onContextMenu = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      event.preventDefault()
      const screen = localPoint(event)
      const world = toWorld(screen)
      const nodeId = hitTest(world)
      if (nodeId) selectNode(nodeId, false)
      setContextMenu({ x: event.clientX, y: event.clientY, topicId: nodeId, world })
    },
    [hitTest, localPoint, selectNode, toWorld]
  )

  useEffect(() => {
    const element = svgRef.current
    if (!element) return
    const handler = (event: WheelEvent) => {
      event.preventDefault()
      const rect = element.getBoundingClientRect()
      const store = useMapStore.getState()
      const current = store.viewport
      if (event.ctrlKey || event.metaKey) {
        store.zoomBy(event.deltaY > 0 ? 0.9 : 1.1, {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        })
      } else {
        const horizontal = event.shiftKey
        store.setViewport({
          x: current.x - (horizontal ? event.deltaY : event.deltaX),
          y: current.y - (horizontal ? 0 : event.deltaY),
          zoom: current.zoom
        })
      }
    }
    element.addEventListener('wheel', handler, { passive: false })
    return () => element.removeEventListener('wheel', handler)
  }, [])

  const editingNode = editingTopicId ? nodeMap.get(editingTopicId) : undefined
  const editingStyle = editingTopicId ? styles.get(editingTopicId) : undefined

  const resolveRangeIds = useCallback(
    (topic: Topic, range?: string): string[] => {
      const tokens = parseRange(range)
      if (!tokens.length) return [topic.id]
      const children = attachedOf(topic)
      const ids = tokens
        .map((token) => (/^\d+$/.test(token) ? children[Number(token)]?.id : token))
        .filter((id): id is string => Boolean(id))
      return ids.length ? ids : [topic.id]
    },
    []
  )

  const boundaries = useMemo(() => {
    const out: Array<{ boundary: Boundary; box: { x: number; y: number; width: number; height: number } }> = []
    for (const topic of flattenTopics(sheet.rootTopic)) {
      for (const boundary of topic.boundaries ?? []) {
        const ids = resolveRangeIds(topic, boundary.range)
        const box = boundingBox(nodes, ids, 14)
        if (box) out.push({ boundary, box })
      }
    }
    return out
  }, [nodes, resolveRangeIds, sheet.rootTopic])

  const summaries = useMemo(() => {
    const out: Array<{ summary: Summary; box: { x: number; y: number; width: number; height: number }; parent: Topic }> = []
    for (const topic of flattenTopics(sheet.rootTopic)) {
      for (const summary of topic.summaries ?? []) {
        const ids = resolveRangeIds(topic, summary.range)
        const box = boundingBox(nodes, ids, 14)
        if (box) out.push({ summary, box, parent: topic })
      }
    }
    return out
  }, [nodes, resolveRangeIds, sheet.rootTopic])

  const relationships = useMemo(() => {
    return (sheet.relationships ?? []).filter((rel) => nodeMap.has(rel.end1Id) && nodeMap.has(rel.end2Id))
  }, [sheet.relationships, nodeMap])

  const canvasBackground =
    sheet.background ??
    (sheet.theme.map?.properties?.['svg:fill'] as string | undefined) ??
    'var(--bg-canvas)'
  const gridStyle = {
    backgroundColor: canvasBackground,
    backgroundPosition: `${viewport.x}px ${viewport.y}px`,
    backgroundSize: `${24 * viewport.zoom}px ${24 * viewport.zoom}px`
  }

  const handleEditorKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    event.stopPropagation()
    if (event.key === 'Escape') {
      event.preventDefault()
      useMapStore.getState().cancelEdit()
      return
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      useMapStore.getState().commitEdit()
      return
    }
    if (event.key === 'Tab') {
      event.preventDefault()
      const id = editingTopicId
      useMapStore.getState().commitEdit()
      if (id) setTimeout(() => useMapStore.getState().addChild(id), 0)
    }
  }

  const editorShape = editingNode && editingStyle ? topicShape(editingStyle, editingNode.width, editingNode.height) : undefined

  const editorRect = editingNode
    ? {
        left: screenOf({ x: editingNode.x, y: editingNode.y }).x,
        top: screenOf({ x: editingNode.x, y: editingNode.y }).y,
        width: Math.max(editingNode.width * viewport.zoom, 130),
        height: Math.max(editingNode.height * viewport.zoom, 36)
      }
    : undefined

  return (
    <div
      className={`canvas-wrap ${settings.handDrawnMode ? 'hand-drawn' : ''} ${settings.showGrid ? 'show-grid' : ''}`}
      ref={containerRef}
      style={gridStyle}
    >
      <svg
        ref={svgRef}
        className={`canvas-svg ${spaceDown ? 'panning' : ''} ${relationshipFrom ? 'connecting' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onLostPointerCapture}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
      >
        <defs>
          <marker id="relationship-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#e8a23a" />
          </marker>
          <filter id="node-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0f1a14" floodOpacity="0.10" />
          </filter>
          <filter id="rough-edge" x="-6%" y="-6%" width="112%" height="112%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="1" seed="9" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.35" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          {hatchDefs.list.map((def) => (
            <pattern
              key={def.id}
              id={def.id}
              width="9"
              height="9"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="9" height="9" fill={def.fill} />
              <line x1="0" y1="0" x2="0" y2="9" stroke={def.patternColor} strokeWidth="2.4" />
              {def.pattern === 'cross' ? (
                <line x1="0" y1="4.5" x2="9" y2="4.5" stroke={def.patternColor} strokeWidth="2.4" />
              ) : null}
            </pattern>
          ))}
        </defs>
        <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`}>
          {boundaries.map(({ boundary, box }) => (
            <g key={boundary.id}>
              <rect
                x={box.x}
                y={box.y}
                width={box.width}
                height={box.height}
                rx={16}
                fill={(boundary.style?.properties?.['svg:fill'] as string) ?? sheet.theme.boundary?.properties?.['svg:fill'] ?? '#dbeafe'}
                fillOpacity={0.28}
                stroke={(boundary.style?.properties?.['border-line-color'] as string) ?? sheet.theme.boundary?.properties?.['border-line-color'] ?? '#60a5fa'}
                strokeWidth={1.5}
              />
              <text x={box.x + 10} y={box.y + 15} fontSize={10} fill="#3b82f6" fontWeight={600}>
                {boundary.title ?? ''}
              </text>
            </g>
          ))}

          {layout.decorations.map((decoration) => {
            const color = decoration.color ?? '#93c5fd'
            const width = decoration.width ?? 2
            const [start, end] = decoration.points
            if (!start || !end) return null
            const path =
              decoration.kind === 'brace'
                ? braceVerticalPath(start, end)
                : `M ${start.x} ${start.y} L ${end.x} ${end.y}`
            return (
              <path
                key={decoration.id}
                d={path}
                className="decoration-path"
                fill="none"
                stroke={color}
                strokeWidth={width}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )
          })}

          {layout.edges.map((edge) => {
            if (!edge.points.length) return null
            if (dragPreview?.willDetachIds.has(edge.toId)) return null
            const fromStyle = styles.get(edge.fromId)
            const toStyle = styles.get(edge.toId)
            const color = edge.color ?? toStyle?.lineColor ?? fromStyle?.lineColor ?? '#93c5fd'
            const width = edge.width ?? toStyle?.lineWidth ?? fromStyle?.lineWidth ?? 2
            const kind = edge.kind
            const path = edgeToPath(edge)
            return (
              <path
                key={edge.id}
                d={path}
                className="edge-path"
                stroke={color}
                strokeWidth={kind === 'tapered' ? 0.5 : width}
                fill={kind === 'tapered' ? color : 'none'}
                style={kind === 'tapered' ? { fill: color } : undefined}
                strokeDasharray={edge.dashed ? '6 5' : undefined}
              />
            )
          })}

          {summaries.map(({ summary, box }) => {
            const width = Math.max(92, (summary.title?.length ?? 8) * 7 + 20)
            const sx = box.x + box.width + 44
            const sy = box.y + box.height / 2 - 15
            return (
              <g key={summary.id}>
                <path
                  d={`M ${box.x + box.width} ${box.y + box.height / 2} L ${sx - 8} ${box.y + box.height / 2} L ${sx - 8} ${sy + 15} L ${sx} ${sy + 15}`}
                  fill="none"
                  stroke={sheet.theme.summary?.properties?.['line-color'] as string ?? '#8b5cf6'}
                  strokeWidth={1.5}
                />
                <rect x={sx} y={sy} width={width} height={30} rx={8} fill="#f5f3ff" stroke="#c4b5fd" />
                <text x={sx + width / 2} y={sy + 19} textAnchor="middle" fontSize={11} fill="#5b21b6" fontWeight={600}>
                  {summary.title ?? 'Summary'}
                </text>
              </g>
            )
          })}

          {relationships.map((rel: Relationship) => {
            const a = nodeMap.get(rel.end1Id)!
            const b = nodeMap.get(rel.end2Id)!
            const p1 = { x: a.x + a.width / 2, y: a.y + a.height / 2 }
            const p2 = { x: b.x + b.width / 2, y: b.y + b.height / 2 }
            const color = (rel.style?.properties?.['line-color'] as string) ?? '#f59e0b'
            return (
              <g key={rel.id}>
                <path
                  d={curvePath(p1, p2, 'curve')}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  markerEnd="url(#relationship-arrow)"
                />
                {rel.title ? (
                  <text x={(p1.x + p2.x) / 2} y={(p1.y + p2.y) / 2 - 6} textAnchor="middle" fontSize={10} fill={color}>
                    {rel.title}
                  </text>
                ) : null}
              </g>
            )
          })}

          {dragPreview ? (
            <g className="drag-preview" pointerEvents="none">
              {dragPreview.targetId && nodeMap.get(dragPreview.targetId) ? (
                <line
                  className="snap-preview-line"
                  x1={dragPreview.bbox.x + dragPreview.bbox.width / 2}
                  y1={dragPreview.bbox.y + dragPreview.bbox.height / 2}
                  x2={nodeMap.get(dragPreview.targetId)!.x + nodeMap.get(dragPreview.targetId)!.width / 2}
                  y2={nodeMap.get(dragPreview.targetId)!.y + nodeMap.get(dragPreview.targetId)!.height / 2}
                />
              ) : null}
            </g>
          ) : null}

          {nodes.map((node) => {
            const style = styles.get(node.id)!
            const { width: w, height: h } = node
            const shape = topicShape(style, w, h)
            const isSelected = selection.includes(node.id)
            const isActive = activeTopicId === node.id
            const isDrop = dropTarget === node.id
            const hit = searchResults.includes(node.id)
            const pad = 12
            const markerList = node.topic.markers ?? []
            const markerSize = 13
            const markerCount = Math.min(markerList.length, 7)
            const labels = node.topic.labels ?? []
            const hasImage = Boolean(node.topic.image?.src)
            const imageHeight = hasImage ? Math.min(72, h - 34) : 0
            const textTop = node.y + (hasImage ? imageHeight + 6 : 0)
            const textAreaHeight = h - (hasImage ? imageHeight + 6 : 0) - (labels.length ? 15 : 0)
            const linkInset = node.topic.hyperlink ? LINK_TEXT_INSET : pad
            const maxTextWidth = Math.max(24, w - pad - linkInset)
            const lineHeight = style.fontSize * 1.35
            const lines = wrapText(node.topic.title || ' ', maxTextWidth, style.fontSize)
            const maxLines = Math.max(1, Math.floor((textAreaHeight - 4) / lineHeight))
            const visible = lines.length > maxLines ? [...lines.slice(0, maxLines - 1), `${lines[maxLines - 1].slice(0, -1)}…`] : lines
            const totalTextHeight = visible.length * lineHeight
            const startY = textTop + Math.max(6, (textAreaHeight - totalTextHeight) / 2) + style.fontSize
            const textAnchor = style.textAlign === 'left' ? 'start' : style.textAlign === 'right' ? 'end' : 'middle'
            const textX =
              style.textAlign === 'left'
                ? node.x + pad
                : style.textAlign === 'right'
                  ? node.x + w - linkInset
                  : node.x + (pad + w - linkInset) / 2
            const shapeFill = fillFor(style)
            const rough = style.handDrawn || settings.handDrawnMode || sheet.settings?.handDrawn === true
            return (
              <g
                key={node.id}
                data-topic-id={node.id}
                className={`topic-node ${isSelected ? 'selected' : ''} ${isActive ? 'active' : ''} ${isDrop ? 'drop-target' : ''} ${hit ? 'search-hit' : ''} ${dragPreview?.memberIds.has(node.id) ? 'dragging-source' : ''}`}
              >
                {shape.element === 'ellipse' ? (
                  <ellipse
                    className="topic-shape"
                    cx={node.x + w / 2}
                    cy={node.y + h / 2}
                    rx={w / 2}
                    ry={h / 2}
                    fill={shapeFill}
                    stroke={style.borderColor}
                    strokeWidth={style.borderWidth}
                    filter={rough ? 'url(#rough-edge)' : undefined}
                  />
                ) : shape.element === 'underline' ? (
                  <g className="topic-shape">
                    <line x1={node.x} y1={node.y + h - 1} x2={node.x + w} y2={node.y + h - 1} stroke={style.borderColor} strokeWidth={Math.max(1, style.borderWidth)} />
                  </g>
                ) : shape.element === 'diamond' ? (
                  <polygon
                    className="topic-shape"
                    points={`${node.x + w / 2},${node.y} ${node.x + w},${node.y + h / 2} ${node.x + w / 2},${node.y + h} ${node.x},${node.y + h / 2}`}
                    fill={shapeFill}
                    stroke={style.borderColor}
                    strokeWidth={style.borderWidth}
                    filter={rough ? 'url(#rough-edge)' : undefined}
                  />
                ) : (
                  <rect
                    className="topic-shape"
                    x={node.x}
                    y={node.y}
                    width={w}
                    height={h}
                    rx={shape.rx}
                    fill={shapeFill}
                    stroke={style.borderColor}
                    strokeWidth={style.borderWidth}
                    filter={rough ? 'url(#rough-edge)' : undefined}
                  />
                )}

                {hasImage && node.topic.image?.src ? (
                  <image
                    href={node.topic.image.src}
                    x={node.x + 6}
                    y={node.y + 6}
                    width={w - 12}
                    height={imageHeight}
                    preserveAspectRatio="xMidYMid slice"
                  />
                ) : null}

                {markerCount > 0 ? (
                  <text x={node.x + 8} y={node.y + 13} className="topic-marker">
                    {markerList
                      .slice(0, markerCount)
                      .map((m) => markerById(m.markerId)?.icon ?? '•')
                      .join(' ')}
                  </text>
                ) : null}

                {editingTopicId !== node.id ? (
                  <text
                    className="topic-text"
                    textAnchor={textAnchor}
                    fill={style.color}
                    fontSize={style.fontSize}
                    fontWeight={style.fontWeight}
                    fontStyle={style.fontStyle}
                    textDecoration={style.textDecoration}
                    style={{ fontFamily: style.fontFamily }}
                  >
                    {visible.map((line, index) => (
                      <tspan key={index} x={textX} y={startY + index * lineHeight}>
                        {line || ' '}
                      </tspan>
                    ))}
                  </text>
                ) : null}

                {labels.length ? (
                  <text
                    className="topic-label"
                    x={node.x + w / 2}
                    y={node.y + h - 7}
                    textAnchor="middle"
                    fill={style.color}
                    opacity={0.72}
                  >
                    {labels.slice(0, 3).join(' · ')}
                  </text>
                ) : null}

                {node.topic.notes?.plain?.content ? (
                  <text
                    className="topic-note-icon"
                    x={node.x + w - (node.topic.hyperlink ? 32 : 12)}
                    y={node.y + 12}
                    fontSize={10}
                    textAnchor="middle"
                  >
                    ✎
                  </text>
                ) : null}

                {node.topic.hyperlink ? (
                  <LinkBadge href={node.topic.hyperlink} x={node.x + w - 21} y={node.y + h / 2 - 6.6} color={style.color} />
                ) : null}

                {(node.topic.attachments?.length ?? 0) > 0 ? (
                  <text
                    className="topic-attach-icon"
                    x={node.x + w - (node.topic.hyperlink ? 38 : 24)}
                    y={node.y + h - 6}
                    fontSize={9}
                    textAnchor="middle"
                  >
                    ⧉
                  </text>
                ) : null}

                {node.hasChildren ? (
                  <g
                    className="topic-collapse"
                    transform={`translate(${node.side === 'left' ? node.x - 8 : node.x + w + 8} ${node.y + h / 2})`}
                    onPointerDown={(event) => {
                      event.stopPropagation()
                    }}
                    onClick={(event) => {
                      event.stopPropagation()
                      useMapStore.getState().toggleCollapse(node.id)
                    }}
                  >
                    <circle r={8} />
                    <text textAnchor="middle" y={3.5}>
                      {node.collapsed ? '+' : '−'}
                    </text>
                  </g>
                ) : null}
              </g>
            )
          })}

          {dragPreview ? (
            <g className="drag-ghost" pointerEvents="none">
              {dragPreview.members.map((member) => {
                const style = styles.get(member.id)
                if (!style) return null
                const topic = nodeMap.get(member.id)?.topic
                const lines = wrapText(topic?.title || '', Math.max(24, member.width - 20), style.fontSize).slice(0, 2)
                const lineHeight = style.fontSize * 1.3
                const startY =
                  member.y +
                  member.height / 2 -
                  ((lines.length - 1) * lineHeight) / 2 +
                  style.fontSize * 0.34
                const childCount = topic ? attachedOf(topic).length : 0
                return (
                  <g key={member.id}>
                    <rect
                      x={member.x}
                      y={member.y}
                      width={member.width}
                      height={member.height}
                      rx={Math.min(10, member.height / 3)}
                      fill={fillFor(style)}
                      stroke="var(--accent)"
                      strokeWidth={member.id === dragPreview.anchorId ? 2.5 : 2}
                      strokeDasharray="6 4"
                      opacity={0.94}
                    />
                    <text
                      textAnchor="middle"
                      fill={style.color}
                      fontSize={style.fontSize}
                      fontWeight={style.fontWeight}
                      style={{ fontFamily: style.fontFamily }}
                    >
                      {lines.map((line, index) => (
                        <tspan
                          key={index}
                          x={member.x + member.width / 2}
                          y={startY + index * lineHeight}
                        >
                          {line || ' '}
                        </tspan>
                      ))}
                    </text>
                    {childCount ? (
                      <g transform={`translate(${member.x + member.width - 2} ${member.y + 2})`}>
                        <circle r={9} fill="var(--accent)" />
                        <text textAnchor="middle" y={3.5} fontSize={10} fontWeight={700} fill="#ffffff">
                          {childCount}
                        </text>
                      </g>
                    ) : null}
                  </g>
                )
              })}
            </g>
          ) : null}

          {marquee ? (
            <rect
              className="selection-rect"
              x={(marquee.x - viewport.x) / viewport.zoom}
              y={(marquee.y - viewport.y) / viewport.zoom}
              width={marquee.width / viewport.zoom}
              height={marquee.height / viewport.zoom}
            />
          ) : null}
        </g>
      </svg>

      {dragPreview?.hint ? (
        (() => {
          const anchor = screenOf({
            x: dragPreview.bbox.x + dragPreview.bbox.width / 2,
            y: dragPreview.bbox.y
          })
          return (
            <div
              className={`drag-hint ${dragPreview.willDetachIds.size > 0 && !dragPreview.targetId ? 'danger' : ''}`}
              style={{ left: anchor.x, top: anchor.y - 10 }}
            >
              {dragPreview.hint}
            </div>
          )
        })()
      ) : null}

      {editingNode && editorRect && editingStyle ? (
        <textarea
          ref={editorRef}
          className="inline-editor"
          style={{
            left: editorRect.left,
            top: editorRect.top,
            width: Math.max(editorRect.width, 150),
            minHeight: Math.max(editorRect.height, 38),
            fontSize: Math.max(11, editingStyle.fontSize * viewport.zoom),
            lineHeight: 1.35,
            background: editingStyle.fill,
            color: editingStyle.color,
            borderRadius: editorShape && 'rx' in editorShape && typeof editorShape.rx === 'number' ? editorShape.rx * viewport.zoom : 4,
          }}
          value={editingDraft}
          onChange={(event) => useMapStore.getState().updateEditDraft(event.target.value)}
          onKeyDown={handleEditorKeyDown}
          onBlur={() => {
            const state = useMapStore.getState()
            if (state.editingTopicId) state.commitEdit()
          }}
          spellCheck={false}
        />
      ) : null}

      {!sheet.rootTopic.title && !nodes.length ? <div className="canvas-empty">双击空白处创建一个主题</div> : null}

      {nodes.length <= 2 || relationshipFrom ? (
        <div className="canvas-hint">
          {relationshipFrom
            ? '点击目标主题以创建关系线 · Esc 取消'
            : '双击空白新建 · Tab 子主题 · Enter 同级 · 空格拖动画布 · ⌘/Ctrl+滚轮缩放'}
        </div>
      ) : null}

      {contextMenu ? (
        <ContextMenu
          state={contextMenu}
          onClose={() => setContextMenu(null)}
          onAddFloating={() => {
            const store = useMapStore.getState()
            const rootCenter = rootNode ? { x: rootNode.x + rootNode.width / 2, y: rootNode.y + rootNode.height / 2 } : { x: 0, y: 0 }
            store.addFloatingTopic({ x: contextMenu.world.x - rootCenter.x, y: contextMenu.world.y - rootCenter.y })
            setContextMenu(null)
          }}
        />
      ) : null}
    </div>
  )
}

function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable
}

function ContextMenu({
  state,
  onClose,
  onAddFloating
}: {
  state: ContextMenuState
  onClose: () => void
  onAddFloating: () => void
}) {
  const store = useMapStore.getState()
  const sheet = activeSheet(store.workbook)
  const topic = state.topicId ? findTopic(sheet.rootTopic, state.topicId) : undefined
  const ui = useUiStore.getState()

  useEffect(() => {
    const close = () => onClose()
    window.addEventListener('mousedown', close)
    window.addEventListener('blur', close)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('blur', close)
    }
  }, [onClose])

  const item = (label: string, action: () => void, danger = false) => (
    <button
      key={label}
      className={`context-item ${danger ? 'danger' : ''}`}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={() => {
        action()
        onClose()
      }}
    >
      {label}
    </button>
  )

  return (
    <div
      className="context-menu"
      style={{ left: Math.min(state.x, window.innerWidth - 230), top: Math.min(state.y, window.innerHeight - 320) }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {topic ? (
        <>
          {item('编辑主题', () => store.beginEdit(topic.id))}
          {item('插入子主题', () => store.addChild(topic.id))}
          {item('插入同级主题', () => store.addSibling(topic.id))}
          <div className="context-sep" />
          {item('添加备注', () => {
            store.select([topic.id], false)
            store.setPanel('notes', true)
          })}
          {item('标记与标签', () => {
            store.select([topic.id], false)
            store.togglePanel('markers')
          })}
          {item('插入关系线', () => {
            ui.setRelationshipFrom(topic.id)
            ui.toast('点击目标主题以完成关系线')
          })}
          {item('插入边界', () => {
            store.select([topic.id], false)
            store.addBoundary([topic.id])
          })}
          {item('插入摘要', () => {
            store.select([topic.id], false)
            store.addSummary([topic.id])
          })}
          <div className="context-sep" />
          {item('复制', () => {
            store.select([topic.id], false)
            store.copySelection()
          })}
          {item('粘贴为子主题', () => store.paste(topic.id))}
          {item('创建副本', () => {
            store.select([topic.id], false)
            store.duplicateSelection()
          })}
          {item('复制样式', () => {
            store.select([topic.id], false)
            store.copyStyle()
          })}
          {item('粘贴样式', () => {
            store.select([topic.id], false)
            store.pasteStyle()
          })}
          <div className="context-sep" />
          {item(topic.collapsed ? '展开分支' : '折叠分支', () => store.toggleCollapse(topic.id))}
          {topic.id !== sheet.rootTopic.id ? item('删除', () => {
            store.select([topic.id], false)
            store.deleteSelection()
          }, true) : null}
        </>
      ) : (
        <>
          {item('插入自由主题', onAddFloating)}
          {item('粘贴', () => store.paste())}
          <div className="context-sep" />
          {item('全选', () => store.selectAll())}
          {item('适应画布', () => window.dispatchEvent(new CustomEvent('xmind:fit')))}
        </>
      )}
    </div>
  )
}

/** 主题最右侧的超链接图标：点击用系统默认程序打开。 */
function LinkBadge({ href, x, y, color }: { href: string; x: number; y: number; color: string }) {
  return (
    <g
      className="topic-link-icon"
      transform={`translate(${x} ${y})`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation()
        void openExternal(href).then((ok) => {
          if (!ok) useUiStore.getState().toast('无法打开链接', 'error')
        })
      }}
    >
      <title>{href}</title>
      <circle className="topic-link-hit" cx={6.6} cy={6.6} r={11} />
      <g className="topic-link-glyph" transform="scale(0.55)" stroke={color} strokeWidth={2.4}>
        <path d="M15 3h6v6" />
        <path d="M10 14 21 3" />
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      </g>
    </g>
  )
}
