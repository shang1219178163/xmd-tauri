import { describe, expect, it } from 'vitest'
import { createMapStore } from './mapStore'
import { attachedOf, detachedOf, findTopic } from '../model/tree'
import { layoutSheet } from '../layout'
import { structureClassOf } from '@shared/structures'

function setup() {
  const store = createMapStore()
  // The starter workbook already has three children; reset to an empty root.
  store.getState().reset()
  const rootId = store.getState().workbook.sheets[0].rootTopic.id
  const a = store.getState().addChild(rootId)!
  const b = store.getState().addChild(rootId)!
  const c = store.getState().addChild(rootId)!
  return { store, rootId, a, b, c }
}

function rootOf(store: ReturnType<typeof createMapStore>) {
  return store.getState().workbook.sheets[0].rootTopic
}

describe('moveTopics', () => {
  it('appends every topic under the target in the given order', () => {
    const { store, a, b, c } = setup()
    store.getState().moveTopics([b, a], c)
    const root = rootOf(store)
    expect(attachedOf(root).map((topic) => topic.id)).toEqual([c])
    expect(attachedOf(findTopic(root, c)!).map((topic) => topic.id)).toEqual([b, a])
    expect(store.getState().selection).toEqual([b, a])
  })

  it('skips topics that already hang under the target', () => {
    const { store, a, b, c, rootId } = setup()
    const d = store.getState().addChild(rootId)!
    store.getState().moveTopics([a], c)
    store.getState().moveTopics([d], c)
    store.getState().moveTopics([a, b], c)
    expect(attachedOf(findTopic(rootOf(store), c)!).map((topic) => topic.id)).toEqual([a, d, b])
  })

  it('reattaches a floating topic even when its structural parent is the target', () => {
    const { store, a, rootId } = setup()
    store.getState().detachTopics([{ id: a, position: { x: 10, y: 10 } }])
    expect(detachedOf(rootOf(store)).map((topic) => topic.id)).toEqual([a])
    store.getState().moveTopics([a], rootId)
    const root = rootOf(store)
    expect(attachedOf(root).map((topic) => topic.id)).toContain(a)
    expect(detachedOf(root)).toHaveLength(0)
    expect(findTopic(rootOf(store), a)!.position).toBeUndefined()
  })

  it('does not partially move when the target is inside the moved selection', () => {
    const { store, a, b, c } = setup()
    store.getState().moveTopics([a, b], a)
    const root = rootOf(store)
    expect(attachedOf(root).map((topic) => topic.id)).toEqual([a, b, c])
    expect(attachedOf(findTopic(root, a)!)).toHaveLength(0)
  })
})

describe('detachTopics', () => {
  it('detaches every topic in one mutation and stores its position', () => {
    const { store, a, b } = setup()
    store.getState().detachTopics([
      { id: a, position: { x: 10, y: 20 } },
      { id: b, position: { x: 30, y: 40 } }
    ])
    const root = rootOf(store)
    expect(attachedOf(root).map((topic) => topic.id)).toHaveLength(1)
    expect(detachedOf(root).map((topic) => topic.id)).toEqual([a, b])
    expect(findTopic(root, a)!.position).toEqual({ x: 10, y: 20 })
    expect(findTopic(root, b)!.position).toEqual({ x: 30, y: 40 })
  })
})

describe('updateTopicPositions', () => {
  it('updates positions of floating topics', () => {
    const { store, a, b } = setup()
    store.getState().detachTopics([
      { id: a, position: { x: 0, y: 0 } },
      { id: b, position: { x: 0, y: 0 } }
    ])
    store.getState().updateTopicPositions([
      { id: a, position: { x: 50, y: 60 } },
      { id: b, position: { x: 70, y: 80 } }
    ])
    const root = rootOf(store)
    expect(findTopic(root, a)!.position).toEqual({ x: 50, y: 60 })
    expect(findTopic(root, b)!.position).toEqual({ x: 70, y: 80 })
  })

  it('keeps only existing floating topics in the selection', () => {
    const { store, a, b } = setup()
    store.getState().detachTopics([{ id: a, position: { x: 0, y: 0 } }])
    store.getState().updateTopicPositions([
      { id: a, position: { x: 5, y: 6 } },
      { id: b, position: { x: 7, y: 8 } },
      { id: 'missing', position: { x: 9, y: 10 } }
    ])
    expect(store.getState().selection).toEqual([a])
    expect(findTopic(rootOf(store), a)!.position).toEqual({ x: 5, y: 6 })
    expect(findTopic(rootOf(store), b)!.position).toBeUndefined()
  })
})

describe('setStructure', () => {
  it('writes the sheet skeleton to the root topic and re-layouts it', () => {
    const { store, a } = setup()
    store.getState().setActiveTopic(a)
    store.getState().setStructure('orgDown')
    const sheet = store.getState().getActiveSheet()
    expect(sheet.rootTopic.structureClass).toBe(structureClassOf('orgDown'))
    expect(findTopic(sheet.rootTopic, a)!.structureClass).toBeUndefined()
    expect(layoutSheet(sheet).structure).toBe('orgDown')
  })
})

describe('drag transaction', () => {
  it('undoes a batch move in one step', () => {
    const { store, a, b, c } = setup()
    const before = structuredClone(store.getState().workbook)
    const pastBefore = store.getState().past.length
    store.getState().beginTransaction()
    store.getState().moveTopics([a, b], c)
    store.getState().endTransaction()
    expect(store.getState().past.length).toBe(pastBefore + 1)
    expect(attachedOf(findTopic(rootOf(store), c)!).map((topic) => topic.id)).toEqual([a, b])
    store.getState().undo()
    expect(store.getState().workbook).toEqual(before)
  })
})

describe('addSheet', () => {
  it('creates a blank sheet instead of cloning the first one', () => {
    const { store, rootId } = setup()
    store.getState().addChild(rootId)
    expect(attachedOf(rootOf(store))).toHaveLength(4)

    store.getState().addSheet()
    const wb = store.getState().workbook
    expect(wb.sheets).toHaveLength(2)
    expect(wb.activeSheetId).toBe(wb.sheets[1].id)
    expect(wb.sheets[1].title).toBe('Map 2')
    // Blank canvas: only the central topic, no cloned children.
    expect(wb.sheets[1].rootTopic.title).toBe('中心主题')
    expect(attachedOf(wb.sheets[1].rootTopic)).toHaveLength(0)
    // The original sheet is untouched.
    expect(attachedOf(wb.sheets[0].rootTopic)).toHaveLength(4)
  })
})

describe('copy and paste style', () => {
  it('copies explicit topic style properties onto another topic', () => {
    const { store, a, b } = setup()
    store.getState().select([a], false)
    store.getState().setTopicStyleForSelection({ 'svg:fill': '#ff0000', 'fo:color': '#ffffff' })
    store.getState().copyStyle()
    store.getState().select([b], false)
    store.getState().pasteStyle()
    expect(store.getState().getTopic(b)?.style?.properties).toMatchObject({
      'svg:fill': '#ff0000',
      'fo:color': '#ffffff'
    })
  })
})
