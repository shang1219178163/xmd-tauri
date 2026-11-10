import { describe, expect, it } from 'vitest'
import { directAttachmentPath } from './attachment'

describe('directAttachmentPath', () => {
  it('单个带路径的附件可直接打开', () => {
    expect(directAttachmentPath([{ name: 'a.pdf', path: '/tmp/a.pdf' }])).toBe('/tmp/a.pdf')
  })

  it('多个附件时返回 undefined，改为打开列表', () => {
    expect(
      directAttachmentPath([
        { name: 'a.pdf', path: '/tmp/a.pdf' },
        { name: 'b.png', path: '/tmp/b.png' }
      ])
    ).toBeUndefined()
  })

  it('没有本地路径时返回 undefined', () => {
    expect(directAttachmentPath([{ name: 'inline', data: 'data:image/png;base64,AAA' }])).toBeUndefined()
  })

  it('空列表返回 undefined', () => {
    expect(directAttachmentPath([])).toBeUndefined()
  })
})
