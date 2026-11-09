import type { Sheet } from '@shared/types'
import {
  AXIS_BRANCH_GAP,
  AXIS_OFFSET,
  AXIS_START_GAP,
  FISHBONE_BRANCH_GAP,
  FISHBONE_HEAD_GAP,
  LEVEL_GAP_X,
  LEVEL_GAP_Y,
  MATRIX_CELL_PADDING,
  SIBLING_GAP_X,
  SIBLING_GAP_Y,
  SPREADSHEET_CELL_PADDING,
  SPREADSHEET_COL_GAP,
  TREETABLE_COL_GAP,
  TREETABLE_ROW_GAP
} from './constants'

/** Sheet-level layout switches exposed by the canvas panel. */
export interface LayoutSettings {
  /** Distribute main topics across both sides of a map. */
  autoBalance: boolean
  /** Shrink level/sibling gaps. */
  compactLayout: boolean
  /** Share one column anchor per depth instead of indenting from each parent. */
  alignSiblings: boolean
  /** Dragging detaches immediately instead of snapping to nearby topics. */
  freeBranch: boolean
  /** Honor saved positions for floating topics; otherwise auto-arrange them. */
  flexibleFloating: boolean
  /** Allow dragged topics to overlap other topics. */
  topicOverlap: boolean
}

export interface LayoutSpacing {
  levelX: number
  levelY: number
  siblingX: number
  siblingY: number
  axisOffset: number
  axisBranchGap: number
  axisStartGap: number
  fishboneHeadGap: number
  fishboneBranchGap: number
  matrixCellPadding: number
  treetableColGap: number
  treetableRowGap: number
  spreadsheetColGap: number
  spreadsheetCellPadding: number
}

export function layoutSettingsOf(sheet: Sheet): LayoutSettings {
  const settings = sheet.settings ?? {}
  return {
    autoBalance: settings.autoBalance !== false,
    compactLayout: settings.compactLayout === true,
    alignSiblings: settings.alignSiblings !== false,
    freeBranch: settings.freeBranch === true,
    flexibleFloating: settings.flexibleFloating !== false,
    topicOverlap: settings.topicOverlap === true
  }
}

/** Compact layouts keep 65% of the default gaps. */
export function spacingOf(settings: LayoutSettings): LayoutSpacing {
  const scale = settings.compactLayout ? 0.65 : 1
  const gap = (value: number): number => Math.max(4, Math.round(value * scale))
  return {
    levelX: gap(LEVEL_GAP_X),
    levelY: gap(LEVEL_GAP_Y),
    siblingX: gap(SIBLING_GAP_X),
    siblingY: gap(SIBLING_GAP_Y),
    axisOffset: gap(AXIS_OFFSET),
    axisBranchGap: gap(AXIS_BRANCH_GAP),
    axisStartGap: gap(AXIS_START_GAP),
    fishboneHeadGap: gap(FISHBONE_HEAD_GAP),
    fishboneBranchGap: gap(FISHBONE_BRANCH_GAP),
    matrixCellPadding: gap(MATRIX_CELL_PADDING),
    treetableColGap: gap(TREETABLE_COL_GAP),
    treetableRowGap: gap(TREETABLE_ROW_GAP),
    spreadsheetColGap: gap(SPREADSHEET_COL_GAP),
    spreadsheetCellPadding: gap(SPREADSHEET_CELL_PADDING)
  }
}
