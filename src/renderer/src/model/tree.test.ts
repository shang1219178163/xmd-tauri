import { describe, expect, it } from 'vitest'
import type { Topic } from '@shared/types'
import { excludedTopicIds, selectionRoots } from './tree'

function topic(id: string, children: Topic[] = [], detached: Topic[] = []): Topic {
  return { id, title: id, children: { attached: children, detached } }
}

describe('selectionRoots', () => {
  it('drops the root and keeps the top-most selected topics in input order', () => {
    const a1 = topic('a1')
    const a = topic('a', [a1])
    const b = topic('b')
    const root = topic('root', [a, b])
    expect(selectionRoots(root, ['b', 'a1', 'a', 'root'])).toEqual(['b', 'a'])
  })

  it('keeps selected floating topics', () => {
    const floating = topic('floating')
    const root = topic('root', [], [floating])
    expect(selectionRoots(root, ['floating'])).toEqual(['floating'])
  })

  it('returns an empty list when only the root is selected', () => {
    const root = topic('root', [topic('a')])
    expect(selectionRoots(root, ['root'])).toEqual([])
  })

  it('deduplicates ids and drops ids that are no longer in the tree', () => {
    const a = topic('a')
    const root = topic('root', [a])
    expect(selectionRoots(root, ['a', 'a', 'missing'])).toEqual(['a'])
  })
})

describe('excludedTopicIds', () => {
  it('includes members and every descendant of a member', () => {
    const a1 = topic('a1', [topic('a1x')])
    const a = topic('a', [a1])
    const root = topic('root', [a, topic('b')])
    expect(Array.from(excludedTopicIds(root, ['a'])).sort()).toEqual(['a', 'a1', 'a1x'])
  })

  it('returns an empty set when no member exists', () => {
    const root = topic('root', [topic('a')])
    expect(excludedTopicIds(root, ['missing']).size).toBe(0)
  })
})
