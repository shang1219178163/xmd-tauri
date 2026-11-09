import type { Sheet, Topic, TopicChildren, Workbook } from '@shared/types'

let idCounter = 0

export function generateId(prefix = 't'): string {
  idCounter += 1
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}-${rand}`
}

export function emptyChildren(): TopicChildren {
  return { attached: [], detached: [] }
}

export function attachedOf(topic: Topic): Topic[] {
  return topic.children?.attached ?? []
}

export function detachedOf(topic: Topic): Topic[] {
  return topic.children?.detached ?? []
}

export function allChildren(topic: Topic): Topic[] {
  return [...attachedOf(topic), ...detachedOf(topic)]
}

export function findTopic(root: Topic, id: string): Topic | undefined {
  if (root.id === id) return root
  for (const child of allChildren(root)) {
    const hit = findTopic(child, id)
    if (hit) return hit
  }
  return undefined
}

export function findTopicPath(root: Topic, id: string): Topic[] | undefined {
  if (root.id === id) return [root]
  for (const child of allChildren(root)) {
    const path = findTopicPath(child, id)
    if (path) return [root, ...path]
  }
  return undefined
}

export function findParent(root: Topic, id: string): Topic | undefined {
  for (const child of allChildren(root)) {
    if (child.id === id) return root
    const hit = findParent(child, id)
    if (hit) return hit
  }
  return undefined
}

export function getParentMap(root: Topic): Map<string, string | undefined> {
  const map = new Map<string, string | undefined>()
  const visit = (topic: Topic, parentId?: string) => {
    map.set(topic.id, parentId)
    for (const child of allChildren(topic)) visit(child, topic.id)
  }
  visit(root)
  return map
}

export function isDescendant(root: Topic, ancestorId: string, candidateId: string): boolean {
  const ancestor = findTopic(root, ancestorId)
  if (!ancestor) return false
  return findTopic(ancestor, candidateId) !== undefined
}

export function walkTopics(
  root: Topic,
  visit: (topic: Topic, parent: Topic | undefined, depth: number) => void,
  parent?: Topic,
  depth = 0
): void {
  visit(root, parent, depth)
  for (const child of allChildren(root)) walkTopics(child, visit, root, depth + 1)
}

export function flattenTopics(root: Topic): Topic[] {
  const out: Topic[] = []
  walkTopics(root, (topic) => out.push(topic))
  return out
}

/**
 * Keep only the top-most selected topics, preserving the order of `ids`.
 * The root is always excluded. A selected topic is dropped when one of its
 * ancestors is also selected, and ids that no longer exist in the tree are dropped.
 */
export function selectionRoots(root: Topic, ids: string[]): string[] {
  const unique = Array.from(new Set(ids)).filter((id) => id !== root.id)
  if (!unique.length) return []
  const parents = getParentMap(root)
  const selected = new Set(unique)
  return unique.filter((id) => {
    if (!parents.has(id)) return false
    let parentId = parents.get(id)
    while (parentId) {
      if (selected.has(parentId)) return false
      parentId = parents.get(parentId)
    }
    return true
  })
}

/** Ids of every topic that is a member or a descendant of a member. */
export function excludedTopicIds(root: Topic, memberIds: Iterable<string>): Set<string> {
  const members = new Set(memberIds)
  const excluded = new Set<string>()
  const visit = (topic: Topic, inside: boolean) => {
    const next = inside || members.has(topic.id)
    if (next) excluded.add(topic.id)
    for (const child of allChildren(topic)) visit(child, next)
  }
  visit(root, false)
  return excluded
}

export function countTopics(root: Topic): number {
  return flattenTopics(root).length
}

/** Replace one topic in the tree, returning a new root. */
export function updateTopic(root: Topic, id: string, updater: (topic: Topic) => Topic): Topic {
  if (root.id === id) return updater(root)
  const attached = root.children?.attached
  const detached = root.children?.detached
  if (!attached?.length && !detached?.length) return root
  let changed = false
  const nextAttached = attached?.map((child) => {
    const next = updateTopic(child, id, updater)
    if (next !== child) changed = true
    return next
  })
  const nextDetached = detached?.map((child) => {
    const next = updateTopic(child, id, updater)
    if (next !== child) changed = true
    return next
  })
  if (!changed) return root
  return {
    ...root,
    children: {
      ...root.children,
      attached: nextAttached,
      detached: nextDetached
    }
  }
}

/** Remove every topic whose id is in `ids`. Returns null if the root itself is removed. */
export function removeTopics(root: Topic, ids: Set<string>): Topic | null {
  if (ids.has(root.id)) return null
  const attached = root.children?.attached
  const detached = root.children?.detached
  if (!attached?.length && !detached?.length) return root
  let changed = false
  const filter = (list: Topic[] | undefined): Topic[] | undefined => {
    if (!list) return list
    const next: Topic[] = []
    for (const child of list) {
      if (ids.has(child.id)) {
        changed = true
        continue
      }
      const pruned = removeTopics(child, ids)
      if (pruned === null) {
        changed = true
        continue
      }
      if (pruned !== child) changed = true
      next.push(pruned)
    }
    return next
  }
  const nextAttached = filter(attached)
  const nextDetached = filter(detached)
  if (!changed) return root
  return {
    ...root,
    children: { ...root.children, attached: nextAttached, detached: nextDetached }
  }
}

export function insertChild(root: Topic, parentId: string, child: Topic, index?: number): Topic {
  return updateTopic(root, parentId, (parent) => {
    const attached = [...attachedOf(parent)]
    const at = index === undefined ? attached.length : Math.max(0, Math.min(index, attached.length))
    attached.splice(at, 0, child)
    return { ...parent, children: { ...parent.children, attached }, collapsed: false }
  })
}

export function insertSibling(root: Topic, referenceId: string, sibling: Topic): Topic {
  const parent = findParent(root, referenceId)
  if (!parent) return root
  return updateTopic(root, parent.id, (p) => {
    const attached = [...attachedOf(p)]
    const idx = attached.findIndex((t) => t.id === referenceId)
    const at = idx >= 0 ? idx + 1 : attached.length
    attached.splice(at, 0, sibling)
    return { ...p, children: { ...p.children, attached }, collapsed: false }
  })
}

export function moveTopic(root: Topic, id: string, newParentId: string, index: number): Topic {
  if (id === root.id) return root
  if (id === newParentId) return root
  if (isDescendant(root, id, newParentId)) return root
  const moving = findTopic(root, id)
  const target = findTopic(root, newParentId)
  if (!moving || !target) return root
  const removed = removeTopics(root, new Set([id]))
  if (!removed) return root
  return insertChild(removed, newParentId, moving, index)
}

export function cloneTopic(topic: Topic, freshIds = true): Topic {
  const copy: Topic = structuredClone(topic)
  if (!freshIds) return copy
  const reid = (node: Topic) => {
    node.id = generateId('topic')
    for (const child of allChildren(node)) reid(child)
    if (node.summaries) for (const s of node.summaries) s.id = generateId('summary')
    if (node.boundaries) for (const b of node.boundaries) b.id = generateId('boundary')
  }
  reid(copy)
  return copy
}

export function setTopicChildren(topic: Topic, attached: Topic[], detached?: Topic[]): Topic {
  return {
    ...topic,
    children: {
      ...topic.children,
      attached,
      detached: detached ?? topic.children?.detached
    }
  }
}

export function topicText(topic: Topic): string {
  return topic.title ?? ''
}

export function pathTitles(root: Topic, id: string): string[] {
  return findTopicPath(root, id)?.map(topicText) ?? []
}

export function previousSibling(root: Topic, id: string): Topic | undefined {
  const parent = findParent(root, id)
  if (!parent) return undefined
  const list = attachedOf(parent)
  const idx = list.findIndex((t) => t.id === id)
  return idx > 0 ? list[idx - 1] : undefined
}

export function nextSibling(root: Topic, id: string): Topic | undefined {
  const parent = findParent(root, id)
  if (!parent) return undefined
  const list = attachedOf(parent)
  const idx = list.findIndex((t) => t.id === id)
  return idx >= 0 && idx < list.length - 1 ? list[idx + 1] : undefined
}

/* ------------------------------------------------------------------ */
/* Workbook helpers                                                    */
/* ------------------------------------------------------------------ */

export function findSheet(workbook: Workbook, id: string): Sheet | undefined {
  return workbook.sheets.find((s) => s.id === id)
}

export function activeSheet(workbook: Workbook): Sheet {
  return findSheet(workbook, workbook.activeSheetId) ?? workbook.sheets[0]
}

export function updateSheet(workbook: Workbook, id: string, updater: (sheet: Sheet) => Sheet): Workbook {
  return { ...workbook, sheets: workbook.sheets.map((s) => (s.id === id ? updater(s) : s)) }
}

export function cloneSheet(sheet: Sheet, title?: string): Sheet {
  const copy = structuredClone(sheet)
  const idMap = new Map<string, string>()
  const reid = (node: Topic) => {
    const oldId = node.id
    node.id = generateId('topic')
    idMap.set(oldId, node.id)
    for (const child of allChildren(node)) reid(child)
  }
  reid(copy.rootTopic)
  for (const rel of copy.relationships ?? []) {
    rel.id = generateId('relation')
    rel.end1Id = idMap.get(rel.end1Id) ?? rel.end1Id
    rel.end2Id = idMap.get(rel.end2Id) ?? rel.end2Id
  }
  copy.id = generateId('sheet')
  copy.title = title ?? `${sheet.title} 2`
  return copy
}
