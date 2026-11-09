import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME } from '@shared/defaults'
import { edgeKindFromLineClass, resolveTopicStyle } from './style'

describe('edgeKindFromLineClass', () => {
  it('parses every Xmind branch connection class', () => {
    expect(edgeKindFromLineClass('org.xmind.branchConnection.curve')).toBe('curve')
    expect(edgeKindFromLineClass('org.xmind.branchConnection.straight')).toBe('straight')
    expect(edgeKindFromLineClass('org.xmind.branchConnection.elbow')).toBe('elbow')
    expect(edgeKindFromLineClass('org.xmind.branchConnection.roundedElbow')).toBe('roundedElbow')
    expect(edgeKindFromLineClass('org.xmind.branchConnection.bight')).toBe('bight')
    expect(edgeKindFromLineClass('org.xmind.branchConnection.fold')).toBe('fold')
    expect(edgeKindFromLineClass('org.xmind.branchConnection.roundedfold')).toBe('roundedFold')
    expect(edgeKindFromLineClass('org.xmind.branchConnection.brace')).toBe('brace')
    expect(edgeKindFromLineClass('org.xmind.branchConnection.tapered')).toBe('tapered')
  })

  it('checks rounded variants before their base names', () => {
    expect(edgeKindFromLineClass('ROUNDEDFOLD')).toBe('roundedFold')
    expect(edgeKindFromLineClass('ROUNDEDELBOW')).toBe('roundedElbow')
  })
})

describe('resolveTopicStyle theme parts', () => {
  it('uses theme.level3 from depth 3 onwards', () => {
    const theme = {
      ...DEFAULT_THEME,
      level3: {
        properties: { 'line-class': 'org.xmind.branchConnection.bight', 'line-color': '#123456' }
      }
    }
    const topic = { id: 't', title: 'T' }
    expect(resolveTopicStyle(topic, theme, 3, false, false)['line-class']).toBe(
      'org.xmind.branchConnection.bight'
    )
    expect(resolveTopicStyle(topic, theme, 4, false, false)['line-color']).toBe('#123456')
    expect(resolveTopicStyle(topic, theme, 2, false, false)['line-class']).not.toBe(
      'org.xmind.branchConnection.bight'
    )
  })
})
