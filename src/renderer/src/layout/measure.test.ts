import { describe, expect, it } from 'vitest'
import type { Topic } from '@shared/types'
import { rightIconCount, rightIconReserve, rightTextInset } from './measure'

const base: Topic = { id: 'topic', class: 'topic', title: '主题' }
const linked: Topic = { ...base, hyperlink: 'https://example.com' }
const attached: Topic = { ...base, attachments: [{ name: 'a.pdf', path: '/tmp/a.pdf' }] }
const both: Topic = { ...linked, attachments: [{ name: 'a.pdf', path: '/tmp/a.pdf' }] }

describe('右侧图标预留', () => {
  it('没有图标时不预留宽度，文字内边距 12px', () => {
    expect(rightIconCount(base)).toBe(0)
    expect(rightTextInset(base)).toBe(12)
    expect(rightIconReserve(base)).toBe(0)
  })

  it('只有链接或只有附件时占一格：8 + 13 + 8', () => {
    expect(rightIconCount(linked)).toBe(1)
    expect(rightTextInset(linked)).toBe(29)
    expect(rightIconReserve(linked)).toBe(17)
    expect(rightIconCount(attached)).toBe(1)
    expect(rightTextInset(attached)).toBe(29)
  })

  it('链接与附件同时存在时占两格：8 + 13 + 5 + 13 + 8', () => {
    expect(rightIconCount(both)).toBe(2)
    expect(rightTextInset(both)).toBe(47)
    expect(rightIconReserve(both)).toBe(35)
  })
})
