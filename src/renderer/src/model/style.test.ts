import { describe, expect, it } from 'vitest'
import { lineKindOf, resolveBranchKind } from './style'

const CURVE = 'org.xmind.branchConnection.curve'
const STRAIGHT = 'org.xmind.branchConnection.straight'
const ELBOW = 'org.xmind.branchConnection.elbow'

describe('lineKindOf', () => {
  it('maps XMind line classes to renderer kinds', () => {
    expect(lineKindOf(CURVE)).toBe('curve')
    expect(lineKindOf(STRAIGHT)).toBe('straight')
    expect(lineKindOf(ELBOW)).toBe('elbow')
    expect(lineKindOf('org.xmind.branchConnection.tapered')).toBe('tapered')
  })

  it('maps new line classes', () => {
    expect(lineKindOf('org.xmind.branchConnection.bight')).toBe('bight')
    expect(lineKindOf('org.xmind.branchConnection.fold')).toBe('fold')
    expect(lineKindOf('org.xmind.branchConnection.roundedfold')).toBe('roundedFold')
    expect(lineKindOf('org.xmind.branchConnection.brace')).toBe('brace')
    expect(lineKindOf('org.xmind.branchConnection.roundedElbow')).toBe('roundedElbow')
  })
})

describe('resolveBranchKind', () => {
  it('keeps a non-curve layout kind on primary branches', () => {
    expect(resolveBranchKind('straight', 1, 'map', STRAIGHT)).toBe('straight')
    expect(resolveBranchKind('bight', 1, 'logic', CURVE)).toBe('bight')
  })

  it('keeps primary logic branches curved when the layout kind is curve', () => {
    expect(resolveBranchKind('curve', 1, 'logic', CURVE)).toBe('curve')
  })

  it('uses a straight line style for deeper branches', () => {
    expect(resolveBranchKind('curve', 2, 'map', STRAIGHT)).toBe('straight')
  })

  it('preserves org-chart elbows', () => {
    expect(resolveBranchKind('elbow', 1, 'org', CURVE)).toBe('elbow')
    expect(resolveBranchKind('elbow', 3, 'org', ELBOW)).toBe('elbow')
  })

  it('does not turn a straight layout into an elbow by style alone', () => {
    expect(resolveBranchKind('straight', 3, 'logic', ELBOW)).toBe('straight')
  })

  it('lets an explicit line style override the default curve rule', () => {
    expect(resolveBranchKind('curve', 1, 'map', STRAIGHT, true)).toBe('straight')
    expect(resolveBranchKind('straight', 1, 'logic', CURVE, true)).toBe('curve')
  })
})

describe('resolveBranchKind with theme line classes', () => {
  it('keeps a bight/fold first-level branch instead of forcing curve', () => {
    expect(resolveBranchKind('bight', 1, 'logic', 'org.xmind.branchConnection.bight')).toBe('bight')
    expect(resolveBranchKind('fold', 1, 'map', 'org.xmind.branchConnection.fold')).toBe('fold')
    expect(
      resolveBranchKind('roundedElbow', 1, 'logic', 'org.xmind.branchConnection.roundedElbow')
    ).toBe('roundedElbow')
  })

  it('still forces curve when the theme line is curve', () => {
    expect(resolveBranchKind('curve', 1, 'logic', 'org.xmind.branchConnection.curve')).toBe('curve')
  })
})
