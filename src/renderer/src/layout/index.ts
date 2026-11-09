import type { LayoutResult, Sheet } from '@shared/types'
import { rainbowPalette } from '@shared/defaults'
import { STRUCTURES, structureKeyOf } from '@shared/structures'
import { buildModel, collectFloating } from './build'
import { LayoutBuilder } from './builder'
import { buildEdges } from './edges'
import { layoutFishbone } from './fishbone'
import { layoutFloating } from './floating'
import { layoutOneSided } from './logic'
import { layoutMap } from './map'
import { layoutMatrix } from './matrix'
import type { MeasureFn } from './model'
import { layoutOrg } from './org'
import { layoutSpreadsheet, layoutTreetable } from './table'
import { layoutTimelineHorizontal, layoutTimelineVertical } from './timeline'
import { layoutSettingsOf, spacingOf } from './settings'
import { buildDecorations } from './decorations'

export { measureTopic } from './measure'
export type { MeasureOptions } from './measure'
export type { MeasureContext, MeasureFn, MeasuredTopic } from './model'

export interface LayoutOptions {
  /** Optional external measurer (e.g. DOM text measurement). */
  measure?: MeasureFn
}

/**
 * Layout a complete sheet. Pure and deterministic: the returned nodes use
 * absolute canvas coordinates and the bounds include 60px of padding.
 */
export function layoutSheet(
  sheet: Sheet,
  options: LayoutOptions = {}
): LayoutResult {
  const structure = structureKeyOf(sheet.rootTopic.structureClass)
  const definition = STRUCTURES[structure] ?? STRUCTURES.map
  const settings = layoutSettingsOf(sheet)
  const spacing = spacingOf(settings)
  const root = buildModel(sheet.rootTopic, {
    theme: sheet.theme,
    measure: options.measure,
    spacing
  })
  const builder = new LayoutBuilder()
  const context = { root, builder, structure, settings, spacing }

  switch (definition.family) {
    case 'map':
      layoutMap(context)
      break
    case 'logic':
    case 'tree':
      layoutOneSided(
        context,
        definition.direction === 'left' ? 'left' : 'right'
      )
      break
    case 'org':
      layoutOrg(context, definition.direction === 'up' ? 'up' : 'down')
      break
    case 'timeline':
      if (definition.key === 'timelineVertical') layoutTimelineVertical(context)
      else layoutTimelineHorizontal(context)
      break
    case 'fishbone':
      layoutFishbone(
        context,
        definition.key === 'fishboneRight' ? 'right' : 'left'
      )
      break
    case 'matrix':
      layoutMatrix(context)
      break
    case 'treetable':
      layoutTreetable(context)
      break
    case 'brace':
      layoutOneSided(
        context,
        definition.direction === 'left' ? 'left' : 'right'
      )
      break
    case 'spreadsheet':
      layoutSpreadsheet(context)
      break
    default:
      layoutMap(context)
      break
  }

  const floating = collectFloating(root)
  const rootNode = builder.get(root.id)
  if (rootNode) layoutFloating(floating, rootNode, builder, spacing, settings.flexibleFloating)

  const rainbow =
    sheet.settings?.rainbow === true ||
    (sheet.settings?.rainbow !== false && (sheet.theme as { rainbow?: boolean }).rainbow === true)
  const edges =
    definition.family === 'brace'
      ? []
      : buildEdges(root, floating, builder.nodes, structure, {
          rainbow,
          palette: rainbowPalette(sheet.settings?.rainbowPalette)
        })
  const decorations = buildDecorations(root, builder.nodes, structure)
  return {
    nodes: builder.nodes,
    edges,
    decorations,
    bounds: builder.bounds(),
    structure
  }
}
