import type { Theme, Topic } from '@shared/types'
import { SIBLING_GAP_X, SIBLING_GAP_Y } from './constants'
import { measureTopic } from './measure'
import type { MeasureFn, MeasuredTopic } from './model'
import type { LayoutSpacing } from './settings'
import {
  asString,
  isDashedLine,
  parseLineWidth,
  resolveTopicStyle
} from './style'

export interface ModelOptions {
  theme: Theme
  measure?: MeasureFn
  spacing?: LayoutSpacing
}

/** Build the measured, collapsed-aware tree used by every layout family. */
export function buildModel(rootTopic: Topic, options: ModelOptions): MeasuredTopic {
  return buildNode(rootTopic, 0, true, false, undefined, options)
}

function buildNode(
  topic: Topic,
  depth: number,
  isRoot: boolean,
  isFloating: boolean,
  parentId: string | undefined,
  options: ModelOptions
): MeasuredTopic {
  const size = measureNode(topic, depth, isRoot, isFloating, options)
  const style = resolveTopicStyle(topic, options.theme, depth, isRoot, isFloating)
  const lineClass = asString(style['line-class'])
  const attached = topic.children?.attached ?? []
  const detached = topic.children?.detached ?? []
  const collapsed = topic.collapsed === true

  const children = collapsed
    ? []
    : attached.map((child) =>
        buildNode(child, depth + 1, false, false, topic.id, options)
      )
  const floatingChildren = collapsed
    ? []
    : detached.map((child) =>
        buildNode(child, depth + 1, false, true, topic.id, options)
      )

  const siblingY = options.spacing?.siblingY ?? SIBLING_GAP_Y
  const siblingX = options.spacing?.siblingX ?? SIBLING_GAP_X
  const stackHeight =
    children.length > 0
      ? Math.max(
          size.height,
          children.reduce((sum, child) => sum + child.stackHeight, 0) +
            siblingY * (children.length - 1)
        )
      : size.height
  const stackWidth =
    children.length > 0
      ? Math.max(
          size.width,
          children.reduce((sum, child) => sum + child.stackWidth, 0) +
            siblingX * (children.length - 1)
        )
      : size.width

  return {
    topic,
    id: topic.id,
    parentId,
    depth,
    width: size.width,
    height: size.height,
    isRoot,
    isFloating,
    collapsed,
    hasChildren: attached.length + detached.length > 0,
    lineClass,
    lineColor:
      asString(style['line-color']) ?? asString(style['border-line-color']),
    lineWidth: parseLineWidth(
      style['line-width'] ?? style['border-line-width'],
      2
    ),
    dashed: isDashedLine(lineClass, style['line-style']),
    children,
    detached: floatingChildren,
    stackHeight,
    stackWidth
  }
}

function measureNode(
  topic: Topic,
  depth: number,
  isRoot: boolean,
  isFloating: boolean,
  options: ModelOptions
): { width: number; height: number } {
  if (!options.measure) {
    return measureTopic(topic, {
      theme: options.theme,
      depth,
      isRoot,
      isFloating
    })
  }

  const measured = options.measure(topic, { depth, isRoot, isFloating })
  const width =
    Number.isFinite(measured.width) && measured.width > 0
      ? measured.width
      : 72
  const height =
    Number.isFinite(measured.height) && measured.height > 0
      ? measured.height
      : 36

  // Explicit sizes always win, even when an external measurer is supplied.
  const customWidth = topic.customWidth
  const customHeight = topic.customHeight
  return {
    width:
      typeof customWidth === 'number' &&
      Number.isFinite(customWidth) &&
      customWidth > 0
        ? customWidth
        : width,
    height:
      typeof customHeight === 'number' &&
      Number.isFinite(customHeight) &&
      customHeight > 0
        ? customHeight
        : height
  }
}

/** Collect every floating (detached) topic in document order. */
export function collectFloating(root: MeasuredTopic): MeasuredTopic[] {
  const result: MeasuredTopic[] = []
  const visit = (node: MeasuredTopic): void => {
    for (const child of node.children) visit(child)
    for (const floating of node.detached) {
      result.push(floating)
      visit(floating)
    }
  }
  visit(root)
  return result
}
