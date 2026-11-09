import { beforeEach, describe, expect, it, vi } from 'vitest'

const clipboard = vi.hoisted(() => ({ text: '' }))

vi.mock('./desktop', () => ({
  readClipboardText: vi.fn(async () => clipboard.text),
  writeClipboardText: vi.fn(async (text: string) => {
    clipboard.text = text
  })
}))

import { runTextCommand } from './editing'

function makeField(value: string): HTMLTextAreaElement {
  const el = document.createElement('textarea')
  el.value = value
  document.body.appendChild(el)
  el.focus()
  return el
}

describe('runTextCommand', () => {
  beforeEach(() => {
    clipboard.text = ''
    document.body.innerHTML = ''
  })

  it('焦点不在输入框时不接管命令', () => {
    expect(runTextCommand('paste')).toBe(false)
    expect(runTextCommand('copy')).toBe(false)
    expect(runTextCommand('save')).toBe(false)
  })

  it('全选选中输入框内的全部文本', () => {
    const field = makeField('https://example.com')
    expect(runTextCommand('select-all')).toBe(true)
    expect(field.selectionStart).toBe(0)
    expect(field.selectionEnd).toBe(field.value.length)
  })

  it('剪切写入剪贴板并删除选区', () => {
    const field = makeField('abc-def')
    field.setSelectionRange(0, 3)
    expect(runTextCommand('cut')).toBe(true)
    expect(clipboard.text).toBe('abc')
    expect(field.value).toBe('-def')
  })

  it('复制不修改输入框内容', () => {
    const field = makeField('hello')
    field.setSelectionRange(0, 5)
    expect(runTextCommand('copy')).toBe(true)
    expect(clipboard.text).toBe('hello')
    expect(field.value).toBe('hello')
  })

  it('粘贴把剪贴板文本插入光标处并触发 input 事件', async () => {
    clipboard.text = 'https://www.runoob.com/python3/python3-class.html'
    const field = makeField('abc')
    field.setSelectionRange(1, 1)
    const onInput = vi.fn()
    field.addEventListener('input', onInput)

    expect(runTextCommand('paste')).toBe(true)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(field.value).toBe('ahttps://www.runoob.com/python3/python3-class.htmlbc')
    expect(onInput).toHaveBeenCalled()
  })
})
